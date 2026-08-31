# FleetOps AI — Setup

Everything you need to run FleetOps AI locally with the bundled fixture or against real Google Cloud Asset Inventory.

---

## Prerequisites

- Node.js 20 LTS or newer
- npm 10+
- (Optional, for live mode) A GCP project with Cloud Asset Inventory enabled and an ADC identity with `roles/cloudasset.viewer`

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

## Live Cloud Asset Inventory mode

FleetOps uses Google Application Default Credentials (ADC). For local development:

```bash
gcloud auth application-default login
gcloud services enable cloudasset.googleapis.com --project=YOUR_PROJECT_ID
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="user:YOUR_EMAIL" \
  --role=roles/cloudasset.viewer
```

Copy `.env.example` to `.env.local` and set:

```dotenv
FLEETOPS_MOCK=false
GCP_PROJECT_IDS=YOUR_PROJECT_ID
FLEETOPS_RESOURCE_FILTER=fleetops-demo,staging-deployer
FLEETOPS_ALLOW_REAL_REMEDIATION=false
```

`GCP_PROJECT_IDS` is an explicit comma-separated allowlist. The optional resource
filter is also comma-separated and is useful when the fixture shares a sandbox with
unrelated resources. Start the app with `npm run dev`, call `POST /api/scan`, and verify
that `state.snapshot.source` is `cloud-asset`.

To reproduce the four-resource sample used by the public deployment, see
[`demo-project/README.md`](./demo-project/README.md). The setup creates no compute
workload and no service-account key.

**Remediation is dry-run only. Keep `FLEETOPS_ALLOW_REAL_REMEDIATION=false`.** An
approved item records the proposed command and audit event but never invokes `gcloud`.

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
curl -X POST http://localhost:8080/api/scan   # default mock: 17 resources → 9 findings → 9 drafts
```

The image defaults to `FLEETOPS_MOCK=true` and `FLEETOPS_ALLOW_REAL_REMEDIATION=false`,
so a fresh deploy works with zero credentials and cannot mutate a real resource.

For live inventory on Cloud Run, grant its runtime service account
`roles/cloudasset.viewer` on the target sandbox, then deploy with an explicit allowlist:

```bash
gcloud run deploy fleetops-ai \
  --source . \
  --project=YOUR_DEPLOY_PROJECT \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars='^@^FLEETOPS_MOCK=false@FLEETOPS_ALLOW_REAL_REMEDIATION=false@GCP_PROJECT_IDS=YOUR_TARGET_PROJECT@FLEETOPS_RESOURCE_FILTER=fleetops-demo,staging-deployer'
```

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
  Project tagline: Live GCP security and compliance workflow with human-approved dry-run remediation
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

STEP 3 — Confirm no model key is required
  The current implementation uses live Cloud Asset Inventory plus a deterministic,
  version-controlled policy catalogue. Do not add or claim a Gemini key.

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
       - Elevator pitch: "A three-stage Cloud Asset workflow that audits real GCP resources,
         drafts project-specific fixes, and requires human approval while execution remains
         safely in dry-run."
       - Track: The Fortified Enterprise Fleet
       - Repo URL: https://github.com/jeromtom/fleetops-ai
       - Video URL: paste the ≤4-min YouTube link from DEMO_SCRIPT.md
       - Long description: copy from DEMO_SCRIPT.md "Long description" section
       - Built with: Next.js, TypeScript, Tailwind, Google Cloud Run, Cloud Asset Inventory
       - Country: India
  3. Save as DRAFT. STOP HERE. Do NOT click "Submit for judging". Ping Jerom to review
     every field and submit himself.
```

---

## Environment variables reference

| Var | Default | Purpose |
|-----|---------|---------|
| `FLEETOPS_MOCK` | `true` | If true, ScannerAgent uses the bundled snapshot; if false, it calls Cloud Asset Inventory |
| `GCP_PROJECT_IDS` | — | Required live-mode comma-separated project allowlist |
| `FLEETOPS_RESOURCE_FILTER` | — | Optional comma-separated asset-name fragments |
| `GOOGLE_APPLICATION_CREDENTIALS` | ADC default | Optional standard Google path to a local service-account JSON file |
| `FLEETOPS_ALLOW_REAL_REMEDIATION` | `false` | Must remain false; approvals are audit-logged dry runs |
