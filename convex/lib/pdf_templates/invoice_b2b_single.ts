/**
 * B2B Single Invoice PDF Template
 *
 * Professional invoice for individual B2B transactions.
 * Supports complete VAT breakdown (net, VAT, gross).
 *
 * Design Standards:
 * - White background (#FFFFFF)
 * - Black text (#000000)
 * - Configurable highlight color (default: #6B46C1)
 * - Logo support with fallback to organization name
 * - Professional B2B invoice format
 *
 * Template Variables (passed via data object):
 * - Organization: logo_url, highlight_color, organization_name, organization_address, organization_phone, organization_email
 * - Invoice: invoice_number, invoice_date, due_date, bill_to (company_name, contact_name, address, city, state, zip_code, vat_number)
 * - Items: items[] (description, quantity, unit_price, tax_amount, total_price, tax_rate)
 * - Totals: subtotal (net), tax (VAT), total (gross), tax_rate, currency
 * - Payment: payment_terms, payment_method
 */

export const INVOICE_B2B_SINGLE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice {{invoice_number}}</title>
</head>
<body>
    <div class="invoice-container">
        <!-- Header with logo and organization info -->
        <header class="header">
            <div class="logo-section">
                {%if logo_url%}
                    <img src="{{logo_url}}" class="logo" alt="{{organization_name}}" />
                {%else%}
                    <div class="logo-text">{{organization_name}}</div>
                {%endif%}
            </div>
            <div class="org-info">
                <div><strong>{{organization_name}}</strong></div>
                <div>{{organization_address}}</div>
                <div>{{organization_phone}} | {{organization_email}}</div>
            </div>
        </header>

        <!-- Invoice header bar with highlight color -->
        <div class="invoice-header">
            <h1>{{t_invoice}}</h1>
            <div class="invoice-meta">
                <div><strong>{{t_invoiceNumber}}</strong> {{invoice_number}}</div>
                <div><strong>{{t_date}}</strong> {{invoice_date}}</div>
                {%if is_paid%}
                    <div class="paid-badge"><strong>{{t_paid}}</strong> - {{t_paidOn}} {{paid_at}}</div>
                {%else%}
                    <div><strong>{{t_due}}</strong> {{due_date}}</div>
                {%endif%}
            </div>
        </div>
        
        {%if is_paid%}
        <!-- Payment received notice -->
        <div class="payment-received-notice">
            <strong>{{t_paymentReceived}}</strong> - {{t_paidOn}} {{paid_at}}
            {%if payment_method%}
                <br/>{{t_method}}: {{payment_method}}
            {%endif%}
        </div>
        {%endif%}

        <!-- Bill From and Bill To sections side by side -->
        <div class="billing-info">
            <section class="bill-from">
                <h3>{{t_from}}</h3>
                <div class="bill-from-content">
                    <div><strong>{{organization_name}}</strong></div>
                    <div>{{organization_address}}</div>
                    <div>{{organization_phone}}</div>
                    <div>{{organization_email}}</div>
                </div>
            </section>

            <section class="bill-to">
                <h3>{{t_billTo}}</h3>
                <div class="bill-to-content">
                    <div><strong>{{bill_to.company_name}}</strong></div>
                    {%if bill_to.contact_name%}
                        <div>{{t_attention}} {{bill_to.contact_name}}</div>
                    {%endif%}
                    <div>{{bill_to.address}}</div>
                    <div>{{bill_to.city}}, {{bill_to.state}} {{bill_to.zip_code}}</div>
                    {%if bill_to.vat_number%}
                        <div>{{t_vat}}: {{bill_to.vat_number}}</div>
                    {%endif%}
                </div>
            </section>
        </div>

        <!-- Line items table with VAT breakdown -->
        <table class="items-table">
            <thead>
                <tr>
                    <th class="item-desc">{{t_itemDescription}}</th>
                    <th class="item-qty">{{t_qty}}</th>
                    <th class="item-price">{{t_unitPrice}}<br/>({{t_net}})</th>
                    <th class="item-tax">{{t_tax}}<br/>({{tax_rate}}%)</th>
                    <th class="item-total">{{t_total}}<br/>({{t_gross}})</th>
                </tr>
            </thead>
            <tbody>
                {%for item in items%}
                <tr>
                    <td class="item-desc">{{item.description}}</td>
                    <td class="item-qty">{{item.quantity}}</td>
                    <td class="item-price">{{item.unit_price_formatted}}</td>
                    <td class="item-tax">{{item.tax_amount_formatted}}</td>
                    <td class="item-total">{{item.total_price_formatted}}</td>
                </tr>
                {%endfor%}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="4" class="subtotal-label">{{t_subtotal}} ({{t_net}})</td>
                    <td class="subtotal-amount">{{subtotal_formatted}}</td>
                </tr>
                {%if has_multiple_tax_rates%}
                    {%for tax_group in tax_groups%}
                    <tr>
                        <td colspan="4" class="tax-label">{{t_tax}} ({{tax_group.rate_formatted}})</td>
                        <td class="tax-amount">{{tax_group.tax_amount_formatted}}</td>
                    </tr>
                    {%endfor%}
                {%else%}
                    <tr>
                        <td colspan="4" class="tax-label">{{t_tax}} ({{tax_rate}}%)</td>
                        <td class="tax-amount">{{tax_formatted}}</td>
                    </tr>
                {%endif%}
                <tr class="total-row">
                    <td colspan="4" class="total-label"><strong>{{t_total}} ({{t_gross}})</strong></td>
                    <td class="total-amount"><strong>{{total_formatted}}</strong></td>
                </tr>
            </tfoot>
        </table>

        <!-- Payment information -->
        <section class="payment-info">
            {%if is_paid%}
                <h3>{{t_paymentReceived}}</h3>
                <p>
                    <strong>{{t_status}}</strong> {{t_paid}}<br/>
                    <strong>{{t_paidOn}}</strong> {{paid_at}}
                    {%if payment_method%}
                        <br/><strong>{{t_method}}</strong> {{payment_method}}
                    {%endif%}
                </p>
            {%else%}
                <h3>{{t_paymentTerms}}</h3>
                <p>
                    <strong>{{t_terms}}</strong> {{payment_terms}}<br/>
                    {%if payment_method%}
                        <strong>{{t_method}}</strong> {{payment_method}}<br/>
                    {%endif%}
                </p>
                <p>{{t_paymentDue}} <strong>{{due_date}}</strong>. {{t_latePayment}}</p>
            {%endif%}
            <p>{{t_forQuestions}} {{organization_email}} {{t_contactUs}} {{organization_phone}}.</p>
        </section>

        <!-- Footer -->
        <footer class="footer">
            <p>{{organization_name}} | {{organization_email}} | {{organization_phone}}</p>
            <p class="thank-you">{{t_thankYou}}</p>
        </footer>
    </div>
</body>
</html>
`;

export const INVOICE_B2B_SINGLE_CSS = `
/* Base styles */
:root {
    --bg-white: #FFFFFF;
    --text-black: #000000;
    --text-gray: #666666;
    --text-light-gray: #999999;
    --border-gray: #E5E7EB;
    --highlight-color: {{highlight_color}};
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    background-color: var(--bg-white);
    color: var(--text-black);
    font-family: 'Inter', 'Helvetica', 'Arial', sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    padding: 30px 40px;
}

@page {
    margin: 0;
}

.invoice-container {
    max-width: 800px;
    margin: 0 auto;
}

/* Header */
.header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 2px solid var(--highlight-color);
}

.logo {
    max-height: 80px;
    max-width: 300px;
    object-fit: contain;
}

.logo-text {
    font-size: 24px;
    font-weight: 700;
    color: var(--highlight-color);
}

.org-info {
    text-align: right;
    font-size: 10pt;
    color: var(--text-gray);
}

.org-info div {
    margin-bottom: 4px;
}

/* Invoice header */
.invoice-header {
    background-color: var(--highlight-color);
    color: var(--bg-white);
    padding: 20px;
    margin-bottom: 30px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.invoice-header h1 {
    margin: 0;
    font-size: 28pt;
    font-weight: 700;
}

.invoice-meta {
    text-align: right;
    font-size: 10pt;
}

.invoice-meta div {
    margin-bottom: 4px;
}

.paid-badge {
    color: #10B981;
    font-weight: 700;
    font-size: 11pt;
}

.payment-received-notice {
    background-color: #D1FAE5;
    border: 2px solid #10B981;
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 30px;
    text-align: center;
    color: #065F46;
    font-size: 12pt;
    font-weight: 600;
}

/* Billing info (Bill From and Bill To) */
.billing-info {
    display: flex;
    justify-content: space-between;
    gap: 40px;
    margin-bottom: 30px;
}

.bill-from,
.bill-to {
    flex: 1;
}

.bill-from h3,
.bill-to h3 {
    color: var(--highlight-color);
    margin-bottom: 10px;
    font-size: 12pt;
    font-weight: 600;
}

.bill-from-content div,
.bill-to-content div {
    margin-bottom: 4px;
    font-size: 10pt;
}

/* Items table */
.items-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 30px;
}

.items-table thead {
    background-color: var(--highlight-color);
    color: var(--bg-white);
}

.items-table th,
.items-table td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid var(--border-gray);
}

.items-table th {
    font-weight: 600;
    font-size: 9pt;
    line-height: 1.2;
}

.items-table .item-desc {
    width: 40%;
}

.items-table .item-qty {
    width: 10%;
    text-align: center;
}

.items-table .item-price,
.items-table .item-tax,
.items-table .item-total {
    width: 16.66%;
    text-align: right;
}

.items-table tbody tr:hover {
    background-color: #F9FAFB;
}

.items-table tbody td {
    font-size: 10pt;
}

/* Table footer (totals) */
.items-table tfoot td {
    padding: 8px 12px;
    text-align: right;
    font-size: 11pt;
}

.items-table tfoot .subtotal-label,
.items-table tfoot .tax-label,
.items-table tfoot .total-label {
    text-align: right;
    padding-right: 20px;
    font-weight: 500;
}

.items-table tfoot .total-row {
    border-top: 2px solid var(--highlight-color);
}

.items-table tfoot .total-row td {
    font-size: 14pt;
    padding-top: 15px;
    font-weight: bold;
}

/* Payment information */
.payment-info {
    background-color: #F9FAFB;
    padding: 20px;
    margin-top: 30px;
    border-left: 4px solid var(--highlight-color);
}

.payment-info h3 {
    color: var(--highlight-color);
    margin-top: 0;
    margin-bottom: 10px;
    font-size: 11pt;
    font-weight: 600;
}

.payment-info p {
    margin: 8px 0;
    font-size: 10pt;
    color: var(--text-gray);
}

/* Footer */
.footer {
    margin-top: 30px;
    padding-top: 15px;
    padding-bottom: 0;
    border-top: 1px solid var(--border-gray);
    text-align: center;
    font-size: 9pt;
    color: var(--text-light-gray);
}

.footer p {
    margin: 5px 0;
}

.footer .thank-you {
    margin-top: 10px;
    font-weight: 600;
    color: var(--highlight-color);
}
`;
