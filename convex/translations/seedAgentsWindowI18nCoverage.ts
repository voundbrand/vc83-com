import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

const SUPPORTED_LOCALES = ["en", "de", "pl", "es", "fr", "ja"] as const;

const TRANSLATIONS: ReadonlyArray<{ key: string; value: string }> = [
  { key: "ui.agents_window.agent_coverage.add_recommended_specialist", value: "Add recommended specialist" },
  { key: "ui.agents_window.agent_coverage.blocked_pack.plural", value: "blocked capability packs" },
  { key: "ui.agents_window.agent_coverage.blocked_pack.singular", value: "blocked capability pack" },
  { key: "ui.agents_window.agent_coverage.blocking_reasons", value: "Blocking reasons" },
  { key: "ui.agents_window.agent_coverage.covered_by", value: "Covered by:" },
  { key: "ui.agents_window.agent_coverage.current_agents", value: "Current agents" },
  { key: "ui.agents_window.agent_coverage.current_agents.unnamed", value: "Unnamed agent" },
  { key: "ui.agents_window.agent_coverage.pack", value: "Pack:" },
  { key: "ui.agents_window.agent_coverage.title", value: "Agent Coverage" },
  { key: "ui.agents_window.agent_coverage.unblocking_steps", value: "Unblocking steps" },
  { key: "ui.agents_window.agent_ops.actions.create_specialist", value: "Create Specialist" },
  { key: "ui.agents_window.agent_ops.actions.open_terminal_timeline", value: "Open Terminal Timeline" },
  { key: "ui.agents_window.agent_ops.actions.open_top_trust_cockpit", value: "Open Top Trust Cockpit" },
  { key: "ui.agents_window.agent_ops.scope_badge.layer_scope", value: "Layer scope" },
  { key: "ui.agents_window.agent_ops.scope_badge.org_scope", value: "Org scope" },
  { key: "ui.agents_window.agent_ops.scope.depth_label", value: "Scope depth" },
  { key: "ui.agents_window.agent_ops.scope.layer_button", value: "Layer" },
  { key: "ui.agents_window.agent_ops.scope.layer_prefix", value: "L" },
  { key: "ui.agents_window.agent_ops.scope.org_button", value: "Org" },
  { key: "ui.agents_window.agent_ops.scope.organization_label", value: "Scope organization" },
  { key: "ui.agents_window.agent_ops.title", value: "Agent Ops" },
  { key: "ui.agents_window.auth.required", value: "Sign in and select an organization to manage agents." },
  { key: "ui.agents_window.control_center_queue.delivery_issues", value: "Delivery issues:" },
  { key: "ui.agents_window.control_center_queue.escalations", value: "Escalations:" },
  { key: "ui.agents_window.control_center_queue.last", value: "Last:" },
  { key: "ui.agents_window.control_center_queue.layer_prefix", value: "L" },
  { key: "ui.agents_window.control_center_queue.open_trust", value: "Open Trust" },
  { key: "ui.agents_window.control_center_queue.open_trust_cockpit", value: "Open trust cockpit" },
  { key: "ui.agents_window.control_center_queue.scope_org", value: "Scope org:" },
  { key: "ui.agents_window.control_center_queue.threads", value: "Threads:" },
  { key: "ui.agents_window.control_center_queue.title", value: "Control-Center Agent Queue" },
  { key: "ui.agents_window.control_center_queue.updated", value: "Updated" },
  { key: "ui.agents_window.control_center_queue.waiting", value: "Waiting:" },
  { key: "ui.agents_window.empty.create_specialist", value: "Create Specialist" },
  { key: "ui.agents_window.empty.select_or_create", value: "Select an agent or create a specialist" },
  { key: "ui.agents_window.header.agent_count.plural", value: "agents" },
  { key: "ui.agents_window.header.agent_count.singular", value: "agent" },
  { key: "ui.agents_window.header.agent_ops", value: "Agent Ops" },
  { key: "ui.agents_window.header.back_to_desktop", value: "Back to Desktop" },
  { key: "ui.agents_window.header.open_agent_ops", value: "Open Agent Ops" },
  { key: "ui.agents_window.header.open_full_screen", value: "Open Full Screen" },
  { key: "ui.agents_window.header.title", value: "AI Agents" },
  { key: "ui.agents_window.header.waiting_on_human", value: "waiting on human" },
  { key: "ui.agents_window.incident_workspace.closure_evidence", value: "Closure evidence:" },
  { key: "ui.agents_window.incident_workspace.last_mitigation", value: "Last mitigation:" },
  { key: "ui.agents_window.incident_workspace.mark_state", value: "Mark {{state}}" },
  { key: "ui.agents_window.incident_workspace.prompts.closure_summary", value: "Closure summary (required):" },
  { key: "ui.agents_window.incident_workspace.prompts.mitigation_note", value: "Mitigation note (required):" },
  { key: "ui.agents_window.incident_workspace.sync_threshold_incidents", value: "Sync Threshold Incidents" },
  { key: "ui.agents_window.incident_workspace.syncing", value: "Syncing..." },
  { key: "ui.agents_window.incident_workspace.title", value: "Incident Workspace" },
  { key: "ui.agents_window.incident_workspace.unassigned", value: "unassigned" },
  { key: "ui.agents_window.incident_workspace.updating", value: "Updating..." },
  { key: "ui.agents_window.metrics.active_threads", value: "Active threads" },
  { key: "ui.agents_window.metrics.delivery_issues", value: "Delivery issues" },
  { key: "ui.agents_window.metrics.open_escalations", value: "Open escalations" },
  { key: "ui.agents_window.metrics.waiting_on_human", value: "Waiting on human" },
  { key: "ui.agents_window.recommender.add_recommended_specialist", value: "Add recommended specialist" },
  { key: "ui.agents_window.recommender.enabled_integrations", value: "Enabled integrations" },
  { key: "ui.agents_window.recommender.integration_gaps", value: "Integration gaps to close first" },
  { key: "ui.agents_window.recommender.requested_outcome", value: "Requested outcome" },
  { key: "ui.agents_window.recommender.title", value: "Which agent do I need now?" },
  { key: "ui.agents_window.recommender.unblocking_steps", value: "Unblocking steps" },
];

export const seedAgentsWindowI18nCoverage = internalMutation({
  args: {},
  handler: async (ctx) => {
    const systemOrg = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found. Run seedOntologyData first.");
    }

    const systemUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found. Run seedOntologyData first.");
    }

    let inserted = 0;
    let updated = 0;

    for (const translation of TRANSLATIONS) {
      for (const locale of SUPPORTED_LOCALES) {
        const result = await upsertTranslation(
          ctx.db,
          systemOrg._id,
          systemUser._id,
          translation.key,
          translation.value,
          locale,
          "ui",
          "agents-window-i18n-coverage"
        );

        if (result.inserted) {
          inserted += 1;
        }
        if (result.updated) {
          updated += 1;
        }
      }
    }

    return {
      success: true,
      keys: TRANSLATIONS.length,
      locales: SUPPORTED_LOCALES.length,
      inserted,
      updated,
      totalOperations: TRANSLATIONS.length * SUPPORTED_LOCALES.length,
    };
  },
});
