#!/usr/bin/env bash

set -euo pipefail

PROJECT_ID="${1:-}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "usage: ./demo-project/cleanup.sh PROJECT_ID" >&2
  exit 1
fi

BILLING_ENABLED="$(
  gcloud billing projects describe "$PROJECT_ID" \
    --format='value(billingEnabled)'
)"
if [[ "$BILLING_ENABLED" != "True" ]]; then
  echo "cleanup requires billing to remain enabled until Compute resources are deleted" >&2
  exit 1
fi

PUBLIC_BUCKET="${PROJECT_ID}-fleetops-demo-public"
MEDICAL_BUCKET="${PROJECT_ID}-fleetops-demo-medical-records"
SERVICE_ACCOUNT_EMAIL="staging-deployer@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Deleting only FleetOps demo fixtures from ${PROJECT_ID}."

gcloud projects remove-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role=roles/editor \
  --condition=None || true
gcloud iam service-accounts delete "$SERVICE_ACCOUNT_EMAIL" \
  --project="$PROJECT_ID" \
  --quiet || true
gcloud compute firewall-rules delete fleetops-demo-open-ssh \
  --project="$PROJECT_ID" \
  --quiet || true
gcloud compute networks delete fleetops-demo-vpc \
  --project="$PROJECT_ID" \
  --quiet || true
gcloud storage rm --recursive "gs://${PUBLIC_BUCKET}" || true
gcloud storage rm --recursive "gs://${MEDICAL_BUCKET}" || true

echo "FleetOps demo fixture cleanup complete."
