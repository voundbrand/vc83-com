/**
 * Invoice PDF Template
 *
 * Design Standards:
 * - White background (#FFFFFF)
 * - Black text (#000000)
 * - Configurable highlight color (default: #6B46C1)
 * - Logo support with fallback to organization name
 * - Template-specific payment terms and information hard-coded
 *
 * Template Variables (passed via data object):
 * - Organization: logo_url, highlight_color, organization_name, organization_address, organization_phone, organization_email
 * - Invoice: invoice_number, invoice_date, due_date, bill_to (company_name, address, city, state, zip_code)
 * - Items: items[] (description, quantity, rate, amount)
 * - Totals: subtotal, tax, tax_rate, total
 */

export const INVOICE_TEMPLATE_HTML = `
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
                <div><strong>{{t_due}}</strong> {{due_date}}</div>
            </div>
        </div>

        <!-- Bill to section -->
        <section class="bill-to">
            <h3>{{t_billTo}}</h3>
            <div class="bill-to-content">
                <div>{{bill_to.company_name}}</div>
                <div>{{bill_to.address}}</div>
                <div>{{bill_to.city}}, {{bill_to.state}} {{bill_to.zip_code}}</div>
            </div>
        </section>

        <!-- Line items table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th class="item-desc">{{t_itemDescription}}</th>
                    <th class="item-qty">{{t_qty}}</th>
                    <th class="item-price">{{t_price}}</th>
                    <th class="item-total">{{t_total}}</th>
                </tr>
            </thead>
            <tbody>
                {%for item in items%}
                <tr>
                    <td class="item-desc">{{item.description}}</td>
                    <td class="item-qty">{{item.quantity}}</td>
                    <td class="item-price">\${{ '%0.2f' % item.rate}}</td>
                    <td class="item-total">\${{ '%0.2f' % item.amount}}</td>
                </tr>
                {%endfor%}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="3" class="subtotal-label">{{t_subtotal}}</td>
                    <td class="subtotal-amount">{{subtotal_formatted}}</td>
                </tr>
                {%if has_multiple_tax_rates%}
                    {%for tax_group in tax_groups%}
                    <tr>
                        <td colspan="3" class="tax-label">{{t_tax}} ({{tax_group.rate_formatted}})</td>
                        <td class="tax-amount">{{tax_group.tax_amount_formatted}}</td>
                    </tr>
                    {%endfor%}
                {%else%}
                    <tr>
                        <td colspan="3" class="tax-label">{{t_tax}} ({{tax_rate}}%)</td>
                        <td class="tax-amount">{{tax_formatted}}</td>
                    </tr>
                {%endif%}
                <tr class="total-row">
                    <td colspan="3" class="total-label"><strong>{{t_total}}</strong></td>
                    <td class="total-amount"><strong>{{total_formatted}}</strong></td>
                </tr>
            </tfoot>
        </table>

        <!-- Payment terms and information (hard-coded template info) -->
        <section class="payment-terms">
            <h3>{{t_paymentTerms}}</h3>
            <p>{{t_paymentDue}} <strong>{{due_date}}</strong>.</p>

            <h3>{{t_thankYou}}</h3>
            <p>{{t_forQuestions}} {{organization_email}} {{t_contactUs}} {{organization_phone}}.</p>
        </section>

        <!-- Footer -->
        <footer class="footer">
            <p>{{organization_name}} | {{organization_email}} | {{organization_phone}}</p>
        </footer>
    </div>
</body>
</html>
`;

export const INVOICE_TEMPLATE_CSS = `
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

/* Bill to section */
.bill-to {
    margin-bottom: 30px;
}

.bill-to h3 {
    color: var(--highlight-color);
    margin-bottom: 10px;
    font-size: 12pt;
    font-weight: 600;
}

.bill-to-content div {
    margin-bottom: 4px;
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
    font-size: 10pt;
}

.items-table .item-desc {
    width: 50%;
}

.items-table .item-qty {
    width: 15%;
    text-align: center;
}

.items-table .item-price,
.items-table .item-total {
    width: 17.5%;
    text-align: right;
}

.items-table tbody tr:hover {
    background-color: #F9FAFB;
}

/* Table footer (totals) */
.items-table tfoot td {
    padding: 8px 12px;
    text-align: right;
}

.items-table tfoot .subtotal-label,
.items-table tfoot .tax-label,
.items-table tfoot .total-label {
    text-align: right;
    padding-right: 20px;
}

.items-table tfoot .total-row {
    border-top: 2px solid var(--highlight-color);
}

.items-table tfoot .total-row td {
    font-size: 14pt;
    padding-top: 15px;
}

/* Payment terms */
.payment-terms {
    background-color: #F9FAFB;
    padding: 20px;
    margin-top: 40px;
    border-left: 4px solid var(--highlight-color);
}

.payment-terms h3 {
    color: var(--highlight-color);
    margin-top: 0;
    margin-bottom: 10px;
    font-size: 11pt;
    font-weight: 600;
}

.payment-terms p {
    margin: 5px 0 10px 0;
    font-size: 10pt;
    color: var(--text-gray);
}

.payment-terms ul {
    margin: 10px 0 20px 20px;
    font-size: 10pt;
    color: var(--text-gray);
}

.payment-terms li {
    margin-bottom: 5px;
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
`;
