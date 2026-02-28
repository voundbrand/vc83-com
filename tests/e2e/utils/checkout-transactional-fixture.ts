import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import type { Id } from "../../../convex/_generated/dataModel";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api: apiAny } = require("../../../convex/_generated/api") as { api: any };

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false });

const FIXTURE_METADATA_PATH = path.join(
  process.cwd(),
  "tmp",
  "playwright",
  "checkout-transactional-metadata.json",
);

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

export type TransactionalCheckoutFixture = {
  runId: string;
  convexUrl: string;
  adminEmail: string;
  adminPassword: string;
  adminSessionId: string;
  organizationId: Id<"organizations">;
  organizationSlug: string;
  eventId: Id<"objects">;
  formId: Id<"objects">;
  productId: Id<"objects">;
  checkoutInstanceId: Id<"objects">;
  checkoutPublicSlug: string;
  checkoutPath: string;
  checkoutCustomerEmail: string;
  createdAt: number;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function createRunId() {
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${nonce}`;
}

export function createConvexClient(convexUrl?: string) {
  return new ConvexHttpClient(convexUrl || requiredEnv("NEXT_PUBLIC_CONVEX_URL"));
}

async function writeFixtureMetadata(fixture: TransactionalCheckoutFixture) {
  await fs.mkdir(path.dirname(FIXTURE_METADATA_PATH), { recursive: true });
  await fs.writeFile(FIXTURE_METADATA_PATH, JSON.stringify(fixture, null, 2), "utf8");
}

export async function bootstrapTransactionalCheckoutFixture(): Promise<TransactionalCheckoutFixture> {
  const convexUrl = requiredEnv("NEXT_PUBLIC_CONVEX_URL");
  const convex = createConvexClient(convexUrl);
  const runId = createRunId();
  const createdAt = Date.now();

  const adminEmail = `playwright.transactional.${runId}@example.com`;
  const adminPassword = `Pw!Txn${Date.now()}`;
  const organizationSlug = `pw-txn-${runId}`.toLowerCase();
  const organizationName = `Playwright Transactional ${runId}`;
  const checkoutCustomerEmail = `buyer.${runId}@example.com`;

  const seedResult = (await convex.mutation(apiAny.seedAdmin.createSuperAdminUser, {
    email: adminEmail,
    firstName: "Playwright",
    lastName: "Transactional",
    organizationName,
    organizationSlug,
  })) as SeedAdminResult;

  if (!seedResult?.organizationId || seedResult.success === false) {
    throw new Error(seedResult?.message || "Failed to seed super admin fixture organization.");
  }

  const setupResult = (await convex.action(apiAny.auth.setupPassword, {
    email: adminEmail,
    password: adminPassword,
    firstName: "Playwright",
    lastName: "Transactional",
  })) as SetupPasswordResult;

  if (!setupResult?.sessionId) {
    throw new Error("Failed to create authenticated session for transactional fixture.");
  }

  const adminSessionId = setupResult.sessionId;
  const organizationId = seedResult.organizationId;

  const eventStart = Date.now() + 1000 * 60 * 60 * 24 * 7;
  const eventEnd = eventStart + 1000 * 60 * 60 * 8;

  const eventId = (await convex.mutation(apiAny.eventOntology.createEvent, {
    sessionId: adminSessionId,
    organizationId,
    subtype: "conference",
    name: `Playwright Event ${runId}`,
    description: "Transactional regression event fixture.",
    startDate: eventStart,
    endDate: eventEnd,
    location: "San Francisco Convention Center",
  })) as Id<"objects">;

  await convex.mutation(apiAny.eventOntology.publishEvent, {
    sessionId: adminSessionId,
    eventId,
  });

  const formSchema = {
    version: "1.0",
    sections: [
      {
        id: "attendee-details",
        title: "Attendee Details",
        description: "Required attendee profile questions.",
        fields: [
          {
            id: "attendee_role",
            type: "select",
            label: "Attendee Role",
            required: true,
            options: [
              { value: "attendee", label: "Attendee" },
              { value: "speaker", label: "Speaker" },
            ],
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
    name: `Playwright Registration ${runId}`,
    description: "Transactional regression registration form.",
    formSchema,
    eventId,
  })) as Id<"objects">;

  await convex.mutation(apiAny.formsOntology.publishForm, {
    sessionId: adminSessionId,
    formId,
  });

  const productId = (await convex.mutation(apiAny.productOntology.createProduct, {
    sessionId: adminSessionId,
    organizationId,
    subtype: "ticket",
    name: `Playwright Ticket ${runId}`,
    description: "Transactional regression ticket product.",
    price: 12900,
    currency: "EUR",
    inventory: 50,
    eventId,
    customProperties: {
      ticketTier: "standard",
    },
  })) as Id<"objects">;

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

  const checkoutPublicSlug = `pw-checkout-${runId}`;
  const checkoutCreateResult = (await convex.mutation(apiAny.checkoutOntology.createCheckoutInstance, {
    sessionId: adminSessionId,
    organizationId,
    templateCode: "behavior-driven-checkout",
    name: `Playwright Checkout ${runId}`,
    description: "Transactional regression checkout fixture.",
    configuration: {
      publicSlug: checkoutPublicSlug,
      linkedProducts: [productId],
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

  const fixture: TransactionalCheckoutFixture = {
    runId,
    convexUrl,
    adminEmail,
    adminPassword,
    adminSessionId,
    organizationId,
    organizationSlug,
    eventId,
    formId,
    productId,
    checkoutInstanceId,
    checkoutPublicSlug,
    checkoutPath,
    checkoutCustomerEmail,
    createdAt,
  };

  await writeFixtureMetadata(fixture);
  console.log(`[Transactional Fixture] seeded runId=${runId} path=${checkoutPath}`);
  return fixture;
}
