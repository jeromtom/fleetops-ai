# All Things Agentic Hackathon — Rules & Research Notes

**Compiled 2026-08-18 for jeromtom/hackathoner-hq builder run.**
**Sources**: [Official Devpost page](https://allthingsagentichackathon.devpost.com/), [Google Developer forum announcement](https://discuss.google.dev/t/the-all-things-agentic-hackathon-is-officially-live/389123), [Devpost resources tab](https://allthingsagentichackathon.devpost.com/resources), Devpost rules page (WebSearch synthesis — direct fetch blocked by egress policy).

---

## The one-liner

Build a next-generation agent (or fleet of agents) using **Google Gemini + Google's open-source Agent Development Kit (ADK) + Google Cloud**, deployed on Google Cloud, that runs in the background, handles massive datasets, or automates complex workflows asynchronously.

## Prize pool

- Headline: **$180,000 in prizes, cash, and Google Cloud credits.**
- **First place per track (cash): $10,000 USD + $1,000 GCP credits + virtual coffee w/ Google team + social promotion** (confirmed 2026-08-18 via Google Developer forums + scout research; prior Aug 9 / Aug 16 scouts INCORRECTLY marked "credits only" — the $180K headline includes $150 GCP credits distributed to all participants, but the top prizes ARE real cash).
- Every participant who claims can grab a **no-cost $150 Google Cloud credit** via the Resources tab.
- Per-place breakdown per track (2nd, 3rd, etc.) still UNVERIFIED at time of writing — need to check the Devpost rules page directly after registering, since egress is blocked from this environment.

## Dates & deadline

- **Submissions open**: August 3, 2026.
- **Submissions close**: **August 31, 2026 at 5:00 PM PT** = **September 1, 2026 at 5:30 AM IST** (13 days from today, 2026-08-18).
- Judging phase: Sep 1 – late Sep 2026.
- Winners: TBA.

## Tracks (choose ONE — each is independently judged)

1. **The Taskmaster** — background automation agents that run tasks asynchronously (data pipelines, monitoring, scheduled jobs).
2. **The Collaborative Partner** — human-AI teaming agents that pair with a user in a loop (interactive assistants, approval workflows).
3. **The Fortified Enterprise Fleet** — secure multi-agent fleets for enterprise (governance, RBAC, audit, policy enforcement).

**Winning angle for Jerom**: build ONE agent fleet that plausibly qualifies for ALL THREE tracks and pick the track with the least competition when submitting. Submit under Track 3 "Fortified Enterprise Fleet" (least crowded historically; enterprise angle plays to Jerom's tracker portfolio strengths).

## Submission requirements (checklist)

- [ ] **Demo video ≤ 4 minutes**, publicly visible on YouTube or Vimeo. Only the first 4 minutes are judged.
- [ ] Video must show:
  - Problem statement + value proposition (30s).
  - Live, unedited execution of the agent performing its task.
  - Visible proof the backend is running on Google Cloud (Cloud Console screen, Cloud Run dashboard, Vertex AI logs, `.run` URL, etc.).
- [ ] **Public GitHub repo URL** (or private + share with `testing@devpost.com` and `cloudhackathons@google.com`).
- [ ] Repo must contain: clean **architecture diagram** and **reproducible setup instructions**.
- [ ] Short project write-up on Devpost submission form.
- [ ] Google Cloud deployment proof (app need NOT be live at submission moment — just proof it WAS deployed).

## Judging criteria

**Stage 1** (pass/fail): all submission requirements present, reasonably addresses a Challenge, reasonably applies the requirements.

**Stage 2** (weighted):
- **Proof of Action** — video shows unedited live execution of the agent doing its task.
- **Documentation** — clean architecture diagram + reproducible setup instructions.
- **Google Cloud deployment proof** — clearly visible in the video.

Design bias: judges reward *proof over polish*. A 3-minute unedited terminal capture beats a beautiful edited pitch reel that hides the actual agent behavior.

## Eligibility

- **Open to everyone** except residents of: Italy, Quebec, Crimea, Cuba, Iran, Syria, North Korea, Sudan, Belarus, Russia.
- **India: ELIGIBLE ✓** (Jerom Tom, Kerala/India, `dev.jeromtom@gmail.com`, GitHub `jeromtom`).
- Individual, team, or org submissions accepted. Teams: all members must be Eligible Individuals and added on Devpost.
- **New original work required** (specific Google challenge prompts — cannot cross-submit MainsMentor / RegSentinel / etc. verbatim).
- Domain knowledge reuse from prior builds (RegSentinel, PrivacyPilot, CloudPilot) is FINE — code copy is NOT.

## Required tech stack

- **Gemini** (any model in the Gemini family — Gemini 2.0 Flash recommended for cost).
- **Google Agent Development Kit (ADK)** — open-source Python framework (github.com/google/adk). At least 2 agents wired via ADK are the effective minimum for "agentic" credit.
- **Google Cloud** — deployment target. Cloud Run is easiest (single-container Python + FastAPI). Vertex AI Agent Builder is an alternative.
- No blockchain, no on-device inference required.

## Sponsor / stacking notes

- No named sponsor side-prizes distinct from the 3 tracks. The 3 tracks each have their own $10K cash pool, so a single build that convincingly hits all 3 is judged in ONE track — pick the track with least dilution.
- The $1,000 GCP credit + $150 free trial = usable follow-on capital for post-hackathon projects.

## Cash-transfer eligibility

- Devpost pays winners globally via ACH / wire / PayPal / Payoneer depending on country. India: Payoneer or direct bank transfer (Wise). **CONFIRM at submission time**; not blocking build.

## Winning concept selected for this build

**"FleetOps AI"** — a 3-agent Google ADK fleet that autonomously audits Google Cloud projects for cost waste, security drift, and compliance policy violations, then coordinates human-in-the-loop remediation.

- **Agent 1: ScannerAgent** — background asset inventory over GCP projects (Cloud Asset Inventory API), stores snapshots. → **Taskmaster** track fit.
- **Agent 2: PolicyAgent** — evaluates each asset against a policy catalogue (SOC2, HIPAA, GDPR, cost thresholds) using Gemini for natural-language policy reasoning. → **Fortified Enterprise Fleet** track fit.
- **Agent 3: RemediationAgent** — proposes remediation, waits for human approval in a chat UI, executes approved fixes via `gcloud` shell tool. → **Collaborative Partner** track fit.

Submit under **The Fortified Enterprise Fleet** track (highest strategic fit + least likely crowded — enterprise angle deters solo builders).

Original build; does NOT copy code from RegSentinel/PrivacyPilot/CloudPilot but reuses domain knowledge (compliance policy language, GCP resource taxonomies).

---

## Open questions (require Jerom / registration to resolve)

1. Per-place cash breakdown per track (2nd, 3rd, honorable mentions) — check devpost rules page after registering.
2. India payout mechanism specifics (Wise vs Payoneer vs bank wire) — check when winners announced.
3. Whether the same project can be entered in more than one track separately — assume NO based on standard Devpost rules; pick one track.
4. Whether `gcloud` executor calls at demo time count as "unedited live execution" if they hit a live GCP project — assume YES; screen-recording a real `gcloud` call over a real project is the golden proof.

Sources:
- [All Things Agentic Devpost](https://allthingsagentichackathon.devpost.com/)
- [Google Developer forum announcement](https://discuss.google.dev/t/the-all-things-agentic-hackathon-is-officially-live/389123)
- [Devpost resources tab](https://allthingsagentichackathon.devpost.com/resources)
