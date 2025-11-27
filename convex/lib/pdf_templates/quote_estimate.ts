/**
 * QUOTE/ESTIMATE PDF TEMPLATE
 *
 * Professional pricing proposal document for potential clients.
 * Purple (#6B46C1) branding matching the email template system.
 *
 * Features:
 * - Company branding header
 * - Quote number and validity period
 * - Client information section
 * - Line items table with descriptions and pricing
 * - Subtotal, tax, and total calculations
 * - Terms and conditions
 * - Call to action
 * - Professional typography and layout
 *
 * Use Case: Send pricing quotes to potential clients for services/products
 *
 * Version: 1.0.0 - Professional System Default
 */

/**
 * Quote/Estimate Template HTML
 *
 * Jinja2 template variables:
 * - quoteNumber: Unique quote identifier (e.g., "QUO-2024-001")
 * - issueDate: Date quote was created
 * - validUntil: Expiration date for quote
 * - companyName: Your company name
 * - companyLogo: URL to company logo
 * - companyAddress: Company address lines
 * - companyEmail: Contact email
 * - companyPhone: Contact phone
 * - clientName: Client/prospect name
 * - clientCompany: Client company name
 * - clientEmail: Client email
 * - clientAddress: Client address
 * - lineItems: Array of {description, quantity, unitPrice, total}
 * - subtotal: Subtotal amount
 * - taxRate: Tax percentage (e.g., 19 for 19%)
 * - taxAmount: Calculated tax amount
 * - totalAmount: Final total
 * - currency: Currency symbol (default: €)
 * - notes: Additional notes or special terms
 * - termsAndConditions: Legal terms
 * - brandColor: Primary brand color (default: #6B46C1)
 */
export const QUOTE_ESTIMATE_TEMPLATE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Quote {{ quoteNumber }}</title>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      {% if companyLogo %}
      <img src="{{ companyLogo }}" alt="{{ companyName }}" class="company-logo">
      {% else %}
      <h1 class="company-name">{{ companyName }}</h1>
      {% endif %}
    </div>
    <div class="header-right">
      <h2 class="document-title">PRICE QUOTE</h2>
      <p class="quote-number">{{ quoteNumber }}</p>
    </div>
  </div>

  <!-- Quote Info & Parties -->
  <div class="info-section">
    <div class="info-column">
      <h3 class="section-title">Quote Details</h3>
      <table class="info-table">
        <tr>
          <td class="label">Issue Date:</td>
          <td class="value">{{ issueDate }}</td>
        </tr>
        <tr>
          <td class="label">Valid Until:</td>
          <td class="value">{{ validUntil }}</td>
        </tr>
        <tr>
          <td class="label">Quote Number:</td>
          <td class="value">{{ quoteNumber }}</td>
        </tr>
      </table>
    </div>

    <div class="info-column">
      <h3 class="section-title">From</h3>
      <div class="party-info">
        <p class="party-name">{{ companyName }}</p>
        {% if companyAddress %}
        <p class="party-detail">{{ companyAddress }}</p>
        {% endif %}
        {% if companyEmail %}
        <p class="party-detail">{{ companyEmail }}</p>
        {% endif %}
        {% if companyPhone %}
        <p class="party-detail">{{ companyPhone }}</p>
        {% endif %}
      </div>
    </div>

    <div class="info-column">
      <h3 class="section-title">To</h3>
      <div class="party-info">
        <p class="party-name">{{ clientName }}</p>
        {% if clientCompany %}
        <p class="party-detail">{{ clientCompany }}</p>
        {% endif %}
        {% if clientAddress %}
        <p class="party-detail">{{ clientAddress }}</p>
        {% endif %}
        {% if clientEmail %}
        <p class="party-detail">{{ clientEmail }}</p>
        {% endif %}
      </div>
    </div>
  </div>

  <!-- Line Items Table -->
  <div class="line-items-section">
    <h3 class="section-title">Proposed Services/Products</h3>
    <table class="line-items-table">
      <thead>
        <tr>
          <th class="col-description">Description</th>
          <th class="col-quantity">Qty</th>
          <th class="col-unit-price">Unit Price</th>
          <th class="col-total">Total</th>
        </tr>
      </thead>
      <tbody>
        {% for item in lineItems %}
        <tr>
          <td class="description">{{ item.description }}</td>
          <td class="quantity">{{ item.quantity }}</td>
          <td class="unit-price">{{ currency }}{{ item.unitPrice }}</td>
          <td class="total">{{ currency }}{{ item.total }}</td>
        </tr>
        {% endfor %}
      </tbody>
    </table>
  </div>

  <!-- Totals -->
  <div class="totals-section">
    <div class="totals-spacer"></div>
    <div class="totals-box">
      <table class="totals-table">
        <tr>
          <td class="totals-label">Subtotal:</td>
          <td class="totals-value">{{ currency }}{{ subtotal }}</td>
        </tr>
        {% if taxRate %}
        <tr>
          <td class="totals-label">Tax ({{ taxRate }}%):</td>
          <td class="totals-value">{{ currency }}{{ taxAmount }}</td>
        </tr>
        {% endif %}
        <tr class="total-row">
          <td class="totals-label">Total:</td>
          <td class="totals-value total-amount">{{ currency }}{{ totalAmount }}</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- Notes -->
  {% if notes %}
  <div class="notes-section">
    <h3 class="section-title">Notes</h3>
    <p class="notes-text">{{ notes }}</p>
  </div>
  {% endif %}

  <!-- Terms and Conditions -->
  <div class="terms-section">
    <h3 class="section-title">Terms & Conditions</h3>
    <div class="terms-text">
      {% if termsAndConditions %}
      {{ termsAndConditions }}
      {% else %}
      <ul>
        <li>This quote is valid until {{ validUntil }}.</li>
        <li>Prices are in {{ currency }} and exclude applicable taxes unless stated otherwise.</li>
        <li>Payment terms: 50% deposit upon acceptance, balance due upon project completion.</li>
        <li>Project timeline will be confirmed upon quote acceptance.</li>
        <li>Any changes to scope may affect pricing and will require a revised quote.</li>
      </ul>
      {% endif %}
    </div>
  </div>

  <!-- Call to Action -->
  <div class="cta-section">
    <div class="cta-box">
      <h3 class="cta-title">Ready to Get Started?</h3>
      <p class="cta-text">Please reply to this quote to accept and schedule your project.</p>
      <p class="cta-contact">Contact us: {{ companyEmail }} | {{ companyPhone }}</p>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p class="footer-text">{{ companyName }} | {{ quoteNumber }} | Page 1</p>
  </div>
</body>
</html>
`;

/**
 * Quote/Estimate Template CSS
 */
export const QUOTE_ESTIMATE_TEMPLATE_CSS = `
/* Page Setup */
@page {
  size: A4;
  margin: 20mm;
}

body {
  font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
  color: #1a1a1a;
  line-height: 1.6;
  font-size: 11pt;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 3px solid {{ brandColor }};
}

.company-logo {
  max-width: 180px;
  max-height: 60px;
}

.company-name {
  font-size: 24pt;
  font-weight: 700;
  color: {{ brandColor }};
  margin: 0;
}

.document-title {
  font-size: 28pt;
  font-weight: 700;
  color: {{ brandColor }};
  margin: 0 0 5px 0;
  text-align: right;
}

.quote-number {
  font-size: 12pt;
  color: #666;
  margin: 0;
  text-align: right;
}

/* Info Section */
.info-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 30px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.info-column {
  min-width: 0;
}

.section-title {
  font-size: 12pt;
  font-weight: 700;
  color: {{ brandColor }};
  margin: 0 0 10px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-table {
  width: 100%;
  border-collapse: collapse;
}

.info-table td {
  padding: 4px 0;
  font-size: 10pt;
}

.info-table .label {
  font-weight: 600;
  color: #666;
  padding-right: 10px;
}

.info-table .value {
  color: #1a1a1a;
}

.party-info {
  font-size: 10pt;
}

.party-name {
  font-weight: 700;
  font-size: 11pt;
  margin: 0 0 5px 0;
  color: #1a1a1a;
}

.party-detail {
  margin: 2px 0;
  color: #666;
}

/* Line Items Table */
.line-items-section {
  margin-bottom: 20px;
}

.line-items-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
}

.line-items-table thead {
  background-color: {{ brandColor }};
  color: white;
}

.line-items-table th {
  padding: 12px 10px;
  text-align: left;
  font-weight: 700;
  font-size: 10pt;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.line-items-table tbody tr {
  border-bottom: 1px solid #e0e0e0;
}

.line-items-table tbody tr:last-child {
  border-bottom: 2px solid {{ brandColor }};
}

.line-items-table td {
  padding: 12px 10px;
  font-size: 10pt;
}

.col-description {
  width: 50%;
}

.col-quantity {
  width: 15%;
  text-align: center;
}

.col-unit-price {
  width: 17.5%;
  text-align: right;
}

.col-total {
  width: 17.5%;
  text-align: right;
}

.description {
  font-weight: 500;
  color: #1a1a1a;
}

.quantity {
  text-align: center;
  color: #666;
}

.unit-price {
  text-align: right;
  color: #666;
}

.total {
  text-align: right;
  font-weight: 600;
  color: #1a1a1a;
}

/* Totals Section */
.totals-section {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 30px;
}

.totals-spacer {
  flex: 1;
}

.totals-box {
  width: 300px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.totals-table {
  width: 100%;
  border-collapse: collapse;
}

.totals-table tr {
  border-bottom: 1px solid #e0e0e0;
}

.totals-table tr:last-child {
  border-bottom: none;
}

.totals-label {
  padding: 8px 0;
  font-size: 11pt;
  color: #666;
  text-align: left;
}

.totals-value {
  padding: 8px 0;
  font-size: 11pt;
  font-weight: 600;
  color: #1a1a1a;
  text-align: right;
}

.total-row {
  border-top: 2px solid {{ brandColor }} !important;
}

.total-row .totals-label {
  font-size: 13pt;
  font-weight: 700;
  color: {{ brandColor }};
  padding-top: 12px;
}

.total-row .total-amount {
  font-size: 16pt;
  font-weight: 700;
  color: {{ brandColor }};
  padding-top: 12px;
}

/* Notes Section */
.notes-section {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #fff9e6;
  border-left: 4px solid #ffc107;
  border-radius: 4px;
}

.notes-text {
  margin: 10px 0 0 0;
  font-size: 10pt;
  color: #666;
  line-height: 1.6;
}

/* Terms Section */
.terms-section {
  margin-bottom: 30px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.terms-text {
  margin: 10px 0 0 0;
  font-size: 9pt;
  color: #666;
  line-height: 1.6;
}

.terms-text ul {
  margin: 5px 0;
  padding-left: 20px;
}

.terms-text li {
  margin: 5px 0;
}

/* CTA Section */
.cta-section {
  margin-bottom: 30px;
  text-align: center;
}

.cta-box {
  padding: 25px;
  background: linear-gradient(135deg, {{ brandColor }} 0%, #9F7AEA 100%);
  color: white;
  border-radius: 12px;
}

.cta-title {
  font-size: 16pt;
  font-weight: 700;
  margin: 0 0 10px 0;
}

.cta-text {
  font-size: 11pt;
  margin: 0 0 10px 0;
  opacity: 0.95;
}

.cta-contact {
  font-size: 10pt;
  font-weight: 600;
  margin: 0;
  opacity: 0.9;
}

/* Footer */
.footer {
  margin-top: 40px;
  padding-top: 15px;
  border-top: 1px solid #e0e0e0;
  text-align: center;
}

.footer-text {
  font-size: 9pt;
  color: #999;
  margin: 0;
}
`;
