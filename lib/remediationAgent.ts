// RemediationAgent — Collaborative Partner track.
// Drafts a gcloud remediation for each finding, requests human approval,
// executes only after approval (dry-run in demo).
//
// This is the only agent with write scope. Every action goes through the
// human approval gate — the "collaborative partner" pattern.

import { auditLog } from "./scannerAgent";
import type { AuditLogEntry, Finding, Remediation, Resource } from "./types";

export interface RemediationDraft {
  remediation: Remediation;
  logs: AuditLogEntry[];
}

export interface RemediationExecution {
  remediation: Remediation;
  logs: AuditLogEntry[];
}

/** Given a finding + the source resource, produce a drafted gcloud remediation. */
function draftFor(finding: Finding, resource: Resource): { command: string; explanation: string } {
  switch (true) {
    // Public bucket
    case finding.title.includes("publicly readable"): {
      return {
        command:
          `gcloud storage buckets update gs://${resource.displayName} \\\n` +
          `  --uniform-bucket-level-access \\\n` +
          `  --public-access-prevention`,
        explanation:
          `Turns on uniform bucket-level access and enforces publicAccessPrevention, ` +
          `blocking all anonymous GetObject calls. Existing app-level access via IAM continues to work.`,
      };
    }

    // Missing CMEK on sensitive bucket
    case finding.title.includes("missing customer-managed encryption"): {
      return {
        command:
          `# 1) Create a KMS key (once, if you don't have one):\n` +
          `gcloud kms keys create ${resource.displayName}-cmek \\\n` +
          `  --location=us-central1 --keyring=acme --purpose=encryption\n\n` +
          `# 2) Bind the key to the bucket:\n` +
          `gcloud storage buckets update gs://${resource.displayName} \\\n` +
          `  --default-encryption-key=projects/acme-prod/locations/us-central1/keyRings/acme/cryptoKeys/${resource.displayName}-cmek`,
        explanation:
          `New objects will be encrypted with the customer-managed key going forward. ` +
          `Existing objects can be re-encrypted with a one-time \`gcloud storage cp\` cycle.`,
      };
    }

    // Oversized SQL
    case finding.title.includes("oversized"): {
      return {
        command:
          `gcloud sql instances patch ${resource.displayName} \\\n` +
          `  --tier=db-n1-standard-8 \\\n` +
          `  --async`,
        explanation:
          `Drops from db-n1-highmem-96 to db-n1-standard-8. Right-size decision is based on ` +
          `30-day CPU + peak headroom. Requires a brief restart — schedule during maintenance window.`,
      };
    }

    // No backups
    case finding.title.includes("automated backups disabled"): {
      return {
        command:
          `gcloud sql instances patch ${resource.displayName} \\\n` +
          `  --backup-start-time=03:00 \\\n` +
          `  --enable-bin-log \\\n` +
          `  --retained-backups-count=30`,
        explanation:
          `Turns on daily backups at 03:00, enables binary logging for point-in-time recovery, ` +
          `retains 30 backups. Applied online, no downtime.`,
      };
    }

    // Orphaned VM
    case finding.title.includes("idle for"): {
      return {
        command:
          `# Confirm no service depends on this VM, then:\n` +
          `gcloud compute instances stop ${resource.displayName} \\\n` +
          `  --zone=${(resource.metadata.zone as string | undefined) ?? "us-central1-a"}\n\n` +
          `# After 14 days of stopped-with-no-issues, delete:\n` +
          `# gcloud compute instances delete ${resource.displayName} --zone=us-central1-a`,
        explanation:
          `Two-step decommission: stop first (reversible, saves ~$${resource.monthlyCostUsd ?? 0}/mo), ` +
          `delete after a 14-day quiet period. Zero-downtime for the (nonexistent) attached workload.`,
      };
    }

    // Load balancer zero backends
    case finding.title.includes("0 healthy backends"): {
      return {
        command:
          `# Investigate first — 0 healthy backends could mean the backend service was decommissioned\n` +
          `# without cleaning up the frontend, OR a real production incident.\n\n` +
          `gcloud compute forwarding-rules describe ${resource.displayName} --global\n\n` +
          `# If confirmed orphan:\n` +
          `gcloud compute forwarding-rules delete ${resource.displayName} --global`,
        explanation:
          `Human-in-the-loop mandatory here: check the backend-service configuration before deletion. ` +
          `If backends are gone, delete the forwarding rule to stop the $${resource.monthlyCostUsd ?? 0}/mo bleed.`,
      };
    }

    // SSH to world
    case finding.title.includes("SSH (port 22) to 0.0.0.0/0"): {
      return {
        command:
          `# Replace open SSH with IAP-tunneled SSH:\n` +
          `gcloud compute firewall-rules update ${resource.displayName} \\\n` +
          `  --source-ranges=35.235.240.0/20\n\n` +
          `# 35.235.240.0/20 is the IAP TCP forwarding range. Any real user connects via:\n` +
          `#   gcloud compute ssh <INSTANCE> --tunnel-through-iap`,
        explanation:
          `Restricts port-22 access to Google's IAP TCP forwarding range. Legitimate operators still SSH ` +
          `via \`gcloud ssh --tunnel-through-iap\`; the open-to-internet exposure is closed.`,
      };
    }

    // Cross-env owner IAM
    case finding.title.includes("cross-environment"): {
      const member = (resource.metadata.member as string | undefined) ?? "";
      return {
        command:
          `# Remove the over-permissive binding:\n` +
          `gcloud projects remove-iam-policy-binding ${resource.project} \\\n` +
          `  --member=${member} \\\n` +
          `  --role=${resource.metadata.role}\n\n` +
          `# Grant a scoped role instead (adjust to actual need):\n` +
          `gcloud projects add-iam-policy-binding ${resource.project} \\\n` +
          `  --member=${member} \\\n` +
          `  --role=roles/run.developer`,
        explanation:
          `Drops the Owner/Editor binding, then re-grants the minimum role the staging deployer needs ` +
          `to push new Cloud Run revisions. Least-privilege restored.`,
      };
    }

    default:
      return {
        command: `# Manual review required — no auto-draft available for this finding class.`,
        explanation: `Drop-through case. Escalate to a human SRE.`,
      };
  }
}

export const RemediationAgent = {
  name: "RemediationAgent",
  role: "Collaborative Partner" as const,
  writeScope: true,                // only write-scoped agent

  /** Draft a remediation. Never mutates anything. */
  async draft(finding: Finding, resource: Resource): Promise<RemediationDraft> {
    const drafted = draftFor(finding, resource);
    const remediation: Remediation = {
      id: finding.id.replace("finding-", "rem-"),
      findingId: finding.id,
      gcloudCommand: drafted.command,
      explanation: drafted.explanation,
      status: "pending",
      createdAt: new Date(1_755_513_200_000).toISOString(),
    };
    const logs = [
      auditLog(
        "RemediationAgent",
        "info",
        `Drafted remediation for ${finding.id} (${finding.title.substring(0, 60)}…)`,
        finding.resourceId,
      ),
    ];
    return { remediation, logs };
  },

  /** Human decision arrives. Only "approved" transitions the remediation into execution. */
  async decide(
    remediation: Remediation,
    decision: "approve" | "deny" | "defer",
    humanReason?: string,
  ): Promise<RemediationExecution> {
    const logs: AuditLogEntry[] = [];

    if (decision === "deny") {
      if (!humanReason) throw new Error("Deny requires a humanReason (audit trail).");
      const updated: Remediation = {
        ...remediation,
        status: "denied",
        humanReason,
        resolvedAt: new Date(1_755_513_260_000).toISOString(),
      };
      logs.push(
        auditLog(
          "RemediationAgent",
          "info",
          `Human denied ${remediation.id}: ${humanReason}`,
          remediation.findingId,
        ),
      );
      return { remediation: updated, logs };
    }

    if (decision === "defer") {
      if (!humanReason) throw new Error("Defer requires a humanReason (audit trail).");
      const updated: Remediation = {
        ...remediation,
        status: "deferred",
        humanReason,
        resolvedAt: new Date(1_755_513_260_000).toISOString(),
      };
      logs.push(
        auditLog(
          "RemediationAgent",
          "info",
          `Human deferred ${remediation.id}: ${humanReason}`,
          remediation.findingId,
        ),
      );
      return { remediation: updated, logs };
    }

    // Approve → execute.
    const allowReal =
      (process.env.FLEETOPS_ALLOW_REAL_REMEDIATION ?? "false") === "true";
    logs.push(
      auditLog(
        "RemediationAgent",
        "info",
        `Human approved ${remediation.id} → executing (${allowReal ? "LIVE" : "DRY-RUN"})`,
        remediation.findingId,
      ),
    );

    if (allowReal) {
      // Real path would call child_process.exec here.
      // Intentionally not wired in this MVP — see SETUP.md safety note.
      logs.push(
        auditLog(
          "RemediationAgent",
          "failure",
          `Real gcloud execution intentionally disabled in MVP (safety). Set FLEETOPS_ALLOW_REAL_REMEDIATION=false and demo dry-run.`,
          remediation.findingId,
        ),
      );
    } else {
      logs.push(
        auditLog(
          "RemediationAgent",
          "success",
          `[DRY-RUN] Executed: ${remediation.gcloudCommand.split("\n")[0]}…`,
          remediation.findingId,
        ),
      );
    }

    const auditId = `audit-exec-${remediation.id}`;
    logs.push(
      auditLog(
        "RemediationAgent",
        "success",
        `Audit log entry written: ${auditId}`,
        remediation.findingId,
      ),
    );

    const updated: Remediation = {
      ...remediation,
      status: "executed",
      auditLogId: auditId,
      resolvedAt: new Date(1_755_513_262_000).toISOString(),
    };
    return { remediation: updated, logs };
  },
};

export { draftFor as _draftForInternal };
