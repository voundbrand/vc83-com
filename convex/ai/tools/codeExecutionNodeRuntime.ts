"use node";

import { createHash } from "node:crypto";
import { Script, createContext } from "node:vm";
import { internalAction } from "../../_generated/server";
import { v } from "convex/values";

const MAX_RESULT_BYTES = 16_384;

function serializeExecutionResult(value: unknown): {
  result: unknown;
  resultBytes: number;
  resultTruncated: boolean;
} {
  const serialized = JSON.stringify(value);
  if (typeof serialized !== "string") {
    return {
      result: null,
      resultBytes: 0,
      resultTruncated: false,
    };
  }

  const resultBytes = Buffer.byteLength(serialized, "utf8");
  if (resultBytes <= MAX_RESULT_BYTES) {
    return {
      result: value,
      resultBytes,
      resultTruncated: false,
    };
  }

  return {
    result: {
      truncated: true,
      preview: serialized.slice(0, MAX_RESULT_BYTES),
      originalBytes: resultBytes,
    },
    resultBytes,
    resultTruncated: true,
  };
}

export const computeSourceFingerprint = internalAction({
  args: {
    sourceCode: v.string(),
  },
  handler: async (_ctx, args) => ({
    sourceHash: createHash("sha256").update(args.sourceCode).digest("hex"),
    sourceBytes: Buffer.byteLength(args.sourceCode, "utf8"),
  }),
});

export const executeSandboxedJavaScript = internalAction({
  args: {
    sourceCode: v.string(),
    input: v.optional(v.any()),
    timeoutMs: v.number(),
  },
  handler: async (_ctx, args) => {
    const sandboxContext = createContext(
      {
        input: args.input,
        Math,
        JSON,
        Number,
        String,
        Boolean,
        Array,
        Object,
        Date,
      },
      {
        codeGeneration: {
          strings: false,
          wasm: false,
        },
        name: "ai-code-exec-sandbox",
      },
    );

    const wrappedSource = `
"use strict";
(() => {
${args.sourceCode}
})();
`;

    const script = new Script(wrappedSource, {
      filename: "ai-code-exec.js",
    });

    const result = script.runInContext(sandboxContext, {
      timeout: args.timeoutMs,
    });

    return serializeExecutionResult(result);
  },
});
