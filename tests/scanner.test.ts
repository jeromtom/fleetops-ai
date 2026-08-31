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

  it("requires an explicit project allowlist in live mode", async () => {
    process.env.FLEETOPS_MOCK = "false";
    delete process.env.GCP_PROJECT_IDS;
    delete process.env.GOOGLE_CLOUD_PROJECT;
    await expect(ScannerAgent.run()).rejects.toThrow(/GCP_PROJECT_IDS/);
  });

  it("builds a live snapshot from the injected Cloud Asset reader", async () => {
    process.env.FLEETOPS_MOCK = "false";
    process.env.GCP_PROJECT_IDS = "fleetops-demo-one";
    process.env.FLEETOPS_RESOURCE_FILTER = "fleetops-demo";

    const result = await ScannerAgent.run({
      readLiveResources: async (projectIds, filters) => {
        expect(projectIds).toEqual(["fleetops-demo-one"]);
        expect(filters).toEqual(["fleetops-demo"]);
        return [
          {
            id: "//storage.googleapis.com/fleetops-demo-public",
            project: "fleetops-demo-one",
            kind: "gcs.bucket",
            displayName: "fleetops-demo-public",
            metadata: { iamPolicy: { bindings: [] }, cmek: null },
          },
        ];
      },
    });

    expect(result.snapshot.source).toBe("cloud-asset");
    expect(result.snapshot.projectIds).toEqual(["fleetops-demo-one"]);
    expect(result.snapshot.resources).toHaveLength(1);
    expect(result.logs[0].action).toContain("live Cloud Asset Inventory");
  });
});
