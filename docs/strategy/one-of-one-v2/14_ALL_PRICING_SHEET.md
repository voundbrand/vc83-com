# All Pricing Sheet (Store + Stripe + Modules)

Last updated: 2026-03-04  
Runtime verification commands run:
- `npx convex run licensing/helpers:getStorePricingContract`
- `npx convex run stripe/stripePrices:getPlatformPrices`
- `npx convex run stripe/stripePrices:getAllPrices`
- `npx convex run stripe/platformCheckout:getCommercialOfferCatalog`
- `npx convex run stripe/platformCheckout:getCommercialCheckoutReadiness`

**Tax convention:** Consulting Sprint (€3,500) and Foundation setup (€7,000) are net prices (excl. VAT).

## 1) Store Plans and Add-Ons (Runtime Truth)

| Category | Item | Price | Billing | Stripe Price ID / Mode | Should be Stripe Product? | Current Status |
|---|---|---|---|---|---|---|
| Platform plan | Free | €0 | Monthly | No Stripe price | No | Active in store (`free`). |
| Platform plan | Pro | €29 | Monthly | `price_1T10h5EEbynvhkixGqYfKhuJ` (`STRIPE_PRO_MO_PRICE_ID`) | Yes | Active and fetched from Stripe. |
| Platform plan | Pro | €290 | Annual | `price_1T10jjEEbynvhkixduIkzeE6` (`STRIPE_PRO_YR_PRICE_ID`) | Yes | Active and fetched from Stripe. |
| Platform plan | Scale (runtime `agency`) | €299 | Monthly | `price_1T10mUEEbynvhkix8KTWCDEo` (`STRIPE_AGENCY_MO_PRICE_ID`) | Yes | Active and fetched from Stripe. |
| Platform plan | Scale (runtime `agency`) | €2,990 | Annual | `price_1T10nlEEbynvhkixvMyIyoBX` (`STRIPE_AGENCY_YR_PRICE_ID`) | Yes | Active and fetched from Stripe. |
| Platform plan | Enterprise | Custom (from €1,500+/mo in store text) | Custom | No fixed Stripe price | No | Contact-sales/invoice flow. |
| Add-on | Scale sub-organization | €149 | Monthly | Env ID: `price_1SfJQpEEbynvhkixlVSGv8oj` (`STRIPE_SUB_ORG_MO_PRICE_ID`) | Yes | Pricing target updated to €149/mo. Confirm runtime contract/env parity before production rollout. |
| Add-on | Scale sub-organization | €1,490 | Annual | Env ID: `price_1SfJQpEEbynvhkix3sNohHev` (`STRIPE_SUB_ORG_YR_PRICE_ID`) | Yes | Pricing target updated to €1,490/yr. Confirm runtime path reads annual sub-org ID where applicable. |

## 2) Credit Top-Ups (User Chooses Amount)

| Category | Package Rule | Price | Billing | Stripe Price ID / Mode | Should be Stripe Product? | Current Status |
|---|---|---|---|---|---|---|
| Credits | Tier 1 | €1-29 | One-time | Dynamic Stripe price created per checkout (`creditCheckout.ts`) | No (fixed ID not required) | 10 credits/EUR, no bonus. |
| Credits | Tier 2 | €30-99 | One-time | Dynamic Stripe price created per checkout | No (fixed ID not required) | 11 credits/EUR, no bonus. |
| Credits | Tier 3 | €100-249 | One-time | Dynamic Stripe price created per checkout | No (fixed ID not required) | 11 credits/EUR + 100 bonus. |
| Credits | Tier 4 | €250-499 | One-time | Dynamic Stripe price created per checkout | No (fixed ID not required) | 12 credits/EUR + 500 bonus. |
| Credits | Tier 5 | €500-10,000 | One-time | Dynamic Stripe price created per checkout | No (fixed ID not required) | 13 credits/EUR + 1,500 bonus. |
| Credits | Preset quick buys | €30, €60, €100, €250, €500 | One-time | Dynamic Stripe price created per checkout | No (fixed ID not required) | Presets map to 330, 660, 1,200, 3,500, 8,000 credits. |

## 3) Commercial Offer Catalog (`cpmu_v1`)

| Offer Code | Label | Setup Fee | Monthly Fee | Motion | Stripe Price ID / Mode | Should be Stripe Product? | Current Status |
|---|---|---|---|---|---|---|---|
| `layer1_foundation` | Layer 1 Foundation | €7,000 excl. VAT | €499/mo | `checkout_now` | `STRIPE_LAYER1_FOUNDATION_SETUP_PRICE_ID` (mapped in env) | Yes | Landing CTA is checkout-first into Store, then Stripe session when commercial checkout readiness passes in runtime. |
| `layer2_dream_team` | Layer 2 Dream Team | €35,000 | €999/mo | `inquiry_first` | No fixed Stripe price in catalog | No | Lead/sales handoff flow. |
| `layer3_sovereign` | Layer 3 Sovereign | €135,000 | €1,999/mo | `inquiry_first` | No fixed Stripe price in catalog | No | Lead/sales handoff flow. |
| `layer3_sovereign_pro` | Layer 3 Sovereign Pro | €165,000 | €2,499/mo | `inquiry_first` | No fixed Stripe price in catalog | No | Lead/sales handoff flow. |
| `layer3_sovereign_max` | Layer 3 Sovereign Max | €195,000 | €2,999/mo | `inquiry_first` | No fixed Stripe price in catalog | No | Lead/sales handoff flow. |
| `layer4_nvidia_private` | Layer 4 NVIDIA Private | €250,000 | Custom | `invoice_only` | No fixed Stripe price in catalog | No | Invoice-only sales motion. |
| `consult_done_with_you` | Consulting Sprint (Strategy & Scope) | €3,500 excl. VAT | N/A | `checkout_now` | `STRIPE_CONSULT_DONE_WITH_YOU_PRICE_ID` (mapped in env) | Yes | Landing CTA is checkout-first into Store, then Stripe session when commercial checkout readiness passes in runtime. |
| `consult_full_build_scoping` | Implementation Start Scoping | €7,000 excl. VAT | N/A | `inquiry_first` | No fixed Stripe price in catalog | No | Lead/sales handoff flow. |
| `plan_pro_subscription` | Pro Subscription | N/A | €29/mo | `checkout_now` | Uses platform checkout plan IDs (`STRIPE_PRO_MO_PRICE_ID` / `STRIPE_PRO_YR_PRICE_ID`) | Yes | Active via `createPlatformCheckoutSession`; catalog row itself has `stripePriceId: null`. |
| `plan_scale_subscription` | Scale Subscription | N/A | €299/mo | `checkout_now` | Uses platform checkout plan IDs (`STRIPE_AGENCY_MO_PRICE_ID` / `STRIPE_AGENCY_YR_PRICE_ID`) | Yes | Active via `createPlatformCheckoutSession`; catalog row itself has `stripePriceId: null`. |
| `credits_pack` | Credits Pack | Variable | N/A | `checkout_now` | Dynamic Stripe price (no fixed ID) | No (fixed ID not required) | Active via `createCreditCheckoutSession`. |

Readiness snapshot (`getCommercialCheckoutReadiness`):
- Evaluate in the target runtime environment before production launch.
- Landing mapping now targets:
  - `consult_done_with_you` -> `STRIPE_CONSULT_DONE_WITH_YOU_PRICE_ID`
  - `layer1_foundation` -> `STRIPE_LAYER1_FOUNDATION_SETUP_PRICE_ID`

## 3A) One-of-One Landing Commercial CTA Policy

- Commercial CTA policy is checkout-first (Store -> Stripe) for rows that are Stripe-checkout capable.
- No paid-product CTA on the landing should deep-link into chat/conversation surfaces.
- Non-Stripe or not-configured offers use a prefilled `mailto:` CTA to `remington@sevenlayers.io`.
- Prefilled email payload must include: product name, setup price, recurring price, motion/type, `source=one_of_one_landing`, timestamp.
- Mailto subject/body are localized by landing language (`en`, `de`).

## 4) One-of-One Module Pricing (Strategy Docs)

| Module Family | Module | Setup / Project Price | Recurring Price | Should be Stripe Product? | Current Status |
|---|---|---|---|---|---|
| Inference access | BYOK | €0 | €0 module fee | No | Feature/policy flag, not a billable Stripe SKU. |
| Cloud private inference | Cloud Starter | €2,500 | €2,900/mo | Yes | Priced in docs; not currently wired as dedicated Stripe product in runtime catalog. |
| Cloud private inference | Cloud Growth | €6,000 | €7,200/mo | Yes | Priced in docs; not currently wired as dedicated Stripe product in runtime catalog. |
| Cloud private inference | Cloud Enterprise | Custom quote | Custom quote | No | Enterprise quote/invoice motion. |
| On-prem hardware | On-Prem Starter | €11,500 | €600/mo | Yes | Priced in docs; currently sales/invoice motion. |
| On-prem hardware | On-Prem Growth | €43,000 | €1,200/mo | Yes | Priced in docs; currently sales/invoice motion. |
| On-prem hardware | On-Prem Enterprise | €118,000 | €2,400/mo | Yes | Priced in docs; currently sales/invoice motion. |
| Knowledge layer | RAG Pipeline | €8,000-€15,000 | €500-€1,000/mo | No | Range/scope-dependent project pricing. |
| Model customization | Fine-Tuning | €10,000-€25,000 | €3,000-€6,000/yr | No | Scope-dependent services pricing. |
| Governance | Compliance Package | €15,000-€30,000 | N/A | No | Scope-dependent services pricing. |

## 5) Other Stripe Checkout Surfaces in Code

| Surface | Price Model | Stripe Price ID / Mode | Should be Stripe Product? | Current Status |
|---|---|---|---|---|
| AI subscription (`standard`) | Fixed recurring monthly (amount defined in Stripe product) | `STRIPE_AI_STANDARD_PRICE_ID` | Yes | Env key expected by code, not set in current `.env.local`. |
| AI subscription (`privacy-enhanced`) | Fixed recurring monthly (amount defined in Stripe product) | `STRIPE_AI_PRIVACY_ENHANCED_PRICE_ID` | Yes | Env key expected by code, not set in current `.env.local`. |
| Scale trial checkout (legacy action) | 14-day trial on recurring plan | `STRIPE_AGENCY_PRICE_ID` | Yes | Legacy env key expected by `trialCheckout.ts`; not set in current `.env.local`. |
| SMS dedicated number checkout | Variable setup + variable monthly (country/number specific, Infobip + 35% markup) | Dynamic Stripe prices created per checkout (`smsCheckout.ts`) | No (fixed ID not required) | Active dynamic pricing path. |

## Source Files

- `convex/stripe/stripePrices.ts`
- `convex/stripe/platformCheckout.ts`
- `convex/stripe/creditCheckout.ts`
- `convex/stripe/aiCheckout.ts`
- `convex/stripe/smsCheckout.ts`
- `convex/stripe/trialCheckout.ts`
- `src/lib/credit-pricing.ts`
- `docs/strategy/one-of-one-v2/01_PRICING_LADDER.md`
- `docs/strategy/one-of-one-v2/12_PRIVATE_LLM_PROVIDER_BUSINESS_MODEL.md`
- `docs/strategy/one-of-one-v2/13_BUYER_TRANSPARENCY_BRIEF.md`
