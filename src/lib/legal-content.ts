import pagesEn from "../../apps/one-of-one-landing/content/pages.en.json";

export const legalPagesContent = pagesEn;

export const legalCompanyInfo = {
  name: "Vound Brand UG (haftungsbeschränkt)",
  street: "Am Markt 11",
  zip: "17309",
  city: "Pasewalk",
  country: "Germany",
  federalState: "Mecklenburg-Vorpommern",
  vatId: "DE293728593",
  email: "support@sevenlayers.io",
  representative: "Remington Splettstoesser",
  managingDirector: "Remington Splettstoesser",
  registerCourt: "Amtsgericht Neubrandenburg",
  registerNumber: "HRB 7675",
} as const;

export const hasCommercialRegisterDetails = Boolean(
  legalCompanyInfo.registerCourt && legalCompanyInfo.registerNumber
);

export const legalPolicyMeta = {
  lastUpdatedIso: "2026-03-27",
  lastUpdatedLabel: "March 27, 2026",
} as const;
