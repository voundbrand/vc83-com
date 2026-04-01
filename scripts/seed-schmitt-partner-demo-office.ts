#!/usr/bin/env npx tsx

import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { config as loadEnv } from "dotenv";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../convex/_generated/api") as { api: any };

type SeedMode = "signup" | "admin" | "existing";
type TelephonyProviderKey = "elevenlabs" | "twilio_voice" | "custom_sip";

interface DemoOfficeFixture {
  businessName: string;
  description: string;
  industry: string;
  contactEmail: string;
  contactPhone: string;
  timezone: string;
  language: string;
  dateFormat: string;
  ownerFirstName: string;
  ownerLastName: string;
  defaultMeetingTitle: string;
  intakeLabel: string;
  primaryResourceLabel: string;
  preferredKanzleiMvpCloneName: string;
}

interface SyntheticContactSeed {
  seedKey: string;
  subtype: "lead" | "prospect" | "customer";
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  notes: string;
  tags: string[];
  linkRole?: {
    department: string;
    jobTitle: string;
    isPrimaryContact: boolean;
  };
}

interface SyntheticOrganizationSeed {
  seedKey: string;
  subtype: "prospect" | "customer" | "partner";
  name: string;
  website: string;
  industry: string;
  size: string;
  billingEmail: string;
  phone: string;
  tags: string[];
  notes: string;
  contacts: SyntheticContactSeed[];
}

interface BootstrapOptions {
  envPath: string;
  mode: SeedMode;
  suffix: string;
  ownerEmail: string;
  password?: string;
  sessionId?: string;
  organizationId?: string;
  addCreatorAsOwner: boolean;
  configureTelephonyBinding: boolean;
  telephonyProviderKey?: TelephonyProviderKey;
  telephonyBaseUrl?: string;
  telephonyFromNumber?: string;
  telephonyWebhookSecret?: string;
  configureBooking: boolean;
  deployCoreWedge: boolean;
  deployKanzleiMvp: boolean;
  setPrimaryToClara: boolean;
  seedSyntheticData: boolean;
}

const DEMO_SEED_PREFIX = "schmitt_partner_demo_office_v1";

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
  if (value === "existing") {
    return "existing";
  }
  throw new Error(`Unsupported --mode value: ${value}`);
}

function normalizeSuffix(value: string | undefined): string {
  const fallback = Date.now().toString(36);
  if (!value) {
    return fallback;
  }
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function normalizeOptionalArg(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeTelephonyProviderKey(value: string | undefined): TelephonyProviderKey {
  if (value === "twilio_voice" || value === "custom_sip" || value === "elevenlabs") {
    return value;
  }
  return "elevenlabs";
}

function buildPassword(seed: string): string {
  const compact = seed.replace(/[^a-z0-9]/gi, "").slice(-8) || "schmitt";
  return `Pw!Demo${compact}`;
}

function buildDemoOfficeFixture(suffix: string): DemoOfficeFixture {
  const suffixLabel = suffix ? ` ${suffix}` : "";
  return {
    businessName: `Schmitt & Partner Rechtsanwaelte${suffixLabel}`,
    description:
      "Synthetic legal-office demo workspace for Clara-led intake, specialist handoffs, and backend follow-up operations.",
    industry: "law_firm",
    contactEmail: `kontakt+${suffix}@schmitt-partner-demo.example`,
    contactPhone: "+49 211 0000000",
    timezone: "Europe/Berlin",
    language: "de",
    dateFormat: "DD.MM.YYYY",
    ownerFirstName: "Sophie",
    ownerLastName: "Schmitt",
    defaultMeetingTitle: "Erstberatung",
    intakeLabel: "Erstberatung",
    primaryResourceLabel: "Kanzlei Intake Desk",
    preferredKanzleiMvpCloneName: "Kanzlei Assistenz",
  };
}

function buildSyntheticDataset(suffix: string): {
  organizations: SyntheticOrganizationSeed[];
  standaloneContacts: SyntheticContactSeed[];
} {
  const suffixToken = suffix.replace(/[^a-z0-9]/gi, "") || "demo";

  return {
    organizations: [
      {
        seedKey: `${DEMO_SEED_PREFIX}:org:arbeitgeber`,
        subtype: "prospect",
        name: "Bergmann Logistik GmbH",
        website: "https://bergmann-logistik.example",
        industry: "logistics",
        size: "51-200",
        billingEmail: `rechnung+bergmann-${suffixToken}@example.com`,
        phone: "+49 30 1111000",
        tags: ["arbeitsrecht", "fristkritisch", "demo_seed"],
        notes:
          "Synthetic account: wrongful termination cluster with two active labor-law matters and urgent deadline pressure.",
        contacts: [
          {
            seedKey: `${DEMO_SEED_PREFIX}:contact:arbeitsrecht:lena-vogt`,
            subtype: "lead",
            firstName: "Lena",
            lastName: "Vogt",
            email: `lena.vogt+${suffixToken}@example.com`,
            phone: "+49 171 4567890",
            jobTitle: "HR Manager",
            notes:
              "Caller reported termination notice delivered yesterday; asks for immediate callback and filing-deadline support.",
            tags: ["arbeitsrecht", "3_wochen_frist", "demo_seed"],
            linkRole: {
              department: "Human Resources",
              jobTitle: "HR Manager",
              isPrimaryContact: true,
            },
          },
        ],
      },
      {
        seedKey: `${DEMO_SEED_PREFIX}:org:mietrecht`,
        subtype: "prospect",
        name: "Rheinblick Immobilienverwaltung KG",
        website: "https://rheinblick-immobilien.example",
        industry: "real_estate",
        size: "11-50",
        billingEmail: `rechnung+rheinblick-${suffixToken}@example.com`,
        phone: "+49 221 2233440",
        tags: ["mietrecht", "nebenkosten", "demo_seed"],
        notes:
          "Synthetic account: recurring tenancy disputes with utility-cost objections and defect documentation backlog.",
        contacts: [
          {
            seedKey: `${DEMO_SEED_PREFIX}:contact:mietrecht:tim-becker`,
            subtype: "lead",
            firstName: "Tim",
            lastName: "Becker",
            email: `tim.becker+${suffixToken}@example.com`,
            phone: "+49 172 3355771",
            jobTitle: "Property Manager",
            notes:
              "Caller cited Nebenkosten dispute and mold evidence; requested structured checklist intake.",
            tags: ["mietrecht", "nebenkosten", "demo_seed"],
            linkRole: {
              department: "Property Management",
              jobTitle: "Property Manager",
              isPrimaryContact: true,
            },
          },
        ],
      },
      {
        seedKey: `${DEMO_SEED_PREFIX}:org:familienrecht`,
        subtype: "prospect",
        name: "Familienhilfe Nord e.V.",
        website: "https://familienhilfe-nord.example",
        industry: "nonprofit",
        size: "11-50",
        billingEmail: `rechnung+familienhilfe-${suffixToken}@example.com`,
        phone: "+49 40 6677880",
        tags: ["familienrecht", "schutzanordnung", "demo_seed"],
        notes:
          "Synthetic account: family-law support cases with safety-sensitive escalation and urgent protective order intake.",
        contacts: [
          {
            seedKey: `${DEMO_SEED_PREFIX}:contact:familienrecht:nora-klein`,
            subtype: "lead",
            firstName: "Nora",
            lastName: "Klein",
            email: `nora.klein+${suffixToken}@example.com`,
            phone: "+49 170 9911002",
            jobTitle: "Case Coordinator",
            notes:
              "Caller flagged domestic violence context and requested same-day legal callback.",
            tags: ["familienrecht", "notruf_110", "demo_seed"],
            linkRole: {
              department: "Case Coordination",
              jobTitle: "Case Coordinator",
              isPrimaryContact: true,
            },
          },
        ],
      },
    ],
    standaloneContacts: [
      {
        seedKey: `${DEMO_SEED_PREFIX}:contact:strafrecht:ali-yilmaz`,
        subtype: "lead",
        firstName: "Ali",
        lastName: "Yilmaz",
        email: `ali.yilmaz+${suffixToken}@example.com`,
        phone: "+49 176 22114455",
        jobTitle: "Private Caller",
        notes:
          "Synthetic criminal-law emergency case: sibling in custody, rights read, no attorney requested yet.",
        tags: ["strafrecht", "festgenommen", "demo_seed"],
      },
      {
        seedKey: `${DEMO_SEED_PREFIX}:contact:rueckruf:sabine-hartmann`,
        subtype: "prospect",
        firstName: "Sabine",
        lastName: "Hartmann",
        email: `sabine.hartmann+${suffixToken}@example.com`,
        phone: "+49 151 77889900",
        jobTitle: "Private Caller",
        notes:
          "Synthetic callback-only lead with narrow availability window for next-day intake follow-up.",
        tags: ["rueckruf", "callback_only", "demo_seed"],
      },
    ],
  };
}

function buildFallbackTelephonyWebhookSecret(suffix: string): string {
  const normalized = suffix.replace(/[^a-z0-9]/gi, "").slice(0, 24) || "demo";
  return `whsec_demo_${normalized}_schmitt_partner`;
}

function resolveTelephonyBindingInput(
  options: BootstrapOptions,
  fixture: DemoOfficeFixture,
): {
  providerKey: TelephonyProviderKey;
  baseUrl?: string;
  fromNumber: string;
  webhookSecret: string;
} {
  const providerKey = normalizeTelephonyProviderKey(
    options.telephonyProviderKey
      ?? normalizeOptionalArg(process.env.SCHMITT_DEMO_TELEPHONY_PROVIDER_KEY)
      ?? normalizeOptionalArg(process.env.DEMO_TELEPHONY_PROVIDER_KEY),
  );
  const baseUrl =
    options.telephonyBaseUrl
    ?? normalizeOptionalArg(process.env.SCHMITT_DEMO_TELEPHONY_BASE_URL)
    ?? normalizeOptionalArg(process.env.DEMO_TELEPHONY_BASE_URL)
    ?? normalizeOptionalArg(process.env.ELEVEN_TELEPHONY_BASE_URL);
  const fromNumber = required(
    options.telephonyFromNumber
      ?? normalizeOptionalArg(process.env.SCHMITT_DEMO_TELEPHONY_FROM_NUMBER)
      ?? normalizeOptionalArg(process.env.DEMO_TELEPHONY_FROM_NUMBER)
      ?? normalizeOptionalArg(process.env.ELEVEN_TELEPHONY_FROM_NUMBER)
      ?? fixture.contactPhone.replace(/\s+/g, ""),
    "Telephony from number is required. Provide --telephony-from-number or SCHMITT_DEMO_TELEPHONY_FROM_NUMBER.",
  );
  const webhookSecret = required(
    options.telephonyWebhookSecret
      ?? normalizeOptionalArg(process.env.SCHMITT_DEMO_TELEPHONY_WEBHOOK_SECRET)
      ?? normalizeOptionalArg(process.env.DEMO_TELEPHONY_WEBHOOK_SECRET)
      ?? normalizeOptionalArg(process.env.ELEVEN_TELEPHONY_WEBHOOK_SECRET)
      ?? buildFallbackTelephonyWebhookSecret(options.suffix),
    "Telephony webhook secret is required. Provide --telephony-webhook-secret or SCHMITT_DEMO_TELEPHONY_WEBHOOK_SECRET.",
  );

  return {
    providerKey,
    ...(baseUrl ? { baseUrl } : {}),
    fromNumber,
    webhookSecret,
  };
}

function printHelp(): void {
  console.log(`Usage:\n  npx tsx scripts/seed-schmitt-partner-demo-office.ts [options]\n\nPurpose:\n  Provision or hydrate a synthetic \"Schmitt & Partner\" law-office demo org with\n  Clara-connected telephony agents and realistic CRM seed data.\n\nOptions:\n  --help                         Show this help and exit\n  --env <path>                   Env file path (default: .env.local)\n  --mode <signup|admin|existing> Provision mode (default: signup)\n  --suffix <value>               Suffix for deterministic fixture identity\n  --email <value>                Owner email (signup mode)\n  --password <value>             Owner password (signup mode)\n  --session-id <value>           Required for admin/existing mode\n  --organization-id <value>      Required for existing mode\n  --add-creator-as-owner         Add creator as owner in admin mode\n  --skip-telephony-binding       Skip org-level telephony binding seed\n  --telephony-provider <value>   Telephony provider (elevenlabs|twilio_voice|custom_sip)\n  --telephony-base-url <value>   Optional provider base URL\n  --telephony-from-number <v>    Phone number used for org telephony binding\n  --telephony-webhook-secret <v> Webhook secret used for org telephony binding\n  --skip-booking-config          Skip Kanzlei booking config seed\n  --skip-core-wedge              Skip Clara/Jonas/Maren template deployment\n  --deploy-kanzlei-mvp           Also deploy single-agent Kanzlei MVP template\n  --skip-primary-clara           Skip primary-agent assignment to Clara clone\n  --skip-synthetic-data          Skip CRM synthetic data seeding\n\nExamples:\n  npx tsx scripts/seed-schmitt-partner-demo-office.ts --mode signup\n  npx tsx scripts/seed-schmitt-partner-demo-office.ts --mode admin --session-id <SESSION_ID>\n  npx tsx scripts/seed-schmitt-partner-demo-office.ts --mode existing --session-id <SESSION_ID> --organization-id <ORG_ID>\n`);
}

function parseOptions(argv: string[]): BootstrapOptions {
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const mode = normalizeMode(getArg("--mode"));
  const suffix = normalizeSuffix(getArg("--suffix"));
  const ownerEmail =
    (getArg("--email") || `sophie.schmitt+${suffix}@example.com`).trim().toLowerCase();
  const telephonyProviderArg = normalizeOptionalArg(getArg("--telephony-provider"));

  return {
    envPath: getArg("--env") || ".env.local",
    mode,
    suffix,
    ownerEmail,
    password: getArg("--password"),
    sessionId: getArg("--session-id"),
    organizationId: getArg("--organization-id"),
    addCreatorAsOwner: hasFlag("--add-creator-as-owner"),
    configureTelephonyBinding: !hasFlag("--skip-telephony-binding"),
    telephonyProviderKey: telephonyProviderArg
      ? normalizeTelephonyProviderKey(telephonyProviderArg)
      : undefined,
    telephonyBaseUrl: normalizeOptionalArg(getArg("--telephony-base-url")),
    telephonyFromNumber: normalizeOptionalArg(getArg("--telephony-from-number")),
    telephonyWebhookSecret: normalizeOptionalArg(getArg("--telephony-webhook-secret")),
    configureBooking: !hasFlag("--skip-booking-config"),
    deployCoreWedge: !hasFlag("--skip-core-wedge"),
    deployKanzleiMvp: hasFlag("--deploy-kanzlei-mvp"),
    setPrimaryToClara: !hasFlag("--skip-primary-clara"),
    seedSyntheticData: !hasFlag("--skip-synthetic-data"),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readCloneAgentId(value: unknown): string | null {
  const record = asRecord(value);
  return asString(record.cloneAgentId) || null;
}

function readCoreWedgeCloneAgentIds(coreWedgeDeploymentResult: unknown): string[] {
  const coreRecord = asRecord(coreWedgeDeploymentResult);
  const resultsRecord = asRecord(coreRecord.results);
  const candidateIds = [
    readCloneAgentId(resultsRecord.clara),
    readCloneAgentId(resultsRecord.jonas),
    readCloneAgentId(resultsRecord.maren),
  ];
  return candidateIds.filter((value): value is string => Boolean(value));
}

function isSuccessfulDeployment(result: unknown): boolean {
  const record = asRecord(result);
  return record.success === true;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const nested = asRecord(record.data);
    const nestedMessage = asString(nested.message);
    if (nestedMessage) {
      return nestedMessage;
    }
    const topLevel = asString(record.message);
    if (topLevel) {
      return topLevel;
    }
  }
  return "Unknown error";
}

function isEmailExistsError(error: unknown): boolean {
  const message = extractErrorMessage(error).toLowerCase();
  return (
    message.includes("email_exists")
    || message.includes("account with this email already exists")
  );
}

function isOrganizationSlugExistsError(error: unknown): boolean {
  const message = extractErrorMessage(error).toLowerCase();
  return (
    message.includes("organization with the slug")
    && message.includes("already exists")
  );
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function createOrResolveOrganization(
  client: ConvexHttpClient,
  options: BootstrapOptions,
  fixture: DemoOfficeFixture,
): Promise<{ sessionId: string; organizationId: string; organizationSlug?: string; steps: string[] }> {
  const steps: string[] = [];

  if (options.mode === "signup") {
    const password = options.password || buildPassword(options.suffix);
    try {
      const signupResult = await client.action(api.onboarding.signupFreeAccount, {
        email: options.ownerEmail,
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

      const sessionId = required(asString(signupResult.sessionId), "signupFreeAccount did not return sessionId.");
      const organizationRecord = asRecord(signupResult.organization);
      const organizationId = required(asString(organizationRecord.id), "signupFreeAccount did not return organization.id.");

      steps.push("onboarding.signupFreeAccount");
      return {
        sessionId,
        organizationId,
        organizationSlug: asString(organizationRecord.slug),
        steps,
      };
    } catch (error) {
      if (!isEmailExistsError(error)) {
        throw error;
      }

      const signInResult = await client.action(api.auth.signIn, {
        email: options.ownerEmail,
        password,
      });
      const sessionId = required(
        asString(signInResult.sessionId),
        "auth.signIn did not return sessionId while recovering existing signup email.",
      );
      steps.push("auth.signIn(existing_account)");

      try {
        const createResult = await client.action(api.organizations.createBusinessOrganization, {
          sessionId,
          businessName: fixture.businessName,
          description: fixture.description,
          industry: fixture.industry,
          contactEmail: fixture.contactEmail,
          contactPhone: fixture.contactPhone,
          timezone: fixture.timezone,
          dateFormat: fixture.dateFormat,
          language: fixture.language,
        });
        const organizationId = required(
          asString(createResult.organizationId),
          "createBusinessOrganization did not return organizationId after existing-account recovery.",
        );
        steps.push("organizations.createBusinessOrganization(existing_account_recovery)");
        return {
          sessionId,
          organizationId,
          organizationSlug: asString(createResult.slug),
          steps,
        };
      } catch (createError) {
        if (!isOrganizationSlugExistsError(createError)) {
          throw createError;
        }

        const organizations = await client.query(api.organizations.getUserOrganizations, {
          sessionId,
        });
        const targetSlug = toSlug(fixture.businessName);
        const selected = asArray(organizations).find((entry) => {
          const organization = asRecord(asRecord(entry).organization);
          const name = asString(organization.name);
          const slug = asString(organization.slug);
          return name === fixture.businessName || slug === targetSlug;
        });
        const selectedOrg = asRecord(asRecord(selected).organization);
        const organizationId = required(
          asString(selectedOrg._id),
          "Could not resolve existing organization during existing-account recovery.",
        );
        steps.push("organizations.reuseExistingBySlug(existing_account_recovery)");
        return {
          sessionId,
          organizationId,
          organizationSlug: asString(selectedOrg.slug),
          steps,
        };
      }
    }
  }

  const sessionId = required(options.sessionId, `${options.mode} mode requires --session-id.`);

  if (options.mode === "existing") {
    const organizationId = required(options.organizationId, "existing mode requires --organization-id.");
    steps.push("organizations.resolveExisting");
    return { sessionId, organizationId, steps };
  }

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
    addCreatorAsOwner: options.addCreatorAsOwner,
  });

  const organizationId = required(asString(createResult.organizationId), "createOrganization did not return organizationId.");
  steps.push("organizations.createOrganization");

  return {
    sessionId,
    organizationId,
    organizationSlug: asString(createResult.slug),
    steps,
  };
}

async function ensureSwitchedOrganization(
  client: ConvexHttpClient,
  sessionId: string,
  organizationId: string,
  steps: string[],
): Promise<void> {
  await client.mutation(api.auth.switchOrganization, {
    sessionId,
    organizationId,
  });
  steps.push("auth.switchOrganization");
}

async function seedSyntheticCrmDataset(params: {
  client: ConvexHttpClient;
  sessionId: string;
  organizationId: string;
  suffix: string;
}) {
  const { client, sessionId, organizationId, suffix } = params;

  const dataset = buildSyntheticDataset(suffix);
  const existingOrganizations = await client.query(api.crmOntology.getCrmOrganizations, {
    sessionId,
    organizationId,
  });
  const existingContacts = await client.query(api.crmOntology.getContacts, {
    sessionId,
    organizationId,
  });

  const existingOrgBySeedKey = new Map<string, string>();
  for (const record of asArray(existingOrganizations)) {
    const orgRecord = asRecord(record);
    const customProperties = asRecord(orgRecord.customProperties);
    const key = asString(customProperties.demoSeedKey);
    const id = asString(orgRecord._id);
    if (key && id) {
      existingOrgBySeedKey.set(key, id);
    }
  }

  const existingContactBySeedKey = new Map<string, string>();
  for (const record of asArray(existingContacts)) {
    const contactRecord = asRecord(record);
    const customProperties = asRecord(contactRecord.customProperties);
    const key =
      asString(customProperties.demoSeedKey) ||
      asString(customProperties.sourceRef);
    const id = asString(contactRecord._id);
    if (key && id) {
      existingContactBySeedKey.set(key, id);
    }
  }

  const seededOrganizationIds: string[] = [];
  const seededContactIds: string[] = [];
  const reusedOrganizationIds: string[] = [];
  const reusedContactIds: string[] = [];
  const linkIds: string[] = [];

  for (const organizationSeed of dataset.organizations) {
    let crmOrganizationId = existingOrgBySeedKey.get(organizationSeed.seedKey) || null;

    if (!crmOrganizationId) {
      crmOrganizationId = await client.mutation(api.crmOntology.createCrmOrganization, {
        sessionId,
        organizationId,
        subtype: organizationSeed.subtype,
        name: organizationSeed.name,
        website: organizationSeed.website,
        industry: organizationSeed.industry,
        size: organizationSeed.size,
        billingEmail: organizationSeed.billingEmail,
        phone: organizationSeed.phone,
        tags: organizationSeed.tags,
        notes: organizationSeed.notes,
        customFields: {
          demoSeedKey: organizationSeed.seedKey,
          sourceRef: organizationSeed.seedKey,
          seedProfile: "schmitt_partner_demo_office",
        },
      });
      seededOrganizationIds.push(crmOrganizationId);
    } else {
      reusedOrganizationIds.push(crmOrganizationId);
    }

    for (const contactSeed of organizationSeed.contacts) {
      let contactId = existingContactBySeedKey.get(contactSeed.seedKey) || null;

      if (!contactId) {
        contactId = await client.mutation(api.crmOntology.createContact, {
          sessionId,
          organizationId,
          subtype: contactSeed.subtype,
          firstName: contactSeed.firstName,
          lastName: contactSeed.lastName,
          email: contactSeed.email,
          phone: contactSeed.phone,
          jobTitle: contactSeed.jobTitle,
          company: organizationSeed.name,
          source: "import",
          sourceRef: contactSeed.seedKey,
          tags: contactSeed.tags,
          notes: contactSeed.notes,
          customFields: {
            demoSeedKey: contactSeed.seedKey,
            seedProfile: "schmitt_partner_demo_office",
          },
        });
        seededContactIds.push(contactId);
      } else {
        reusedContactIds.push(contactId);
      }

      const currentLinks = await client.query(api.crmOntology.getOrganizationContacts, {
        sessionId,
        crmOrganizationId,
      });
      const alreadyLinked = asArray(currentLinks).some((entry) => {
        const record = asRecord(entry);
        return asString(record._id) === contactId;
      });

      if (!alreadyLinked) {
        const linkId = await client.mutation(api.crmOntology.linkContactToOrganization, {
          sessionId,
          contactId,
          crmOrganizationId,
          jobTitle: contactSeed.linkRole?.jobTitle,
          department: contactSeed.linkRole?.department,
          isPrimaryContact: contactSeed.linkRole?.isPrimaryContact,
        });
        linkIds.push(linkId);
      }
    }
  }

  for (const contactSeed of dataset.standaloneContacts) {
    const existingId = existingContactBySeedKey.get(contactSeed.seedKey);
    if (existingId) {
      reusedContactIds.push(existingId);
      continue;
    }

    const createdId = await client.mutation(api.crmOntology.createContact, {
      sessionId,
      organizationId,
      subtype: contactSeed.subtype,
      firstName: contactSeed.firstName,
      lastName: contactSeed.lastName,
      email: contactSeed.email,
      phone: contactSeed.phone,
      jobTitle: contactSeed.jobTitle,
      source: "import",
      sourceRef: contactSeed.seedKey,
      tags: contactSeed.tags,
      notes: contactSeed.notes,
      customFields: {
        demoSeedKey: contactSeed.seedKey,
        seedProfile: "schmitt_partner_demo_office",
      },
    });
    seededContactIds.push(createdId);
  }

  const finalOrganizations = await client.query(api.crmOntology.getCrmOrganizations, {
    sessionId,
    organizationId,
  });
  const finalContacts = await client.query(api.crmOntology.getContacts, {
    sessionId,
    organizationId,
  });

  return {
    profile: "schmitt_partner_demo_office",
    targetSeedPrefix: DEMO_SEED_PREFIX,
    seededOrganizationIds,
    reusedOrganizationIds,
    seededContactIds,
    reusedContactIds,
    createdRelationshipLinkIds: linkIds,
    totals: {
      organizations: asArray(finalOrganizations).length,
      contacts: asArray(finalContacts).length,
    },
  };
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const envAbsolutePath = path.resolve(process.cwd(), options.envPath);
  loadEnv({ path: envAbsolutePath, override: false });

  const convexUrl = required(
    process.env.NEXT_PUBLIC_CONVEX_URL,
    `NEXT_PUBLIC_CONVEX_URL is required. Checked ${options.envPath}.`,
  );

  const fixture = buildDemoOfficeFixture(options.suffix);
  const client = new ConvexHttpClient(convexUrl);

  const { sessionId, organizationId, organizationSlug, steps } = await createOrResolveOrganization(
    client,
    options,
    fixture,
  );

  await ensureSwitchedOrganization(client, sessionId, organizationId, steps);
  let organizationTelephonyBindingResult: unknown = null;
  let telephonyBindingInputSummary: unknown = null;

  if (options.configureTelephonyBinding) {
    const telephonyBindingInput = resolveTelephonyBindingInput(options, fixture);
    organizationTelephonyBindingResult = await client.mutation(
      api.integrations.telephony.saveOrganizationTelephonySettings,
      {
        sessionId,
        organizationId,
        providerKey: telephonyBindingInput.providerKey,
        enabled: true,
        baseUrl: telephonyBindingInput.baseUrl,
        fromNumber: telephonyBindingInput.fromNumber,
        webhookSecret: telephonyBindingInput.webhookSecret,
      },
    );
    telephonyBindingInputSummary = {
      providerKey: telephonyBindingInput.providerKey,
      baseUrl: telephonyBindingInput.baseUrl || null,
      fromNumber: telephonyBindingInput.fromNumber,
      hasWebhookSecret: true,
    };
    steps.push("integrations.telephony.saveOrganizationTelephonySettings");
  }

  if (options.configureBooking) {
    await client.mutation(api.organizationOntology.upsertKanzleiBookingConciergeConfig, {
      sessionId,
      organizationId,
      timezone: fixture.timezone,
      primaryResourceLabel: fixture.primaryResourceLabel,
      defaultMeetingTitle: fixture.defaultMeetingTitle,
      intakeLabel: fixture.intakeLabel,
      requireConfiguredResource: false,
    });
    steps.push("organizationOntology.upsertKanzleiBookingConciergeConfig");
  }

  let coreWedgeDeploymentResult: unknown = null;
  let coreWedgeTelephonySyncResults: unknown[] = [];
  let kanzleiMvpDeploymentResult: unknown = null;
  let claraCloneAgentId: string | null = null;
  let primaryAssignmentResult: unknown = null;

  if (options.deployCoreWedge) {
    try {
      const jonasDeployment = await client.action(
        api.integrations.telephony.deployJonasTemplateToOrganization,
        {
          sessionId,
          organizationId,
        },
      );
      steps.push("integrations.telephony.deployJonasTemplateToOrganization");

      const jonasCloneAgentId = readCloneAgentId(jonasDeployment);
      if (jonasCloneAgentId) {
        const syncResult = await client.action(api.integrations.telephony.syncAgentTelephonyProvider, {
          sessionId,
          organizationId,
          agentId: jonasCloneAgentId,
        });
        coreWedgeTelephonySyncResults.push({
          templateRole: "jonas",
          agentId: jonasCloneAgentId,
          result: syncResult,
        });
      }

      const marenDeployment = await client.action(
        api.integrations.telephony.deployMarenTemplateToOrganization,
        {
          sessionId,
          organizationId,
        },
      );
      steps.push("integrations.telephony.deployMarenTemplateToOrganization");

      const marenCloneAgentId = readCloneAgentId(marenDeployment);
      if (marenCloneAgentId) {
        const syncResult = await client.action(api.integrations.telephony.syncAgentTelephonyProvider, {
          sessionId,
          organizationId,
          agentId: marenCloneAgentId,
        });
        coreWedgeTelephonySyncResults.push({
          templateRole: "maren",
          agentId: marenCloneAgentId,
          result: syncResult,
        });
      }

      const claraDeployment = await client.action(
        api.integrations.telephony.deployClaraTemplateToOrganization,
        {
          sessionId,
          organizationId,
        },
      );
      steps.push("integrations.telephony.deployClaraTemplateToOrganization");

      claraCloneAgentId = readCloneAgentId(claraDeployment);
      if (claraCloneAgentId) {
        const syncResult = await client.action(api.integrations.telephony.syncAgentTelephonyProvider, {
          sessionId,
          organizationId,
          agentId: claraCloneAgentId,
        });
        coreWedgeTelephonySyncResults.push({
          templateRole: "clara",
          agentId: claraCloneAgentId,
          result: syncResult,
        });
      }

      coreWedgeDeploymentResult = {
        success: [jonasDeployment, marenDeployment, claraDeployment].every(isSuccessfulDeployment),
        status: [jonasDeployment, marenDeployment, claraDeployment].every(isSuccessfulDeployment)
          ? "success"
          : "partial",
        orchestration: "scripted_sequential_dependency_aware_v1",
        results: {
          jonas: jonasDeployment,
          maren: marenDeployment,
          clara: claraDeployment,
        },
      };
      steps.push("integrations.telephony.deployCoreWedgeTemplatesToOrganization(scripted)");

      if (coreWedgeTelephonySyncResults.length > 0) {
        steps.push("integrations.telephony.syncAgentTelephonyProvider(core_wedge_scripted)");
      }
    } catch (error) {
      coreWedgeDeploymentResult = {
        success: false,
        status: "blocked",
        message: extractErrorMessage(error),
      };
      steps.push("integrations.telephony.deployCoreWedgeTemplatesToOrganization(scripted):warning");
    }
  }

  if (options.deployKanzleiMvp) {
    try {
      kanzleiMvpDeploymentResult = await client.action(
        api.integrations.telephony.deployKanzleiMvpTemplateToOrganization,
        {
          sessionId,
          organizationId,
          preferredCloneName: fixture.preferredKanzleiMvpCloneName,
        },
      );
      steps.push("integrations.telephony.deployKanzleiMvpTemplateToOrganization");
    } catch (error) {
      kanzleiMvpDeploymentResult = {
        success: false,
        status: "blocked",
        message: extractErrorMessage(error),
      };
      steps.push("integrations.telephony.deployKanzleiMvpTemplateToOrganization:warning");
    }
  }

  if (options.setPrimaryToClara && claraCloneAgentId) {
    try {
      primaryAssignmentResult = await client.mutation(api.agentOntology.setPrimaryAgent, {
        sessionId,
        agentId: claraCloneAgentId,
        reason: "schmitt_partner_demo_office_bootstrap",
      });
      steps.push("agentOntology.setPrimaryAgent(clara)");
    } catch (error) {
      primaryAssignmentResult = {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : String(error),
      };
      steps.push("agentOntology.setPrimaryAgent(clara):warning");
    }
  }

  let syntheticDataResult: unknown = null;
  if (options.seedSyntheticData) {
    syntheticDataResult = await seedSyntheticCrmDataset({
      client,
      sessionId,
      organizationId,
      suffix: options.suffix,
    });
    steps.push("crmOntology.syntheticSeed");
  }

  const agents = await client.query(api.agentOntology.getAgents, {
    sessionId,
    organizationId,
  });

  const agentSummary = asArray(agents).map((agent) => {
    const record = asRecord(agent);
    const props = asRecord(record.customProperties);
    return {
      agentId: asString(record._id) || null,
      name: asString(record.name) || null,
      status: asString(record.status) || null,
      subtype: asString(record.subtype) || null,
      templateRole: asString(props.templateRole) || null,
      isPrimary: props.isPrimary === true,
      hasTelephonyConfig:
        Object.keys(asRecord(props.telephonyConfig)).length > 0,
    };
  });

  const summary = {
    profile: "schmitt_partner_demo_office",
    envPath: options.envPath,
    convexUrl,
    mode: options.mode,
    suffix: options.suffix,
    ownerEmail: options.ownerEmail,
    organization: {
      id: organizationId,
      slug: organizationSlug || null,
      businessName: fixture.businessName,
    },
    sessionId,
    steps,
    deployments: {
      organizationTelephonyBinding: organizationTelephonyBindingResult,
      telephonyBindingInput: telephonyBindingInputSummary,
      coreWedge: coreWedgeDeploymentResult,
      coreWedgeTelephonySync: coreWedgeTelephonySyncResults,
      kanzleiMvp: kanzleiMvpDeploymentResult,
      claraCloneAgentId,
      primaryAssignment: primaryAssignmentResult,
    },
    syntheticData: syntheticDataResult,
    agents: {
      total: agentSummary.length,
      roster: agentSummary,
    },
    nextActionHint:
      "Run telephony provider sync for the target org agents and execute a scripted Clara demo call against the seeded Schmitt & Partner dataset.",
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
