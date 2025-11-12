/**
 * VIP Premium Event Ticket PDF Template
 *
 * Design: Exclusive VIP design with premium styling and VIP badge
 * Features elevated aesthetics for VIP ticket holders
 *
 * Design Standards:
 * - Very dark background (#0f0f0f)
 * - VIP gold accents (#FFD700)
 * - Silver highlights (#C0C0C0)
 * - Light text (#f5f5f5)
 * - Logo support with fallback to organization name
 * - QR code for ticket validation
 * - VIP badge/indicator
 *
 * Template Variables (passed via data object):
 * - Organization: logo_url, highlight_color, organization_name, organization_email, organization_phone, organization_website
 * - Event: event_name, event_date, event_time, event_location, event_address, event_sponsors
 * - Ticket: ticket_number, ticket_type, attendee_name, attendee_email, guest_count
 * - QR Code: qr_code_data (URL for validation)
 * - Order: order_id, order_date, currency, net_price, tax_amount, tax_rate, total_price
 */

export const VIP_PREMIUM_TICKET_TEMPLATE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VIP Premium Ticket - {{ticket_number}}</title>
</head>
<body>
    <div class="ticket-container">
        <!-- VIP Badge -->
        <div class="vip-badge-container">
            <div class="vip-badge">⭐ V I P ⭐</div>
        </div>

        <!-- Event name -->
        <div class="event-name-section">
            <h1>{{event_name}}</h1>
            {%if ticket_type%}
                <div class="ticket-type">{{ticket_type}}</div>
            {%endif%}
        </div>

        <!-- Event sponsors -->
        {%if event_sponsors%}
        <div class="sponsors-section">
            {%if event_sponsors|length == 1%}
                <p>Presented by {{event_sponsors[0].name}}</p>
            {%else%}
                <p>Presented by:</p>
                <ul>
                {%for sponsor in event_sponsors%}
                    <li>
                        {%if sponsor.level%}
                            • {{sponsor.name}} ({{sponsor.level}})
                        {%else%}
                            • {{sponsor.name}}
                        {%endif%}
                    </li>
                {%endfor%}
                </ul>
            {%endif%}
        </div>
        {%endif%}

        <!-- Decorative line -->
        <div class="decorative-line"></div>

        <!-- QR Code (centered, prominent) -->
        <div class="qr-section">
            <div class="qr-frame">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data={{qr_code_data}}"
                     alt="VIP Ticket QR Code"
                     class="qr-code" />
            </div>
            <div class="qr-label">EXCLUSIVE VIP ACCESS</div>
        </div>

        <!-- Decorative line -->
        <div class="decorative-line"></div>

        <!-- Event details (centered layout) -->
        <div class="event-details">
            <div class="detail-item">
                <div class="detail-value">{{event_date}}</div>
            </div>

            <div class="detail-item">
                <div class="detail-value">{{event_time}}</div>
            </div>

            <div class="detail-item">
                <div class="detail-value location">{{event_location}}</div>
            </div>

            {%if guest_count and guest_count > 0%}
            <div class="detail-item">
                <div class="detail-value">Plus {{guest_count}} Guest{%if guest_count > 1%}s{%endif%}</div>
            </div>
            {%endif%}
        </div>

        <!-- Decorative line -->
        <div class="decorative-line"></div>

        <!-- VIP ticket holder -->
        <div class="holder-section">
            <div class="holder-label">VIP TICKET HOLDER</div>
            <div class="holder-name">{{attendee_name}}</div>
            {%if attendee_email%}
                <div class="holder-email">{{attendee_email}}</div>
            {%endif%}
        </div>

        <!-- Order information -->
        {%if order_id%}
        <div class="order-section">
            <div class="order-row">
                <span>Order #{{order_id}}</span>
            </div>
            <div class="order-row">
                <span>Purchased: {{order_date}}</span>
            </div>
            <div class="order-total">
                <span>Total: {{currency}} {{total_price}}</span>
            </div>
        </div>
        {%endif%}

        <!-- Ticket number (barcode style) -->
        {%if ticket_number%}
        <div class="ticket-number-section">
            <div class="ticket-number-label">TICKET NUMBER</div>
            <div class="ticket-number-value">{{ticket_number}}</div>
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

        <!-- Gold accent bar at bottom -->
        <div class="accent-bar-bottom"></div>
    </div>
</body>
</html>
`;

export const VIP_PREMIUM_TICKET_TEMPLATE_CSS = `
/* Color variables */
:root {
    --vip-gold: #FFD700;
    --vip-silver: #C0C0C0;
    --dark-bg: #0f0f0f;
    --light-text: #f5f5f5;
    --mid-gray: #808080;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    background-color: var(--dark-bg);
    color: var(--light-text);
    font-family: 'Helvetica Neue', 'Arial', sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    padding: 40px;
}

.ticket-container {
    max-width: 600px;
    margin: 0 auto;
    background-color: var(--dark-bg);
    padding: 30px;
    border: 2px solid var(--vip-gold);
}

/* VIP Badge */
.vip-badge-container {
    text-align: center;
    margin-bottom: 25px;
}

.vip-badge {
    display: inline-block;
    background: linear-gradient(135deg, var(--vip-gold) 0%, #FFA500 100%);
    color: var(--dark-bg);
    padding: 10px 40px;
    font-size: 12pt;
    font-weight: 900;
    letter-spacing: 4px;
    border-radius: 5px;
    box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
}

/* Event name section */
.event-name-section {
    text-align: center;
    margin-bottom: 15px;
}

.event-name-section h1 {
    font-size: 26pt;
    font-weight: 900;
    color: var(--vip-gold);
    letter-spacing: 1px;
    margin-bottom: 10px;
}

.ticket-type {
    font-size: 16pt;
    color: var(--vip-silver);
    text-transform: uppercase;
    letter-spacing: 2px;
    font-weight: 400;
}

/* Sponsors section */
.sponsors-section {
    text-align: center;
    padding: 12px 0;
    margin-bottom: 15px;
    font-size: 10pt;
    color: var(--vip-silver);
    font-style: italic;
}

.sponsors-section ul {
    list-style: none;
    margin-top: 6px;
}

.sponsors-section li {
    margin-bottom: 3px;
}

/* Decorative line */
.decorative-line {
    height: 1px;
    background: linear-gradient(90deg, transparent 0%, var(--vip-gold) 50%, transparent 100%);
    margin: 20px 0;
}

/* QR Section */
.qr-section {
    text-align: center;
    margin: 25px 0;
}

.qr-frame {
    display: inline-block;
    padding: 8px;
    border: 3px solid var(--vip-gold);
    background-color: #FFFFFF;
    box-shadow: 0 6px 20px rgba(255, 215, 0, 0.3);
}

.qr-code {
    width: 240px;
    height: 240px;
    display: block;
}

.qr-label {
    margin-top: 15px;
    font-size: 9pt;
    color: var(--vip-silver);
    letter-spacing: 2px;
    text-transform: uppercase;
}

/* Event details */
.event-details {
    text-align: center;
    padding: 15px 0;
}

.detail-item {
    margin-bottom: 12px;
}

.detail-value {
    font-size: 10pt;
    color: var(--light-text);
}

.detail-value.location {
    font-size: 11pt;
    font-weight: 600;
}

/* VIP holder section */
.holder-section {
    text-align: center;
    padding: 20px 0;
}

.holder-label {
    font-size: 9pt;
    color: var(--vip-silver);
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 10px;
}

.holder-name {
    font-size: 15pt;
    font-weight: 900;
    color: var(--vip-gold);
    margin-bottom: 6px;
}

.holder-email {
    font-size: 10pt;
    color: var(--light-text);
}

/* Order section */
.order-section {
    text-align: center;
    padding: 15px 0;
    margin-top: 20px;
    border-top: 1px solid var(--mid-gray);
}

.order-row {
    font-size: 9pt;
    color: var(--vip-silver);
    margin-bottom: 5px;
}

.order-total {
    font-size: 12pt;
    font-weight: 700;
    color: var(--vip-gold);
    margin-top: 10px;
}

/* Ticket number barcode */
.ticket-number-section {
    text-align: center;
    padding: 20px 0;
    margin-top: 15px;
    border-top: 1px solid var(--mid-gray);
}

.ticket-number-label {
    font-size: 8pt;
    color: var(--vip-silver);
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 8px;
}

.ticket-number-value {
    font-size: 12pt;
    font-weight: 900;
    color: var(--vip-gold);
    font-family: 'Courier New', monospace;
    letter-spacing: 4px;
}

/* Footer */
.footer {
    text-align: center;
    padding: 15px 0;
    font-size: 8pt;
    color: var(--mid-gray);
    line-height: 1.8;
}

.footer span {
    white-space: nowrap;
}

/* Gold accent bar at bottom */
.accent-bar-bottom {
    height: 6px;
    background: linear-gradient(90deg, var(--vip-gold) 0%, #FFA500 50%, var(--vip-gold) 100%);
    margin-top: 25px;
    margin-left: -30px;
    margin-right: -30px;
    margin-bottom: -30px;
}

/* Print optimizations */
@media print {
    body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
    }
}
`;
