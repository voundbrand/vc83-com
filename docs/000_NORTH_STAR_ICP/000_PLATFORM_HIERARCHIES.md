# L4YERCAK3 Platform Hierarchy — Engineering Context Document

**This document defines the four-level hierarchy of the L4YERCAK3 platform. Every tool, feature, data model, permission, and communication flow must respect these four levels. Keep this hierarchy in mind at all times during development.**

---

## The Four Levels

### Level 1 — Platform

This is L4YERCAK3 itself. The codebase. The infrastructure. The base layer that everything else runs on.

- The platform owns the core data models, authentication, multi-tenancy, billing, and deployment infrastructure
- All other levels exist within the platform's boundaries
- Platform-level operations affect all levels below (migrations, feature flags, global policies)
- The platform operator has super-admin authority across all levels
- When you are writing code that touches the platform level, you are touching the foundation — everything downstream depends on it

**Think of it as:** The operating system.

---

### Level 2 — Agency (Organization)

Agencies are the primary tenants on the platform. They are organizations that sign up for L4YERCAK3 and build their businesses on top of it.

- An agency is an organization with its own users, settings, branding, and configuration
- Agencies can create sub-organizations beneath them
- Agencies access the platform's tools — CRM, events, forms, communications, workflows — scoped to their own tenant
- Agencies configure their own integrations, notification settings, and communication rules
- Agency-level data is isolated from other agencies (multi-tenant boundary)

**Think of it as:** A business that has rented space in your building and set up shop.

---

### Level 3 — Agency's Customer (Sub-Organization)

This is where the agency serves its own clients. The agency creates sub-organizations for each of its customers and delivers white-label solutions to them.

- A Level 3 entity is a sub-organization created by a Level 2 agency
- The agency's customer uses tools and interfaces provided by the agency, often white-labeled so the customer may not know L4YERCAK3 exists
- The agency manages the customer's configuration, branding, and feature access
- Level 3 entities are scoped under their parent agency — they cannot see or interact with other agencies or their customers
- The agency's customer has their own users, data, and settings, but within the boundaries the agency has defined

**Think of it as:** The agency's client, operating in a space the agency has built for them using our platform's tools.

---

### Level 4 — End User (The Customer's Customer)

This is the furthest level of abstraction from the platform. These are the people that the agency's customer is trying to reach — the end consumers.

- Level 4 users have **no direct connection to L4YERCAK3** whatsoever
- They interact only with the solution that the Level 3 customer has deployed (which was built by the Level 2 agency using Level 1 platform tools)
- Their experience is fully mediated — by the web app, the AI agents, the branded interface the agency's customer presents to them
- Level 4 users do not have accounts on L4YERCAK3. They do not see the platform. They do not know it exists.
- Communications with Level 4 users are handled through AI agents and external-facing application interfaces, not through the platform's internal communication system

**Think of it as:** The person who walks into the shop that the agency built for its customer. They just see the shop. They don't know who built it, and they don't need to.

---

## The Chain

```
Level 1: Platform (L4YERCAK3)
  └── Level 2: Agency (Organization on the platform)
        └── Level 3: Agency's Customer (Sub-organization, white-labeled)
              └── Level 4: End User (Customer's customer — no platform connection)
```

---

## Engineering Rules

### 1. Every feature must declare which levels it touches

Before building anything, identify: does this feature operate at Level 1? Level 2? Level 3? Level 4? Multiple levels? Data models, APIs, permissions, and UI must be scoped accordingly.

### 2. Data isolation follows the hierarchy

- Level 2 agencies cannot see each other's data
- Level 3 customers can only see what their parent agency exposes to them
- Level 4 end users see only what the Level 3 application surfaces
- Level 1 (platform) can see everything for administration purposes

### 3. Permissions cascade downward, not upward

- Platform admins can access and manage all levels
- Agency admins can manage their own customers (Level 3) and the end user experience (Level 4), but cannot access the platform level or other agencies
- Agency customers can manage their own end user interactions (Level 4), but cannot access agency-level or platform-level tools
- End users have no administrative access to anything

### 4. Branding and identity shift at each level

- Level 1: L4YERCAK3 branding
- Level 2: Agency's own branding within the platform
- Level 3: White-labeled — the agency's customer may see the agency's brand or their own brand, not L4YERCAK3
- Level 4: Fully abstracted — the end user sees only the customer's brand and interface

### 5. Communication systems must respect level boundaries

- Internal platform communications (chats, feed, notifications) operate at Levels 1–3
- Level 4 communications are external — handled through AI agents, web app interfaces, and external integrations
- Cross-level communication flows must be explicitly designed (see Communications Platform spec)

### 6. When in doubt, ask: "Which level am I building for?"

If you cannot clearly identify the level, stop and clarify before writing code. Building a feature at the wrong level creates permission leaks, data exposure risks, and architectural debt.

---

## Quick Reference

| Level | Entity | Knows About L4YERCAK3? | Has Platform Account? | Managed By |
|---|---|---|---|---|
| 1 | Platform | Yes — it IS the platform | N/A | Platform operator |
| 2 | Agency | Yes | Yes | Platform + self |
| 3 | Agency's Customer | Maybe not (white-label) | Yes (scoped) | Agency |
| 4 | End User | No | No | Agency's Customer |