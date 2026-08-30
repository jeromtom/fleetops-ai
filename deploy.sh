#!/usr/bin/env bash
# FleetOps AI — one-command Cloud Run deploy.
#
#   ./deploy.sh YOUR_GCP_PROJECT_ID [REGION]
#
# Prints the https://fleetops-ai-*.a.run.app URL you need on screen in the
# demo video (All Things Agentic judges on visible Google Cloud deployment proof).

set -euo pipefail

PROJECT_ID="${1:-}"
REGION="${2:-us-central1}"
SERVICE="fleetops-ai"

if [[ -z "$PROJECT_ID" ]]; then
  echo "usage: ./deploy.sh YOUR_GCP_PROJECT_ID [REGION]" >&2
  exit 1
fi

echo "==> Project: $PROJECT_ID   Region: $REGION   Service: $SERVICE"
gcloud config set project "$PROJECT_ID"

echo "==> Enabling required APIs (idempotent)"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

# Mock mode keeps the demo deterministic and key-free. To demo live Gemini
# policy reasoning instead, set FLEETOPS_MOCK=false and append GOOGLE_AI_API_KEY=your_key
ENV_VARS="FLEETOPS_MOCK=true,FLEETOPS_ALLOW_REAL_REMEDIATION=false"

echo "==> Building from Dockerfile and deploying to Cloud Run"
gcloud run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --set-env-vars "$ENV_VARS"

URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"
echo
echo "======================================================================"
echo " Deployed: $URL"
echo " Screen-capture the Cloud Run dashboard AND this URL in the demo video."
echo "======================================================================"
