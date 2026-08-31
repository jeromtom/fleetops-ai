# FleetOps AI — Submission Runbook

**Event**: [All Things Agentic Hackathon](https://allthingsagentichackathon.devpost.com/) (Google Cloud)
**Track**: The Fortified Enterprise Fleet
**Prize**: $10,000 USD cash (1st place, per track) + $1,000 GCP credits
**Deadline**: **Aug 31, 2026 · 5:00 PM PT** = **Sep 1, 2026 · 5:30 AM IST**
**⏰ AS OF 2026-08-30 19:39 UTC: ~28 HOURS 21 MINUTES REMAIN.** The "Aug 28 safe target" originally
written here has already passed — there is no buffer left. Treat every step below as
same-day work. See [`CODEX_GOAL.md`](./CODEX_GOAL.md) for the agent prompt that runs the
automatable parts in parallel.

This is the only file you need open. Everything below is either already done, or a
numbered step with the exact text to paste.

---

## Status board

| # | Item | State |
|---|------|-------|
| 1 | Working 3-stage MVP | ✅ Done — 32/32 tests pass (verified 2026-08-30) |
| 2 | Production build | ✅ Done — `npm run build` clean, 4 routes |
| 3 | Container for Cloud Run | ✅ Done — `Dockerfile` + `deploy.sh`, standalone server verified serving on `$PORT` |
| 4 | Architecture diagram | ✅ Done — mermaid in `README.md`, renders on GitHub |
| 5 | Reproducible setup docs | ✅ Done — `SETUP.md` (mock mode = zero keys) |
| 6 | MIT `LICENSE` | ✅ Done |
| 7 | Devpost write-up copy | ✅ Done — pre-filled in §Step 5 below |
| 8 | Video shot list | ✅ Done — `DEMO_SCRIPT.md` (3:30 script, timestamped), **reality-checked against the running UI 2026-08-21**: every button label, log line, and on-screen number now matches what the app actually renders |
| 9 | **Devpost registration** | ⬜ **Needs you** — captcha + email OTP |
| 10 | **Public GitHub repo** | ✅ Done — <https://github.com/jeromtom/fleetops-ai> (`main`) |
| 11 | **Public deployment** | ✅ Done — <https://fleetops.rexindynamics.com> fronts dedicated-project revision `fleetops-ai-00001-577`, Ready and serving 100% of traffic |
| 12 | **Demo video recorded + on YouTube** | 🟡 Earlier mock-mode file exists; re-record the scan segment for live-project proof, then upload to YouTube |
| 13 | **Click Submit** | ⬜ **Needs you** |

Items 9–13 are the ones that cannot be automated: they need a human identity, a
captcha, a Google account, a microphone, and a legal attestation.

**Estimated hands-on time: ~2 hours**, dominated by recording the video.

---

## Step 1 — Register on Devpost (~10 min)

1. Open <https://allthingsagentichackathon.devpost.com/> → **Register**.
2. Sign in as `dev.jeromtom@gmail.com`. Solve captcha / paste the email OTP.
3. Profile: Name `Jerom Tom`, Country `India`, GitHub `jeromtom`.
4. While you're there: **Resources** tab → claim the free **$150 Google Cloud credit**
   (it pays for the Cloud Run deploy in Step 3).

> India is eligible. Excluded countries are Italy, Quebec, Crimea, Cuba, Iran, Syria,
> North Korea, Sudan, Belarus, Russia.

## Step 2 — Promote to a public repo (~10 min)

Judges need a public repo URL containing the architecture diagram and setup instructions.

```bash
# from the hackathoner-hq root
cp -r incubator/all-things-agentic /tmp/fleetops-ai
cd /tmp/fleetops-ai
rm -rf node_modules .next
git init && git add -A
git commit -m "FleetOps AI — live GCP security and compliance workflow"
gh repo create jeromtom/fleetops-ai --public --source=. --push
```

Verify on GitHub that the README's mermaid architecture diagram renders.

## Step 3 — Deploy to Cloud Run (~15 min)

```bash
gcloud auth login
cd /tmp/fleetops-ai
./deploy.sh YOUR_GCP_PROJECT_ID
```

The script enables the required APIs, builds the `Dockerfile`, deploys, and prints:

```
Deployed: https://fleetops-ai-XXXXX.a.run.app
```

**Cloud Run URL → <https://fleetops-ai-ywb5cstj7a-uc.a.run.app>**

**Primary live demo URL → <https://fleetops.rexindynamics.com>**

Sanity-check it before recording:

```bash
curl -sS -X POST https://fleetops.rexindynamics.com/api/scan \
  -H 'content-type: application/json' -d '{}' | jq \
  '{source:.state.snapshot.source,resources:(.state.snapshot.resources|length),findings:(.state.findings|length),remediations:(.state.remediations|length)}'
# expect: source="cloud-asset", resources=4, findings=4, remediations=4
```

> Optional but cheap insurance: `docker build -t fleetops-ai . && docker run -p 8080:8080 fleetops-ai`
> first, to catch build issues without burning a Cloud Build run.

## Step 4 — Record the demo video (~60 min incl. retakes)

Full timestamped script with the exact voiceover lines is in
[`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md). Condensed shot list:

| Time | Shot | Why it matters |
|------|------|----------------|
| 0:00–0:20 | Title card + problem hook | Frames the value prop |
| 0:20–0:45 | **Cloud Run dashboard**, service `Serving`, ≥5 continuous seconds | **Mandatory** — this is the "Google Cloud deployment proof" criterion |
| 0:45–1:15 | Click "Run new scan", scroll the ScannerAgent trace in the Audit Log | Proof of Action — Taskmaster pattern |
| 1:15–2:00 | 4 live-project findings populate, open the public-bucket finding | Fortified Enterprise Fleet — the submission track |
| 2:00–2:50 | Drafted `gcloud` shown on select → **✓ Approve · Execute** → audit log; then type a reason and **Deny** the IAM finding | Collaborative Partner — human-in-the-loop |
| 2:50–3:15 | Fleet Overview strip, 4 status cards | Multi-agent coordination |
| 3:15–3:30 | GitHub repo: architecture diagram + setup | Documentation criterion |

Hard rules:
- **≤ 4 minutes.** Only the first 4 minutes are judged.
- **Do not edit-cut the agent execution.** Judges score "unedited live execution".
  An uncut 3-minute capture beats a polished reel that hides agent behavior.
- Upload to YouTube as **Public or Unlisted** — Devpost rejects Private links.
- 1080p+, mic audio, no background music, cursor visible.

**Rendered file → `video/fleetops-demo.mp4` (3:22.567, 1920×1080, narrated)**

**Record the YouTube URL here → `________________________________`**

> The script was corrected on 2026-08-21 after running the app: there is **no "Draft
> remediation" button** (drafts are created during the scan), Deny and Defer are separate
> buttons, the deny reason is enforced, and the audit log does not animate line-by-line.
> Following the current script means no surprises mid-take.

## Step 5 — Fill the Devpost form (~15 min)

Devpost → the hackathon page → **Submit project**. Paste these verbatim.

**Project name**
```
FleetOps AI
```

**Elevator pitch**
```
A three-stage Cloud Asset workflow that audits real GCP resources for security and compliance drift, drafts project-specific fixes, and requires human approval while keeping execution safely in dry-run.
```

**Track**
```
The Fortified Enterprise Fleet
```

**Repo URL**
```
https://github.com/jeromtom/fleetops-ai
```

**Live demo URL**
```
https://fleetops.rexindynamics.com
```

**Video URL** — the YouTube link from Step 4.

**Built with**
```
next.js, typescript, tailwind, google-cloud-run, cloud-asset-inventory, cloudflare-workers
```

**Long description** — copy the "Long description (paste into Devpost)" block at the
bottom of [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md).

**Country**: India. **Team**: solo.

## Step 6 — Pre-submit checklist

Stage 1 judging is pass/fail on these. Check every box before clicking Submit.

- [ ] Demo video is ≤ 4:00 and publicly viewable in an incognito window
- [ ] Video visibly shows the Cloud Run dashboard (deployment proof)
- [ ] Video shows one uncut agent execution cycle
- [ ] Repo is **public** and the README architecture diagram renders
- [ ] Repo has reproducible setup instructions (`SETUP.md`)
- [ ] `LICENSE` present
- [ ] Track selected: The Fortified Enterprise Fleet
- [ ] Long description pasted
- [ ] `fleetops.rexindynamics.com` and the direct Cloud Run origin still respond
- [ ] Submitted before **Aug 31, 5:00 PM PT / Sep 1, 5:30 AM IST**

Then click **Submit for judging** — and update `TRACKER.md` to `✅ SUBMITTED`.

---

## Notes on judging

Weighted Stage 2 criteria are **Proof of Action**, **Documentation**, and **Google
Cloud deployment proof**. All three are things the *video* has to carry — the code is
already in good shape, so the video is where the remaining marginal score lives. Budget
your time accordingly.

Per-place breakdown below 1st place is still unverified; confirm on the Devpost rules
page once you're registered (egress from the build environment blocks devpost.com).
