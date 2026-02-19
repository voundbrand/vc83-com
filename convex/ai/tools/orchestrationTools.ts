import type { AITool, ToolExecutionContext } from "./registry";

// Lazy-load generated refs to avoid TS2589.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _internalCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  if (!_internalCache) {
    _internalCache = require("../../_generated/api").internal;
  }
  return _internalCache;
}

type CreateExperienceActionResult = {
  success: boolean;
  playbook?: string;
  experienceName?: string;
  idempotencyKey?: string;
  artifactBundle?: {
    eventId?: string | null;
    productIds?: string[];
    formId?: string | null;
    checkoutId?: string | null;
  };
  stepLog?: Array<{
    stepKey: string;
    artifactType: string;
    status: string;
    reason?: string;
  }>;
  summary?: {
    created: number;
    reused: number;
    skipped: number;
    failed: number;
  };
  unsupportedItems?: Array<{
    type: string;
    name?: string;
    reason: string;
  }>;
  error?: string;
};

function summarizeRun(result: CreateExperienceActionResult): string {
  if (result.summary) {
    const { created, reused, skipped, failed } = result.summary;
    return `created=${created}, reused=${reused}, skipped=${skipped}, failed=${failed}`;
  }
  return "No summary available.";
}

export const createExperienceTool: AITool = {
  name: "create_experience",
  description:
    "Run a reusable orchestration runtime against a selected playbook and a single conversation payload. " +
    "Use this for deterministic, idempotent orchestration bundles (event, product, form, checkout). " +
    "Provide an idempotencyKey to safely retry without duplicating artifacts.",
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      playbook: {
        type: "string",
        enum: ["event"],
        description: "Playbook to execute. Event is currently available.",
      },
      conversationPayload: {
        type: "object",
        description:
          "Conversation-derived payload with event, products, form, checkout, and optional builderFiles/pageSchema context.",
      },
      idempotencyKey: {
        type: "string",
        description:
          "Optional stable key for retry-safe orchestration replays.",
      },
      options: {
        type: "object",
        properties: {
          duplicateStrategy: {
            type: "string",
            enum: ["reuse_existing", "fail_on_duplicate"],
            description:
              "Duplicate handling. reuse_existing (default) reuses same-name artifacts; fail_on_duplicate returns a failure step.",
          },
          failFast: {
            type: "boolean",
            description:
              "If true, stop dependent orchestration steps earlier after a required failure.",
          },
        },
      },
    },
    required: ["playbook", "conversationPayload"],
  },
  execute: async (
    ctx: ToolExecutionContext,
    args: {
      playbook: string;
      conversationPayload: Record<string, unknown>;
      idempotencyKey?: string;
      options?: {
        duplicateStrategy?: "reuse_existing" | "fail_on_duplicate";
        failFast?: boolean;
      };
    }
  ) => {
    const internal = getInternal();
    const result = (await ctx.runAction(
      internal.ai.tools.orchestrationRuntimeActions.createExperience,
      {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        conversationId: ctx.conversationId,
        playbook: args.playbook,
        conversationPayload: args.conversationPayload,
        idempotencyKey: args.idempotencyKey,
        options: args.options,
      }
    )) as CreateExperienceActionResult;

    return {
      ...result,
      message: result.success
        ? `Experience orchestration finished (${summarizeRun(result)}).`
        : `Experience orchestration did not complete (${summarizeRun(result)}).`,
    };
  },
};

export const createEventExperienceTool: AITool = {
  name: "create_event_experience",
  description:
    "Convenience wrapper for the event playbook. " +
    "Creates or reuses event + ticket product(s) + optional form + checkout in one idempotent orchestration run.",
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      experienceName: {
        type: "string",
        description: "Label for the orchestration run and generated artifacts.",
      },
      summary: {
        type: "string",
        description: "Conversation summary for context.",
      },
      event: {
        type: "object",
        description: "Event details (title/start/end/location/etc.).",
      },
      products: {
        type: "array",
        description: "Optional product/ticket drafts for checkout.",
        items: { type: "object" },
      },
      form: {
        type: "object",
        description: "Optional registration form draft. Set includeForm=false to skip.",
      },
      includeForm: {
        type: "boolean",
        description: "Whether to create/reuse a form (default true).",
      },
      checkout: {
        type: "object",
        description: "Optional checkout settings (name/paymentMode/providers).",
      },
      pageSchema: {
        type: "object",
        description:
          "Optional page schema used to infer playbook hints from builder content.",
      },
      builderFiles: {
        type: "array",
        description:
          "Optional builder files (`path` + `content`) for detection-driven hints and safe unsupported-item reporting.",
        items: {
          type: "object",
          properties: {
            path: { type: "string" },
            content: { type: "string" },
          },
          required: ["path", "content"],
        },
      },
      idempotencyKey: {
        type: "string",
        description: "Optional retry-safe key for duplicate-safe orchestration replay.",
      },
      duplicateStrategy: {
        type: "string",
        enum: ["reuse_existing", "fail_on_duplicate"],
        description:
          "Duplicate handling for same-name artifacts. Defaults to reuse_existing.",
      },
      failFast: {
        type: "boolean",
        description:
          "Stop dependent steps early when required steps fail.",
      },
    },
  },
  execute: async (
    ctx: ToolExecutionContext,
    args: {
      experienceName?: string;
      summary?: string;
      event?: Record<string, unknown>;
      products?: unknown[];
      form?: Record<string, unknown> | boolean;
      includeForm?: boolean;
      checkout?: Record<string, unknown>;
      pageSchema?: Record<string, unknown>;
      builderFiles?: Array<{ path: string; content: string }>;
      idempotencyKey?: string;
      duplicateStrategy?: "reuse_existing" | "fail_on_duplicate";
      failFast?: boolean;
    }
  ) => {
    const payload: Record<string, unknown> = {
      experienceName: args.experienceName,
      summary: args.summary,
      event: args.event,
      products: args.products,
      form: args.form,
      includeForm: args.includeForm,
      checkout: args.checkout,
      pageSchema: args.pageSchema,
      builderFiles: args.builderFiles,
    };

    const internal = getInternal();
    const result = (await ctx.runAction(
      internal.ai.tools.orchestrationRuntimeActions.createExperience,
      {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        conversationId: ctx.conversationId,
        playbook: "event",
        conversationPayload: payload,
        idempotencyKey: args.idempotencyKey,
        options: {
          duplicateStrategy: args.duplicateStrategy,
          failFast: args.failFast,
        },
      }
    )) as CreateExperienceActionResult;

    return {
      ...result,
      playbook: "event",
      message: result.success
        ? `Event experience orchestration finished (${summarizeRun(result)}).`
        : `Event experience orchestration did not complete (${summarizeRun(result)}).`,
    };
  },
};
