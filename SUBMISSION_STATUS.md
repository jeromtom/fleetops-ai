# FleetOps AI — Submission Status

**Last verified:** 2026-08-31 03:36 UTC

**Hard deadline:** 2026-09-01 00:00 UTC (2026-09-01 05:30 IST)

**Time remaining at this checkpoint:** approximately 20 hours 24 minutes

**Submission state:** artifacts ready; YouTube upload, Devpost draft, and final human submission remain

## Completed and verified

- Public repository: <https://github.com/jeromtom/fleetops-ai>
  - Visibility: public
  - Default branch: `main`
  - README: GitHub Mermaid render container verified; the rendered architecture is visible in the demo
  - `LICENSE` and `SETUP.md`: present
- Primary live demo: <https://fleetops.rexindynamics.com>
  - HTTPS: valid Cloudflare-managed certificate
  - Edge: `fleetops-ai-proxy` Worker, exact hostname route over the existing Rexin wildcard portal route
  - Source and reproducible deployment config: `cloudflare-proxy/`
- Google Cloud Run origin: <https://fleetops-ai-ywb5cstj7a-uc.a.run.app>
  - Project: `fleetops-live-demo-2026` (dedicated project owned by `dev.jeromtom@gmail.com`)
  - Region: `us-central1`
  - Service: `fleetops-ai`
  - Ready revision: `fleetops-ai-00001-577`
  - Traffic: 100% to the latest ready revision
  - Runtime identity: `fleetops-runtime@fleetops-live-demo-2026.iam.gserviceaccount.com`
  - Safety: `FLEETOPS_MOCK=false`; `FLEETOPS_ALLOW_REAL_REMEDIATION=false`
- Real sample project: `fleetops-live-demo-2026` (same dedicated project)
  - Runtime identity has only `roles/cloudasset.viewer` on the target project
  - Two small GCS buckets: one harmless public object, one empty CMEK test bucket
  - One open-SSH firewall rule targeting a tag used by no VM
  - One keyless `staging-deployer` service account with an intentional Editor binding
  - No demo VM, database, load balancer, credential key, or private data
- Application verification:
  - `npm test`: 32/32 passing across 5 files
  - `npm run build`: clean Next.js production build, 4 routes
  - Public `POST /api/scan`: `source=cloud-asset`, 4 resources, 4 findings, 4 remediations
  - Findings: public bucket, missing CMEK, open SSH, cross-environment Editor
  - Approval API verified: status `executed`, audit ID recorded, action explicitly `DRY-RUN`
  - Independent before/after GCP checks verified the bucket IAM and firewall did not change
- Demo video: `video/fleetops-demo.mp4`
  - Duration: 202.567 seconds (3:22.567; below both the 3:45 target and 4:00 rule)
  - Video: H.264, 1920×1080
  - Audio: AAC narration generated with Google Cloud Text-to-Speech, mean volume -16.1 dB
  - SHA-256: `86f706cd59295afbd733392834e5c2476716386c98af3bd3b075daebfe16dc8b`
  - Visible proof: live Cloud Run Ready status, latest revision, 100% traffic, and public `.run.app` URL
  - Visible action: scan → 9 findings → approve public-bucket fix → deny IAM fix with reason → 22-event fleet state
  - Visible docs: public GitHub repository, rendered architecture diagram, and quick-start instructions
  - Pipeline: `video/build_demo.sh`, `capture_demo.py`, `render_demo.py`, and timed `NARRATION.txt`
  - **Important:** this recorded video shows the earlier bundled 17-resource mock run. It
    remains valid as a UI walkthrough but is not proof of the new live sample project.
    Re-record the scan segment if the submission will claim live Cloud Asset validation.

The production runtime uses a dedicated service account with only
`roles/cloudasset.viewer`. Cloud Build uses its standard project build identity; the
runtime has no Editor, Storage Admin, or deployment role.

## Outstanding human actions

### 1. Upload the finished video to YouTube (5–10 minutes plus processing)

Upload `video/fleetops-demo.mp4` as **Unlisted** or **Public**. Do not choose Private.

**Suggested title**

```text
FleetOps AI — 3-Agent Google Cloud Compliance Fleet | All Things Agentic
```

**Suggested description**

```text
FleetOps AI is a three-agent Google Cloud fleet for autonomous FinOps, security,
and compliance auditing with human-approved remediation.

Track: The Fortified Enterprise Fleet — All Things Agentic Hackathon
Repository: https://github.com/jeromtom/fleetops-ai
Live app: https://fleetops.rexindynamics.com
Cloud Run origin: https://fleetops-ai-ywb5cstj7a-uc.a.run.app

This continuous demo shows the Google Cloud deployment, the FleetOps workflow,
human-approved dry-run remediation, a denied remediation with an enforced audit reason,
and public architecture documentation. The current public app separately validates a
real four-resource Cloud Asset Inventory sample; re-record before claiming that live
sample in the video.
```

After processing, open the YouTube link in a logged-out/incognito window and confirm it plays. Paste the URL into
`SUBMISSION.md` Step 4 and provide it for the Devpost draft.

### 2. Hand off an authenticated Devpost session (5–10 minutes if registration is incomplete)

Open <https://allthingsagentichackathon.devpost.com/>, register/sign in, and personally complete any captcha, OTP, 2FA,
or consent prompt. Then explicitly confirm that the authenticated browser session is ready. The remaining form values are
already in `SUBMISSION.md` Step 5 and the long description is in `DEMO_SCRIPT.md`.

The draft must use:

- Project: FleetOps AI
- Track: The Fortified Enterprise Fleet
- Repository: <https://github.com/jeromtom/fleetops-ai>
- Video: the new Public/Unlisted YouTube URL
- Country: India
- Team: solo

The agent may populate and **save a draft only** after the authenticated session is explicitly handed off. It must not
accept terms or click the final submission button.

### 3. Review and submit personally (approximately 5 minutes)

Review every saved field, verify the video and repository links, personally accept any required terms, and personally click
**Submit for judging** before the hard deadline. Confirm that Devpost shows the submitted project/confirmation page.

## Final pre-submit checks

- [ ] YouTube video is Public or Unlisted and plays logged out
- [ ] YouTube duration is 3:22.567
- [ ] Devpost draft contains the repository and video URLs
- [ ] Track is The Fortified Enterprise Fleet
- [ ] Long description and built-with tags are populated
- [ ] `fleetops.rexindynamics.com` and the direct Cloud Run origin still respond
- [ ] Human has reviewed the authorship attestation and clicked Submit
- [ ] Devpost confirmation page is visible before 2026-09-01 00:00 UTC
