# FleetOps AI — Setup

Everything you need to get FleetOps AI running locally, in mock mode (zero keys), or against live Google Cloud + Gemini.

---

## Prerequisites

- Node.js 20 LTS or newer
- npm 10+
- (Optional, for live mode) A Google account for AI Studio + Google Cloud Console
- (Optional, for live GCP asset scan) A GCP project with the Cloud Asset Inventory API enabled + a service account with `roles/cloudasset.viewer`

## Quick start (mock mode — zero keys, offline)

```bash
cd incubator/all-things-agentic
npm install
npm run dev
# → http://localhost:3000
```

Mock mode is ON by default (`FLEETOPS_MOCK=true`). The bundled AcmeCorp GCP snapshot loads in <200ms; the 3 agents (Scanner → Policy → Remediation) run over it and produce 9 findings ready for triage.

## Tests

```bash
npm test         # runs the full Vitest suite
```

Expected: **all tests pass** (see `tests/` for coverage).

## Live mode (Gemini + optional live GCP scan)

1. Get a free `GOOGLE_AI_API_KEY` at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
2. Copy `.env.example` → `.env.local` and set:
   ```
   FLEETOPS_MOCK=false
   GOOGLE_AI_API_KEY=your_key_here
   GEMINI_MODEL=gemini-2.0-flash-exp
   ```
3. (Optional — live GCP scan instead of bundled snapshot) create a GCP service account with `roles/cloudasset.viewer` on your org, download the JSON, and:
   ```
   GCP_SERVICE_ACCOUNT_JSON_PATH=./gcp-sa.json
   GCP_ORG_ID=organizations/123456789012
   ```
4. `npm run dev` — the ScannerAgent will call the real Cloud Asset Inventory API; PolicyAgent will call real Gemini.

**RemediationAgent stays in dry-run mode by default.** To let it execute real `gcloud` commands, set:
```
FLEETOPS_ALLOW_REAL_REMEDIATION=true
```
and ensure the runtime service account has `roles/editor` on the target projects. **Do NOT enable this in a hackathon demo** — the judges want to see the agent draft commands and wait for human approval, not silently mutate a production project.

## Deploy to Google Cloud Run (needed for hackathon submission proof)

The repo ships a `Dockerfile` (Next.js standalone output, non-root user, listens on
`$PORT`) and a `deploy.sh` wrapper. Cloud Run builds the Dockerfile automatically
when one is present.

```bash
# 1. Install & auth gcloud
gcloud auth login

# 2. Build + deploy in one shot (enables the required APIs, then deploys)
./deploy.sh YOUR_GCP_PROJECT_ID              # region defaults to us-central1
# ./deploy.sh YOUR_GCP_PROJECT_ID asia-south1   # or pick a region

# 3. The script prints the https://fleetops-ai-XXXXX.a.run.app URL
#    — screen-capture this AND the Cloud Run dashboard in your demo video
```

**Verify the container locally before deploying** (catches build problems without
burning a Cloud Build run):

```bash
docker build -t fleetops-ai .
docker run -p 8080:8080 fleetops-ai
curl -X POST http://localhost:8080/api/scan   # expect 17 resources → 9 findings → 9 remediations
```

The image defaults to `FLEETOPS_MOCK=true` and `FLEETOPS_ALLOW_REAL_REMEDIATION=false`,
so a fresh deploy demos the full 3-agent pipeline with **zero API keys** and cannot
mutate any real GCP resource. To demo live Gemini policy reasoning, redeploy with
`FLEETOPS_MOCK=false` and `GOOGLE_AI_API_KEY=...` in the `--set-env-vars` list.

---

## Claude in Chrome runbook (for Jerom)

Copy-paste this block into Claude in Chrome to have it register you at the hackathon, claim credits, and get keys — Jerom handles captchas / OTPs / 2FA. **Never auto-submit the final Devpost submission form** — Jerom reviews first.

```
You are helping Jerom Tom register for the All Things Agentic Hackathon and set up FleetOps AI.
Details you'll need across all steps:

  Name:            Jerom Tom
  Email:           dev.jeromtom@gmail.com
  GitHub:          jeromtom
  Country:         India
  Role:            Software Developer / AI Agent Builder
  Team size:       Solo
  Project name:    FleetOps AI
  Project tagline: 3-agent Google ADK fleet that autonomously audits GCP for cost + security + compliance
  Track choice:    The Fortified Enterprise Fleet
  Repo URL (fill in after promotion):  https://github.com/jeromtom/fleetops-ai
  Deployment URL (fill in after Cloud Run deploy):  https://fleetops-ai-XXXXX.a.run.app

Perform these steps in order. STOP and ask Jerom whenever a captcha, OTP, 2FA prompt,
payment form, or the FINAL Devpost SUBMIT button appears. Never auto-click Submit.

STEP 1 — Register on Devpost
  1. Open https://allthingsagentichackathon.devpost.com/
  2. Click "Register" (top right). If Jerom is not signed in to Devpost, use dev.jeromtom@gmail.com
     and pause for the sign-in / OTP flow.
  3. Complete the participant profile: Name, Country=India, GitHub=jeromtom.
  4. Confirm registration success — screenshot the "You're registered" banner.

STEP 2 — Claim $150 free GCP credits
  1. On the same hackathon page, click the "Resources" tab.
  2. Find the "Claim your $150 in Google Cloud credits" link and open it in a new tab.
  3. Fill the credit-claim form (Jerom's name, email, country=India). Pause for any Google
     account sign-in / consent prompt.
  4. Screenshot the credit-claim confirmation.

STEP 3 — Get a Gemini API key
  1. Open https://aistudio.google.com/app/apikey
  2. Click "Create API key" → "Create API key in new project".
  3. Copy the key. Paste it into a scratch note titled "GOOGLE_AI_API_KEY".
  4. Do NOT commit it to GitHub.

STEP 4 — (Optional) Enable Cloud Asset Inventory API on a demo GCP project
  1. Open https://console.cloud.google.com/
  2. Create a fresh project called "fleetops-demo" (or reuse the credit-project).
  3. Search "Cloud Asset Inventory API" → Enable.
  4. IAM → Service Accounts → Create service account "fleetops-sa" with role
     "Cloud Asset Viewer". Create a JSON key, download it. Filename should end in ".json".
  5. Move the JSON into the repo as gcp-sa.json (add to .gitignore).

STEP 5 — Deploy to Cloud Run (Jerom runs the gcloud command locally)
  Follow SETUP.md → "Deploy to Google Cloud Run" section. Screenshot the printed
  https://fleetops-ai-*.a.run.app URL and share it with Jerom to paste into DEMO_SCRIPT.md.

STEP 6 — Draft the Devpost submission (DO NOT SUBMIT)
  1. Open https://allthingsagentichackathon.devpost.com/ → click "Submit project".
  2. Fill in:
       - Project name: FleetOps AI
       - Elevator pitch (200 chars): "A 3-agent Google ADK fleet that autonomously audits your
         Google Cloud org for cost waste, security drift, and compliance violations — and
         waits for human approval before executing safe remediation."
       - Track: The Fortified Enterprise Fleet
       - Repo URL: https://github.com/jeromtom/fleetops-ai
       - Video URL: paste the ≤4-min YouTube link from DEMO_SCRIPT.md
       - Long description: copy from DEMO_SCRIPT.md "Long description" section
       - Built with: Next.js, TypeScript, Tailwind, Google ADK, Gemini 2.0 Flash, Google Cloud Run
       - Country: India
  3. Save as DRAFT. STOP HERE. Do NOT click "Submit for judging". Ping Jerom to review
     every field and submit himself.
```

---

## Environment variables reference

| Var | Default | Purpose |
|-----|---------|---------|
| `FLEETOPS_MOCK` | `true` | If true, all agents use bundled snapshot + deterministic responses (no keys needed) |
| `GOOGLE_AI_API_KEY` | — | Gemini API key (live mode only) |
| `GEMINI_MODEL` | `gemini-2.0-flash-exp` | Which Gemini model PolicyAgent + RemediationAgent call |
| `GCP_SERVICE_ACCOUNT_JSON_PATH` | — | Path to GCP service-account JSON (live scanner only) |
| `GCP_ORG_ID` | — | GCP org resource name for real scanner (live scanner only) |
| `FLEETOPS_ALLOW_REAL_REMEDIATION` | `false` | Master safety switch for real `gcloud` writes — LEAVE OFF FOR DEMO |
