# NemoClaw Kanzlei Workflow Diagram

Snapshot date: 2026-03-27

```mermaid
flowchart TD
  A[Mother Repo (R&D)] --> B[NemoClaw Fork (Product Code)]
  B --> C[staging/* branch]
  C --> D[Existing Hetzner Server (Staging)]

  D --> E[Agent Rollout + Tests]
  E --> F{Tech + Legal Gates Pass?}

  F -- No --> C
  F -- Yes --> G[Tag Release]
  G --> H[Separate Prod Server (Single Tenant)]
  H --> I[Customer Go-Live]
```

## Reading guide

1. Build on `staging/*`.
2. Deploy and test on existing Hetzner staging.
3. If gates fail, iterate on branch.
4. If gates pass, tag release and deploy to separate single-tenant production.
