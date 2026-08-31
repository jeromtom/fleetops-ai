# Real GCP demo fixture

This directory creates the small, intentionally misconfigured Google Cloud fixture
used to validate FleetOps AI's live scanner. It creates no VM, database, load balancer,
service-account key, or private sample data.

Created resources:

- two US Central GCS buckets (one publicly readable harmless text object; one empty
  `medical-records` bucket without CMEK);
- one VPC and one open-SSH firewall rule whose target tag is attached to no VM;
- one keyless `staging-deployer` service account with an intentionally broad Editor
  binding.

Use a disposable or shared sandbox project, never production:

```bash
./demo-project/setup.sh YOUR_PROJECT_ID \
  serviceAccount:CLOUD_RUN_RUNTIME_SA
```

The optional second argument grants that scanner identity `roles/cloudasset.viewer`.
Then run FleetOps in live mode:

```bash
FLEETOPS_MOCK=false \
GCP_PROJECT_IDS=YOUR_PROJECT_ID \
FLEETOPS_RESOURCE_FILTER=fleetops-demo,staging-deployer \
FLEETOPS_ALLOW_REAL_REMEDIATION=false \
npm run dev
```

Cloud Asset IAM changes can take a short time to appear. Remove only these exact
fixtures while the project still has billing enabled (Compute API deletions require it):

```bash
./demo-project/cleanup.sh YOUR_PROJECT_ID
```
