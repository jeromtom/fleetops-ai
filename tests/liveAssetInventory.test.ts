import { describe, expect, it } from "vitest";
import { _liveInventoryInternal } from "../lib/liveAssetInventory";

describe("live Cloud Asset Inventory normalization", () => {
  it("decodes protobuf Struct values and emits real bucket/firewall/IAM resources", () => {
    const resourceAssets = [
      {
        name: "//storage.googleapis.com/fleetops-demo-medical-records",
        assetType: "storage.googleapis.com/Bucket",
        resource: {
          data: {
            fields: {
              name: { stringValue: "fleetops-demo-medical-records" },
              location: { stringValue: "US-CENTRAL1" },
              encryption: { structValue: { fields: {} } },
              iamConfiguration: {
                structValue: {
                  fields: {
                    publicAccessPrevention: { stringValue: "inherited" },
                  },
                },
              },
            },
          },
        },
      },
      {
        name: "//compute.googleapis.com/projects/fleetops-demo/global/firewalls/fleetops-demo-open-ssh",
        assetType: "compute.googleapis.com/Firewall",
        resource: {
          data: {
            fields: {
              name: { stringValue: "fleetops-demo-open-ssh" },
              sourceRanges: {
                listValue: { values: [{ stringValue: "0.0.0.0/0" }] },
              },
              allowed: {
                listValue: {
                  values: [
                    {
                      structValue: {
                        fields: {
                          IPProtocol: { stringValue: "tcp" },
                          ports: {
                            listValue: { values: [{ stringValue: "22" }] },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    ];
    const iamAssets = [
      {
        name: "//storage.googleapis.com/fleetops-demo-medical-records",
        assetType: "storage.googleapis.com/Bucket",
        iamPolicy: { bindings: [] },
      },
      {
        name: "//cloudresourcemanager.googleapis.com/projects/123",
        assetType: "cloudresourcemanager.googleapis.com/Project",
        iamPolicy: {
          bindings: [
            {
              role: "roles/editor",
              members: [
                "serviceAccount:fleetops-demo-staging-deployer@example.iam.gserviceaccount.com",
              ],
            },
          ],
        },
      },
    ];

    const resources = _liveInventoryInternal.normalizeCloudAssets(
      "fleetops-demo",
      resourceAssets,
      iamAssets,
      ["fleetops-demo"],
    );

    expect(resources.map((resource) => resource.kind)).toEqual([
      "gcs.bucket",
      "compute.firewall",
      "iam.binding",
    ]);
    expect(resources[0].metadata.cmek).toBeNull();
    expect(resources[1].metadata.sourceRanges).toEqual(["0.0.0.0/0"]);
    expect(resources[2].metadata.role).toBe("roles/editor");
  });
});
