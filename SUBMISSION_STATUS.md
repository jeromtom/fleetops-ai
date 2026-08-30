# FleetOps AI — Submission Status

**Last verified:** 2026-08-30 19:57 UTC

**Hard deadline:** 2026-09-01 00:00 UTC (2026-09-01 05:30 IST)

**Time remaining at this checkpoint:** approximately 28 hours 3 minutes

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
- Google Cloud Run origin: <https://fleetops-ai-nbklww7gqa-uc.a.run.app>
  - Project: `saptaveda-agent`
  - Region: `us-central1`
  - Service: `fleetops-ai`
  - Ready revision: `fleetops-ai-00001-7bf`
  - Traffic: 100% to the latest ready revision
  - Safety: `FLEETOPS_MOCK=true`; `FLEETOPS_ALLOW_REAL_REMEDIATION=false`
- Application verification:
  - `npm test`: 30/30 passing across 4 files
  - `npm run build`: clean Next.js production build, 4 routes
  - Public `POST /api/scan`: 17 resources, 9 findings, 9 remediations
  - Severity split: 3 critical, 3 high, 3 medium
  - Project split: acme-prod 8, acme-staging 4, acme-analytics 5
- Demo video: `video/fleetops-demo.mp4`
  - Duration: 202.567 seconds (3:22.567; below both the 3:45 target and 4:00 rule)
  - Video: H.264, 1920×1080
  - Audio: AAC narration generated with Google Cloud Text-to-Speech, mean volume -16.1 dB
  - SHA-256: `86f706cd59295afbd733392834e5c2476716386c98af3bd3b075daebfe16dc8b`
  - Visible proof: live Cloud Run Ready status, latest revision, 100% traffic, and public `.run.app` URL
  - Visible action: scan → 9 findings → approve public-bucket fix → deny IAM fix with reason → 22-event fleet state
  - Visible docs: public GitHub repository, rendered architecture diagram, and quick-start instructions
  - Pipeline: `video/build_demo.sh`, `capture_demo.py`, `render_demo.py`, and timed `NARRATION.txt`

The first Cloud Build attempt exposed missing permissions on the project's build executor. Two narrow grants were added to
`901376110809-compute@developer.gserviceaccount.com`: `roles/storage.objectViewer` on only the Cloud Run source bucket and
`roles/artifactregistry.writer` on only the `cloud-run-source-deploy` repository. No project-wide role was added.

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
Cloud Run origin: https://fleetops-ai-nbklww7gqa-uc.a.run.app

This continuous demo shows live Google Cloud deployment proof, a full 17-resource
scan, nine findings, one approved dry-run remediation, one denied remediation with
an enforced audit reason, and the public architecture documentation.
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
