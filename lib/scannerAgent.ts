// ScannerAgent — Taskmaster track.
// Continuously inventories GCP assets in the background.
// In mock mode, returns the bundled AcmeCorp snapshot.
// In live mode (planned), calls Cloud Asset Inventory API.

import { MOCK_SNAPSHOT } from "./mockSnapshot";
import type { AuditLogEntry, Snapshot } from "./types";

export interface ScanResult {
  snapshot: Snapshot;
  logs: AuditLogEntry[];
}

/** ADK-shaped: the "run" method is the agent's single tool-call surface. */
export const ScannerAgent = {
  name: "ScannerAgent",
  role: "Taskmaster" as const,
  writeScope: false,               // read-only agent

  async run(): Promise<ScanResult> {
    const mock = (process.env.FLEETOPS_MOCK ?? "true") === "true";
    if (!mock) {
      // Live mode would go here — call google.cloud.asset.v1.AssetService.
      // Deferred: see SETUP.md § "Live mode".
      throw new Error(
        "Live Cloud Asset Inventory path not wired in this MVP. Set FLEETOPS_MOCK=true.",
      );
    }

    const snap = MOCK_SNAPSHOT;
    const logs: AuditLogEntry[] = [
      auditLog("ScannerAgent", "info", `Listing projects in ${snap.orgId}`),
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
  },
};

let auditCounter = 0;

/** Deterministic audit-log entry factory (for test reproducibility). */
function auditLog(
  actor: AuditLogEntry["actor"],
  outcome: AuditLogEntry["outcome"],
  action: string,
  target?: string,
): AuditLogEntry {
  auditCounter += 1;
  return {
    id: `audit-${String(auditCounter).padStart(4, "0")}`,
    at: new Date(1_755_513_124_000 + auditCounter * 1000).toISOString(),
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
