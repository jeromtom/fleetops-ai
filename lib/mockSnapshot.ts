// Bundled realistic GCP snapshot for AcmeCorp — the fictional demo org.
// 3 projects, 17 resources. Loaded when FLEETOPS_MOCK=true (default).
// Numbers and IDs are deterministic so tests can assert on them.

import type { Snapshot } from "./types";

export const MOCK_SNAPSHOT: Snapshot = {
  id: "snap-2026-08-25T09-12-04Z",
  takenAt: "2026-08-25T09:12:04.000Z",
  orgId: "organizations/123456789012",
  projectIds: ["acme-prod", "acme-staging", "acme-analytics"],
  resources: [
    // ---- acme-prod ----
    {
      id: "//storage.googleapis.com/acme-user-uploads",
      project: "acme-prod",
      kind: "gcs.bucket",
      displayName: "acme-user-uploads",
      region: "us-central1",
      metadata: {
        iamPolicy: {
          bindings: [
            { role: "roles/storage.objectViewer", members: ["allUsers"] },
          ],
        },
        cmek: null,
        publicAccessPrevention: "inherited",
      },
    },
    {
      id: "//storage.googleapis.com/acme-medical-records",
      project: "acme-prod",
      kind: "gcs.bucket",
      displayName: "acme-medical-records",
      region: "us-central1",
      metadata: {
        iamPolicy: { bindings: [] },
        cmek: null,               // ← missing CMEK on PHI bucket
        publicAccessPrevention: "enforced",
      },
    },
    {
      id: "//sqladmin.googleapis.com/projects/acme-prod/instances/acme-prod-db-01",
      project: "acme-prod",
      kind: "sql.instance",
      displayName: "acme-prod-db-01",
      region: "us-central1",
      metadata: {
        tier: "db-n1-highmem-96",
        cpuUtilization30d: 0.04,   // 4% — massively oversized
        backupConfiguration: { enabled: false }, // ← no backups
      },
      monthlyCostUsd: 5100,
    },
    {
      id: "//compute.googleapis.com/projects/acme-prod/zones/us-central1-a/instances/orphan-worker-01",
      project: "acme-prod",
      kind: "compute.instance",
      displayName: "orphan-worker-01",
      region: "us-central1",
      metadata: {
        machineType: "n2-standard-4",
        cpuUtilization30d: 0.005,
        idleDays: 42,
      },
      monthlyCostUsd: 180,
    },
    {
      id: "//compute.googleapis.com/projects/acme-prod/global/forwardingRules/acme-lb-legacy",
      project: "acme-prod",
      kind: "compute.forwardingRule",
      displayName: "acme-lb-legacy",
      region: "global",
      metadata: {
        healthyBackends: 0,
        totalBackends: 3,
        daysWithZeroHealthy: 14,
      },
      monthlyCostUsd: 22,
    },
    {
      id: "//compute.googleapis.com/projects/acme-prod/global/firewalls/default-allow-ssh",
      project: "acme-prod",
      kind: "compute.firewall",
      displayName: "default-allow-ssh",
      metadata: {
        sourceRanges: ["0.0.0.0/0"], // ← open SSH to world
        allowed: [{ IPProtocol: "tcp", ports: ["22"] }],
      },
    },
    {
      id: "//cloudresourcemanager.googleapis.com/projects/acme-prod/iam/staging-deployer@acme.iam.gserviceaccount.com",
      project: "acme-prod",
      kind: "iam.binding",
      displayName: "staging-deployer @ acme-prod",
      metadata: {
        member: "serviceAccount:staging-deployer@acme.iam.gserviceaccount.com",
        role: "roles/owner",  // ← staging SA has Owner on prod
      },
    },
    {
      id: "//run.googleapis.com/projects/acme-prod/locations/us-central1/services/checkout-api",
      project: "acme-prod",
      kind: "run.service",
      displayName: "checkout-api",
      region: "us-central1",
      metadata: { minInstances: 2, cpu: "2", memory: "2Gi" },
      monthlyCostUsd: 240,
    },

    // ---- acme-staging ----
    {
      id: "//storage.googleapis.com/acme-staging-artifacts",
      project: "acme-staging",
      kind: "gcs.bucket",
      displayName: "acme-staging-artifacts",
      region: "us-central1",
      metadata: {
        iamPolicy: { bindings: [] },
        cmek: "projects/acme-prod/locations/us-central1/keyRings/acme/cryptoKeys/artifacts",
        publicAccessPrevention: "enforced",
      },
    },
    {
      id: "//sqladmin.googleapis.com/projects/acme-staging/instances/acme-stg-db",
      project: "acme-staging",
      kind: "sql.instance",
      displayName: "acme-stg-db",
      region: "us-central1",
      metadata: {
        tier: "db-n1-standard-2",
        cpuUtilization30d: 0.28,
        backupConfiguration: { enabled: true },
      },
      monthlyCostUsd: 145,
    },
    {
      id: "//run.googleapis.com/projects/acme-staging/locations/us-central1/services/checkout-api-stg",
      project: "acme-staging",
      kind: "run.service",
      displayName: "checkout-api-stg",
      region: "us-central1",
      metadata: { minInstances: 0, cpu: "1", memory: "512Mi" },
      monthlyCostUsd: 18,
    },
    {
      id: "//compute.googleapis.com/projects/acme-staging/global/firewalls/allow-internal",
      project: "acme-staging",
      kind: "compute.firewall",
      displayName: "allow-internal",
      metadata: {
        sourceRanges: ["10.0.0.0/8"],
        allowed: [{ IPProtocol: "tcp", ports: ["0-65535"] }],
      },
    },

    // ---- acme-analytics ----
    {
      id: "//storage.googleapis.com/acme-events-raw",
      project: "acme-analytics",
      kind: "gcs.bucket",
      displayName: "acme-events-raw",
      region: "us-central1",
      metadata: {
        iamPolicy: { bindings: [] },
        cmek: "projects/acme-prod/locations/us-central1/keyRings/acme/cryptoKeys/analytics",
        publicAccessPrevention: "enforced",
      },
    },
    {
      id: "//compute.googleapis.com/projects/acme-analytics/zones/us-central1-a/instances/spark-worker-3",
      project: "acme-analytics",
      kind: "compute.instance",
      displayName: "spark-worker-3",
      region: "us-central1",
      metadata: {
        machineType: "n2-highmem-16",
        cpuUtilization30d: 0.71,
        idleDays: 0,
      },
      monthlyCostUsd: 420,
    },
    {
      id: "//compute.googleapis.com/projects/acme-analytics/zones/us-central1-a/instances/spark-worker-legacy",
      project: "acme-analytics",
      kind: "compute.instance",
      displayName: "spark-worker-legacy",
      region: "us-central1",
      metadata: {
        machineType: "n1-standard-8",
        cpuUtilization30d: 0.02,
        idleDays: 60,
      },
      monthlyCostUsd: 165,
    },
    {
      id: "//run.googleapis.com/projects/acme-analytics/locations/us-central1/services/report-generator",
      project: "acme-analytics",
      kind: "run.service",
      displayName: "report-generator",
      region: "us-central1",
      metadata: { minInstances: 0, cpu: "2", memory: "4Gi" },
      monthlyCostUsd: 65,
    },
    {
      id: "//cloudresourcemanager.googleapis.com/projects/acme-analytics/iam/analytics-viewer@acme.iam.gserviceaccount.com",
      project: "acme-analytics",
      kind: "iam.binding",
      displayName: "analytics-viewer @ acme-analytics",
      metadata: {
        member: "serviceAccount:analytics-viewer@acme.iam.gserviceaccount.com",
        role: "roles/bigquery.dataViewer",
      },
    },
  ],
};
