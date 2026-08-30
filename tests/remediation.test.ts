import { describe, it, expect, beforeEach } from "vitest";
import { RemediationAgent } from "../lib/remediationAgent";
import { PolicyAgent } from "../lib/policyAgent";
import { ScannerAgent, _resetAuditCounter } from "../lib/scannerAgent";

describe("RemediationAgent (Collaborative Partner track)", () => {
  beforeEach(() => {
    _resetAuditCounter();
    process.env.FLEETOPS_MOCK = "true";
    process.env.FLEETOPS_ALLOW_REAL_REMEDIATION = "false";
  });

  it("is the only agent with write scope", () => {
    expect(RemediationAgent.writeScope).toBe(true);
    expect(RemediationAgent.role).toBe("Collaborative Partner");
  });

  it("drafts a gcloud command for every finding without executing anything", async () => {
    const { snapshot } = await ScannerAgent.run();
    const { findings } = await PolicyAgent.run(snapshot);
    const resIdx = new Map(snapshot.resources.map((r) => [r.id, r]));
    for (const finding of findings) {
      const { remediation } = await RemediationAgent.draft(finding, resIdx.get(finding.resourceId)!);
      expect(remediation.gcloudCommand).toBeTruthy();
      expect(remediation.status).toBe("pending");
      expect(remediation.findingId).toBe(finding.id);
    }
  });

  it("drafts a bucket lockdown for the public-bucket finding", async () => {
    const { snapshot } = await ScannerAgent.run();
    const { findings } = await PolicyAgent.run(snapshot);
    const pub = findings.find((f) => f.title.includes("acme-user-uploads"))!;
    const resIdx = new Map(snapshot.resources.map((r) => [r.id, r]));
    const { remediation } = await RemediationAgent.draft(pub, resIdx.get(pub.resourceId)!);
    expect(remediation.gcloudCommand).toContain("gcloud storage buckets update gs://acme-user-uploads");
    expect(remediation.gcloudCommand).toContain("--public-access-prevention");
  });

  it("requires humanReason when denying (audit trail)", async () => {
    const { snapshot } = await ScannerAgent.run();
    const { findings } = await PolicyAgent.run(snapshot);
    const resIdx = new Map(snapshot.resources.map((r) => [r.id, r]));
    const { remediation } = await RemediationAgent.draft(findings[0], resIdx.get(findings[0].resourceId)!);
    await expect(RemediationAgent.decide(remediation, "deny")).rejects.toThrow(/humanReason/);
  });

  it("requires humanReason when deferring (audit trail)", async () => {
    const { snapshot } = await ScannerAgent.run();
    const { findings } = await PolicyAgent.run(snapshot);
    const resIdx = new Map(snapshot.resources.map((r) => [r.id, r]));
    const { remediation } = await RemediationAgent.draft(findings[0], resIdx.get(findings[0].resourceId)!);
    await expect(RemediationAgent.decide(remediation, "defer")).rejects.toThrow(/humanReason/);
  });

  it("transitions to 'denied' with the reason recorded", async () => {
    const { snapshot } = await ScannerAgent.run();
    const { findings } = await PolicyAgent.run(snapshot);
    const resIdx = new Map(snapshot.resources.map((r) => [r.id, r]));
    const { remediation } = await RemediationAgent.draft(findings[0], resIdx.get(findings[0].resourceId)!);
    const decided = await RemediationAgent.decide(remediation, "deny", "false positive");
    expect(decided.remediation.status).toBe("denied");
    expect(decided.remediation.humanReason).toBe("false positive");
  });

  it("transitions to 'executed' on approve (dry-run in demo)", async () => {
    const { snapshot } = await ScannerAgent.run();
    const { findings } = await PolicyAgent.run(snapshot);
    const resIdx = new Map(snapshot.resources.map((r) => [r.id, r]));
    const { remediation } = await RemediationAgent.draft(findings[0], resIdx.get(findings[0].resourceId)!);
    const decided = await RemediationAgent.decide(remediation, "approve");
    expect(decided.remediation.status).toBe("executed");
    expect(decided.remediation.auditLogId).toBeTruthy();
    // Should carry a DRY-RUN log line.
    expect(decided.logs.some((l) => l.action.includes("DRY-RUN"))).toBe(true);
  });

  it("does NOT execute real gcloud even when FLEETOPS_ALLOW_REAL_REMEDIATION=true (MVP safety)", async () => {
    process.env.FLEETOPS_ALLOW_REAL_REMEDIATION = "true";
    const { snapshot } = await ScannerAgent.run();
    const { findings } = await PolicyAgent.run(snapshot);
    const resIdx = new Map(snapshot.resources.map((r) => [r.id, r]));
    const { remediation } = await RemediationAgent.draft(findings[0], resIdx.get(findings[0].resourceId)!);
    const decided = await RemediationAgent.decide(remediation, "approve");
    // Even in "live" mode, the MVP refuses to shell out — safety.
    expect(decided.logs.some((l) => l.outcome === "failure" && l.action.includes("intentionally disabled"))).toBe(true);
  });
});
