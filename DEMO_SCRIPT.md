# FleetOps AI — 4-Minute Demo Script

**Target length**: 3:30 (30s buffer under 4-min cap). **Format**: unedited screen capture + voiceover.

The judging criteria are **Proof of Action** + **Documentation** + **Google Cloud deployment proof**. All three must be visible on screen. Do NOT edit-cut the agent execution — the video should show live, uncut agent runs.

---

## Setup before recording

- Deploy to Cloud Run first (SETUP.md → deploy section). You need the `https://fleetops-ai-XXXXX.a.run.app` URL visible in the video.
- Have three browser tabs open:
  1. Cloud Run dashboard showing the `fleetops-ai` service RUNNING (proof of GCP deployment).
  2. The deployed `https://fleetops-ai-*.a.run.app` URL (or `localhost:3000` if demoing locally).
  3. The GitHub repo `jeromtom/fleetops-ai` showing the architecture diagram in the README.
- Have `FLEETOPS_MOCK=true` set — mock mode has a deterministic 9-finding demo dataset that shows the full flow cleanly.

## Recording checklist

- [ ] 1080p or higher, mic audio, no background music
- [ ] Cursor visible
- [ ] Show Cloud Run dashboard for at least 5 continuous seconds (deployment proof)
- [ ] Show ONE full agent-execution cycle uncut
- [ ] Upload to YouTube as **Public** or **Unlisted** (not Private — Devpost rejects Private)

---

## Script (3:30)

### 0:00 – 0:20 — Problem hook

> "A mid-size company runs 20 Google Cloud projects. Every week, hidden waste piles up: a stale Cloud SQL bleeding $4,800 a month, a bucket left public overnight, an IAM binding that violates SOC2. Manual auditing takes hours. Miss one, and the bill or the breach lands on Monday morning. FleetOps AI is the always-on autonomous compliance officer for your Google Cloud org."

**Screen**: title card `FleetOps AI — All Things Agentic — The Fortified Enterprise Fleet`.

### 0:20 – 0:45 — Google Cloud deployment proof (⚠️ mandatory)

**Screen**: switch to Cloud Run dashboard. Show `fleetops-ai` service, status `Serving`, region `us-central1`, click on it, show revisions + logs streaming.

> "This is FleetOps AI deployed on Google Cloud Run. Three ADK agents — Scanner, Policy, and Remediation — powered by Gemini 2.0 Flash. Let's put it to work."

### 0:45 – 1:15 — Agent 1: ScannerAgent (Taskmaster track)

**Screen**: Open the deployed URL. Click **"Run new scan"**. The whole fleet runs in
well under a second, then the Audit Log panel fills with the real agent trace — scroll
to the top of it so these ScannerAgent lines are legible:

```
[ScannerAgent] Listing projects in organizations/123456789012
[ScannerAgent] Found 3 projects: acme-prod, acme-staging, acme-analytics
[ScannerAgent] Snapshotting assets for acme-prod (8 resources)
[ScannerAgent] Snapshotting assets for acme-staging (4 resources)
[ScannerAgent] Snapshotting assets for acme-analytics (5 resources)
[ScannerAgent] Snapshot stored: snap-2026-08-25T09-12-04Z
```

> ⚠️ The pipeline is a single request that returns the finished state — the log does not
> animate line-by-line. Don't narrate it as "watch it stream"; say "here's the trace it
> produced". Scrolling the audit log on camera is what shows the work.

> "ScannerAgent runs asynchronously in the background — this is the Taskmaster pattern. It pulled 17 resources across 3 projects in under 2 seconds. In production it snapshots on a Cloud Scheduler cron. The snapshot is stored, immutable, and hands off to the Policy agent."

### 1:15 – 2:00 — Agent 2: PolicyAgent (Fortified Enterprise Fleet track — the submission track)

**Screen**: The Findings panel is now populated — 9 findings, severity-sorted, each with
a severity chip (3 CRITICAL / 3 HIGH / 3 MEDIUM), a plain-English explanation, and a
policy citation (SOC2, HIPAA, GDPR, CIS, cost threshold).

Click the **1st finding in the list — "GCS bucket acme-user-uploads is publicly readable"** (CRITICAL).

> "PolicyAgent evaluated every resource against our policy catalogue — SOC2, HIPAA, GDPR, CIS, cost thresholds. It flagged 9 findings. Here — a Cloud Storage bucket `acme-user-uploads` is publicly readable. PolicyAgent cites HIPAA §164.312(a)(1) and rates it CRITICAL. This is the Fortified Enterprise Fleet at work: read-only agent, separate scope from remediation, every finding audit-logged."

### 2:00 – 2:50 — Agent 3: RemediationAgent (Collaborative Partner track)

**Screen**: With that finding selected, the Remediation panel on the right already shows
the drafted `gcloud` command. **There is no "Draft remediation" button** — RemediationAgent
drafts all 9 fixes during the scan, so selecting a finding reveals its draft:

```
gcloud storage buckets update gs://acme-user-uploads \
  --uniform-bucket-level-access \
  --public-access-prevention
```

Explanation panel reads: "Turns on uniform bucket-level access and enforces
publicAccessPrevention, blocking all anonymous GetObject calls. Existing app-level access
via IAM continues to work."

Click **"✓ Approve · Execute"**. The audit log gains:

```
[RemediationAgent] Human approved rem-01 → executing (DRY-RUN)
[RemediationAgent] [DRY-RUN] Executed: gcloud storage buckets update gs://acme-user-uploads \…
[RemediationAgent] Audit log entry written: audit-exec-rem-01
```

> "RemediationAgent is the Collaborative Partner — it never mutates production without a human tap. It drafted the fix, waited for me to review, and only then executed. Every action is audit-logged in Cloud Logging. Now let me deny one."

Now click the **2nd finding — "IAM: staging-deployer @ acme-prod — cross-environment
roles/owner binding"** (CRITICAL). Type a reason in the reason box, e.g.
`Staging deploy freeze until Q4 — revisit after release`, then click **"Deny"**.

> ⚠️ **Deny and Defer are two separate buttons**, and the reason field is **enforced** — the
> agent throws "Deny requires a humanReason (audit trail)" if you leave it blank. Type the
> reason *first*, then click Deny. This is a great beat to narrate: the fleet refuses to
> record a human decision without an audit reason.

### 2:50 – 3:15 — Multi-agent coordination summary

**Screen**: Scroll to the Fleet Overview strip at the top — **4 status cards**, now reading:

```
ScannerAgent · Taskmaster           idle (17 assets snapshotted)
PolicyAgent · Fortified Fleet       evaluated 17 assets → 9 findings
RemediationAgent · Collab Partner   1 executed, 0 deferred, 1 denied, 7 pending
Audit trail                         <n> events
```

> "Three specialised agents, each with a scoped role. ScannerAgent is read-only over the whole org. PolicyAgent reasons about compliance. RemediationAgent is the only agent with write scope, and every write requires human approval. That's the Fortified Enterprise Fleet pattern — enterprise-grade separation of concerns, delivered as a shipping ADK application."

### 3:15 – 3:30 — Documentation + close

**Screen**: Switch to the GitHub repo. Scroll through the README showing:
- Architecture diagram (the mermaid rendered)
- `npm install` / `npm run dev` setup
- `.env.example`

> "The whole thing is on GitHub, MIT license, 30 passing tests, mock mode runs offline. FleetOps AI, submitted to All Things Agentic, Fortified Enterprise Fleet track. Thanks."

**Final frame**: `github.com/jeromtom/fleetops-ai` + `https://fleetops-ai-*.a.run.app`.

---

## Long description (paste into Devpost)

> **FleetOps AI** is a 3-agent Google ADK fleet that acts as an autonomous FinOps + security + compliance officer for a Google Cloud organization. It replaces the manual weekly SRE audit sweep with a continuous background scan and a human-approved remediation queue.
>
> **The problem.** A mid-size org running 20+ GCP projects loses money to stale resources (idle Cloud SQL, oversized VMs, orphaned load balancers) AND accumulates security drift (public buckets, permissive IAM, missing CMEK encryption). Manual auditing is slow, misses drift, and doesn't scale. Single-shot LLM prompts can't do the job — you need specialised agents with scoped roles and coordinated cadences.
>
> **The solution.** Three ADK agents:
>
> 1. **ScannerAgent (The Taskmaster)** — runs asynchronously, pulls Cloud Asset Inventory across all projects, stores snapshots. Read-only scope, background cadence.
> 2. **PolicyAgent (The Fortified Enterprise Fleet)** — evaluates every asset against a policy catalogue (SOC2, HIPAA, GDPR, CIS, cost thresholds). Uses Gemini 2.0 Flash to reason about natural-language policies. Produces findings with severity + citation + risk score.
> 3. **RemediationAgent (The Collaborative Partner)** — drafts a `gcloud` remediation command per finding, requests human approval via chat UI, executes only after approval, writes audit log to Cloud Logging. Sole write-scoped agent; strict human-in-the-loop.
>
> **Why this stacks all three tracks.** ScannerAgent = Taskmaster (async background). PolicyAgent = Fortified Enterprise Fleet (RBAC-separated, audit-logged, enterprise policy-driven). RemediationAgent = Collaborative Partner (human-approval gate). Submitted under **The Fortified Enterprise Fleet** track.
>
> **Deployed on Google Cloud Run** (see demo video for proof), Gemini 2.0 Flash for policy reasoning, ADK for agent orchestration, Next.js for the triage UI.
>
> **Try it locally in mock mode with zero keys.** Bundled 17-resource AcmeCorp GCP snapshot shows all 3 agents through the full pipeline in under 2 seconds. 30 passing tests. See GitHub README.
