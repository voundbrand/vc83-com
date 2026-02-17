# F4 - Workflow Trigger and Behavior Execution

## Intent

Execute workflow definitions from triggers and run behavior actions in deterministic order.

## Entry points

- `POST /api/v1/workflows/trigger`
- Form and checkout trigger paths that route into workflow execution

## Primary anchors

- `convex/api/v1/workflows.ts`
- `convex/api/v1/workflowsInternal.ts`
- `convex/workflows/behaviorExecutor.ts`
- `convex/workflows/workflowExecution.ts`

## Sequence

```mermaid
sequenceDiagram
    participant Caller as External Caller or Internal Trigger
    participant WfAPI as Workflow API
    participant WfInternal as Workflow Internal Executor
    participant Executor as Behavior Executor
    participant Domain as Domain Actions
    participant DB

    Caller->>WfAPI: Trigger workflow with inputData
    WfAPI->>WfInternal: executeWorkflowInternal
    WfInternal->>DB: Load active workflow by trigger
    DB-->>WfInternal: Workflow + behavior list
    WfInternal->>Executor: executeBehaviors
    loop For each enabled behavior by priority
        Executor->>Domain: executeBehavior(type, config, context)
        Domain->>DB: Persist side effects
        DB-->>Domain: Results
        Domain-->>Executor: Behavior result
    end
    Executor->>DB: Write execution logs
    Executor-->>WfInternal: Aggregate results
    WfInternal-->>WfAPI: Success or error payload
    WfAPI-->>Caller: API response
```

## Invariants

1. Workflow selection requires active status and trigger match.
2. Behavior ordering follows declared priority.
3. Execution logs must capture per-behavior outcomes.
