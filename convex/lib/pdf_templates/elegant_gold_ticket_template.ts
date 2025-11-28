/**
 * Elegant Gold Event Ticket PDF Template
 *
 * Design: Luxurious black & gold design for upscale events
 *
 * Design Standards:
 * - Dark background (#1a1412)
 * - Gold accents (#d4af37)
 * - Light gold text (#f4e4c1)
 * - Configurable primary color (defaults to gold)
 * - Logo support with fallback to organization name
 * - QR code for ticket validation
 *
 * Template Variables (passed via data object):
 * - Organization: logo_url, highlight_color, organization_name
 * - Event: event_name, event_date, event_time, event_location, event_address, event_sponsors
 * - Ticket: ticket_number, ticket_type, attendee_name, attendee_email, guest_count
 * - QR Code: qr_code_data (URL for validation)
 */

export const ELEGANT_GOLD_TICKET_TEMPLATE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Elegant Ticket - {{ticket_number}}</title>
</head>
<body>
    <div class="ticket-container">
        <!-- Gold accent bar at top -->
        <div class="accent-bar-top"></div>

        <!-- Logo section -->
        <div class="logo-section">
            {%if logo_url%}
                <img src="{{logo_url}}" class="logo" alt="{{organization_name}}" />
            {%else%}
                <div class="logo-text">{{organization_name}}</div>
            {%endif%}
        </div>

        <!-- Event name banner -->
        <div class="event-banner">
            <h1>{{event_name}}</h1>
            {%if ticket_type%}
                <div class="ticket-type">{{ticket_type}}</div>
            {%endif%}
        </div>

        <!-- Event sponsors -->
        {%if event_sponsors%}
        <div class="sponsors-section">
            {%if event_sponsors|length == 1%}
                <p>{{t_presentedBy}} {{event_sponsors[0].name}}</p>
            {%else%}
                <p>{{t_presentedBy}}:</p>
                <ul>
                {%for sponsor in event_sponsors%}
                    <li>
                        {%if sponsor.level%}
                            {{sponsor.name}} ({{sponsor.level}})
                        {%else%}
                            {{sponsor.name}}
                        {%endif%}
                    </li>
                {%endfor%}
                </ul>
            {%endif%}
        </div>
        {%endif%}

        <!-- Content grid -->
        <div class="content-grid">
            <!-- Left column: Event details -->
            <div class="event-details">
                <div class="detail-box">
                    <div class="detail-label">{{t_date}}:</div>
                    <div class="detail-value">{{event_date}}</div>
                </div>

                <div class="detail-box">
                    <div class="detail-label">{{t_time}}:</div>
                    <div class="detail-value">{{event_time}}</div>
                </div>

                <div class="detail-box">
                    <div class="detail-label">{{t_venue}}:</div>
                    <div class="detail-value location-name">{{event_location}}</div>
                    <div class="detail-value location-address">{{event_address}}</div>
                </div>

                {%if guest_count and guest_count > 0%}
                <div class="detail-box">
                    <div class="detail-label">{{t_guests}}:</div>
                    <div class="detail-value">+{{guest_count}}</div>
                </div>
                {%endif%}

                <!-- Ticket holder information -->
                <div class="holder-section">
                    <div class="holder-label">{{t_ticketHolder}}</div>
                    <div class="holder-name">{{attendee_name}}</div>
                    {%if attendee_email%}
                        <div class="holder-email">{{attendee_email}}</div>
                    {%endif%}
                </div>
            </div>

            <!-- Right column: QR Code -->
            <div class="qr-column">
                <div class="qr-code-container">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data={{qr_code_data}}"
                         alt="Ticket QR Code"
                         class="qr-code" />
                    <div class="qr-label">{{t_scanToVerify}}</div>
                </div>
            </div>
        </div>

        <!-- Ticket number barcode -->
        {%if ticket_number%}
        <div class="barcode-section">
            <div class="barcode-label">{{t_ticketNumber}}</div>
            <div class="barcode-value">{{ticket_number}}</div>
        </div>
        {%endif%}

        <!-- Footer -->
        <footer class="footer">
            <p>{{organization_name}}</p>
            {%if organization_email%}
                <p>{{organization_email}}</p>
            {%endif%}
            {%if organization_phone%}
                <p>{{organization_phone}}</p>
            {%endif%}
            {%if organization_website%}
                <p>{{organization_website}}</p>
            {%endif%}
        </footer>

        <!-- Gold accent bar at bottom -->
        <div class="accent-bar-bottom"></div>
    </div>
</body>
</html>
`;

export const ELEGANT_GOLD_TICKET_TEMPLATE_CSS = `
/* Color variables */
:root {
    --gold: {{highlight_color}};
    --dark-bg: #1a1412;
    --light-gold: #f4e4c1;
    --mid-gold: #d4af37;
    --accent-gray: #8b7355;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    background-color: var(--dark-bg);
    color: var(--light-gold);
    font-family: 'Garamond', 'Georgia', serif;
    font-size: 11pt;
    line-height: 1.6;
    padding: 10px;
}

.ticket-container {
    background-color: var(--dark-bg);
    position: relative;
    padding: 10px;
}

/* Gold accent bars */
.accent-bar-top,
.accent-bar-bottom {
    height: 8px;
    background: linear-gradient(90deg, var(--gold) 0%, var(--mid-gold) 50%, var(--gold) 100%);
}

.accent-bar-top {
    margin-bottom: 30px;
}

.accent-bar-bottom {
    margin-top: 30px;
}

/* Logo section */
.logo-section {
    text-align: center;
    margin-bottom: 25px;
    padding: 0 40px;
}

.logo {
    max-height: 100px;
    max-width: 350px;
    object-fit: contain;
    filter: brightness(1.2) contrast(1.1);
}

.logo-text {
    font-size: 24px;
    font-weight: 700;
    color: var(--gold);
    letter-spacing: 2px;
    text-transform: uppercase;
}

/* Event banner */
.event-banner {
    text-align: center;
    padding: 20px 40px;
    margin-bottom: 20px;
    border-top: 1px solid var(--gold);
    border-bottom: 1px solid var(--gold);
}

.event-banner h1 {
    font-size: 26pt;
    font-weight: 700;
    color: var(--gold);
    margin-bottom: 10px;
    letter-spacing: 1px;
}

.ticket-type {
    font-size: 14pt;
    color: var(--light-gold);
    text-transform: uppercase;
    letter-spacing: 2px;
    font-weight: 300;
}

/* Sponsors section */
.sponsors-section {
    text-align: center;
    padding: 15px 40px;
    margin-bottom: 25px;
    font-size: 10pt;
    color: var(--accent-gray);
    font-style: italic;
}

.sponsors-section ul {
    list-style: none;
    margin-top: 8px;
}

.sponsors-section li {
    margin-bottom: 4px;
}

/* Content grid */
.content-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 30px;
    padding: 0 40px;
    margin-bottom: 30px;
}

/* Event details */
.event-details {
    border-left: 3px solid var(--gold);
    padding-left: 20px;
}

.detail-box {
    margin-bottom: 20px;
}

.detail-label {
    font-size: 9pt;
    color: var(--accent-gray);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 5px;
}

.detail-value {
    font-size: 11pt;
    color: var(--light-gold);
}

.location-name {
    font-weight: 600;
}

.location-address {
    font-size: 10pt;
    color: var(--accent-gray);
    margin-top: 3px;
}

/* Ticket holder section */
.holder-section {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid var(--accent-gray);
}

.holder-label {
    font-size: 9pt;
    color: var(--accent-gray);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
}

.holder-name {
    font-size: 15pt;
    font-weight: 700;
    color: var(--gold);
    margin-bottom: 5px;
}

.holder-email {
    font-size: 10pt;
    color: var(--light-gold);
}

/* QR Code column */
.qr-column {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
}

.qr-code-container {
    text-align: center;
}

.qr-code {
    width: 220px;
    height: 220px;
    border: 4px solid var(--gold);
    padding: 10px;
    background-color: #FFFFFF;
    box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
}

.qr-label {
    margin-top: 12px;
    font-size: 8pt;
    color: var(--accent-gray);
    letter-spacing: 1.5px;
    text-transform: uppercase;
}

/* Barcode section */
.barcode-section {
    text-align: center;
    padding: 20px 40px;
    margin-bottom: 20px;
    border-top: 1px solid var(--accent-gray);
}

.barcode-label {
    font-size: 8pt;
    color: var(--accent-gray);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
}

.barcode-value {
    font-size: 13pt;
    font-weight: 700;
    color: var(--gold);
    font-family: 'Courier New', monospace;
    letter-spacing: 3px;
}

/* Footer */
.footer {
    text-align: center;
    padding: 20px 40px;
    font-size: 8pt;
    color: var(--accent-gray);
    line-height: 1.8;
}

.footer p {
    margin: 2px 0;
}

/* Print optimizations */
@media print {
    body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
    }
}
`;
