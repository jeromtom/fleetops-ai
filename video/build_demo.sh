#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"
python3 video/capture_demo.py
python3 video/render_demo.py

ffprobe -v error \
  -show_entries format=duration:stream=codec_type,codec_name,width,height \
  -of json video/fleetops-demo.mp4
