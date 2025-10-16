/**
 * LEGAL ENTITY TYPES BY COUNTRY
 *
 * Comprehensive mapping of legal entity types for different countries.
 * Each country has specific legal structures with unique characteristics,
 * tax implications, and VAT registration requirements.
 */

export type LegalEntityType = {
  code: string;
  name: string;
  localName: string; // Native language name
  description: string;
  vatEligible: boolean; // Can register for VAT
  minShareCapital?: string; // Minimum required capital
  liability: "limited" | "unlimited" | "hybrid";
  commonUse: string; // When this entity type is typically used
};

export type CountryLegalEntities = {
  country: string;
  countryName: string;
  defaultVATPrefix: string; // e.g., "DE", "FR"
  entities: LegalEntityType[];
};

/**
 * LEGAL ENTITY TYPES DATABASE
 */
export const LEGAL_ENTITY_TYPES: Record<string, CountryLegalEntities> = {
  // GERMANY
  DE: {
    country: "DE",
    countryName: "Germany",
    defaultVATPrefix: "DE",
    entities: [
      {
        code: "GmbH",
        name: "Private Limited Company",
        localName: "Gesellschaft mit beschränkter Haftung",
        description: "Most common German corporate form for small to medium businesses",
        vatEligible: true,
        minShareCapital: "€25,000",
        liability: "limited",
        commonUse: "General business operations, preferred for SMEs",
      },
      {
        code: "UG",
        name: "Mini-GmbH / Entrepreneurial Company",
        localName: "Unternehmergesellschaft (haftungsbeschränkt)",
        description: "Simplified GmbH with lower capital requirements",
        vatEligible: true,
        minShareCapital: "€1 (but must build reserves)",
        liability: "limited",
        commonUse: "Startups and small businesses with limited initial capital",
      },
      {
        code: "AG",
        name: "Public Limited Company",
        localName: "Aktiengesellschaft",
        description: "Stock corporation for larger enterprises",
        vatEligible: true,
        minShareCapital: "€50,000",
        liability: "limited",
        commonUse: "Large corporations, public companies, stock market listings",
      },
      {
        code: "KG",
        name: "Limited Partnership",
        localName: "Kommanditgesellschaft",
        description: "Partnership with at least one limited and one unlimited partner",
        vatEligible: true,
        liability: "hybrid",
        commonUse: "Family businesses, investment partnerships",
      },
      {
        code: "GmbH_CoKG",
        name: "GmbH & Co. KG",
        localName: "GmbH & Co. Kommanditgesellschaft",
        description: "Limited partnership with GmbH as general partner",
        vatEligible: true,
        liability: "limited",
        commonUse: "Medium to large businesses wanting limited liability",
      },
      {
        code: "OHG",
        name: "General Partnership",
        localName: "Offene Handelsgesellschaft",
        description: "Partnership where all partners have unlimited liability",
        vatEligible: true,
        liability: "unlimited",
        commonUse: "Small trading businesses, professional partnerships",
      },
      {
        code: "eK",
        name: "Sole Proprietorship",
        localName: "eingetragener Kaufmann",
        description: "Registered sole trader for commercial activities",
        vatEligible: true,
        liability: "unlimited",
        commonUse: "Individual entrepreneurs in retail/trade",
      },
      {
        code: "GbR",
        name: "Civil Law Partnership",
        localName: "Gesellschaft bürgerlichen Rechts",
        description: "Simple partnership for non-commercial activities",
        vatEligible: true,
        liability: "unlimited",
        commonUse: "Freelancers, small service providers",
      },
      {
        code: "eG",
        name: "Registered Cooperative",
        localName: "eingetragene Genossenschaft",
        description: "Member-owned cooperative organization",
        vatEligible: true,
        minShareCapital: "Varies by statute",
        liability: "limited",
        commonUse: "Agricultural, housing, and credit cooperatives",
      },
    ],
  },

  // FRANCE
  FR: {
    country: "FR",
    countryName: "France",
    defaultVATPrefix: "FR",
    entities: [
      {
        code: "SARL",
        name: "Limited Liability Company",
        localName: "Société à Responsabilité Limitée",
        description: "Most common French business structure",
        vatEligible: true,
        minShareCapital: "€1",
        liability: "limited",
        commonUse: "General business operations, SMEs",
      },
      {
        code: "SAS",
        name: "Simplified Joint Stock Company",
        localName: "Société par Actions Simplifiée",
        description: "Flexible corporate structure with simplified governance",
        vatEligible: true,
        minShareCapital: "€1",
        liability: "limited",
        commonUse: "Startups, growth companies, flexible management",
      },
      {
        code: "SASU",
        name: "Single-Shareholder SAS",
        localName: "Société par Actions Simplifiée Unipersonnelle",
        description: "SAS with single shareholder",
        vatEligible: true,
        minShareCapital: "€1",
        liability: "limited",
        commonUse: "Solo entrepreneurs wanting limited liability",
      },
      {
        code: "SA",
        name: "Public Limited Company",
        localName: "Société Anonyme",
        description: "Traditional stock corporation",
        vatEligible: true,
        minShareCapital: "€37,000",
        liability: "limited",
        commonUse: "Large corporations, public companies",
      },
      {
        code: "EURL",
        name: "Single-Member SARL",
        localName: "Entreprise Unipersonnelle à Responsabilité Limitée",
        description: "SARL with single owner",
        vatEligible: true,
        minShareCapital: "€1",
        liability: "limited",
        commonUse: "Solo businesses with limited liability",
      },
      {
        code: "SNC",
        name: "General Partnership",
        localName: "Société en Nom Collectif",
        description: "Partnership with unlimited liability",
        vatEligible: true,
        liability: "unlimited",
        commonUse: "Professional partnerships, family businesses",
      },
      {
        code: "EI",
        name: "Sole Proprietorship",
        localName: "Entreprise Individuelle",
        description: "Self-employed individual",
        vatEligible: true,
        liability: "unlimited",
        commonUse: "Freelancers, small businesses",
      },
      {
        code: "Micro",
        name: "Micro-Enterprise",
        localName: "Micro-Entreprise (Auto-Entrepreneur)",
        description: "Simplified tax regime for small businesses",
        vatEligible: false, // Below VAT threshold
        liability: "unlimited",
        commonUse: "Very small businesses, side income",
      },
    ],
  },

  // UNITED KINGDOM
  GB: {
    country: "GB",
    countryName: "United Kingdom",
    defaultVATPrefix: "GB",
    entities: [
      {
        code: "Ltd",
        name: "Private Limited Company",
        localName: "Limited Company",
        description: "Most common UK corporate structure",
        vatEligible: true,
        minShareCapital: "£1",
        liability: "limited",
        commonUse: "General business operations",
      },
      {
        code: "PLC",
        name: "Public Limited Company",
        localName: "Public Limited Company",
        description: "Company that can offer shares to the public",
        vatEligible: true,
        minShareCapital: "£50,000",
        liability: "limited",
        commonUse: "Large corporations, stock market listings",
      },
      {
        code: "LLP",
        name: "Limited Liability Partnership",
        localName: "Limited Liability Partnership",
        description: "Partnership with limited liability for all partners",
        vatEligible: true,
        liability: "limited",
        commonUse: "Professional services (law, accounting)",
      },
      {
        code: "Partnership",
        name: "General Partnership",
        localName: "Partnership",
        description: "Traditional partnership structure",
        vatEligible: true,
        liability: "unlimited",
        commonUse: "Small businesses, professional practices",
      },
      {
        code: "Sole_Trader",
        name: "Sole Trader",
        localName: "Sole Trader",
        description: "Self-employed individual",
        vatEligible: true,
        liability: "unlimited",
        commonUse: "Freelancers, individual entrepreneurs",
      },
      {
        code: "CIC",
        name: "Community Interest Company",
        localName: "Community Interest Company",
        description: "Social enterprise limited company",
        vatEligible: true,
        minShareCapital: "£1",
        liability: "limited",
        commonUse: "Social enterprises, community projects",
      },
    ],
  },

  // UNITED STATES
  US: {
    country: "US",
    countryName: "United States",
    defaultVATPrefix: "N/A", // US uses state sales tax, not VAT
    entities: [
      {
        code: "LLC",
        name: "Limited Liability Company",
        localName: "Limited Liability Company",
        description: "Flexible business structure combining corporation and partnership features",
        vatEligible: true,
        liability: "limited",
        commonUse: "Most common for small to medium businesses",
      },
      {
        code: "S_Corp",
        name: "S Corporation",
        localName: "S Corporation",
        description: "Pass-through tax entity with corporate structure",
        vatEligible: true,
        liability: "limited",
        commonUse: "Small businesses wanting pass-through taxation",
      },
      {
        code: "C_Corp",
        name: "C Corporation",
        localName: "C Corporation",
        description: "Standard corporation with double taxation",
        vatEligible: true,
        liability: "limited",
        commonUse: "Large businesses, venture-backed startups",
      },
      {
        code: "Partnership",
        name: "General Partnership",
        localName: "General Partnership",
        description: "Business owned by two or more partners",
        vatEligible: true,
        liability: "unlimited",
        commonUse: "Professional practices, small businesses",
      },
      {
        code: "LLP",
        name: "Limited Liability Partnership",
        localName: "Limited Liability Partnership",
        description: "Partnership with limited liability protection",
        vatEligible: true,
        liability: "limited",
        commonUse: "Professional services (legal, accounting)",
      },
      {
        code: "Sole_Proprietorship",
        name: "Sole Proprietorship",
        localName: "Sole Proprietorship",
        description: "Unincorporated business owned by one person",
        vatEligible: true,
        liability: "unlimited",
        commonUse: "Individual entrepreneurs, freelancers",
      },
    ],
  },

  // NETHERLANDS
  NL: {
    country: "NL",
    countryName: "Netherlands",
    defaultVATPrefix: "NL",
    entities: [
      {
        code: "BV",
        name: "Private Limited Company",
        localName: "Besloten Vennootschap",
        description: "Most common Dutch corporate form",
        vatEligible: true,
        minShareCapital: "€0.01",
        liability: "limited",
        commonUse: "General business operations",
      },
      {
        code: "NV",
        name: "Public Limited Company",
        localName: "Naamloze Vennootschap",
        description: "Stock corporation for larger enterprises",
        vatEligible: true,
        minShareCapital: "€45,000",
        liability: "limited",
        commonUse: "Large corporations, public companies",
      },
      {
        code: "VOF",
        name: "General Partnership",
        localName: "Vennootschap onder Firma",
        description: "Partnership with unlimited liability",
        vatEligible: true,
        liability: "unlimited",
        commonUse: "Small businesses, professional partnerships",
      },
      {
        code: "CV",
        name: "Limited Partnership",
        localName: "Commanditaire Vennootschap",
        description: "Partnership with limited and general partners",
        vatEligible: true,
        liability: "hybrid",
        commonUse: "Investment partnerships, family businesses",
      },
      {
        code: "Eenmanszaak",
        name: "Sole Proprietorship",
        localName: "Eenmanszaak",
        description: "Individual entrepreneur",
        vatEligible: true,
        liability: "unlimited",
        commonUse: "Freelancers, small businesses",
      },
    ],
  },

  // SPAIN
  ES: {
    country: "ES",
    countryName: "Spain",
    defaultVATPrefix: "ES",
    entities: [
      {
        code: "SL",
        name: "Limited Liability Company",
        localName: "Sociedad de Responsabilidad Limitada",
        description: "Most common Spanish business structure",
        vatEligible: true,
        minShareCapital: "€3,000",
        liability: "limited",
        commonUse: "General business operations, SMEs",
      },
      {
        code: "SA",
        name: "Public Limited Company",
        localName: "Sociedad Anónima",
        description: "Stock corporation for larger businesses",
        vatEligible: true,
        minShareCapital: "€60,000",
        liability: "limited",
        commonUse: "Large corporations, public companies",
      },
      {
        code: "SLU",
        name: "Single-Member Limited Company",
        localName: "Sociedad Limitada Unipersonal",
        description: "Limited company with single owner",
        vatEligible: true,
        minShareCapital: "€3,000",
        liability: "limited",
        commonUse: "Solo businesses with limited liability",
      },
      {
        code: "SC",
        name: "Collective Society",
        localName: "Sociedad Colectiva",
        description: "General partnership",
        vatEligible: true,
        liability: "unlimited",
        commonUse: "Professional partnerships",
      },
      {
        code: "Autonomo",
        name: "Self-Employed",
        localName: "Autónomo",
        description: "Individual entrepreneur",
        vatEligible: true,
        liability: "unlimited",
        commonUse: "Freelancers, individual businesses",
      },
    ],
  },

  // ITALY
  IT: {
    country: "IT",
    countryName: "Italy",
    defaultVATPrefix: "IT",
    entities: [
      {
        code: "SRL",
        name: "Limited Liability Company",
        localName: "Società a Responsabilità Limitata",
        description: "Most common Italian corporate structure",
        vatEligible: true,
        minShareCapital: "€1 (€10,000 for full SRL)",
        liability: "limited",
        commonUse: "General business operations",
      },
      {
        code: "SPA",
        name: "Joint Stock Company",
        localName: "Società per Azioni",
        description: "Stock corporation for larger businesses",
        vatEligible: true,
        minShareCapital: "€50,000",
        liability: "limited",
        commonUse: "Large corporations, public companies",
      },
      {
        code: "SRLS",
        name: "Simplified SRL",
        localName: "Società a Responsabilità Limitata Semplificata",
        description: "Simplified limited liability company",
        vatEligible: true,
        minShareCapital: "€1",
        liability: "limited",
        commonUse: "Small businesses, startups",
      },
      {
        code: "SNC",
        name: "General Partnership",
        localName: "Società in Nome Collettivo",
        description: "Partnership with unlimited liability",
        vatEligible: true,
        liability: "unlimited",
        commonUse: "Professional partnerships, small businesses",
      },
      {
        code: "Ditta_Individuale",
        name: "Sole Proprietorship",
        localName: "Ditta Individuale",
        description: "Individual entrepreneur",
        vatEligible: true,
        liability: "unlimited",
        commonUse: "Freelancers, small businesses",
      },
    ],
  },

  // POLAND
  PL: {
    country: "PL",
    countryName: "Poland",
    defaultVATPrefix: "PL",
    entities: [
      {
        code: "Sp_zoo",
        name: "Limited Liability Company",
        localName: "Spółka z ograniczoną odpowiedzialnością",
        description: "Most common Polish corporate form",
        vatEligible: true,
        minShareCapital: "PLN 5,000",
        liability: "limited",
        commonUse: "General business operations",
      },
      {
        code: "SA",
        name: "Joint Stock Company",
        localName: "Spółka Akcyjna",
        description: "Stock corporation for larger businesses",
        vatEligible: true,
        minShareCapital: "PLN 100,000",
        liability: "limited",
        commonUse: "Large corporations, public companies",
      },
      {
        code: "JDG",
        name: "Sole Proprietorship",
        localName: "Jednoosobowa Działalność Gospodarcza",
        description: "Individual business activity",
        vatEligible: true,
        liability: "unlimited",
        commonUse: "Freelancers, small businesses",
      },
      {
        code: "SC",
        name: "Civil Partnership",
        localName: "Spółka Cywilna",
        description: "Simple partnership structure",
        vatEligible: true,
        liability: "unlimited",
        commonUse: "Small partnerships, professionals",
      },
    ],
  },
};

/**
 * GET LEGAL ENTITIES FOR COUNTRY
 */
export function getLegalEntitiesForCountry(countryCode: string): CountryLegalEntities | null {
  return LEGAL_ENTITY_TYPES[countryCode] || null;
}

/**
 * GET LEGAL ENTITY BY CODE
 */
export function getLegalEntityByCode(
  countryCode: string,
  entityCode: string
): LegalEntityType | null {
  const country = LEGAL_ENTITY_TYPES[countryCode];
  if (!country) return null;

  return country.entities.find((e) => e.code === entityCode) || null;
}

/**
 * GET ALL SUPPORTED COUNTRIES
 */
export function getSupportedCountries(): Array<{ code: string; name: string; vatPrefix: string }> {
  return Object.values(LEGAL_ENTITY_TYPES).map((country) => ({
    code: country.country,
    name: country.countryName,
    vatPrefix: country.defaultVATPrefix,
  }));
}

/**
 * VALIDATE ENTITY TYPE FOR COUNTRY
 */
export function isValidEntityType(countryCode: string, entityCode: string): boolean {
  return getLegalEntityByCode(countryCode, entityCode) !== null;
}
