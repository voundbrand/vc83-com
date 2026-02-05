# Multichannel Automation System

> Our own "ManyChat/Infobip Moments" - a booking-triggered automation engine with email, SMS, and WhatsApp delivery.

## Overview

This system automatically sends personalized messages to customers at key moments in their journey:

- **Vorher (Before)**: Build anticipation before their booking (7, 3, 1 days before)
- **Während (During)**: Check-ins and support during their experience
- **Nachher (After)**: Follow-up, reviews, upsells, and re-engagement

## Key Concepts

### Sequences
A sequence is a series of automated messages triggered by a booking event. Example: "Segelschule Vorher-Sequenz" sends 3 emails before a sailing course.

### Message Queue
All messages go into a unified queue with a scheduled delivery time. A cron job processes the queue every 5 minutes.

### Channels
- **Email** - via Resend (existing)
- **SMS** - via Infobip
- **WhatsApp** - via Infobip (requires pre-approved templates)

### Templates
Reusable message content with variable placeholders like `{{firstName}}`, `{{eventName}}`, `{{eventDate}}`.

## Quick Links

- [Architecture](./ARCHITECTURE.md) - System design and data flow
- [Schema](./SCHEMA.md) - Database tables and structures
- [Sequences](./SEQUENCES.md) - Gerrit's pre-configured sequences
- [API](./API.md) - Internal functions reference
- [Connections](./CONNECTIONS.md) - **Resend & Infobip as configurable connections**
- [Infobip Integration](./INFOBIP-INTEGRATION.md) - SMS/WhatsApp setup
- [Implementation Checklist](./IMPLEMENTATION-CHECKLIST.md) - Build phases

## Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 0 | Week 0 | **Connections infrastructure** (Resend & Infobip as configurable connections) |
| 1 | Week 1-2 | Core engine + email automation |
| 2 | Week 3 | Full sequences for Gerrit |
| 3 | Week 4 | SMS channel via Infobip |
| 4 | Week 5 | WhatsApp channel |
| 5 | Week 6 | Admin UI + polish |

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────────┐
│                 AUTOMATION ENGINE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐      ┌─────────────────┐                  │
│  │   SEQUENCES     │      │   MESSAGE       │                  │
│  │   (objects)     │──────▶   QUEUE         │                  │
│  │                 │      │   (table)       │                  │
│  │ • trigger event │      │                 │                  │
│  │ • steps[]       │      │ • scheduledFor  │                  │
│  │ • conditions    │      │ • channel       │                  │
│  └────────┬────────┘      │ • status        │                  │
│           │               └────────┬────────┘                  │
│           │                        │                            │
│  Booking  │                        │ Cron (5 min)              │
│  triggers │                        ▼                            │
│           │               ┌─────────────────┐                  │
│           ▼               │   DELIVERY      │                  │
│  ┌─────────────────┐      │   ROUTER        │                  │
│  │   BOOKINGS      │      │                 │                  │
│  │   (objects)     │      │ email → Resend  │                  │
│  │                 │      │ sms → Infobip   │                  │
│  │ confirmed ──────┼──────│ wa → Infobip    │                  │
│  │ checked_in      │      └─────────────────┘                  │
│  │ completed       │                                            │
│  └─────────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
```

## Environment Variables

```env
# Existing
RESEND_API_KEY=...

# New for Infobip
INFOBIP_API_KEY=...
INFOBIP_BASE_URL=https://api.infobip.com
INFOBIP_SMS_SENDER_ID=HaffSegeln
INFOBIP_WHATSAPP_NUMBER=+49...
```

## Key Decisions

1. **Generic System**: Built to be reusable for all organizations, not just Gerrit
2. **Infobip as Provider Only**: We build the automation logic ("Moments"), Infobip just delivers
3. **5-Minute Cron**: Good balance of timeliness vs. cost
4. **Objects Table for Sequences/Templates**: Follows existing ontology pattern
5. **Dedicated messageQueue Table**: High-volume, needs good indexing

## Getting Started

1. Read the [Architecture](./ARCHITECTURE.md) to understand the system
2. Review the [Schema](./SCHEMA.md) for database structure
3. Follow the [Implementation Checklist](./IMPLEMENTATION-CHECKLIST.md) phase by phase
4. Set up [Infobip Integration](./INFOBIP-INTEGRATION.md) for SMS/WhatsApp

## Success Metrics

- Booking creates scheduled messages within 1 second
- Messages delivered within 5 minutes of scheduled time
- 99%+ delivery success rate for email
- 95%+ delivery success rate for SMS
- Admin can create new sequences without code changes
