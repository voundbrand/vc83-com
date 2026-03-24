#!/usr/bin/env npx tsx

import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { config as loadEnv } from "dotenv";
import { buildTestKanzleiFixture } from "../convex/lib/kanzleiOnboardingFixture";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../convex/_generated/api") as { api: any };

type SeedMode = "signup" | "admin";

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function required(value: string | undefined, message: string): string {
  if (!value || !value.trim()) {
    throw new Error(message);
  }
  return value.trim();
}

function normalizeMode(value: string | undefined): SeedMode {
  if (!value || value === "signup") {
    return "signup";
  }
  if (value === "admin") {
    return "admin";
  }
  throw new Error(`Unsupported --mode value: ${value}`);
}

function buildPassword(seed: string): string {
  const compact = seed.replace(/[^a-z0-9]/gi, "").slice(-8) || "kanzlei";
  return `Pw!Kanzlei${compact}`;
}

async function main() {
  const envPath = getArg("--env") || ".env.local";
  loadEnv({ path: path.resolve(process.cwd(), envPath), override: false });

  const convexUrl = required(
    process.env.NEXT_PUBLIC_CONVEX_URL,
    `NEXT_PUBLIC_CONVEX_URL is required. Checked ${envPath}.`,
  );
  const mode = normalizeMode(getArg("--mode"));
  const suffix = getArg("--suffix") || Date.now().toString(36);
  const sessionIdArg = getArg("--session-id");
  const configureBooking = hasFlag("--configure-booking");
  const deployTemplate = hasFlag("--deploy-template");
  const addCreatorAsOwner = hasFlag("--add-creator-as-owner");

  const fixture = buildTestKanzleiFixture({ suffix });
  const ownerEmail =
    getArg("--email") || `lea.falkenberg+${suffix.replace(/[^a-z0-9]/gi, "")}@example.com`;

  const client = new ConvexHttpClient(convexUrl);

  let sessionId: string;
  let organizationId: string;
  let organizationSlug: string | undefined;
  const steps: string[] = [];

  if (mode === "signup") {
    const password = getArg("--password") || buildPassword(suffix);
    const signupResult = await client.action(api.onboarding.signupFreeAccount, {
      email: ownerEmail,
      password,
      firstName: fixture.ownerFirstName,
      lastName: fixture.ownerLastName,
      organizationName: fixture.businessName,
      description: fixture.description,
      industry: fixture.industry,
      contactEmail: fixture.contactEmail,
      contactPhone: fixture.contactPhone,
      timezone: fixture.timezone,
      dateFormat: fixture.dateFormat,
      language: fixture.language,
    });

    sessionId = signupResult.sessionId;
    organizationId = signupResult.organization.id;
    organizationSlug = signupResult.organization.slug;
    steps.push("signupFreeAccount");
  } else {
    sessionId = required(
      sessionIdArg,
      "Admin mode requires --session-id for a super-admin or org-creation-capable session.",
    );
    const createResult = await client.action(api.organizations.createOrganization, {
      sessionId,
      businessName: fixture.businessName,
      description: fixture.description,
      industry: fixture.industry,
      contactEmail: fixture.contactEmail,
      contactPhone: fixture.contactPhone,
      timezone: fixture.timezone,
      dateFormat: fixture.dateFormat,
      language: fixture.language,
      addCreatorAsOwner,
    });

    organizationId = createResult.organizationId;
    organizationSlug = createResult.slug;
    steps.push("createOrganization");

    await client.mutation(api.auth.switchOrganization, {
      sessionId,
      organizationId,
    });
    steps.push("switchOrganization");
  }

  if (configureBooking) {
    await client.mutation(api.organizationOntology.upsertKanzleiBookingConciergeConfig, {
      sessionId,
      organizationId,
      timezone: fixture.timezone,
      primaryResourceLabel: fixture.primaryResourceLabel,
      defaultMeetingTitle: fixture.defaultMeetingTitle,
      intakeLabel: fixture.intakeLabel,
      requireConfiguredResource: false,
    });
    steps.push("upsertKanzleiBookingConciergeConfig");
  }

  let deployResult: unknown = null;
  if (deployTemplate) {
    deployResult = await client.action(
      api.integrations.telephony.deployKanzleiMvpTemplateToOrganization,
      {
        sessionId,
        organizationId,
        preferredCloneName: fixture.preferredCloneName,
      },
    );
    steps.push("deployKanzleiMvpTemplateToOrganization");
  }

  console.log(
    JSON.stringify(
      {
        mode,
        envPath,
        convexUrl,
        organizationId,
        organizationSlug,
        sessionId,
        ownerEmail,
        fixture,
        steps,
        deployResult,
        onboardingObservation:
          deployTemplate
            ? "Org creation now seeds default Kanzlei booking scaffolding when rich metadata is present; customer-facing template deploy is still the remaining explicit step."
            : "Org creation now seeds default Kanzlei booking scaffolding when rich metadata is present; customer-facing template deploy remains the next manual step.",
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
