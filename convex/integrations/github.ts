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
      // v0 common dependencies
      "lucide-react": "^0.400.0",
      geist: "^1.3.0",
      "@vercel/analytics": "^1.3.1",
      "@vercel/speed-insights": "^1.0.12",
      // shadcn/ui essentials
      clsx: "^2.1.0",
      "tailwind-merge": "^2.2.0",
      "class-variance-authority": "^0.7.0",
      "tailwindcss-animate": "^1.0.7",
      "@radix-ui/react-slot": "^1.0.2",
      "@radix-ui/react-accordion": "^1.1.2",
      "@radix-ui/react-alert-dialog": "^1.0.5",
      "@radix-ui/react-avatar": "^1.0.4",
      "@radix-ui/react-checkbox": "^1.0.4",
      "@radix-ui/react-dialog": "^1.0.5",
      "@radix-ui/react-dropdown-menu": "^2.0.6",
      "@radix-ui/react-label": "^2.0.2",
      "@radix-ui/react-popover": "^1.0.7",
      "@radix-ui/react-progress": "^1.0.3",
      "@radix-ui/react-scroll-area": "^1.0.5",
      "@radix-ui/react-select": "^2.0.0",
      "@radix-ui/react-separator": "^1.0.3",
      "@radix-ui/react-switch": "^1.0.3",
      "@radix-ui/react-tabs": "^1.0.4",
      "@radix-ui/react-toast": "^1.1.5",
      "@radix-ui/react-toggle": "^1.0.3",
      "@radix-ui/react-tooltip": "^1.0.7",
    },
    devDependencies: {
      "@types/node": "^20",
      "@types/react": "^18",
      "@types/react-dom": "^18",
      eslint: "^8",
      "eslint-config-next": "14.2.5",
      typescript: "^5",
      tailwindcss: "^3.4.1",
      postcss: "^8",
      autoprefixer: "^10",
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
 * Post-process v0-generated files to fix known compatibility issues.
 *
 * v0 generates code that references packages and components not in the repo.
 * Instead of guessing, we SCAN the actual files and dynamically resolve:
 *
 * 1. Geist fonts: v0 uses `next/font/google` for Geist → patch to `geist` package
 * 2. Missing shadcn stubs: scan for `@/components/ui/*` → generate component stubs
 * 3. Missing npm packages: scan all imports → merge into package.json
 */
function patchV0CompatibilityIssues(files: GitHubFile[]): GitHubFile[] {
  console.log(`[GitHub] patchV0CompatibilityIssues called with ${files.length} files`);

  // Phase 1a: Patch Geist font imports in layout files
  const patched = files.map((f) => {
    if (f.path === "app/layout.tsx" || f.path === "src/app/layout.tsx") {
      return { ...f, content: patchGeistFontImports(f.content) };
    }
    return f;
  });

  // Phase 1b: Patch globals.css — v0 generates Tailwind v4 syntax but we use v3
  let needsShadcnTailwindConfig = false;
  for (let i = 0; i < patched.length; i++) {
    const f = patched[i];
    if (f.path === "app/globals.css" || f.path === "src/app/globals.css") {
      if (f.content.includes("@import 'tailwindcss'") || f.content.includes("@import \"tailwindcss\"")) {
        console.log("[GitHub] Patching globals.css: Tailwind v4 -> v3 syntax");
        patched[i] = { ...f, content: convertGlobalsCssToV3(f.content) };
        needsShadcnTailwindConfig = true;
      }
    }
  }

  // Phase 1c: If we patched globals.css, also ensure tailwind.config has shadcn theme
  if (needsShadcnTailwindConfig) {
    for (let i = 0; i < patched.length; i++) {
      if (patched[i].path === "tailwind.config.ts" || patched[i].path === "tailwind.config.js") {
        console.log("[GitHub] Patching tailwind.config with shadcn/ui theme");
        patched[i] = { ...patched[i], path: "tailwind.config.ts", content: generateShadcnTailwindConfig() };
        break;
      }
    }
  }

  try {
    // Phase 2: Scan all files for imports
    const existingPaths = new Set(patched.map((f) => f.path));
    const neededStubsList: string[] = [];
    const detectedNpmPkgList: string[] = [];

    for (let i = 0; i < patched.length; i++) {
      const f = patched[i];
      if (!f.path.endsWith(".tsx") && !f.path.endsWith(".ts") && !f.path.endsWith(".jsx") && !f.path.endsWith(".js")) continue;

      // 2a. Detect @/components/ui/* imports → need stubs
      const uiRegex = /from\s+["']@\/components\/ui\/([\w-]+)["']/g;
      let uiMatch: RegExpExecArray | null;
      while ((uiMatch = uiRegex.exec(f.content)) !== null) {
        const componentName = uiMatch[1];
        const stubPath = `components/ui/${componentName}.tsx`;
        if (!existingPaths.has(stubPath) && !neededStubsList.includes(componentName)) {
          neededStubsList.push(componentName);
        }
      }

      // 2b. Detect npm package imports using line-by-line parsing
      // (regex exec with /g was unreliable in Convex runtime)
      const lines = f.content.split("\n");
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        // Only process import/from lines
        if (line.indexOf("import") === -1 && line.indexOf("from") === -1) continue;
        // Extract quoted strings after "from" or "import"
        const fromIdx = line.lastIndexOf("from");
        const quoteSearchStart = fromIdx >= 0 ? fromIdx : 0;
        const remainder = line.substring(quoteSearchStart);
        // Find quoted package name
        const sqMatch = remainder.match(/["']([@a-zA-Z][^"']*)['"]/);
        if (!sqMatch) continue;
        const pkg = sqMatch[1];
        // Skip relative, alias, Next.js, React
        if (pkg.startsWith(".") || pkg.startsWith("@/") || pkg.startsWith("~/")) continue;
        if (pkg === "react" || pkg === "react-dom" || pkg.startsWith("next/") || pkg === "next") continue;
        const basePkg = pkg.startsWith("@")
          ? pkg.split("/").slice(0, 2).join("/")
          : pkg.split("/")[0];
        if (!detectedNpmPkgList.includes(basePkg)) {
          detectedNpmPkgList.push(basePkg);
          console.log(`[GitHub] npm import: "${pkg}" -> "${basePkg}" in ${f.path}:${li + 1}`);
        }
      }
    }

    console.log(`[GitHub] Scan complete: ${neededStubsList.length} stubs needed, ${detectedNpmPkgList.length} npm packages: [${detectedNpmPkgList.join(", ")}]`);

    // Phase 3: Generate stubs for missing shadcn components
    for (let i = 0; i < neededStubsList.length; i++) {
      const name = neededStubsList[i];
      const stub = generateShadcnStub(name);
      if (stub) {
        patched.push({
          path: `components/ui/${name}.tsx`,
          content: stub,
          language: "typescript",
        });
        existingPaths.add(`components/ui/${name}.tsx`);
        console.log(`[GitHub] Generated stub: components/ui/${name}.tsx`);
      }
    }

    // Phase 4: Merge detected npm packages into package.json
    if (detectedNpmPkgList.length > 0) {
      const pkgFileIdx = patched.findIndex((f) => f.path === "package.json");
      console.log(`[GitHub] package.json index: ${pkgFileIdx}`);
      if (pkgFileIdx >= 0) {
        const pkgJson = JSON.parse(patched[pkgFileIdx].content);
        const existingDeps: Record<string, string> = { ...pkgJson.dependencies };
        let addedCount = 0;

        for (let i = 0; i < detectedNpmPkgList.length; i++) {
          const pkg = detectedNpmPkgList[i];
          if (existingDeps[pkg]) {
            console.log(`[GitHub] Skipping ${pkg} - already in deps`);
            continue;
          }
          const version = getKnownPackageVersion(pkg);
          if (version) {
            existingDeps[pkg] = version;
            addedCount++;
            console.log(`[GitHub] Adding ${pkg}@${version} to package.json`);
          } else {
            console.log(`[GitHub] Unknown package ${pkg} - not in registry`);
          }
        }

        if (addedCount > 0) {
          pkgJson.dependencies = existingDeps;
          patched[pkgFileIdx] = {
            ...patched[pkgFileIdx],
            content: JSON.stringify(pkgJson, null, 2),
          };
          console.log(`[GitHub] Auto-added ${addedCount} npm packages to package.json`);
        }
      } else {
        console.log(`[GitHub] WARNING: No package.json found in files!`);
      }
    }

    console.log(`[GitHub] v0 compat done: ${neededStubsList.length} stubs, ${detectedNpmPkgList.length} npm pkgs`);
  } catch (err) {
    console.error(`[GitHub] ERROR in patchV0CompatibilityIssues phases 2-4:`, String(err));
  }

  return patched;
}

/**
 * Known npm package versions for v0-generated apps.
 * When we detect an import, we look up the version here.
 * Returns null for unknown packages (they won't be added — self-heal can fix later).
 */
function getKnownPackageVersion(pkg: string): string | null {
  const KNOWN_VERSIONS: Record<string, string> = {
    // Fonts
    geist: "^1.3.0",
    // Icons
    "lucide-react": "^0.400.0",
    // shadcn/ui essentials
    clsx: "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "class-variance-authority": "^0.7.0",
    // Vercel packages
    "@vercel/analytics": "^1.3.1",
    "@vercel/speed-insights": "^1.0.12",
    // Radix UI primitives (shadcn components use these)
    "@radix-ui/react-accordion": "^1.1.2",
    "@radix-ui/react-alert-dialog": "^1.0.5",
    "@radix-ui/react-aspect-ratio": "^1.0.3",
    "@radix-ui/react-avatar": "^1.0.4",
    "@radix-ui/react-checkbox": "^1.0.4",
    "@radix-ui/react-collapsible": "^1.0.3",
    "@radix-ui/react-context-menu": "^2.1.5",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-hover-card": "^1.0.7",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-menubar": "^1.0.4",
    "@radix-ui/react-navigation-menu": "^1.1.4",
    "@radix-ui/react-popover": "^1.0.7",
    "@radix-ui/react-progress": "^1.0.3",
    "@radix-ui/react-radio-group": "^1.1.3",
    "@radix-ui/react-scroll-area": "^1.0.5",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-separator": "^1.0.3",
    "@radix-ui/react-slider": "^1.1.2",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-switch": "^1.0.3",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "@radix-ui/react-toggle": "^1.0.3",
    "@radix-ui/react-toggle-group": "^1.0.4",
    "@radix-ui/react-tooltip": "^1.0.7",
    // Date utilities
    "date-fns": "^3.6.0",
    // Form handling
    "react-hook-form": "^7.52.0",
    "@hookform/resolvers": "^3.6.0",
    zod: "^3.23.0",
    // Animation
    "framer-motion": "^11.2.0",
    // Data display
    recharts: "^2.12.0",
    // Misc common
    "react-day-picker": "^8.10.0",
    "cmdk": "^1.0.0",
    "sonner": "^1.5.0",
    "vaul": "^0.9.0",
    "embla-carousel-react": "^8.1.0",
    "input-otp": "^1.2.4",
    "react-resizable-panels": "^2.0.0",
    "next-themes": "^0.3.0",
    // Tailwind plugins
    "tailwindcss-animate": "^1.0.7",
    "@tailwindcss/typography": "^0.5.13",
  };

  return KNOWN_VERSIONS[pkg] || null;
}

/**
 * Fix Geist font imports in layout.tsx files.
 * Generate a Tailwind v3 config with shadcn/ui theme extensions.
 * Maps CSS variables (--background, --foreground, etc.) to Tailwind classes.
 */
function generateShadcnTailwindConfig(): string {
  return `import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
`;
}

/**
 * Convert v0-generated Tailwind v4 globals.css to v3-compatible format.
 *
 * v0 generates: @import 'tailwindcss' with oklch() colors and @custom-variant
 * Fix to:       @tailwind base/components/utilities with hsl() CSS variables
 *
 * Extracts CSS variable definitions and converts oklch() values to simple numeric
 * HSL-ish values that work with Tailwind v3's theme system.
 */
function convertGlobalsCssToV3(v4Content: string): string {
  // Extract CSS variables from :root and .dark blocks
  const rootVars: Record<string, string> = {};
  const darkVars: Record<string, string> = {};

  // Parse :root block
  const rootMatch = v4Content.match(/:root\s*\{([^}]+)\}/);
  if (rootMatch) {
    const varLines = rootMatch[1].split("\n");
    for (const line of varLines) {
      const m = line.match(/--([a-z-]+)\s*:\s*(.+?)\s*;/);
      if (m) rootVars[m[1]] = m[2].trim();
    }
  }

  // Parse .dark block
  const darkMatch = v4Content.match(/\.dark\s*\{([^}]+)\}/);
  if (darkMatch) {
    const varLines = darkMatch[1].split("\n");
    for (const line of varLines) {
      const m = line.match(/--([a-z-]+)\s*:\s*(.+?)\s*;/);
      if (m) darkVars[m[1]] = m[2].trim();
    }
  }

  // Convert oklch/other values to simple passthrough values
  // Tailwind v3 uses these as raw values in hsl(), so we keep them as-is
  // but strip oklch() wrapper since the theme references them directly
  function simplifyValue(val: string): string {
    // oklch(0.985 0.002 264) → just keep as-is, will be used as CSS var
    return val;
  }

  // Build :root vars string
  const rootVarLines = Object.entries(rootVars)
    .map(([k, v]) => `    --${k}: ${simplifyValue(v)};`)
    .join("\n");
  const darkVarLines = Object.entries(darkVars)
    .map(([k, v]) => `    --${k}: ${simplifyValue(v)};`)
    .join("\n");

  // Extract --radius if present
  const radiusVal = rootVars["radius"] || "0.5rem";

  // Ensure --radius is present
  if (!rootVars["radius"]) {
    rootVars["radius"] = "0.5rem";
  }

  // Rebuild var lines with all extracted variables
  const finalRootLines = Object.entries(rootVars)
    .map(([k, v]) => `  --${k}: ${v};`)
    .join("\n");
  const finalDarkLines = Object.entries(darkVars)
    .map(([k, v]) => `  --${k}: ${v};`)
    .join("\n");

  return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
${finalRootLines}
}

${finalDarkLines ? `.dark {\n${finalDarkLines}\n}` : ""}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
`;
}

/**
 * v0 generates: import { Geist, Geist_Mono } from "next/font/google"
 * Fix to:       import { GeistSans } from "geist/font/sans"
 *               import { GeistMono } from "geist/font/mono"
 */
function patchGeistFontImports(content: string): string {
  // Check if file uses Geist from next/font/google (the broken pattern)
  if (!content.includes("Geist") || !content.includes("next/font/google")) {
    return content;
  }

  let patched = content;

  // Replace the import statement
  // Handles: import { Geist, Geist_Mono } from "next/font/google"
  // Also:    import { Geist } from "next/font/google"
  patched = patched.replace(
    /import\s*\{[^}]*Geist[^}]*\}\s*from\s*["']next\/font\/google["'];?\s*/g,
    `import { GeistSans } from "geist/font/sans";\nimport { GeistMono } from "geist/font/mono";\n`
  );

  // Replace font instantiation calls
  // Handles: const geistSans = Geist({ ... })  →  (remove, use GeistSans directly)
  // Handles: const geistMono = Geist_Mono({ ... })  →  (remove, use GeistMono directly)
  patched = patched.replace(
    /const\s+(\w+)\s*=\s*Geist\(\{[^}]*\}\);?\s*/g,
    "// Geist font loaded via geist/font/sans package\n"
  );
  patched = patched.replace(
    /const\s+(\w+)\s*=\s*Geist_Mono\(\{[^}]*\}\);?\s*/g,
    "// Geist Mono font loaded via geist/font/mono package\n"
  );

  // Replace className references
  // v0 typically does: className={`${geistSans.variable} ${geistMono.variable} antialiased`}
  // Fix to:           className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
  patched = patched.replace(/\bgeistSans\.variable\b/g, "GeistSans.variable");
  patched = patched.replace(/\bgeistMono\.variable\b/g, "GeistMono.variable");
  patched = patched.replace(/\bgeistSans\.className\b/g, "GeistSans.className");
  patched = patched.replace(/\bgeistMono\.className\b/g, "GeistMono.className");

  return patched;
}

/**
 * Generate a minimal shadcn/ui component stub.
 * These are lightweight wrappers that prevent "Module not found" build errors.
 * v0 imports these but they don't exist in the repo by default.
 */
function generateShadcnStub(componentName: string): string | null {
  const stubs: Record<string, string> = {
    button: `import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
`,
    card: `import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, any>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)} {...props} />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, any>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, any>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, any>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
`,
    input: `import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
`,
    label: `import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
`,
    badge: `import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
`,
    separator: `import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "@/lib/utils";

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn(
      "shrink-0 bg-border",
      orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
      className
    )}
    {...props}
  />
));
Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };
`,
    textarea: `import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export { Textarea };
`,
    avatar: `import * as React from "react";
import { cn } from "@/lib/utils";

const Avatar = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span ref={ref} className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)} {...props} />
  )
);
Avatar.displayName = "Avatar";

const AvatarImage = React.forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>(
  ({ className, ...props }, ref) => (
    <img ref={ref} className={cn("aspect-square h-full w-full", className)} {...props} />
  )
);
AvatarImage.displayName = "AvatarImage";

const AvatarFallback = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span ref={ref} className={cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className)} {...props} />
  )
);
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };
`,
    scroll_area: `import * as React from "react";
import { cn } from "@/lib/utils";

const ScrollArea = React.forwardRef<HTMLDivElement, any>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("relative overflow-auto", className)} {...props}>
      {children}
    </div>
  )
);
ScrollArea.displayName = "ScrollArea";

const ScrollBar = React.forwardRef<HTMLDivElement, any>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("", className)} {...props} />
  )
);
ScrollBar.displayName = "ScrollBar";

export { ScrollArea, ScrollBar };
`,
  };

  // Handle kebab-case → snake_case lookup (e.g., "scroll-area" → "scroll_area")
  const normalizedName = componentName.replace(/-/g, "_");
  const knownStub = stubs[normalizedName] || stubs[componentName];
  if (knownStub) return knownStub;

  // Generic fallback: scan the importing files to find what names they import,
  // then generate a passthrough div wrapper for each. This prevents build failures
  // for shadcn components we don't have pre-built stubs for.
  return generateGenericShadcnStub(componentName);
}

/**
 * Generate a generic passthrough stub for an unknown shadcn component.
 * Converts kebab-case filename to PascalCase export names.
 * E.g., "dropdown-menu" → DropdownMenu, DropdownMenuContent, etc.
 *
 * Since we don't know the exact exports, we generate a flexible
 * forwarded-ref div wrapper and export it under common naming patterns.
 */
function generateGenericShadcnStub(componentName: string): string {
  // Convert "dropdown-menu" → "DropdownMenu"
  const pascal = componentName
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");

  // Common shadcn sub-component suffixes
  const suffixes = [
    "", "Trigger", "Content", "Header", "Footer",
    "Title", "Description", "Close", "Item", "Group",
    "Value", "Viewport", "Root",
  ];

  const exports = suffixes.map((suffix) => {
    const name = `${pascal}${suffix}`;
    return `const ${name} = React.forwardRef<HTMLDivElement, any>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("", className)} {...props} />
);
${name}.displayName = "${name}";`;
  });

  const exportNames = suffixes.map((s) => `${pascal}${s}`).join(", ");

  return `"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

${exports.join("\n\n")}

export { ${exportNames} };
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
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
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
            auto_init: true, // Creates initial commit so Git Trees API works
          }),
        });
        console.log("[GitHub] Repository created:", repoResponse.html_url);
        // Wait for GitHub to finish initializing the repo (initial commit)
        await new Promise((resolve) => setTimeout(resolve, 2000));
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

      console.log("[GitHub] builderFiles for appId", args.appId, ":", generatedFiles.length, "files:", generatedFiles.map((f: GitHubFile) => f.path));

      if (generatedFiles.length === 0) {
        throw new Error(
          `No files found in builderFiles table for appId ${args.appId}. ` +
          `Ensure the v0 response was persisted via createBuilderApp/updateBuilderApp before publishing.`
        );
      }

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
          // PostCSS config (required for Tailwind CSS)
          {
            path: "postcss.config.mjs",
            content: `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
`,
            language: "javascript",
          },
          // Tailwind config (if not already in v0 files)
          ...(generatedFiles.some((f) => f.path === "tailwind.config.ts" || f.path === "tailwind.config.js")
            ? []
            : [
                {
                  path: "tailwind.config.ts",
                  content: `import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
`,
                  language: "typescript",
                },
              ]),
          // shadcn lib/utils.ts (v0 apps import cn() from @/lib/utils)
          ...(generatedFiles.some((f) => f.path === "lib/utils.ts")
            ? []
            : [
                {
                  path: "lib/utils.ts",
                  content: `import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`,
                  language: "typescript",
                },
              ]),
          // components.json (shadcn/ui configuration)
          {
            path: "components.json",
            content: JSON.stringify(
              {
                "$schema": "https://ui.shadcn.com/schema.json",
                style: "default",
                rsc: true,
                tsx: true,
                tailwind: {
                  config: "tailwind.config.ts",
                  css: "app/globals.css",
                  baseColor: "slate",
                  cssVariables: true,
                },
                aliases: {
                  components: "@/components",
                  utils: "@/lib/utils",
                },
              },
              null,
              2
            ),
            language: "json",
          },
        ];
      }

      // 2b. Post-process: fix known v0 compatibility issues in generated files
      allFiles = patchV0CompatibilityIssues(allFiles);

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

      console.log("[GitHub] Creating blobs for", allFiles.length, "files...");
      const blobErrors: string[] = [];

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
          const errMsg = error instanceof Error ? error.message : String(error);
          console.error("[GitHub] Failed to create blob for:", file.path, errMsg);
          blobErrors.push(`${file.path}: ${errMsg}`);
        }
      }

      if (treeItems.length === 0) {
        const detail = allFiles.length === 0
          ? "No files found (builderFiles table empty and no scaffold files)"
          : `All ${allFiles.length} blob creations failed: ${blobErrors.slice(0, 3).join("; ")}`;
        throw new Error(`No files could be committed to GitHub. ${detail}`);
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
