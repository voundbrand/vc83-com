/**
 * AUDIT WORKFLOW REPORT PDF TEMPLATE
 *
 * One-page deliverable for the One of One audit flow.
 * Focused on a single high-leverage workflow recommendation with
 * immediate action steps and implementation guardrails.
 *
 * Version: 1.1.0 - One of One audit-mode deliverable (quality upgrade)
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
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ title | default('One Workflow Report') }}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body>
  {% set brand = brandColor | default(highlight_color) | default('#1D4ED8') %}
  {% set labelsMap = labels | default({}) %}
  {% set labelDocument = label_document | default(labelsMap.documentLabel) | default('AUDIT RECOMMENDATION') %}
  {% set labelGeneratedPrefix = label_generated_prefix | default(labelsMap.generatedPrefix) | default('Generated') %}
  {% set labelKpi = label_kpi | default(labelsMap.kpiLabel) | default('Expected Weekly Lift') %}
  {% set labelClientSnapshot = label_client_snapshot | default(labelsMap.clientSnapshotTitle) | default('Client Snapshot') %}
  {% set labelClient = label_client | default(labelsMap.clientLabel) | default('Client') %}
  {% set labelBusiness = label_business | default(labelsMap.businessLabel) | default('Business') %}
  {% set labelRevenue = label_revenue | default(labelsMap.revenueLabel) | default('Revenue') %}
  {% set labelTeam = label_team | default(labelsMap.teamLabel) | default('Team') %}
  {% set labelWorkflow = label_workflow | default(labelsMap.workflowTitle) | default('Recommended Workflow') %}
  {% set labelActionPlan = label_action_plan | default(labelsMap.actionPlanTitle) | default('7-Day Action Plan') %}
  {% set labelGuardrails = label_guardrails | default(labelsMap.guardrailsTitle) | default('Execution Guardrails') %}
  {% set labelTooling = label_tooling | default(labelsMap.toolingTitle) | default('Tooling Recommendations') %}
  {% set labelNextMove = label_next_move | default(labelsMap.nextMoveLabel) | default('Next Move') %}
  {% set labelPreparedBy = label_prepared_by | default(labelsMap.preparedByPrefix) | default('Prepared by') %}
  {% set labelConfidentiality = label_confidentiality | default(labelsMap.confidentialityNote) | default('Confidential: Prepared for internal planning use.') %}
  {% set resolvedAuthor = author | default('One of One Operator') %}
  {% set resolvedClientName = client_name | default(clientName) | default('Business Owner') %}
  {% set resolvedBusinessType = business_type | default(businessType) | default('Business in active growth stage') %}
  {% set resolvedRevenue = revenue | default(revenueRange) | default('Revenue range not specified') %}
  {% set resolvedTeamSize = team_size | default(teamSize) | default('Team size not specified') %}
  {% set resolvedLiftHours = weekly_lift_hours | default(weeklyHoursRecovered) | default(10) %}
  {% set resolvedLiftSummary = lift_summary | default(workflowOutcome) | default('Recover weekly hours while maintaining quality.') %}
  {% set resolvedWorkflowName = workflow_name | default(workflowName) | default('Founder Priority Workflow') %}
  {% set resolvedWorkflowDescription = workflow_description | default(workflowSummary) | default('Operationalize one workflow so execution compounds without founder bottlenecks.') %}
  {% set resolvedGuardrails = guardrails | default([]) %}
  {% set resolvedTooling = tooling_recommendations | default(toolingRecommendations) | default([]) %}
  {% set resolvedSteps = action_steps | default(actionPlan) | default([]) %}
  {% set resolvedDate = generated_date | default(generatedDate) | default('n/a') %}
  {% set resolvedNextMove = next_move | default(ctaLine) | default('Reply with "Implement this workflow" to get rollout scope and timeline.') %}
  {% set resolvedFooterText = footerText | default('Confidential: Prepared for internal planning use.') %}

  <div class="page-shell">
    <header class="report-header">
      <div class="brand-block">
        {% if logo_url or authorLogo %}
        <img src="{{ logo_url | default(authorLogo) }}" alt="{{ resolvedAuthor }}" class="brand-logo" />
        {% endif %}
        <div class="brand-meta">
          <p class="brand-name">{{ resolvedAuthor }}</p>
          <p class="brand-subtitle">Audit Recommendation</p>
        </div>
      </div>
      <div class="header-meta">
        <p class="doc-label">{{ labelDocument }}</p>
        <p class="doc-date">{{ labelGeneratedPrefix }} {{ resolvedDate }}</p>
      </div>
    </header>

    <section class="hero">
      <div class="hero-left">
        <h1 class="report-title">{{ title | default('One Workflow Report') }}</h1>
        {% if subtitle %}
        <p class="report-subtitle">{{ subtitle }}</p>
        {% endif %}
      </div>
      <div class="hero-right">
        <p class="kpi-label">{{ labelKpi }}</p>
        <p class="kpi-value">{{ resolvedLiftHours }}<span> hours</span></p>
        <p class="kpi-summary">{{ resolvedLiftSummary }}</p>
      </div>
    </section>

    <section class="top-grid">
      <article class="card client-card">
        <h2 class="section-title">{{ labelClientSnapshot }}</h2>
        <div class="snapshot-grid">
          <div class="snapshot-row">
            <span class="snapshot-key">{{ labelClient }}</span>
            <span class="snapshot-value">{{ resolvedClientName }}</span>
          </div>
          <div class="snapshot-row">
            <span class="snapshot-key">{{ labelBusiness }}</span>
            <span class="snapshot-value">{{ resolvedBusinessType }}</span>
          </div>
          <div class="snapshot-row">
            <span class="snapshot-key">{{ labelRevenue }}</span>
            <span class="snapshot-value">{{ resolvedRevenue }}</span>
          </div>
          <div class="snapshot-row">
            <span class="snapshot-key">{{ labelTeam }}</span>
            <span class="snapshot-value">{{ resolvedTeamSize }}</span>
          </div>
        </div>
      </article>

      <article class="card workflow-card">
        <h2 class="section-title">{{ labelWorkflow }}</h2>
        <h3 class="workflow-name">{{ resolvedWorkflowName }}</h3>
        <p class="workflow-description">{{ resolvedWorkflowDescription }}</p>
      </article>
    </section>

    <section class="main-grid">
      <article class="card action-card">
        <h2 class="section-title">{{ labelActionPlan }}</h2>
        <ol class="timeline-list">
          {% for item in resolvedSteps %}
          <li class="timeline-row">
            <div class="timeline-index">{{ item.step | default(loop.index) }}</div>
            <div class="timeline-line"></div>
            <div class="timeline-content">
              <p class="step-title">{{ item.title | default(item.step) }}</p>
              {% if item.description %}
              <p class="step-description">{{ item.description }}</p>
              {% endif %}
              <div class="step-meta">
                {% if item.owner %}
                <span class="owner-pill">{{ item.owner }}</span>
                {% endif %}
                {% if item.day %}
                <span class="timing-meta">{{ item.day }}</span>
                {% elif item.timing %}
                <span class="timing-meta">{{ item.timing }}</span>
                {% endif %}
              </div>
            </div>
          </li>
          {% endfor %}
        </ol>
      </article>

      <aside class="aside-stack">
        <section class="card shaded-card guardrails-card">
          <h2 class="section-title">{{ labelGuardrails }}</h2>
          <ul class="icon-list">
            {% for guardrail in resolvedGuardrails %}
            <li><span class="icon-dot"></span><span>{{ guardrail }}</span></li>
            {% endfor %}
          </ul>
        </section>

        <section class="card shaded-card tooling-card">
          <h2 class="section-title">{{ labelTooling }}</h2>
          <ul class="icon-list">
            {% for recommendation in resolvedTooling %}
            <li><span class="icon-dot"></span><span>{{ recommendation }}</span></li>
            {% endfor %}
          </ul>
        </section>
      </aside>
    </section>

    <section class="next-move">
      <p class="next-move-label">{{ labelNextMove }}</p>
      <p class="next-move-copy">{{ resolvedNextMove }}</p>
    </section>

    <footer class="report-footer">
      <div class="footer-bar"></div>
      <div class="footer-content">
        <p class="footer-left">{{ labelPreparedBy }} {{ resolvedAuthor }}</p>
        <p class="footer-right">{{ resolvedFooterText | default(labelConfidentiality) }}</p>
      </div>
    </footer>
  </div>
</body>
</html>
`;

/**
 * Audit Workflow Report Template CSS
 */
export const AUDIT_WORKFLOW_REPORT_TEMPLATE_CSS = `
@page {
  size: Letter;
  margin: 12mm;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #1f2937;
  background: #ffffff;
  font-size: 13px;
  line-height: 1.5;
}

.page-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 8px;
  border-bottom: 2px solid {{ brandColor | default(highlight_color) | default('#1D4ED8') }};
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-logo {
  max-width: 130px;
  max-height: 28px;
  width: auto;
  height: auto;
}

.brand-name {
  font-weight: 700;
  font-size: 12px;
  color: #111827;
}

.brand-subtitle {
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6b7280;
}

.header-meta {
  text-align: right;
}

.doc-label {
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: {{ brandColor | default(highlight_color) | default('#1D4ED8') }};
  font-weight: 700;
}

.doc-date {
  font-size: 11px;
  color: #6b7280;
  margin-top: 2px;
}

.hero {
  display: grid;
  grid-template-columns: 1.7fr 1fr;
  gap: 12px;
}

.hero-left {
  border-left: 4px solid {{ brandColor | default(highlight_color) | default('#1D4ED8') }};
  padding-left: 10px;
}

.report-title {
  font-size: 28px;
  line-height: 1.12;
  letter-spacing: -0.02em;
  color: #111827;
  font-weight: 800;
}

.report-subtitle {
  margin-top: 6px;
  color: #4b5563;
  font-size: 13px;
}

.hero-right {
  border: 1px solid #dbeafe;
  background: #f8fbff;
  border-radius: 12px;
  padding: 10px;
}

.kpi-label {
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6b7280;
}

.kpi-value {
  margin-top: 2px;
  font-size: 42px;
  line-height: 1;
  font-weight: 800;
  color: {{ brandColor | default(highlight_color) | default('#1D4ED8') }};
}

.kpi-value span {
  font-size: 14px;
  font-weight: 700;
}

.kpi-summary {
  margin-top: 5px;
  color: #334155;
  font-size: 12px;
}

.top-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 11px;
  background: #ffffff;
}

.section-title {
  font-size: 11px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: {{ brandColor | default(highlight_color) | default('#1D4ED8') }};
  margin-bottom: 8px;
  font-weight: 700;
}

.snapshot-grid {
  display: grid;
  gap: 7px;
}

.snapshot-row {
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 8px;
  align-items: start;
}

.snapshot-key {
  font-size: 11px;
  color: #6b7280;
  font-weight: 600;
}

.snapshot-value {
  font-size: 13px;
  color: #111827;
  font-weight: 600;
}

.workflow-name {
  font-size: 20px;
  line-height: 1.15;
  color: #111827;
  margin-bottom: 6px;
}

.workflow-description {
  font-size: 13px;
  color: #374151;
  line-height: 1.5;
}

.main-grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 12px;
}

.timeline-list {
  list-style: none;
  display: grid;
  gap: 9px;
}

.timeline-row {
  display: grid;
  grid-template-columns: 26px 10px 1fr;
  column-gap: 8px;
  align-items: start;
}

.timeline-index {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: {{ brandColor | default(highlight_color) | default('#1D4ED8') }};
  color: #ffffff;
  text-align: center;
  font-size: 12px;
  line-height: 26px;
  font-weight: 700;
  z-index: 2;
}

.timeline-line {
  width: 2px;
  background: #cbd5e1;
  justify-self: center;
  align-self: stretch;
  min-height: 26px;
  margin-top: 12px;
}

.timeline-row:last-child .timeline-line {
  visibility: hidden;
}

.step-title {
  font-size: 13px;
  font-weight: 700;
  color: #111827;
}

.step-description {
  font-size: 12px;
  color: #4b5563;
  margin-top: 3px;
}

.step-meta {
  margin-top: 5px;
  display: flex;
  gap: 8px;
  align-items: center;
}

.owner-pill {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: {{ brandColor | default(highlight_color) | default('#1D4ED8') }};
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  padding: 2px 8px;
}

.timing-meta {
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
}

.aside-stack {
  display: grid;
  gap: 10px;
}

.shaded-card {
  background: #f8fafc;
  border-color: #e2e8f0;
}

.guardrails-card {
  border-left: 4px solid {{ brandColor | default(highlight_color) | default('#1D4ED8') }};
}

.tooling-card {
  border-left: 4px solid #94a3b8;
}

.icon-list {
  list-style: none;
  display: grid;
  gap: 6px;
}

.icon-list li {
  display: grid;
  grid-template-columns: 10px 1fr;
  gap: 7px;
  align-items: start;
  font-size: 12px;
  color: #334155;
}

.icon-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-top: 6px;
  background: {{ brandColor | default(highlight_color) | default('#1D4ED8') }};
}

.next-move {
  border: 1px solid #dbeafe;
  background: #f8fbff;
  border-radius: 12px;
  padding: 10px 12px;
}

.next-move-label {
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6b7280;
  margin-bottom: 4px;
  font-weight: 700;
}

.next-move-copy {
  font-size: 13px;
  color: #0f172a;
  font-weight: 600;
}

.report-footer {
  margin-top: 3px;
}

.footer-bar {
  height: 4px;
  border-radius: 4px;
  background: {{ brandColor | default(highlight_color) | default('#1D4ED8') }};
  margin-bottom: 6px;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.footer-left {
  font-size: 11px;
  color: #334155;
  font-weight: 600;
}

.footer-right {
  text-align: right;
  font-size: 10px;
  color: #64748b;
}
`;
