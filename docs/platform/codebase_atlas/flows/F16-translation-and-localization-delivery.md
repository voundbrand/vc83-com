# F16 - Translation and Localization Delivery

## Intent

Resolve language-specific strings for UI and ontology content using namespace-scoped translation loading and runtime object translation.

## Entry points

- `src/contexts/translation-context.tsx`
- `src/hooks/use-namespace-translations.ts`
- `convex/ontologyTranslations.ts`

## Primary anchors

- `convex/ontologyTranslations.ts`
- `convex/translationResolver.ts`
- `convex/translations/*`
- `src/contexts/translation-context.tsx`
- `src/hooks/use-namespace-translations.ts`

## Sequence

```mermaid
sequenceDiagram
    participant User
    participant UI as Translation Context/Hooks
    participant API as Translation Queries
    participant Resolver as Object Translation Resolver
    participant Domain as Ontology Query Runtime
    participant DB

    User->>UI: Choose locale or use detected locale
    UI->>API: getTranslationsByNamespace/getMultipleNamespaces
    API->>DB: Read translation objects by locale + namespace
    DB-->>UI: Key-value translation map
    UI-->>User: Localized window/component strings

    Domain->>Resolver: translateObject/translateObjects for locale
    Resolver->>DB: Load locale translation map
    Resolver-->>Domain: Resolved name/description/custom fields
    Domain-->>User: Localized ontology payloads
```

## Invariants

1. Namespace-scoped translation queries prevent oversized payloads.
2. Missing translations must fail soft (key fallback), not crash runtime.
3. Translation objects remain system-scoped and locale-indexed.
