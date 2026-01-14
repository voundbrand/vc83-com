/**
 * APP MANIFEST SCHEMA
 *
 * Defines the schema for CLI application manifests that declare
 * routes, capabilities, and integration points with L4YERCAK3.
 *
 * This schema is used by:
 * 1. CLI tool to generate manifest during `l4yercak3 init`
 * 2. Backend to validate and store application configurations
 * 3. MCP servers to understand available routes/capabilities
 *
 * @version 1.0.0
 */

import { v, Validator } from "convex/values";
import type { Id } from "../../_generated/dataModel";

// ============================================================================
// ROUTE DECLARATIONS
// ============================================================================

/**
 * HTTP Method types supported
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";

/**
 * Route parameter definition
 */
export const routeParameterValidator = v.object({
  name: v.string(),                    // Parameter name (e.g., "id", "slug")
  type: v.union(
    v.literal("string"),
    v.literal("number"),
    v.literal("uuid"),
    v.literal("slug")
  ),
  required: v.boolean(),
  description: v.optional(v.string()),
  pattern: v.optional(v.string()),     // Regex pattern for validation
  example: v.optional(v.string()),
});

/**
 * Query parameter definition
 */
export const queryParameterValidator = v.object({
  name: v.string(),
  type: v.union(
    v.literal("string"),
    v.literal("number"),
    v.literal("boolean"),
    v.literal("array")
  ),
  required: v.boolean(),
  description: v.optional(v.string()),
  default: v.optional(v.any()),
  enum: v.optional(v.array(v.string())),  // Allowed values
});

/**
 * Request body schema (simplified JSON Schema reference)
 */
export const requestBodyValidator = v.object({
  contentType: v.union(
    v.literal("application/json"),
    v.literal("multipart/form-data"),
    v.literal("application/x-www-form-urlencoded")
  ),
  required: v.boolean(),
  schema: v.optional(v.string()),      // JSON Schema reference or inline
  example: v.optional(v.any()),
});

/**
 * Response definition
 */
export const responseValidator = v.object({
  statusCode: v.number(),
  description: v.string(),
  contentType: v.optional(v.string()),
  schema: v.optional(v.string()),
  example: v.optional(v.any()),
});

/**
 * Single route declaration
 */
export const routeDeclarationValidator = v.object({
  // Route identification
  path: v.string(),                    // e.g., "/api/contacts/:id"
  method: v.union(
    v.literal("GET"),
    v.literal("POST"),
    v.literal("PUT"),
    v.literal("PATCH"),
    v.literal("DELETE"),
    v.literal("OPTIONS")
  ),

  // Route metadata
  operationId: v.string(),             // Unique operation identifier
  summary: v.string(),                 // Short description
  description: v.optional(v.string()), // Detailed description
  tags: v.array(v.string()),           // Grouping tags

  // Parameters
  pathParams: v.optional(v.array(routeParameterValidator)),
  queryParams: v.optional(v.array(queryParameterValidator)),
  requestBody: v.optional(requestBodyValidator),

  // Responses
  responses: v.array(responseValidator),

  // L4YERCAK3 integration
  layercakeFeature: v.optional(v.string()),  // Which L4YERCAK3 feature this maps to
  layercakeScope: v.optional(v.string()),    // Required scope (e.g., "crm:read")
  syncDirection: v.optional(v.union(
    v.literal("push"),
    v.literal("pull"),
    v.literal("bidirectional"),
    v.literal("none")
  )),

  // Security
  authentication: v.union(
    v.literal("none"),
    v.literal("api_key"),
    v.literal("oauth"),
    v.literal("session")
  ),
  rateLimit: v.optional(v.object({
    requests: v.number(),
    windowMs: v.number(),
  })),
});

// ============================================================================
// FEATURE CAPABILITIES
// ============================================================================

/**
 * L4YERCAK3 features that can be integrated
 */
export const layercakeFeatures = [
  "crm",           // Customer relationship management
  "events",        // Event management
  "tickets",       // Ticketing system
  "products",      // Product catalog
  "checkout",      // Payment processing
  "forms",         // Form builder
  "publishing",    // Web publishing
  "certificates",  // Certificate generation
  "projects",      // Project management
  "workflows",     // Automation workflows
  "ai",            // AI assistant integration
  "oauth",         // OAuth connections
  "benefits",      // Benefits & commissions
  "invoicing",     // Invoice management
  "analytics",     // Usage analytics
  "storage",       // File storage
  "email",         // Email campaigns
] as const;

export type LayercakeFeature = typeof layercakeFeatures[number];

/**
 * Feature capability declaration
 */
export const featureCapabilityValidator = v.object({
  feature: v.string(),                 // L4YERCAK3 feature name
  enabled: v.boolean(),
  operations: v.array(v.union(
    v.literal("read"),
    v.literal("write"),
    v.literal("delete"),
    v.literal("admin")
  )),

  // Sync configuration
  sync: v.optional(v.object({
    enabled: v.boolean(),
    direction: v.union(
      v.literal("push"),
      v.literal("pull"),
      v.literal("bidirectional")
    ),
    schedule: v.optional(v.union(
      v.literal("realtime"),
      v.literal("hourly"),
      v.literal("daily"),
      v.literal("manual")
    )),
    conflictResolution: v.optional(v.union(
      v.literal("local_wins"),
      v.literal("remote_wins"),
      v.literal("newest_wins"),
      v.literal("manual")
    )),
  })),

  // Webhooks this feature will receive
  webhooks: v.optional(v.array(v.object({
    event: v.string(),                 // e.g., "contact.created", "order.completed"
    url: v.string(),                   // Webhook endpoint URL
    secret: v.optional(v.string()),    // Signing secret (hashed)
  }))),

  // Model mappings for this feature
  modelMappings: v.optional(v.array(v.object({
    localModel: v.string(),            // Local app model name
    layercakeType: v.string(),         // L4YERCAK3 object type
    fieldMappings: v.array(v.object({
      localField: v.string(),
      layercakeField: v.string(),
      transform: v.optional(v.string()),  // Transform function name
      bidirectional: v.boolean(),
    })),
  }))),
});

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

/**
 * Environment-specific configuration
 */
export const environmentConfigValidator = v.object({
  name: v.union(
    v.literal("development"),
    v.literal("staging"),
    v.literal("production")
  ),
  baseUrl: v.string(),                 // App's base URL
  apiUrl: v.optional(v.string()),      // API base URL if different
  webhookUrl: v.optional(v.string()),  // Webhook receiver URL

  // L4YERCAK3 connection
  layercakeUrl: v.string(),            // L4YERCAK3 backend URL
  organizationId: v.optional(v.string()),

  // Feature flags
  features: v.optional(v.record(v.string(), v.boolean())),
});

// ============================================================================
// FULL APP MANIFEST
// ============================================================================

/**
 * Complete application manifest schema
 *
 * This is stored in the application's customProperties.manifest field
 * and in the local l4yercak3.manifest.json file
 */
export const appManifestValidator = v.object({
  // Manifest metadata
  $schema: v.optional(v.string()),     // JSON Schema reference
  version: v.string(),                 // Manifest schema version (e.g., "1.0.0")
  generatedAt: v.number(),             // Timestamp when generated
  generatedBy: v.string(),             // CLI version that generated this

  // Application identity
  application: v.object({
    id: v.optional(v.string()),        // L4YERCAK3 application ID (after registration)
    name: v.string(),
    description: v.optional(v.string()),
    version: v.string(),               // App version
    homepage: v.optional(v.string()),
    repository: v.optional(v.string()),
  }),

  // Framework information
  framework: v.object({
    name: v.string(),                  // "nextjs", "remix", "astro", etc.
    version: v.string(),
    language: v.union(v.literal("typescript"), v.literal("javascript")),
    routerType: v.optional(v.string()),  // "app", "pages", etc.
  }),

  // Route declarations
  routes: v.array(routeDeclarationValidator),

  // Feature capabilities
  features: v.array(featureCapabilityValidator),

  // Environment configurations
  environments: v.array(environmentConfigValidator),

  // API documentation
  openapi: v.optional(v.object({
    version: v.string(),
    info: v.object({
      title: v.string(),
      version: v.string(),
      description: v.optional(v.string()),
    }),
    servers: v.array(v.object({
      url: v.string(),
      description: v.optional(v.string()),
    })),
  })),

  // Security configuration
  security: v.optional(v.object({
    cors: v.optional(v.object({
      allowedOrigins: v.array(v.string()),
      allowedMethods: v.array(v.string()),
      allowedHeaders: v.array(v.string()),
      maxAge: v.optional(v.number()),
    })),
    rateLimit: v.optional(v.object({
      enabled: v.boolean(),
      defaultLimit: v.number(),
      windowMs: v.number(),
    })),
    authentication: v.object({
      methods: v.array(v.union(
        v.literal("api_key"),
        v.literal("oauth"),
        v.literal("session"),
        v.literal("jwt")
      )),
      apiKeyHeader: v.optional(v.string()),
      oauthScopes: v.optional(v.array(v.string())),
    }),
  })),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * TypeScript types derived from validators
 */
export type RouteParameter = {
  name: string;
  type: "string" | "number" | "uuid" | "slug";
  required: boolean;
  description?: string;
  pattern?: string;
  example?: string;
};

export type QueryParameter = {
  name: string;
  type: "string" | "number" | "boolean" | "array";
  required: boolean;
  description?: string;
  default?: unknown;
  enum?: string[];
};

export type RequestBody = {
  contentType: "application/json" | "multipart/form-data" | "application/x-www-form-urlencoded";
  required: boolean;
  schema?: string;
  example?: unknown;
};

export type ResponseDefinition = {
  statusCode: number;
  description: string;
  contentType?: string;
  schema?: string;
  example?: unknown;
};

export type RouteDeclaration = {
  path: string;
  method: HttpMethod;
  operationId: string;
  summary: string;
  description?: string;
  tags: string[];
  pathParams?: RouteParameter[];
  queryParams?: QueryParameter[];
  requestBody?: RequestBody;
  responses: ResponseDefinition[];
  layercakeFeature?: string;
  layercakeScope?: string;
  syncDirection?: "push" | "pull" | "bidirectional" | "none";
  authentication: "none" | "api_key" | "oauth" | "session";
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
};

export type FeatureCapability = {
  feature: string;
  enabled: boolean;
  operations: Array<"read" | "write" | "delete" | "admin">;
  sync?: {
    enabled: boolean;
    direction: "push" | "pull" | "bidirectional";
    schedule?: "realtime" | "hourly" | "daily" | "manual";
    conflictResolution?: "local_wins" | "remote_wins" | "newest_wins" | "manual";
  };
  webhooks?: Array<{
    event: string;
    url: string;
    secret?: string;
  }>;
  modelMappings?: Array<{
    localModel: string;
    layercakeType: string;
    fieldMappings: Array<{
      localField: string;
      layercakeField: string;
      transform?: string;
      bidirectional: boolean;
    }>;
  }>;
};

export type EnvironmentConfig = {
  name: "development" | "staging" | "production";
  baseUrl: string;
  apiUrl?: string;
  webhookUrl?: string;
  layercakeUrl: string;
  organizationId?: string;
  features?: Record<string, boolean>;
};

export type AppManifest = {
  $schema?: string;
  version: string;
  generatedAt: number;
  generatedBy: string;
  application: {
    id?: string;
    name: string;
    description?: string;
    version: string;
    homepage?: string;
    repository?: string;
  };
  framework: {
    name: string;
    version: string;
    language: "typescript" | "javascript";
    routerType?: string;
  };
  routes: RouteDeclaration[];
  features: FeatureCapability[];
  environments: EnvironmentConfig[];
  openapi?: {
    version: string;
    info: {
      title: string;
      version: string;
      description?: string;
    };
    servers: Array<{
      url: string;
      description?: string;
    }>;
  };
  security?: {
    cors?: {
      allowedOrigins: string[];
      allowedMethods: string[];
      allowedHeaders: string[];
      maxAge?: number;
    };
    rateLimit?: {
      enabled: boolean;
      defaultLimit: number;
      windowMs: number;
    };
    authentication: {
      methods: Array<"api_key" | "oauth" | "session" | "jwt">;
      apiKeyHeader?: string;
      oauthScopes?: string[];
    };
  };
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a minimal manifest for new applications
 */
export function createMinimalManifest(options: {
  name: string;
  framework: string;
  frameworkVersion: string;
  language: "typescript" | "javascript";
  features: string[];
  layercakeUrl: string;
}): AppManifest {
  return {
    version: "1.0.0",
    generatedAt: Date.now(),
    generatedBy: "l4yercak3-cli",
    application: {
      name: options.name,
      version: "0.1.0",
    },
    framework: {
      name: options.framework,
      version: options.frameworkVersion,
      language: options.language,
    },
    routes: [],
    features: options.features.map((feature) => ({
      feature,
      enabled: true,
      operations: ["read", "write"] as const,
    })),
    environments: [
      {
        name: "development",
        baseUrl: "http://localhost:3000",
        layercakeUrl: options.layercakeUrl,
      },
    ],
  };
}

/**
 * Validate a manifest object
 */
export function validateManifest(manifest: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!manifest || typeof manifest !== "object") {
    return { valid: false, errors: ["Manifest must be an object"] };
  }

  const m = manifest as Record<string, unknown>;

  // Required fields
  if (!m.version) errors.push("Missing required field: version");
  if (!m.application) errors.push("Missing required field: application");
  if (!m.framework) errors.push("Missing required field: framework");
  if (!m.routes) errors.push("Missing required field: routes");
  if (!m.features) errors.push("Missing required field: features");
  if (!m.environments) errors.push("Missing required field: environments");

  // Validate application
  if (m.application && typeof m.application === "object") {
    const app = m.application as Record<string, unknown>;
    if (!app.name) errors.push("Missing required field: application.name");
    if (!app.version) errors.push("Missing required field: application.version");
  }

  // Validate framework
  if (m.framework && typeof m.framework === "object") {
    const fw = m.framework as Record<string, unknown>;
    if (!fw.name) errors.push("Missing required field: framework.name");
    if (!fw.version) errors.push("Missing required field: framework.version");
    if (!fw.language) errors.push("Missing required field: framework.language");
  }

  // Validate routes
  if (Array.isArray(m.routes)) {
    m.routes.forEach((route, index) => {
      if (typeof route !== "object" || !route) {
        errors.push(`routes[${index}] must be an object`);
        return;
      }
      const r = route as Record<string, unknown>;
      if (!r.path) errors.push(`routes[${index}].path is required`);
      if (!r.method) errors.push(`routes[${index}].method is required`);
      if (!r.operationId) errors.push(`routes[${index}].operationId is required`);
      if (!r.summary) errors.push(`routes[${index}].summary is required`);
    });
  }

  // Validate features
  if (Array.isArray(m.features)) {
    m.features.forEach((feat, index) => {
      if (typeof feat !== "object" || !feat) {
        errors.push(`features[${index}] must be an object`);
        return;
      }
      const f = feat as Record<string, unknown>;
      if (!f.feature) errors.push(`features[${index}].feature is required`);
      if (typeof f.enabled !== "boolean") errors.push(`features[${index}].enabled must be a boolean`);
    });
  }

  // Validate environments
  if (Array.isArray(m.environments)) {
    m.environments.forEach((env, index) => {
      if (typeof env !== "object" || !env) {
        errors.push(`environments[${index}] must be an object`);
        return;
      }
      const e = env as Record<string, unknown>;
      if (!e.name) errors.push(`environments[${index}].name is required`);
      if (!e.baseUrl) errors.push(`environments[${index}].baseUrl is required`);
      if (!e.layercakeUrl) errors.push(`environments[${index}].layercakeUrl is required`);
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate OpenAPI spec from manifest routes
 */
export function generateOpenApiFromManifest(manifest: AppManifest): object {
  const paths: Record<string, Record<string, object>> = {};

  for (const route of manifest.routes) {
    // Convert Express-style params to OpenAPI style
    const openApiPath = route.path.replace(/:(\w+)/g, "{$1}");

    if (!paths[openApiPath]) {
      paths[openApiPath] = {};
    }

    const operation: Record<string, unknown> = {
      operationId: route.operationId,
      summary: route.summary,
      description: route.description,
      tags: route.tags,
      responses: {},
    };

    // Add parameters
    const parameters: object[] = [];

    if (route.pathParams) {
      for (const param of route.pathParams) {
        parameters.push({
          name: param.name,
          in: "path",
          required: param.required,
          description: param.description,
          schema: { type: param.type === "uuid" ? "string" : param.type },
          example: param.example,
        });
      }
    }

    if (route.queryParams) {
      for (const param of route.queryParams) {
        parameters.push({
          name: param.name,
          in: "query",
          required: param.required,
          description: param.description,
          schema: {
            type: param.type,
            default: param.default,
            enum: param.enum,
          },
        });
      }
    }

    if (parameters.length > 0) {
      operation.parameters = parameters;
    }

    // Add request body
    if (route.requestBody) {
      operation.requestBody = {
        required: route.requestBody.required,
        content: {
          [route.requestBody.contentType]: {
            schema: route.requestBody.schema,
            example: route.requestBody.example,
          },
        },
      };
    }

    // Add responses
    for (const response of route.responses) {
      (operation.responses as Record<string, object>)[response.statusCode.toString()] = {
        description: response.description,
        content: response.contentType
          ? {
              [response.contentType]: {
                schema: response.schema,
                example: response.example,
              },
            }
          : undefined,
      };
    }

    // Add security
    if (route.authentication !== "none") {
      operation.security = [
        route.authentication === "api_key"
          ? { apiKey: [] }
          : route.authentication === "oauth"
          ? { oauth: route.layercakeScope ? [route.layercakeScope] : [] }
          : { session: [] },
      ];
    }

    paths[openApiPath][route.method.toLowerCase()] = operation;
  }

  return {
    openapi: manifest.openapi?.version || "3.0.0",
    info: manifest.openapi?.info || {
      title: manifest.application.name,
      version: manifest.application.version,
      description: manifest.application.description,
    },
    servers: manifest.openapi?.servers ||
      manifest.environments.map((env) => ({
        url: env.apiUrl || env.baseUrl,
        description: `${env.name} environment`,
      })),
    paths,
    components: {
      securitySchemes: {
        apiKey: {
          type: "apiKey",
          in: "header",
          name: manifest.security?.authentication.apiKeyHeader || "X-API-Key",
        },
        oauth: {
          type: "oauth2",
          flows: {
            authorizationCode: {
              authorizationUrl: "/oauth/authorize",
              tokenUrl: "/oauth/token",
              scopes: Object.fromEntries(
                (manifest.security?.authentication.oauthScopes || []).map((s) => [s, s])
              ),
            },
          },
        },
        session: {
          type: "apiKey",
          in: "header",
          name: "X-Session-Id",
        },
      },
    },
  };
}

// ============================================================================
// L4YERCAK3 API ROUTES REFERENCE
// ============================================================================

/**
 * Reference of all available L4YERCAK3 API routes
 * This is used by the CLI to help users understand what they can integrate with
 */
export const layercakeApiRoutes = {
  // CRM
  crm: {
    contacts: {
      list: { method: "GET", path: "/api/v1/crm/contacts", scope: "crm:read" },
      get: { method: "GET", path: "/api/v1/crm/contacts/:id", scope: "crm:read" },
      create: { method: "POST", path: "/api/v1/crm/contacts", scope: "crm:write" },
      update: { method: "PATCH", path: "/api/v1/crm/contacts/:id", scope: "crm:write" },
      delete: { method: "DELETE", path: "/api/v1/crm/contacts/:id", scope: "crm:write" },
    },
    organizations: {
      list: { method: "GET", path: "/api/v1/crm/organizations", scope: "crm:read" },
      get: { method: "GET", path: "/api/v1/crm/organizations/:id", scope: "crm:read" },
      create: { method: "POST", path: "/api/v1/crm/organizations", scope: "crm:write" },
      update: { method: "PATCH", path: "/api/v1/crm/organizations/:id", scope: "crm:write" },
    },
  },

  // Events
  events: {
    list: { method: "GET", path: "/api/v1/events", scope: "events:read" },
    get: { method: "GET", path: "/api/v1/events/:id", scope: "events:read" },
    create: { method: "POST", path: "/api/v1/events", scope: "events:write" },
    update: { method: "PATCH", path: "/api/v1/events/:id", scope: "events:write" },
    delete: { method: "DELETE", path: "/api/v1/events/:id", scope: "events:write" },
    publish: { method: "POST", path: "/api/v1/events/:id/publish", scope: "events:write" },
  },

  // Products
  products: {
    list: { method: "GET", path: "/api/v1/products", scope: "products:read" },
    get: { method: "GET", path: "/api/v1/products/:id", scope: "products:read" },
    create: { method: "POST", path: "/api/v1/products", scope: "products:write" },
    update: { method: "PATCH", path: "/api/v1/products/:id", scope: "products:write" },
    delete: { method: "DELETE", path: "/api/v1/products/:id", scope: "products:write" },
    publish: { method: "POST", path: "/api/v1/products/:id/publish", scope: "products:write" },
    archive: { method: "POST", path: "/api/v1/products/:id/archive", scope: "products:write" },
    setPrice: { method: "POST", path: "/api/v1/products/:id/set-price", scope: "products:write" },
  },

  // Tickets
  tickets: {
    list: { method: "GET", path: "/api/v1/tickets", scope: "tickets:read" },
    get: { method: "GET", path: "/api/v1/tickets/:id", scope: "tickets:read" },
    validate: { method: "POST", path: "/api/v1/tickets/:id/validate", scope: "tickets:write" },
  },

  // Checkout
  checkout: {
    sessions: {
      list: { method: "GET", path: "/api/v1/checkout/sessions", scope: "checkout:read" },
      get: { method: "GET", path: "/api/v1/checkout/sessions/:id", scope: "checkout:read" },
      create: { method: "POST", path: "/api/v1/checkout/sessions", scope: "checkout:write" },
      cancel: { method: "POST", path: "/api/v1/checkout/sessions/:id/cancel", scope: "checkout:write" },
    },
    confirm: { method: "POST", path: "/api/v1/checkout/confirm", scope: "checkout:write" },
    config: { method: "GET", path: "/api/v1/checkout/config", scope: "checkout:read" },
  },

  // Forms
  forms: {
    list: { method: "GET", path: "/api/v1/forms", scope: "forms:read" },
    get: { method: "GET", path: "/api/v1/forms/:id", scope: "forms:read" },
    create: { method: "POST", path: "/api/v1/forms", scope: "forms:write" },
    submit: { method: "POST", path: "/api/v1/forms/:id/submit", scope: "forms:write" },
  },

  // Publishing
  publishing: {
    configurations: {
      list: { method: "GET", path: "/api/v1/publishing/configurations", scope: "publishing:read" },
      get: { method: "GET", path: "/api/v1/publishing/configurations/:id", scope: "publishing:read" },
      create: { method: "POST", path: "/api/v1/publishing/configurations", scope: "publishing:write" },
      update: { method: "PATCH", path: "/api/v1/publishing/configurations/:id", scope: "publishing:write" },
    },
    deploy: { method: "POST", path: "/api/v1/publishing/deploy", scope: "publishing:write" },
  },

  // Certificates
  certificates: {
    list: { method: "GET", path: "/api/v1/certificates", scope: "certificates:read" },
    get: { method: "GET", path: "/api/v1/certificates/:id", scope: "certificates:read" },
    generate: { method: "POST", path: "/api/v1/certificates/generate", scope: "certificates:write" },
    download: { method: "GET", path: "/api/v1/certificates/:id/download", scope: "certificates:read" },
  },

  // OAuth Connections
  oauth: {
    connections: {
      list: { method: "GET", path: "/api/v1/oauth/connections", scope: "oauth:read" },
      get: { method: "GET", path: "/api/v1/oauth/connections/:id", scope: "oauth:read" },
      updateSettings: { method: "PATCH", path: "/api/v1/oauth/connections/:id/settings", scope: "oauth:write" },
      disconnect: { method: "POST", path: "/api/v1/oauth/connections/:id/disconnect", scope: "oauth:write" },
      delete: { method: "DELETE", path: "/api/v1/oauth/connections/:id", scope: "oauth:write" },
    },
  },

  // CLI Applications
  applications: {
    list: { method: "GET", path: "/api/v1/cli/applications", scope: "applications:read" },
    get: { method: "GET", path: "/api/v1/cli/applications/:id", scope: "applications:read" },
    register: { method: "POST", path: "/api/v1/cli/applications", scope: "applications:write" },
    update: { method: "PATCH", path: "/api/v1/cli/applications/:id", scope: "applications:write" },
    sync: { method: "POST", path: "/api/v1/cli/applications/:id/sync", scope: "applications:write" },
    byPath: { method: "GET", path: "/api/v1/cli/applications/by-path", scope: "applications:read" },
  },
} as const;

/**
 * Get all available scopes from the API routes reference
 */
export function getAvailableScopes(): string[] {
  const scopes = new Set<string>();

  function extractScopes(obj: Record<string, unknown>) {
    for (const value of Object.values(obj)) {
      if (typeof value === "object" && value !== null) {
        if ("scope" in value && typeof value.scope === "string") {
          scopes.add(value.scope);
        } else {
          extractScopes(value as Record<string, unknown>);
        }
      }
    }
  }

  extractScopes(layercakeApiRoutes as Record<string, unknown>);
  return Array.from(scopes).sort();
}
