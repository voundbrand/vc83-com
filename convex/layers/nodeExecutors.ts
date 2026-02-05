/**
 * NODE EXECUTORS
 *
 * Logic node execution handlers for the Layers graph engine.
 * Extracted from graphEngine.ts to keep files under 500 lines.
 *
 * Handles: if_then, filter, split_ab, merge, transform_data,
 * wait_delay, loop_iterator, http_request
 */

import type {
  WorkflowNode,
  ExecutionContext,
  NodeExecutionResult,
} from "./types";
import { evaluateExpression } from "./graphEngine";

// ============================================================================
// PATH RESOLUTION
// ============================================================================

/**
 * Resolve a dot-notation path against a data object.
 * e.g. "contact.email" → data.contact.email
 */
function resolvePath(path: string, data: Record<string, unknown>): unknown {
  const parts = path.split(".");
  let current: unknown = data;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Replace {{variable}} template placeholders in a string with values from data.
 */
function resolveTemplateString(
  template: string,
  data: Record<string, unknown>,
): string {
  return template.replace(/\{\{([\w.]+)\}\}/g, (_, path) => {
    const val = resolvePath(path, data);
    return val !== undefined ? String(val) : "";
  });
}

// ============================================================================
// LOGIC NODE DISPATCHER
// ============================================================================

/**
 * Execute a logic/flow control node.
 * Called by graphEngine when isLogicNode(type) returns true.
 */
export async function executeLogicNode(
  node: WorkflowNode,
  inputData: Record<string, unknown>,
  _context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const startTime = Date.now();

  switch (node.type) {
    case "if_then": {
      const expression = node.config.expression as string;
      if (!expression) {
        return { success: false, error: "No condition expression configured" };
      }
      const result = evaluateExpression(expression, inputData);
      return {
        success: true,
        outputData: inputData,
        activeOutputs: [result ? "true" : "false"],
        durationMs: Date.now() - startTime,
      };
    }

    case "filter": {
      const expression = node.config.expression as string;
      if (!expression) {
        return { success: false, error: "No filter expression configured" };
      }
      const matches = evaluateExpression(expression, inputData);
      return {
        success: true,
        outputData: inputData,
        activeOutputs: [matches ? "match" : "no_match"],
        durationMs: Date.now() - startTime,
      };
    }

    case "split_ab": {
      const percentage = (node.config.splitPercentage as number) ?? 50;
      const random = Math.random() * 100;
      return {
        success: true,
        outputData: { ...inputData, _splitBranch: random < percentage ? "a" : "b" },
        activeOutputs: [random < percentage ? "branch_a" : "branch_b"],
        durationMs: Date.now() - startTime,
      };
    }

    case "merge": {
      return {
        success: true,
        outputData: inputData,
        activeOutputs: ["output"],
        durationMs: Date.now() - startTime,
      };
    }

    case "transform_data": {
      try {
        const transformExpr = node.config.transformExpression;
        return {
          success: true,
          outputData: typeof transformExpr === "object"
            ? { ...inputData, ...(transformExpr as Record<string, unknown>) }
            : inputData,
          activeOutputs: ["output"],
          durationMs: Date.now() - startTime,
        };
      } catch (err) {
        return {
          success: false,
          error: `Transform failed: ${err instanceof Error ? err.message : "Unknown"}`,
          durationMs: Date.now() - startTime,
        };
      }
    }

    case "wait_delay": {
      // In production, this would schedule a Convex delayed function.
      // Deferred to Phase 4 (requires async execution queue).
      return {
        success: true,
        outputData: inputData,
        activeOutputs: ["output"],
        durationMs: Date.now() - startTime,
      };
    }

    case "loop_iterator":
      return executeLoopIterator(node, inputData);

    case "http_request":
      return executeHttpRequest(node, inputData);

    default:
      return {
        success: false,
        error: `Logic node type not yet implemented: ${node.type}`,
        durationMs: Date.now() - startTime,
      };
  }
}

// ============================================================================
// LOOP / ITERATOR NODE
// ============================================================================

/**
 * Iterate over an array field in the input data.
 * Outputs the full array with per-item metadata (batch mode).
 * Downstream nodes receive { items: [{item, index, total}, ...], count }.
 */
function executeLoopIterator(
  node: WorkflowNode,
  inputData: Record<string, unknown>,
): NodeExecutionResult {
  const startTime = Date.now();
  const arrayField = node.config.arrayField as string;
  const maxIterations = (node.config.maxIterations as number) ?? 100;

  if (!arrayField) {
    return {
      success: false,
      error: "No arrayField configured on loop node",
      durationMs: Date.now() - startTime,
    };
  }

  const rawArray = resolvePath(arrayField, inputData);

  if (!Array.isArray(rawArray)) {
    return {
      success: false,
      error: `Field "${arrayField}" is not an array (got ${typeof rawArray})`,
      durationMs: Date.now() - startTime,
    };
  }

  const items = rawArray.slice(0, maxIterations).map((item, index) => ({
    item,
    index,
    total: rawArray.length,
  }));

  return {
    success: true,
    outputData: {
      items,
      count: items.length,
      truncated: rawArray.length > maxIterations,
      originalCount: rawArray.length,
    },
    activeOutputs: ["completed"],
    durationMs: Date.now() - startTime,
  };
}

// ============================================================================
// HTTP REQUEST NODE
// ============================================================================

/**
 * Execute an HTTP request with configurable method, URL, headers, and body.
 * Template variables ({{field}}) in URL/headers/body are resolved against input data.
 * Returns success=true even for non-2xx so downstream nodes can handle status codes.
 */
async function executeHttpRequest(
  node: WorkflowNode,
  inputData: Record<string, unknown>,
): Promise<NodeExecutionResult> {
  const startTime = Date.now();
  const url = node.config.url as string;
  const method = ((node.config.method as string) ?? "GET").toUpperCase();
  const rawHeaders = node.config.headers;
  const rawBody = node.config.body;

  if (!url) {
    return {
      success: false,
      error: "No URL configured on HTTP request node",
      durationMs: Date.now() - startTime,
    };
  }

  // Resolve template variables in URL
  const resolvedUrl = resolveTemplateString(url, inputData);

  // Parse and resolve headers
  let headers: Record<string, string> = {};
  if (typeof rawHeaders === "string") {
    try { headers = JSON.parse(rawHeaders); } catch { /* use empty */ }
  } else if (typeof rawHeaders === "object" && rawHeaders !== null) {
    headers = Object.fromEntries(
      Object.entries(rawHeaders as Record<string, unknown>).map(
        ([k, v]) => [k, String(v)]
      )
    );
  }
  for (const [key, val] of Object.entries(headers)) {
    headers[key] = resolveTemplateString(val, inputData);
  }

  // Parse and resolve body (skip for GET/DELETE)
  let body: string | undefined;
  if (method !== "GET" && method !== "DELETE" && method !== "HEAD") {
    if (typeof rawBody === "string") {
      body = resolveTemplateString(rawBody, inputData);
    } else if (typeof rawBody === "object" && rawBody !== null) {
      body = JSON.stringify(rawBody);
      if (!headers["Content-Type"] && !headers["content-type"]) {
        headers["Content-Type"] = "application/json";
      }
    }
  }

  try {
    const response = await fetch(resolvedUrl, {
      method,
      headers,
      body,
    });

    const contentType = response.headers.get("content-type") ?? "";
    let responseBody: unknown;
    if (contentType.includes("application/json")) {
      try {
        responseBody = await response.json();
      } catch {
        responseBody = await response.text();
      }
    } else {
      responseBody = await response.text();
    }

    return {
      success: true,
      outputData: {
        statusCode: response.status,
        statusText: response.statusText,
        body: responseBody,
        ok: response.ok,
      },
      activeOutputs: ["output"],
      durationMs: Date.now() - startTime,
    };
  } catch (err) {
    return {
      success: false,
      error: `HTTP request failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      retryable: true,
      durationMs: Date.now() - startTime,
    };
  }
}
