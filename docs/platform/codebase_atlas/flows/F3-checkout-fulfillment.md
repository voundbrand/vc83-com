# F3 - Checkout to Fulfillment

## Intent

Turn a checkout payment confirmation into fulfilled purchase items, transactions, and invoice/receipt artifacts.

## Entry points

- `POST /api/v1/checkout/sessions`
- `POST /api/v1/checkout/confirm`

## Primary anchors

- `convex/api/v1/checkout.ts`
- `convex/api/v1/checkoutInternal.ts`
- `convex/checkoutSessions.ts` (`completeCheckoutAndFulfill`)
- `convex/createTransactionsFromCheckout.ts`
- `convex/transactionInvoicing.ts`

## Sequence

```mermaid
sequenceDiagram
    participant Client
    participant CheckoutAPI as Checkout API
    participant Internal as Checkout Internal
    participant Fulfillment as Fulfillment Runtime
    participant Txn as Transaction Layer
    participant Invoice as Invoice/PDF Layer
    participant DB
    participant Storage

    Client->>CheckoutAPI: Create checkout session
    CheckoutAPI->>Internal: createCheckoutSessionInternal
    Internal->>DB: Persist checkout_session
    DB-->>Internal: Session id + payment intent references
    Internal-->>Client: Session details/client secret

    Client->>CheckoutAPI: Confirm payment
    CheckoutAPI->>Internal: confirmPaymentInternal
    Internal->>Fulfillment: completeCheckoutAndFulfill
    Fulfillment->>DB: Create purchase items + fulfill artifacts
    Fulfillment->>Txn: createTransactionsFromCheckout
    Txn->>DB: Create transactions + links
    Fulfillment->>Invoice: Optional invoice/receipt generation
    Invoice->>Storage: Store PDF artifact
    Invoice-->>Fulfillment: Artifact URL/cache ids
    Fulfillment-->>Internal: Success payload
    Internal-->>CheckoutAPI: API result
    CheckoutAPI-->>Client: Transaction + download references
```

## Invariants

1. Fulfillment writes purchase items before transaction linking.
2. Transaction creation is synchronous in checkout completion path.
3. Invoice mode must respect payment path (employer/manual/free/receipt).
