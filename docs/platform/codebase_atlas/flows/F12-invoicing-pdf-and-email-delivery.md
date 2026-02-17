# F12 - Invoicing, PDF Generation, and Email Delivery

## Intent

Convert transactional domain data into invoices/tickets, generate document artifacts, and deliver them through configured email channels.

## Entry points

- `convex/api/v1/invoices.ts`
- Checkout completion hooks in `convex/checkoutSessions.ts`
- Email send actions in `convex/emailDelivery.ts`

## Primary anchors

- `convex/invoicingOntology.ts`
- `convex/consolidatedInvoicing.ts`
- `convex/pdfGeneration.ts`
- `convex/ticketGeneration.ts`
- `convex/emailDelivery.ts`
- `convex/ticketEmailService.ts`

## Sequence

```mermaid
sequenceDiagram
    participant Trigger as Checkout or Invoice Operator
    participant Invoice as Invoicing Runtime
    participant Txn as Transactions/Ticket Runtime
    participant PDF as PDF Generation Runtime
    participant Email as Email Delivery Runtime
    participant Provider as Resend/Email Provider
    participant Storage
    participant DB

    Trigger->>Invoice: Create/update/seal invoice intent
    Invoice->>Txn: Resolve line items and related entities
    Txn->>DB: Read transactions/tickets/contacts
    DB-->>Invoice: Billing payload

    Invoice->>PDF: Generate invoice/ticket/receipt documents
    PDF->>Storage: Store artifact binaries
    Storage-->>PDF: URLs/storage IDs
    PDF->>DB: Persist document linkage metadata

    Invoice->>Email: Send customer/internal notifications
    Email->>Provider: Provider API call with template + attachments
    Provider-->>Email: Delivery result
    Email->>DB: Persist send status and logs

    Invoice-->>Trigger: Final document and delivery status
```

## Invariants

1. Invoice sealing rules must prevent mutable financial history after sealing.
2. Document generation failures must surface explicit error state, not silent success.
3. Email delivery should be retry-aware and track attempts/results.
