# Demo video pipeline

This directory produces the FleetOps AI submission video as one continuous
1920×1080 take. It captures real `gcloud` service output, drives the live Cloud
Run URL, performs the approve and deny-with-reason flow, and ends on the public
GitHub architecture diagram. FFmpeg only adds timed narration and converts the
continuous WebM capture to H.264; it does not cut the agent execution.

## Prerequisites

- Python 3 with Playwright (`python3 -m pip install playwright` if absent)
- A preinstalled Chrome/Chromium executable — do **not** run `playwright install`
- `gcloud` authenticated to the deployment project
- `ffmpeg` and `ffprobe`
- Google Cloud Text-to-Speech access, or macOS `say` as the automatic fallback

## Render

```bash
./video/build_demo.sh
```

Defaults are pinned to the verified deployment. Override them when redeploying:

```bash
FLEETOPS_URL=https://your-service.run.app \
FLEETOPS_GCP_PROJECT=your-project \
FLEETOPS_GCP_REGION=us-central1 \
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chrome \
./video/build_demo.sh
```

Use `python3 video/capture_demo.py --smoke` to verify selectors in a short test
recording. The final renderer fails if the continuous take exceeds 3:45, lacks
audio, or is not 1920×1080. The expected output is `video/fleetops-demo.mp4`.
