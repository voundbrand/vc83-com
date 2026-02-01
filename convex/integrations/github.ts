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

  // Phase 1b: v0 generates Tailwind v4 syntax — we now support v4 natively
  // No conversion needed. Keep v0's globals.css as-is.
  console.log("[GitHub] Tailwind v4 CSS kept as-is (scaffold supports v4 natively)");

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
        // NO-SCAFFOLD PATH: Just push v0 files (used by self-heal, etc.)
        // The full scaffold should be provided by the client via scaffoldFiles.
        // When no scaffold is provided, we only push the raw v0 files.
        // Existing scaffold files in the repo are preserved via base_tree.
        console.log("[GitHub] No scaffoldFiles provided — pushing v0 files only (existing repo scaffold preserved via base_tree)");
        allFiles = [...generatedFiles];
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
        sha: string | null;
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

      // 3c. Delete known legacy files that persist via base_tree from old deploys.
      // Setting sha to null in a tree entry removes the file from the tree.
      // We must first check which files actually exist — deleting a non-existent
      // file causes GitHub to return 422 GitRPC::BadObjectState.
      if (baseTreeSha) {
        const legacyFilesToDelete = [
          "lib/layercake.ts",       // Old L4yercak3 SDK wrapper (replaced by lib/api.ts)
          "tailwind.config.ts",     // Not needed in Tailwind v4
          "tailwind.config.js",     // Not needed in Tailwind v4
        ];

        // Fetch the current tree to see which files exist
        let existingPaths: Set<string> = new Set();
        try {
          const baseTree = await githubFetch<{ tree: Array<{ path: string }> }>(
            `/repos/${repoFullName}/git/trees/${baseTreeSha}?recursive=1`,
            accessToken
          );
          existingPaths = new Set(baseTree.tree.map((t) => t.path));
        } catch (err) {
          console.warn("[GitHub] Could not fetch base tree for legacy cleanup:", err);
        }

        // Only delete files that exist in the repo AND aren't being overwritten
        const newFilePaths = new Set(treeItems.map((t: { path?: string }) => t.path));
        for (const legacyPath of legacyFilesToDelete) {
          if (existingPaths.has(legacyPath) && !newFilePaths.has(legacyPath)) {
            treeItems.push({
              path: legacyPath,
              mode: "100644",
              type: "blob",
              sha: null,
            });
            console.log("[GitHub] Marking legacy file for deletion:", legacyPath);
          }
        }
      }

      // 3d. Create tree (with base_tree for existing repos)
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
