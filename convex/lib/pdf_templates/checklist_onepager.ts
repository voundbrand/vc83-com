/**
 * CHECKLIST ONE-PAGER PDF TEMPLATE
 *
 * Single-page lead magnet template for checklists, quick reference guides, and worksheets.
 * Professional purple (#6B46C1) branding matching the email template system.
 *
 * Features:
 * - Clean, single-page layout
 * - Checkboxes for actionable items
 * - Section headers and grouping
 * - Branded header and footer
 * - Print-friendly design
 * - Visual icons and accents
 *
 * Use Case: Lead magnet delivery paired with email_lead_magnet_delivery
 *
 * Version: 1.0.0 - Professional System Default
 */

/**
 * Checklist One-Pager Template HTML
 *
 * Jinja2 template variables:
 * - title: Checklist title (e.g., "The Ultimate Marketing Checklist")
 * - subtitle: Optional subtitle
 * - description: Brief description of checklist purpose
 * - author: Author name or company
 * - authorLogo: URL to logo image
 * - sections: Array of {title, items: [text]} objects
 * - brandColor: Primary brand color (default: #6B46C1)
 * - footerText: Copyright/legal text
 */
export const CHECKLIST_ONEPAGER_TEMPLATE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>{{ title }}</title>
</head>
<body>
  <div class="checklist-container">
    <!-- Header -->
    <div class="checklist-header">
      {% if authorLogo %}
      <img src="{{ authorLogo }}" alt="{{ author }}" class="header-logo">
      {% endif %}

      <div class="header-accent-bar"></div>

      <h1 class="checklist-title">{{ title }}</h1>

      {% if subtitle %}
      <p class="checklist-subtitle">{{ subtitle }}</p>
      {% endif %}

      {% if description %}
      <p class="checklist-description">{{ description }}</p>
      {% endif %}
    </div>

    <!-- Checklist Sections -->
    <div class="checklist-content">
      {% for section in sections %}
      <div class="checklist-section">
        <h2 class="section-title">
          <span class="section-number">{{ loop.index }}</span>
          {{ section.title }}
        </h2>

        <div class="checklist-items">
          {% for item in section.items %}
          <div class="checklist-item">
            <div class="checkbox">
              <svg class="checkbox-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="{{ brandColor | default('#6B46C1') }}" stroke-width="2"/>
              </svg>
            </div>
            <span class="item-text">{{ item }}</span>
          </div>
          {% endfor %}
        </div>
      </div>
      {% endfor %}
    </div>

    <!-- Footer -->
    <div class="checklist-footer">
      <div class="footer-accent-bar"></div>

      <div class="footer-content">
        <p class="footer-author">{{ author }}</p>
        {% if footerText %}
        <p class="footer-text">{{ footerText }}</p>
        {% endif %}
      </div>
    </div>
  </div>
</body>
</html>
`;

/**
 * Checklist One-Pager Template CSS
 *
 * Professional styling with purple accent color (#6B46C1).
 * Optimized for single-page printing and PDF rendering.
 */
export const CHECKLIST_ONEPAGER_TEMPLATE_CSS = `
/* Reset and Base Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: #1a1a1a;
  line-height: 1.6;
  font-size: 10pt;
  background: #ffffff;
}

/* Container */
.checklist-container {
  max-width: 8.5in;
  margin: 0 auto;
  padding: 0.75in;
  min-height: 11in;
  display: flex;
  flex-direction: column;
}

/* Header */
.checklist-header {
  text-align: center;
  margin-bottom: 40px;
  padding-bottom: 30px;
  border-bottom: 2px solid #e2e8f0;
}

.header-logo {
  max-width: 140px;
  height: auto;
  margin-bottom: 20px;
}

.header-accent-bar {
  width: 80px;
  height: 4px;
  background: {{ brandColor | default('#6B46C1') }};
  margin: 0 auto 20px;
  border-radius: 2px;
}

.checklist-title {
  font-size: 26pt;
  font-weight: 700;
  color: {{ brandColor | default('#6B46C1') }};
  line-height: 1.2;
  margin-bottom: 12px;
  letter-spacing: -0.5px;
}

.checklist-subtitle {
  font-size: 14pt;
  color: #64748b;
  margin-bottom: 16px;
  font-weight: 500;
}

.checklist-description {
  font-size: 11pt;
  color: #475569;
  line-height: 1.6;
  max-width: 600px;
  margin: 0 auto;
}

/* Content */
.checklist-content {
  flex: 1;
  margin-bottom: 30px;
}

.checklist-section {
  margin-bottom: 30px;
}

.section-title {
  font-size: 15pt;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: {{ brandColor | default('#6B46C1') }};
  color: #ffffff;
  border-radius: 50%;
  font-size: 13pt;
  font-weight: 700;
}

.checklist-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checklist-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px;
  border-left: 3px solid {{ brandColor | default('#6B46C1') }};
  transition: background 0.2s;
}

.checklist-item:hover {
  background: #f1f5f9;
}

.checkbox {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  margin-top: 2px;
}

.checkbox-icon {
  width: 100%;
  height: 100%;
}

.item-text {
  font-size: 11pt;
  color: #334155;
  line-height: 1.5;
  flex: 1;
}

/* Footer */
.checklist-footer {
  margin-top: auto;
  padding-top: 20px;
  border-top: 2px solid #e2e8f0;
  text-align: center;
}

.footer-accent-bar {
  width: 60px;
  height: 3px;
  background: {{ brandColor | default('#6B46C1') }};
  margin: 0 auto 16px;
  border-radius: 2px;
}

.footer-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.footer-author {
  font-size: 11pt;
  color: #1a1a1a;
  font-weight: 600;
}

.footer-text {
  font-size: 9pt;
  color: #64748b;
}

/* Print Optimizations */
@media print {
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .checklist-container {
    page-break-inside: avoid;
  }

  .checklist-section {
    page-break-inside: avoid;
  }
}

/* Alternative Checkbox Style (Filled) */
.checkbox-filled .checkbox-icon {
  fill: {{ brandColor | default('#6B46C1') }};
}

.checkbox-filled .checkbox-icon rect {
  fill: {{ brandColor | default('#6B46C1') }};
  stroke: {{ brandColor | default('#6B46C1') }};
}

/* Two-Column Layout Option */
@media screen and (min-width: 768px) {
  .checklist-items-two-column {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
}
`;
