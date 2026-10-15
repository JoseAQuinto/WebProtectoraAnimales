"""Reusable Firefox file:// suite runner with a full browser close and reopen.

Page contract: RescueManager.integration.{ready, report, snapshot()}.
The same HTML with ?peer=1 must only open the database, without changing it.
The snapshot must contain all table rows and actual binary bytes, or a stable
digest recalculated over those complete data by the page's snapshot function.
"""
import argparse
import datetime
import hashlib
import json
from pathlib import Path
import platform
import re
import traceback
import uuid
from firefox_viability import Firefox
from firefox_storage import source_fingerprints

ROOT = Path(__file__).resolve().parents[2]


def snapshot_evidence(snapshot):
    if not snapshot or not (re.fullmatch(r'[0-9a-fA-F]{64}', snapshot.get('digest', '')) or 'tables' in snapshot):
        raise ValueError('Snapshot must include tables or a digest of all records and actual binary bytes')
    encoded = json.dumps(snapshot, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return {"sha256": hashlib.sha256(encoded).hexdigest(), "serializedBytes": len(encoded),
            "datasetDigest": snapshot.get("digest"),
            "recordCounts": {name: len(rows) for name, rows in snapshot["tables"].items()} if "tables" in snapshot else None}


def run(args):
    entrypoint = (ROOT / args.page).resolve()
    if not entrypoint.is_relative_to(ROOT):
        raise ValueError("Page must be inside the checkout")
    profile = ROOT / ".tmp" / ("firefox-suite-" + uuid.uuid4().hex[:12]) / "profile"
    report = {"format": "rescue-manager-browser-suite-test", "version": 1,
              "browser": "firefox", "channel": args.channel, "machine": args.machine,
              "startedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
              "operatingSystem": platform.platform(), "executable": str(Path(args.firefox).resolve()),
              "sourceFiles": source_fingerprints(entrypoint), "checks": [], "launches": [], "closures": [],
              "mode": "Native headless; isolated profile; offline before first file navigation",
              "normalProfileSecurityPoliciesChanged": False,
              "limitations": ["No real mobile/tablet coverage.",
                               "Marionette diagnostics use page error/CSP listeners and resource timing, not a complete network trace."]}
    browsers = []

    def promise(browser, expression):
        value = browser.promise(expression)
        if not value.get("ok"):
            raise RuntimeError(json.dumps(value.get("error"), ensure_ascii=False))
        return value.get("value")

    def check(name, operation):
        try:
            evidence = operation()
            report["checks"].append({"id": name, "passed": True, "evidence": evidence})
            print("PASS " + name, flush=True)
        except Exception as error:
            report["checks"].append({"id": name, "passed": False, "error": str(error), "stack": traceback.format_exc()})
            print("FAIL " + name + ": " + str(error), flush=True)

    def open_browser(peer=False):
        browser = Firefox(args.firefox, profile, offline=True, page_load_strategy="none")
        browsers.append(browser)
        browser.start()
        report["launches"].append({"capabilities": browser.capabilities, "profile": str(profile.relative_to(ROOT)), "offlineRequestedAtLaunch": True})
        browser.command("WebDriver:Navigate", {"url": entrypoint.as_uri() + ("?peer=1" if peer else "")})
        promise(browser, """new Promise((resolve,reject)=>{
          const deadline=Date.now()+25000;
          const poll=()=>{const ready=window.RescueManager?.integration?.ready;
            if(ready)Promise.resolve(ready).then(resolve,reject);
            else if(Date.now()>deadline)reject(new Error('Integration page did not expose ready'));
            else setTimeout(poll,25);};poll();})""")
        return browser

    def close(browser):
        evidence = browser.close()
        report["closures"].append(evidence)
        assert browser.process.returncode == 0 and not evidence["remainingProcesses"], "Browser did not close completely"
        return evidence

    def diagnostics(browser):
        value = browser.execute("""const i=window.RescueManager.integration;return {
          listenersPresent:Array.isArray(i.runtimeErrors)&&Array.isArray(i.connectionViolations),
          runtimeErrors:i.runtimeErrors,connectionViolations:i.connectionViolations,
          externalResources:performance.getEntriesByType('resource').filter(item=>/^https?:/i.test(item.name)).map(item=>item.name)};""")
        assert value["listenersPresent"], "Page must expose early error and CSP listeners for Firefox diagnostics"
        assert not value["runtimeErrors"] and not value["connectionViolations"] and not value["externalResources"], "Errors or external resources observed"
        return value

    try:
        first = open_browser()

        def suite():
            evidence = first.execute("return {protocol:location.protocol,online:navigator.onLine,config:window.RescueManager.config,report:window.RescueManager.integration.report};")
            assert evidence["protocol"] == "file:" and evidence["online"] is False
            assert evidence["config"]["dbName"].startswith("animal-rescue-manager-test-")
            assert evidence["report"]["passed"] and evidence["report"]["checks"]
            assert all(item["passed"] for item in evidence["report"]["checks"])
            report["suiteReport"] = evidence["report"]
            return evidence

        check("suite-passes-offline-from-local-file", suite)
        before = snapshot_evidence(promise(first, "window.RescueManager.integration.snapshot()"))
        check("no-first-open-errors-or-external-resources", lambda: diagnostics(first))
        check("complete-first-owned-browser-close", lambda: close(first))
        second = open_browser(True)

        def persists():
            after = snapshot_evidence(promise(second, "window.RescueManager.integration.snapshot()"))
            context = second.execute("return {protocol:location.protocol,online:navigator.onLine};")
            assert before == after, "Snapshot changed after complete close/reopen"
            assert context["protocol"] == "file:" and context["online"] is False
            return {"before": before, "after": after, "context": context, "profileReused": True}

        check("all-snapshot-data-persists-after-complete-close", persists)
        check("no-reopen-errors-or-external-resources", lambda: diagnostics(second))
        check("complete-reopened-owned-browser-close", lambda: close(second))

        def sources_unchanged():
            assert report["sourceFiles"] == source_fingerprints(entrypoint), "Source files changed during the browser run"
            return {"count": len(report["sourceFiles"]), "hashesMatch": True}

        check("tested-source-files-remained-unchanged", sources_unchanged)
    except Exception as error:
        report["fatalError"] = {"message": str(error), "stack": traceback.format_exc()}
    finally:
        for browser in browsers:
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
    parser.add_argument("--page", default="tests/integration/business.html")
    parser.add_argument("--output", default="business-firefox.json")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-zA-Z0-9._-]+\.json", args.output):
        parser.error("--output must be a plain JSON filename")
    raise SystemExit(0 if run(args) else 1)
