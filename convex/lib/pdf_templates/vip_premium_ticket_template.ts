/**
 * VIP Premium Event Ticket PDF Template (Geschlossene Gesellschaft Style)
 *
 * Design: Luxurious gold & dark design matching geschlossene-gesellschaft frontend
 * Features elegant typography and premium styling for upscale events
 *
 * Design Standards:
 * - Dark brown/black gradient background (#1a1412 to #2c1810)
 * - Elegant gold accents (#d4af37)
 * - Warm gold highlights (#a89968)
 * - Light cream text (#f5f1e8)
 * - Serif typography (Didot, Bodoni, Garamond)
 * - QR code for ticket validation
 * - Ornamental dividers
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
        <!-- Header with ornamental dividers -->
        <div class="header">
            <div class="ornament-top"></div>
            <h1 class="title">Geschlossene Gesellschaft</h1>
            <div class="ornament-bottom"></div>
            <p class="subtitle">Exklusives Event</p>
        </div>

        <!-- Event Information -->
        <div class="event-info">
            <div class="event-name">{{event_name}}</div>

            {%if ticket_type%}
            <div class="ticket-type-badge">{{ticket_type}}</div>
            {%endif%}

            <div class="details-grid">
                <div class="detail-item">
                    <div class="detail-label">Event:</div>
                    <div class="detail-value">{{event_name}}</div>
                </div>

                <div class="detail-item">
                    <div class="detail-label">Datum:</div>
                    <div class="detail-value">{{event_date}}</div>
                </div>

                <div class="detail-item">
                    <div class="detail-label">Zeit:</div>
                    <div class="detail-value">{{event_time}}</div>
                </div>

                <div class="detail-item">
                    <div class="detail-label">Ort:</div>
                    <div class="detail-value">{{event_location}}</div>
                </div>

                {%if guest_count and guest_count > 0%}
                <div class="detail-item">
                    <div class="detail-label">Gäste:</div>
                    <div class="detail-value">+{{guest_count}} {%if guest_count > 1%}Gäste{%else%}Gast{%endif%}</div>
                </div>
                {%endif%}
            </div>
        </div>

        <!-- Guest Information -->
        <div class="guest-info">
            <div class="guest-label">Reserviert für</div>
            <div class="guest-name">{{attendee_name}}</div>
            {%if guest_count and guest_count > 0%}
            <div class="guest-count">+ {{guest_count}} {%if guest_count > 1%}Gäste{%else%}Gast{%endif%}</div>
            {%endif%}
        </div>

        <!-- QR Code Section -->
        <div class="qr-section">
            <div class="qr-container">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data={{qr_code_data}}"
                     alt="Ticket QR Code"
                     class="qr-code" />
            </div>
            <p class="qr-instruction">Bitte an der Tür vorzeigen</p>
            {%if ticket_number%}
            <p class="ticket-id">Ticket-ID: {{ticket_number}}</p>
            {%endif%}
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-line"></div>
            <p class="footer-text">Privat · Offen · Echt</p>
            <p class="footer-disclaimer">
                Dies ist eine kuratierte Veranstaltung. Der Zutritt ist nur mit gültigem Ticket möglich.
            </p>
            {%if organization_name%}
            <p class="footer-org">{{organization_name}}</p>
            {%endif%}
        </div>
    </div>
</body>
</html>
`;

export const VIP_PREMIUM_TICKET_TEMPLATE_CSS = `
/* Color variables - Geschlossene Gesellschaft palette */
:root {
    --elegant-gold: #d4af37;
    --warm-gold: #a89968;
    --cream-text: #f5f1e8;
    --dark-bg: #1a1412;
    --darker-bg: #2c1810;
    --subtle-gray: #6b5d47;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Didot', 'Bodoni MT', 'Garamond', serif;
    background: linear-gradient(135deg, #1a1412 0%, #2c1810 100%);
    color: var(--cream-text);
    margin: 0;
    padding: 0;
}

.ticket-container {
    width: 100%;
    padding: 15px;
    background: linear-gradient(135deg, #1a1412 0%, #2c1810 100%);
}

/* Header */
.header {
    text-align: center;
    padding: 15px 20px 12px;
    border-bottom: 2px solid var(--elegant-gold);
    margin-bottom: 20px;
}

.ornament-top,
.ornament-bottom {
    width: 80px;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--elegant-gold), transparent);
    margin: 0 auto;
}

.ornament-top {
    margin-bottom: 15px;
}

.ornament-bottom {
    margin-top: 15px;
    margin-bottom: 0;
}

.title {
    font-size: 28px;
    font-weight: 300;
    letter-spacing: 6px;
    text-transform: uppercase;
    color: var(--elegant-gold);
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    margin: 0;
    line-height: 1.3;
}

.subtitle {
    font-size: 13px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.8);
    margin: 15px 0 0 0;
    font-weight: 300;
}

/* Event Information */
.event-info {
    margin-bottom: 18px;
}

.event-name {
    font-size: 24px;
    font-weight: 300;
    letter-spacing: 2px;
    color: var(--cream-text);
    text-align: center;
    margin-bottom: 12px;
}

.ticket-type-badge {
    text-align: center;
    font-size: 13px;
    color: var(--elegant-gold);
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 18px;
}

.details-grid {
    background: rgba(212, 175, 55, 0.08);
    border: 1px solid rgba(212, 175, 55, 0.3);
    border-radius: 8px;
    padding: 18px;
    margin-bottom: 15px;
}

.detail-item {
    padding: 8px 0;
    display: flex;
    align-items: center;
    border-bottom: 1px solid rgba(212, 175, 55, 0.1);
}

.detail-item:last-child {
    border-bottom: none;
}

.detail-label {
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--warm-gold);
    width: 120px;
    flex-shrink: 0;
}

.detail-value {
    font-size: 16px;
    font-weight: 300;
    color: var(--cream-text);
    flex: 1;
}

/* Guest Information */
.guest-info {
    text-align: center;
    padding: 15px;
    background: rgba(212, 175, 55, 0.05);
    border-radius: 8px;
    border: 1px dashed rgba(212, 175, 55, 0.3);
    margin-bottom: 18px;
}

.guest-label {
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--elegant-gold);
    margin-bottom: 8px;
}

.guest-name {
    font-size: 24px;
    font-weight: 300;
    letter-spacing: 2px;
    color: var(--cream-text);
    margin-bottom: 5px;
}

.guest-count {
    font-size: 13px;
    color: #d4c5a0;
    letter-spacing: 1px;
}

/* QR Code Section */
.qr-section {
    text-align: center;
    padding: 15px;
    background: rgba(245, 241, 232, 0.95);
    border-radius: 8px;
    margin-bottom: 15px;
}

.qr-container {
    display: inline-block;
    padding: 12px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.qr-code {
    width: 160px;
    height: 160px;
    display: block;
}

.qr-instruction {
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #2c1810;
    margin-top: 12px;
    font-weight: 600;
}

.ticket-id {
    font-size: 10px;
    letter-spacing: 1px;
    color: var(--subtle-gray);
    margin-top: 6px;
    font-family: 'Courier New', monospace;
}

/* Footer */
.footer {
    text-align: center;
    padding-top: 12px;
    border-top: 1px solid rgba(212, 175, 55, 0.2);
}

.footer-line {
    width: 60px;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--elegant-gold), transparent);
    margin: 0 auto 8px;
}

.footer-text {
    font-size: 11px;
    letter-spacing: 2px;
    color: var(--warm-gold);
    margin-bottom: 6px;
}

.footer-disclaimer {
    font-size: 9px;
    line-height: 1.5;
    color: var(--subtle-gray);
    max-width: 500px;
    margin: 0 auto 6px;
}

.footer-org {
    font-size: 9px;
    color: var(--subtle-gray);
    margin-top: 4px;
}

/* Print Optimization */
@media print {
    body {
        background: linear-gradient(135deg, #1a1412 0%, #2c1810 100%);
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
    }

    .ticket-container {
        page-break-inside: avoid;
        page-break-after: avoid;
    }
}
`;
