// ScannerAgent — Taskmaster track.
// Continuously inventories GCP assets in the background.
// In mock mode, returns the bundled AcmeCorp snapshot.
// In live mode, calls Cloud Asset Inventory with Application Default Credentials.

import { MOCK_SNAPSHOT } from "./mockSnapshot";
import { listLiveResources } from "./liveAssetInventory";
import type { AuditLogEntry, Snapshot } from "./types";

export interface ScanResult {
  snapshot: Snapshot;
  logs: AuditLogEntry[];
}

interface ScannerRunOptions {
  readLiveResources?: typeof listLiveResources;
}

/** ADK-shaped: the "run" method is the agent's single tool-call surface. */
export const ScannerAgent = {
  name: "ScannerAgent",
  role: "Taskmaster" as const,
  writeScope: false,               // read-only agent

  async run(options: ScannerRunOptions = {}): Promise<ScanResult> {
    const mock = (process.env.FLEETOPS_MOCK ?? "true") === "true";
    if (mock) {
      return buildResult(MOCK_SNAPSHOT);
    }

    const projectIds = splitCsv(
      process.env.GCP_PROJECT_IDS ?? process.env.GOOGLE_CLOUD_PROJECT ?? "",
    );
    if (projectIds.length === 0) {
      throw new Error(
        "Live Cloud Asset Inventory requires GCP_PROJECT_IDS (comma-separated project IDs).",
      );
    }

    const nameFilters = splitCsv(process.env.FLEETOPS_RESOURCE_FILTER ?? "");
    const readLiveResources = options.readLiveResources ?? listLiveResources;
    const resources = await readLiveResources(projectIds, nameFilters);
    const takenAt = new Date().toISOString();
    const snapshot: Snapshot = {
      id: `snap-${takenAt.replace(/[:.]/g, "-")}`,
      takenAt,
      orgId: process.env.GCP_ORG_ID ?? `projects/${projectIds.join(",")}`,
      projectIds,
      resources,
      source: "cloud-asset",
    };

    return buildResult(snapshot);
  },
};

function buildResult(snap: Snapshot): ScanResult {
    const logs: AuditLogEntry[] = [
      auditLog(
        "ScannerAgent",
        "info",
        snap.source === "cloud-asset"
          ? `Reading live Cloud Asset Inventory for ${snap.projectIds.join(", ")}`
          : `Listing projects in ${snap.orgId}`,
      ),
      auditLog(
        "ScannerAgent",
        "info",
        `Found ${snap.projectIds.length} projects: ${snap.projectIds.join(", ")}`,
      ),
      ...snap.projectIds.map((p) =>
        auditLog(
          "ScannerAgent",
          "info",
          `Snapshotting assets for ${p} (${snap.resources.filter((r) => r.project === p).length} resources)`,
        ),
      ),
      auditLog("ScannerAgent", "success", `Snapshot stored: ${snap.id}`),
    ];

    return { snapshot: snap, logs };
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

let auditCounter = 0;

/** Deterministic audit-log entry factory (for test reproducibility). */
function auditLog(
  actor: AuditLogEntry["actor"],
  outcome: AuditLogEntry["outcome"],
  action: string,
  target?: string,
): AuditLogEntry {
  auditCounter += 1;
  const mock = (process.env.FLEETOPS_MOCK ?? "true") === "true";
  return {
    id: `audit-${String(auditCounter).padStart(4, "0")}`,
    at: new Date(
      mock ? 1_755_513_124_000 + auditCounter * 1000 : Date.now() + auditCounter,
    ).toISOString(),
    actor,
    action,
    target,
    outcome,
  };
}

/** Exported so tests + other agents can share the counter's shape without importing internals. */
export function _resetAuditCounter(): void {
  auditCounter = 0;
}

export { auditLog };
