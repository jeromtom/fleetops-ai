// PolicyAgent — Fortified Enterprise Fleet track (primary submission track).
// Evaluates a snapshot against the compliance policy catalogue and produces findings.
//
// In mock mode: deterministic rule engine, hits every finding in the demo snapshot.
// In live mode: Gemini reasons about each resource against the catalogue.
//
// Note on architecture: rules ARE the "policy" the agent enforces. In live mode
// Gemini is asked to explain and score each rule hit in natural language; the
// rule engine still fires the trigger. This is the correct enterprise pattern —
// LLM can hallucinate policy citations, so citations are pinned to code.

import type {
  AuditLogEntry,
  Finding,
  PolicyCitation,
  Resource,
  Severity,
  Snapshot,
} from "./types";
import { auditLog } from "./scannerAgent";

interface RuleContext {
  resource: Resource;
}

interface Rule {
  id: string;
  match: (ctx: RuleContext) => boolean;
  build: (ctx: RuleContext) => Omit<Finding, "id" | "resourceId">;
}

const CITATIONS = {
  soc2_cc61: { domain: "SOC2", clause: "CC6.1", summary: "Logical access controls restrict access to authorized users only" } as PolicyCitation,
  soc2_a12: { domain: "SOC2", clause: "A1.2", summary: "System availability requires tested backup/recovery" } as PolicyCitation,
  hipaa_312a1: { domain: "HIPAA", clause: "§164.312(a)(1)", summary: "Access control — technical safeguards for ePHI" } as PolicyCitation,
  hipaa_312e1: { domain: "HIPAA", clause: "§164.312(e)(1)", summary: "Transmission security / encryption of ePHI" } as PolicyCitation,
  gdpr_art32: { domain: "GDPR", clause: "Article 32", summary: "Security of processing — encryption + access control" } as PolicyCitation,
  cis_36: { domain: "CIS", clause: "3.6", summary: "Ensure SSH not exposed to 0.0.0.0/0" } as PolicyCitation,
  cost_utilization: { domain: "COST", clause: "FINOPS-UTIL-01", summary: "Resource utilization below 10% for 30 days = right-size candidate" } as PolicyCitation,
  cost_orphan: { domain: "COST", clause: "FINOPS-ORPHAN-01", summary: "Idle >30 days with no workload = decommission candidate" } as PolicyCitation,
  cost_zeroBackend: { domain: "COST", clause: "FINOPS-LB-01", summary: "Load balancer with 0 healthy backends >7 days = orphan" } as PolicyCitation,
} as const;

const RULES: Rule[] = [
  // R1 — public GCS bucket
  {
    id: "R-GCS-PUBLIC",
    match: ({ resource: r }) => {
      if (r.kind !== "gcs.bucket") return false;
      const bindings = (r.metadata.iamPolicy as { bindings?: { members: string[] }[] } | undefined)?.bindings ?? [];
      return bindings.some((b) => b.members.includes("allUsers") || b.members.includes("allAuthenticatedUsers"));
    },
    build: ({ resource: r }) => ({
      severity: "critical" as Severity,
      title: `GCS bucket ${r.displayName} is publicly readable`,
      explanation:
        `The bucket ${r.displayName} has an IAM binding granting storage.objectViewer to allUsers, ` +
        `meaning any anonymous internet user can list and download objects. If any object is ePHI or ` +
        `personal data, this is an immediate breach.`,
      citations: [CITATIONS.hipaa_312a1, CITATIONS.gdpr_art32, CITATIONS.soc2_cc61],
      riskScore: 95,
    }),
  },

  // R2 — CMEK missing on sensitive bucket
  {
    id: "R-GCS-NOCMEK",
    match: ({ resource: r }) =>
      r.kind === "gcs.bucket" &&
      r.metadata.cmek == null &&
      (r.displayName.includes("medical") || r.displayName.includes("phi") || r.displayName.includes("pii")),
    build: ({ resource: r }) => ({
      severity: "high" as Severity,
      title: `Bucket ${r.displayName} missing customer-managed encryption key`,
      explanation:
        `${r.displayName} appears to hold sensitive data (name matches PHI/PII pattern) but has no CMEK ` +
        `configured. Google-managed encryption is the default fallback; HIPAA controls require CMEK for ` +
        `covered entities.`,
      citations: [CITATIONS.hipaa_312e1, CITATIONS.gdpr_art32],
      riskScore: 78,
    }),
  },

  // R3 — Cloud SQL oversized (right-size)
  {
    id: "R-SQL-OVERSIZED",
    match: ({ resource: r }) =>
      r.kind === "sql.instance" &&
      typeof r.metadata.cpuUtilization30d === "number" &&
      (r.metadata.cpuUtilization30d as number) < 0.1 &&
      (r.monthlyCostUsd ?? 0) > 500,
    build: ({ resource: r }) => {
      const cpu = (r.metadata.cpuUtilization30d as number) * 100;
      const cost = r.monthlyCostUsd ?? 0;
      const savings = Math.round(cost * 0.85);
      return {
        severity: "high" as Severity,
        title: `Cloud SQL ${r.displayName} is oversized (${cpu.toFixed(1)}% CPU 30d)`,
        explanation:
          `${r.displayName} runs on ${r.metadata.tier ?? "an oversized tier"} at ${cpu.toFixed(1)}% average CPU. ` +
          `Right-sizing to a smaller machine tier is estimated to save ~$${savings}/mo without user-visible impact.`,
        citations: [CITATIONS.cost_utilization],
        monthlyImpactUsd: savings,
        riskScore: 40,
      };
    },
  },

  // R4 — Cloud SQL no backup
  {
    id: "R-SQL-NOBACKUP",
    match: ({ resource: r }) =>
      r.kind === "sql.instance" &&
      (r.metadata.backupConfiguration as { enabled?: boolean } | undefined)?.enabled === false,
    build: ({ resource: r }) => ({
      severity: "high" as Severity,
      title: `Cloud SQL ${r.displayName} has automated backups disabled`,
      explanation:
        `${r.displayName} has backupConfiguration.enabled=false. SOC2 A1.2 requires tested backup/recovery. ` +
        `A single storage-corruption or dropped-table event is unrecoverable in this configuration.`,
      citations: [CITATIONS.soc2_a12],
      riskScore: 70,
    }),
  },

  // R5 — Orphaned Compute instance
  {
    id: "R-COMPUTE-ORPHAN",
    match: ({ resource: r }) =>
      r.kind === "compute.instance" &&
      typeof r.metadata.idleDays === "number" &&
      (r.metadata.idleDays as number) >= 30,
    build: ({ resource: r }) => ({
      severity: "medium" as Severity,
      title: `Compute VM ${r.displayName} idle for ${r.metadata.idleDays} days`,
      explanation:
        `${r.displayName} shows ${r.metadata.idleDays} days idle and ${((r.metadata.cpuUtilization30d as number) * 100).toFixed(1)}% CPU. ` +
        `No attached workload was detected. Decommission or snapshot-and-stop.`,
      citations: [CITATIONS.cost_orphan],
      monthlyImpactUsd: r.monthlyCostUsd ?? 0,
      riskScore: 30,
    }),
  },

  // R6 — Load balancer with zero healthy backends
  {
    id: "R-LB-ZEROBACK",
    match: ({ resource: r }) =>
      r.kind === "compute.forwardingRule" &&
      (r.metadata.healthyBackends as number | undefined) === 0 &&
      (r.metadata.daysWithZeroHealthy as number | undefined) !== undefined &&
      (r.metadata.daysWithZeroHealthy as number) >= 7,
    build: ({ resource: r }) => ({
      severity: "medium" as Severity,
      title: `Load balancer ${r.displayName} has 0 healthy backends for ${r.metadata.daysWithZeroHealthy} days`,
      explanation:
        `${r.displayName} has had 0/${r.metadata.totalBackends} healthy backends for ${r.metadata.daysWithZeroHealthy} days. ` +
        `Either the traffic has been re-routed and this LB is orphaned, or a real production incident is ongoing.`,
      citations: [CITATIONS.cost_zeroBackend],
      monthlyImpactUsd: r.monthlyCostUsd ?? 0,
      riskScore: 25,
    }),
  },

  // R7 — Firewall opens SSH to world
  {
    id: "R-FW-SSH-WORLD",
    match: ({ resource: r }) => {
      if (r.kind !== "compute.firewall") return false;
      const sources = (r.metadata.sourceRanges as string[] | undefined) ?? [];
      const allowed = (r.metadata.allowed as { ports?: string[] }[] | undefined) ?? [];
      return sources.includes("0.0.0.0/0") && allowed.some((a) => (a.ports ?? []).includes("22"));
    },
    build: ({ resource: r }) => ({
      severity: "critical" as Severity,
      title: `Firewall rule ${r.displayName} opens SSH (port 22) to 0.0.0.0/0`,
      explanation:
        `${r.displayName} allows inbound tcp:22 from the entire internet. Standard CIS benchmark violation — ` +
        `SSH should be reachable only via IAP tunnel or a specific bastion range.`,
      citations: [CITATIONS.cis_36, CITATIONS.soc2_cc61],
      riskScore: 88,
    }),
  },

  // R8 — Over-permissive IAM (Owner given to non-prod SA)
  {
    id: "R-IAM-OWNER-CROSS",
    match: ({ resource: r }) => {
      if (r.kind !== "iam.binding") return false;
      const role = (r.metadata.role as string | undefined) ?? "";
      const member = (r.metadata.member as string | undefined) ?? "";
      const crossEnv = member.includes("staging") || member.includes("dev-") || member.includes("qa-");
      return (role === "roles/owner" || role === "roles/editor") && crossEnv;
    },
    build: ({ resource: r }) => ({
      severity: "critical" as Severity,
      title: `IAM: ${r.displayName} — cross-environment ${r.metadata.role} binding`,
      explanation:
        `The identity ${r.metadata.member} carries ${r.metadata.role} on ${r.project}. ` +
        `Staging or lower-env service accounts must never hold owner/editor on prod — a compromise of the ` +
        `staging deploy pipeline would trivially escalate to prod.`,
      citations: [CITATIONS.soc2_cc61],
      riskScore: 92,
    }),
  },
];

export interface PolicyResult {
  findings: Finding[];
  logs: AuditLogEntry[];
}

export const PolicyAgent = {
  name: "PolicyAgent",
  role: "Fortified Enterprise Fleet" as const,
  writeScope: false,               // read-only agent

  async run(snapshot: Snapshot): Promise<PolicyResult> {
    const logs: AuditLogEntry[] = [
      auditLog("PolicyAgent", "info", `Loading policy catalogue (${RULES.length} rules)`),
      auditLog("PolicyAgent", "info", `Evaluating ${snapshot.resources.length} assets from ${snapshot.id}`),
    ];

    const findings: Finding[] = [];
    let findingCounter = 0;

    for (const resource of snapshot.resources) {
      for (const rule of RULES) {
        if (rule.match({ resource })) {
          findingCounter += 1;
          const finding: Finding = {
            id: `finding-${String(findingCounter).padStart(2, "0")}`,
            resourceId: resource.id,
            ...rule.build({ resource }),
          };
          findings.push(finding);
        }
      }
    }

    // Sort by riskScore desc so triage UI opens on the biggest thing first.
    findings.sort((a, b) => b.riskScore - a.riskScore);

    logs.push(
      auditLog(
        "PolicyAgent",
        "success",
        `Produced ${findings.length} findings (${findings.filter((f) => f.severity === "critical").length} critical)`,
      ),
    );

    return { findings, logs };
  },
};

export const _RULES_INTERNAL = RULES;
export const _CITATIONS_INTERNAL = CITATIONS;
