# F8 - CRM, Forms, Events, and Booking Lifecycle

## Intent

Model customers, forms, events, and bookings as linked ontology objects so capture, registration, and event operations run in one domain graph.

## Entry points

- `convex/api/v1/crm.ts`
- `convex/api/v1/forms.ts`
- `convex/api/v1/events.ts`
- `convex/api/v1/bookings.ts`

## Primary anchors

- `convex/crmOntology.ts`
- `convex/formsOntology.ts`
- `convex/eventOntology.ts`
- `convex/bookingOntology.ts`
- `convex/ticketOntology.ts`

## Sequence

```mermaid
sequenceDiagram
    participant User as Internal User or API Client
    participant API as v1 CRM/Forms/Events API
    participant Auth as API Auth Middleware
    participant CRM as CRM Ontology
    participant Forms as Forms Ontology
    participant Events as Event/Booking Ontology
    participant DB

    User->>API: Create/update CRM, form, event, booking resources
    API->>Auth: Authenticate API key/OAuth/session
    Auth-->>API: Organization + scope context

    alt CRM operations
        API->>CRM: Create/update contact or organization
        CRM->>DB: Upsert objects + links + audit actions
    else Form operations
        API->>Forms: Create/publish form and accept submissions
        Forms->>DB: Persist form + response objects
    else Event/booking operations
        API->>Events: Create/publish event and booking capacity data
        Events->>DB: Persist event objects and links
    end

    API-->>User: Structured domain response
```

## Invariants

1. Domain objects remain organization-scoped with explicit subtype/status workflows.
2. Form/event/CRM relationships are represented via object links, not implicit joins.
3. Public submission paths must only expose published/allowed resources.
