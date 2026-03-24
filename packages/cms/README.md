# @l4yercak3/cms

Transport-agnostic CMS primitives for shared inline editing across LayerCake site apps.

Phase 1 keeps the package deliberately narrow:

- the package owns shared types plus provider/context state,
- consumer apps own the network transport,
- consumer apps own editor auth, cookies, RBAC, and server-side bridge routes.

The first intended consumer is `apps/segelschule-altwarp`, backed by site-owned `/api/editor/*` and `/api/cms/*` routes that talk to the mother repo CMS functions in `convex/cmsContent.ts`.

## Install

```bash
npm install @l4yercak3/cms
```

## Current Exports

- `CmsProvider`
- `useCms`
- `useCmsLocale`
- `useCmsEditMode`
- `useCmsContent`
- `useCmsImage`
- `EditableContent`
- `EditableHeading`
- `EditableParagraph`
- `EditableText`
- `EditableTextWithLinks`
- `EditableParagraphWithLinks`
- `EditableImage`
- `CmsLocaleSelect`
- `LinkButtonEditor`
- `CmsTransport`
- `CmsContextValue`
- `CmsImageMetadata`
- `CmsContentRecord`

## Transport Contract

```ts
import type { CmsTransport } from "@l4yercak3/cms";

const transport: CmsTransport = {
  async getContent(input) {
    const response = await fetch("/api/cms/content", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return response.json();
  },
  async saveContent(input) {
    const response = await fetch("/api/cms/content", {
      method: "PUT",
      body: JSON.stringify(input),
    });
    return response.json();
  },
  async getImage(input) {
    const response = await fetch("/api/cms/image", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return response.json();
  },
  async uploadImage(input) {
    const formData = new FormData();
    formData.set("file", input.file);
    const response = await fetch("/api/cms/image/upload", {
      method: "POST",
      body: formData,
    });
    return response.json();
  },
  async deleteImage(input) {
    await fetch("/api/cms/image", {
      method: "DELETE",
      body: JSON.stringify(input),
    });
  },
};
```

## Provider

```tsx
"use client";

import { CmsProvider } from "@l4yercak3/cms";

export function AppCmsProvider({ children }: { children: React.ReactNode }) {
  return (
    <CmsProvider
      transport={transport}
      defaultLocale="de"
      availableLocales={["de", "en"]}
    >
      {children}
    </CmsProvider>
  );
}
```

The next step is app-owned bridge work in `apps/segelschule-altwarp` so these package primitives can talk to the mother repo safely through site-local `/api/editor/*` and `/api/cms/*` routes.
