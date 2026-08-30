# CODEX GOAL PROMPT — FleetOps AI → All Things Agentic submission

Paste everything below the line into Codex as the task prompt. Run it from the repo root
(`hackathoner-hq`) with network access, and with `gh` and `gcloud` already authenticated
if you want the deploy/promote steps to run unattended.

---

## MISSION

Get **FleetOps AI** submitted to the **All Things Agentic Hackathon** (Google Cloud) before
the deadline. The code is done. Your job is to close the gap between "working MVP in a
monorepo" and "submitted entry with a public repo, a live Google Cloud deployment, and a
demo video" — doing every part that does not legally require a human, and driving the
human parts down to the smallest possible number of clicks.

**Hard deadline: 2026-09-01 00:00 UTC** (= Aug 31, 5:00 PM PDT = Sep 1, 5:30 AM IST).

Compute your remaining time at start and print it. As of this prompt's authoring it was
**~29 hours**. Treat anything under 6 hours remaining as an emergency: stop all polish and
optimize purely for a valid submission existing before the clock runs out.

This is a race against a wall-clock deadline, not a quality bar. **A submitted B+ entry
beats an unsubmitted A+ entry infinitely.** Sequence every decision by that rule.

## NON-NEGOTIABLE CONSTRAINTS

Violating any of these fails the task outright:

1. **Never attempt to defeat a captcha, OTP, 2FA, or bot check.** Not with a solver
   service, not with a headless-browser workaround, not by scripting around it. When you
   hit one, stop and escalate to the human.
2. **Never click the final "Submit for judging" button.** Devpost submission is a legal
   attestation of authorship by a named person. Fill the form, save it as a **draft**, and
   hand it to the human to review and submit. Same for accepting any terms checkbox.
3. **Never create accounts, upload to YouTube, or authenticate as the human** using
   credentials you found lying around. Use only credentials explicitly provided to you for
   this task via environment variables or an already-authenticated CLI session.
4. **Never fabricate submission artifacts.** No fake screenshots of a Cloud Run dashboard,
   no AI-generated "demo" of a deployment that isn't live, no claimed test counts you
   didn't run. Every number that appears on screen or in the write-up must be real. If a
   deploy fails, say it failed.
5. **Never enable `FLEETOPS_ALLOW_REAL_REMEDIATION=true`.** The human-approval gate in
   dry-run is the thing being judged. Real `gcloud` mutations are out of scope and unsafe.
6. **Don't rewrite the app.** The MVP is verified working. Scope is packaging, deploying,
   recording, and submitting. Touch `lib/` or `app/` only to fix an outright bug that
   blocks the demo.

## GROUND TRUTH (verified 2026-08-21 by executing the code — do not re-derive, do re-verify)

Repo: `jeromtom/hackathoner-hq`, branch `claude/hackathon-mvp-submission-u0brvl`
Project path: `incubator/all-things-agentic`
Stack: Next.js 14 + TypeScript + Tailwind, Vitest. Node 20.

- `npm test` → **30/30 passing**, 4 files (scanner, policy, remediation, fleet).
- `npm run build` → clean, 4 routes, `output: "standalone"`.
- `Dockerfile` (multi-stage, non-root, listens on `$PORT`, defaults `FLEETOPS_MOCK=true`)
  and `deploy.sh` exist. The standalone `server.js` was verified booting and serving.
- `POST /api/scan` → **17 resources across 3 projects → 9 findings → 9 remediations**,
  severities **3 critical / 3 high / 3 medium**.
- Project split: acme-prod **8**, acme-staging **4**, acme-analytics **5**.
- Snapshot id: `snap-2026-08-25T09-12-04Z`.
- UI facts that matter for the video (a previous script got these wrong):
  - There is **no "Draft remediation" button**. All 9 fixes are drafted during the scan;
    selecting a finding reveals its draft.
  - Buttons are literally **"✓ Approve · Execute"**, **"Defer"**, **"Deny"**. Deny and
    Defer are separate.
  - The deny reason is **enforced** — `applyDecision(..., "deny")` throws
    `Deny requires a humanReason (audit trail).` if the reason is blank. Type it first.
  - The audit log **does not stream line-by-line**; one request returns finished state.
  - Fleet Overview is **4 status cards**, not 3.
  - `rem-01` → finding-01, the public GCS bucket (1st in list). `rem-02` → finding-08,
    the cross-env IAM owner binding (**2nd** in the list — the 3rd is the SSH firewall).
  - After approving rem-01 and denying rem-02, the remediation card reads exactly
    `1 executed, 0 deferred, 1 denied, 7 pending` and the audit log holds 22 events.
  - Drafted command for finding-01 is `gcloud storage buckets update gs://acme-user-uploads
    --uniform-bucket-level-access --public-access-prevention`.

Re-run `npm test` and one `POST /api/scan` at start to confirm none of this drifted. If a
number changed, **trust the running code and update the docs**, not the reverse.

Read these before acting: `SUBMISSION.md` (step-by-step runbook + pre-filled Devpost
values), `DEMO_SCRIPT.md` (timestamped 3:30 script + Devpost long description),
`RULES_NOTES.md` (rules research), `SETUP.md` (env vars, deploy).

## SUBMISSION REQUIREMENTS (what judges check)

Stage 1 is pass/fail on presence:
- Demo video **≤ 4 minutes**, public on YouTube/Vimeo (Private is rejected).
- Public GitHub repo URL, containing an architecture diagram + reproducible setup.
- Project write-up on the Devpost form.
- **Visible proof of Google Cloud deployment.**

Stage 2 is weighted on: **Proof of Action** (unedited live agent execution),
**Documentation**, **Google Cloud deployment proof**. Judges reward proof over polish — an
uncut terminal/browser capture beats a glossy edited reel.

Track to submit under: **The Fortified Enterprise Fleet**.

## OBJECTIVES — in strict priority order

Work them in order. After each, commit and push to
`claude/hackathon-mvp-submission-u0brvl`. Never leave finished work uncommitted; the
machine is ephemeral.

### O1 — [AUTO] Re-verify the build (target: 10 min)
`npm ci && npm test && npm run build`. Then boot the standalone server and
`curl -X POST localhost:PORT/api/scan`. Confirm 17/9/9. Fix anything broken; a broken
build at hour 28 is fatal.

### O2 — [AUTO] Promote to a public repo (target: 20 min)
Create `jeromtom/fleetops-ai` as a **public** repo from `incubator/all-things-agentic` as
its root (not a subdirectory — judges get a repo URL, and the README must be at the top
level). Exclude `node_modules`, `.next`, any `.env`, any `*-sa.json`.

Requires `gh` authenticated as `jeromtom`. If it isn't, **escalate — do not improvise
another host.** Acceptance: the repo is public, `README.md` renders its mermaid
architecture diagram on github.com, `LICENSE` and `SETUP.md` are present.

### O3 — [AUTO] Deploy to Cloud Run (target: 30 min)
`./deploy.sh <PROJECT_ID>` from the promoted repo. It enables the APIs, builds the
Dockerfile, deploys, and prints the service URL.

Requires `gcloud` authenticated with billing enabled. If not, **escalate immediately** —
this is the single hardest requirement to fake and the one judges weight most.

Acceptance: `curl -X POST https://<url>/api/scan` from outside returns the 17/9/9 payload.
Record the URL into `SUBMISSION.md` Step 3 and commit.

### O4 — [AUTO] Produce the demo video (target: 3–4 hours; the long pole)
This is normally the human bottleneck. **Automate it.** Build a reproducible pipeline in
`video/` in the promoted repo:

1. **Screen capture**: Playwright (Chromium is preinstalled; `PLAYWRIGHT_BROWSERS_PATH`
   is already set — do not run `playwright install`) with `recordVideo` at 1920×1080,
   driving the **live Cloud Run URL**, following `DEMO_SCRIPT.md` beat for beat: run the
   scan, scroll the audit log, open finding 1, approve, open finding 2, type a deny
   reason, deny, scroll to the Fleet Overview strip. Insert deliberate pauses (1.5–2.5s)
   so a human can read each panel. Do not speed anything up — this is the "unedited live
   execution" the rubric rewards.
2. **Deployment proof**: capture a terminal running
   `gcloud run services describe fleetops-ai --region <r> --format=yaml` showing the live
   URL and `Serving` status, plus the browser address bar on the `*.a.run.app` URL. The
   rules accept "Cloud Console screen, Cloud Run dashboard, Vertex AI logs, `.run` URL,
   etc.", so **this satisfies the requirement without a Cloud Console login** — which
   keeps the whole video automatable. Hold it on screen ≥5 continuous seconds.
3. **Title card**: render an HTML card (`FleetOps AI — All Things Agentic — The Fortified
   Enterprise Fleet`) and screenshot it; 3 seconds head and tail.
4. **Narration**: synthesize the `DEMO_SCRIPT.md` voiceover lines. Google Cloud
   Text-to-Speech is already reachable with the deploy credentials (Neural2/Studio voice,
   en-US or en-IN); `piper`/`espeak` offline is an acceptable fallback. Time each line to
   its beat.
5. **Mux**: `ffmpeg` to combine capture + narration, normalize audio, and hard-cap the
   result at **3:45**. Assert the duration programmatically and fail loudly if over 4:00.

Acceptance: `video/fleetops-demo.mp4` exists, is ≤ 3:45, has audible narration, and shows
in one continuous take: scan → 9 findings → approve → deny-with-reason → fleet status.
Commit the pipeline scripts so the run is reproducible.

**If TTS is unavailable**, still produce the silent screen capture and write
`video/NARRATION.txt` with per-beat timings so the human can record voice over it in one
pass. A silent capture plus on-screen captions is a valid fallback; no video at all is not.

### O5 — [GATE→AUTO] Devpost draft (target: 20 min)
Devpost registration is captcha + OTP gated. **Escalate for it.** Once the human confirms
they're registered and hands you an authenticated browser session, fill the submission
form and **save as draft** using the pre-filled values in `SUBMISSION.md` Step 5 (project
name, 197-char elevator pitch, track, repo URL, video URL, built-with tags, long
description from `DEMO_SCRIPT.md`, country India, solo).

Then **stop.** The human reviews and clicks Submit.

### O6 — [AUTO] Hand-off report
Write `SUBMISSION_STATUS.md` at the repo root: what's done, what's outstanding, every live
URL, and the exact remaining human actions with time estimates. Update the FleetOps row in
`TRACKER.md`. Commit and push both.

## ESCALATION PROTOCOL

Three gates genuinely require the human. When you reach one:

1. **Stop that objective** — do not burn time working around it.
2. **Keep going on everything else.** A missing Devpost account does not block building
   the video. Parallelize; never serialize behind a human.
3. **Emit a single consolidated ask**, not a drip of questions. State exactly what you
   need, why, and what is blocked until you get it.

The gates: **Devpost registration** (captcha + OTP), **YouTube upload** (account auth —
you may produce the file and the metadata, the human uploads it as Public/Unlisted), and
**the final Submit click** (legal attestation).

If `gh` or `gcloud` auth is missing, that is a fourth gate — escalate at once, since O3
gates O4 which gates O5.

## VERIFICATION — run before declaring done

```bash
npm test                                        # expect 30/30
npm run build                                   # expect clean
curl -X POST https://<cloud-run-url>/api/scan   # expect 17 resources / 9 findings / 9 remediations
ffprobe -v error -show_entries format=duration video/fleetops-demo.mp4   # expect < 240s
```

Plus: repo public and diagram rendering, video public and playable in a logged-out
browser, Cloud Run URL live, Devpost draft populated.

## DEFINITION OF DONE

Ideal: public repo + live Cloud Run URL + ≤4-min video on YouTube + populated Devpost
draft, with the human's remaining work being ~10 minutes of review-and-click, reported in
`SUBMISSION_STATUS.md`.

Acceptable under time pressure: public repo + live Cloud Run URL + a video file ready to
upload + a written list of the exact form values, delivered with enough clock left for the
human to finish.

Failure: the deadline passes with work sitting uncommitted or unreported.

## ANTI-PATTERNS

- Polishing the UI, refactoring agents, or adding features. **Scope is submission, not
  improvement.** Every minute spent on the app is stolen from the video.
- Re-deriving facts already in the GROUND TRUTH section.
- Silently working around a blocked gate instead of escalating.
- Waiting on a human when other objectives remain workable.
- Perfecting the video. Two decent takes beat six great ones that miss the deadline.
- Leaving work uncommitted "until it's finished." Commit continuously; the box is
  ephemeral.

## CLOCK DISCIPLINE

Print remaining time at the start of every objective. Checkpoints:

- **T-24h**: O1–O3 done (repo public, deploy live).
- **T-12h**: O4 done (video file exists).
- **T-6h**: video uploaded, Devpost draft populated, human pinged.
- **T-3h**: escalate loudly and repeatedly regardless of state. Better a human woken at
  3 AM than a $10,000 entry that never got submitted.
