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

// Lazy-load api/internal to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _apiCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getApi(): any {
  if (!_apiCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _apiCache = require("../_generated/api");
  }
  return _apiCache;
}

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
 * Encode a UTF-8 string to base64 without Buffer or unescape.
 * Uses TextEncoder (available in all modern JS runtimes including Convex).
 */
function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    result += chars[b0 >> 2];
    result += chars[((b0 & 3) << 4) | (b1 >> 4)];
    result += i + 1 < bytes.length ? chars[((b1 & 15) << 2) | (b2 >> 6)] : "=";
    result += i + 2 < bytes.length ? chars[b2 & 63] : "=";
  }
  return result;
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
 * Generate app/globals.css - minimal global styles for Next.js
 */
function generateGlobalsCss(): string {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;
  }
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}
`;
}

/**
 * Generate tsconfig.json for Next.js TypeScript projects
 */
function generateTsconfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: true,
        skipLibCheck: true,
        strict: false,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "preserve",
        incremental: true,
        plugins: [{ name: "next" }],
        paths: { "@/*": ["./*"] },
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"],
    },
    null,
    2
  );
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

/**
 * Generate app/page.tsx - root page that imports the main v0 component.
 *
 * v0 typically generates components at paths like:
 *   components/landing-page.tsx, components/app.tsx, etc.
 * but does NOT generate app/page.tsx. Without it, Next.js returns 404 at /.
 *
 * This function inspects generatedFiles to find the most likely "main" component
 * and creates a page.tsx that imports and renders it.
 */
function generatePageTsx(
  generatedFiles: Array<{ path: string; content: string; language: string }>
): string {
  // Strategy: find the main component from v0-generated files
  // 1. Check if v0 generated a root page.tsx (no app/ prefix) — use it directly
  // 2. Prefer files with names like "page", "app", "home", "landing", "main"
  // 3. Fall back to the largest .tsx component file
  // 4. Last resort: first .tsx component file

  // Check if v0 generated a root-level page.tsx — promote it directly
  const rootPageFile = generatedFiles.find(
    (f) => f.path === "page.tsx" || f.path === "src/page.tsx"
  );
  if (rootPageFile) {
    console.log("[GitHub:generatePageTsx] Found root page.tsx, promoting to app/page.tsx");
    return rootPageFile.content;
  }

  const priorityNames = [
    "page", "app", "home", "landing", "main", "index",
    "hero", "landing-page", "home-page", "website", "site",
  ];
  const tsxFiles = generatedFiles.filter(
    (f) =>
      (f.path.endsWith(".tsx") || f.path.endsWith(".jsx")) &&
      !f.path.includes("layout") &&
      !f.path.includes("globals") &&
      !f.path.includes("provider") &&
      !f.path.includes("/ui/") // Exclude shadcn ui components
  );

  if (tsxFiles.length === 0) {
    console.log("[GitHub:generatePageTsx] No .tsx/.jsx component files found, using placeholder");
    return `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Welcome</h1>
      <p className="mt-4 text-lg text-gray-600">Your app is live.</p>
    </main>
  );
}
`;
  }

  // Find best candidate by priority name
  let bestFile: (typeof tsxFiles)[0] | null = null;
  let selectionReason = "first-file";

  for (const name of priorityNames) {
    const match = tsxFiles.find((f) => {
      const filename = f.path.split("/").pop()?.toLowerCase() || "";
      return filename.includes(name);
    });
    if (match) {
      bestFile = match;
      selectionReason = `priority-name-match:"${name}"`;
      break;
    }
  }

  // Fallback: pick the largest component file (most likely the main page)
  if (!bestFile) {
    const sorted = [...tsxFiles].sort((a, b) => b.content.length - a.content.length);
    if (sorted[0] && sorted[0].content.length > 100) {
      bestFile = sorted[0];
      selectionReason = "largest-file";
    }
  }

  // Last resort: first tsx file
  if (!bestFile) {
    bestFile = tsxFiles[0];
    selectionReason = "first-file";
  }

  // If the best file IS already at app/page.tsx, skip generation
  if (bestFile.path === "app/page.tsx") {
    console.log("[GitHub:generatePageTsx] v0 already provided app/page.tsx, skipping generation");
    return ""; // Signal: don't add, it already exists
  }

  // Derive import path and component name
  // e.g. "components/landing-page.tsx" -> "@/components/landing-page"
  const importPath = "@/" + bestFile.path.replace(/\.(tsx|jsx)$/, "");

  // Try to extract the default export name from the file content
  const defaultExportMatch =
    bestFile.content.match(/export\s+default\s+function\s+(\w+)/) ||
    bestFile.content.match(/export\s+default\s+(\w+)/) ||
    bestFile.content.match(/function\s+(\w+)[\s\S]*?export\s+default\s+\1/);
  const componentName = defaultExportMatch
    ? defaultExportMatch[1]
    : "MainComponent";

  console.log("[GitHub:generatePageTsx] Analysis:", {
    tsxFileCount: tsxFiles.length,
    tsxPaths: tsxFiles.map((f) => f.path),
    selectedFile: bestFile.path,
    selectionReason,
    componentName,
    importPath,
  });

  return `import ${componentName} from '${importPath}';

export default function Home() {
  return <${componentName} />;
}
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
    const { api, internal } = getApi();
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

    // Decrypt access token (stored encrypted via oauth/encryption)
    let accessToken: string = "";
    if (connection.accessToken) {
      try {
        accessToken = await ctx.runAction(internal.oauth.encryption.decryptToken, {
          encrypted: connection.accessToken,
        });
      } catch (decryptError) {
        console.error("[GitHub] Failed to decrypt access token:", decryptError);
      }
    }
    // Fall back to env var for testing
    if (!accessToken) {
      accessToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN || "";
    }
    if (!accessToken) {
      throw new Error("GitHub access token not available. Please reconnect GitHub in Integrations settings.");
    }

    try {
      // 1. Create the repository (or use existing if name taken)
      console.log("[GitHub] Creating repository...");
      let repoResponse: GitHubCreateRepoResponse;
      let isExistingRepo = false;
      try {
        repoResponse = await githubFetch<GitHubCreateRepoResponse>("/user/repos", accessToken, {
          method: "POST",
          body: JSON.stringify({
            name: args.repoName,
            description: args.description || `${app.name} - Built with l4yercak3`,
            private: args.isPrivate,
            auto_init: false, // We'll add files manually
          }),
        });
        console.log("[GitHub] Repository created:", repoResponse.html_url);
      } catch (createErr) {
        const errMsg = createErr instanceof Error ? createErr.message : String(createErr);
        // Handle 422 "name already exists" - fetch the existing repo instead
        if (errMsg.includes("422") && errMsg.includes("name already exists")) {
          console.log("[GitHub] Repo already exists, fetching existing repo...");
          // Get authenticated user's login to construct the repo path
          const user = await githubFetch<{ login: string }>("/user", accessToken);
          repoResponse = await githubFetch<GitHubCreateRepoResponse>(
            `/repos/${user.login}/${args.repoName}`,
            accessToken
          );
          isExistingRepo = true;
          console.log("[GitHub] Using existing repository:", repoResponse.html_url);
        } else {
          throw createErr;
        }
      }

      // 2. Prepare files to commit
      const customProps = app.customProperties as {
        sdkVersion?: string;
        requiredEnvVars?: Array<{ key: string; description: string; required: boolean; defaultValue?: string }>;
      };

      // Read files from builderFiles table
      const builderFileRecords = await ctx.runQuery(internal.fileSystemOntology.getFilesByAppInternal, {
        appId: args.appId,
      });
      const generatedFiles: GitHubFile[] = builderFileRecords.map((f: { path: string; content: string; language: string }) => ({
        path: f.path,
        content: f.content,
        language: f.language,
      }));

      console.log("[GitHub] v0 generatedFiles:", generatedFiles.map((f: GitHubFile) => f.path));

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
          // globals.css (if not already in generated files)
          ...(generatedFiles.some((f) => f.path === "app/globals.css")
            ? []
            : [
                {
                  path: "app/globals.css",
                  content: generateGlobalsCss(),
                  language: "css",
                },
              ]),
          // tsconfig.json (if not already in generated files)
          ...(generatedFiles.some((f) => f.path === "tsconfig.json")
            ? []
            : [
                {
                  path: "tsconfig.json",
                  content: generateTsconfig(),
                  language: "json",
                },
              ]),
          // app/page.tsx - root page (if not already in generated files)
          ...(generatedFiles.some((f) => f.path === "app/page.tsx" || f.path === "src/app/page.tsx")
            ? []
            : (() => {
                const pageContent = generatePageTsx(generatedFiles);
                return pageContent
                  ? [{ path: "app/page.tsx", content: pageContent, language: "typescript" }]
                  : [];
              })()),
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

      console.log("[GitHub] All files to commit:", allFiles.map((f) => f.path));

      // 3. Commit all files in a SINGLE atomic commit using Git Trees API
      // This avoids 409 SHA conflicts from sequential per-file commits.
      console.log("[GitHub] Committing", allFiles.length, "files in single commit...");

      const repoFullName = repoResponse.full_name;
      const branch = repoResponse.default_branch;
      const commitMessage = isExistingRepo
        ? `Update: ${app.name} - Built with l4yercak3 and v0`
        : `Initial commit: ${app.name} - Built with l4yercak3 and v0`;

      // 3a. Get the latest commit SHA for the branch
      let baseTreeSha: string | undefined;
      let parentCommitSha: string | undefined;
      try {
        const refData = await githubFetch<{ object: { sha: string } }>(
          `/repos/${repoFullName}/git/ref/heads/${branch}`,
          accessToken
        );
        parentCommitSha = refData.object.sha;

        const commitData = await githubFetch<{ tree: { sha: string } }>(
          `/repos/${repoFullName}/git/commits/${parentCommitSha}`,
          accessToken
        );
        baseTreeSha = commitData.tree.sha;
      } catch {
        // New repo with no commits yet - that's fine, no base tree
        console.log("[GitHub] No existing commits found (new repo)");
      }

      // 3b. Create blobs for each file
      const treeItems: Array<{
        path: string;
        mode: "100644";
        type: "blob";
        sha: string;
      }> = [];

      for (const file of allFiles) {
        try {
          const blob = await githubFetch<{ sha: string }>(
            `/repos/${repoFullName}/git/blobs`,
            accessToken,
            {
              method: "POST",
              body: JSON.stringify({
                content: utf8ToBase64(file.content),
                encoding: "base64",
              }),
            }
          );
          treeItems.push({
            path: file.path,
            mode: "100644",
            type: "blob",
            sha: blob.sha,
          });
        } catch (error) {
          console.error("[GitHub] Failed to create blob for:", file.path, error);
        }
      }

      if (treeItems.length === 0) {
        throw new Error("No files could be committed to GitHub");
      }

      // 3c. Create tree (with base_tree for existing repos)
      const treePayload: Record<string, unknown> = { tree: treeItems };
      if (baseTreeSha) {
        treePayload.base_tree = baseTreeSha;
      }
      const newTree = await githubFetch<{ sha: string }>(
        `/repos/${repoFullName}/git/trees`,
        accessToken,
        { method: "POST", body: JSON.stringify(treePayload) }
      );

      // 3d. Create commit
      const commitPayload: Record<string, unknown> = {
        message: commitMessage,
        tree: newTree.sha,
      };
      if (parentCommitSha) {
        commitPayload.parents = [parentCommitSha];
      }
      const newCommit = await githubFetch<{ sha: string }>(
        `/repos/${repoFullName}/git/commits`,
        accessToken,
        { method: "POST", body: JSON.stringify(commitPayload) }
      );

      // 3e. Update branch reference to point to new commit
      if (parentCommitSha) {
        await githubFetch(
          `/repos/${repoFullName}/git/refs/heads/${branch}`,
          accessToken,
          {
            method: "PATCH",
            body: JSON.stringify({ sha: newCommit.sha, force: true }),
          }
        );
      } else {
        // For brand new repos, create the ref
        await githubFetch(
          `/repos/${repoFullName}/git/refs`,
          accessToken,
          {
            method: "POST",
            body: JSON.stringify({
              ref: `refs/heads/${branch}`,
              sha: newCommit.sha,
            }),
          }
        );
      }

      console.log(`[GitHub] Committed ${treeItems.length} files in single commit: ${newCommit.sha}`);

      // 4. Update builder app with repo info (skip if already set to avoid OCC conflicts
      //    with concurrent heal status mutations writing to the same objects row)
      const currentGithubRepo = ((app.customProperties as Record<string, unknown>)?.deployment as Record<string, unknown>)?.githubRepo;
      if (!currentGithubRepo || currentGithubRepo !== repoResponse.html_url) {
        await ctx.runMutation(api.builderAppOntology.updateBuilderAppDeployment, {
          sessionId: args.sessionId,
          appId: args.appId,
          githubRepo: repoResponse.html_url,
          githubBranch: repoResponse.default_branch,
        });
      }

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
