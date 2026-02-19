/**
 * Orchestration Runtime Actions
 *
 * Core reusable runtime for one-shot experience creation.
 * OCO-006 introduces `createExperience`; OCO-007 layers event playbook helpers on top.
 */

import { internalAction } from "../../_generated/server";
import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { ORCHESTRATION_EXPERIENCE_CONTRACT } from "../../orchestrationContract";
import { deriveEventPlaybookInput } from "./orchestrationPlaybooks";

// Lazy-load generated refs to avoid deep type-instantiation costs.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _internalCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  if (!_internalCache) {
    _internalCache = require("../../_generated/api").internal;
  }
  return _internalCache;
}

type StepStatus = "created" | "reused" | "skipped" | "failed";

interface StepLog {
  stepKey: string;
  artifactType: string;
  status: StepStatus;
  attempts: number;
  signature: string;
  retryable: boolean;
  retryStrategy:
    | "idempotent_replay_same_key"
    | "fix_input_then_retry"
    | "not_applicable";
  artifactId?: string;
  artifactName?: string;
  reason?: string;
  duplicateResolution?: "signature_replay" | "name_reuse" | "none";
}

interface FoundArtifact {
  _id: Id<"objects">;
  type: string;
  name: string;
  status: string;
  matchedBySignature: boolean;
}

type DuplicateStrategy = "reuse_existing" | "fail_on_duplicate";

type EnsureArtifactArgs = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  internal: any;
  organizationId: Id<"organizations">;
  conversationId?: Id<"aiConversations">;
  payloadDigest: string;
  playbook: string;
  experienceKey: string;
  stepKey: string;
  artifactType: string;
  artifactName?: string;
  duplicateStrategy: DuplicateStrategy;
  createArtifact: () => Promise<Id<"objects">>;
};

type EnsureArtifactResult = {
  artifactId?: Id<"objects">;
  artifactName?: string;
  status: StepStatus;
  step: StepLog;
};

function normalizePlaybookName(playbook: string): string {
  return playbook.trim().toLowerCase();
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function buildExperienceKey(args: {
  playbook: string;
  conversationId?: Id<"aiConversations">;
  idempotencyKey?: string;
  payloadDigest: string;
}): string {
  const explicit = args.idempotencyKey?.trim();
  if (explicit) {
    return `${args.playbook}:${explicit}`;
  }

  const conversationPart = args.conversationId || "no-conversation";
  return `${args.playbook}:${conversationPart}:${args.payloadDigest}`;
}

function stepSignature(experienceKey: string, stepKey: string): string {
  return `${experienceKey}:${stepKey}`;
}

async function findArtifact(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  internal: any,
  args: {
    organizationId: Id<"organizations">;
    artifactType: string;
    signature?: string;
    artifactName?: string;
  }
): Promise<FoundArtifact | null> {
  return (await ctx.runQuery(
    internal.ai.tools.internalToolMutations.internalFindOrchestrationArtifact,
    {
      organizationId: args.organizationId,
      artifactType: args.artifactType,
      signature: args.signature,
      name: args.artifactName,
    }
  )) as FoundArtifact | null;
}

async function stampArtifact(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  internal: any,
  args: {
    organizationId: Id<"organizations">;
    objectId: Id<"objects">;
    playbook: string;
    experienceKey: string;
    stepKey: string;
    signature: string;
    payloadDigest: string;
    conversationId?: Id<"aiConversations">;
  }
): Promise<void> {
  await ctx.runMutation(
    internal.ai.tools.internalToolMutations.internalStampOrchestrationMetadata,
    args
  );
}

async function ensureArtifact(args: EnsureArtifactArgs): Promise<EnsureArtifactResult> {
  const signature = stepSignature(args.experienceKey, args.stepKey);
  let attempts = 0;

  attempts += 1;
  const bySignature = await findArtifact(args.ctx, args.internal, {
    organizationId: args.organizationId,
    artifactType: args.artifactType,
    signature,
  });
  if (bySignature) {
    return {
      artifactId: bySignature._id,
      artifactName: bySignature.name,
      status: "reused",
      step: {
        stepKey: args.stepKey,
        artifactType: args.artifactType,
        status: "reused",
        attempts,
        signature,
        retryable: true,
        retryStrategy: "idempotent_replay_same_key",
        artifactId: bySignature._id,
        artifactName: bySignature.name,
        duplicateResolution: "signature_replay",
      },
    };
  }

  if (args.artifactName) {
    attempts += 1;
    const byName = await findArtifact(args.ctx, args.internal, {
      organizationId: args.organizationId,
      artifactType: args.artifactType,
      artifactName: args.artifactName,
    });
    if (byName) {
      if (args.duplicateStrategy === "fail_on_duplicate") {
        return {
          status: "failed",
          step: {
            stepKey: args.stepKey,
            artifactType: args.artifactType,
            status: "failed",
            attempts,
            signature,
            retryable: true,
            retryStrategy: "fix_input_then_retry",
            artifactId: byName._id,
            artifactName: byName.name,
            reason:
              `Duplicate ${args.artifactType} name "${args.artifactName}" found and duplicateStrategy=` +
              `"fail_on_duplicate".`,
            duplicateResolution: "none",
          },
        };
      }

      await stampArtifact(args.ctx, args.internal, {
        organizationId: args.organizationId,
        objectId: byName._id,
        playbook: args.playbook,
        experienceKey: args.experienceKey,
        stepKey: args.stepKey,
        signature,
        payloadDigest: args.payloadDigest,
        conversationId: args.conversationId,
      });

      return {
        artifactId: byName._id,
        artifactName: byName.name,
        status: "reused",
        step: {
          stepKey: args.stepKey,
          artifactType: args.artifactType,
          status: "reused",
          attempts,
          signature,
          retryable: true,
          retryStrategy: "idempotent_replay_same_key",
          artifactId: byName._id,
          artifactName: byName.name,
          duplicateResolution: "name_reuse",
        },
      };
    }
  }

  attempts += 1;
  try {
    const createdId = await args.createArtifact();
    await stampArtifact(args.ctx, args.internal, {
      organizationId: args.organizationId,
      objectId: createdId,
      playbook: args.playbook,
      experienceKey: args.experienceKey,
      stepKey: args.stepKey,
      signature,
      payloadDigest: args.payloadDigest,
      conversationId: args.conversationId,
    });

    return {
      artifactId: createdId,
      artifactName: args.artifactName,
      status: "created",
      step: {
        stepKey: args.stepKey,
        artifactType: args.artifactType,
        status: "created",
        attempts,
        signature,
        retryable: true,
        retryStrategy: "idempotent_replay_same_key",
        artifactId: createdId,
        artifactName: args.artifactName,
        duplicateResolution: "none",
      },
    };
  } catch (error) {
    return {
      status: "failed",
      step: {
        stepKey: args.stepKey,
        artifactType: args.artifactType,
        status: "failed",
        attempts,
        signature,
        retryable: true,
        retryStrategy: "fix_input_then_retry",
        artifactName: args.artifactName,
        reason: error instanceof Error ? error.message : String(error),
        duplicateResolution: "none",
      },
    };
  }
}

/**
 * Core runtime entry point.
 * Executes a supported playbook and returns deterministic artifact bundle + step log.
 */
export const createExperience = internalAction({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    playbook: v.string(),
    conversationId: v.optional(v.id("aiConversations")),
    conversationPayload: v.any(),
    idempotencyKey: v.optional(v.string()),
    options: v.optional(
      v.object({
        duplicateStrategy: v.optional(
          v.union(v.literal("reuse_existing"), v.literal("fail_on_duplicate"))
        ),
        failFast: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const internal = getInternal();
    const playbook = normalizePlaybookName(args.playbook);
    const isSupportedPlaybook = ORCHESTRATION_EXPERIENCE_CONTRACT.playbooks.some(
      (entry) => entry.id === playbook
    );

    if (!isSupportedPlaybook) {
      return {
        success: false,
        error: `Unsupported playbook "${args.playbook}"`,
        supportedPlaybooks: ORCHESTRATION_EXPERIENCE_CONTRACT.playbooks.map(
          (entry) => entry.id
        ),
      };
    }

    if (playbook !== "event") {
      return {
        success: false,
        error: `Playbook "${playbook}" is registered in contract but runtime is not implemented yet.`,
      };
    }

    const derived = deriveEventPlaybookInput(args.conversationPayload);
    const payloadDigest = hashString(stableStringify(args.conversationPayload));
    const experienceKey = buildExperienceKey({
      playbook,
      conversationId: args.conversationId,
      idempotencyKey: args.idempotencyKey,
      payloadDigest,
    });

    const duplicateStrategy =
      args.options?.duplicateStrategy || "reuse_existing";
    const failFast = args.options?.failFast === true;

    const stepLog: StepLog[] = [];

    const eventStep = await ensureArtifact({
      ctx,
      internal,
      organizationId: args.organizationId,
      conversationId: args.conversationId,
      payloadDigest,
      playbook,
      experienceKey,
      stepKey: "event",
      artifactType: "event",
      artifactName: derived.event.title,
      duplicateStrategy,
      createArtifact: async () =>
        (await ctx.runMutation(
          internal.ai.tools.internalToolMutations.internalCreateEventWithDetails,
          {
            organizationId: args.organizationId,
            userId: args.userId,
            subtype: derived.event.eventType,
            name: derived.event.title,
            description: derived.event.description,
            startDate: derived.event.startDate,
            endDate: derived.event.endDate,
            location: derived.event.location,
            capacity: derived.event.capacity,
            timezone: derived.event.timezone,
            published: derived.event.published,
            agenda: derived.event.agenda,
            ticketTypes: derived.event.ticketTypes,
            virtualEventUrl: derived.event.virtualEventUrl,
            registrationRequired: derived.event.registrationRequired,
          }
        )) as Id<"objects">,
    });
    stepLog.push(eventStep.step);

    const blockedByEventFailure =
      !eventStep.artifactId || eventStep.status === "failed";

    const productSteps: EnsureArtifactResult[] = [];
    if (blockedByEventFailure) {
      for (let index = 0; index < derived.products.length; index += 1) {
        const stepKey = `product:${index + 1}`;
        const signature = stepSignature(experienceKey, stepKey);
        productSteps.push({
          status: "skipped",
          step: {
            stepKey,
            artifactType: "product",
            status: "skipped",
            attempts: 1,
            signature,
            retryable: true,
            retryStrategy: "fix_input_then_retry",
            reason: "Blocked because required event step failed.",
            duplicateResolution: "none",
          },
        });
      }
      stepLog.push(...productSteps.map((entry) => entry.step));
    } else {
      for (let index = 0; index < derived.products.length; index += 1) {
        const product = derived.products[index];
        const step = await ensureArtifact({
          ctx,
          internal,
          organizationId: args.organizationId,
          conversationId: args.conversationId,
          payloadDigest,
          playbook,
          experienceKey,
          stepKey: `product:${index + 1}`,
          artifactType: "product",
          artifactName: product.name,
          duplicateStrategy,
          createArtifact: async () =>
            (await ctx.runMutation(
              internal.ai.tools.internalToolMutations.internalCreateProductWithDetails,
              {
                organizationId: args.organizationId,
                userId: args.userId,
                subtype: product.subtype || "ticket",
                name: product.name,
                description: product.description,
                price: product.price,
                currency: product.currency,
                status: "draft",
                ticketTier: product.ticketTier,
                eventId: eventStep.artifactId,
              }
            )) as Id<"objects">,
        });
        productSteps.push(step);
        stepLog.push(step.step);
        if (failFast && step.status === "failed") {
          break;
        }
      }
    }

    const primaryProductIds = productSteps
      .map((step) => step.artifactId)
      .filter((id): id is Id<"objects"> => !!id);

    let formStep: EnsureArtifactResult;
    if (!derived.form) {
      const signature = stepSignature(experienceKey, "form");
      formStep = {
        status: "skipped",
        step: {
          stepKey: "form",
          artifactType: "form",
          status: "skipped",
          attempts: 1,
          signature,
          retryable: false,
          retryStrategy: "not_applicable",
          reason: "Form creation disabled by payload.",
          duplicateResolution: "none",
        },
      };
      stepLog.push(formStep.step);
    } else if (blockedByEventFailure && failFast) {
      const signature = stepSignature(experienceKey, "form");
      formStep = {
        status: "skipped",
        step: {
          stepKey: "form",
          artifactType: "form",
          status: "skipped",
          attempts: 1,
          signature,
          retryable: true,
          retryStrategy: "fix_input_then_retry",
          reason: "Blocked because required event step failed.",
          duplicateResolution: "none",
        },
      };
      stepLog.push(formStep.step);
    } else {
      formStep = await ensureArtifact({
        ctx,
        internal,
        organizationId: args.organizationId,
        conversationId: args.conversationId,
        payloadDigest,
        playbook,
        experienceKey,
        stepKey: "form",
        artifactType: "form",
        artifactName: derived.form.name,
        duplicateStrategy,
        createArtifact: async () =>
          (await ctx.runMutation(
            internal.ai.tools.internalToolMutations.internalCreateForm,
            {
              organizationId: args.organizationId,
              userId: args.userId,
              subtype: "registration",
              name: derived.form!.name,
              description: derived.form!.description,
            }
          )) as Id<"objects">,
      });
      stepLog.push(formStep.step);
    }

    let checkoutStep: EnsureArtifactResult;
    const checkoutBlockedReason =
      blockedByEventFailure
        ? "Blocked because required event step failed."
        : primaryProductIds.length === 0
        ? "Blocked because no product artifacts are available."
        : null;

    if (checkoutBlockedReason) {
      const signature = stepSignature(experienceKey, "checkout");
      checkoutStep = {
        status: "skipped",
        step: {
          stepKey: "checkout",
          artifactType: "checkout_instance",
          status: "skipped",
          attempts: 1,
          signature,
          retryable: true,
          retryStrategy: "fix_input_then_retry",
          reason: checkoutBlockedReason,
          duplicateResolution: "none",
        },
      };
      stepLog.push(checkoutStep.step);
    } else {
      checkoutStep = await ensureArtifact({
        ctx,
        internal,
        organizationId: args.organizationId,
        conversationId: args.conversationId,
        payloadDigest,
        playbook,
        experienceKey,
        stepKey: "checkout",
        artifactType: "checkout_instance",
        artifactName: derived.checkout.name,
        duplicateStrategy,
        createArtifact: async () => {
          const result = (await ctx.runMutation(
            internal.ai.tools.internalToolMutations.internalCreateCheckoutPageWithDetails,
            {
              organizationId: args.organizationId,
              userId: args.userId,
              name: derived.checkout.name,
              description: derived.checkout.description,
              productIds: primaryProductIds,
              formId: formStep.artifactId,
              eventId: eventStep.artifactId,
              paymentMode: derived.checkout.paymentMode,
              paymentProviders: derived.checkout.paymentProviders,
            }
          )) as { checkoutId: Id<"objects"> };
          return result.checkoutId;
        },
      });
      stepLog.push(checkoutStep.step);
    }

    if (derived.checkout.published && checkoutStep.artifactId) {
      const publishSignature = stepSignature(experienceKey, "checkout:publish");
      try {
        await ctx.runMutation(
          internal.ai.tools.internalToolMutations.internalPublishCheckout,
          {
            organizationId: args.organizationId,
            userId: args.userId,
            checkoutId: checkoutStep.artifactId,
          }
        );
        stepLog.push({
          stepKey: "checkout:publish",
          artifactType: "checkout_instance",
          status: "created",
          attempts: 1,
          signature: publishSignature,
          retryable: true,
          retryStrategy: "idempotent_replay_same_key",
          artifactId: checkoutStep.artifactId,
          artifactName: derived.checkout.name,
          reason: "Checkout published because payload requested published=true.",
          duplicateResolution: "none",
        });
      } catch (error) {
        stepLog.push({
          stepKey: "checkout:publish",
          artifactType: "checkout_instance",
          status: "failed",
          attempts: 1,
          signature: publishSignature,
          retryable: true,
          retryStrategy: "fix_input_then_retry",
          artifactId: checkoutStep.artifactId,
          artifactName: derived.checkout.name,
          reason: error instanceof Error ? error.message : String(error),
          duplicateResolution: "none",
        });
      }
    }

    for (let index = 0; index < derived.unsupportedItems.length; index += 1) {
      const item = derived.unsupportedItems[index];
      stepLog.push({
        stepKey: `unsupported:${index + 1}`,
        artifactType: item.type,
        status: "skipped",
        attempts: 1,
        signature: stepSignature(experienceKey, `unsupported:${index + 1}`),
        retryable: false,
        retryStrategy: "not_applicable",
        artifactName: item.name,
        reason: item.reason,
        duplicateResolution: "none",
      });
    }

    const createdCount = stepLog.filter((step) => step.status === "created").length;
    const reusedCount = stepLog.filter((step) => step.status === "reused").length;
    const skippedCount = stepLog.filter((step) => step.status === "skipped").length;
    const failedCount = stepLog.filter((step) => step.status === "failed").length;

    const requiredStepFailures = stepLog.filter(
      (step) =>
        (step.stepKey === "event" ||
          step.stepKey.startsWith("product:") ||
          step.stepKey === "checkout") &&
        step.status === "failed"
    );

    return {
      success: requiredStepFailures.length === 0,
      playbook,
      experienceName: derived.experienceName,
      contractVersion: ORCHESTRATION_EXPERIENCE_CONTRACT.version,
      idempotencyKey: experienceKey,
      payloadDigest,
      artifactBundle: {
        eventId: eventStep.artifactId ?? null,
        productIds: primaryProductIds,
        formId: formStep.artifactId ?? null,
        checkoutId: checkoutStep.artifactId ?? null,
      },
      unsupportedItems: derived.unsupportedItems,
      detectedItemCount: derived.detectedItemCount,
      stepLog,
      summary: {
        created: createdCount,
        reused: reusedCount,
        skipped: skippedCount,
        failed: failedCount,
      },
    };
  },
});
