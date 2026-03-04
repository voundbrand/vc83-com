export type LandingPricingLanguage = "en" | "de";

export type LandingPricingCheckoutKey =
  | "plan_pro_monthly"
  | "plan_pro_annual"
  | "plan_scale_monthly"
  | "plan_scale_annual"
  | "sub_org_monthly"
  | "sub_org_annual"
  | "credits"
  | "consult_done_with_you"
  | "layer1_foundation";

export interface LandingPricingRow {
  item: string;
  setup: string;
  recurring: string;
  motion: string;
  checkoutKey?: LandingPricingCheckoutKey;
  highlight?: boolean;
}

export interface LandingPricingCategory {
  title: string;
  note?: string;
  rows: LandingPricingRow[];
}

export interface LandingPricingSheet {
  headline: string;
  subheadline: string;
  offerLabel: string;
  setupLabel: string;
  recurringLabel: string;
  motionLabel: string;
  categories: LandingPricingCategory[];
}

export const landingPricingSheets: Record<LandingPricingLanguage, LandingPricingSheet> = {
  en: {
    headline: "Full pricing reference",
    subheadline:
      "Transparent setup fees, recurring fees, and delivery modules based on our current pricing sheet.",
    offerLabel: "Offer",
    setupLabel: "Setup / Project",
    recurringLabel: "Recurring",
    motionLabel: "Motion",
    categories: [
      {
        title: "Platform plans and add-ons",
        rows: [
          { item: "Free", setup: "€0", recurring: "€0 / mo", motion: "Active" },
          { item: "Pro (Monthly)", setup: "-", recurring: "€29 / mo", motion: "Stripe checkout", checkoutKey: "plan_pro_monthly" },
          { item: "Pro (Annual)", setup: "-", recurring: "€290 / yr", motion: "Stripe checkout", checkoutKey: "plan_pro_annual" },
          { item: "Scale (Monthly)", setup: "-", recurring: "€299 / mo", motion: "Stripe checkout", checkoutKey: "plan_scale_monthly" },
          { item: "Scale (Annual)", setup: "-", recurring: "€2,990 / yr", motion: "Stripe checkout", checkoutKey: "plan_scale_annual" },
          { item: "Enterprise", setup: "Custom", recurring: "From €1,500+ / mo", motion: "Sales / invoice" },
          { item: "Scale sub-organization add-on (Monthly)", setup: "-", recurring: "€149 / mo", motion: "Stripe add-on", checkoutKey: "sub_org_monthly" },
          { item: "Scale sub-organization add-on (Annual)", setup: "-", recurring: "€1,490 / yr", motion: "Stripe add-on", checkoutKey: "sub_org_annual" },
        ],
      },
      {
        title: "Credit top-ups",
        rows: [
          { item: "Tier 1", setup: "€1 - €29", recurring: "One-time", motion: "10 credits / EUR", checkoutKey: "credits" },
          { item: "Tier 2", setup: "€30 - €99", recurring: "One-time", motion: "11 credits / EUR", checkoutKey: "credits" },
          { item: "Tier 3", setup: "€100 - €249", recurring: "One-time", motion: "11 credits / EUR + 100 bonus", checkoutKey: "credits" },
          { item: "Tier 4", setup: "€250 - €499", recurring: "One-time", motion: "12 credits / EUR + 500 bonus", checkoutKey: "credits" },
          { item: "Tier 5", setup: "€500 - €10,000", recurring: "One-time", motion: "13 credits / EUR + 1,500 bonus", checkoutKey: "credits" },
        ],
      },
      {
        title: "One-of-One core offers",
        note: "Checkout-now offers route to Stripe when price IDs are configured.",
        rows: [
          { item: "Free Diagnostic", setup: "€0", recurring: "€0", motion: "Lead qualification", highlight: true },
          { item: "Consulting Sprint", setup: "€3,500 excl. VAT", recurring: "-", motion: "Checkout now", checkoutKey: "consult_done_with_you", highlight: true },
          { item: "Layer 1 Foundation", setup: "€7,000 excl. VAT", recurring: "€499 / mo", motion: "Checkout now", checkoutKey: "layer1_foundation", highlight: true },
          { item: "Layer 2 Dream Team", setup: "€35,000", recurring: "€999 / mo", motion: "Inquiry first" },
          { item: "Layer 3 Sovereign", setup: "€135,000", recurring: "€1,999 / mo", motion: "Inquiry first" },
          { item: "Layer 3 Sovereign Pro", setup: "€165,000", recurring: "€2,499 / mo", motion: "Inquiry first" },
          { item: "Layer 3 Sovereign Max", setup: "€195,000", recurring: "€2,999 / mo", motion: "Inquiry first" },
          { item: "Layer 4 NVIDIA Private", setup: "€250,000", recurring: "Custom", motion: "Invoice only" },
        ],
      },
      {
        title: "Cloud private inference modules",
        rows: [
          { item: "BYOK", setup: "€0", recurring: "€0 module fee", motion: "Policy / feature flag" },
          { item: "Cloud Starter", setup: "€2,500", recurring: "€2,900 / mo", motion: "Module" },
          { item: "Cloud Growth", setup: "€6,000", recurring: "€7,200 / mo", motion: "Module" },
          { item: "Cloud Enterprise", setup: "Custom", recurring: "Custom", motion: "Quote" },
        ],
      },
      {
        title: "On-prem hardware modules",
        rows: [
          { item: "On-Prem Starter", setup: "€11,500", recurring: "€600 / mo", motion: "Module" },
          { item: "On-Prem Growth", setup: "€43,000", recurring: "€1,200 / mo", motion: "Module" },
          { item: "On-Prem Enterprise", setup: "€118,000", recurring: "€2,400 / mo", motion: "Module" },
        ],
      },
      {
        title: "Delivery and compliance modules",
        rows: [
          { item: "RAG Pipeline", setup: "€8,000 - €15,000", recurring: "€500 - €1,000 / mo", motion: "Scope-dependent" },
          { item: "Fine-Tuning", setup: "€10,000 - €25,000", recurring: "€3,000 - €6,000 / yr", motion: "Scope-dependent" },
          { item: "Compliance Package", setup: "€15,000 - €30,000", recurring: "-", motion: "Scope-dependent" },
        ],
      },
    ],
  },
  de: {
    headline: "Vollständige Preisübersicht",
    subheadline:
      "Transparente Setup-Gebühren, laufende Gebühren und Delivery-Module auf Basis unseres aktuellen Pricing Sheets.",
    offerLabel: "Angebot",
    setupLabel: "Setup / Projekt",
    recurringLabel: "Laufend",
    motionLabel: "Motion",
    categories: [
      {
        title: "Plattform-Pläne und Add-ons",
        rows: [
          { item: "Free", setup: "€0", recurring: "€0 / Monat", motion: "Aktiv" },
          { item: "Pro (Monatlich)", setup: "-", recurring: "€29 / Monat", motion: "Stripe Checkout", checkoutKey: "plan_pro_monthly" },
          { item: "Pro (Jährlich)", setup: "-", recurring: "€290 / Jahr", motion: "Stripe Checkout", checkoutKey: "plan_pro_annual" },
          { item: "Scale (Monatlich)", setup: "-", recurring: "€299 / Monat", motion: "Stripe Checkout", checkoutKey: "plan_scale_monthly" },
          { item: "Scale (Jährlich)", setup: "-", recurring: "€2.990 / Jahr", motion: "Stripe Checkout", checkoutKey: "plan_scale_annual" },
          { item: "Enterprise", setup: "Individuell", recurring: "Ab €1.500+ / Monat", motion: "Sales / Rechnung" },
          { item: "Scale Sub-Organization Add-on (Monatlich)", setup: "-", recurring: "€149 / Monat", motion: "Stripe Add-on", checkoutKey: "sub_org_monthly" },
          { item: "Scale Sub-Organization Add-on (Jährlich)", setup: "-", recurring: "€1.490 / Jahr", motion: "Stripe Add-on", checkoutKey: "sub_org_annual" },
        ],
      },
      {
        title: "Credit Top-ups",
        rows: [
          { item: "Tier 1", setup: "€1 - €29", recurring: "Einmalig", motion: "10 Credits / EUR", checkoutKey: "credits" },
          { item: "Tier 2", setup: "€30 - €99", recurring: "Einmalig", motion: "11 Credits / EUR", checkoutKey: "credits" },
          { item: "Tier 3", setup: "€100 - €249", recurring: "Einmalig", motion: "11 Credits / EUR + 100 Bonus", checkoutKey: "credits" },
          { item: "Tier 4", setup: "€250 - €499", recurring: "Einmalig", motion: "12 Credits / EUR + 500 Bonus", checkoutKey: "credits" },
          { item: "Tier 5", setup: "€500 - €10.000", recurring: "Einmalig", motion: "13 Credits / EUR + 1.500 Bonus", checkoutKey: "credits" },
        ],
      },
      {
        title: "One-of-One Kernangebote",
        note: "Checkout-now Angebote gehen auf Stripe, sobald die Price-IDs gesetzt sind.",
        rows: [
          { item: "Kostenlose Diagnose", setup: "€0", recurring: "€0", motion: "Lead-Qualifizierung", highlight: true },
          { item: "Consulting Sprint", setup: "€3.500 zzgl. MwSt.", recurring: "-", motion: "Checkout now", checkoutKey: "consult_done_with_you", highlight: true },
          { item: "Layer 1 Foundation", setup: "€7.000 zzgl. MwSt.", recurring: "€499 / Monat", motion: "Checkout now", checkoutKey: "layer1_foundation", highlight: true },
          { item: "Layer 2 Dream Team", setup: "€35.000", recurring: "€999 / Monat", motion: "Inquiry first" },
          { item: "Layer 3 Sovereign", setup: "€135.000", recurring: "€1.999 / Monat", motion: "Inquiry first" },
          { item: "Layer 3 Sovereign Pro", setup: "€165.000", recurring: "€2.499 / Monat", motion: "Inquiry first" },
          { item: "Layer 3 Sovereign Max", setup: "€195.000", recurring: "€2.999 / Monat", motion: "Inquiry first" },
          { item: "Layer 4 NVIDIA Private", setup: "€250.000", recurring: "Individuell", motion: "Invoice only" },
        ],
      },
      {
        title: "Cloud Private Inference Module",
        rows: [
          { item: "BYOK", setup: "€0", recurring: "€0 Modulgebühr", motion: "Policy / Feature Flag" },
          { item: "Cloud Starter", setup: "€2.500", recurring: "€2.900 / Monat", motion: "Modul" },
          { item: "Cloud Growth", setup: "€6.000", recurring: "€7.200 / Monat", motion: "Modul" },
          { item: "Cloud Enterprise", setup: "Individuell", recurring: "Individuell", motion: "Angebot" },
        ],
      },
      {
        title: "On-Prem Hardware Module",
        rows: [
          { item: "On-Prem Starter", setup: "€11.500", recurring: "€600 / Monat", motion: "Modul" },
          { item: "On-Prem Growth", setup: "€43.000", recurring: "€1.200 / Monat", motion: "Modul" },
          { item: "On-Prem Enterprise", setup: "€118.000", recurring: "€2.400 / Monat", motion: "Modul" },
        ],
      },
      {
        title: "Delivery- und Compliance-Module",
        rows: [
          { item: "RAG Pipeline", setup: "€8.000 - €15.000", recurring: "€500 - €1.000 / Monat", motion: "Scope-abhängig" },
          { item: "Fine-Tuning", setup: "€10.000 - €25.000", recurring: "€3.000 - €6.000 / Jahr", motion: "Scope-abhängig" },
          { item: "Compliance Package", setup: "€15.000 - €30.000", recurring: "-", motion: "Scope-abhängig" },
        ],
      },
    ],
  },
};
