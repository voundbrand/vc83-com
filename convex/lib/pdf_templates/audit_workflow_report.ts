/**
 * AUDIT WORKFLOW REPORT PDF TEMPLATE
 *
 * One-page deliverable for the One of One audit flow.
 * Focused on a single high-leverage workflow recommendation with
 * immediate action steps and implementation guardrails.
 *
 * Version: 1.0.0 - One of One audit-mode deliverable
 */

/**
 * Audit Workflow Report Template HTML
 *
 * Jinja2 template variables:
 * - title: Report title
 * - subtitle: Optional subtitle
 * - generatedDate: Human-readable generation date
 * - author: Operator/brand name
 * - authorLogo: Optional logo URL
 * - clientName: Client/prospect name
 * - businessType: Business type/industry
 * - revenueRange: Revenue band
 * - teamSize: Team size descriptor
 * - workflowName: Recommended workflow title
 * - workflowSummary: Why this workflow matters now
 * - workflowOutcome: Primary expected result
 * - weeklyHoursRecovered: Estimated hours recovered per week
 * - actionPlan: Array of {step, owner, timing}
 * - guardrails: Array of guardrail strings
 * - toolingRecommendations: Array of tooling recommendation strings
 * - ctaLine: Optional post-audit call to action line
 * - brandColor: Primary accent color
 * - footerText: Optional footer text
 */
export const AUDIT_WORKFLOW_REPORT_TEMPLATE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>{{ title | default('One Workflow Report') }}</title>
</head>
<body>
  <div class="report">
    <header class="report-header">
      <div class="header-top-row">
        {% if authorLogo %}
        <img src="{{ authorLogo }}" alt="{{ author }}" class="author-logo" />
        {% endif %}
        <div class="header-meta">
          <span class="meta-label">Generated</span>
          <span class="meta-value">{{ generatedDate }}</span>
        </div>
      </div>

      <div class="accent-line"></div>

      <h1 class="report-title">{{ title | default('One Workflow Report') }}</h1>
      {% if subtitle %}
      <p class="report-subtitle">{{ subtitle }}</p>
      {% endif %}
    </header>

    <section class="grid two-col summary-grid">
      <article class="card">
        <h2 class="card-title">Business Snapshot</h2>
        <ul class="detail-list">
          <li><span class="label">Client</span><span class="value">{{ clientName }}</span></li>
          <li><span class="label">Business</span><span class="value">{{ businessType }}</span></li>
          <li><span class="label">Revenue</span><span class="value">{{ revenueRange }}</span></li>
          <li><span class="label">Team</span><span class="value">{{ teamSize }}</span></li>
        </ul>
      </article>

      <article class="card impact-card">
        <h2 class="card-title">Expected Weekly Lift</h2>
        <p class="impact-number">{{ weeklyHoursRecovered }} hours</p>
        <p class="impact-copy">{{ workflowOutcome }}</p>
      </article>
    </section>

    <section class="card workflow-card">
      <h2 class="card-title">Recommended Workflow</h2>
      <h3 class="workflow-name">{{ workflowName }}</h3>
      <p class="workflow-summary">{{ workflowSummary }}</p>
    </section>

    <section class="grid two-col plan-grid">
      <article class="card">
        <h2 class="card-title">7-Day Action Plan</h2>
        <ol class="plan-list">
          {% for item in actionPlan %}
          <li>
            <div class="plan-step">{{ item.step }}</div>
            <div class="plan-meta">{{ item.owner }}{% if item.timing %} - {{ item.timing }}{% endif %}</div>
          </li>
          {% endfor %}
        </ol>
      </article>

      <article class="card">
        <h2 class="card-title">Guardrails</h2>
        <ul class="bullet-list">
          {% for guardrail in guardrails %}
          <li>{{ guardrail }}</li>
          {% endfor %}
        </ul>

        <h2 class="card-title spacing-top">Tooling Recommendations</h2>
        <ul class="bullet-list compact">
          {% for recommendation in toolingRecommendations %}
          <li>{{ recommendation }}</li>
          {% endfor %}
        </ul>
      </article>
    </section>

    <footer class="report-footer">
      {% if ctaLine %}
      <p class="cta-line">{{ ctaLine }}</p>
      {% endif %}
      <p class="footer-author">Prepared by {{ author }}</p>
      {% if footerText %}
      <p class="footer-text">{{ footerText }}</p>
      {% endif %}
    </footer>
  </div>
</body>
</html>
`;

/**
 * Audit Workflow Report Template CSS
 */
export const AUDIT_WORKFLOW_REPORT_TEMPLATE_CSS = `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  color: #172033;
  background: #ffffff;
  font-size: 10.5pt;
  line-height: 1.45;
}

.report {
  width: 8.5in;
  min-height: 11in;
  margin: 0 auto;
  padding: 0.55in;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.report-header {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px 18px;
  background: #f8fafc;
}

.header-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.author-logo {
  max-height: 34px;
  width: auto;
}

.header-meta {
  text-align: right;
}

.meta-label {
  display: block;
  font-size: 8pt;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.meta-value {
  display: block;
  font-size: 9.5pt;
  font-weight: 600;
  color: #334155;
}

.accent-line {
  height: 4px;
  width: 88px;
  border-radius: 999px;
  background: {{ brandColor | default('#1D4ED8') }};
  margin-bottom: 10px;
}

.report-title {
  font-size: 21pt;
  line-height: 1.15;
  color: {{ brandColor | default('#1D4ED8') }};
  margin-bottom: 6px;
}

.report-subtitle {
  color: #475569;
  font-size: 11pt;
}

.grid.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px;
  background: #ffffff;
}

.card-title {
  font-size: 11pt;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 9px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.detail-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.detail-list li {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px dashed #e2e8f0;
  padding-bottom: 5px;
}

.label {
  color: #64748b;
  font-weight: 600;
}

.value {
  color: #0f172a;
  font-weight: 600;
  text-align: right;
}

.impact-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.impact-number {
  font-size: 27pt;
  line-height: 1.1;
  font-weight: 800;
  color: {{ brandColor | default('#1D4ED8') }};
  margin-bottom: 6px;
}

.impact-copy {
  color: #334155;
}

.workflow-card {
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
}

.workflow-name {
  font-size: 17pt;
  line-height: 1.2;
  margin-bottom: 8px;
  color: #0f172a;
}

.workflow-summary {
  color: #334155;
}

.plan-list {
  list-style: decimal;
  margin-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.plan-step {
  font-weight: 600;
  color: #0f172a;
}

.plan-meta {
  color: #64748b;
  font-size: 9pt;
}

.bullet-list {
  list-style: disc;
  margin-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: #334155;
}

.bullet-list.compact {
  gap: 5px;
}

.spacing-top {
  margin-top: 12px;
}

.report-footer {
  margin-top: auto;
  border-top: 1px solid #e2e8f0;
  padding-top: 10px;
}

.cta-line {
  font-size: 10pt;
  color: #1e293b;
  margin-bottom: 6px;
  font-weight: 600;
}

.footer-author {
  font-size: 9.5pt;
  color: #334155;
  margin-bottom: 2px;
}

.footer-text {
  font-size: 8.5pt;
  color: #64748b;
}
`;
