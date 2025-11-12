/**
 * Modern Event Ticket PDF Template
 *
 * Design: Clean, contemporary design with bold typography and ample whitespace
 * Ideal for tech events, conferences, and modern brands
 *
 * Design Standards:
 * - Light background (#FFFFFF)
 * - Dark text (#2D3748)
 * - Configurable primary color (default: #6B46C1 purple)
 * - Gray accents (#718096, #EDF2F7)
 * - Logo support with fallback to organization name
 * - QR code for ticket validation
 *
 * Template Variables (passed via data object):
 * - Organization: logo_url, highlight_color, organization_name
 * - Event: event_name, event_date, event_time, event_location, event_address
 * - Ticket: ticket_number, ticket_type, attendee_name, attendee_email, guest_count
 * - QR Code: qr_code_data (URL for validation)
 * - Order: order_id, order_date, currency, net_price, tax_amount, tax_rate, total_price
 */

export const MODERN_TICKET_TEMPLATE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modern Ticket - {{ticket_number}}</title>
</head>
<body>
    <div class="ticket-container">
        <!-- Colored accent bar at top -->
        <div class="accent-bar-top"></div>

        <!-- Header section -->
        <div class="header-section">
            {%if logo_url%}
                <img src="{{logo_url}}" class="logo" alt="{{organization_name}}" />
            {%else%}
                <div class="logo-text">{{organization_name}}</div>
            {%endif%}
        </div>

        <!-- Event name -->
        <div class="event-name-section">
            <h1>{{event_name}}</h1>
            {%if ticket_type%}
                <div class="ticket-type-badge">{{ticket_type}}</div>
            {%endif%}
        </div>

        <!-- Divider -->
        <div class="divider"></div>

        <!-- Event details list -->
        <div class="details-section">
            <div class="detail-row">
                <div class="detail-label">Date</div>
                <div class="detail-value">{{event_date}}</div>
            </div>

            <div class="detail-row">
                <div class="detail-label">Time</div>
                <div class="detail-value">{{event_time}}</div>
            </div>

            <div class="detail-row">
                <div class="detail-label">Location</div>
                <div class="detail-value">{{event_location}}</div>
            </div>

            {%if guest_count and guest_count > 0%}
            <div class="detail-row">
                <div class="detail-label">Guests</div>
                <div class="detail-value">+{{guest_count}}</div>
            </div>
            {%endif%}
        </div>

        <!-- Divider -->
        <div class="divider"></div>

        <!-- Ticket holder -->
        <div class="holder-section">
            <div class="holder-label">Ticket Holder</div>
            <div class="holder-name">{{attendee_name}}</div>
            {%if attendee_email%}
                <div class="holder-email">{{attendee_email}}</div>
            {%endif%}
        </div>

        <!-- Order summary -->
        {%if order_id%}
        <div class="divider"></div>
        <div class="order-section">
            <div class="order-label">Order Summary</div>
            <div class="order-details">
                <div class="order-row">
                    <span>Order #{{order_id}}</span>
                </div>
                <div class="order-row">
                    <span>Purchased: {{order_date}}</span>
                </div>
                <div class="order-row">
                    <span>Subtotal:</span>
                    <span>{{currency}} {{net_price}}</span>
                </div>
                {%if tax_amount and tax_amount > 0%}
                <div class="order-row">
                    <span>Tax ({{tax_rate}}%):</span>
                    <span>{{currency}} {{tax_amount}}</span>
                </div>
                {%endif%}
                <div class="order-row total-row">
                    <span>Total:</span>
                    <span>{{currency}} {{total_price}}</span>
                </div>
            </div>
        </div>
        {%endif%}

        <!-- QR Code (bottom-right) -->
        <div class="qr-section">
            <div class="qr-code-container">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data={{qr_code_data}}"
                     alt="Ticket QR Code"
                     class="qr-code" />
                <div class="qr-label">Scan to verify</div>
            </div>
        </div>

        <!-- Ticket number -->
        {%if ticket_number%}
        <div class="ticket-number-section">
            <span class="ticket-number-label">Ticket:</span>
            <span class="ticket-number-value">{{ticket_number}}</span>
        </div>
        {%endif%}

        <!-- Footer -->
        <footer class="footer">
            {%if organization_name%}
                <span>{{organization_name}}</span>
            {%endif%}
            {%if organization_email%}
                <span> • {{organization_email}}</span>
            {%endif%}
        </footer>

        <!-- Colored accent bar at bottom -->
        <div class="accent-bar-bottom"></div>
    </div>
</body>
</html>
`;

export const MODERN_TICKET_TEMPLATE_CSS = `
/* Color variables */
:root {
    --primary: {{highlight_color}};
    --dark: #2D3748;
    --gray: #718096;
    --light-gray: #EDF2F7;
    --white: #FFFFFF;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    background-color: var(--white);
    color: var(--dark);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    padding: 40px;
}

.ticket-container {
    max-width: 600px;
    margin: 0 auto;
    background-color: var(--white);
}

/* Colored accent bars */
.accent-bar-top,
.accent-bar-bottom {
    height: 6px;
    background-color: var(--primary);
}

.accent-bar-top {
    margin-bottom: 30px;
}

.accent-bar-bottom {
    margin-top: 30px;
}

/* Header section */
.header-section {
    margin-bottom: 25px;
    padding: 0 20px;
}

.logo {
    max-height: 80px;
    max-width: 300px;
    object-fit: contain;
}

.logo-text {
    font-size: 20px;
    font-weight: 700;
    color: var(--primary);
}

/* Event name section */
.event-name-section {
    padding: 0 20px;
    margin-bottom: 25px;
}

.event-name-section h1 {
    font-size: 32pt;
    font-weight: 800;
    color: var(--dark);
    line-height: 1.2;
    margin-bottom: 12px;
}

.ticket-type-badge {
    display: inline-block;
    padding: 6px 16px;
    background-color: var(--light-gray);
    color: var(--gray);
    font-size: 12pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    border-radius: 4px;
}

/* Divider */
.divider {
    height: 1px;
    background-color: var(--light-gray);
    margin: 20px 20px;
}

/* Details section */
.details-section {
    padding: 0 20px;
}

.detail-row {
    display: flex;
    padding: 12px 0;
    border-bottom: 1px solid var(--light-gray);
}

.detail-row:last-child {
    border-bottom: none;
}

.detail-label {
    flex: 0 0 120px;
    font-size: 11pt;
    font-weight: 700;
    color: var(--gray);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.detail-value {
    flex: 1;
    font-size: 11pt;
    color: var(--dark);
}

/* Ticket holder section */
.holder-section {
    padding: 0 20px;
    margin: 20px 0;
}

.holder-label {
    font-size: 11pt;
    font-weight: 700;
    color: var(--gray);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 10px;
}

.holder-name {
    font-size: 16pt;
    font-weight: 800;
    color: var(--dark);
    margin-bottom: 5px;
}

.holder-email {
    font-size: 11pt;
    color: var(--gray);
}

/* Order section */
.order-section {
    padding: 0 20px;
    margin: 20px 0;
}

.order-label {
    font-size: 11pt;
    font-weight: 700;
    color: var(--gray);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 10px;
}

.order-details {
    font-size: 10pt;
}

.order-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    color: var(--dark);
}

.order-row:first-child,
.order-row:nth-child(2) {
    color: var(--gray);
    font-size: 9pt;
}

.total-row {
    font-size: 12pt;
    font-weight: 700;
    color: var(--dark);
    border-top: 2px solid var(--light-gray);
    margin-top: 8px;
    padding-top: 12px;
}

/* QR Code section */
.qr-section {
    position: absolute;
    bottom: 100px;
    right: 40px;
}

.qr-code-container {
    text-align: center;
}

.qr-code {
    width: 180px;
    height: 180px;
    border: 2px solid var(--light-gray);
}

.qr-label {
    margin-top: 8px;
    font-size: 8pt;
    color: var(--gray);
}

/* Ticket number */
.ticket-number-section {
    padding: 15px 20px;
    font-size: 9pt;
    color: var(--gray);
}

.ticket-number-label {
    font-weight: 600;
}

.ticket-number-value {
    font-family: 'Courier New', monospace;
    letter-spacing: 1px;
}

/* Footer */
.footer {
    text-align: center;
    padding: 15px 20px;
    font-size: 8pt;
    color: var(--gray);
}

.footer span {
    white-space: nowrap;
}

/* Print optimizations */
@media print {
    body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
    }
}
`;
