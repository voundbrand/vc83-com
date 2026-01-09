# Project Page Slug-Based Routing

## Overview

Replace hardcoded project pages (`/project/rikscha`, `/project/gerrit`) with a dynamic slug-based routing system. Projects in the database control their public page configuration, and a single dynamic route renders them.

**Connects with**: [inline-editing-project-pages.md](./inline-editing-project-pages.md) - slug routing provides the foundation for inline content editing.

## Current State (Hardcoded)

```
/project/rikscha/page.tsx  →  Hardcoded: projectId, organizationId, password, theme
/project/gerrit/page.tsx   →  Hardcoded: projectId, organizationId, password, theme
```

Each page has its own copy of:
- Project IDs
- Password protection logic
- Theme colors
- Full page content

## Target State (Database-Driven)

```
/project/[slug]/page.tsx  →  Looks up project by slug, renders with config from DB
```

All configuration stored in project's `customProperties`:
- `publicPageSlug` - URL slug
- `publicPageEnabled` - Toggle visibility
- `publicPagePassword` - Access protection
- `publicPageTheme` - Color scheme
- `publicPageTemplate` - Which layout to use

---

## Schema Changes

### Project customProperties (new fields)

```typescript
customProperties: {
  // Existing fields...
  projectCode: "PRJ-2025-001",
  priority: "high",
  progress: 50,
  // ...

  // NEW: Public page configuration
  publicPage: {
    enabled: boolean,           // Is public page active?
    slug: string,               // URL slug (unique across org)
    password: string | null,    // Optional password protection
    theme: "amber" | "purple" | "blue" | "green" | "neutral",
    template: "proposal" | "portfolio" | "simple" | "custom",
    title: string | null,       // Override project name for page
    description: string | null, // Meta description for SEO
    logoUrl: string | null,     // Custom logo for the page
    faviconUrl: string | null,  // Custom favicon
    customCss: string | null,   // Advanced: custom CSS overrides
  }
}
```

### Indexes Needed

```typescript
// In convex/schema.ts - objects table already has by_org_type
// We'll query by org + type="project" then filter by slug in code
// OR add a dedicated index if performance requires it
```

---

## Backend Implementation

### 1. New Query: `getProjectBySlug`

**File**: `convex/projectOntology.ts`

```typescript
/**
 * GET PROJECT BY SLUG (Public)
 * Returns project config for public page rendering
 * No authentication required - returns limited public data
 */
export const getProjectBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedSlug = args.slug.toLowerCase().trim();

    // Find project with matching slug across all orgs
    // Note: Slug should be unique, but we'll return first match
    const allProjects = await ctx.db
      .query("objects")
      .filter((q) => q.eq(q.field("type"), "project"))
      .collect();

    const project = allProjects.find((p) => {
      const publicPage = p.customProperties?.publicPage as PublicPageConfig | undefined;
      return publicPage?.slug?.toLowerCase() === normalizedSlug && publicPage?.enabled;
    });

    if (!project) {
      return null;
    }

    const publicPage = project.customProperties?.publicPage as PublicPageConfig;

    // Return only public-safe data
    return {
      projectId: project._id,
      organizationId: project.organizationId,
      name: publicPage.title || project.name,
      description: publicPage.description || project.description,
      theme: publicPage.theme || "purple",
      template: publicPage.template || "simple",
      hasPassword: !!publicPage.password,
      logoUrl: publicPage.logoUrl,
      faviconUrl: publicPage.faviconUrl,
      customCss: publicPage.customCss,
    };
  },
});

/**
 * VERIFY PROJECT PAGE PASSWORD
 * Check if provided password matches project's public page password
 */
export const verifyProjectPagePassword = query({
  args: {
    slug: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedSlug = args.slug.toLowerCase().trim();

    const allProjects = await ctx.db
      .query("objects")
      .filter((q) => q.eq(q.field("type"), "project"))
      .collect();

    const project = allProjects.find((p) => {
      const publicPage = p.customProperties?.publicPage as PublicPageConfig | undefined;
      return publicPage?.slug?.toLowerCase() === normalizedSlug && publicPage?.enabled;
    });

    if (!project) {
      return { valid: false, reason: "not_found" };
    }

    const publicPage = project.customProperties?.publicPage as PublicPageConfig;

    if (!publicPage.password) {
      return { valid: true, reason: "no_password" };
    }

    // Case-insensitive password comparison
    const isValid = publicPage.password.toLowerCase() === args.password.toLowerCase();
    return { valid: isValid, reason: isValid ? "correct" : "incorrect" };
  },
});
```

### 2. New Mutation: `updateProjectPublicPage`

```typescript
/**
 * UPDATE PROJECT PUBLIC PAGE CONFIG
 * Update the public page settings for a project
 */
export const updateProjectPublicPage = mutation({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
    publicPage: v.object({
      enabled: v.boolean(),
      slug: v.string(),
      password: v.optional(v.string()),
      theme: v.optional(v.string()),
      template: v.optional(v.string()),
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      logoUrl: v.optional(v.string()),
      faviconUrl: v.optional(v.string()),
      customCss: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.type !== "project") {
      throw new Error("Project not found");
    }

    // Validate slug uniqueness within organization
    const normalizedSlug = args.publicPage.slug.toLowerCase().trim();

    // Check slug format (alphanumeric + hyphens only)
    if (!/^[a-z0-9-]+$/.test(normalizedSlug)) {
      throw new Error("Slug can only contain lowercase letters, numbers, and hyphens");
    }

    if (normalizedSlug.length < 3 || normalizedSlug.length > 50) {
      throw new Error("Slug must be between 3 and 50 characters");
    }

    // Check for duplicate slugs in same org
    const orgProjects = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", project.organizationId).eq("type", "project")
      )
      .collect();

    const duplicateSlug = orgProjects.find((p) => {
      if (p._id === args.projectId) return false;
      const pp = p.customProperties?.publicPage as PublicPageConfig | undefined;
      return pp?.slug?.toLowerCase() === normalizedSlug;
    });

    if (duplicateSlug) {
      throw new Error(`Slug "${normalizedSlug}" is already in use by another project`);
    }

    // Update project
    await ctx.db.patch(args.projectId, {
      customProperties: {
        ...(project.customProperties || {}),
        publicPage: {
          ...args.publicPage,
          slug: normalizedSlug,
        },
      },
      updatedAt: Date.now(),
    });

    return { success: true, slug: normalizedSlug };
  },
});
```

### 3. Type Definitions

```typescript
// convex/projectOntology.ts (at top of file)

interface PublicPageConfig {
  enabled: boolean;
  slug: string;
  password?: string;
  theme?: "amber" | "purple" | "blue" | "green" | "neutral";
  template?: "proposal" | "portfolio" | "simple" | "custom";
  title?: string;
  description?: string;
  logoUrl?: string;
  faviconUrl?: string;
  customCss?: string;
}
```

---

## Frontend Implementation

### 1. Dynamic Route: `/project/[slug]/page.tsx`

```tsx
"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { ProjectDrawerProvider, ProjectDrawer } from "@/components/project-drawer";
import PasswordProtection from "./PasswordProtection";
import ProjectPageTemplate from "./ProjectPageTemplate";

export default function ProjectPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingStorage, setCheckingStorage] = useState(true);

  // Fetch project config by slug
  const projectConfig = useQuery(api.projectOntology.getProjectBySlug, { slug });

  // Check localStorage for saved password
  useEffect(() => {
    const savedAuth = localStorage.getItem(`project-auth-${slug}`);
    if (savedAuth === "true") {
      setIsAuthenticated(true);
    }
    setCheckingStorage(false);
  }, [slug]);

  // Loading state
  if (projectConfig === undefined || checkingStorage) {
    return <LoadingScreen />;
  }

  // Not found
  if (projectConfig === null) {
    return <NotFoundScreen slug={slug} />;
  }

  // Password protection
  if (projectConfig.hasPassword && !isAuthenticated) {
    return (
      <PasswordProtection
        slug={slug}
        theme={projectConfig.theme}
        onSuccess={() => {
          localStorage.setItem(`project-auth-${slug}`, "true");
          setIsAuthenticated(true);
        }}
      />
    );
  }

  // Render the project page
  return (
    <ProjectDrawerProvider
      config={{
        organizationId: projectConfig.organizationId,
        projectId: projectConfig.projectId,
        theme: projectConfig.theme,
        drawerTitle: "Projekt-Meetings",
      }}
    >
      <ProjectPageTemplate
        config={projectConfig}
        slug={slug}
      />
      <ProjectDrawer />
    </ProjectDrawerProvider>
  );
}
```

### 2. Password Protection Component

```tsx
// /project/[slug]/PasswordProtection.tsx

"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Lock, AlertCircle } from "lucide-react";

interface PasswordProtectionProps {
  slug: string;
  theme: string;
  onSuccess: () => void;
}

export default function PasswordProtection({ slug, theme, onSuccess }: PasswordProtectionProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  const verifyPassword = useQuery(
    api.projectOntology.verifyProjectPagePassword,
    checking ? { slug, password } : "skip"
  );

  // Handle verification result
  useEffect(() => {
    if (verifyPassword?.valid) {
      onSuccess();
    } else if (verifyPassword?.reason === "incorrect") {
      setError(true);
      setChecking(false);
    }
  }, [verifyPassword, onSuccess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setChecking(true);
  };

  const themeColors = {
    amber: { bg: "from-amber-50 to-orange-50", accent: "amber" },
    purple: { bg: "from-purple-50 to-indigo-50", accent: "purple" },
    blue: { bg: "from-blue-50 to-cyan-50", accent: "blue" },
    green: { bg: "from-green-50 to-emerald-50", accent: "green" },
    neutral: { bg: "from-gray-50 to-slate-50", accent: "gray" },
  };

  const colors = themeColors[theme] || themeColors.purple;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${colors.bg} flex items-center justify-center p-4`}>
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-6">
          <Lock className={`mx-auto h-12 w-12 text-${colors.accent}-500 mb-4`} />
          <h1 className="text-xl font-bold text-gray-900">Protected Page</h1>
          <p className="text-gray-600 text-sm mt-2">Enter the password to continue</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle size={16} />
              Incorrect password
            </div>
          )}

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-${colors.accent}-500`}
            autoFocus
          />

          <button
            type="submit"
            disabled={checking || !password}
            className={`w-full mt-4 px-4 py-3 bg-${colors.accent}-600 text-white rounded-lg font-bold hover:bg-${colors.accent}-700 disabled:opacity-50`}
          >
            {checking ? "Checking..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

### 3. Template Selector Component

```tsx
// /project/[slug]/ProjectPageTemplate.tsx

import ProposalTemplate from "./templates/ProposalTemplate";
import PortfolioTemplate from "./templates/PortfolioTemplate";
import SimpleTemplate from "./templates/SimpleTemplate";

interface ProjectPageTemplateProps {
  config: {
    projectId: string;
    organizationId: string;
    name: string;
    description?: string;
    theme: string;
    template: string;
    logoUrl?: string;
    customCss?: string;
  };
  slug: string;
}

export default function ProjectPageTemplate({ config, slug }: ProjectPageTemplateProps) {
  // Apply custom CSS if provided
  useEffect(() => {
    if (config.customCss) {
      const style = document.createElement("style");
      style.textContent = config.customCss;
      document.head.appendChild(style);
      return () => style.remove();
    }
  }, [config.customCss]);

  switch (config.template) {
    case "proposal":
      return <ProposalTemplate config={config} slug={slug} />;
    case "portfolio":
      return <PortfolioTemplate config={config} slug={slug} />;
    case "simple":
    default:
      return <SimpleTemplate config={config} slug={slug} />;
  }
}
```

---

## Admin UI: Public Page Section

### Add to ProjectForm.tsx

```tsx
{/* Public Page Section (only for edit mode) */}
{mode === "edit" && projectId && (
  <div
    className="p-4 border-2"
    style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
  >
    <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
      <Globe size={16} />
      Public Project Page
    </h3>
    <p className="text-xs mb-4" style={{ color: "var(--neutral-gray)" }}>
      Create a public-facing page for this project that clients can access.
    </p>

    {/* Enable Toggle */}
    <div className="mb-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={publicPageEnabled}
          onChange={(e) => setPublicPageEnabled(e.target.checked)}
          className="w-4 h-4"
        />
        <span className="text-sm font-bold">Enable public page</span>
      </label>
    </div>

    {publicPageEnabled && (
      <div className="space-y-4 pl-6 border-l-2" style={{ borderColor: "var(--win95-highlight)" }}>
        {/* Slug */}
        <div>
          <label className="block text-xs font-bold mb-1">URL Slug *</label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">l4yercak3.com/project/</span>
            <input
              type="text"
              value={publicPageSlug}
              onChange={(e) => setPublicPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="my-project"
              className="flex-1 px-2 py-1 text-sm border-2 rounded"
              style={{ border: "var(--win95-border)" }}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-bold mb-1">Password Protection</label>
          <input
            type="text"
            value={publicPagePassword}
            onChange={(e) => setPublicPagePassword(e.target.value)}
            placeholder="Leave empty for no password"
            className="w-full px-2 py-1 text-sm border-2 rounded"
            style={{ border: "var(--win95-border)" }}
          />
        </div>

        {/* Theme */}
        <div>
          <label className="block text-xs font-bold mb-1">Theme</label>
          <select
            value={publicPageTheme}
            onChange={(e) => setPublicPageTheme(e.target.value)}
            className="w-full px-2 py-1 text-sm border-2 rounded"
            style={{ border: "var(--win95-border)" }}
          >
            <option value="purple">Purple (Default)</option>
            <option value="amber">Amber/Orange</option>
            <option value="blue">Blue</option>
            <option value="green">Green</option>
            <option value="neutral">Neutral/Gray</option>
          </select>
        </div>

        {/* Template */}
        <div>
          <label className="block text-xs font-bold mb-1">Page Template</label>
          <select
            value={publicPageTemplate}
            onChange={(e) => setPublicPageTemplate(e.target.value)}
            className="w-full px-2 py-1 text-sm border-2 rounded"
            style={{ border: "var(--win95-border)" }}
          >
            <option value="simple">Simple (Meetings Only)</option>
            <option value="proposal">Proposal (Full Landing Page)</option>
            <option value="portfolio">Portfolio (Project Showcase)</option>
          </select>
        </div>

        {/* Preview Link */}
        {publicPageSlug && (
          <div className="pt-2">
            <a
              href={`/project/${publicPageSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-600 hover:underline flex items-center gap-1"
            >
              <ExternalLink size={12} />
              Preview: l4yercak3.com/project/{publicPageSlug}
            </a>
          </div>
        )}
      </div>
    )}
  </div>
)}
```

---

## Migration Plan

### Phase 1: Backend (1-2 hours)

1. [ ] Add `getProjectBySlug` query to `projectOntology.ts`
2. [ ] Add `verifyProjectPagePassword` query
3. [ ] Add `updateProjectPublicPage` mutation
4. [ ] Run `npx convex dev` to deploy

### Phase 2: Dynamic Route (2-3 hours)

1. [ ] Create `/project/[slug]/page.tsx`
2. [ ] Create `/project/[slug]/PasswordProtection.tsx`
3. [ ] Create `/project/[slug]/ProjectPageTemplate.tsx`
4. [ ] Create `/project/[slug]/templates/SimpleTemplate.tsx` (basic meetings-only view)
5. [ ] Test with a manually-set slug in database

### Phase 3: Admin UI (1-2 hours)

1. [ ] Add public page state variables to `ProjectForm.tsx`
2. [ ] Add public page section UI
3. [ ] Wire up save to `updateProjectPublicPage` mutation
4. [ ] Test creating a new public page from admin

### Phase 4: Migrate Existing Pages (2-3 hours)

1. [ ] Extract rikscha page design into `ProposalTemplate.tsx`
2. [ ] Extract gerrit page design into `ProposalTemplate.tsx` (or separate template)
3. [ ] Set up rikscha project in DB with `publicPage.slug: "rikscha"`
4. [ ] Set up gerrit project in DB with `publicPage.slug: "gerrit"`
5. [ ] Test both pages work through dynamic route
6. [ ] Delete old static `/project/rikscha/page.tsx` and `/project/gerrit/page.tsx`

### Phase 5: Polish (1 hour)

1. [ ] Add loading states
2. [ ] Add error handling
3. [ ] Add SEO meta tags (dynamic title, description)
4. [ ] Run typecheck and lint
5. [ ] Test full flow

---

## Connection to Inline Editing

Once slug routing is complete, inline editing (from `inline-editing-project-pages.md`) can be added:

1. **projectContent table** uses the slug as `projectId`:
   ```typescript
   projectContent: {
     projectId: "rikscha",  // Uses slug for clean keys
     blockId: "hero.title",
     content: { de: "...", en: "..." }
   }
   ```

2. **EditModeProvider** wraps the template:
   ```tsx
   <EditModeProvider projectId={slug}>
     <ProposalTemplate config={config} slug={slug} />
   </EditModeProvider>
   ```

3. **EditableText** components replace static text:
   ```tsx
   <EditableText
     projectId={slug}
     blockId="hero.title"
     defaultValue={config.name}
     as="h1"
   />
   ```

---

## Security Considerations

1. **Slug uniqueness**: Enforced per-organization to prevent conflicts
2. **Password storage**: Stored in plaintext (acceptable for simple page protection, not for user accounts)
3. **Rate limiting**: Consider adding for password verification to prevent brute force
4. **Content sanitization**: Any user-editable content should be sanitized before display
5. **CORS**: Public queries don't require auth, but mutations do

---

## Future Enhancements

- [ ] Custom domains per project (CNAME support)
- [ ] Analytics dashboard for page views
- [ ] A/B testing for templates
- [ ] Webhook notifications when page is viewed
- [ ] PDF export of project page
- [ ] QR code generator for easy sharing
