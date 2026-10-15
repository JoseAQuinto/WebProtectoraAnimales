"""Real Firefox file:// coverage of the storage coordinator, using synthetic data.

The installed/official browser is selected by CLI, never a committed personal path.
No HTTP server or relaxed origin/security policy is used.
"""

import argparse
import datetime
import hashlib
import json
from pathlib import Path
import platform
import re
import time
import traceback
import uuid

from firefox_viability import Firefox


ROOT = Path(__file__).resolve().parents[2]


def source_fingerprints(entrypoint):
    sources = [entrypoint]
    sources.extend((entrypoint.parent / source).resolve() for source in re.findall(
        r'<script[^>]+src="([^"]+)"', entrypoint.read_text(encoding="utf-8")))
    return [{"file": str(source.relative_to(ROOT)).replace("\\", "/"),
             "sha256": hashlib.sha256(source.read_bytes()).hexdigest()} for source in sources]


def run(args):
    folder = ROOT / ".tmp" / ("firefox-storage-" + uuid.uuid4().hex[:12])
    entrypoint = ROOT / "tests" / "integration" / "index.html"
    report = {
        "format": "rescue-manager-storage-core-test", "version": 1,
        "browser": "firefox", "channel": args.channel, "machine": args.machine,
        "startedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "operatingSystem": platform.platform(), "executable": str(Path(args.firefox).resolve()),
        "sourceFiles": source_fingerprints(entrypoint),
        "mode": "Native headless; isolated profile; offline before first file navigation",
        "normalProfileSecurityPoliciesChanged": False,
        "checks": [],
        "limitations": [
            "Core coordinator coverage only; not business-schema or backup acceptance.",
            "No real mobile/tablet coverage.",
            "No complete browser/page network trace was instrumented by Marionette.",
        ],
    }
    browser = Firefox(args.firefox, folder / "profile", offline=True)

    def promise(expression, arguments=None):
        result = browser.promise(expression, arguments)
        if not result.get("ok"):
            raise RuntimeError(json.dumps(result.get("error"), ensure_ascii=False))
        return result.get("value")

    def check(name, operation):
        try:
            evidence = operation()
            report["checks"].append({"id": name, "passed": True, "evidence": evidence})
            print("PASS " + name, flush=True)
        except Exception as error:
            report["checks"].append({"id": name, "passed": False,
                                      "error": str(error), "stack": traceback.format_exc()})
            print("FAIL " + name + ": " + str(error), flush=True)

    try:
        browser.start()
        report["capabilities"] = browser.capabilities
        browser.navigate(entrypoint)
        promise("window.RescueManager.integration.ready")

        def initial_suite():
            evidence = browser.execute("return {url:location.href, online:navigator.onLine, report:window.RescueManager.integration.report};")
            assert evidence["url"].startswith("file:///") and evidence["online"] is False
            assert evidence["report"]["passed"] and len(evidence["report"]["checks"]) == 9
            report["integrationReport"] = evidence["report"]
            return evidence

        check("file-offline-and-integration-suite", initial_suite)
        state = browser.execute("return window.RescueManager.integration.state;")
        first_handle = browser.command("WebDriver:GetWindowHandle")
        if isinstance(first_handle, dict):
            first_handle = first_handle.get("value", first_handle)
        second = browser.command("WebDriver:NewWindow", {"type": "tab"})
        second_handle = second.get("handle", second.get("value", {}).get("handle"))
        browser.command("WebDriver:SwitchToWindow", {"handle": second_handle})
        browser.command("WebDriver:Navigate", {"url": entrypoint.as_uri() + "?peer=1"})
        promise("window.RescueManager.integration.ready")

        def second_tab():
            evidence = promise("""(async () => {
              const root=window.RescueManager, w=root.storage.writeCoordinator;
              root.integration.peerOwner=crypto.randomUUID();
              return {owner:root.integration.peerOwner, initiallyAllowed:await w.acquire(root.integration.peerOwner, arguments[0].datasetId)};
            })()""", [state])
            browser.command("WebDriver:SwitchToWindow", {"handle": first_handle})
            promise("""(async()=>{
              const s=arguments[0], w=window.RescueManager.storage.writeCoordinator;
              await w.release(s.owner,s.datasetId); await w.acquire(s.owner,s.datasetId,1);
            })()""", [state])
            time.sleep(0.02)
            browser.command("WebDriver:SwitchToWindow", {"handle": second_handle})
            evidence["afterExpiry"] = promise("window.RescueManager.storage.writeCoordinator.acquire(window.RescueManager.integration.peerOwner,arguments[0].datasetId)", [state])
            browser.command("WebDriver:SwitchToWindow", {"handle": first_handle})
            evidence["staleWrite"] = promise("""(async()=>{
              const s=arguments[0],w=window.RescueManager.storage.writeCoordinator,active=await w.readActive();
              try {await w.mutate({owner:s.owner,datasetId:s.datasetId,expectedRevision:active.revision,
                operationId:crypto.randomUUID(),fingerprint:'stale-owner',stores:['testRecords']},
                access=>access.add('testRecords',{datasetId:s.datasetId,id:crypto.randomUUID()}));return 'unexpected-success';}
              catch(error){return error.name;}
            })()""", [state])
            assert evidence["initiallyAllowed"] is False and evidence["afterExpiry"] is True
            assert evidence["staleWrite"] == "LeaseLostError"
            return evidence

        check("second-tab-exclusion-expiry-and-stale-owner-rejection", second_tab)

        def activation():
            browser.command("WebDriver:SwitchToWindow", {"handle": second_handle})
            evidence = promise("""(async()=>{
              const s=arguments[0],root=window.RescueManager,w=root.storage.writeCoordinator,before=await w.readActive();
              const active=await w.activateDataset({owner:root.integration.peerOwner,datasetId:s.datasetId,expectedRevision:before.revision},s.targetId);
              return {before,active,writer:await root.integration.read('meta','writer'),
                previous:await root.integration.read('datasets',s.datasetId),target:await root.integration.read('datasets',s.targetId)};
            })()""", [state])
            browser.command("WebDriver:SwitchToWindow", {"handle": first_handle})
            evidence["staleWrite"] = promise("""(async()=>{
              const s=arguments[0],w=window.RescueManager.storage.writeCoordinator;
              try {await w.mutate({owner:s.owner,datasetId:s.datasetId,expectedRevision:0,
                operationId:crypto.randomUUID(),fingerprint:'old-dataset',stores:['testRecords']},()=>{});return 'unexpected-success';}
              catch(error){return error.name;}
            })()""", [state])
            assert evidence["active"]["datasetId"] == state["targetId"]
            assert evidence["active"]["revision"] == evidence["before"]["revision"] + 1
            assert evidence["writer"] is None and evidence["previous"]["state"] == "retired"
            assert evidence["target"]["state"] == "active" and evidence["staleWrite"] == "DatasetChangedError"
            evidence["restoreImplemented"] = False
            return evidence

        check("atomic-dataset-activation-invalidates-previous-writer", activation)
        browser.command("WebDriver:SwitchToWindow", {"handle": second_handle})
        promise("window.RescueManager.storage.database.close()")
        browser.command("WebDriver:CloseWindow")
        browser.command("WebDriver:SwitchToWindow", {"handle": first_handle})
        check("future-database-version-rejected-without-data-loss", lambda: promise("window.RescueManager.integration.futureVersion()"))

        def database_isolation():
            evidence = promise("indexedDB.databases()")
            assert evidence and all(value["name"].startswith("animal-rescue-manager-test-") for value in evidence)
            return {"databases": evidence}

        check("dedicated-test-database", database_isolation)

        def close():
            closure = browser.close()
            assert browser.process.returncode == 0
            return closure

        check("complete-owned-browser-root-close", close)
        def sources_unchanged():
            assert report["sourceFiles"] == source_fingerprints(entrypoint), "Source files changed during the run"
            return {"count": len(report["sourceFiles"]), "hashesMatch": True}

        check("tested-source-files-remained-unchanged", sources_unchanged)
    except Exception as error:
        report["fatalError"] = {"message": str(error), "stack": traceback.format_exc()}
    finally:
        if browser.process and browser.process.poll() is None:
            browser.close()
        report["completedAt"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        report["status"] = "failed" if report.get("fatalError") or not report["checks"] or any(not item["passed"] for item in report["checks"]) else "passed"
        output = ROOT / "tests" / "results" / args.output
        output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"output": str(output), "status": report["status"], "fatalError": report.get("fatalError")}, ensure_ascii=True), flush=True)
    return report["status"] == "passed"


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--firefox", required=True)
    parser.add_argument("--channel", default="stable")
    parser.add_argument("--machine", default="unspecified")
    parser.add_argument("--output", default="storage-core-firefox.json")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-zA-Z0-9._-]+\.json", args.output):
        parser.error("--output must be a plain JSON filename")
    raise SystemExit(0 if run(args) else 1)
