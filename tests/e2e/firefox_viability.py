"""Exercise local-file storage in isolated Firefox profiles without Selenium.

Marionette wire protocol: https://firefox-source-docs.mozilla.org/remote/marionette/Protocol.html
Only an automation port, first-run UI and download destination are configured;
Firefox origin, storage and security policies are left at their defaults.
"""

import argparse
import base64
import datetime
import json
import os
from pathlib import Path
import platform
import shutil
import socket
import signal
import subprocess
import time
import traceback
import uuid


ROOT = Path(__file__).resolve().parents[2]


def windows_processes():
    source = "@((Get-CimInstance Win32_Process -ErrorAction Stop) | Select-Object ProcessId,ParentProcessId,@{Name='CreatedAt';Expression={$_.CreationDate.ToUniversalTime().ToString('o')}}) | ConvertTo-Json -Compress"
    encoded = base64.b64encode(source.encode('utf-16le')).decode('ascii')
    output = subprocess.check_output(['powershell.exe', '-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
                                     stderr=subprocess.PIPE, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0), timeout=20)
    rows = json.loads(output.decode('utf-8-sig'))
    return rows if isinstance(rows, list) else [rows] if rows else []


def descendants(rows, pid):
    identities = {pid}
    previous = -1
    while previous != len(identities):
        previous = len(identities)
        identities.update(row['ProcessId'] for row in rows if row['ParentProcessId'] in identities)
    return [row for row in rows if row['ProcessId'] in identities]


class MarionetteError(RuntimeError):
    def __init__(self, payload):
        self.payload = payload
        super().__init__(json.dumps(payload, ensure_ascii=False))


class Firefox:
    def __init__(self, executable, profile, offline=False, extra_preferences=None, page_load_strategy="normal"):
        self.executable = Path(executable).resolve()
        self.profile = Path(profile).resolve()
        self.offline = offline
        self.sequence = 0
        self.sock = None
        self.process = None
        self.capabilities = None
        self.extra_preferences = extra_preferences or {}
        self.page_load_strategy = page_load_strategy

    def start(self):
        self.last_closure = None
        self.profile.mkdir(parents=True, exist_ok=True)
        download = self.profile.parent / "downloads"
        download.mkdir(exist_ok=True)
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            self.port = probe.getsockname()[1]
        preferences = {
            "marionette.port": self.port,
            "browser.shell.checkDefaultBrowser": False,
            "browser.startup.homepage_override.mstone": "ignore",
            "browser.startup.page": 0,
            "browser.startup.homepage": "about:blank",
            "browser.download.folderList": 2,
            "browser.download.dir": str(download),
            "browser.download.useDownloadDir": True,
            "browser.download.always_ask_before_handling_new_types": False,
            "browser.helperApps.neverAsk.saveToDisk": "application/json",
        }
        preferences.update(self.extra_preferences)
        (self.profile / "user.js").write_text(
            "\n".join(f"user_pref({json.dumps(k)}, {json.dumps(v)});"
                      for k, v in preferences.items()), encoding="utf-8")
        command = [str(self.executable), "--headless", "--no-remote",
                   "--marionette", "--profile", str(self.profile)]
        if self.offline:
            command.append("--offline")
        self.log = open(self.profile.parent / (self.profile.name + ".log"), "ab")
        self.process = subprocess.Popen(
            command, stdout=self.log, stderr=self.log,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        end = time.monotonic() + 45
        while time.monotonic() < end:
            if self.process.poll() is not None:
                raise RuntimeError(f"Firefox exited: {self.process.returncode}")
            try:
                self.sock = socket.create_connection(("127.0.0.1", self.port), 2)
                self.sock.settimeout(35)
                self.handshake = self.receive()
                break
            except (OSError, TimeoutError):
                time.sleep(0.2)
        else:
            raise RuntimeError("Firefox Marionette port did not open")
        session_options = {} if self.page_load_strategy == 'normal' else {"capabilities": {"alwaysMatch": {"pageLoadStrategy": self.page_load_strategy}}}
        self.capabilities = self.command("WebDriver:NewSession", session_options)
        self.command("WebDriver:SetTimeouts", {"script": 30000, "pageLoad": 30000})
        return self

    def receive(self):
        prefix = bytearray()
        while True:
            byte = self.sock.recv(1)
            if not byte:
                raise EOFError("Marionette disconnected")
            if byte == b":":
                break
            prefix.extend(byte)
        size = int(prefix)
        data = bytearray()
        while len(data) < size:
            block = self.sock.recv(size - len(data))
            if not block:
                raise EOFError("Incomplete Marionette response")
            data.extend(block)
        return json.loads(data)

    def command(self, name, params=None):
        self.sequence += 1
        message = json.dumps([0, self.sequence, name, params or {}]).encode()
        self.sock.sendall(str(len(message)).encode() + b":" + message)
        response = self.receive()
        if response[1] != self.sequence:
            raise RuntimeError(f"Unexpected Marionette response: {response}")
        if response[2] is not None:
            raise MarionetteError(response[2])
        return response[3]

    def navigate(self, path):
        return self.command("WebDriver:Navigate", {"url": Path(path).resolve().as_uri()})

    def execute(self, script, args=None, asynchronous=False):
        result = self.command(
            "WebDriver:ExecuteAsyncScript" if asynchronous else "WebDriver:ExecuteScript",
            {"script": script, "args": args or [], "newSandbox": True, "sandbox": None})
        return result.get("value") if isinstance(result, dict) and "value" in result else result

    def promise(self, expression, args=None):
        return self.execute("""
            const done = arguments[arguments.length - 1];
            Promise.resolve().then(() => (EXPRESSION)).then(
              value => done({ok: true, value}),
              error => done({ok: false, error: {name:error.name,
                message:error.message, stack:error.stack || ""}}));
        """.replace("EXPRESSION", expression), args, asynchronous=True)

    def close(self):
        if self.sock is None and getattr(self, 'last_closure', None):
            return self.last_closure
        tracked = []
        inspection_error = None
        if self.process and os.name == 'nt':
            try:
                tracked = descendants(windows_processes(), self.process.pid)
            except Exception as error:
                inspection_error = str(error)
        if self.sock:
            try:
                self.command("Marionette:Quit", {"flags": ["eAttemptQuit"]})
            except (OSError, EOFError, MarionetteError):
                pass
            self.sock.close()
            self.sock = None
        forced = False
        if self.process:
            try:
                self.process.wait(timeout=15)
            except subprocess.TimeoutExpired:
                forced = True
                self.process.terminate()
                self.process.wait(timeout=10)
        if hasattr(self, "log"):
            self.log.close()
        remaining = []
        if tracked:
            try:
                identities = {(row['ProcessId'], row['CreatedAt']) for row in tracked}
                deadline = time.monotonic() + 5
                while True:
                    remaining = [row for row in windows_processes() if (row['ProcessId'], row['CreatedAt']) in identities]
                    if not remaining or time.monotonic() >= deadline:
                        break
                    time.sleep(0.1)
                if remaining:
                    forced = True
                    for row in remaining:
                        try:
                            os.kill(row['ProcessId'], signal.SIGTERM)
                        except ProcessLookupError:
                            pass
                    time.sleep(0.1)
                    remaining = [row for row in windows_processes() if (row['ProcessId'], row['CreatedAt']) in identities]
            except Exception as error:
                inspection_error = str(error)
        self.last_closure = {"rootPid": self.process.pid if self.process else None,
                             "exitCode": self.process.returncode if self.process else None,
                             "trackedProcesses": tracked, "remainingProcesses": remaining,
                             "forcedTermination": forced, "inspectionError": inspection_error,
                             "subprocessTreeInspected": os.name == 'nt' and inspection_error is None}
        if inspection_error or remaining:
            raise RuntimeError('Could not verify complete owned Firefox process closure: ' + str(self.last_closure))
        return self.last_closure


MINIMAL = """<!doctype html><meta charset=utf-8><title>Independent file IDB test</title>
<script>
window.minimalIDB = new Promise(resolve => {
  const result = {url:location.href, origin:location.origin,
    online:navigator.onLine, userAgent:navigator.userAgent};
  try {
    const request = indexedDB.open('independent-file-idb', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('values');
    request.onerror = () => resolve({...result, ok:false,
      error:{name:request.error.name, message:request.error.message,
        stack:request.error.stack || ''}});
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('values','readwrite');
      tx.objectStore('values').put({text:'verified', blob:new Blob(['real blob'])},'value');
      tx.onabort = () => resolve({...result, ok:false,
        error:{name:tx.error?.name, message:tx.error?.message}});
      tx.oncomplete = () => {
        const read = db.transaction('values','readonly');
        const get = read.objectStore('values').get('value');
        let value;
        get.onsuccess = () => {value=get.result;};
        read.oncomplete = async () => {
          result.value = {text:value.text, blob:await value.blob.text()};
          result.committed = true; result.ok = true;
          db.close(); resolve(result);
        };
      };
    };
  } catch(error) {resolve({...result, ok:false,
    error:{name:error.name, message:error.message, stack:error.stack || ''}});}
});
</script>"""


def run(args):
    folder = ROOT / ".tmp" / ("firefox-" + uuid.uuid4().hex[:12])
    folder.mkdir(parents=True)
    minimal = folder / "independent.html"
    minimal.write_text(MINIMAL, encoding="utf-8")
    report = {
        "test": "Firefox direct file:// viability",
        "dateUTC": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "os": platform.platform(),
        "executable": str(Path(args.firefox).resolve()),
        "channel": args.channel,
        "profile": str(folder / "profile"),
        "offlineRequestedAtLaunch": True,
        "normalProfileSecurityPoliciesChanged": False,
        "steps": {},
    }
    browser = Firefox(args.firefox, folder / "profile", offline=True)
    try:
        browser.start()
        report["capabilities"] = browser.capabilities
        browser.navigate(minimal)
        report["steps"]["independentIndexedDB"] = browser.promise("window.minimalIDB")
        probe = ROOT / "tests" / "viability" / "index.html"
        if probe.exists():
            browser.navigate(probe)
            report["steps"]["probeReady"] = browser.promise("window.RescueManager.probe.ready")
            report["steps"]["probeRun"] = browser.promise("window.RescueManager.probe.run()")
            if report["steps"]["probeReady"].get("value", {}).get("storageAvailable"):
                run_extended(browser, probe, folder, report)
        else:
            report["steps"]["probeRun"] = {"status": "pending", "reason": "Probe not created yet"}
    except Exception as error:
        report["harnessError"] = {"type": type(error).__name__, "message": str(error),
                                  "stack": traceback.format_exc()}
    finally:
        browser.close()
    report["assertions"] = assertions(report)
    report["desktopCorePassed"] = bool(report["assertions"]) and all(
        item["passed"] for item in report["assertions"])
    output = ROOT / "tests" / "results" / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"output": str(output), "desktopCorePassed": report["desktopCorePassed"],
                      "assertions": report["assertions"], "harnessError": report.get("harnessError")},
                     ensure_ascii=True, indent=2))
    return report["desktopCorePassed"]


def run_extended(browser, probe, folder, report):
    steps = report["steps"]
    marker = "persistencia Firefox ñ 🐾 " + uuid.uuid4().hex
    steps["firstOpenOffline"] = browser.execute(
        "return {online:navigator.onLine, protocol:location.protocol};")
    browser.execute("document.getElementById('release').click();")
    steps["writeMarker"] = browser.promise("window.RescueManager.probe.writeMarker(arguments[0])", [marker])
    steps["optionalAPIs"] = browser.promise("""(async () => {
      const results = {};
      if (crypto.randomUUID) results.uuid = crypto.randomUUID();
      if (crypto.subtle) {
        const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode('abc'));
        results.sha256 = Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
      }
      if (navigator.storage?.estimate) results.estimate = await navigator.storage.estimate();
      if (navigator.storage?.persisted) results.persisted = await navigator.storage.persisted();
      if (navigator.storage?.persist) results.persist = await Promise.race([
        navigator.storage.persist(), new Promise(resolve=>setTimeout(()=>resolve('unanswered-prompt'),2000))]);
      const fileReader = new FileReader();
      results.fileReader = await new Promise((resolve,reject)=>{
        fileReader.onload=()=>resolve(fileReader.result);
        fileReader.onerror=()=>reject(fileReader.error);
        fileReader.readAsText(new Blob(['FileReader ñ']));
      });
      if (typeof BroadcastChannel === 'function') {
        const name = 'rescue-probe-'+crypto.randomUUID();
        const sender = new BroadcastChannel(name), receiver = new BroadcastChannel(name);
        results.broadcast = await new Promise(resolve=>{
          const timeout = setTimeout(()=>resolve('not-delivered'),1500);
          receiver.onmessage = event => {clearTimeout(timeout);resolve(event.data);};
          sender.postMessage('delivered');
        });
        sender.close();receiver.close();
      }
      results.showSaveFilePicker = typeof showSaveFilePicker;
      return results;
    })()""")

    browser.execute("document.getElementById('download').click();")
    downloads = folder / "downloads"
    deadline = time.monotonic() + 10
    files = []
    while time.monotonic() < deadline:
        files = [path for path in downloads.glob("*.json") if path.stat().st_size > 0]
        if files:
            break
        time.sleep(0.1)
    if files:
        downloaded = files[0]
        parsed = json.loads(downloaded.read_text(encoding="utf-8"))
        steps["jsonDownload"] = {"ok": parsed.get("format") == "rescue-manager-viability-report",
                                 "bytes": downloaded.stat().st_size, "file": str(downloaded)}
        element = browser.command("WebDriver:FindElement", {"using": "css selector", "value": "#json-file"})
        if isinstance(element.get("value"), dict):
            element = element["value"]
        element_id = next(value for key, value in element.items() if "element" in key.lower())
        browser.command("WebDriver:ElementSendKeys", {"id": element_id, "text": str(downloaded)})
        steps["jsonFileSelection"] = browser.promise("""new Promise(resolve => {
          let attempts=0;
          const check=()=>{
            const text=document.getElementById('json-result').textContent;
            if(text.includes('seleccionado y leído') || attempts++>20)
              resolve({text,files:document.getElementById('json-file').files.length});
            else setTimeout(check,50);
          };check();
        })""")
    else:
        steps["jsonDownload"] = {"ok": False, "reason": "No JSON saved within 10 seconds"}

    first_handle = browser.command("WebDriver:GetWindowHandle")
    if isinstance(first_handle, dict):
        first_handle = first_handle.get("value", first_handle)
    steps["firstTabAcquire"] = browser.promise("window.RescueManager.probe.acquire('first-tab', 30000)")
    second = browser.command("WebDriver:NewWindow", {"type": "tab"})
    second_handle = second.get("handle", second.get("value", {}).get("handle"))
    browser.command("WebDriver:SwitchToWindow", {"handle": second_handle})
    browser.navigate(probe)
    steps["secondTabReady"] = browser.promise("window.RescueManager.probe.ready")
    steps["secondTabAcquireDenied"] = browser.promise("window.RescueManager.probe.acquire('second-tab', 30000)")
    steps["secondTabWriteDenied"] = browser.promise("window.RescueManager.probe.guardedWrite('second-tab','must not persist')")
    steps["secondTabReadsSameMarker"] = browser.promise("""(async()=>{
      const value=await window.RescueManager.probe.readMarker();
      return {value:value?.value, blob:value?.blob ? await value.blob.text():null};
    })()""")
    browser.command("WebDriver:SwitchToWindow", {"handle": first_handle})
    steps["firstTabRelease"] = browser.promise("window.RescueManager.probe.release('first-tab')")
    browser.command("WebDriver:SwitchToWindow", {"handle": second_handle})
    steps["secondTabAcquireAfterRelease"] = browser.promise("window.RescueManager.probe.acquire('second-tab', 30000)")
    browser.promise("window.RescueManager.probe.release('second-tab')")
    steps["shortLeaseAcquired"] = browser.promise("window.RescueManager.probe.acquire('expiring-owner', 250)")
    time.sleep(0.4)
    steps["leaseAcquiredAfterExpiry"] = browser.promise("window.RescueManager.probe.acquire('replacement-owner', 30000)")
    steps["expiredOwnerWriteDenied"] = browser.promise("window.RescueManager.probe.guardedWrite('expiring-owner','must not persist')")
    browser.promise("window.RescueManager.probe.release('replacement-owner')")
    browser.command("WebDriver:CloseWindow")
    browser.command("WebDriver:SwitchToWindow", {"handle": first_handle})

    old_pid = browser.process.pid
    browser.close()
    steps["completeBrowserClose"] = {"pid": old_pid, "exitCode": browser.process.returncode,
                                      "waitedForProcessExit": True}
    browser.start()
    browser.navigate(probe)
    browser.promise("window.RescueManager.probe.ready")
    steps["persistAfterCompleteClose"] = browser.promise("""(async()=>{
      const record=await window.RescueManager.probe.readMarker();
      return {value:record?.value, expected:arguments[0],
        blob:record?.blob ? await record.blob.text():null,
        matched:record?.value===arguments[0], online:navigator.onLine};
    })()""", [marker])

    # Copy only the synthetic probe, then actually rename and move that folder.
    copy_folder = folder / "probe-original-copy"
    shutil.copytree(probe.parent, copy_folder)
    browser.navigate(copy_folder / "index.html")
    browser.promise("window.RescueManager.probe.ready")
    steps["copiedFolderMarkerBeforeWrite"] = browser.promise("window.RescueManager.probe.readMarker()")
    copy_marker = "folder-local-marker-" + uuid.uuid4().hex
    browser.promise("window.RescueManager.probe.writeMarker(arguments[0])", [copy_marker])
    browser.command("WebDriver:Navigate", {"url": "about:blank"})
    renamed = folder / "probe-renamed"
    copy_folder.rename(renamed)
    browser.navigate(renamed / "index.html")
    steps["renamedFolderReady"] = browser.promise("window.RescueManager.probe.ready")
    steps["renamedFolderMarker"] = browser.promise("""(async()=>{
      const record=await window.RescueManager.probe.readMarker();
      return {value:record?.value ?? null, expectedBeforeRename:arguments[0],
              preserved:record?.value===arguments[0]};
    })()""", [copy_marker])
    browser.promise("window.RescueManager.probe.writeMarker(arguments[0])", [copy_marker])
    browser.command("WebDriver:Navigate", {"url": "about:blank"})
    destination = folder / "nested-moved"
    destination.mkdir()
    moved = destination / "probe-renamed"
    renamed.rename(moved)
    browser.navigate(moved / "index.html")
    steps["movedFolderReady"] = browser.promise("window.RescueManager.probe.ready")
    steps["movedFolderMarker"] = browser.promise("""(async()=>{
      const record=await window.RescueManager.probe.readMarker();
      return {value:record?.value ?? null, expectedBeforeMove:arguments[0],
              preserved:record?.value===arguments[0]};
    })()""", [copy_marker])

    # Increased privacy in a separate throwaway profile, equivalent to Block all cookies.
    denied = Firefox(browser.executable, folder / "profile-denied", offline=True,
                     extra_preferences={"network.cookie.cookieBehavior": 2})
    try:
        denied.start()
        denied.navigate(probe)
        steps["storageBlockedByBrowserSetting"] = {
            "method": "Separate profile; network.cookie.cookieBehavior=2 (block all cookies/site data)",
            "report": denied.promise("window.RescueManager.probe.ready"),
            "ui": denied.execute("return {summary:document.getElementById('summary').textContent, saveDisabled:document.getElementById('save-marker').disabled};"),
        }
    finally:
        denied.close()


def assertions(report):
    steps = report["steps"]
    value = lambda name: steps.get(name, {}).get("value")
    denied = steps.get("storageBlockedByBrowserSetting", {})
    denied_report = denied.get("report", {}).get("value", {})
    checks = {
        "No harness error": "harnessError" not in report,
        "Independent local-file IndexedDB and Blob": (value("independentIndexedDB") or {}).get("ok") is True,
        "Local CSS/scripts, IndexedDB, Blob, commit and rollback": bool((value("probeRun") or {}).get("passed")),
        "First open offline": steps.get("firstOpenOffline", {}).get("online") is False,
        "JSON saved to disk": steps.get("jsonDownload", {}).get("ok") is True,
        "Real JSON input selection/read": (value("jsonFileSelection") or {}).get("files") == 1 and "seleccionado y leído" in (value("jsonFileSelection") or {}).get("text", ""),
        "Second tab cannot acquire active lease": value("firstTabAcquire") is True and value("secondTabAcquireDenied") is False,
        "Second tab write rejected without ownership": steps.get("secondTabWriteDenied", {}).get("error", {}).get("name") == "AbortError",
        "Lease transfers after release": value("secondTabAcquireAfterRelease") is True,
        "Lease transfers after expiry": value("shortLeaseAcquired") is True and value("leaseAcquiredAfterExpiry") is True,
        "Expired writer is rejected": steps.get("expiredOwnerWriteDenied", {}).get("error", {}).get("name") == "AbortError",
        "Complete browser shutdown": steps.get("completeBrowserClose", {}).get("exitCode") == 0,
        "Text and Blob persist after restart": (value("persistAfterCompleteClose") or {}).get("matched") is True and (value("persistAfterCompleteClose") or {}).get("blob") == "offline-blob-ñ",
        "Folder rename and move exercised": "renamedFolderMarker" in steps and "movedFolderMarker" in steps,
        "Actual storage denial produces safe UI": denied_report.get("storageAvailable") is False and any(check.get("detail", {}).get("name") == "SecurityError" for check in denied_report.get("checks", []) if isinstance(check.get("detail"), dict)) and denied.get("ui", {}).get("saveDisabled") is True,
    }
    return [{"name": name, "passed": bool(passed)} for name, passed in checks.items()]


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--firefox", required=True)
    parser.add_argument("--channel", default="stable")
    parser.add_argument("--output", default="firefox-stable.json")
    raise SystemExit(0 if run(parser.parse_args()) else 1)
