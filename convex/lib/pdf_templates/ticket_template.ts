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
        </div>

        <!-- Ticket details grid -->
        <div class="ticket-details">
            <div class="detail-section">
                <h3>Attendee</h3>
                <div class="detail-content">
                    <div class="attendee-name">{{attendee_name}}</div>
                    <div class="attendee-email">{{attendee_email}}</div>
                </div>
            </div>

            <div class="detail-section">
                <h3>Date & Time</h3>
                <div class="detail-content">
                    <div class="event-date">{{event_date}}</div>
                    <div class="event-time">{{event_time}}</div>
                </div>
            </div>

            <div class="detail-section">
                <h3>Location</h3>
                <div class="detail-content">
                    <div class="location-name">{{event_location}}</div>
                    <div class="location-address">{{event_address}}</div>
                </div>
            </div>

            <div class="detail-section">
                <h3>Ticket Information</h3>
                <div class="detail-content">
                    <div><strong>Ticket #:</strong> {{ticket_number}}</div>
                    <div><strong>Type:</strong> {{ticket_type}}</div>
                </div>
            </div>
        </div>

        <!-- QR Code section -->
        <div class="qr-section">
            <div class="qr-code-container">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={{qr_code_data}}"
                     alt="Ticket QR Code"
                     class="qr-code" />
            </div>
            <div class="qr-instructions">
                <p><strong>Scan at entrance for check-in</strong></p>
                <p>Please present this ticket (digital or printed) at the event entrance.</p>
            </div>
        </div>

        <!-- Event policies (hard-coded template info) -->
        <section class="event-policies">
            <h3>Event Policies</h3>
            <ul>
                <li><strong>Arrival:</strong> Please arrive 30 minutes before the event start time for registration and check-in.</li>
                <li><strong>Identification:</strong> Valid photo ID may be required for entrance.</li>
                <li><strong>Transfers:</strong> Tickets are non-transferable unless authorized by the event organizer.</li>
                <li><strong>Refunds:</strong> Refund policy varies by event. Contact the organizer for details.</li>
                <li><strong>Accessibility:</strong> For accessibility accommodations, please contact us at least 48 hours before the event.</li>
                <li><strong>Photography:</strong> By attending, you consent to being photographed or recorded for promotional purposes.</li>
            </ul>

            <h3>Contact Information</h3>
            <p>For questions or support regarding this event ticket, please contact {{organization_name}}.</p>
            <p>We look forward to seeing you at the event!</p>
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
    padding: 40px;
}

.ticket-container {
    max-width: 600px;
    margin: 0 auto;
    border: 3px solid var(--highlight-color);
    padding: 30px;
}

/* Logo section */
.logo-section {
    text-align: center;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 2px solid var(--border-gray);
}

.logo {
    max-height: 120px;
    max-width: 400px;
    object-fit: contain;
}

.logo-text {
    font-size: 28px;
    font-weight: 700;
    color: var(--highlight-color);
}

/* Event banner */
.event-banner {
    background-color: var(--highlight-color);
    color: var(--bg-white);
    padding: 25px;
    margin-bottom: 30px;
    text-align: center;
}

.event-banner h1 {
    margin: 0;
    font-size: 24pt;
    font-weight: 700;
}

/* Ticket details grid */
.ticket-details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 25px;
    margin-bottom: 30px;
}

.detail-section {
    padding: 15px;
    border-left: 4px solid var(--highlight-color);
    background-color: #F9FAFB;
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
    padding: 30px;
    margin-bottom: 30px;
    border: 2px dashed var(--highlight-color);
    background-color: #F9FAFB;
}

.qr-code-container {
    margin-bottom: 20px;
}

.qr-code {
    width: 200px;
    height: 200px;
    border: 4px solid var(--bg-white);
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
    padding: 20px;
    margin-top: 30px;
    border-top: 2px solid var(--border-gray);
}

.event-policies h3 {
    color: var(--highlight-color);
    margin-top: 0;
    margin-bottom: 15px;
    font-size: 12pt;
    font-weight: 600;
}

.event-policies p {
    margin: 8px 0;
    font-size: 10pt;
    color: var(--text-gray);
}

.event-policies ul {
    margin: 10px 0 20px 20px;
    font-size: 9pt;
    color: var(--text-gray);
}

.event-policies li {
    margin-bottom: 8px;
    line-height: 1.6;
}

/* Footer */
.footer {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid var(--border-gray);
    text-align: center;
    font-size: 9pt;
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
