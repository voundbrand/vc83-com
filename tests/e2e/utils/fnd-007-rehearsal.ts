import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import type { Id } from "../../../convex/_generated/dataModel";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api: apiAny } = require("../../../convex/_generated/api") as { api: any };

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false });

export const FND_007_REPORT_PATH = path.join(
  process.cwd(),
  "tmp",
  "reports",
  "fnd-007",
  "latest.json",
);

const FND_007_FIXTURE_METADATA_PATH = path.join(
  process.cwd(),
  "tmp",
  "playwright",
  "fnd-007-fixture-metadata.json",
);

export const FND_007_DEFAULT_UNBLOCKING_STEPS = [
  "Connect Stripe and verify invoice provider health for live dispatch.",
  "Connect Resend (or Microsoft sender) for invoice email delivery.",
  "Configure ticket/invoice/email template defaults for the rehearsal organization.",
  "Run staged draft/publish rehearsal; sandbox dry-run autonomy remains blocked until implemented.",
] as const;

type SeedAdminResult = {
  success?: boolean;
  message?: string;
  organizationId: Id<"organizations">;
  userId: Id<"users">;
};

type SetupPasswordResult = {
  success: boolean;
  sessionId: string;
  user: {
    id: Id<"users">;
    email: string;
  };
};

type CreatedCheckoutResult = {
  instanceId: Id<"objects">;
};

export type Fnd007Preflight = {
  status: "available_now" | "blocked";
  blockedReasons: string[];
  unblockingSteps: string[];
  sandboxAutonomyRequested: boolean;
  liveIntegrations: {
    stripeConnected: boolean;
    resendConnected: boolean;
  };
  simulatedFallbacks: string[];
};

export type Fnd007Fixture = {
  runId: string;
  convexUrl: string;
  adminEmail: string;
  adminPassword: string;
  adminSessionId: string;
  organizationId: Id<"organizations">;
  organizationSlug: string;
  eventId: Id<"objects">;
  formId: Id<"objects">;
  productIds: Array<Id<"objects">>;
  checkoutInstanceId: Id<"objects">;
  checkoutPublicSlug: string;
  checkoutPath: string;
  checkoutCustomerEmail: string;
  createdAt: number;
};

export type Fnd007CheckpointResult = {
  id: "FND-007-C1" | "FND-007-C2" | "FND-007-C3" | "FND-007-C4";
  status: "PASS" | "FAIL";
  detail: string;
};

export type Fnd007EvidenceArtifact = {
  runId: string;
  scenarioId: "FND-007";
  checkpointPassCount: number;
  checkpointFailIds: string[] | "none";
  firstActionableSeconds: number;
  totalRuntimeSeconds: number;
  mutatingActionCount: number;
  approvedMutationCount: number;
  trustEventCoverage: "covered" | "missing";
  preflightStatus: "available_now" | "blocked";
  blockedUnblockingStepsPresent: "yes" | "no" | "n_a";
  oneVisibleOperatorMaintained: "yes" | "no";
  result: "PASS" | "FAIL";
  notes: string;
  generatedAt: string;
  rehearsalMode: "live" | "simulated";
  simulatedComponents: string[];
  checkpointResults: Fnd007CheckpointResult[];
  preflight_status: Fnd007Preflight;
  action_log: Array<Record<string, unknown>>;
  trust_log: Array<Record<string, unknown>>;
  outcome_summary: Record<string, unknown>;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function createFixtureRunId() {
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${nonce}`;
}

function toYYYYMMDD(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export function buildDemoRunId(date = new Date()) {
  return `demo-${toYYYYMMDD(date)}-07`;
}

export function createConvexClient(convexUrl?: string) {
  return new ConvexHttpClient(convexUrl || requiredEnv("NEXT_PUBLIC_CONVEX_URL"));
}

export function evaluateFnd007Preflight(): Fnd007Preflight {
  const hasConvexUrl = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL?.trim());
  const stripeConnected = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  const resendConnected = Boolean(process.env.RESEND_API_KEY?.trim());
  const sandboxAutonomyRequested =
    process.env.FND_007_REQUIRE_SANDBOX_DRY_RUN_AUTONOMY === "1";

  const blockedReasons: string[] = [];
  const unblockingSteps: string[] = [];

  if (!hasConvexUrl) {
    blockedReasons.push("missing_convex_url");
    unblockingSteps.push("Set NEXT_PUBLIC_CONVEX_URL so rehearsal automation can reach Convex.");
  }

  if (sandboxAutonomyRequested) {
    blockedReasons.push("sandbox_dry_run_autonomy_not_implemented");
    unblockingSteps.push(...FND_007_DEFAULT_UNBLOCKING_STEPS);
  }

  const simulatedFallbacks: string[] = [];
  if (!stripeConnected) {
    simulatedFallbacks.push("stripe_live_dispatch");
  }
  if (!resendConnected) {
    simulatedFallbacks.push("invoice_email_send");
  }

  return {
    status: blockedReasons.length > 0 ? "blocked" : "available_now",
    blockedReasons,
    unblockingSteps,
    sandboxAutonomyRequested,
    liveIntegrations: {
      stripeConnected,
      resendConnected,
    },
    simulatedFallbacks,
  };
}

async function writeFixtureMetadata(fixture: Fnd007Fixture) {
  await fs.mkdir(path.dirname(FND_007_FIXTURE_METADATA_PATH), { recursive: true });
  await fs.writeFile(FND_007_FIXTURE_METADATA_PATH, JSON.stringify(fixture, null, 2), "utf8");
}

export async function writeFnd007EvidenceArtifact(evidence: Fnd007EvidenceArtifact) {
  await fs.mkdir(path.dirname(FND_007_REPORT_PATH), { recursive: true });
  await fs.writeFile(FND_007_REPORT_PATH, JSON.stringify(evidence, null, 2), "utf8");
}

export async function bootstrapFnd007Fixture(): Promise<Fnd007Fixture> {
  const convexUrl = requiredEnv("NEXT_PUBLIC_CONVEX_URL");
  const convex = createConvexClient(convexUrl);
  const runId = createFixtureRunId();
  const createdAt = Date.now();

  const adminEmail = `playwright.fnd007.${runId}@example.com`;
  const adminPassword = `Pw!Fnd007${Date.now()}`;
  const organizationSlug = `pw-fnd007-${runId}`.toLowerCase();
  const organizationName = `Playwright FND-007 ${runId}`;
  const checkoutCustomerEmail = `founder-demo.${runId}@example.com`;

  const seedResult = (await convex.mutation(apiAny.seedAdmin.createSuperAdminUser, {
    email: adminEmail,
    firstName: "Playwright",
    lastName: "FounderDemo",
    organizationName,
    organizationSlug,
  })) as SeedAdminResult;

  if (!seedResult?.organizationId || seedResult.success === false) {
    throw new Error(seedResult?.message || "Failed to seed FND-007 fixture organization.");
  }

  const setupResult = (await convex.action(apiAny.auth.setupPassword, {
    email: adminEmail,
    password: adminPassword,
    firstName: "Playwright",
    lastName: "FounderDemo",
  })) as SetupPasswordResult;

  if (!setupResult?.sessionId) {
    throw new Error("Failed to create authenticated session for FND-007 fixture.");
  }

  const adminSessionId = setupResult.sessionId;
  const organizationId = seedResult.organizationId;

  const eventStart = Date.now() + 1000 * 60 * 60 * 24 * 10;
  const eventEnd = eventStart + 1000 * 60 * 60 * 7;

  const eventId = (await convex.mutation(apiAny.eventOntology.createEvent, {
    sessionId: adminSessionId,
    organizationId,
    subtype: "conference",
    name: `Founder Summit ${runId}`,
    description: "FND-007 deterministic rehearsal event fixture.",
    startDate: eventStart,
    endDate: eventEnd,
    location: "Austin Convention Center",
  })) as Id<"objects">;

  await convex.mutation(apiAny.eventOntology.publishEvent, {
    sessionId: adminSessionId,
    eventId,
  });

  const formSchema = {
    version: "1.0",
    sections: [
      {
        id: "attendee-profile",
        title: "Attendee profile",
        description: "Registration data captured during checkout.",
        fields: [
          {
            id: "attendee_role",
            type: "select",
            label: "Attendee Role",
            required: true,
            options: [
              { value: "attendee", label: "Attendee" },
              { value: "speaker", label: "Speaker" },
              { value: "sponsor", label: "Sponsor" },
            ],
          },
          {
            id: "dietary_restrictions",
            type: "text",
            label: "Dietary restrictions",
            required: false,
          },
        ],
      },
    ],
    settings: {
      allowMultipleSubmissions: false,
      showProgressBar: true,
      submitButtonText: "Continue",
      successMessage: "Submitted",
      redirectUrl: null,
      displayMode: "all",
    },
  };

  const formId = (await convex.mutation(apiAny.formsOntology.createForm, {
    sessionId: adminSessionId,
    organizationId,
    subtype: "registration",
    name: `Founder Summit Registration ${runId}`,
    description: "FND-007 custom registration form fixture.",
    formSchema,
    eventId,
  })) as Id<"objects">;

  await convex.mutation(apiAny.formsOntology.publishForm, {
    sessionId: adminSessionId,
    formId,
  });

  const standardTicketId = (await convex.mutation(apiAny.productOntology.createProduct, {
    sessionId: adminSessionId,
    organizationId,
    subtype: "ticket",
    name: `Founder Standard Ticket ${runId}`,
    description: "Standard ticket tier for rehearsal.",
    price: 9900,
    currency: "EUR",
    inventory: 100,
    eventId,
    customProperties: {
      ticketTier: "standard",
    },
  })) as Id<"objects">;

  const vipTicketId = (await convex.mutation(apiAny.productOntology.createProduct, {
    sessionId: adminSessionId,
    organizationId,
    subtype: "ticket",
    name: `Founder VIP Ticket ${runId}`,
    description: "VIP ticket tier for rehearsal.",
    price: 24900,
    currency: "EUR",
    inventory: 30,
    eventId,
    customProperties: {
      ticketTier: "vip",
    },
  })) as Id<"objects">;

  const productIds = [standardTicketId, vipTicketId];

  for (const productId of productIds) {
    await convex.mutation(apiAny.productOntology.updateProduct, {
      sessionId: adminSessionId,
      productId,
      customProperties: {
        formId,
        formTiming: "duringCheckout",
      },
    });

    await convex.mutation(apiAny.formsOntology.linkFormToTicket, {
      sessionId: adminSessionId,
      ticketId: productId,
      formId,
      timing: "duringCheckout",
      required: true,
    });

    await convex.mutation(apiAny.productOntology.publishProduct, {
      sessionId: adminSessionId,
      productId,
    });
  }

  const checkoutPublicSlug = `fnd-007-checkout-${runId}`;
  const checkoutCreateResult = (await convex.mutation(apiAny.checkoutOntology.createCheckoutInstance, {
    sessionId: adminSessionId,
    organizationId,
    templateCode: "behavior-driven-checkout",
    name: `Founder Demo Checkout ${runId}`,
    description: "FND-007 automated rehearsal checkout.",
    configuration: {
      publicSlug: checkoutPublicSlug,
      linkedProducts: productIds,
      paymentProviders: ["invoice"],
      showProgressBar: true,
      allowBackNavigation: true,
      behaviorExecutionTiming: "eager",
      executeBehaviorsOnStepChange: true,
      debugMode: false,
    },
  })) as CreatedCheckoutResult;

  const checkoutInstanceId = checkoutCreateResult.instanceId;

  await convex.mutation(apiAny.checkoutOntology.publishCheckoutInstance, {
    sessionId: adminSessionId,
    instanceId: checkoutInstanceId,
  });

  const checkoutPath = `/checkout/${organizationSlug}/${checkoutPublicSlug}`;

  const fixture: Fnd007Fixture = {
    runId,
    convexUrl,
    adminEmail,
    adminPassword,
    adminSessionId,
    organizationId,
    organizationSlug,
    eventId,
    formId,
    productIds,
    checkoutInstanceId,
    checkoutPublicSlug,
    checkoutPath,
    checkoutCustomerEmail,
    createdAt,
  };

  await writeFixtureMetadata(fixture);
  console.log(`[FND-007 Fixture] seeded runId=${runId} path=${checkoutPath}`);
  return fixture;
}
