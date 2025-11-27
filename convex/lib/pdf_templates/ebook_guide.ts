/**
 * EBOOK/GUIDE PDF TEMPLATE
 *
 * Multi-page lead magnet template for ebooks, guides, and comprehensive resources.
 * Professional purple (#6B46C1) branding matching the email template system.
 *
 * Features:
 * - Cover page with title/subtitle/author
 * - Table of contents (auto-generated from chapters)
 * - Multiple chapters with content
 * - Page numbers and headers/footers
 * - Branded design throughout
 * - Professional typography and spacing
 *
 * Use Case: Lead magnet delivery paired with email_lead_magnet_delivery
 *
 * Version: 1.0.0 - Professional System Default
 */

/**
 * Ebook/Guide Template HTML
 *
 * Jinja2 template variables:
 * - title: Ebook title (e.g., "The Ultimate Marketing Playbook")
 * - subtitle: Optional subtitle
 * - author: Author name or company
 * - authorLogo: URL to logo image
 * - coverImage: Optional cover image URL
 * - chapters: Array of {title, content} objects
 * - brandColor: Primary brand color (default: #6B46C1)
 * - footerText: Copyright/legal text
 * - publishDate: Publication date
 */
export const EBOOK_GUIDE_TEMPLATE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>{{ title }}</title>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover-page">
    <div class="cover-header">
      {% if authorLogo %}
      <img src="{{ authorLogo }}" alt="{{ author }}" class="cover-logo">
      {% endif %}
    </div>

    <div class="cover-content">
      {% if coverImage %}
      <div class="cover-image-container">
        <img src="{{ coverImage }}" alt="{{ title }}" class="cover-image">
      </div>
      {% endif %}

      <h1 class="cover-title">{{ title }}</h1>

      {% if subtitle %}
      <p class="cover-subtitle">{{ subtitle }}</p>
      {% endif %}

      <div class="cover-meta">
        <p class="cover-author">By {{ author }}</p>
        {% if publishDate %}
        <p class="cover-date">{{ publishDate }}</p>
        {% endif %}
      </div>
    </div>

    <div class="cover-footer">
      <div class="accent-bar"></div>
    </div>
  </div>

  <!-- Table of Contents -->
  <div class="toc-page page-break">
    <div class="page-header">
      <span class="page-header-title">{{ title }}</span>
      <span class="page-number">2</span>
    </div>

    <h2 class="toc-title">Table of Contents</h2>

    <div class="toc-list">
      {% for chapter in chapters %}
      <div class="toc-item">
        <span class="toc-number">{{ loop.index }}</span>
        <span class="toc-chapter-title">{{ chapter.title }}</span>
        <span class="toc-dots"></span>
        <span class="toc-page">{{ loop.index + 2 }}</span>
      </div>
      {% endfor %}
    </div>

    <div class="page-footer">
      <div class="footer-bar"></div>
    </div>
  </div>

  <!-- Chapters -->
  {% for chapter in chapters %}
  <div class="chapter-page page-break">
    <div class="page-header">
      <span class="page-header-title">{{ title }}</span>
      <span class="page-number">{{ loop.index + 2 }}</span>
    </div>

    <div class="chapter-content">
      <div class="chapter-number">Chapter {{ loop.index }}</div>
      <h2 class="chapter-title">{{ chapter.title }}</h2>

      <div class="chapter-text">
        {{ chapter.content | safe }}
      </div>
    </div>

    <div class="page-footer">
      <div class="footer-bar"></div>
      {% if footerText %}
      <p class="footer-text">{{ footerText }}</p>
      {% endif %}
    </div>
  </div>
  {% endfor %}

  <!-- Back Cover / Final Page -->
  <div class="back-cover page-break">
    <div class="back-content">
      <div class="accent-bar-large"></div>

      <h3 class="back-title">Thank You for Reading!</h3>

      <p class="back-text">
        We hope this guide was valuable for you. For more resources and updates,
        visit our website or get in touch with us.
      </p>

      <div class="back-contact">
        <p class="back-author">{{ author }}</p>
        {% if authorWebsite %}
        <p class="back-website">{{ authorWebsite }}</p>
        {% endif %}
        {% if authorEmail %}
        <p class="back-email">{{ authorEmail }}</p>
        {% endif %}
      </div>

      {% if authorLogo %}
      <div class="back-logo-container">
        <img src="{{ authorLogo }}" alt="{{ author }}" class="back-logo">
      </div>
      {% endif %}
    </div>
  </div>
</body>
</html>
`;

/**
 * Ebook/Guide Template CSS
 *
 * Professional styling with purple accent color (#6B46C1).
 * Optimized for PDF rendering with proper page breaks and print styles.
 */
export const EBOOK_GUIDE_TEMPLATE_CSS = `
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
  font-size: 11pt;
}

/* Page Break Utility */
.page-break {
  page-break-before: always;
  page-break-after: always;
  min-height: 100vh;
  position: relative;
}

/* Cover Page */
.cover-page {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  padding: 60px 80px;
  position: relative;
}

.cover-header {
  text-align: center;
}

.cover-logo {
  max-width: 180px;
  height: auto;
}

.cover-content {
  text-align: center;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.cover-image-container {
  margin-bottom: 40px;
}

.cover-image {
  max-width: 400px;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.cover-title {
  font-size: 42pt;
  font-weight: 700;
  color: {{ brandColor | default('#6B46C1') }};
  line-height: 1.2;
  margin-bottom: 20px;
  letter-spacing: -1px;
}

.cover-subtitle {
  font-size: 18pt;
  color: #64748b;
  margin-bottom: 40px;
  max-width: 600px;
}

.cover-meta {
  margin-top: 40px;
}

.cover-author {
  font-size: 14pt;
  color: #334155;
  font-weight: 600;
  margin-bottom: 8px;
}

.cover-date {
  font-size: 12pt;
  color: #64748b;
}

.cover-footer {
  text-align: center;
}

.accent-bar {
  width: 120px;
  height: 6px;
  background: {{ brandColor | default('#6B46C1') }};
  margin: 0 auto;
  border-radius: 3px;
}

/* Page Headers and Footers */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30px 60px 20px;
  border-bottom: 2px solid #e2e8f0;
  margin-bottom: 40px;
}

.page-header-title {
  font-size: 10pt;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
}

.page-number {
  font-size: 10pt;
  color: {{ brandColor | default('#6B46C1') }};
  font-weight: 600;
}

.page-footer {
  position: absolute;
  bottom: 30px;
  left: 60px;
  right: 60px;
}

.footer-bar {
  width: 100%;
  height: 2px;
  background: #e2e8f0;
  margin-bottom: 12px;
}

.footer-text {
  font-size: 9pt;
  color: #94a3b8;
  text-align: center;
}

/* Table of Contents */
.toc-page {
  padding: 0 60px 80px;
}

.toc-title {
  font-size: 28pt;
  color: {{ brandColor | default('#6B46C1') }};
  margin-bottom: 40px;
  font-weight: 700;
}

.toc-list {
  margin-bottom: 60px;
}

.toc-item {
  display: flex;
  align-items: baseline;
  margin-bottom: 18px;
  font-size: 12pt;
}

.toc-number {
  color: {{ brandColor | default('#6B46C1') }};
  font-weight: 700;
  min-width: 40px;
  font-size: 14pt;
}

.toc-chapter-title {
  color: #1a1a1a;
  font-weight: 500;
  margin-right: 8px;
}

.toc-dots {
  flex: 1;
  border-bottom: 2px dotted #cbd5e1;
  margin: 0 12px 4px;
}

.toc-page {
  color: #64748b;
  font-weight: 600;
  min-width: 40px;
  text-align: right;
}

/* Chapter Pages */
.chapter-page {
  padding: 0 60px 80px;
}

.chapter-content {
  margin-bottom: 60px;
}

.chapter-number {
  font-size: 11pt;
  color: {{ brandColor | default('#6B46C1') }};
  text-transform: uppercase;
  letter-spacing: 2px;
  font-weight: 700;
  margin-bottom: 12px;
}

.chapter-title {
  font-size: 24pt;
  color: #1a1a1a;
  margin-bottom: 30px;
  font-weight: 700;
  line-height: 1.3;
}

.chapter-text {
  color: #334155;
  line-height: 1.8;
}

.chapter-text p {
  margin-bottom: 18px;
}

.chapter-text h3 {
  font-size: 16pt;
  color: {{ brandColor | default('#6B46C1') }};
  margin-top: 30px;
  margin-bottom: 16px;
  font-weight: 600;
}

.chapter-text h4 {
  font-size: 13pt;
  color: #1a1a1a;
  margin-top: 24px;
  margin-bottom: 12px;
  font-weight: 600;
}

.chapter-text ul, .chapter-text ol {
  margin-left: 30px;
  margin-bottom: 18px;
}

.chapter-text li {
  margin-bottom: 10px;
}

.chapter-text strong {
  color: #1a1a1a;
  font-weight: 600;
}

.chapter-text em {
  font-style: italic;
  color: #475569;
}

.chapter-text blockquote {
  border-left: 4px solid {{ brandColor | default('#6B46C1') }};
  padding-left: 20px;
  margin: 24px 0;
  font-style: italic;
  color: #475569;
  background: #f8fafc;
  padding: 20px;
  border-radius: 6px;
}

/* Back Cover */
.back-cover {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, {{ brandColor | default('#6B46C1') }} 0%, #553C9A 100%);
  padding: 60px 80px;
  color: #ffffff;
  text-align: center;
}

.back-content {
  max-width: 600px;
}

.accent-bar-large {
  width: 80px;
  height: 6px;
  background: rgba(255, 255, 255, 0.5);
  margin: 0 auto 40px;
  border-radius: 3px;
}

.back-title {
  font-size: 28pt;
  font-weight: 700;
  margin-bottom: 24px;
  color: #ffffff;
}

.back-text {
  font-size: 13pt;
  line-height: 1.8;
  margin-bottom: 40px;
  color: rgba(255, 255, 255, 0.9);
}

.back-contact {
  margin-bottom: 40px;
}

.back-author {
  font-size: 16pt;
  font-weight: 600;
  margin-bottom: 12px;
  color: #ffffff;
}

.back-website,
.back-email {
  font-size: 12pt;
  margin-bottom: 6px;
  color: rgba(255, 255, 255, 0.9);
}

.back-logo-container {
  margin-top: 40px;
}

.back-logo {
  max-width: 160px;
  height: auto;
  opacity: 0.9;
}

/* Print Optimizations */
@media print {
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page-break {
    page-break-before: always;
    page-break-inside: avoid;
  }
}
`;
