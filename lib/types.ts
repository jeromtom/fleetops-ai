// Shared type definitions for FleetOps AI.
// Kept in a single file so tests + UI + agents share one contract.

export type Severity = "critical" | "high" | "medium" | "low";

export type ResourceKind =
  | "gcs.bucket"
  | "sql.instance"
  | "compute.instance"
  | "run.service"
  | "iam.binding"
  | "compute.firewall"
  | "compute.forwardingRule";

export interface Resource {
  id: string;                    // Fully-qualified GCP asset name
  project: string;               // e.g. "acme-prod"
  kind: ResourceKind;
  displayName: string;
  region?: string;
  metadata: Record<string, unknown>;
  monthlyCostUsd?: number;
}

export interface Snapshot {
  id: string;                    // e.g. "snap-2026-08-25T09:12:04Z"
  takenAt: string;               // ISO timestamp
  orgId: string;
  projectIds: string[];
  resources: Resource[];
}

export type PolicyDomain = "SOC2" | "HIPAA" | "GDPR" | "CIS" | "COST";

export interface PolicyCitation {
  domain: PolicyDomain;
  clause: string;                // e.g. "CC6.1", "§164.312(a)(1)"
  summary: string;
}

export interface Finding {
  id: string;                    // e.g. "finding-01"
  resourceId: string;
  severity: Severity;
  title: string;
  explanation: string;
  citations: PolicyCitation[];
  monthlyImpactUsd?: number;     // Cost waste, only for COST findings
  riskScore: number;             // 0–100
}

export type RemediationStatus =
  | "pending"                    // waiting for human triage
  | "approved"                   // human said go
  | "executing"                  // in-flight
  | "executed"                   // done
  | "denied"                     // human said no
  | "deferred";                  // human said "not now"

export interface Remediation {
  id: string;                    // "rem-01"
  findingId: string;
  gcloudCommand: string;
  explanation: string;
  status: RemediationStatus;
  humanReason?: string;          // required for denied/deferred
  auditLogId?: string;           // populated when executed
  createdAt: string;
  resolvedAt?: string;
}

export interface AuditLogEntry {
  id: string;                    // "audit-2026-08-25T09:14:22Z"
  at: string;
  actor: "ScannerAgent" | "PolicyAgent" | "RemediationAgent" | "human";
  action: string;
  target?: string;
  outcome: "success" | "failure" | "info";
  details?: string;
}

export interface FleetState {
  snapshot: Snapshot | null;
  findings: Finding[];
  remediations: Remediation[];
  auditLog: AuditLogEntry[];
  agentStatus: {
    scanner: string;
    policy: string;
    remediation: string;
  };
}
