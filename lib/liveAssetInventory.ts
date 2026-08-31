import { AssetServiceClient, protos } from "@google-cloud/asset";
import type { Resource } from "./types";

const RESOURCE_ASSET_TYPES = [
  "storage.googleapis.com/Bucket",
  "compute.googleapis.com/Firewall",
  "compute.googleapis.com/Instance",
  "compute.googleapis.com/ForwardingRule",
  "sqladmin.googleapis.com/Instance",
  "run.googleapis.com/Service",
];

const IAM_ASSET_TYPES = [
  "storage.googleapis.com/Bucket",
  "cloudresourcemanager.googleapis.com/Project",
];

interface CloudAssetRecord {
  name?: string | null;
  assetType?: string | null;
  resource?: {
    data?: unknown;
    location?: string | null;
  } | null;
  iamPolicy?: {
    bindings?: Array<{
      role?: string | null;
      members?: string[] | null;
    }> | null;
  } | null;
}

export async function listLiveResources(
  projectIds: string[],
  nameFilters: string[],
): Promise<Resource[]> {
  const client = new AssetServiceClient();

  try {
    const resources: Resource[] = [];

    for (const projectId of projectIds) {
      const parent = `projects/${projectId}`;
      const [[resourceAssets], [iamAssets]] = await Promise.all([
        client.listAssets({
          parent,
          assetTypes: RESOURCE_ASSET_TYPES,
          contentType: "RESOURCE",
          pageSize: 1000,
        }),
        client.listAssets({
          parent,
          assetTypes: IAM_ASSET_TYPES,
          contentType: "IAM_POLICY",
          pageSize: 1000,
        }),
      ]);

      resources.push(
        ...normalizeCloudAssets(
          projectId,
          resourceAssets.map(toCloudAssetRecord),
          iamAssets.map(toCloudAssetRecord),
          nameFilters,
        ),
      );
    }

    return resources.sort((a, b) =>
      `${a.project}:${a.kind}:${a.displayName}`.localeCompare(
        `${b.project}:${b.kind}:${b.displayName}`,
      ),
    );
  } finally {
    await client.close();
  }
}

function toCloudAssetRecord(
  asset: protos.google.cloud.asset.v1.IAsset,
): CloudAssetRecord {
  return {
    name: asset.name,
    assetType: asset.assetType,
    resource: asset.resource
      ? {
          data: asset.resource.data,
          location: asset.resource.location,
        }
      : null,
    iamPolicy: asset.iamPolicy
      ? {
          bindings: (asset.iamPolicy.bindings ?? []).map((binding) => ({
            role: binding.role,
            members: binding.members,
          })),
        }
      : null,
  };
}

function normalizeCloudAssets(
  projectId: string,
  resourceAssets: CloudAssetRecord[],
  iamAssets: CloudAssetRecord[],
  nameFilters: string[],
): Resource[] {
  const iamByAssetName = new Map(
    iamAssets.map((asset) => [asset.name ?? "", normalizeIamPolicy(asset)]),
  );
  const resources: Resource[] = [];

  for (const asset of resourceAssets) {
    const normalized = normalizeResourceAsset(
      projectId,
      asset,
      iamByAssetName.get(asset.name ?? ""),
    );
    if (normalized && matchesNameFilter(normalized, nameFilters)) {
      resources.push(normalized);
    }
  }

  for (const asset of iamAssets) {
    if (asset.assetType !== "cloudresourcemanager.googleapis.com/Project") {
      continue;
    }

    for (const binding of normalizeIamPolicy(asset).bindings) {
      if (binding.role !== "roles/owner" && binding.role !== "roles/editor") {
        continue;
      }
      for (const member of binding.members) {
        const resource: Resource = {
          id: `${asset.name}/iam/${encodeURIComponent(binding.role)}/${encodeURIComponent(member)}`,
          project: projectId,
          kind: "iam.binding",
          displayName: `${member.replace("serviceAccount:", "")} @ ${projectId}`,
          metadata: { member, role: binding.role },
        };
        if (matchesNameFilter(resource, nameFilters)) {
          resources.push(resource);
        }
      }
    }
  }

  return resources;
}

function normalizeResourceAsset(
  projectId: string,
  asset: CloudAssetRecord,
  iamPolicy?: { bindings: Array<{ role: string; members: string[] }> },
): Resource | null {
  const data = decodeProtoStruct(asset.resource?.data);
  const displayName = stringValue(data.name) ?? lastPathSegment(asset.name);
  const id = asset.name ?? `${asset.assetType ?? "unknown"}/${displayName}`;

  switch (asset.assetType) {
    case "storage.googleapis.com/Bucket":
      return {
        id,
        project: projectId,
        kind: "gcs.bucket",
        displayName,
        region: stringValue(data.location)?.toLowerCase(),
        metadata: {
          iamPolicy: iamPolicy ?? { bindings: [] },
          cmek: nestedString(data, ["encryption", "defaultKmsKeyName"]),
          publicAccessPrevention: nestedString(data, [
            "iamConfiguration",
            "publicAccessPrevention",
          ]),
        },
      };

    case "compute.googleapis.com/Firewall":
      return {
        id,
        project: projectId,
        kind: "compute.firewall",
        displayName,
        metadata: {
          sourceRanges: stringArray(data.sourceRanges),
          allowed: objectArray(data.allowed),
          disabled: data.disabled === true,
          network: stringValue(data.network),
          targetTags: stringArray(data.targetTags),
        },
      };

    case "compute.googleapis.com/Instance":
      return {
        id,
        project: projectId,
        kind: "compute.instance",
        displayName,
        region: locationFromZone(stringValue(data.zone)),
        metadata: {
          machineType: lastPathSegment(stringValue(data.machineType)),
          status: stringValue(data.status),
          zone: lastPathSegment(stringValue(data.zone)),
        },
      };

    case "compute.googleapis.com/ForwardingRule":
      return {
        id,
        project: projectId,
        kind: "compute.forwardingRule",
        displayName,
        region: asset.resource?.location ?? undefined,
        metadata: {
          ipAddress: stringValue(data.IPAddress),
          target: stringValue(data.target),
        },
      };

    case "sqladmin.googleapis.com/Instance": {
      const settings = objectValue(data.settings);
      return {
        id,
        project: projectId,
        kind: "sql.instance",
        displayName,
        region: stringValue(data.region) ?? undefined,
        metadata: {
          tier: stringValue(settings.tier),
          backupConfiguration: objectValue(settings.backupConfiguration),
        },
      };
    }

    case "run.googleapis.com/Service": {
      const metadata = objectValue(data.metadata);
      return {
        id,
        project: projectId,
        kind: "run.service",
        displayName: stringValue(metadata.name) ?? displayName,
        region: asset.resource?.location ?? undefined,
        metadata: {
          labels: objectValue(metadata.labels),
        },
      };
    }

    default:
      return null;
  }
}

function normalizeIamPolicy(asset: CloudAssetRecord): {
  bindings: Array<{ role: string; members: string[] }>;
} {
  return {
    bindings: (asset.iamPolicy?.bindings ?? [])
      .filter((binding) => typeof binding.role === "string")
      .map((binding) => ({
        role: binding.role ?? "",
        members: (binding.members ?? []).filter(
          (member): member is string => typeof member === "string",
        ),
      })),
  };
}

function matchesNameFilter(resource: Resource, filters: string[]): boolean {
  if (filters.length === 0) return true;
  const searchable = [
    resource.id,
    resource.displayName,
    stringValue(resource.metadata.member),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return filters.some((filter) => searchable.includes(filter.toLowerCase()));
}

function decodeProtoStruct(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {};
  const fields = isRecord(value.fields) ? value.fields : value;
  return Object.fromEntries(
    Object.entries(fields).map(([key, field]) => [key, decodeProtoValue(field)]),
  );
}

function decodeProtoValue(value: unknown): unknown {
  if (!isRecord(value)) return value;
  if (typeof value.stringValue === "string") return value.stringValue;
  if (typeof value.numberValue === "number") return value.numberValue;
  if (typeof value.boolValue === "boolean") return value.boolValue;
  if ("nullValue" in value) return null;
  if (value.structValue !== undefined) return decodeProtoStruct(value.structValue);
  if (isRecord(value.listValue)) {
    const values = Array.isArray(value.listValue.values)
      ? value.listValue.values
      : [];
    return values.map(decodeProtoValue);
  }
  if (isRecord(value.fields)) return decodeProtoStruct(value);
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, decodeProtoValue(nested)]),
  );
}

function nestedString(
  value: Record<string, unknown>,
  path: string[],
): string | null {
  let current: unknown = value;
  for (const segment of path) {
    if (!isRecord(current)) return null;
    current = current[segment];
  }
  return stringValue(current);
}

function objectValue(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function objectArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function lastPathSegment(value: string | null | undefined): string {
  if (!value) return "unknown";
  return value.split("/").filter(Boolean).at(-1) ?? value;
}

function locationFromZone(zone: string | null): string | undefined {
  const normalized = lastPathSegment(zone);
  const match = normalized.match(/^(.+)-[a-z]$/);
  return match?.[1];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const _liveInventoryInternal = {
  decodeProtoStruct,
  normalizeCloudAssets,
};
