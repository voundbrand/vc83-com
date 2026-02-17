# F10 - Template Composition and Resolution

## Intent

Create reusable templates/template sets and resolve the correct template composition at runtime with deterministic precedence.

## Entry points

- Template management calls in `convex/templateOntology.ts` and `convex/templateSetOntology.ts`
- Runtime resolution via `convex/templateSetResolver.ts`

## Primary anchors

- `convex/templateOntology.ts`
- `convex/templateSetOntology.ts`
- `convex/templateSetResolver.ts`
- `src/templates/registry.ts`

## Sequence

```mermaid
sequenceDiagram
    participant Admin
    participant TemplateAPI as Template/TemplateSet APIs
    participant Resolver as Template Set Resolver
    participant Domain as Checkout/Invoice/Publishing Runtime
    participant Renderer as Template Renderer
    participant DB

    Admin->>TemplateAPI: Create/update template and template set
    TemplateAPI->>DB: Persist template objects + include links

    Domain->>Resolver: resolveTemplateSet(context)
    Resolver->>DB: Evaluate precedence (manual->product->checkout->domain->org->system)
    DB-->>Resolver: Chosen template set + template map
    Resolver-->>Domain: Resolved template IDs and source

    Domain->>Renderer: Render output with resolved templates
    Renderer-->>Domain: Themed/templated output payload
```

## Invariants

1. Resolution precedence is deterministic and auditable.
2. Legacy v1 template-set fields remain backward compatible.
3. Missing org defaults must fall back to system defaults.
