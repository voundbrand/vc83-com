import { describe, expect, it } from "vitest";

import { isUniversalOnboardingAgent } from "../../../convex/onboarding/universalOnboardingRuntime";
import {
  MOTHER_SUPPORT_RUNTIME_SEED,
  MOTHER_GOVERNANCE_RUNTIME_SEED,
  QUINN_CUSTOM_PROPERTIES,
} from "../../../convex/onboarding/seedPlatformAgents";
import {
  PLATFORM_MOTHER_ALIAS_COMPATIBILITY_MODE_QUINN_REQUIRED,
  LEGACY_PLATFORM_SYSTEM_BOT_TEMPLATE_ROLE,
  PLATFORM_MOTHER_AUTHORITY_ROLE,
  PLATFORM_MOTHER_CANONICAL_NAME,
  PLATFORM_MOTHER_SUPPORT_RUNTIME_ROLE,
  PLATFORM_MOTHER_GOVERNANCE_RUNTIME_ROLE,
  PLATFORM_MOTHER_IDENTITY_ROLE,
  PLATFORM_MOTHER_LEGACY_NAME,
  PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
  PLATFORM_MOTHER_RUNTIME_MODE_ONBOARDING,
  PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
  PLATFORM_MOTHER_SUPPORT_RELEASE_CONTRACT_VERSION,
  PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_INTERNAL_ONLY,
  PLATFORM_MOTHER_SUPPORT_ROUTE_FLAGS_CONTRACT_VERSION,
  PLATFORM_MOTHER_TEMPLATE_ROLE,
} from "../../../convex/platformMother";

describe("platform Mother seed metadata", () => {
  it("adds Mother identity metadata to the Quinn compatibility template", () => {
    expect(QUINN_CUSTOM_PROPERTIES.displayName).toBe(PLATFORM_MOTHER_CANONICAL_NAME);
    expect(QUINN_CUSTOM_PROPERTIES.authorityRole).toBe(PLATFORM_MOTHER_AUTHORITY_ROLE);
    expect(QUINN_CUSTOM_PROPERTIES.identityRole).toBe(PLATFORM_MOTHER_IDENTITY_ROLE);
    expect(QUINN_CUSTOM_PROPERTIES.runtimeMode).toBe(PLATFORM_MOTHER_RUNTIME_MODE_ONBOARDING);
    expect(QUINN_CUSTOM_PROPERTIES.canonicalIdentityName).toBe(PLATFORM_MOTHER_CANONICAL_NAME);
    expect(QUINN_CUSTOM_PROPERTIES.legacyIdentityAliases).toContain(PLATFORM_MOTHER_LEGACY_NAME);
    expect(QUINN_CUSTOM_PROPERTIES.canonicalTemplateRole).toBe(PLATFORM_MOTHER_TEMPLATE_ROLE);
    expect(QUINN_CUSTOM_PROPERTIES.templateRole).toBe(LEGACY_PLATFORM_SYSTEM_BOT_TEMPLATE_ROLE);
    expect(QUINN_CUSTOM_PROPERTIES.templateRoleAliases).toEqual(
      expect.arrayContaining([
        PLATFORM_MOTHER_TEMPLATE_ROLE,
        LEGACY_PLATFORM_SYSTEM_BOT_TEMPLATE_ROLE,
      ]),
    );
  });

  it("seeds a protected governance runtime that is not treated as an onboarding agent", () => {
    expect(MOTHER_SUPPORT_RUNTIME_SEED.runtimeRole).toBe(
      PLATFORM_MOTHER_SUPPORT_RUNTIME_ROLE,
    );
    expect(MOTHER_SUPPORT_RUNTIME_SEED.customProperties.protected).toBe(true);
    expect(MOTHER_SUPPORT_RUNTIME_SEED.customProperties.clonePolicy.spawnEnabled).toBe(false);
    expect(MOTHER_SUPPORT_RUNTIME_SEED.customProperties.runtimeMode).toBe(
      PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
    );
    expect(MOTHER_SUPPORT_RUNTIME_SEED.customProperties.canonicalIdentityName).toBe(
      PLATFORM_MOTHER_CANONICAL_NAME,
    );
    expect(MOTHER_SUPPORT_RUNTIME_SEED.customProperties.legacyIdentityAliases).toContain(
      PLATFORM_MOTHER_LEGACY_NAME,
    );
    expect(MOTHER_SUPPORT_RUNTIME_SEED.customProperties.toolProfile).toBe("support");
    expect(MOTHER_SUPPORT_RUNTIME_SEED.customProperties.agentClass).toBe("internal_operator");
    expect(MOTHER_SUPPORT_RUNTIME_SEED.customProperties.sourceTemplateRole).toBe(
      LEGACY_PLATFORM_SYSTEM_BOT_TEMPLATE_ROLE,
    );
    expect(
      MOTHER_SUPPORT_RUNTIME_SEED.customProperties.platformMotherSupportRelease,
    ).toEqual({
      contractVersion: PLATFORM_MOTHER_SUPPORT_RELEASE_CONTRACT_VERSION,
      stage: PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_INTERNAL_ONLY,
      canaryOrganizationIds: [],
      aliasCompatibilityMode: PLATFORM_MOTHER_ALIAS_COMPATIBILITY_MODE_QUINN_REQUIRED,
      renameCleanupReady: false,
    });
    expect(
      MOTHER_SUPPORT_RUNTIME_SEED.customProperties.platformMotherSupportRouteFlags,
    ).toEqual({
      contractVersion: PLATFORM_MOTHER_SUPPORT_ROUTE_FLAGS_CONTRACT_VERSION,
      identityEnabled: false,
      supportRouteEnabled: false,
    });
    expect(
      MOTHER_SUPPORT_RUNTIME_SEED.customProperties.channelBindings.find(
        (binding) => binding.channel === "webchat",
      )?.enabled,
    ).toBe(true);

    expect(MOTHER_GOVERNANCE_RUNTIME_SEED.runtimeRole).toBe(
      PLATFORM_MOTHER_GOVERNANCE_RUNTIME_ROLE,
    );
    expect(MOTHER_GOVERNANCE_RUNTIME_SEED.customProperties.protected).toBe(true);
    expect(MOTHER_GOVERNANCE_RUNTIME_SEED.customProperties.clonePolicy.spawnEnabled).toBe(false);
    expect(MOTHER_GOVERNANCE_RUNTIME_SEED.customProperties.runtimeMode).toBe(
      PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
    );
    expect(MOTHER_GOVERNANCE_RUNTIME_SEED.customProperties.canonicalIdentityName).toBe(
      PLATFORM_MOTHER_CANONICAL_NAME,
    );
    expect(MOTHER_GOVERNANCE_RUNTIME_SEED.customProperties.legacyIdentityAliases).toContain(
      PLATFORM_MOTHER_LEGACY_NAME,
    );
    expect(MOTHER_GOVERNANCE_RUNTIME_SEED.customProperties.toolProfile).toBe("readonly");
    expect(MOTHER_GOVERNANCE_RUNTIME_SEED.customProperties.templateAgentId).toBeUndefined();
    expect(MOTHER_GOVERNANCE_RUNTIME_SEED.customProperties.sourceTemplateRole).toBe(
      LEGACY_PLATFORM_SYSTEM_BOT_TEMPLATE_ROLE,
    );
    expect(
      MOTHER_GOVERNANCE_RUNTIME_SEED.customProperties.channelBindings.every(
        (binding) => binding.enabled === false,
      ),
    ).toBe(true);
    expect(
      isUniversalOnboardingAgent({
        subtype: MOTHER_GOVERNANCE_RUNTIME_SEED.subtype,
        customProperties: MOTHER_GOVERNANCE_RUNTIME_SEED.customProperties,
      }),
    ).toBe(false);
  });
});
