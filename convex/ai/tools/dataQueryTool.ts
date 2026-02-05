/**
 * DATA QUERY TOOL
 *
 * Lets AI agents and users query organization data via natural language.
 * Supports all ontology types: contacts, bookings, products, invoices, events, etc.
 *
 * Security: ALL queries scoped by organizationId. No cross-tenant access possible.
 */

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";

/**
 * Tool definition in OpenAI function calling format
 */
export const dataQueryToolDefinition = {
  type: "function" as const,
  function: {
    name: "query_org_data",
    description: `Query your organization's data across all domains. Use this to answer questions like:
- "How many contacts do I have?"
- "List active bookings for next week"
- "What products are published?"
- "Show invoices from January"
- "Count leads added this month"

Supports: crm_contact, crm_organization, booking, product, form, form_submission, event, invoice, ticket, transaction, workflow, sequence, webinar, org_agent`,
    parameters: {
      type: "object" as const,
      properties: {
        objectType: {
          type: "string",
          description: "Type of object to query",
          enum: [
            "crm_contact", "crm_organization", "booking", "product",
            "form", "form_submission", "event", "invoice", "ticket",
            "transaction", "workflow", "sequence", "webinar", "org_agent"
          ],
        },
        filters: {
          type: "array",
          description: "Filters to apply. Use 'status' for status, 'subtype' for subtype, 'name' for name search, 'createdAfter'/'createdBefore' for date ranges, or 'prop.fieldName' for customProperties fields.",
          items: {
            type: "object",
            properties: {
              field: {
                type: "string",
                description: "Field to filter on: 'status', 'subtype', 'name', 'createdAfter', 'createdBefore', or 'prop.fieldName' for customProperties",
              },
              op: {
                type: "string",
                enum: ["eq", "neq", "gt", "gte", "lt", "lte", "contains"],
                description: "Comparison operator",
              },
              value: {
                type: "string",
                description: "Value to compare. For dates, use ISO string or unix timestamp.",
              },
            },
            required: ["field", "op", "value"],
          },
        },
        aggregate: {
          type: "object",
          description: "Optional aggregation instead of listing results",
          properties: {
            type: {
              type: "string",
              enum: ["count", "sum", "avg", "min", "max"],
            },
            field: {
              type: "string",
              description: "Field to aggregate (for sum/avg/min/max). Use 'prop.fieldName' for customProperties.",
            },
          },
          required: ["type"],
        },
        sortBy: {
          type: "string",
          description: "Field to sort by (default: createdAt). Options: 'name', 'createdAt', 'updatedAt', 'status'.",
        },
        sortOrder: {
          type: "string",
          enum: ["asc", "desc"],
          description: "Sort direction (default: desc)",
        },
        limit: {
          type: "number",
          description: "Max results to return (default: 20, max: 100)",
        },
      },
      required: ["objectType"],
    },
  },
};

// Types for filters
interface QueryFilter {
  field: string;
  op: string;
  value: string;
}

interface AggregateConfig {
  type: "count" | "sum" | "avg" | "min" | "max";
  field?: string;
}

/**
 * Execute data query action
 */
export const executeDataQuery = action({
  args: {
    organizationId: v.id("organizations"),
    objectType: v.string(),
    filters: v.optional(v.array(v.object({
      field: v.string(),
      op: v.string(),
      value: v.string(),
    }))),
    aggregate: v.optional(v.object({
      type: v.string(),
      field: v.optional(v.string()),
    })),
    sortBy: v.optional(v.string()),
    sortOrder: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Fetch objects from DB (scoped by org + type)
    const rawResults = await ctx.runQuery(
      internal.ai.tools.dataQueryInternal.queryObjects,
      {
        organizationId: args.organizationId,
        objectType: args.objectType,
      }
    );

    let results = rawResults as Array<Record<string, unknown>>;

    // Apply filters in memory
    if (args.filters && args.filters.length > 0) {
      results = applyFilters(results, args.filters);
    }

    // Sort
    const sortField = args.sortBy || "createdAt";
    const sortDir = args.sortOrder === "asc" ? 1 : -1;
    results.sort((a, b) => {
      const aVal = getFieldValue(a, sortField) as string | number;
      const bVal = getFieldValue(b, sortField) as string | number;
      if (aVal < bVal) return -1 * sortDir;
      if (aVal > bVal) return 1 * sortDir;
      return 0;
    });

    // Handle aggregation
    if (args.aggregate) {
      return computeAggregate(results, args.aggregate as AggregateConfig);
    }

    // Limit results
    const limit = Math.min(args.limit || 20, 100);
    const limited = results.slice(0, limit);

    // Format for LLM consumption
    const formatted = limited.map((obj) => ({
      id: obj._id,
      name: obj.name,
      status: obj.status,
      subtype: obj.subtype,
      createdAt: obj.createdAt ? new Date(obj.createdAt as number).toISOString() : null,
      updatedAt: obj.updatedAt ? new Date(obj.updatedAt as number).toISOString() : null,
      properties: obj.customProperties || {},
    }));

    return {
      objectType: args.objectType,
      totalCount: results.length,
      returnedCount: formatted.length,
      results: formatted,
      hasMore: results.length > limit,
    };
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getFieldValue(obj: Record<string, unknown>, field: string): unknown {
  if (field.startsWith("prop.")) {
    const propKey = field.slice(5);
    const props = obj.customProperties as Record<string, unknown> | undefined;
    return props?.[propKey];
  }
  return obj[field];
}

function applyFilters(
  results: Array<Record<string, unknown>>,
  filters: QueryFilter[]
): Array<Record<string, unknown>> {
  return results.filter((obj) => {
    return filters.every((filter) => {
      // Special date filters
      if (filter.field === "createdAfter") {
        const ts = parseTimestamp(filter.value);
        return (obj.createdAt as number) >= ts;
      }
      if (filter.field === "createdBefore") {
        const ts = parseTimestamp(filter.value);
        return (obj.createdAt as number) <= ts;
      }

      const value = getFieldValue(obj, filter.field);
      const filterVal = filter.value;

      switch (filter.op) {
        case "eq":
          return String(value) === filterVal;
        case "neq":
          return String(value) !== filterVal;
        case "gt":
          return Number(value) > Number(filterVal);
        case "gte":
          return Number(value) >= Number(filterVal);
        case "lt":
          return Number(value) < Number(filterVal);
        case "lte":
          return Number(value) <= Number(filterVal);
        case "contains":
          return String(value).toLowerCase().includes(filterVal.toLowerCase());
        default:
          return true;
      }
    });
  });
}

function parseTimestamp(value: string): number {
  const num = Number(value);
  if (!isNaN(num) && num > 1000000000000) return num; // Already unix ms
  if (!isNaN(num) && num > 1000000000) return num * 1000; // Unix seconds
  return new Date(value).getTime(); // ISO string
}

function computeAggregate(
  results: Array<Record<string, unknown>>,
  aggregate: AggregateConfig
): Record<string, unknown> {
  if (aggregate.type === "count") {
    return {
      aggregation: "count",
      value: results.length,
    };
  }

  if (!aggregate.field) {
    return { error: "Field required for sum/avg/min/max aggregation" };
  }

  const values = results
    .map((obj) => Number(getFieldValue(obj, aggregate.field!)))
    .filter((v) => !isNaN(v));

  if (values.length === 0) {
    return { aggregation: aggregate.type, value: 0, sampleSize: 0 };
  }

  switch (aggregate.type) {
    case "sum":
      return { aggregation: "sum", field: aggregate.field, value: values.reduce((a, b) => a + b, 0), sampleSize: values.length };
    case "avg":
      return { aggregation: "avg", field: aggregate.field, value: values.reduce((a, b) => a + b, 0) / values.length, sampleSize: values.length };
    case "min":
      return { aggregation: "min", field: aggregate.field, value: Math.min(...values), sampleSize: values.length };
    case "max":
      return { aggregation: "max", field: aggregate.field, value: Math.max(...values), sampleSize: values.length };
    default:
      return { error: `Unknown aggregation type: ${aggregate.type}` };
  }
}
