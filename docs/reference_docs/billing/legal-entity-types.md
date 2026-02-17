# Country-Specific Legal Entity Types System

## Overview

The legal entity types system provides **country-specific business structure options** that automatically update based on the organization's country selection. This ensures users see only relevant legal entity types for their jurisdiction with accurate descriptions, capital requirements, and VAT eligibility.

## Features

### ✅ Dynamic Country-Based Entity Types
- **Automatic Updates**: Entity type dropdown refreshes when country changes
- **Country-Specific Options**: Each country has unique legal structures (e.g., GmbH for Germany, SAS for France, Ltd for UK)
- **Smart Validation**: Invalid entity types are automatically reset when switching countries

### ✅ Comprehensive Entity Information
For each legal entity type, the system provides:
- **Local Name**: Native language name (e.g., "Gesellschaft mit beschränkter Haftung" for GmbH)
- **Description**: Clear explanation of what the entity type is
- **Minimum Capital**: Required share capital for incorporation
- **Liability Type**: Limited, unlimited, or hybrid liability
- **VAT Eligibility**: Whether the entity can register for VAT
- **Common Use**: When this entity type is typically chosen

### ✅ Integrated VAT Validation
- **Country-Aware**: Automatically uses correct VAT prefix for selected country
- **VIES Integration**: Real-time validation against EU VIES database
- **Visual Feedback**: Green checkmark for valid, red X for invalid
- **Company Details**: Shows registered company name and address when available

## Supported Countries

### 🇩🇪 Germany (DE)
- **GmbH** - Private Limited Company (most common)
- **UG** - Mini-GmbH / Entrepreneurial Company (€1 startup capital)
- **AG** - Public Limited Company (for large enterprises)
- **KG** - Limited Partnership
- **GmbH & Co. KG** - GmbH as general partner
- **OHG** - General Partnership
- **eK** - Sole Proprietorship
- **GbR** - Civil Law Partnership
- **eG** - Registered Cooperative

### 🇫🇷 France (FR)
- **SARL** - Limited Liability Company (most common)
- **SAS** - Simplified Joint Stock Company (flexible)
- **SASU** - Single-Shareholder SAS
- **SA** - Public Limited Company
- **EURL** - Single-Member SARL
- **SNC** - General Partnership
- **EI** - Sole Proprietorship
- **Micro-Entreprise** - Micro-Enterprise (simplified tax)

### 🇬🇧 United Kingdom (GB)
- **Ltd** - Private Limited Company (most common)
- **PLC** - Public Limited Company
- **LLP** - Limited Liability Partnership
- **Partnership** - General Partnership
- **Sole Trader** - Self-employed individual
- **CIC** - Community Interest Company (social enterprise)

### 🇺🇸 United States (US)
- **LLC** - Limited Liability Company (most common)
- **S Corp** - S Corporation (pass-through tax)
- **C Corp** - C Corporation (double taxation)
- **Partnership** - General Partnership
- **LLP** - Limited Liability Partnership
- **Sole Proprietorship** - Unincorporated individual business

### 🇳🇱 Netherlands (NL)
- **BV** - Private Limited Company (most common)
- **NV** - Public Limited Company
- **VOF** - General Partnership
- **CV** - Limited Partnership
- **Eenmanszaak** - Sole Proprietorship

### 🇪🇸 Spain (ES)
- **SL** - Limited Liability Company (most common)
- **SA** - Public Limited Company
- **SLU** - Single-Member Limited Company
- **SC** - Collective Society
- **Autónomo** - Self-Employed

### 🇮🇹 Italy (IT)
- **SRL** - Limited Liability Company (most common)
- **SPA** - Joint Stock Company
- **SRLS** - Simplified SRL (for startups)
- **SNC** - General Partnership
- **Ditta Individuale** - Sole Proprietorship

### 🇵🇱 Poland (PL)
- **Sp. z o.o.** - Limited Liability Company (most common)
- **SA** - Joint Stock Company
- **JDG** - Sole Proprietorship
- **SC** - Civil Partnership

## Technical Architecture

### Data Structure
```typescript
{
  code: "GmbH",                    // Short code for database storage
  name: "Private Limited Company", // English name
  localName: "Gesellschaft mit beschränkter Haftung", // Native name
  description: "Most common German corporate form...",
  vatEligible: true,               // Can register for VAT
  minShareCapital: "€25,000",      // Required capital
  liability: "limited",            // Liability type
  commonUse: "General business operations..." // When to use
}
```

### Helper Functions
- `getLegalEntitiesForCountry(countryCode)` - Get all entities for a country
- `getLegalEntityByCode(countryCode, entityCode)` - Get specific entity details
- `getSupportedCountries()` - Get list of all supported countries
- `isValidEntityType(countryCode, entityCode)` - Validate entity/country combo

### Database Schema
Stored in `organizationTaxSettings.customProperties`:
```typescript
{
  legalEntityType: "GmbH",           // Entity type code
  legalEntityName: "Example GmbH",   // Registered business name
  vatNumber: "DE123456789",          // VAT/Tax ID number
  taxIdNumber: "12345678",           // Additional tax ID (optional)
  originAddress: {
    country: "DE",                   // Country code
    // ... address fields
  }
}
```

## User Workflow

### 1️⃣ Select Country
User selects their country from the dropdown. This:
- Updates available legal entity types
- Changes VAT number format placeholder
- Enables/disables VIES validation (EU only)

### 2️⃣ Choose Legal Entity Type
Dropdown shows only relevant entity types for selected country:
- Shows entity code, name, and minimum capital
- Displays detailed info card when selected:
  - Local language name
  - Full description
  - Liability type badge
  - VAT eligibility indicator
  - Capital requirements
  - Common use cases

### 3️⃣ Enter Business Details
- **Registered Business Name**: Official legal name
- **VAT Number**: With country-specific placeholder (e.g., "DE123456789")
- **Validate Button**: Real-time VIES validation for EU countries
- **Additional Tax ID**: Optional field for multiple tax identifiers

### 4️⃣ Validation Feedback
EU countries get automatic VAT validation:
- ✅ **Valid**: Green checkmark with company name from VIES
- ❌ **Invalid**: Red X with specific error message
- ⏳ **Validating**: Loading spinner while checking VIES
- 🔄 **Retry Logic**: Automatic retries if VIES is busy

## Benefits

### For Users
- **Clarity**: Clear guidance on which legal structure to choose
- **Accuracy**: Correct legal entity types for each country
- **Validation**: Confidence that VAT numbers are valid
- **Education**: Learn about different entity types and their use cases

### For Compliance
- **Proper Records**: Accurate legal entity information
- **VAT Compliance**: Validated VAT numbers against official database
- **Tax Reporting**: Correct entity types for tax filing
- **Audit Trail**: Complete business structure documentation

### For Developers
- **Maintainable**: Easy to add new countries and entity types
- **Type-Safe**: Full TypeScript support
- **Extensible**: Helper functions for custom validations
- **Documented**: Clear structure and examples

## Adding New Countries

To add a new country's legal entity types:

```typescript
// In convex/legalEntityTypes.ts
export const LEGAL_ENTITY_TYPES: Record<string, CountryLegalEntities> = {
  // ... existing countries

  // NEW COUNTRY
  XX: {
    country: "XX",
    countryName: "Country Name",
    defaultVATPrefix: "XX", // or "N/A" for non-VAT countries
    entities: [
      {
        code: "TYPE1",
        name: "English Name",
        localName: "Native Language Name",
        description: "What this entity type is...",
        vatEligible: true,
        minShareCapital: "Amount",
        liability: "limited",
        commonUse: "When to use this type...",
      },
      // ... more entity types
    ],
  },
};
```

## Integration with Stripe Tax

The legal entity information integrates seamlessly with Stripe Tax:
- Entity type helps determine tax obligations
- VAT number used for reverse charge mechanism
- Origin address defines tax nexus
- Combined data ensures accurate tax calculation

## Future Enhancements

### Planned Features
- [ ] **Industry-Specific Guidance**: Recommend entity types based on business type
- [ ] **Capital Calculator**: Help users understand capital requirements
- [ ] **Formation Cost Estimates**: Show typical costs for each entity type
- [ ] **Multi-Country Entities**: Support for holding companies across borders
- [ ] **Historical Changes**: Track entity type changes over time
- [ ] **Compliance Checklists**: Entity-specific compliance requirements

### Under Consideration
- Non-EU VAT validation services
- Local business registry integrations
- Automated entity type recommendations
- Comparison tool for entity types
- Partnership with incorporation services

## Resources

### Official Sources
- **Germany**: [IHK Business Registration](https://www.ihk.de/)
- **France**: [Infogreffe](https://www.infogreffe.fr/)
- **UK**: [Companies House](https://www.gov.uk/government/organisations/companies-house)
- **EU VIES**: [VAT Validation](https://ec.europa.eu/taxation_customs/vies/)

### Internal Documentation
- VAT Validation System (legacy note; consolidated into tax settings and Stripe Tax docs)
- [Tax Settings Integration](./tax-settings-integration.md)
- [Stripe Tax Integration](./stripe-tax-integration.md)

---

**Last Updated**: 2024-01-16
**Version**: 1.0.0
**Status**: ✅ Production Ready
