/**
 * Builder Tool Actions
 *
 * Backend Convex actions that power the agent builder tools.
 * These bridge agent tool calls to the builder ontology + GitHub integration.
 */

import { internalAction } from "../../_generated/server";
import { v } from "convex/values";

// Lazy-load to avoid TS2589
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _internalCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  if (!_internalCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _internalCache = require("../../_generated/api").internal;
  }
  return _internalCache;
}

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * CREATE WEB APP FROM SCHEMA
 * Creates a builder app + generates Next.js scaffold files from a page schema.
 */
export const createWebAppFromSchema = internalAction({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    pageSchema: v.any(),
    conversationId: v.optional(v.id("aiConversations")),
  },
  handler: async (ctx, args) => {
    const internal = getInternal();

    // 1. Create the builder app record
    const { appId, appCode } = await ctx.runMutation(
      internal.ai.tools.internalToolMutations.internalCreateBuilderApp,
      {
        organizationId: args.organizationId,
        userId: args.userId,
        name: args.name,
        description: args.description || `Landing page for ${args.name}`,
        subtype: "custom" as const,
        conversationId: args.conversationId,
      }
    );

    // 2. Convert page schema to Next.js files
    const files = convertPageSchemaToFiles(args.pageSchema, args.name);

    // 3. Store files in builderFiles table
    await ctx.runMutation(
      internal.ai.tools.internalToolMutations.internalUpsertBuilderFiles,
      {
        appId,
        files,
        modifiedBy: "scaffold" as const,
      }
    );

    return { appId, appCode, fileCount: files.length };
  },
});

/**
 * DEPLOY WEB APP
 * Pushes builder app to GitHub and generates Vercel deploy URL.
 */
export const deployWebApp = internalAction({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    appId: v.id("objects"),
    repoName: v.string(),
    isPrivate: v.boolean(),
  },
  handler: async (ctx, args) => {
    const internal = getInternal();

    // 1. Push to GitHub
    const repoResult = await ctx.runAction(
      internal.integrations.github.createRepoFromBuilderAppInternal,
      {
        organizationId: args.organizationId,
        userId: args.userId,
        appId: args.appId,
        repoName: args.repoName,
        isPrivate: args.isPrivate,
      }
    );

    // 2. Generate Vercel deploy URL
    const vercelResult = await ctx.runMutation(
      internal.ai.tools.internalToolMutations.internalGenerateVercelDeployUrl,
      {
        appId: args.appId,
        userId: args.userId,
        githubRepo: repoResult.repoUrl,
      }
    );

    return {
      repoUrl: repoResult.repoUrl,
      cloneUrl: repoResult.cloneUrl,
      vercelDeployUrl: vercelResult.vercelDeployUrl,
      fileCount: repoResult.fileCount,
      defaultBranch: repoResult.defaultBranch,
    };
  },
});

// ============================================================================
// SCAFFOLD GENERATOR
// ============================================================================

interface PageSection {
  id: string;
  type: string;
  props: Record<string, unknown>;
}

interface PageSchema {
  version: string;
  metadata?: {
    title?: string;
    description?: string;
    favicon?: string;
  };
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
    fontFamily?: string;
  };
  sections: PageSection[];
}

/**
 * Convert a page schema JSON into deployable Next.js project files.
 *
 * Generates a complete, self-contained Next.js app with:
 * - Static page rendering from JSON data
 * - Tailwind CSS styling
 * - One component per section type
 * - Zero runtime API calls (fully static)
 */
export function convertPageSchemaToFiles(
  schema: PageSchema,
  appName: string
): Array<{ path: string; content: string; language: string }> {
  const files: Array<{ path: string; content: string; language: string }> = [];

  const safeName = appName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
  const title = schema.metadata?.title || appName;
  const description = schema.metadata?.description || `${appName} - Built with l4yercak3`;

  // 1. package.json
  files.push({
    path: "package.json",
    content: JSON.stringify({
      name: safeName,
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
        lint: "next lint",
      },
      dependencies: {
        next: "^15.1.0",
        react: "^19.0.0",
        "react-dom": "^19.0.0",
        "lucide-react": "^0.468.0",
      },
      devDependencies: {
        typescript: "^5.7.0",
        "@types/node": "^22.0.0",
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        tailwindcss: "^4.0.0",
        "@tailwindcss/postcss": "^4.0.0",
        postcss: "^8.4.0",
      },
    }, null, 2),
    language: "json",
  });

  // 2. tsconfig.json
  files.push({
    path: "tsconfig.json",
    content: JSON.stringify({
      compilerOptions: {
        target: "ES2017",
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
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
    }, null, 2),
    language: "json",
  });

  // 3. next.config.mjs
  files.push({
    path: "next.config.mjs",
    content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
    ],
  },
};

export default nextConfig;
`,
    language: "javascript",
  });

  // 4. postcss.config.mjs (Tailwind v4)
  files.push({
    path: "postcss.config.mjs",
    content: `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
`,
    language: "javascript",
  });

  // 5. app/globals.css (Tailwind v4)
  const primary = schema.theme?.primaryColor || "#2563eb";
  const secondary = schema.theme?.secondaryColor || "#7c3aed";
  files.push({
    path: "app/globals.css",
    content: `@import "tailwindcss";

:root {
  --color-primary: ${primary};
  --color-secondary: ${secondary};
  --color-accent: ${schema.theme?.accentColor || "#f59e0b"};
  --color-background: ${schema.theme?.backgroundColor || "#ffffff"};
  --color-foreground: ${schema.theme?.textColor || "#111827"};
}

body {
  color: var(--color-foreground);
  background: var(--color-background);
  font-family: ${schema.theme?.fontFamily || "'Inter', system-ui, sans-serif"};
}
`,
    language: "css",
  });

  // 6. app/layout.tsx
  files.push({
    path: "app/layout.tsx",
    content: `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: ${JSON.stringify(title)},
  description: ${JSON.stringify(description)},
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
`,
    language: "typescript",
  });

  // 7. data/page-data.json — the raw schema
  files.push({
    path: "data/page-data.json",
    content: JSON.stringify(schema, null, 2),
    language: "json",
  });

  // 8. app/page.tsx — main page rendering all sections
  files.push({
    path: "app/page.tsx",
    content: generateMainPage(schema),
    language: "typescript",
  });

  // 9. Section components
  files.push({ path: "components/sections/hero.tsx", content: generateHeroComponent(), language: "typescript" });
  files.push({ path: "components/sections/features.tsx", content: generateFeaturesComponent(), language: "typescript" });
  files.push({ path: "components/sections/cta.tsx", content: generateCtaComponent(), language: "typescript" });
  files.push({ path: "components/sections/testimonials.tsx", content: generateTestimonialsComponent(), language: "typescript" });
  files.push({ path: "components/sections/pricing.tsx", content: generatePricingComponent(), language: "typescript" });
  files.push({ path: "components/sections/gallery.tsx", content: generateGalleryComponent(), language: "typescript" });
  files.push({ path: "components/sections/team.tsx", content: generateTeamComponent(), language: "typescript" });
  files.push({ path: "components/sections/faq.tsx", content: generateFaqComponent(), language: "typescript" });
  files.push({ path: "components/sections/process.tsx", content: generateProcessComponent(), language: "typescript" });

  return files;
}

// ============================================================================
// MAIN PAGE GENERATOR
// ============================================================================

function generateMainPage(schema: PageSchema): string {
  // Inline the section data directly — no JSON import needed at runtime
  const sectionsJson = JSON.stringify(schema.sections, null, 2);

  return `import { HeroSection } from "@/components/sections/hero";
import { FeaturesSection } from "@/components/sections/features";
import { CtaSection } from "@/components/sections/cta";
import { TestimonialsSection } from "@/components/sections/testimonials";
import { PricingSection } from "@/components/sections/pricing";
import { GallerySection } from "@/components/sections/gallery";
import { TeamSection } from "@/components/sections/team";
import { FaqSection } from "@/components/sections/faq";
import { ProcessSection } from "@/components/sections/process";

/* eslint-disable @typescript-eslint/no-explicit-any */
const SECTION_MAP: Record<string, React.ComponentType<any>> = {
  hero: HeroSection,
  features: FeaturesSection,
  cta: CtaSection,
  testimonials: TestimonialsSection,
  pricing: PricingSection,
  gallery: GallerySection,
  team: TeamSection,
  faq: FaqSection,
  process: ProcessSection,
};

const sections = ${sectionsJson};

export default function Page() {
  return (
    <main className="min-h-screen">
      {sections.map((section: any, i: number) => {
        const Component = SECTION_MAP[section.type];
        if (!Component) return null;
        return <Component key={section.id || i} {...section.props} />;
      })}
    </main>
  );
}
`;
}

// ============================================================================
// SECTION COMPONENT GENERATORS
// ============================================================================

function generateHeroComponent(): string {
  return `/* eslint-disable @typescript-eslint/no-explicit-any */
import Image from "next/image";

interface HeroProps {
  title?: string;
  subtitle?: string;
  alignment?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  backgroundClassName?: string;
  cta?: { text: string; href?: string; variant?: string };
  secondaryCta?: { text: string; href?: string };
  image?: { src: string; alt: string };
  badge?: string;
}

export function HeroSection(props: HeroProps) {
  const {
    title = "Welcome",
    subtitle,
    alignment = "center",
    titleClassName = "",
    subtitleClassName = "",
    backgroundClassName = "",
    cta,
    secondaryCta,
    image,
    badge,
  } = props;

  const isFullBleed = backgroundClassName.includes("bg-") || backgroundClassName.includes("from-");
  const alignClass = alignment === "left" ? "text-left items-start" : "text-center items-center";

  return (
    <section className={\`relative min-h-[70vh] flex items-center justify-center px-6 py-24 \${backgroundClassName}\`}>
      {image && isFullBleed && (
        <Image
          src={image.src}
          alt={image.alt || title}
          fill
          className="object-cover z-0"
          priority
        />
      )}
      {isFullBleed && <div className="absolute inset-0 bg-black/40 z-[1]" />}
      <div className={\`relative z-10 max-w-4xl mx-auto flex flex-col gap-6 \${alignClass}\`}>
        {badge && (
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/20 text-sm font-medium backdrop-blur-sm border border-white/30">
            {badge}
          </span>
        )}
        <h1 className={\`text-4xl md:text-6xl font-bold leading-tight \${titleClassName}\`}>
          {title}
        </h1>
        {subtitle && (
          <p className={\`text-lg md:text-xl max-w-2xl \${subtitleClassName}\`}>
            {subtitle}
          </p>
        )}
        <div className="flex flex-wrap gap-4 mt-4">
          {cta && (
            <a
              href={cta.href || "#"}
              className="px-8 py-3 rounded-lg bg-white text-gray-900 font-semibold hover:bg-gray-100 transition-colors shadow-lg"
            >
              {cta.text}
            </a>
          )}
          {secondaryCta && (
            <a
              href={secondaryCta.href || "#"}
              className="px-8 py-3 rounded-lg border-2 border-white/60 text-white font-semibold hover:bg-white/10 transition-colors"
            >
              {secondaryCta.text}
            </a>
          )}
        </div>
      </div>
      {image && !isFullBleed && (
        <div className="mt-12 max-w-2xl mx-auto">
          <Image
            src={image.src}
            alt={image.alt || title}
            width={800}
            height={500}
            className="rounded-xl shadow-2xl"
          />
        </div>
      )}
    </section>
  );
}
`;
}

function generateFeaturesComponent(): string {
  return `/* eslint-disable @typescript-eslint/no-explicit-any */

interface Feature {
  icon?: string;
  title: string;
  description: string;
}

interface FeaturesProps {
  title?: string;
  subtitle?: string;
  items?: Feature[];
  columns?: number;
  titleClassName?: string;
  backgroundClassName?: string;
}

export function FeaturesSection(props: FeaturesProps) {
  const {
    title = "Features",
    subtitle,
    items = [],
    columns = 3,
    titleClassName = "",
    backgroundClassName = "",
  } = props;

  const gridCols =
    columns === 2 ? "md:grid-cols-2" :
    columns === 4 ? "md:grid-cols-4" :
    "md:grid-cols-3";

  return (
    <section className={\`px-6 py-20 \${backgroundClassName}\`}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className={\`text-3xl md:text-4xl font-bold mb-4 \${titleClassName}\`}>
            {title}
          </h2>
          {subtitle && <p className="text-lg text-gray-600 max-w-2xl mx-auto">{subtitle}</p>}
        </div>
        <div className={\`grid grid-cols-1 \${gridCols} gap-8\`}>
          {items.map((item: any, i: number) => (
            <div
              key={i}
              className="p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow bg-white"
            >
              {item.icon && (
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mb-4 text-2xl">
                  {item.icon}
                </div>
              )}
              <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
              <p className="text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`;
}

function generateCtaComponent(): string {
  return `interface CtaProps {
  title?: string;
  subtitle?: string;
  cta?: { text: string; href?: string };
  secondaryCta?: { text: string; href?: string };
  backgroundClassName?: string;
  titleClassName?: string;
}

export function CtaSection(props: CtaProps) {
  const {
    title = "Get Started",
    subtitle,
    cta,
    secondaryCta,
    backgroundClassName = "bg-gradient-to-r from-blue-600 to-cyan-600",
    titleClassName = "text-white",
  } = props;

  return (
    <section className={\`px-6 py-20 \${backgroundClassName}\`}>
      <div className="max-w-4xl mx-auto text-center">
        <h2 className={\`text-3xl md:text-4xl font-bold mb-4 \${titleClassName}\`}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">{subtitle}</p>
        )}
        <div className="flex flex-wrap justify-center gap-4">
          {cta && (
            <a
              href={cta.href || "#"}
              className="px-8 py-3 rounded-lg bg-white text-gray-900 font-semibold hover:bg-gray-100 transition-colors"
            >
              {cta.text}
            </a>
          )}
          {secondaryCta && (
            <a
              href={secondaryCta.href || "#"}
              className="px-8 py-3 rounded-lg border-2 border-white/60 text-white font-semibold hover:bg-white/10 transition-colors"
            >
              {secondaryCta.text}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
`;
}

function generateTestimonialsComponent(): string {
  return `/* eslint-disable @typescript-eslint/no-explicit-any */

interface Testimonial {
  quote: string;
  name: string;
  role?: string;
  company?: string;
  avatar?: string;
  rating?: number;
}

interface TestimonialsProps {
  title?: string;
  subtitle?: string;
  items?: Testimonial[];
  backgroundClassName?: string;
  titleClassName?: string;
}

export function TestimonialsSection(props: TestimonialsProps) {
  const {
    title = "What People Say",
    subtitle,
    items = [],
    backgroundClassName = "",
    titleClassName = "",
  } = props;

  return (
    <section className={\`px-6 py-20 \${backgroundClassName}\`}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className={\`text-3xl md:text-4xl font-bold mb-4 \${titleClassName}\`}>
            {title}
          </h2>
          {subtitle && <p className="text-lg text-gray-600 max-w-2xl mx-auto">{subtitle}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {items.map((item: any, i: number) => (
            <div key={i} className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm">
              {item.rating && (
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: item.rating }).map((_, j) => (
                    <span key={j} className="text-yellow-400">★</span>
                  ))}
                </div>
              )}
              <blockquote className="text-gray-700 mb-4 italic">
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <div className="flex items-center gap-3">
                {item.avatar && (
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                    <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-sm">{item.name}</p>
                  {(item.role || item.company) && (
                    <p className="text-xs text-gray-500">
                      {item.role}{item.role && item.company ? ", " : ""}{item.company}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`;
}

function generatePricingComponent(): string {
  return `/* eslint-disable @typescript-eslint/no-explicit-any */

interface PricingPlan {
  name: string;
  price: string;
  period?: string;
  description?: string;
  features?: string[];
  cta?: { text: string; href?: string };
  highlighted?: boolean;
  badge?: string;
}

interface PricingProps {
  title?: string;
  subtitle?: string;
  items?: PricingPlan[];
  backgroundClassName?: string;
  titleClassName?: string;
}

export function PricingSection(props: PricingProps) {
  const {
    title = "Pricing",
    subtitle,
    items = [],
    backgroundClassName = "",
    titleClassName = "",
  } = props;

  return (
    <section className={\`px-6 py-20 \${backgroundClassName}\`}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className={\`text-3xl md:text-4xl font-bold mb-4 \${titleClassName}\`}>
            {title}
          </h2>
          {subtitle && <p className="text-lg text-gray-600 max-w-2xl mx-auto">{subtitle}</p>}
        </div>
        <div className={\`grid grid-cols-1 md:grid-cols-\${Math.min(items.length, 3)} gap-8 max-w-5xl mx-auto\`}>
          {items.map((plan: any, i: number) => (
            <div
              key={i}
              className={\`relative p-8 rounded-2xl border-2 \${
                plan.highlighted
                  ? "border-blue-500 shadow-xl scale-105"
                  : "border-gray-200 shadow-sm"
              } bg-white\`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                  {plan.badge}
                </span>
              )}
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              {plan.description && <p className="text-gray-500 text-sm mb-4">{plan.description}</p>}
              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.period && <span className="text-gray-500 ml-1">/{plan.period}</span>}
              </div>
              {plan.features && (
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f: string, j: number) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <span className="text-green-500">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              )}
              {plan.cta && (
                <a
                  href={plan.cta.href || "#"}
                  className={\`block text-center px-6 py-3 rounded-lg font-semibold transition-colors \${
                    plan.highlighted
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                  }\`}
                >
                  {plan.cta.text}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`;
}

function generateGalleryComponent(): string {
  return `/* eslint-disable @typescript-eslint/no-explicit-any */
import Image from "next/image";

interface GalleryImage {
  src: string;
  alt?: string;
  caption?: string;
}

interface GalleryProps {
  title?: string;
  subtitle?: string;
  items?: GalleryImage[];
  columns?: number;
  backgroundClassName?: string;
  titleClassName?: string;
}

export function GallerySection(props: GalleryProps) {
  const {
    title,
    subtitle,
    items = [],
    columns = 3,
    backgroundClassName = "",
    titleClassName = "",
  } = props;

  const gridCols =
    columns === 2 ? "md:grid-cols-2" :
    columns === 4 ? "md:grid-cols-4" :
    "md:grid-cols-3";

  return (
    <section className={\`px-6 py-20 \${backgroundClassName}\`}>
      <div className="max-w-6xl mx-auto">
        {title && (
          <div className="text-center mb-16">
            <h2 className={\`text-3xl md:text-4xl font-bold mb-4 \${titleClassName}\`}>
              {title}
            </h2>
            {subtitle && <p className="text-lg text-gray-600 max-w-2xl mx-auto">{subtitle}</p>}
          </div>
        )}
        <div className={\`grid grid-cols-1 \${gridCols} gap-4\`}>
          {items.map((item: any, i: number) => (
            <div key={i} className="relative group overflow-hidden rounded-xl aspect-[4/3]">
              <Image
                src={item.src}
                alt={item.alt || "Gallery image"}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {item.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                  <p className="text-white text-sm">{item.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`;
}

function generateTeamComponent(): string {
  return `/* eslint-disable @typescript-eslint/no-explicit-any */
import Image from "next/image";

interface TeamMember {
  name: string;
  role?: string;
  bio?: string;
  image?: string;
  socials?: Record<string, string>;
}

interface TeamProps {
  title?: string;
  subtitle?: string;
  items?: TeamMember[];
  backgroundClassName?: string;
  titleClassName?: string;
}

export function TeamSection(props: TeamProps) {
  const {
    title = "Our Team",
    subtitle,
    items = [],
    backgroundClassName = "",
    titleClassName = "",
  } = props;

  return (
    <section className={\`px-6 py-20 \${backgroundClassName}\`}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className={\`text-3xl md:text-4xl font-bold mb-4 \${titleClassName}\`}>
            {title}
          </h2>
          {subtitle && <p className="text-lg text-gray-600 max-w-2xl mx-auto">{subtitle}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {items.map((member: any, i: number) => (
            <div key={i} className="text-center group">
              <div className="relative w-40 h-40 mx-auto mb-4 rounded-full overflow-hidden bg-gray-100">
                {member.image ? (
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">
                    {member.name.charAt(0)}
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-lg">{member.name}</h3>
              {member.role && <p className="text-sm text-gray-500 mb-2">{member.role}</p>}
              {member.bio && <p className="text-sm text-gray-600">{member.bio}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`;
}

function generateFaqComponent(): string {
  return `"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqProps {
  title?: string;
  subtitle?: string;
  items?: FaqItem[];
  backgroundClassName?: string;
  titleClassName?: string;
}

export function FaqSection(props: FaqProps) {
  const {
    title = "FAQ",
    subtitle,
    items = [],
    backgroundClassName = "",
    titleClassName = "",
  } = props;

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className={\`px-6 py-20 \${backgroundClassName}\`}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className={\`text-3xl md:text-4xl font-bold mb-4 \${titleClassName}\`}>
            {title}
          </h2>
          {subtitle && <p className="text-lg text-gray-600 max-w-2xl mx-auto">{subtitle}</p>}
        </div>
        <div className="space-y-4">
          {items.map((item: any, i: number) => (
            <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full px-6 py-4 flex justify-between items-center text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium">{item.question}</span>
                <span className={\`transform transition-transform \${openIndex === i ? "rotate-180" : ""}\`}>
                  ▼
                </span>
              </button>
              {openIndex === i && (
                <div className="px-6 pb-4 text-gray-600">{item.answer}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`;
}

function generateProcessComponent(): string {
  return `/* eslint-disable @typescript-eslint/no-explicit-any */

interface ProcessStep {
  title: string;
  description: string;
  icon?: string;
}

interface ProcessProps {
  title?: string;
  subtitle?: string;
  items?: ProcessStep[];
  backgroundClassName?: string;
  titleClassName?: string;
}

export function ProcessSection(props: ProcessProps) {
  const {
    title = "How It Works",
    subtitle,
    items = [],
    backgroundClassName = "",
    titleClassName = "",
  } = props;

  return (
    <section className={\`px-6 py-20 \${backgroundClassName}\`}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className={\`text-3xl md:text-4xl font-bold mb-4 \${titleClassName}\`}>
            {title}
          </h2>
          {subtitle && <p className="text-lg text-gray-600 max-w-2xl mx-auto">{subtitle}</p>}
        </div>
        <div className="space-y-12">
          {items.map((step: any, i: number) => (
            <div key={i} className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                {step.icon || i + 1}
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`;
}
