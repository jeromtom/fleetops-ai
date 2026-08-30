// Fleet orchestrator — wires ScannerAgent → PolicyAgent → RemediationAgent
// and maintains the shared FleetState (snapshot, findings, remediations, audit log).
//
// Kept in-memory for the MVP; Firestore migration deferred (see PLAN.md).

import { ScannerAgent, _resetAuditCounter } from "./scannerAgent";
import { PolicyAgent } from "./policyAgent";
import { RemediationAgent } from "./remediationAgent";
import type { FleetState, Remediation, Resource } from "./types";

export async function runFullScan(): Promise<FleetState> {
  _resetAuditCounter();

  const state: FleetState = {
    snapshot: null,
    findings: [],
    remediations: [],
    auditLog: [],
    agentStatus: {
      scanner: "starting",
      policy: "waiting",
      remediation: "waiting",
    },
  };

  // ── Phase 1: ScannerAgent
  state.agentStatus.scanner = "running";
  const scan = await ScannerAgent.run();
  state.snapshot = scan.snapshot;
  state.auditLog.push(...scan.logs);
  state.agentStatus.scanner = `idle (${scan.snapshot.resources.length} assets snapshotted)`;

  // ── Phase 2: PolicyAgent
  state.agentStatus.policy = "running";
  const policy = await PolicyAgent.run(scan.snapshot);
  state.findings = policy.findings;
  state.auditLog.push(...policy.logs);
  state.agentStatus.policy = `evaluated ${scan.snapshot.resources.length} assets → ${policy.findings.length} findings`;

  // ── Phase 3: RemediationAgent drafts (does NOT execute anything yet)
  state.agentStatus.remediation = "drafting";
  const resourceIndex = new Map<string, Resource>(
    scan.snapshot.resources.map((r) => [r.id, r]),
  );
  for (const finding of policy.findings) {
    const resource = resourceIndex.get(finding.resourceId);
    if (!resource) continue;
    const drafted = await RemediationAgent.draft(finding, resource);
    state.remediations.push(drafted.remediation);
    state.auditLog.push(...drafted.logs);
  }
  state.agentStatus.remediation = `${state.remediations.length} drafts pending human review`;

  return state;
}

export async function applyDecision(
  state: FleetState,
  remediationId: string,
  decision: "approve" | "deny" | "defer",
  humanReason?: string,
): Promise<FleetState> {
  const idx = state.remediations.findIndex((r) => r.id === remediationId);
  if (idx < 0) throw new Error(`Unknown remediationId: ${remediationId}`);
  const before = state.remediations[idx];
  if (before.status !== "pending") {
    throw new Error(`Remediation ${remediationId} already ${before.status}; cannot re-decide.`);
  }

  const result = await RemediationAgent.decide(before, decision, humanReason);

  const remediations: Remediation[] = [...state.remediations];
  remediations[idx] = result.remediation;

  const summary = summarizeRemediations(remediations);
  return {
    ...state,
    remediations,
    auditLog: [...state.auditLog, ...result.logs],
    agentStatus: {
      ...state.agentStatus,
      remediation: `${summary.executed} executed, ${summary.deferred} deferred, ${summary.denied} denied, ${summary.pending} pending`,
    },
  };
}

export function summarizeRemediations(rems: Remediation[]): {
  pending: number;
  approved: number;
  executed: number;
  denied: number;
  deferred: number;
} {
  return {
    pending: rems.filter((r) => r.status === "pending").length,
    approved: rems.filter((r) => r.status === "approved").length,
    executed: rems.filter((r) => r.status === "executed").length,
    denied: rems.filter((r) => r.status === "denied").length,
    deferred: rems.filter((r) => r.status === "deferred").length,
  };
}

export function totalMonthlySavingsUsd(state: FleetState): number {
  return state.findings.reduce((sum, f) => sum + (f.monthlyImpactUsd ?? 0), 0);
}
