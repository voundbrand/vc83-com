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

  // AUSTRIA
  AT: {
    country: "AT",
    countryName: "Austria",
    defaultVATPrefix: "AT",
    entities: [
      {
        code: "GmbH",
        name: "Limited Liability Company",
        localName: "Gesellschaft mit beschränkter Haftung",
        description: "Common Austrian corporate form",
        vatEligible: true,
        minShareCapital: "€35,000",
        liability: "limited",
        commonUse: "General business operations",
      },
    ],
  },

  // BELGIUM
  BE: {
    country: "BE",
    countryName: "Belgium",
    defaultVATPrefix: "BE",
    entities: [
      {
        code: "BV_SRL",
        name: "Private Limited Company",
        localName: "Besloten Vennootschap / Société à Responsabilité Limitée",
        description: "Common Belgian corporate form",
        vatEligible: true,
        minShareCapital: "€1",
        liability: "limited",
        commonUse: "General business operations",
      },
    ],
  },

  // BULGARIA
  BG: {
    country: "BG",
    countryName: "Bulgaria",
    defaultVATPrefix: "BG",
    entities: [
      {
        code: "OOD",
        name: "Limited Liability Company",
        localName: "Дружество с ограничена отговорност",
        description: "Common Bulgarian corporate form",
        vatEligible: true,
        minShareCapital: "BGN 2",
        liability: "limited",
        commonUse: "General business operations",
      },
    ],
  },

  // CROATIA
  HR: {
    country: "HR",
    countryName: "Croatia",
    defaultVATPrefix: "HR",
    entities: [
      {
        code: "doo",
        name: "Limited Liability Company",
        localName: "Društvo s ograničenom odgovornošću",
        description: "Common Croatian corporate form",
        vatEligible: true,
        minShareCapital: "HRK 20,000",
        liability: "limited",
        commonUse: "General business operations",
      },
    ],
  },

  // CYPRUS
  CY: {
    country: "CY",
    countryName: "Cyprus",
    defaultVATPrefix: "CY",
    entities: [
      {
        code: "Ltd",
        name: "Private Limited Company",
        localName: "Private Limited Company",
        description: "Common Cypriot corporate form",
        vatEligible: true,
        minShareCapital: "€1",
        liability: "limited",
        commonUse: "General business operations",
      },
    ],
  },

  // CZECH REPUBLIC
  CZ: {
    country: "CZ",
    countryName: "Czech Republic",
    defaultVATPrefix: "CZ",
    entities: [
      {
        code: "sro",
        name: "Limited Liability Company",
        localName: "Společnost s ručením omezeným",
        description: "Common Czech corporate form",
        vatEligible: true,
        minShareCapital: "CZK 1",
        liability: "limited",
        commonUse: "General business operations",
      },
    ],
  },

  // DENMARK
  DK: {
    country: "DK",
    countryName: "Denmark",
    defaultVATPrefix: "DK",
    entities: [
      {
        code: "ApS",
        name: "Private Limited Company",
        localName: "Anpartsselskab",
        description: "Common Danish corporate form",
        vatEligible: true,
        minShareCapital: "DKK 1",
        liability: "limited",
        commonUse: "General business operations",
      },
    ],
  },

  // ESTONIA
  EE: {
    country: "EE",
    countryName: "Estonia",
    defaultVATPrefix: "EE",
    entities: [
      {
        code: "OU",
        name: "Private Limited Company",
        localName: "Osaühing",
        description: "Common Estonian corporate form",
        vatEligible: true,
        minShareCapital: "€2,500",
        liability: "limited",
        commonUse: "General business operations",
      },
    ],
  },

  // FINLAND
  FI: {
    country: "FI",
    countryName: "Finland",
    defaultVATPrefix: "FI",
    entities: [
      {
        code: "Oy",
        name: "Private Limited Company",
        localName: "Osakeyhtiö",
        description: "Common Finnish corporate form",
        vatEligible: true,
        minShareCapital: "€2,500",
        liability: "limited",
        commonUse: "General business operations",
      },
    ],
  },

  // GREECE
  GR: {
    country: "GR",
    countryName: "Greece",
    defaultVATPrefix: "EL",
    entities: [
      {
        code: "EPE",
        name: "Limited Liability Company",
        localName: "Εταιρεία Περιορισμένης Ευθύνης",
        description: "Common Greek corporate form",
        vatEligible: true,
        minShareCapital: "€1",
        liability: "limited",
        commonUse: "General business operations",
      },
    ],
  },

  // HUNGARY
  HU: {
    country: "HU",
    countryName: "Hungary",
    defaultVATPrefix: "HU",
    entities: [
      {
        code: "Kft",
        name: "Limited Liability Company",
        localName: "Korlátolt Felelősségű Társaság",
        description: "Common Hungarian corporate form",
        vatEligible: true,
        minShareCapital: "HUF 3,000,000",
        liability: "limited",
        commonUse: "General business operations",
      },
    ],
  },

  // IRELAND
  IE: {
    country: "IE",
    countryName: "Ireland",
    defaultVATPrefix: "IE",
    entities: [
      {
        code: "Ltd",
        name: "Private Limited Company",
        localName: "Private Company Limited by Shares",
        description: "Common Irish corporate form",
        vatEligible: true,
        minShareCapital: "€1",
        liability: "limited",
        commonUse: "General business operations",
      },
    ],
  },

  // LATVIA
  LV: {
    country: "LV",
    countryName: "Latvia",
    defaultVATPrefix: "LV",
    entities: [
      {
        code: "SIA",
        name: "Limited Liability Company",
        localName: "Sabiedrība ar ierobežotu atbildību",
        description: "Common Latvian corporate form",
        vatEligible: true,
        minShareCapital: "€2,800",
        liability: "limited",
        commonUse: "General business operations",
      },
    ],
  },

  // LITHUANIA
  LT: {
    country: "LT",
    countryName: "Lithuania",
    defaultVATPrefix: "LT",
    entities: [
      {
        code: "UAB",
        name: "Limited Liability Company",
        localName: "Uždaroji akcinė bendrovė",
        description: "Common Lithuanian corporate form",
        vatEligible: true,
        minShareCapital: "€2,500",
        liability: "limited",
        commonUse: "General business operations",
      },
    ],
  },

  // LUXEMBOURG
  LU: {
    country: "LU",
    countryName: "Luxembourg",
    defaultVATPrefix: "LU",
    entities: [
      {
        code: "SARL",
        name: "Private Limited Company",
        localName: "Société à Responsabilité Limitée",
        description: "Common Luxembourg corporate form",
        vatEligible: true,
        minShareCapital: "€12,000",
        liability: "limited",
        commonUse: "General business operations",
      },
    ],
  },

  // MALTA
  MT: {
    country: "MT",
    countryName: "Malta",
    defaultVATPrefix: "MT",
    entities: [
      {
        code: "Ltd",
        name: "Private Limited Company",
        localName: "Private Limited Company",
        description: "Common Maltese corporate form",
        vatEligible: true,
        minShareCapital: "€1,165",
        liability: "limited",
        commonUse: "General business operations",
      },
    ],
  },

  // PORTUGAL
  PT: {
    country: "PT",
    countryName: "Portugal",
    defaultVATPrefix: "PT",
    entities: [
      {
        code: "Lda",
        name: "Private Limited Company",
        localName: "Sociedade por Quotas",
        description: "Common Portuguese corporate form",
        vatEligible: true,
        minShareCapital: "€1",
        liability: "limited",
        commonUse: "General business operations",
      },
    ],
  },

  // ROMANIA
  RO: {
    country: "RO",
    countryName: "Romania",
    defaultVATPrefix: "RO",
    entities: [
      {
        code: "SRL",
        name: "Limited Liability Company",
        localName: "Societate cu Răspundere Limitată",
        description: "Common Romanian corporate form",
        vatEligible: true,
        minShareCapital: "RON 200",
        liability: "limited",
        commonUse: "General business operations",
      },
    ],
  },

  // SLOVAKIA
  SK: {
    country: "SK",
    countryName: "Slovakia",
    defaultVATPrefix: "SK",
    entities: [
      {
        code: "sro",
        name: "Limited Liability Company",
        localName: "Spoločnosť s ručením obmedzeným",
        description: "Common Slovak corporate form",
        vatEligible: true,
        minShareCapital: "€1",
        liability: "limited",
        commonUse: "General business operations",
      },
    ],
  },

  // SLOVENIA
  SI: {
    country: "SI",
    countryName: "Slovenia",
    defaultVATPrefix: "SI",
    entities: [
      {
        code: "doo",
        name: "Limited Liability Company",
        localName: "Družba z omejeno odgovornostjo",
        description: "Common Slovenian corporate form",
        vatEligible: true,
        minShareCapital: "€7,500",
        liability: "limited",
        commonUse: "General business operations",
      },
    ],
  },

  // SWEDEN
  SE: {
    country: "SE",
    countryName: "Sweden",
    defaultVATPrefix: "SE",
    entities: [
      {
        code: "AB",
        name: "Private Limited Company",
        localName: "Aktiebolag",
        description: "Common Swedish corporate form",
        vatEligible: true,
        minShareCapital: "SEK 25,000",
        liability: "limited",
        commonUse: "General business operations",
      },
    ],
  },

  // NORWAY (EEA, not EU)
  NO: {
    country: "NO",
    countryName: "Norway",
    defaultVATPrefix: "NO",
    entities: [
      {
        code: "AS",
        name: "Private Limited Company",
        localName: "Aksjeselskap",
        description: "Common Norwegian corporate form",
        vatEligible: true,
        minShareCapital: "NOK 30,000",
        liability: "limited",
        commonUse: "General business operations",
      },
    ],
  },

  // SWITZERLAND (not EU/EEA but commonly needed)
  CH: {
    country: "CH",
    countryName: "Switzerland",
    defaultVATPrefix: "CHE",
    entities: [
      {
        code: "GmbH",
        name: "Limited Liability Company",
        localName: "Gesellschaft mit beschränkter Haftung / Sàrl / Sagl",
        description: "Common Swiss corporate form",
        vatEligible: true,
        minShareCapital: "CHF 20,000",
        liability: "limited",
        commonUse: "General business operations",
      },
    ],
  },

  // ICELAND (EEA, not EU)
  IS: {
    country: "IS",
    countryName: "Iceland",
    defaultVATPrefix: "IS",
    entities: [
      {
        code: "ehf",
        name: "Private Limited Company",
        localName: "Einkahlutafélag",
        description: "Common Icelandic corporate form",
        vatEligible: true,
        minShareCapital: "ISK 500,000",
        liability: "limited",
        commonUse: "General business operations",
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
