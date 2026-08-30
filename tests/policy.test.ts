import { describe, it, expect, beforeEach } from "vitest";
import { PolicyAgent } from "../lib/policyAgent";
import { ScannerAgent, _resetAuditCounter } from "../lib/scannerAgent";

describe("PolicyAgent (Fortified Enterprise Fleet track)", () => {
  beforeEach(() => {
    _resetAuditCounter();
    process.env.FLEETOPS_MOCK = "true";
  });

  it("produces exactly 9 findings against the bundled snapshot", async () => {
    // 9 = R1(public bucket) + R2(missing CMEK) + R3(oversized SQL) + R4(no backup)
    //   + R5×2 (orphan-worker-01 + spark-worker-legacy) + R6(LB zero backends)
    //   + R7(SSH-world) + R8(cross-env Owner IAM)
    const { snapshot } = await ScannerAgent.run();
    const { findings } = await PolicyAgent.run(snapshot);
    expect(findings.length).toBe(9);
  });

  it("flags the public bucket as CRITICAL with HIPAA + GDPR citations", async () => {
    const { snapshot } = await ScannerAgent.run();
    const { findings } = await PolicyAgent.run(snapshot);
    const pub = findings.find((f) => f.title.includes("acme-user-uploads"));
    expect(pub).toBeDefined();
    expect(pub!.severity).toBe("critical");
    const domains = pub!.citations.map((c) => c.domain);
    expect(domains).toContain("HIPAA");
    expect(domains).toContain("GDPR");
  });

  it("flags the oversized SQL and estimates savings ~$4335/mo", async () => {
    const { snapshot } = await ScannerAgent.run();
    const { findings } = await PolicyAgent.run(snapshot);
    const sql = findings.find((f) => f.title.includes("oversized"));
    expect(sql).toBeDefined();
    // 5100 * 0.85 = 4335
    expect(sql!.monthlyImpactUsd).toBe(4335);
  });

  it("flags the missing SQL backup as HIGH with SOC2 A1.2", async () => {
    const { snapshot } = await ScannerAgent.run();
    const { findings } = await PolicyAgent.run(snapshot);
    const backup = findings.find((f) => f.title.includes("backups disabled"));
    expect(backup).toBeDefined();
    expect(backup!.severity).toBe("high");
    expect(backup!.citations[0].clause).toBe("A1.2");
  });

  it("flags the orphan VM and the load balancer with zero backends", async () => {
    const { snapshot } = await ScannerAgent.run();
    const { findings } = await PolicyAgent.run(snapshot);
    const orphans = findings.filter((f) => f.title.includes("idle for"));
    expect(orphans.length).toBeGreaterThanOrEqual(2); // orphan-worker-01 + spark-worker-legacy
    const lb = findings.find((f) => f.title.includes("0 healthy backends"));
    expect(lb).toBeDefined();
  });

  it("flags the open-SSH firewall as CRITICAL with CIS 3.6", async () => {
    const { snapshot } = await ScannerAgent.run();
    const { findings } = await PolicyAgent.run(snapshot);
    const fw = findings.find((f) => f.title.includes("SSH (port 22) to 0.0.0.0/0"));
    expect(fw).toBeDefined();
    expect(fw!.severity).toBe("critical");
    expect(fw!.citations.some((c) => c.clause === "3.6")).toBe(true);
  });

  it("flags cross-env Owner IAM as CRITICAL with SOC2 CC6.1", async () => {
    const { snapshot } = await ScannerAgent.run();
    const { findings } = await PolicyAgent.run(snapshot);
    const iam = findings.find((f) => f.title.includes("cross-environment"));
    expect(iam).toBeDefined();
    expect(iam!.severity).toBe("critical");
    expect(iam!.citations[0].clause).toBe("CC6.1");
  });

  it("sorts findings by riskScore desc so triage opens on the biggest first", async () => {
    const { snapshot } = await ScannerAgent.run();
    const { findings } = await PolicyAgent.run(snapshot);
    for (let i = 1; i < findings.length; i++) {
      expect(findings[i - 1].riskScore).toBeGreaterThanOrEqual(findings[i].riskScore);
    }
  });

  it("has read-only scope (writeScope=false) — enterprise separation of concerns", () => {
    expect(PolicyAgent.writeScope).toBe(false);
    expect(PolicyAgent.role).toBe("Fortified Enterprise Fleet");
  });

  it("emits at least one info + one success audit log entry", async () => {
    const { snapshot } = await ScannerAgent.run();
    const { logs } = await PolicyAgent.run(snapshot);
    expect(logs.some((l) => l.outcome === "info")).toBe(true);
    expect(logs.some((l) => l.outcome === "success")).toBe(true);
  });
});
