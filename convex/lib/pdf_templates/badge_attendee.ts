/**
 * ATTENDEE BADGE PDF TEMPLATE
 *
 * Printable name badge for event attendees with QR code for check-in.
 * Purple (#6B46C1) branding matching the email template system.
 *
 * Features:
 * - Large, readable attendee name
 * - Company/organization
 * - Badge type/access level indicator
 * - QR code for scanning at check-in
 * - Event branding
 * - Professional design suitable for printing on badge stock
 * - Standard badge size (4" x 3" / 102mm x 76mm)
 *
 * Use Case: Print badges for event check-in and attendee identification
 *
 * Version: 1.0.0 - Professional System Default
 */

/**
 * Attendee Badge Template HTML
 *
 * Jinja2 template variables:
 * - attendeeName: Full name of attendee
 * - attendeeFirstName: First name
 * - attendeeLastName: Last name
 * - company: Company or organization name
 * - badgeType: Type of access (e.g., "VIP", "Speaker", "Attendee", "Staff")
 * - eventName: Event name
 * - eventDate: Event date
 * - eventLogo: URL to event logo
 * - qrCodeUrl: URL to QR code image for check-in
 * - ticketNumber: Ticket identifier for verification
 * - brandColor: Primary brand color (default: #6B46C1)
 * - backgroundColor: Badge background color (default: white)
 */
export const BADGE_ATTENDEE_TEMPLATE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Badge - {{ attendeeName }}</title>
</head>
<body>
  <!-- Badge Container -->
  <div class="badge-container">
    <div class="badge">
      <!-- Event Header -->
      <div class="badge-header">
        {% if eventLogo %}
        <img src="{{ eventLogo }}" alt="{{ eventName }}" class="event-logo">
        {% else %}
        <h1 class="event-name">{{ eventName }}</h1>
        {% endif %}
      </div>

      <!-- Badge Type Indicator -->
      <div class="badge-type-banner {{ badgeType | lower }}">
        <span class="badge-type-text">{{ badgeType | upper }}</span>
      </div>

      <!-- Attendee Information -->
      <div class="attendee-info">
        <div class="attendee-name">
          {{ attendeeName }}
        </div>
        {% if company %}
        <div class="attendee-company">
          {{ company }}
        </div>
        {% endif %}
      </div>

      <!-- QR Code -->
      <div class="qr-section">
        {% if qrCodeUrl %}
        <img src="{{ qrCodeUrl }}" alt="Check-in QR Code" class="qr-code">
        <p class="qr-label">Scan to Check In</p>
        {% endif %}
      </div>

      <!-- Ticket Number -->
      <div class="ticket-info">
        <p class="ticket-number">{{ ticketNumber }}</p>
      </div>

      <!-- Event Date -->
      <div class="badge-footer">
        <p class="event-date">{{ eventDate }}</p>
      </div>
    </div>
  </div>

  <!-- Cutting Guide (for printing) -->
  <div class="cutting-guide">
    <p>Cut along dashed lines. Standard badge size: 4" × 3" (102mm × 76mm)</p>
  </div>
</body>
</html>
`;

/**
 * Attendee Badge Template CSS
 */
export const BADGE_ATTENDEE_TEMPLATE_CSS = `
/* Page Setup - Badge Size */
@page {
  size: 4in 3in landscape;
  margin: 0;
}

body {
  font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
  margin: 0;
  padding: 0;
  background: white;
}

/* Badge Container */
.badge-container {
  width: 4in;
  height: 3in;
  position: relative;
  background: {{ backgroundColor }};
  overflow: hidden;
}

.badge {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 15px;
  box-sizing: border-box;
  border: 3px solid {{ brandColor }};
  background: white;
}

/* Event Header */
.badge-header {
  text-align: center;
  margin-bottom: 10px;
}

.event-logo {
  max-width: 150px;
  max-height: 40px;
}

.event-name {
  font-size: 14pt;
  font-weight: 700;
  color: {{ brandColor }};
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Badge Type Banner */
.badge-type-banner {
  padding: 6px 12px;
  text-align: center;
  margin-bottom: 15px;
  border-radius: 4px;
  background-color: {{ brandColor }};
}

.badge-type-banner.vip {
  background: linear-gradient(135deg, #d4af37 0%, #f4e5a1 100%);
}

.badge-type-banner.speaker {
  background: linear-gradient(135deg, #e74c3c 0%, #f39c12 100%);
}

.badge-type-banner.staff {
  background: linear-gradient(135deg, #3498db 0%, #2ecc71 100%);
}

.badge-type-banner.attendee {
  background: linear-gradient(135deg, {{ brandColor }} 0%, #9F7AEA 100%);
}

.badge-type-text {
  font-size: 10pt;
  font-weight: 700;
  color: white;
  letter-spacing: 2px;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
}

/* Attendee Information */
.attendee-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  margin-bottom: 15px;
}

.attendee-name {
  font-size: 22pt;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 8px;
  line-height: 1.2;
  word-wrap: break-word;
}

.attendee-company {
  font-size: 12pt;
  color: #666;
  font-weight: 500;
  margin-top: 5px;
}

/* QR Code Section */
.qr-section {
  text-align: center;
  margin-bottom: 10px;
}

.qr-code {
  width: 80px;
  height: 80px;
  border: 2px solid {{ brandColor }};
  border-radius: 8px;
  padding: 4px;
  background: white;
}

.qr-label {
  font-size: 8pt;
  color: #999;
  margin: 5px 0 0 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Ticket Information */
.ticket-info {
  text-align: center;
  padding: 5px 0;
  border-top: 1px dashed #ccc;
}

.ticket-number {
  font-size: 9pt;
  font-family: 'Courier New', monospace;
  color: #999;
  margin: 0;
  letter-spacing: 1px;
}

/* Badge Footer */
.badge-footer {
  text-align: center;
  padding-top: 5px;
}

.event-date {
  font-size: 9pt;
  color: #666;
  margin: 0;
  font-weight: 600;
}

/* Cutting Guide */
.cutting-guide {
  display: none; /* Hidden in final PDF, shown in preview */
  position: absolute;
  bottom: -30px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 8pt;
  color: #999;
  padding: 5px;
}

/* Print Optimization */
@media print {
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .cutting-guide {
    display: block;
  }
}
`;
