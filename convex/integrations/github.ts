/**
 * GITHUB INTEGRATION
 *
 * Handles GitHub API operations for builder apps:
 * - Create repositories from v0-generated code
 * - Commit files to repositories
 * - Manage repository settings
 *
 * Requires GitHub OAuth connection for the organization.
 */

import { action, query, internalQuery, ActionCtx } from "../_generated/server";
import { v } from "convex/values";
import { Id, Doc } from "../_generated/dataModel";

// ============================================================================
// TYPES
// ============================================================================

interface GitHubFile {
  path: string;
  content: string;
  language: string;
}

interface GitHubCreateRepoResponse {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  clone_url: string;
  default_branch: string;
}

interface GitHubCreateFileResponse {
  content: {
    sha: string;
    path: string;
  };
  commit: {
    sha: string;
    message: string;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get GitHub access token from OAuth connection
 */
async function getGitHubAccessToken(
  ctx: { db: { query: (table: string) => { withIndex: (name: string, fn: (q: any) => any) => { filter: (fn: (q: any) => any) => { first: () => Promise<any> } } } } },
  organizationId: Id<"organizations">
): Promise<string | null> {
  const connection = await ctx.db
    .query("oauthConnections")
    .withIndex("by_organization", (q: any) => q.eq("organizationId", organizationId))
    .filter((q: any) => {
      const provider = q.field("provider");
      const status = q.field("status");
      return q.and(q.eq(provider, "github"), q.eq(status, "active"));
    })
    .first();

  if (!connection) {
    return null;
  }

  return connection.accessToken || null;
}

/**
 * Make GitHub API request
 */
async function githubFetch<T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "l4yercak3-builder",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Generate package.json content for a v0-generated app
 */
function generatePackageJson(appName: string, sdkVersion: string): string {
  const packageJson = {
    name: appName.toLowerCase().replace(/\s+/g, "-"),
    version: "0.1.0",
    private: true,
    scripts: {
      dev: "next dev",
      build: "next build",
      start: "next start",
      lint: "next lint",
    },
    dependencies: {
      "@l4yercak3/sdk": `^${sdkVersion}`,
      next: "14.2.5",
      react: "^18.2.0",
      "react-dom": "^18.2.0",
    },
    devDependencies: {
      "@types/node": "^20",
      "@types/react": "^18",
      "@types/react-dom": "^18",
      eslint: "^8",
      "eslint-config-next": "14.2.5",
      typescript: "^5",
    },
  };

  return JSON.stringify(packageJson, null, 2);
}

/**
 * Generate .env.example content
 */
function generateEnvExample(
  envVars: Array<{ key: string; description: string; required: boolean; defaultValue?: string }>
): string {
  const lines: string[] = [
    "# l4yercak3 Configuration",
    "# Copy this file to .env.local and fill in your values",
    "",
  ];

  for (const envVar of envVars) {
    lines.push(`# ${envVar.description}`);
    if (envVar.required) {
      lines.push(`# Required: Yes`);
    }
    lines.push(`${envVar.key}=${envVar.defaultValue || ""}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Generate README.md content
 */
function generateReadme(appName: string, orgName: string): string {
  return `# ${appName}

Built with [l4yercak3](https://l4yercak3.com) and [v0.dev](https://v0.dev).

## Getting Started

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Copy \`.env.example\` to \`.env.local\` and fill in your values:
\`\`\`bash
cp .env.example .env.local
\`\`\`

3. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to see your app.

## l4yercak3 SDK

This app uses the l4yercak3 SDK for:
- Event management
- CRM contacts
- Product checkout
- Form handling

See the [SDK documentation](https://docs.l4yercak3.com/sdk) for more details.

## Organization

**${orgName}**

## Deployment

Deploy to Vercel for the best Next.js experience:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)
`;
}

/**
 * Generate lib/layercake.ts for SDK initialization
 */
function generateLayercakeLib(): string {
  return `/**
 * l4yercak3 SDK Configuration
 *
 * This file initializes the l4yercak3 SDK client.
 * Environment variables are automatically loaded from .env.local
 */

import { getL4yercak3Client, L4yercak3Client } from '@l4yercak3/sdk';

// Singleton client instance
let client: L4yercak3Client | null = null;

/**
 * Get the l4yercak3 client instance
 * Uses environment variables for configuration
 */
export function getClient(): L4yercak3Client {
  if (!client) {
    client = getL4yercak3Client();
  }
  return client;
}

/**
 * Re-export hooks for convenient imports
 */
export {
  useContacts,
  useEvents,
  useCheckout,
  useOrders,
  useForms,
  useProducts,
  L4yercak3Provider,
} from '@l4yercak3/sdk/react';
`;
}

/**
 * Generate app/layout.tsx with L4yercak3Provider
 */
function generateLayoutTsx(appName: string): string {
  return `import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { L4yercak3Provider } from '@l4yercak3/sdk/react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '${appName}',
  description: 'Built with l4yercak3',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <L4yercak3Provider>
          {children}
        </L4yercak3Provider>
      </body>
    </html>
  );
}
`;
}

/**
 * Generate next.config.js
 */
function generateNextConfig(): string {
  return `/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Allow images from l4yercak3 storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.convex.cloud',
      },
    ],
  },
};

module.exports = nextConfig;
`;
}

// ============================================================================
// INTERNAL QUERIES (for use by actions)
// ============================================================================

/**
 * GET GITHUB CONNECTION (Internal)
 * Returns the GitHub OAuth connection including access token
 * Used by actions that need to make GitHub API calls
 */
export const getGitHubConnectionInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("oauthConnections")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => {
        const provider = q.field("provider");
        const status = q.field("status");
        return q.and(q.eq(provider, "github"), q.eq(status, "active"));
      })
      .first();

    if (!connection) {
      return null;
    }

    return {
      connected: true,
      accessToken: connection.accessToken,
      username: connection.providerEmail || "GitHub",
      connectedAt: connection._creationTime,
    };
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * CHECK GITHUB CONNECTION
 * Verify that GitHub OAuth is connected for the organization
 */
export const checkGitHubConnection = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Note: We can't call requireAuthenticatedUser here as it's in a different module
    // This should be called after auth is verified by the parent

    const connection = await ctx.db
      .query("oauthConnections")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => {
        const provider = q.field("provider");
        const status = q.field("status");
        return q.and(q.eq(provider, "github"), q.eq(status, "active"));
      })
      .first();

    if (connection) {
      return {
        connected: true,
        username: connection.providerEmail || "GitHub",
        connectedAt: connection._creationTime,
      };
    }

    return {
      connected: false,
      message: "GitHub not connected. Connect in Integrations settings.",
    };
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * CREATE REPOSITORY FROM BUILDER APP
 * Creates a new GitHub repository with the generated files
 */
// Type definitions for action return values
interface CreateRepoResult {
  success: boolean;
  repoUrl: string;
  cloneUrl: string;
  defaultBranch: string;
  fileCount: number;
}

export const createRepoFromBuilderApp = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    appId: v.id("objects"),
    repoName: v.string(),
    description: v.optional(v.string()),
    isPrivate: v.boolean(),
    /** Optional scaffold files generated by the publish wizard.
     *  When provided, these REPLACE the default scaffold (package.json, README, etc.)
     *  and are merged with the v0-generated files. */
    scaffoldFiles: v.optional(v.array(v.object({
      path: v.string(),
      content: v.string(),
      label: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, args): Promise<CreateRepoResult> => {
    console.log("[GitHub] Creating repo from builder app:", args.repoName);

    // Get the builder app
    const { api, internal } = await import("../_generated/api");
    const app = await ctx.runQuery(api.builderAppOntology.getBuilderApp, {
      sessionId: args.sessionId,
      appId: args.appId,
    });

    if (!app) {
      throw new Error("Builder app not found");
    }

    // Get organization info
    const org = await ctx.runQuery(api.organizations.getById, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
    });

    if (!org) {
      throw new Error("Organization not found");
    }

    // Get GitHub connection with access token
    const connection = await ctx.runQuery(internal.integrations.github.getGitHubConnectionInternal, {
      organizationId: args.organizationId,
    });

    if (!connection) {
      throw new Error("GitHub not connected. Please connect GitHub in Integrations settings.");
    }

    // Get access token - prefer OAuth token, fall back to env var for testing
    const accessToken: string = connection.accessToken || process.env.GITHUB_PERSONAL_ACCESS_TOKEN || "";
    if (!accessToken) {
      throw new Error("GitHub access token not available. Please reconnect GitHub in Integrations settings.");
    }

    try {
      // 1. Create the repository
      console.log("[GitHub] Creating repository...");
      const repoResponse = await githubFetch<GitHubCreateRepoResponse>("/user/repos", accessToken, {
        method: "POST",
        body: JSON.stringify({
          name: args.repoName,
          description: args.description || `${app.name} - Built with l4yercak3`,
          private: args.isPrivate,
          auto_init: false, // We'll add files manually
        }),
      });

      console.log("[GitHub] Repository created:", repoResponse.html_url);

      // 2. Prepare files to commit
      const customProps = app.customProperties as {
        generatedFiles?: GitHubFile[];
        sdkVersion?: string;
        requiredEnvVars?: Array<{ key: string; description: string; required: boolean; defaultValue?: string }>;
      };

      const generatedFiles = customProps?.generatedFiles || [];

      // Build the file list: v0 files + scaffold files
      // If scaffold files are provided by the wizard, use them instead of legacy defaults.
      // Scaffold files are ADDITIVE — they don't replace v0 files, they sit alongside them.
      let allFiles: GitHubFile[];

      if (args.scaffoldFiles && args.scaffoldFiles.length > 0) {
        // NEW PATH: Wizard-generated scaffold
        // v0 files come first (the actual app), scaffold files add infrastructure
        const scaffoldAsGithubFiles: GitHubFile[] = args.scaffoldFiles.map((f) => ({
          path: f.path,
          content: f.content,
          language: f.path.endsWith(".ts") || f.path.endsWith(".tsx") ? "typescript" : "text",
        }));

        // Merge: v0 files first, then scaffold files.
        // If a scaffold file conflicts with a v0 file path, the scaffold version wins
        // (e.g. scaffold provides an enhanced package.json)
        const v0FilePaths = new Set(generatedFiles.map((f) => f.path));
        const scaffoldFilePaths = new Set(scaffoldAsGithubFiles.map((f) => f.path));

        // v0 files that DON'T conflict with scaffold
        const nonConflictingV0 = generatedFiles.filter((f) => !scaffoldFilePaths.has(f.path));

        allFiles = [...nonConflictingV0, ...scaffoldAsGithubFiles];

        console.log("[GitHub] Using wizard scaffold:", {
          v0Files: generatedFiles.length,
          scaffoldFiles: scaffoldAsGithubFiles.length,
          conflictsResolved: generatedFiles.length - nonConflictingV0.length,
          totalFiles: allFiles.length,
        });
      } else {
        // LEGACY PATH: Default scaffold (backwards compatible)
        const sdkVersion = customProps?.sdkVersion || "1.0.0";
        const envVars = customProps?.requiredEnvVars || [];

        allFiles = [
          // Generated files from v0
          ...generatedFiles,
          // Package.json
          {
            path: "package.json",
            content: generatePackageJson(app.name, sdkVersion),
            language: "json",
          },
          // Environment example
          {
            path: ".env.example",
            content: generateEnvExample(envVars),
            language: "shell",
          },
          // README
          {
            path: "README.md",
            content: generateReadme(app.name, org.name || "Unknown"),
            language: "markdown",
          },
          // l4yercak3 lib
          {
            path: "lib/layercake.ts",
            content: generateLayercakeLib(),
            language: "typescript",
          },
          // Next.js config
          {
            path: "next.config.js",
            content: generateNextConfig(),
            language: "javascript",
          },
          // App layout (if not already in generated files)
          ...(generatedFiles.some((f) => f.path === "app/layout.tsx")
            ? []
            : [
                {
                  path: "app/layout.tsx",
                  content: generateLayoutTsx(app.name),
                  language: "typescript",
                },
              ]),
          // .gitignore
          {
            path: ".gitignore",
            content: `# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
`,
            language: "gitignore",
          },
        ];
      }

      // 3. Commit all files
      console.log("[GitHub] Committing", allFiles.length, "files...");

      // Create initial commit with all files
      // Note: GitHub API requires files to be committed one at a time for new repos
      // For a more efficient approach, you'd use the Git Data API to create a tree
      let lastCommitSha = "";

      for (const file of allFiles) {
        try {
          const fileResponse = await githubFetch<GitHubCreateFileResponse>(
            `/repos/${repoResponse.full_name}/contents/${file.path}`,
            accessToken,
            {
              method: "PUT",
              body: JSON.stringify({
                message: lastCommitSha
                  ? `Add ${file.path}`
                  : `Initial commit: ${app.name} - Built with l4yercak3 and v0`,
                content: Buffer.from(file.content).toString("base64"),
                branch: repoResponse.default_branch,
              }),
            }
          );
          lastCommitSha = fileResponse.commit.sha;
          console.log("[GitHub] Committed:", file.path);
        } catch (error) {
          console.error("[GitHub] Failed to commit file:", file.path, error);
          // Continue with other files even if one fails
        }
      }

      // 4. Update builder app with repo info
      await ctx.runMutation(api.builderAppOntology.updateBuilderAppDeployment, {
        sessionId: args.sessionId,
        appId: args.appId,
        githubRepo: repoResponse.html_url,
        githubBranch: repoResponse.default_branch,
      });

      console.log("[GitHub] Repository setup complete:", repoResponse.html_url);

      return {
        success: true,
        repoUrl: repoResponse.html_url,
        cloneUrl: repoResponse.clone_url,
        defaultBranch: repoResponse.default_branch,
        fileCount: allFiles.length,
      };
    } catch (error) {
      console.error("[GitHub] Error creating repository:", error);
      throw new Error(
        `Failed to create GitHub repository: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});

/**
 * VALIDATE GITHUB REPOSITORY
 * Check if a GitHub repository exists and is accessible
 */
export const validateGitHubRepo = action({
  args: {
    sessionId: v.string(),
    githubUrl: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("[GitHub] Validating repository:", args.githubUrl);

    try {
      // Parse GitHub URL
      const match = args.githubUrl.match(/^https:\/\/github\.com\/([\w-]+)\/([\w-]+)/);
      if (!match) {
        return {
          valid: false,
          error: "Invalid GitHub URL format. Expected: https://github.com/username/repo",
        };
      }

      const [, owner, repo] = match;
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

      // Check if repo exists (public endpoint, no auth needed)
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "l4yercak3-builder",
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          valid: true,
          repoInfo: {
            owner,
            repo,
            url: args.githubUrl,
            defaultBranch: data.default_branch,
            isPrivate: data.private,
          },
        };
      } else if (response.status === 404) {
        return {
          valid: false,
          error: "Repository not found. Check the URL or ensure the repo is public.",
        };
      } else {
        return {
          valid: false,
          error: `GitHub API returned status ${response.status}`,
        };
      }
    } catch (error) {
      console.error("[GitHub] Validation error:", error);
      return {
        valid: false,
        error: `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});
