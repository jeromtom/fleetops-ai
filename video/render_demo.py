#!/usr/bin/env python3
"""Synthesize timed narration, mux it with the one-take capture, and verify the MP4."""

from __future__ import annotations

import base64
import json
import math
import os
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
VIDEO_DIR = ROOT / "video"
ARTIFACTS = VIDEO_DIR / "artifacts"
SEGMENTS_DIR = ARTIFACTS / "narration"
RAW_VIDEO = ARTIFACTS / "raw-capture.webm"
TIMELINE = ARTIFACTS / "timeline.json"
NARRATION = VIDEO_DIR / "NARRATION.txt"
FINAL_VIDEO = VIDEO_DIR / "fleetops-demo.mp4"
PROJECT = os.environ.get("FLEETOPS_GCP_PROJECT", "saptaveda-agent")
VOICE = os.environ.get("FLEETOPS_TTS_VOICE", "en-US-Studio-Q")


def run(command: list[str], *, capture: bool = False) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, check=True, text=True, capture_output=capture)


def ffprobe_duration(path: Path) -> float:
    result = run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        capture=True,
    )
    return float(result.stdout.strip())


def parse_narration(path: Path) -> dict[str, str]:
    sections: dict[str, list[str]] = {}
    current: str | None = None
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        match = re.fullmatch(r"\[([a-z]+)\]", line)
        if match:
            current = match.group(1)
            sections[current] = []
        elif current and line and not line.startswith("#"):
            sections[current].append(line)
    return {name: " ".join(lines) for name, lines in sections.items()}


def google_token() -> str:
    return run(["gcloud", "auth", "print-access-token"], capture=True).stdout.strip()


def synthesize_google(text: str, destination: Path, token: str) -> None:
    payload = {
        "input": {"text": text},
        "voice": {"languageCode": "en-US", "name": VOICE},
        "audioConfig": {
            "audioEncoding": "LINEAR16",
            "speakingRate": 1.08,
            "pitch": -1.0,
            "volumeGainDb": 0.0,
        },
    }
    request = urllib.request.Request(
        "https://texttospeech.googleapis.com/v1/text:synthesize",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=utf-8",
            "x-goog-user-project": PROJECT,
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=90) as response:
        body = json.loads(response.read().decode("utf-8"))
    destination.write_bytes(base64.b64decode(body["audioContent"]))


def synthesize_say(text: str, destination: Path) -> None:
    voice = os.environ.get("FLEETOPS_SAY_VOICE", "Rishi")
    run(["say", "-v", voice, "-r", "188", "-o", str(destination), text])


def fit_to_window(source: Path, available: float, destination: Path) -> Path:
    duration = ffprobe_duration(source)
    if duration <= available:
        shutil.copy2(source, destination)
        return destination
    factor = min(2.0, max(1.01, duration / max(1.0, available) * 1.02))
    run(
        [
            "ffmpeg",
            "-y",
            "-v",
            "error",
            "-i",
            str(source),
            "-filter:a",
            f"atempo={factor:.5f}",
            str(destination),
        ]
    )
    return destination


def synthesize_segments(timeline: dict[str, float], narration: dict[str, str]) -> list[tuple[str, float, Path]]:
    names = [name for name in narration if name in timeline]
    token: str | None = None
    use_google = os.environ.get("FLEETOPS_TTS", "auto") != "say"
    if use_google:
        try:
            token = google_token()
        except Exception as error:  # pragma: no cover - environment fallback
            print(f"Google token unavailable; using macOS say: {error}", file=sys.stderr)
            use_google = False

    SEGMENTS_DIR.mkdir(parents=True, exist_ok=True)
    rendered: list[tuple[str, float, Path]] = []
    for index, name in enumerate(names):
        text = narration[name]
        source = SEGMENTS_DIR / f"{index:02d}-{name}.{'wav' if use_google else 'aiff'}"
        try:
            if use_google and token:
                synthesize_google(text, source, token)
            else:
                synthesize_say(text, source)
        except (urllib.error.HTTPError, urllib.error.URLError, subprocess.CalledProcessError) as error:
            if not use_google:
                raise
            detail = error.read().decode("utf-8", errors="replace") if isinstance(error, urllib.error.HTTPError) else str(error)
            print(f"Google TTS failed for {name}; using macOS say: {detail}", file=sys.stderr)
            use_google = False
            source = SEGMENTS_DIR / f"{index:02d}-{name}.aiff"
            synthesize_say(text, source)

        next_start = timeline[names[index + 1]] if index + 1 < len(names) else timeline["end"] - 2.0
        available = max(3.0, next_start - timeline[name] - 0.7)
        fitted = SEGMENTS_DIR / f"{index:02d}-{name}-fitted.wav"
        fit_to_window(source, available, fitted)
        rendered.append((name, timeline[name], fitted))
        print(f"Narration {name}: start={timeline[name]:.2f}s duration={ffprobe_duration(fitted):.2f}s")
    return rendered


def mux(raw_duration: float, segments: list[tuple[str, float, Path]]) -> None:
    target_duration = min(raw_duration, 225.0)
    command = ["ffmpeg", "-y", "-v", "warning", "-i", str(RAW_VIDEO)]
    for _, _, path in segments:
        command.extend(["-i", str(path)])

    filters: list[str] = []
    labels: list[str] = []
    for index, (_, start, _) in enumerate(segments, start=1):
        label = f"n{index}"
        delay = max(0, int(round(start * 1000)))
        filters.append(f"[{index}:a]adelay={delay}:all=1[{label}]")
        labels.append(f"[{label}]")
    filters.append(
        f"{''.join(labels)}amix=inputs={len(labels)}:duration=longest:dropout_transition=0,"
        "apad=pad_dur=240,loudnorm=I=-16:TP=-1.5:LRA=11[aout]"
    )
    command.extend(
        [
            "-filter_complex",
            ";".join(filters),
            "-map",
            "0:v:0",
            "-map",
            "[aout]",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "23",
            "-pix_fmt",
            "yuv420p",
            "-r",
            "30",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            "-movflags",
            "+faststart",
            "-t",
            f"{target_duration:.3f}",
            str(FINAL_VIDEO),
        ]
    )
    run(command)


def verify() -> None:
    duration = ffprobe_duration(FINAL_VIDEO)
    if not 60.0 < duration <= 225.1:
        raise RuntimeError(f"Final duration {duration:.3f}s is outside the required 60–225s range")
    probe = run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "stream=codec_type,codec_name,width,height",
            "-of",
            "json",
            str(FINAL_VIDEO),
        ],
        capture=True,
    )
    streams = json.loads(probe.stdout)["streams"]
    video = next((stream for stream in streams if stream["codec_type"] == "video"), None)
    audio = next((stream for stream in streams if stream["codec_type"] == "audio"), None)
    if not video or video.get("width") != 1920 or video.get("height") != 1080:
        raise RuntimeError(f"Expected 1920x1080 video stream, got {video}")
    if not audio:
        raise RuntimeError("Final video has no audio stream")
    volume = subprocess.run(
        ["ffmpeg", "-v", "info", "-i", str(FINAL_VIDEO), "-vn", "-af", "volumedetect", "-f", "null", "-"],
        text=True,
        capture_output=True,
        check=True,
    )
    match = re.search(r"mean_volume:\s*(-?[0-9.]+) dB", volume.stderr)
    if not match or not math.isfinite(float(match.group(1))):
        raise RuntimeError("Final audio is silent or could not be measured")
    print(f"Verified: {FINAL_VIDEO}")
    print(f"Duration: {duration:.3f}s")
    print(f"Streams: {json.dumps(streams)}")
    print(f"Mean audio volume: {match.group(1)} dB")


def main() -> None:
    if not RAW_VIDEO.exists() or not TIMELINE.exists():
        raise SystemExit("Run video/capture_demo.py first")
    timeline = json.loads(TIMELINE.read_text(encoding="utf-8"))
    narration = parse_narration(NARRATION)
    missing = sorted(set(narration) - set(timeline))
    if missing:
        raise RuntimeError(f"Narration sections missing from timeline: {missing}")
    raw_duration = ffprobe_duration(RAW_VIDEO)
    if raw_duration > 225.0:
        raise RuntimeError(f"Raw continuous take is {raw_duration:.3f}s; shorten capture pauses before muxing")
    segments = synthesize_segments(timeline, narration)
    mux(raw_duration, segments)
    verify()


if __name__ == "__main__":
    main()
