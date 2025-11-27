/**
 * EVENT PROGRAM PDF TEMPLATE
 *
 * Event schedule/agenda document for attendees.
 * Purple (#6B46C1) branding matching the email template system.
 *
 * Features:
 * - Event header with branding
 * - Date, time, and venue information
 * - Session schedule with times and descriptions
 * - Speaker information
 * - Track/room assignments
 * - Breaks and networking sessions
 * - Clean, easy-to-scan layout
 * - Professional typography
 *
 * Use Case: Provide event schedule to attendees for reference
 *
 * Version: 1.0.0 - Professional System Default
 */

/**
 * Event Program Template HTML
 *
 * Jinja2 template variables:
 * - eventName: Event name
 * - eventTagline: Event tagline/subtitle
 * - eventDate: Event date
 * - eventLogo: URL to event logo
 * - venue: Venue name
 * - venueAddress: Full venue address
 * - venueMapUrl: URL to venue map image (optional)
 * - welcomeMessage: Opening message from organizers
 * - sessions: Array of session objects with:
 *   - time: Session time (e.g., "09:00 - 10:30")
 *   - title: Session title
 *   - description: Session description
 *   - speaker: Speaker name
 *   - speakerTitle: Speaker title/company
 *   - track: Track or room name (optional)
 *   - type: Session type (e.g., "keynote", "workshop", "break", "networking")
 * - organizerInfo: Contact information
 * - brandColor: Primary brand color (default: #6B46C1)
 * - socialMedia: Social media handles (optional)
 */
export const PROGRAM_EVENT_TEMPLATE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>{{ eventName }} - Program</title>
</head>
<body>
  <!-- Header -->
  <div class="program-header">
    <div class="header-branding">
      {% if eventLogo %}
      <img src="{{ eventLogo }}" alt="{{ eventName }}" class="event-logo">
      {% else %}
      <h1 class="event-title">{{ eventName }}</h1>
      {% endif %}
      {% if eventTagline %}
      <p class="event-tagline">{{ eventTagline }}</p>
      {% endif %}
    </div>
    <div class="header-info">
      <div class="info-item">
        <span class="info-icon">📅</span>
        <span class="info-text">{{ eventDate }}</span>
      </div>
      <div class="info-item">
        <span class="info-icon">📍</span>
        <span class="info-text">{{ venue }}</span>
      </div>
    </div>
  </div>

  <!-- Welcome Message -->
  {% if welcomeMessage %}
  <div class="welcome-section">
    <h2 class="section-title">Welcome</h2>
    <p class="welcome-text">{{ welcomeMessage }}</p>
  </div>
  {% endif %}

  <!-- Venue Information -->
  <div class="venue-section">
    <h2 class="section-title">Venue</h2>
    <div class="venue-details">
      <div class="venue-info">
        <h3 class="venue-name">{{ venue }}</h3>
        <p class="venue-address">{{ venueAddress }}</p>
      </div>
      {% if venueMapUrl %}
      <div class="venue-map">
        <img src="{{ venueMapUrl }}" alt="Venue Map" class="map-image">
      </div>
      {% endif %}
    </div>
  </div>

  <!-- Program Schedule -->
  <div class="schedule-section">
    <h2 class="section-title">Program Schedule</h2>

    {% for session in sessions %}
    <div class="session {{ session.type }}">
      <div class="session-time-block">
        <div class="session-time">{{ session.time }}</div>
        {% if session.track %}
        <div class="session-track">{{ session.track }}</div>
        {% endif %}
      </div>

      <div class="session-content">
        <h3 class="session-title">{{ session.title }}</h3>

        {% if session.description %}
        <p class="session-description">{{ session.description }}</p>
        {% endif %}

        {% if session.speaker %}
        <div class="speaker-info">
          <span class="speaker-name">{{ session.speaker }}</span>
          {% if session.speakerTitle %}
          <span class="speaker-title"> - {{ session.speakerTitle }}</span>
          {% endif %}
        </div>
        {% endif %}
      </div>

      {% if session.type == 'break' %}
      <div class="session-badge break-badge">Break</div>
      {% elif session.type == 'networking' %}
      <div class="session-badge networking-badge">Networking</div>
      {% elif session.type == 'keynote' %}
      <div class="session-badge keynote-badge">Keynote</div>
      {% endif %}
    </div>
    {% endfor %}
  </div>

  <!-- Organizer Info & Footer -->
  <div class="footer-section">
    <div class="footer-content">
      <div class="organizer-info">
        <h3 class="footer-title">Questions?</h3>
        <p class="footer-text">{{ organizerInfo }}</p>
      </div>
      {% if socialMedia %}
      <div class="social-media">
        <h3 class="footer-title">Follow Us</h3>
        <p class="footer-text">{{ socialMedia }}</p>
      </div>
      {% endif %}
    </div>
    <div class="footer-tagline">
      <p>{{ eventName }} • {{ eventDate }}</p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Event Program Template CSS
 */
export const PROGRAM_EVENT_TEMPLATE_CSS = `
/* Page Setup */
@page {
  size: A4;
  margin: 15mm;
}

body {
  font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
  color: #1a1a1a;
  line-height: 1.6;
  font-size: 10pt;
}

/* Header */
.program-header {
  text-align: center;
  padding: 20px 0 30px 0;
  margin-bottom: 30px;
  border-bottom: 3px solid {{ brandColor }};
}

.event-logo {
  max-width: 250px;
  max-height: 80px;
  margin-bottom: 15px;
}

.event-title {
  font-size: 28pt;
  font-weight: 700;
  color: {{ brandColor }};
  margin: 0 0 10px 0;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.event-tagline {
  font-size: 14pt;
  color: #666;
  font-weight: 400;
  margin: 10px 0 20px 0;
  font-style: italic;
}

.header-info {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-top: 15px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-icon {
  font-size: 14pt;
}

.info-text {
  font-size: 11pt;
  color: #333;
  font-weight: 600;
}

/* Section Titles */
.section-title {
  font-size: 16pt;
  font-weight: 700;
  color: {{ brandColor }};
  margin: 0 0 15px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid {{ brandColor }};
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Welcome Section */
.welcome-section {
  margin-bottom: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #f8f5ff 0%, #ffffff 100%);
  border-left: 4px solid {{ brandColor }};
  border-radius: 8px;
}

.welcome-text {
  margin: 10px 0 0 0;
  font-size: 10pt;
  color: #555;
  line-height: 1.8;
}

/* Venue Section */
.venue-section {
  margin-bottom: 30px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.venue-details {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.venue-info {
  flex: 1;
}

.venue-name {
  font-size: 14pt;
  font-weight: 700;
  color: #1a1a1a;
  margin: 10px 0 8px 0;
}

.venue-address {
  font-size: 10pt;
  color: #666;
  margin: 0;
  line-height: 1.6;
}

.venue-map {
  flex-shrink: 0;
  width: 200px;
}

.map-image {
  width: 100%;
  border: 2px solid #ddd;
  border-radius: 8px;
}

/* Schedule Section */
.schedule-section {
  margin-bottom: 30px;
}

.session {
  display: flex;
  gap: 20px;
  padding: 15px;
  margin-bottom: 15px;
  background-color: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  position: relative;
  transition: all 0.2s;
}

.session:hover {
  border-color: {{ brandColor }};
  box-shadow: 0 2px 8px rgba(107, 70, 193, 0.1);
}

.session.keynote {
  background: linear-gradient(135deg, #fff5f5 0%, #ffffff 100%);
  border-color: {{ brandColor }};
  border-width: 3px;
}

.session.break {
  background-color: #f0f0f0;
  border-style: dashed;
}

.session.networking {
  background: linear-gradient(135deg, #f5fff5 0%, #ffffff 100%);
}

/* Session Time Block */
.session-time-block {
  flex-shrink: 0;
  width: 120px;
  text-align: center;
}

.session-time {
  font-size: 12pt;
  font-weight: 700;
  color: {{ brandColor }};
  margin-bottom: 5px;
  font-family: 'Courier New', monospace;
}

.session-track {
  font-size: 8pt;
  color: white;
  background-color: {{ brandColor }};
  padding: 3px 8px;
  border-radius: 12px;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
}

/* Session Content */
.session-content {
  flex: 1;
}

.session-title {
  font-size: 12pt;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.session-description {
  font-size: 9pt;
  color: #666;
  margin: 0 0 10px 0;
  line-height: 1.6;
}

.speaker-info {
  font-size: 9pt;
  color: #555;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e0e0e0;
}

.speaker-name {
  font-weight: 700;
  color: {{ brandColor }};
}

.speaker-title {
  color: #666;
  font-style: italic;
}

/* Session Badges */
.session-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 8pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.keynote-badge {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  color: white;
}

.break-badge {
  background-color: #95a5a6;
  color: white;
}

.networking-badge {
  background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
  color: white;
}

/* Footer Section */
.footer-section {
  margin-top: 40px;
  padding: 20px;
  background-color: #f8f9fa;
  border-top: 3px solid {{ brandColor }};
  border-radius: 8px;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  gap: 30px;
  margin-bottom: 15px;
}

.footer-title {
  font-size: 11pt;
  font-weight: 700;
  color: {{ brandColor }};
  margin: 0 0 8px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.footer-text {
  font-size: 9pt;
  color: #666;
  margin: 0;
  line-height: 1.6;
}

.footer-tagline {
  text-align: center;
  padding-top: 15px;
  border-top: 1px solid #ddd;
}

.footer-tagline p {
  font-size: 9pt;
  color: #999;
  margin: 0;
  font-weight: 600;
}

/* Print Optimization */
@media print {
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .session {
    page-break-inside: avoid;
  }
}
`;
