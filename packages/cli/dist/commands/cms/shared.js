"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CMS_REGISTRY_FEATURE_PREFIX = void 0;
exports.resolveCmsCommandContext = resolveCmsCommandContext;
exports.resolveCmsRegistrySelection = resolveCmsRegistrySelection;
exports.mergeCmsRegistryFeature = mergeCmsRegistryFeature;
exports.toComparableBindings = toComparableBindings;
const args_1 = require("../../core/args");
const remote_1 = require("../app/remote");
exports.CMS_REGISTRY_FEATURE_PREFIX = "cms_registry:";
const SEGELSCHULE_CMS_COPY_REGISTRY_ID = "segelschule.home.v1";
const DEFAULT_CMS_COPY_REGISTRY_ID = "default.web.v1";
async function resolveCmsCommandContext(parsed, options) {
    const command = await (0, remote_1.resolveRemoteCommand)(parsed, {
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
function normalizeRegistryValue(value) {
    if (typeof value !== "string") {
        return undefined;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
}
function inferRegistryFromApplication(application) {
    const searchable = `${application.name || ""} ${application.description || ""}`.toLowerCase();
    if (searchable.includes("segelschule") || searchable.includes("altwarp")) {
        return SEGELSCHULE_CMS_COPY_REGISTRY_ID;
    }
    return DEFAULT_CMS_COPY_REGISTRY_ID;
}
function resolveCmsRegistrySelection(parsed, application) {
    const override = (0, args_1.getOptionString)(parsed, "registry-id");
    if (override) {
        return { registryId: override, source: "override" };
    }
    const connection = (application.connection || {});
    const features = Array.isArray(connection.features) ? connection.features : [];
    for (const feature of features) {
        if (typeof feature !== "string") {
            continue;
        }
        if (feature.startsWith(exports.CMS_REGISTRY_FEATURE_PREFIX)) {
            const registryId = normalizeRegistryValue(feature.slice(exports.CMS_REGISTRY_FEATURE_PREFIX.length));
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
function mergeCmsRegistryFeature(existingFeatures, registryId) {
    const next = Array.isArray(existingFeatures)
        ? existingFeatures.filter((value) => typeof value === "string")
        : [];
    const cleaned = next.filter((feature) => !feature.startsWith(exports.CMS_REGISTRY_FEATURE_PREFIX));
    cleaned.push(`${exports.CMS_REGISTRY_FEATURE_PREFIX}${registryId}`);
    return Array.from(new Set(cleaned));
}
function toComparableBindings(bindings) {
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
//# sourceMappingURL=shared.js.map