# Refactoring Plan: Resolving "God Table" Deep Type Instantiation

This directory contains the detailed, phased strategy to resolving the `TS2589` (Deep Type Instantiation) and `TS2590` (Union type too complex) errors plaguing the codebase.

The root cause is the `objects` table in `convex/schemas/ontologySchemas.ts` which uses `v.any()` for `customProperties`. When complex queries interact with this, TypeScript's inference engine enters an infinite recursion loop.

## Phased Approach

### 📄 [01_analysis.md](./01_analysis.md)
Detailed technical breakdown of *why* the error happens. Read this to understand the "Any Trap".

### 🧱 [02_phase_1_firewall.md](./02_phase_1_firewall.md) (Immediate Action)
**"Stop the Bleeding"**.
How to use **Explicit Return Types** and **Interface Casting** to basically "firewall" the recursive types. This allows us to remove `@ts-ignore` without refactoring the database.
*   **Cost**: Low
*   **Risk**: Low
*   **Result**: No more build errors.

### 🛡️ [03_phase_2_types.md](./03_phase_2_types.md) (Safety)
**"Regain Control"**.
Introducing Zod schemas and application-level interfaces to enforce structure on the loose "God Objects".
*   **Cost**: Medium
*   **Risk**: Low
*   **Result**: Safe runtime data handling.

### 🏗️ [04_phase_3_decoupling.md](./04_phase_3_decoupling.md) (Long Term)
**"Fix the Architecture"**.
Moving core business entities (Transactions, Tickets) out of the `objects` God Table and into their own strict tables.
*   **Cost**: High (Migration required)
*   **Risk**: Medium
*   **Result**: Permanent fix, better performance, better developer experience.
