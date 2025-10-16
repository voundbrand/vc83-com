# EU VAT Number Validation

## ✅ What We Built

Integrated real-time EU VAT validation using the official VIES (VAT Information Exchange System) service from the European Commission.

## 📍 Location

**Path:** Desktop → Manage icon → Organization tab → Legal & Tax Information section → VAT Number field

**Button:** "Verify VAT" appears next to the VAT Number input when in edit mode

## 🎯 Features

### Real-Time Validation

When you click "Verify VAT", the system:

1. **Formats the VAT number** - Automatically converts to uppercase
2. **Validates format** - Checks country-specific format rules
3. **Calls EU VIES API** - Verifies against official EU database
4. **Returns company info** - Shows registered company name and address (if valid)

### Supported Countries (27 EU Members + Northern Ireland)

- **AT** - Austria
- **BE** - Belgium
- **BG** - Bulgaria
- **HR** - Croatia
- **CY** - Cyprus
- **CZ** - Czech Republic
- **DK** - Denmark
- **EE** - Estonia
- **FI** - Finland
- **FR** - France
- **DE** - Germany
- **GR/EL** - Greece
- **HU** - Hungary
- **IE** - Ireland
- **IT** - Italy
- **LV** - Latvia
- **LT** - Lithuania
- **LU** - Luxembourg
- **MT** - Malta
- **NL** - Netherlands
- **PL** - Poland
- **PT** - Portugal
- **RO** - Romania
- **SK** - Slovakia
- **SI** - Slovenia
- **ES** - Spain
- **SE** - Sweden
- **XI** - Northern Ireland

## 🔄 How It Works

### User Flow

1. **Enter VAT Number** in edit mode (e.g., `DE123456789`)
   - Format: Country code (2 letters) + VAT number
   - Automatically converts to uppercase

2. **Click "Verify VAT"** button
   - Button shows "Verifying..." during API call
   - Takes 1-3 seconds typically

3. **See Results** in colored box below field:

   **✅ Valid VAT:**
   ```
   ✅ VAT Number Valid
   Company: Example GmbH
   Address: 123 Main Street, Berlin, Germany
   ```

   **❌ Invalid VAT:**
   ```
   ❌ VAT Number Invalid
   VAT number not found in EU VIES database
   ```

### Backend Architecture

#### Convex Action (Server-Side)

Located in `convex/vatValidation.ts`:

```typescript
export const validateVATNumber = action({
  args: {
    vatNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Parse country code and number
    const countryCode = vatNumber.substring(0, 2);
    const number = vatNumber.substring(2);

    // 2. Validate EU country
    // 3. Call VIES SOAP API
    // 4. Parse XML response
    // 5. Return validation result + company info
  }
});
```

#### VIES SOAP API

The validation calls the official EU VIES web service:

```xml
POST https://ec.europa.eu/taxation_customs/vies/services/checkVatService

<soap:Envelope>
  <soap:Body>
    <checkVat>
      <countryCode>DE</countryCode>
      <vatNumber>123456789</vatNumber>
    </checkVat>
  </soap:Body>
</soap:Envelope>
```

**Response:**
```xml
<soap:Envelope>
  <soap:Body>
    <checkVatResponse>
      <countryCode>DE</countryCode>
      <vatNumber>123456789</vatNumber>
      <valid>true</valid>
      <name>Example GmbH</name>
      <address>123 Main Street, Berlin</address>
    </checkVatResponse>
  </soap:Body>
</soap:Envelope>
```

### Frontend Integration

Located in `src/components/window-content/manage-window/organization-details-form.tsx`:

```typescript
const validateVATAction = useAction(api.vatValidation.validateVATNumber);
const [isValidatingVAT, setIsValidatingVAT] = useState(false);
const [vatValidationResult, setVatValidationResult] = useState(null);

// Verify button onClick
const result = await validateVATAction({
  vatNumber: formData.vatNumber
});
setVatValidationResult(result);
```

## 📊 VAT Format Rules

Each EU country has specific VAT format requirements:

| Country | Format | Example |
|---------|--------|---------|
| Austria (AT) | U + 8 digits | ATU12345678 |
| Belgium (BE) | 10 digits | BE0123456789 |
| Germany (DE) | 9 digits | DE123456789 |
| France (FR) | 2 chars + 9 digits | FRXX123456789 |
| Ireland (IE) | 7 digits + 1-2 letters | IE1234567T |
| Netherlands (NL) | 9 digits + B + 2 digits | NL123456789B01 |
| Spain (ES) | 1 char/digit + 7 digits + 1 char | ESX1234567X |
| UK/NI (XI) | 9 or 12 digits | XI123456789 |

**Note:** The validation system automatically checks format before calling VIES API.

## 🛠️ Error Handling

### Common Errors

1. **Invalid Format**
   ```
   ❌ VAT Number Invalid
   Invalid DE VAT format
   ```
   - Fix: Check country-specific format requirements

2. **Not Found in VIES**
   ```
   ❌ VAT Number Invalid
   VAT number not found in EU VIES database
   ```
   - Possible reasons:
     - Typo in VAT number
     - VAT not registered in EU VIES system
     - Recently registered (takes time to appear)

3. **VIES Service Error**
   ```
   ❌ VAT Number Invalid
   VIES service error: 503 Service Unavailable
   ```
   - EU VIES service is temporarily down
   - Try again in a few minutes

4. **Non-EU Country**
   ```
   ❌ VAT Number Invalid
   US is not a valid EU country code
   ```
   - Only EU VAT numbers can be validated
   - For non-EU tax IDs, use Tax ID field instead

## 🔐 Privacy & Security

### Data Handling

- **No storage of validation results** - Results shown only in UI
- **Direct VIES API call** - No third-party services
- **HTTPS only** - All communication encrypted
- **Rate limiting** - VIES has built-in rate limits (reasonable use policy)

### Official EU Service

- **Service:** EU VIES (VAT Information Exchange System)
- **Authority:** European Commission
- **Website:** https://ec.europa.eu/taxation_customs/vies/
- **API Docs:** https://ec.europa.eu/taxation_customs/vies/technicalInformation.html

## 📈 Performance

- **Typical response time:** 1-3 seconds
- **VIES availability:** ~99.5% uptime (EU-maintained)
- **Rate limits:** Not officially specified, but reasonable use expected
- **Timeout:** 10 seconds (Convex action default)

## 🎯 Use Cases

### When to Verify VAT

1. **New organization setup** - Verify VAT during initial configuration
2. **B2B transactions** - Validate customer VAT for reverse charge
3. **Compliance audits** - Confirm VAT is still valid
4. **Data quality** - Catch typos in VAT entry

### Best Practices

- ✅ **Verify before saving** - Catch errors early
- ✅ **Show company info** - Confirms correct organization
- ✅ **Manual override allowed** - Validation failure doesn't block save
- ✅ **Periodic re-validation** - VAT numbers can be deactivated

## 🚀 Future Enhancements

Possible improvements:

1. **Automatic validation on blur** - Validate when user leaves field
2. **Validation history** - Track when VAT was last verified
3. **Batch validation** - Validate multiple VATs (for customer imports)
4. **Non-EU tax ID validation** - Support US EIN, UK VAT (post-Brexit), etc.
5. **Cache validation results** - Reduce API calls for same VAT

## 📚 References

- **EU VIES Portal:** https://ec.europa.eu/taxation_customs/vies/
- **Technical Docs:** https://ec.europa.eu/taxation_customs/vies/technicalInformation.html
- **VAT Formats:** https://ec.europa.eu/taxation_customs/vies/faq.html

## 🎉 Summary

EU VAT validation is now fully integrated into the Legal & Tax Information section. Users can verify VAT numbers in real-time against the official EU VIES database, with instant feedback including company name and address for valid numbers.
