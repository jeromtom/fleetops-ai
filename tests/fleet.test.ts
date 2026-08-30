import { describe, it, expect, beforeEach } from "vitest";
import {
  runFullScan,
  applyDecision,
  summarizeRemediations,
  totalMonthlySavingsUsd,
} from "../lib/fleet";

describe("Fleet orchestrator (Scanner → Policy → Remediation)", () => {
  beforeEach(() => {
    process.env.FLEETOPS_MOCK = "true";
    process.env.FLEETOPS_ALLOW_REAL_REMEDIATION = "false";
  });

  it("runs a full scan and produces findings + drafted remediations", async () => {
    const state = await runFullScan();
    expect(state.snapshot).not.toBeNull();
    expect(state.findings.length).toBe(9);
    expect(state.remediations.length).toBe(9);
    // All start pending.
    expect(state.remediations.every((r) => r.status === "pending")).toBe(true);
  });

  it("populates agentStatus for all three agents", async () => {
    const state = await runFullScan();
    expect(state.agentStatus.scanner).toContain("17 assets");
    expect(state.agentStatus.policy).toContain("9 findings");
    expect(state.agentStatus.remediation).toContain("9 drafts");
  });

  it("appends an ordered audit log covering all 3 agents", async () => {
    const state = await runFullScan();
    const actors = new Set(state.auditLog.map((l) => l.actor));
    expect(actors.has("ScannerAgent")).toBe(true);
    expect(actors.has("PolicyAgent")).toBe(true);
    expect(actors.has("RemediationAgent")).toBe(true);
  });

  it("computes total monthly savings across cost findings", async () => {
    const state = await runFullScan();
    const total = totalMonthlySavingsUsd(state);
    // 4335 (sql right-size) + 180 (orphan-worker-01) + 22 (LB) + 165 (spark-worker-legacy)
    expect(total).toBe(4335 + 180 + 22 + 165);
  });

  it("applies human decisions and updates the summary", async () => {
    let state = await runFullScan();
    const first = state.remediations[0];
    state = await applyDecision(state, first.id, "approve");
    const second = state.remediations[1];
    state = await applyDecision(state, second.id, "deny", "known accepted risk, exception #EX-0042");

    const s = summarizeRemediations(state.remediations);
    expect(s.executed).toBe(1);
    expect(s.denied).toBe(1);
    expect(s.pending).toBe(7);
  });

  it("refuses to re-decide an already-decided remediation", async () => {
    let state = await runFullScan();
    const first = state.remediations[0];
    state = await applyDecision(state, first.id, "approve");
    await expect(applyDecision(state, first.id, "deny", "changed mind")).rejects.toThrow(/already/);
  });

  it("refuses an unknown remediation id", async () => {
    const state = await runFullScan();
    await expect(applyDecision(state, "rem-nonexistent", "approve")).rejects.toThrow(/Unknown/);
  });
});
