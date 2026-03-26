import {
  type ParsedArgs,
  getOptionBoolean,
  getOptionString
} from "../../core/args";
import {
  type GetApplicationResponse,
  type PageObjectBinding
} from "../../api/platform";
import { resolveRemoteCommand } from "../app/remote";

export const CMS_REGISTRY_FEATURE_PREFIX = "cms_registry:";

export interface CmsCommandContext {
  profile: string;
  organizationId: string;
  applicationId: string;
  json: boolean;
  api: Awaited<ReturnType<typeof resolveRemoteCommand>>["api"];
}

export interface CmsRegistrySelection {
  registryId: string;
  source: "override" | "feature" | "inferred";
}

const SEGELSCHULE_CMS_COPY_REGISTRY_ID = "segelschule.home.v1";
const DEFAULT_CMS_COPY_REGISTRY_ID = "default.web.v1";

export async function resolveCmsCommandContext(
  parsed: ParsedArgs,
  options: { mutating: boolean }
): Promise<CmsCommandContext> {
  const command = await resolveRemoteCommand(parsed, {
    requireOrgApp: true,
    mutatingCommand: options.mutating
  });

  return {
    profile: command.target.profileName,
    organizationId: command.target.orgId ?? "",
    applicationId: command.target.appId ?? "",
    json: command.json,
    api: command.api
  };
}

function normalizeRegistryValue(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function inferRegistryFromApplication(application: GetApplicationResponse["application"]): string {
  const searchable = `${application.name || ""} ${application.description || ""}`.toLowerCase();
  if (searchable.includes("segelschule") || searchable.includes("altwarp")) {
    return SEGELSCHULE_CMS_COPY_REGISTRY_ID;
  }
  return DEFAULT_CMS_COPY_REGISTRY_ID;
}

export function resolveCmsRegistrySelection(
  parsed: ParsedArgs,
  application: GetApplicationResponse["application"]
): CmsRegistrySelection {
  const override = getOptionString(parsed, "registry-id");
  if (override) {
    return { registryId: override, source: "override" };
  }

  const connection = (application.connection || {}) as Record<string, unknown>;
  const features = Array.isArray(connection.features) ? connection.features : [];
  for (const feature of features) {
    if (typeof feature !== "string") {
      continue;
    }
    if (feature.startsWith(CMS_REGISTRY_FEATURE_PREFIX)) {
      const registryId = normalizeRegistryValue(feature.slice(CMS_REGISTRY_FEATURE_PREFIX.length));
      if (registryId) {
        return { registryId, source: "feature" };
      }
    }
  }

  return {
    registryId: inferRegistryFromApplication(application),
    source: "inferred"
  };
}

export function mergeCmsRegistryFeature(
  existingFeatures: unknown,
  registryId: string
): string[] {
  const next = Array.isArray(existingFeatures)
    ? existingFeatures.filter((value): value is string => typeof value === "string")
    : [];

  const cleaned = next.filter((feature) => !feature.startsWith(CMS_REGISTRY_FEATURE_PREFIX));
  cleaned.push(`${CMS_REGISTRY_FEATURE_PREFIX}${registryId}`);
  return Array.from(new Set(cleaned));
}

export function toComparableBindings(bindings: PageObjectBinding[]): string {
  const normalized = bindings.map((binding) => ({
    objectType: binding.objectType,
    accessMode: binding.accessMode,
    syncEnabled: binding.syncEnabled,
    syncDirection: binding.syncDirection ?? null,
    boundObjectIds: binding.boundObjectIds ? [...binding.boundObjectIds].sort() : []
  }));
  normalized.sort((left, right) => left.objectType.localeCompare(right.objectType));
  return JSON.stringify(normalized);
}
