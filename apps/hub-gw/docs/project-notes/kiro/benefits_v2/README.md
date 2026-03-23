# Benefits Platform V2 - Multi-Payment Architecture

**Project:** Gründungswerft Benefits & Provisionsplattform V2
**Domain:** provision.gruendungswerft.com
**Status:** Planning Phase
**Created:** January 2025

---

## Overview

Benefits Platform V2 extends the original plan with:

1. **Multi-Payment Support** - Stripe, PayPal, MetaMask, Smart Contract Escrow
2. **L4YERCAK3 Integration** - Fill OAuth gaps with existing ontology
3. **Platform Fee Model** - Charge GW organization per transaction
4. **Blockchain Layer** - Optional trustless escrow for high-value commissions

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BENEFITS PLATFORM V2                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      FRONTEND (Next.js)                              │   │
│  │  provision.gruendungswerft.com                                       │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                           │
│  ┌──────────────────────────────┴──────────────────────────────────────┐   │
│  │                      L4YERCAK3 BACKEND (Convex)                      │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │   │
│  │  │  Ontology   │  │  Payment    │  │  Platform   │  │ Blockchain │  │   │
│  │  │  Objects    │  │  Providers  │  │  Fees       │  │ Sync       │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                 │                                           │
│  ┌──────────────────────────────┴──────────────────────────────────────┐   │
│  │                      PAYMENT PROVIDERS                               │   │
│  │                                                                      │   │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────────────┐ │   │
│  │  │ Stripe │  │ PayPal │  │MetaMask│  │ Escrow │  │    Invoice     │ │   │
│  │  │Connect │  │        │  │  ETH   │  │Contract│  │   (Net 30)     │ │   │
│  │  └────────┘  └────────┘  └────────┘  └────────┘  └────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Platform Fee Model

### Fee Structure

| Transaction Type | Platform Fee | Charged To | When Charged |
|-----------------|--------------|------------|--------------|
| Benefit Claim | €0.50 flat | GW Org | On claim |
| Commission Payout (Stripe) | 2.5% | GW Org | On payout |
| Commission Payout (PayPal) | 2.5% | GW Org | On payout |
| Commission Payout (Crypto) | 1.5% | GW Org | On payout |
| Commission Escrow | 1.0% | GW Org | On release |

### Billing Model

```
Monthly Invoice to Gründungswerft:
├── Platform Fees
│   ├── 150 benefit claims × €0.50 = €75.00
│   ├── 45 Stripe payouts × 2.5% avg = €562.50
│   ├── 20 Crypto payouts × 1.5% avg = €150.00
│   └── 5 Escrow releases × 1.0% avg = €25.00
├── Subtotal: €812.50
├── Usage tier discount: -10%
└── Total: €731.25
```

---

## Directory Structure

```
benefits_v2/
├── README.md                    # This file
├── ARCHITECTURE.md              # Detailed system architecture
├── PLATFORM_FEES.md             # Fee model and billing
├── DATA_MODEL.md                # Ontology mapping and schema
│
├── phases/
│   ├── PHASE_1_FOUNDATION.md    # L4YERCAK3 integration, basic benefits
│   ├── PHASE_2_PAYMENTS.md      # Multi-payment provider support
│   ├── PHASE_3_BLOCKCHAIN.md    # MetaMask, escrow contracts
│   ├── PHASE_4_BILLING.md       # Platform fee tracking and invoicing
│   └── PHASE_5_LAUNCH.md        # Testing, deployment, go-live
│
├── specs/
│   ├── API_ENDPOINTS.md         # REST API specification
│   ├── WEBHOOK_EVENTS.md        # Webhook payloads and handling
│   ├── PAYMENT_FLOWS.md         # Payment flow diagrams
│   └── SECURITY.md              # Security considerations
│
└── contracts/
    ├── GWCommissionEscrow.sol   # Solidity escrow contract
    ├── GWMembershipNFT.sol      # Soulbound membership NFT
    └── DEPLOYMENT.md            # Contract deployment guide
```

---

## Key Documents

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Complete system architecture |
| [PLATFORM_FEES.md](./PLATFORM_FEES.md) | Fee model and GW billing |
| [DATA_MODEL.md](./DATA_MODEL.md) | How GW data maps to L4YERCAK3 |
| [Phase 1](./phases/PHASE_1_FOUNDATION.md) | Foundation and integration |
| [Phase 2](./phases/PHASE_2_PAYMENTS.md) | Payment providers |
| [Phase 3](./phases/PHASE_3_BLOCKCHAIN.md) | Blockchain features |

---

## Timeline Overview

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1: Foundation | 2 weeks | OAuth sync, ontology, basic UI |
| Phase 2: Payments | 2 weeks | Stripe, PayPal integration |
| Phase 3: Blockchain | 3 weeks | MetaMask, escrow contract |
| Phase 4: Billing | 1 week | Platform fee tracking |
| Phase 5: Launch | 1 week | Testing, deployment |

**Total: 9 weeks**

---

## Quick Links

- [Original Benefits Platform Plan](../README.md)
- [Chuck's OAuth Info](../testing_email_from_chuck.md)
- [L4YERCAK3 Codebase](/Users/foundbrand_001/Development/vc83-com)

---

## Next Steps

1. Review and finalize [PLATFORM_FEES.md](./PLATFORM_FEES.md)
2. Review [DATA_MODEL.md](./DATA_MODEL.md) for ontology mapping
3. Start [Phase 1](./phases/PHASE_1_FOUNDATION.md)
