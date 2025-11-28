/**
 * Event Ticket PDF Template
 *
 * Design Standards:
 * - White background (#FFFFFF)
 * - Black text (#000000)
 * - Configurable highlight color (default: #6B46C1)
 * - Logo support with fallback to organization name
 * - QR code for ticket validation
 * - Template-specific event policies hard-coded
 *
 * Template Variables (passed via data object):
 * - Organization: logo_url, highlight_color, organization_name
 * - Event: event_name, event_date, event_time, event_location, event_address
 * - Ticket: ticket_number, ticket_type, attendee_name, attendee_email
 * - QR Code: qr_code_data (URL for validation)
 */

export const TICKET_TEMPLATE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Event Ticket - {{ticket_number}}</title>
</head>
<body>
    <div class="ticket-container">
        <!-- Event name banner -->
        <div class="event-banner">
            <h1>{{event_name}}</h1>
        </div>

        <!-- Ticket details grid -->
        <div class="ticket-details">
            <div class="detail-section">
                <h3>{{t_attendee}}</h3>
                <div class="detail-content">
                    <div class="attendee-name">{{attendee_name}}</div>
                    <div class="attendee-email">{{attendee_email}}</div>
                </div>
            </div>

            <div class="detail-section">
                <h3>{{t_dateTime}}</h3>
                <div class="detail-content">
                    <div class="event-date">{{event_date}}</div>
                    <div class="event-time">{{event_time}}</div>
                </div>
            </div>

            <div class="detail-section">
                <h3>{{t_location}}</h3>
                <div class="detail-content">
                    <div class="location-name">{{event_location}}</div>
                    <div class="location-address">{{event_address}}</div>
                </div>
            </div>

            <div class="detail-section">
                <h3>{{t_ticketInfo}}</h3>
                <div class="detail-content">
                    <div><strong>{{t_ticketHash}}</strong> {{ticket_number}}</div>
                    <div><strong>{{t_ticketType}}:</strong> {{ticket_type}}</div>
                </div>
            </div>
        </div>

        <!-- QR Code section -->
        <div class="qr-section">
            <div class="qr-code-container">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data={{qr_code_data}}"
                     alt="Ticket QR Code"
                     class="qr-code" />
            </div>
            <div class="qr-instructions">
                <p><strong>{{t_scanAtEntrance}}</strong></p>
                <p>{{t_presentTicket}}</p>
            </div>
        </div>

        <!-- Event policies -->
        <section class="event-policies">
            <h3>{{t_eventPolicies}}</h3>
            <ul>
                <li><strong>{{t_arrival}}:</strong> {{t_arrivalPolicy}}</li>
                <li><strong>{{t_identification}}:</strong> {{t_identificationPolicy}}</li>
                <li><strong>{{t_transfers}}:</strong> {{t_transfersPolicy}}</li>
                <li><strong>{{t_refunds}}:</strong> {{t_refundsPolicy}}</li>
                <li><strong>{{t_accessibility}}:</strong> {{t_accessibilityPolicy}}</li>
                <li><strong>{{t_photography}}:</strong> {{t_photographyPolicy}}</li>
            </ul>

            <h3>{{t_contactInfo}}</h3>
            <p>{{t_forQuestions}} {{organization_name}}.</p>
            <p>{{t_lookForward}}</p>
        </section>

        <!-- Footer -->
        <footer class="footer">
            <p>{{organization_name}} | {{event_name}}</p>
            <p class="ticket-id">Ticket ID: {{ticket_number}}</p>
        </footer>
    </div>
</body>
</html>
`;

export const TICKET_TEMPLATE_CSS = `
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
    padding: 10px;
}

.ticket-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 10px;
}

/* Event banner */
.event-banner {
    background-color: var(--highlight-color);
    color: var(--bg-white);
    padding: 15px;
    margin-bottom: 20px;
    text-align: center;
}

.event-banner h1 {
    margin: 0;
    font-size: 20pt;
    font-weight: 700;
}

/* Ticket details grid */
.ticket-details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-bottom: 20px;
}

.detail-section {
    padding: 12px;
    background-color: #F9FAFB;
    border-radius: 4px;
}

.detail-section h3 {
    color: var(--highlight-color);
    margin-bottom: 10px;
    font-size: 11pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.detail-content {
    font-size: 10pt;
}

.detail-content div {
    margin-bottom: 5px;
}

.attendee-name {
    font-size: 14pt;
    font-weight: 700;
    color: var(--text-black);
}

.attendee-email {
    color: var(--text-gray);
}

.event-date {
    font-size: 12pt;
    font-weight: 600;
}

.event-time {
    color: var(--text-gray);
}

.location-name {
    font-weight: 600;
}

.location-address {
    color: var(--text-gray);
}

/* QR Code section */
.qr-section {
    text-align: center;
    padding: 20px;
    margin-bottom: 20px;
    background-color: #F9FAFB;
    border-radius: 4px;
}

.qr-code-container {
    margin-bottom: 15px;
}

.qr-code {
    width: 160px;
    height: 160px;
    border: 2px solid var(--bg-white);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.qr-instructions {
    font-size: 10pt;
}

.qr-instructions p {
    margin-bottom: 8px;
}

.qr-instructions p:first-child {
    font-size: 12pt;
    color: var(--highlight-color);
}

.qr-instructions p:last-child {
    color: var(--text-gray);
}

/* Event policies */
.event-policies {
    padding: 15px;
    margin-top: 20px;
    border-top: 1px solid var(--border-gray);
}

.event-policies h3 {
    color: var(--highlight-color);
    margin-top: 0;
    margin-bottom: 10px;
    font-size: 11pt;
    font-weight: 600;
}

.event-policies p {
    margin: 6px 0;
    font-size: 9pt;
    color: var(--text-gray);
}

.event-policies ul {
    margin: 8px 0 15px 20px;
    font-size: 8pt;
    color: var(--text-gray);
}

.event-policies li {
    margin-bottom: 6px;
    line-height: 1.5;
}

/* Footer */
.footer {
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px solid var(--border-gray);
    text-align: center;
    font-size: 8pt;
    color: var(--text-light-gray);
}

.footer p {
    margin: 4px 0;
}

.ticket-id {
    font-family: 'Courier New', monospace;
    font-size: 8pt;
    letter-spacing: 1px;
}
`;
