# System Landscape

Purpose:
- provide one high-level visual map of how major runtime flows connect
- complement per-flow sequence docs (`flows/F*.md`)

## Platform Runtime Map

```mermaid
flowchart TD
    F1[F1 Identity and Session]
    F2[F2 AI Conversation Runtime]
    F3[F3 Checkout to Fulfillment]
    F4[F4 Workflow Trigger and Execution]
    F5[F5 Webhooks and Channels]
    F6[F6 Affiliate Reward Pipeline]
    F7[F7 Organization Onboarding]
    F8[F8 CRM Forms Events Booking]
    F9[F9 Projects Files Media]
    F10[F10 Template Composition]
    F11[F11 Builder Publishing Deployment]
    F12[F12 Invoicing PDF Email]
    F13[F13 OAuth API Keys Integrations]
    F14[F14 Credits Licensing AI Billing]
    F15[F15 Governance and Runtime Guards]
    F16[F16 Translation Localization]

    F1 --> F7
    F1 --> F13
    F7 --> F2
    F7 --> F14

    F8 --> F3
    F8 --> F4
    F8 --> F12

    F3 --> F12
    F3 --> F14

    F2 --> F5
    F2 --> F14
    F2 --> F15

    F10 --> F3
    F10 --> F11
    F10 --> F12

    F11 --> F5
    F11 --> F15

    F13 --> F5
    F13 --> F15

    F9 --> F11

    F15 --> F2
    F15 --> F3
    F15 --> F8
    F15 --> F11

    F16 --> F2
    F16 --> F8
    F16 --> F9
    F16 --> F11

    F6 --> F14
```

## Reading Guide

1. Use this file for system-level orientation.
2. Use `FLOW_CATALOG.md` for entry points and anchor files.
3. Use `flows/F*.md` for execution details and invariants.
