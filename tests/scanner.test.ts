import { describe, it, expect, beforeEach } from "vitest";
import { ScannerAgent, _resetAuditCounter } from "../lib/scannerAgent";

describe("ScannerAgent (Taskmaster track)", () => {
  beforeEach(() => {
    _resetAuditCounter();
    process.env.FLEETOPS_MOCK = "true";
  });

  it("returns the bundled snapshot when FLEETOPS_MOCK=true", async () => {
    const result = await ScannerAgent.run();
    expect(result.snapshot.projectIds).toEqual([
      "acme-prod",
      "acme-staging",
      "acme-analytics",
    ]);
    expect(result.snapshot.resources.length).toBe(17);
  });

  it("emits audit-log lines for every scanned project + one final success", async () => {
    const result = await ScannerAgent.run();
    // Expect: 1 (listing) + 1 (found N) + 3 (per project) + 1 (stored) = 6 lines
    expect(result.logs.length).toBe(6);
    expect(result.logs[result.logs.length - 1].outcome).toBe("success");
  });

  it("has read-only scope (writeScope=false)", () => {
    expect(ScannerAgent.writeScope).toBe(false);
  });

  it("advertises the Taskmaster track role", () => {
    expect(ScannerAgent.role).toBe("Taskmaster");
  });

  it("refuses to run in live mode without wiring (FLEETOPS_MOCK=false)", async () => {
    process.env.FLEETOPS_MOCK = "false";
    await expect(ScannerAgent.run()).rejects.toThrow(/Live Cloud Asset Inventory/);
  });
});
