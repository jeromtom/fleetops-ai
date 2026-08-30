#!/usr/bin/env python3
"""Record the FleetOps AI demo as one continuous Playwright take."""

from __future__ import annotations

import argparse
import html
import json
import os
import shutil
import subprocess
import time
from pathlib import Path

from playwright.sync_api import Locator, Page, sync_playwright


ROOT = Path(__file__).resolve().parent.parent
VIDEO_DIR = ROOT / "video"
ARTIFACTS = VIDEO_DIR / "artifacts"
RAW_DIR = ARTIFACTS / "raw"

DEFAULT_URL = "https://fleetops-ai-nbklww7gqa-uc.a.run.app"
DEFAULT_PROJECT = "saptaveda-agent"
DEFAULT_REGION = "us-central1"
DEFAULT_SERVICE = "fleetops-ai"
GITHUB_URL = "https://github.com/jeromtom/fleetops-ai"


def run_gcloud(project: str, region: str, service: str) -> str:
    command = [
        "gcloud",
        "run",
        "services",
        "describe",
        service,
        "--project",
        project,
        "--region",
        region,
        "--format=yaml(metadata.name,status.url,status.latestReadyRevisionName,status.traffic,status.conditions)",
    ]
    completed = subprocess.run(command, check=True, text=True, capture_output=True)
    return completed.stdout.strip()


def title_html(closing: bool = False) -> str:
    kicker = "LIVE DEMO COMPLETE" if closing else "ALL THINGS AGENTIC · GOOGLE CLOUD"
    subtitle = (
        "Public repository · Live Cloud Run service · Human-approved remediation"
        if closing
        else "The Fortified Enterprise Fleet"
    )
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><style>
*{{box-sizing:border-box}} body{{margin:0;width:100vw;height:100vh;display:grid;place-items:center;
background:radial-gradient(circle at 30% 20%,#173568 0,#07111f 42%,#030711 100%);
color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;overflow:hidden}}
.grid{{position:fixed;inset:0;opacity:.17;background-image:linear-gradient(#5ca7ff22 1px,transparent 1px),
linear-gradient(90deg,#5ca7ff22 1px,transparent 1px);background-size:48px 48px}}
.card{{position:relative;width:1480px;padding:92px 104px;border:1px solid #ffffff24;border-radius:32px;
background:#081426d9;box-shadow:0 40px 120px #0009}}
.kicker{{color:#76b7ff;font-size:24px;font-weight:750;letter-spacing:.18em}}
h1{{font-size:112px;line-height:.95;margin:34px 0 26px;letter-spacing:-.055em}}
.subtitle{{font-size:40px;color:#cbd5e1}}
.agents{{display:flex;gap:18px;margin-top:58px}} .agent{{padding:15px 22px;border-radius:999px;
background:#ffffff0c;border:1px solid #ffffff22;font-size:23px;color:#dbeafe}}
.live{{position:absolute;right:72px;top:64px;color:#86efac;font-size:22px}}
.dot{{display:inline-block;width:12px;height:12px;border-radius:50%;background:#22c55e;margin-right:10px}}
</style></head><body><div class="grid"></div><div class="card">
<div class="live"><span class="dot"></span>ONE CONTINUOUS TAKE</div>
<div class="kicker">{kicker}</div><h1>FleetOps AI</h1><div class="subtitle">{subtitle}</div>
<div class="agents"><div class="agent">ScannerAgent</div><div class="agent">PolicyAgent</div>
<div class="agent">RemediationAgent</div></div></div></body></html>"""


def proof_html(command: str, output: str, live_url: str) -> str:
    captured = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><style>
*{{box-sizing:border-box}} body{{margin:0;width:100vw;height:100vh;background:#050913;color:#e2e8f0;
font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:50px 72px;overflow:hidden}}
.top{{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:28px}}
.eyebrow{{font-size:20px;font-weight:800;letter-spacing:.15em;color:#86efac}}
h1{{font-size:46px;margin:8px 0 0;letter-spacing:-.035em}} .stamp{{text-align:right;color:#94a3b8;font-size:18px}}
.terminal{{height:790px;border-radius:22px;overflow:hidden;border:1px solid #334155;background:#090e18;
box-shadow:0 25px 80px #0009}} .bar{{height:58px;background:#151c29;border-bottom:1px solid #334155;
display:flex;align-items:center;padding:0 22px;gap:11px}} .c{{width:14px;height:14px;border-radius:50%}}
.r{{background:#fb7185}} .y{{background:#facc15}} .g{{background:#4ade80}}
.label{{margin-left:16px;color:#94a3b8;font:16px ui-monospace,SFMono-Regular,Menlo,monospace}}
pre{{margin:0;padding:28px 34px;font:20px/1.43 ui-monospace,SFMono-Regular,Menlo,monospace;
white-space:pre-wrap;color:#cbd5e1}} .prompt{{color:#93c5fd}} .url{{color:#86efac;font-weight:800}}
</style></head><body><div class="top"><div><div class="eyebrow">LIVE GOOGLE CLOUD DEPLOYMENT PROOF</div>
<h1>Cloud Run · fleetops-ai · Serving</h1></div><div class="stamp">Captured live<br>{html.escape(captured)}</div></div>
<div class="terminal"><div class="bar"><span class="c r"></span><span class="c y"></span><span class="c g"></span>
<span class="label">gcloud · project {html.escape(DEFAULT_PROJECT)}</span></div><pre><span class="prompt">$ {html.escape(command)}</span>

{html.escape(output)}

<span class="url">LIVE URL  {html.escape(live_url)}</span></pre></div></body></html>"""


def install_cursor(page: Page) -> None:
    page.evaluate(
        """() => {
          document.getElementById('fleetops-demo-cursor')?.remove();
          const cursor = document.createElement('div');
          cursor.id = 'fleetops-demo-cursor';
          Object.assign(cursor.style, {
            position: 'fixed', left: '48px', top: '48px', width: '24px', height: '32px',
            zIndex: '2147483647', pointerEvents: 'none',
            clipPath: 'polygon(0 0, 0 88%, 25% 67%, 42% 100%, 58% 92%, 42% 61%, 78% 61%)',
            background: '#ffffff', filter: 'drop-shadow(0 2px 3px #000)',
            transition: 'left .35s ease, top .35s ease'
          });
          document.body.appendChild(cursor);
        }"""
    )


def move_cursor(page: Page, locator: Locator) -> None:
    locator.scroll_into_view_if_needed()
    box = locator.bounding_box()
    if not box:
        return
    x = box["x"] + min(box["width"] * 0.72, box["width"] - 12)
    y = box["y"] + box["height"] / 2
    page.mouse.move(x, y, steps=16)
    page.evaluate(
        "([x, y]) => { const c = document.getElementById('fleetops-demo-cursor'); "
        "if (c) { c.style.left = `${x}px`; c.style.top = `${y}px`; } }",
        [x, y],
    )


def show_live_url(page: Page) -> None:
    page.evaluate(
        """(url) => {
          const bar = document.createElement('div');
          bar.id = 'fleetops-live-url';
          bar.textContent = `🔒 LIVE BROWSER URL  ${url}`;
          Object.assign(bar.style, {
            position: 'fixed', top: '14px', left: '50%', transform: 'translateX(-50%)',
            zIndex: '2147483646', width: 'min(1160px, calc(100vw - 80px))',
            padding: '13px 24px', borderRadius: '14px', border: '1px solid #60a5fa66',
            background: '#07111fee', color: '#dbeafe', font: '600 19px ui-monospace, monospace',
            textAlign: 'center', boxShadow: '0 12px 40px #0009'
          });
          document.body.appendChild(bar);
        }""",
        page.url,
    )


def remove_live_url(page: Page) -> None:
    page.evaluate("document.getElementById('fleetops-live-url')?.remove()")


def chromium_executable(playwright) -> str:
    configured = os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE")
    candidates = [
        configured,
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        playwright.chromium.executable_path,
    ]
    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return candidate
    raise RuntimeError(
        "No Chromium executable found. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE; do not run playwright install."
    )


def capture(smoke: bool) -> tuple[Path, Path]:
    live_url = os.environ.get("FLEETOPS_URL", DEFAULT_URL)
    project = os.environ.get("FLEETOPS_GCP_PROJECT", DEFAULT_PROJECT)
    region = os.environ.get("FLEETOPS_GCP_REGION", DEFAULT_REGION)
    service = os.environ.get("FLEETOPS_GCP_SERVICE", DEFAULT_SERVICE)
    speed = 0.035 if smoke else float(os.environ.get("FLEETOPS_DEMO_SPEED", "1"))

    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    gcloud_output = run_gcloud(project, region, service)
    (ARTIFACTS / "cloud-run-service.yaml").write_text(gcloud_output + "\n", encoding="utf-8")

    command = (
        f"gcloud run services describe {service} --project {project} --region {region} "
        "--format=yaml"
    )
    raw_video = ARTIFACTS / ("smoke-capture.webm" if smoke else "raw-capture.webm")
    timeline_path = ARTIFACTS / ("smoke-timeline.json" if smoke else "timeline.json")
    timeline: dict[str, float] = {}

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            executable_path=chromium_executable(playwright),
            args=["--hide-scrollbars", "--disable-notifications"],
        )
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=1,
            record_video_dir=str(RAW_DIR),
            record_video_size={"width": 1920, "height": 1080},
        )
        page = context.new_page()
        page.set_default_timeout(30_000)
        video = page.video
        started = time.monotonic()

        def mark(name: str) -> None:
            timeline[name] = round(time.monotonic() - started, 3)

        def pause(seconds: float) -> None:
            page.wait_for_timeout(max(120, int(seconds * speed * 1000)))

        page.set_content(title_html(), wait_until="load")
        mark("problem")
        page.screenshot(path=str(ARTIFACTS / "title-card.png"))
        pause(24)

        page.set_content(proof_html(command, gcloud_output, live_url), wait_until="load")
        mark("deployment")
        page.screenshot(path=str(ARTIFACTS / "deployment-proof.png"))
        pause(18)

        page.goto(live_url, wait_until="networkidle", timeout=60_000)
        install_cursor(page)
        show_live_url(page)
        pause(8)
        remove_live_url(page)

        scan_button = page.get_by_role("button", name="Run new scan").first
        move_cursor(page, scan_button)
        mark("scanner")
        pause(2)
        with page.expect_response(lambda response: response.url.endswith("/api/scan") and response.status == 200):
            scan_button.click()
        page.get_by_text("9 findings", exact=False).first.wait_for(timeout=30_000)
        pause(6)

        audit_heading = page.get_by_text("Audit Log (Cloud Logging)", exact=True)
        audit_heading.scroll_into_view_if_needed()
        page.evaluate("window.scrollBy({top:-110, behavior:'smooth'})")
        pause(3)
        audit_box = audit_heading.locator("xpath=following-sibling::div[1]")
        move_cursor(page, audit_box)
        audit_box.evaluate("el => el.scrollTo({top: el.scrollHeight, behavior: 'smooth'})")
        pause(4)
        audit_box.evaluate("el => el.scrollTo({top: 0, behavior: 'smooth'})")
        pause(9)

        first_title = page.locator("button").filter(
            has_text="GCS bucket acme-user-uploads is publicly readable"
        ).first
        first_title.scroll_into_view_if_needed()
        page.evaluate("window.scrollBy({top:-260, behavior:'smooth'})")
        move_cursor(page, first_title)
        first_title.click()
        mark("policy")
        pause(24)

        command_block = page.get_by_text("gcloud storage buckets update gs://acme-user-uploads", exact=False)
        command_block.scroll_into_view_if_needed()
        page.evaluate("window.scrollBy({top:-300, behavior:'smooth'})")
        move_cursor(page, command_block)
        mark("remediation")
        pause(10)

        approve = page.get_by_role("button", name="✓ Approve · Execute")
        move_cursor(page, approve)
        pause(2)
        with page.expect_response(lambda response: response.url.endswith("/api/decide") and response.status == 200):
            approve.click()
        page.get_by_text("executed", exact=True).first.wait_for()
        pause(7)

        audit_heading.scroll_into_view_if_needed()
        page.evaluate("window.scrollBy({top:-110, behavior:'smooth'})")
        pause(8)

        second_title = page.locator("button").filter(
            has_text="IAM: staging-deployer @ acme-prod — cross-environment roles/owner binding"
        ).first
        second_title.scroll_into_view_if_needed()
        page.evaluate("window.scrollBy({top:-250, behavior:'smooth'})")
        move_cursor(page, second_title)
        second_title.click()
        reason = page.get_by_placeholder("Reason for deny/defer (required for audit)")
        reason.scroll_into_view_if_needed()
        move_cursor(page, reason)
        mark("deny")
        reason.fill("Staging deploy freeze until Q4 — revisit after release")
        pause(6)
        deny = page.get_by_role("button", name="Deny", exact=True)
        move_cursor(page, deny)
        pause(2)
        with page.expect_response(lambda response: response.url.endswith("/api/decide") and response.status == 200):
            deny.click()
        page.get_by_text("denied", exact=True).first.wait_for()
        pause(7)

        page.evaluate("window.scrollTo({top:0, behavior:'smooth'})")
        page.get_by_text("22 events", exact=True).wait_for()
        page.get_by_text("1 executed, 0 deferred, 1 denied, 7 pending", exact=True).wait_for()
        mark("summary")
        pause(16)

        audit_heading.scroll_into_view_if_needed()
        page.evaluate("window.scrollBy({top:-110, behavior:'smooth'})")
        pause(8)

        page.goto(GITHUB_URL, wait_until="domcontentloaded", timeout=60_000)
        page.locator("article.markdown-body").wait_for(timeout=45_000)
        architecture = page.get_by_role("heading", name="Architecture").first
        architecture.scroll_into_view_if_needed()
        page.evaluate("window.scrollBy({top:-120, behavior:'smooth'})")
        page.locator('[data-type="mermaid"]').first.wait_for(timeout=45_000)
        page.frame_locator('[data-type="mermaid"] iframe').first.locator("svg").first.wait_for(timeout=45_000)
        install_cursor(page)
        show_live_url(page)
        mark("docs")
        pause(4)
        remove_live_url(page)
        pause(12)

        page.set_content(title_html(closing=True), wait_until="load")
        mark("closing")
        pause(8)
        timeline["end"] = round(time.monotonic() - started, 3)

        page.close()
        context.close()
        if video is None:
            raise RuntimeError("Playwright did not create a video handle")
        recorded = Path(video.path())
        shutil.copy2(recorded, raw_video)
        browser.close()

    timeline_path.write_text(json.dumps(timeline, indent=2) + "\n", encoding="utf-8")
    print(f"Raw capture: {raw_video}")
    print(f"Timeline: {timeline_path}")
    print(json.dumps(timeline, indent=2))
    return raw_video, timeline_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--smoke", action="store_true", help="Run every deliberate pause at 3.5% duration")
    args = parser.parse_args()
    capture(args.smoke)
