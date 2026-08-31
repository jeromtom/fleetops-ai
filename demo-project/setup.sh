#!/usr/bin/env bash

set -euo pipefail

PROJECT_ID="${1:-}"
SCANNER_PRINCIPAL="${2:-}"
REGION="${3:-us-central1}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "usage: ./demo-project/setup.sh PROJECT_ID [SCANNER_PRINCIPAL] [REGION]" >&2
  exit 1
fi

PUBLIC_BUCKET="${PROJECT_ID}-fleetops-demo-public"
MEDICAL_BUCKET="${PROJECT_ID}-fleetops-demo-medical-records"
NETWORK="fleetops-demo-vpc"
FIREWALL="fleetops-demo-open-ssh"
SERVICE_ACCOUNT="staging-deployer"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "WARNING: creating intentionally insecure fixtures in ${PROJECT_ID}."
echo "No VM, database, load balancer, credential key, or private data is created."

gcloud services enable \
  cloudasset.googleapis.com \
  compute.googleapis.com \
  iam.googleapis.com \
  storage.googleapis.com \
  --project="$PROJECT_ID"

if ! gcloud storage buckets describe "gs://${PUBLIC_BUCKET}" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://${PUBLIC_BUCKET}" \
    --project="$PROJECT_ID" \
    --location="$REGION"
fi
gcloud storage cp "demo-project/public-sample.txt" "gs://${PUBLIC_BUCKET}/public-sample.txt"
gcloud storage buckets add-iam-policy-binding "gs://${PUBLIC_BUCKET}" \
  --member=allUsers \
  --role=roles/storage.objectViewer

if ! gcloud storage buckets describe "gs://${MEDICAL_BUCKET}" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://${MEDICAL_BUCKET}" \
    --project="$PROJECT_ID" \
    --location="$REGION"
fi

if ! gcloud compute networks describe "$NETWORK" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud compute networks create "$NETWORK" \
    --project="$PROJECT_ID" \
    --subnet-mode=custom
fi

if ! gcloud compute firewall-rules describe "$FIREWALL" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud compute firewall-rules create "$FIREWALL" \
    --project="$PROJECT_ID" \
    --network="$NETWORK" \
    --direction=INGRESS \
    --action=ALLOW \
    --rules=tcp:22 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=fleetops-demo-no-vms
fi

if ! gcloud iam service-accounts describe "$SERVICE_ACCOUNT_EMAIL" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$SERVICE_ACCOUNT" \
    --project="$PROJECT_ID" \
    --display-name="FleetOps keyless staging demo"
fi
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role=roles/editor \
  --condition=None

if [[ -n "$SCANNER_PRINCIPAL" ]]; then
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="$SCANNER_PRINCIPAL" \
    --role=roles/cloudasset.viewer \
    --condition=None
fi

echo "Fixture ready. Cloud Asset Inventory may need a short indexing delay."
echo "GCP_PROJECT_IDS=${PROJECT_ID}"
echo "FLEETOPS_RESOURCE_FILTER=fleetops-demo,staging-deployer"
echo "FLEETOPS_ALLOW_REAL_REMEDIATION=false"
