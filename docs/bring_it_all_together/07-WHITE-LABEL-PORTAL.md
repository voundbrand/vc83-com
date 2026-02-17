# 07 — White-Label Client Portal

> **UPDATE 2026-02-02:** The portal implementation approach has evolved. Instead of building portal pages inside the l4yercak3 platform, we generate portals via the builder and deploy them to Vercel with custom domains. See [11-BUILDER-PORTAL-TEMPLATE.md](11-BUILDER-PORTAL-TEMPLATE.md) for the full architecture. The sub-org model and data concepts below still apply.
>
> **UPDATE 2026-02-03:** Agent setup and portal generation now happen in a **single builder session**. The builder chat panel in "setup mode" interviews the agency owner, generates agent config + KB docs, and optionally generates a client portal — all without leaving the builder. See [09-GUIDED-SETUP-WIZARD.md](09-GUIDED-SETUP-WIZARD.md).

> The plumber's dashboard. Branded by the agency, showing conversations, bookings, and leads.

---

## Why This Matters

From ICP research (Insight #3): *"Agencies can build AI backends but can't deliver professional client experiences. White-label client portal is THE product."*

The plumber pays 299 EUR/mo. They expect to see something. Today the agency has to screenshot WhatsApp conversations and email them. That's not a product — it's a service.

The client portal gives the plumber:
- A branded dashboard with the agency's logo
- Live conversation feed (what the AI is handling)
- Upcoming bookings
- New leads captured
- Agent performance stats ("Your AI handled 47 inquiries this month")

---

## Architecture: Sub-Organizations

The pricing plan already includes this: Agency tier gets 2 sub-orgs included, +79 EUR each, max 20.

### Data Model

The platform already has multi-tenant isolation via the ontology. Each sub-org is a child organization:

```
Agency Org (parent)
├── Schmidt Sanitär (sub-org) ← plumber sees this
├── Bella Salon (sub-org) ← salon sees this
├── Pizzeria Roma (sub-org) ← restaurant sees this
└── ...
```

Each sub-org has:
- Its own agent(s)
- Its own contacts, bookings, conversations
- Its own media library (knowledge base)
- A user account for the client (plumber)

The agency owner sees ALL sub-orgs from their dashboard. Each client sees only their own.

### Existing Infrastructure

| Need | What Exists | Gap |
|------|-------------|-----|
| Sub-org creation | Organization model exists | Need parent-child relationship field |
| User per sub-org | User/org membership exists | Need "client" role (view-only + limited actions) |
| Data isolation | Ontology is org-scoped | Already works — agents/contacts/bookings are per-org |
| Agent per sub-org | Agent is per-org | Already works — each sub-org gets its own agent |
| Sessions per sub-org | Sessions are per-org | Already works |

### What's Missing

1. **Parent-child org link** — `parentOrganizationId` field on organizations
2. **Client role** — A role between "viewer" and "member" that can see conversations, bookings, leads but not configure agents or access billing
3. **Agency dashboard view** — All sub-orgs in one view with summary stats
4. **Client portal UI** — Simplified dashboard for the end client (plumber)
5. **White-label config** — Agency logo, colors, custom domain on the client portal

---

## Client Portal Pages

### 1. Dashboard (Home)
```
┌─────────────────────────────────────────────────────┐
│  [Agency Logo]  Schmidt Sanitär                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📊 This Month                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ 47       │ │ 12       │ │ 8        │           │
│  │ Anfragen │ │ Termine  │ │ Neue     │           │
│  │ bearbeit.│ │ gebucht  │ │ Kontakte │           │
│  └──────────┘ └──────────┘ └──────────┘           │
│                                                     │
│  📋 Letzte Gespräche                               │
│  ├── Hans M. — "Rohrbruch in der Küche" — vor 2h  │
│  ├── Anna K. — "Termin für Heizungswartung" — 4h  │
│  └── [Alle anzeigen →]                             │
│                                                     │
│  📅 Nächste Termine                                │
│  ├── Mo 3. Feb 09:00 — Hans M. — Rohrbruch       │
│  ├── Di 4. Feb 14:00 — Lisa B. — Wartung          │
│  └── [Kalender öffnen →]                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 2. Conversations
- List of all agent conversations
- Click to expand → full chat transcript
- Filter by status (active, closed, handed off)
- Search by customer name/keyword
- "Take over" button (starts human-in-the-loop for that conversation)

### 3. Bookings
- Calendar view of upcoming appointments
- List view with customer details
- Quick actions: confirm, reschedule, cancel

### 4. Contacts
- CRM view of all captured leads
- Status: new, contacted, booked, converted
- Click to see conversation history

### 5. Knowledge Base (Optional)
- View/edit the FAQ and knowledge base documents
- Add new FAQ entries
- Upload documents (price lists, service descriptions)

---

## Agency Dashboard (Parent View)

The agency owner sees all clients in one view:

```
┌──────────────────────────────────────────────────────────┐
│  Meine Kunden                                            │
├──────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Schmidt Sanitär        47 Anfragen | 12 Termine    │ │
│  │ Agent: Aktiv ●         Kosten: 14.30 EUR           │ │
│  └─────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Bella Salon             89 Anfragen | 34 Termine    │ │
│  │ Agent: Aktiv ●         Kosten: 22.10 EUR           │ │
│  └─────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Pizzeria Roma           23 Anfragen | 8 Reserv.     │ │
│  │ Agent: Pausiert ○      Kosten: 5.20 EUR            │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  Gesamt: 159 Anfragen | 54 Termine | 41.60 EUR Kosten  │
│  [+ Neuen Kunden anlegen]                                │
└──────────────────────────────────────────────────────────┘
```

---

## White-Label Config

Per sub-org (set by agency owner):

| Setting | What It Controls |
|---------|-----------------|
| Logo | Displayed in client portal header |
| Primary color | Button colors, accent colors |
| Business name | Portal title |
| Custom domain | `portal.agency-name.com` (Agency tier) |
| Favicon | Browser tab icon |
| Email sender name | "Schmidt Sanitär" not "l4yercak3" |

---

## Build Approach: Builder-Generated Portal

> **Decision (2026-02-02):** The portal is fully builder-generated and deployed to Vercel. See [11-BUILDER-PORTAL-TEMPLATE.md](11-BUILDER-PORTAL-TEMPLATE.md) for full architecture, implementation checklist, and the new Conversations API category.

The builder already has the connect + scaffold + deploy pipeline. The portal becomes a builder template:

1. During builder setup mode, AI asks "Want me to build a client portal too?"
2. If yes: generates portal pages in the same session (dashboard, messages, invoices, settings)
3. Connect step wires agent config + KB docs + portal to sub-org's real data
4. Publish deploys portal to Vercel with custom domain
5. Alternatively: agency selects "Client Portal" template in a separate builder session

**What still applies from this doc:** Sub-org data model, client role + permissions, agency dashboard (in-platform), white-label config, portal page concepts (Dashboard, Conversations, Bookings, Contacts, KB).

**What's superseded:** The "build portal pages inside the platform" approach. Portal pages are now generated by the builder and deployed as standalone Next.js apps.

**Prototype:** `docs/reference_projects/bring_it_all_together_assets/white-label-customer-portal/freelancer-portal-build/`
