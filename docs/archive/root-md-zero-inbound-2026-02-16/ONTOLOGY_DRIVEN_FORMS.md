# 🧠 Ontology-Driven Form System

**Status:** ✅ Architecture Complete, Ready for Integration

---

## 🎯 The Problem We Solved

**Before:** Each template needs a custom form component (landing-page-form.tsx, blog-form.tsx, etc.)
**After:** ONE dynamic form generator reads template schemas and builds forms automatically! 🚀

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     TEMPLATE SCHEMA                         │
│  /src/templates/web/landing-page/schema.ts                  │
│                                                              │
│  Defines:                                                    │
│  - Content structure (hero, features, testimonials)         │
│  - Field types (text, textarea, repeater, url)             │
│  - Validation rules (required, maxLength)                   │
│  - UI hints (placeholder, helpText)                         │
│  - Default content for new pages                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                 DYNAMIC FORM GENERATOR                       │
│  /src/components/.../dynamic-form-generator.tsx             │
│                                                              │
│  Reads schema and generates:                                 │
│  - Sections with expand/collapse                            │
│  - Input fields based on field type                         │
│  - Repeater fields with add/remove                          │
│  - Nested object support                                    │
│  - Automatic validation                                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                       CREATE PAGE TAB                        │
│  /src/components/.../create-page-tab.tsx                    │
│                                                              │
│  Uses:                                                       │
│  - getTemplateSchema(templateCode) to load schema           │
│  - <DynamicFormGenerator schema={...} content={...} />     │
│  - Stores templateContent in database                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 What We Built

### **1. Schema Type System** ✅

**File:** `/src/templates/schema-types.ts`

Defines all possible field types and schema structure:

```typescript
export enum FieldType {
  Text = "text",
  Textarea = "textarea",
  Number = "number",
  Boolean = "boolean",
  Url = "url",
  Email = "email",
  Image = "image",
  Icon = "icon",
  TextArray = "text-array",  // ["item1", "item2"]
  Repeater = "repeater",      // [{...}, {...}]
  Object = "object",          // {...}
}

export interface TemplateContentSchema<T> {
  templateCode: string;
  templateName: string;
  description?: string;
  defaultContent: T;
  sections: SectionDefinition[];
}
```

### **2. Landing Page Schema** ✅

**File:** `/src/templates/web/landing-page/schema.ts`

Defines the landing page content structure:

```typescript
export interface LandingPageContent {
  hero: { headline, subheadline, ctaText, ctaUrl, backgroundImage };
  features: [{ title, description, icon }];
  testimonials: [{ quote, author, role, avatar }];
  pricing: { plans: [{ name, price, features[], ctaText, ctaUrl }] };
  footer: { companyName, links, socialLinks };
}

export const landingPageSchema: TemplateContentSchema<LandingPageContent> = {
  templateCode: "landing-page",
  templateName: "Landing Page",
  defaultContent: { /* ... */ },
  sections: [
    {
      id: "hero",
      label: "Hero Section",
      fields: [
        { id: "hero.headline", type: FieldType.Text, required: true, ... },
        { id: "hero.subheadline", type: FieldType.Textarea, ... },
        { id: "hero.ctaText", type: FieldType.Text, ... },
        { id: "hero.ctaUrl", type: FieldType.Url, ... },
      ]
    },
    {
      id: "features",
      label: "Features",
      type: FieldType.Repeater,
      fields: [
        { id: "title", type: FieldType.Text, ... },
        { id: "description", type: FieldType.Textarea, ... },
      ]
    },
    // ... testimonials, pricing, footer sections
  ]
}
```

### **3. Dynamic Form Generator** ✅

**File:** `/src/components/.../dynamic-form-generator.tsx`

Automatically generates forms from schema:

**Features:**
- ✅ Reads `TemplateContentSchema` and generates UI
- ✅ Sections with expand/collapse accordions
- ✅ All field types supported (text, textarea, url, boolean, repeater, etc.)
- ✅ Repeater fields with add/remove buttons
- ✅ Nested object support (dot notation: `hero.headline`)
- ✅ Validation UI (required fields, maxLength)
- ✅ Help text and placeholders from schema

**Usage:**
```tsx
import { DynamicFormGenerator } from "./dynamic-form-generator";
import { getTemplateSchema } from "@/templates/registry";

const schema = getTemplateSchema("landing-page");

<DynamicFormGenerator
  schema={schema}
  content={pageContent}
  onChange={setPageContent}
/>
```

### **4. Template Registry** ✅

**File:** `/src/templates/registry.ts`

Maps template codes to components AND schemas:

```typescript
// Template components (for rendering pages)
export const templateRegistry = {
  "landing-page": LandingPageTemplate,
};

// Template schemas (for editing pages)
export const templateSchemaRegistry = {
  "landing-page": landingPageSchema,
};

// Helper functions
export function getTemplateSchema(code: string): TemplateContentSchema;
export function getTemplateComponent(code: string): TemplateComponent;
export function getTemplateMetadata(code: string): { code, name, description };
```

---

## 🎨 UI Design

### **Create Page Tab Layout**

```
┌─────────────────────────────────────────────────────────────┐
│                     CREATE PAGE TAB                          │
├─────────────────────────────┬───────────────────────────────┤
│ LEFT (40%)                  │ RIGHT (60%)                   │
│                             │                               │
│ [Template Selector ▼]       │ ┌─────────────────────────┐  │
│ [Theme Selector ▼]          │ │   LIVE PREVIEW          │  │
│                             │ │                         │  │
│ Page Title: [___________]   │ │   Hero: [Headline]      │  │
│ Page Slug: [___________]    │ │   [Subheadline]         │  │
│ Description: [_________]    │ │   [CTA Button]          │  │
│                             │ │                         │  │
│ ┌─────────────────────────┐ │ │   Features:            │  │
│ │ ▼ Hero Section         │ │ │   - Feature 1           │  │
│ │   Headline: [______]    │ │ │   - Feature 2           │  │
│ │   Subheadline: [____]   │ │ │   - Feature 3           │  │
│ │   CTA Text: [_______]   │ │ │                         │  │
│ │   CTA URL: [________]   │ │ │   (Updates in real-time │  │
│ └─────────────────────────┘ │ │    as you type!)        │  │
│                             │ └─────────────────────────┘  │
│ ┌─────────────────────────┐ │                               │
│ │ ▶ Features             │ │                               │
│ └─────────────────────────┘ │                               │
│                             │                               │
│ ┌─────────────────────────┐ │                               │
│ │ ▶ Testimonials         │ │                               │
│ └─────────────────────────┘ │                               │
│                             │                               │
│ [Save as Draft] [Publish]   │                               │
└─────────────────────────────┴───────────────────────────────┘
```

---

## 🔄 Integration Steps

### **Step 1: Update Create Page Tab** 🚧

**File:** `/src/components/.../create-page-tab.tsx`

Add content editing below template/theme selection:

```tsx
import { getTemplateSchema } from "@/templates/registry";
import { DynamicFormGenerator } from "./template-content-forms/dynamic-form-generator";

export function CreatePageTab() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [pageContent, setPageContent] = useState<Record<string, unknown>>({});

  // Load schema when template is selected
  useEffect(() => {
    if (selectedTemplateId) {
      const schema = getTemplateSchema(selectedTemplateId);
      setPageContent(schema.defaultContent);
    }
  }, [selectedTemplateId]);

  return (
    <div className="grid grid-cols-5 gap-4">
      {/* LEFT: Form */}
      <div className="col-span-2 space-y-4">
        {/* Template/Theme Selection */}
        {/* ... existing code ... */}

        {/* NEW: Dynamic Content Form */}
        {selectedTemplateId && (
          <div className="border-t-2 border-gray-400 pt-4">
            <h4 className="text-xs font-bold mb-3">Page Content</h4>
            <DynamicFormGenerator
              schema={getTemplateSchema(selectedTemplateId)}
              content={pageContent}
              onChange={setPageContent}
            />
          </div>
        )}

        <button onClick={handleCreate}>Create Page</button>
      </div>

      {/* RIGHT: Live Preview */}
      <div className="col-span-3">
        <LivePreview
          template={selectedTemplateId}
          theme={selectedThemeId}
          content={pageContent}
        />
      </div>
    </div>
  );
}
```

### **Step 2: Update Database Schema** 🚧

Store `templateContent` in `customProperties`:

```typescript
// In createPublishedPage mutation
{
  type: "published_page",
  name: pageTitle,
  customProperties: {
    slug: pageSlug,
    publicUrl: `https://app.l4yercak3.com/p/${orgSlug}/${pageSlug}`,
    metaTitle: pageTitle,
    metaDescription: metaDescription,
    templateCode: selectedTemplateId,
    themeCode: selectedThemeId,

    // NEW: Store template content
    templateContent: pageContent  // { hero: {...}, features: [...], ... }
  }
}
```

### **Step 3: Wire Up Edit Button** 🚧

**File:** `/src/components/.../published-pages-tab.tsx`

```tsx
const handleEdit = (page: PublishedPage) => {
  setActiveTab("create");
  setEditMode({
    pageId: page._id,
    pageData: page
  });
};
```

**In create-page-tab.tsx:**
```tsx
// If editMode, pre-populate form
useEffect(() => {
  if (editMode?.pageData) {
    const page = editMode.pageData;
    setMetaTitle(page.customProperties.metaTitle);
    setSlug(page.customProperties.slug);
    setSelectedTemplateId(page.customProperties.templateCode);
    setSelectedThemeId(page.customProperties.themeCode);
    setPageContent(page.customProperties.templateContent || {});
  }
}, [editMode]);
```

### **Step 4: Update Live Preview** 🚧

**File:** `/src/components/.../live-preview.tsx` (NEW)

Render template with actual content:

```tsx
export function LivePreview({ template, theme, content }) {
  const TemplateComponent = getTemplateComponent(template);
  const themeObj = getTheme(theme);

  return (
    <div className="border-2 border-gray-400 bg-white overflow-auto">
      <TemplateComponent
        page={{ name: "Preview", customProperties: { ... } }}
        data={{ name: "Preview", customProperties: content }}
        organization={{ name: "Your Org" }}
        theme={themeObj}
      />
    </div>
  );
}
```

---

## ✅ Benefits of This Approach

### **For Developers**
- ✅ **Add new templates** without writing form components
- ✅ **Schema is single source of truth** for content structure
- ✅ **Type-safe** with TypeScript interfaces
- ✅ **Automatic validation** from schema rules
- ✅ **Easy to extend** with new field types

### **For Users**
- ✅ **Consistent UI** across all templates
- ✅ **Live preview** updates as they type
- ✅ **Intuitive forms** with help text and validation
- ✅ **Same UI** for creating and editing pages

---

## 🚀 Next Steps

1. ✅ **Schema system created** - Complete!
2. ✅ **Dynamic form generator** - Complete!
3. ✅ **Template registry updated** - Complete!
4. 🚧 **Integrate into create-page-tab** - Next!
5. 🚧 **Update database mutations** - Next!
6. 🚧 **Wire up edit button** - Next!
7. 🔜 **Build live preview component** - Future
8. 🔜 **Public page rendering** - Future

---

## 📖 How to Add a New Template

```typescript
// 1. Create template component
export function BlogPostTemplate({ page, data, theme }: TemplateProps) {
  return <div>...</div>;
}

// 2. Create template schema
export const blogPostSchema: TemplateContentSchema<BlogPostContent> = {
  templateCode: "blog-post",
  templateName: "Blog Post",
  defaultContent: { title: "", content: "", author: "" },
  sections: [
    {
      id: "content",
      label: "Blog Content",
      fields: [
        { id: "title", type: FieldType.Text, ... },
        { id: "content", type: FieldType.RichText, ... },
        { id: "author", type: FieldType.Text, ... },
      ]
    }
  ]
};

// 3. Register in registry.ts
export const templateRegistry = {
  "landing-page": LandingPageTemplate,
  "blog-post": BlogPostTemplate  // ← Add here
};

export const templateSchemaRegistry = {
  "landing-page": landingPageSchema,
  "blog-post": blogPostSchema  // ← Add here
};
```

**That's it!** The form generator automatically handles the new template! 🎉

---

## 🧪 Field Types Supported

- ✅ **Text** - Single-line text input
- ✅ **Textarea** - Multi-line text
- ✅ **Boolean** - Checkbox
- ✅ **Url** - URL input with validation
- ✅ **TextArray** - Array of strings with add/remove
- ✅ **Repeater** - Array of objects with nested fields
- 🔜 **RichText** - WYSIWYG editor (future)
- 🔜 **Image** - Image upload (future)
- 🔜 **Number** - Numeric input (future)
- 🔜 **Select** - Dropdown (future)

---

**Status:** ✅ Ready for integration into create-page-tab.tsx!
