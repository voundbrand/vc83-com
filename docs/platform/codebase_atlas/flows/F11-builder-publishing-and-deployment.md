# F11 - Builder, Publishing, and Deployment

## Intent

Transform generated or edited app/page content into deployed experiences via builder state, GitHub/Vercel integrations, and published page objects.

## Entry points

- Builder surfaces: `src/app/builder/*`
- Publishing APIs: `convex/api/v1/publishing.ts`
- Integrations: `convex/integrations/v0.ts`, `convex/integrations/github.ts`, `convex/integrations/vercel.ts`

## Primary anchors

- `convex/builderAppOntology.ts`
- `convex/integrations/v0.ts`
- `convex/integrations/github.ts`
- `convex/integrations/vercel.ts`
- `convex/integrations/selfHealDeploy.ts`
- `convex/publishingOntology.ts`

## Sequence

```mermaid
sequenceDiagram
    participant User
    participant Builder as Builder UI
    participant V0 as v0 Integration
    participant App as Builder App Ontology
    participant GitHub as GitHub Integration
    participant Vercel as Vercel Integration
    participant Publish as Publishing Ontology
    participant DB

    User->>Builder: Generate/edit app or page
    Builder->>V0: Request generation and poll completion
    V0-->>Builder: Chat/version/files/demo URL
    Builder->>App: Persist builder app + files + metadata
    App->>DB: Store builder state

    Builder->>GitHub: Create/update repository commits
    GitHub-->>Builder: Repo URL + commit SHA
    Builder->>Vercel: Create project/deploy from repo
    Vercel-->>Builder: Deployment URL/status

    alt Deployment failure
        Builder->>Vercel: Fetch build logs
        Builder->>App: Trigger self-heal analysis/fix loop
        App-->>Builder: Updated files and redeploy attempt
    end

    Builder->>Publish: Create/update published page object
    Publish->>DB: Persist public URL, template/theme, analytics flags
    Publish-->>User: Live publish endpoint
```

## Invariants

1. Builder file state is the source of truth for generated app content.
2. Deployment status transitions must be explicit (`deploying`, `deployed`, `failed`).
3. Publishing records must maintain traceability to linked source objects.
