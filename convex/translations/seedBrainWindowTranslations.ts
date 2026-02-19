import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

/**
 * Seed Brain window translations.
 *
 * Namespace: ui.brain
 * Languages: EN, DE, PL, ES, FR, JA
 *
 * Note: This seed intentionally provides explicit values for all six locales so
 * Brain UI copy does not depend on runtime fallback strings.
 *
 * Run: npx convex run translations/seedBrainWindowTranslations:seed
 */
export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("Seeding Brain window translations...");

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

    const supportedLocales = ["en", "de", "pl", "es", "fr", "ja"] as const;

    const translations: Array<{ key: string; value: string }> = [
      // Main brain shell
      { key: "ui.brain.mode.learn.label", value: "Learn" },
      { key: "ui.brain.mode.learn.description", value: "AI interviews you to extract knowledge" },
      { key: "ui.brain.mode.teach.label", value: "Teach" },
      { key: "ui.brain.mode.teach.description", value: "Upload PDFs, audio, links, and text" },
      { key: "ui.brain.mode.review.label", value: "Review" },
      { key: "ui.brain.mode.review.description", value: "Browse your knowledge base" },
      { key: "ui.brain.subtitle", value: "Trust knowledge hub for learn, teach, and review workflows." },
      { key: "ui.brain.state.loading", value: "Loading Brain..." },
      { key: "ui.brain.state.auth_required.title", value: "Authentication Required" },
      { key: "ui.brain.state.auth_required.body", value: "Please sign in to access the Brain." },
      { key: "ui.brain.state.unavailable.title", value: "Brain Not Available" },
      { key: "ui.brain.state.unavailable.body", value: "This feature is not enabled for your organization." },
      { key: "ui.brain.nav.back_to_desktop", value: "Back to Desktop" },
      { key: "ui.brain.nav.open_fullscreen", value: "Open Full Screen" },

      // Learn mode
      { key: "ui.brain.learn.title", value: "Teach the AI About You" },
      {
        key: "ui.brain.learn.subtitle",
        value: "Through a guided interview, extract your unique voice, expertise, and preferences into a trusted profile.",
      },
      { key: "ui.brain.learn.benefits.title", value: "What this unlocks" },
      { key: "ui.brain.learn.benefits.personalized", value: "Personalized AI responses" },
      { key: "ui.brain.learn.benefits.voice", value: "Content in your voice" },
      { key: "ui.brain.learn.benefits.recommendations", value: "Better recommendations" },
      { key: "ui.brain.learn.benefits.note", value: "Progress is saved automatically throughout the interview." },

      // Learn selector
      { key: "ui.brain.learn.selector.loading", value: "Loading templates..." },
      { key: "ui.brain.learn.selector.seeding", value: "Setting up interview templates..." },
      { key: "ui.brain.learn.selector.empty.title", value: "No interview templates available" },
      { key: "ui.brain.learn.selector.empty.body", value: "Create a template in the Interview Designer first." },
      { key: "ui.brain.learn.selector.actions.go_back", value: "Go Back" },
      { key: "ui.brain.learn.selector.title", value: "Start an Interview" },
      { key: "ui.brain.learn.selector.subtitle", value: "Choose a template to begin extracting Content DNA." },
      { key: "ui.brain.learn.selector.actions.cancel", value: "Cancel" },
      { key: "ui.brain.learn.selector.actions.starting", value: "Starting..." },
      { key: "ui.brain.learn.selector.actions.start", value: "Start Interview" },

      // Learn runner
      { key: "ui.brain.learn.runner.loading", value: "Loading interview..." },
      { key: "ui.brain.learn.runner.no_question", value: "No questions available" },
      { key: "ui.brain.learn.runner.actions.exit", value: "Exit Interview" },
      { key: "ui.brain.learn.runner.help.hide", value: "Hide hint" },
      { key: "ui.brain.learn.runner.help.show", value: "Need a hint?" },
      { key: "ui.brain.learn.runner.actions.save_exit", value: "Save & Exit" },
      { key: "ui.brain.learn.runner.actions.cancel_delete", value: "Cancel & Delete" },
      { key: "ui.brain.learn.runner.actions.cancelling", value: "Cancelling..." },
      { key: "ui.brain.learn.runner.progress_saved", value: "Progress saved automatically" },
      { key: "ui.brain.learn.runner.validation.required", value: "This question requires an answer" },
      {
        key: "ui.brain.learn.runner.validation.min_length",
        value: "Please provide at least {count} characters",
      },
      {
        key: "ui.brain.learn.runner.validation.max_length",
        value: "Please keep under {count} characters",
      },
      {
        key: "ui.brain.learn.runner.input.list_placeholder",
        value: "Enter items separated by commas...",
      },
      { key: "ui.brain.learn.runner.input.placeholder", value: "Type your answer..." },
      { key: "ui.brain.learn.runner.actions.voice_input", value: "Voice input (Phase 2)" },
      { key: "ui.brain.learn.runner.actions.submit", value: "Submit (Enter)" },

      // Learn consent
      { key: "ui.brain.learn.consent.title", value: "Review Before Saving Memory" },
      { key: "ui.brain.learn.consent.empty", value: "No extracted data is available to save yet." },
      {
        key: "ui.brain.learn.consent.unsaved",
        value: "Memory is currently unsaved. You can still choose to save it now.",
      },
      {
        key: "ui.brain.learn.consent.actions.exit_without_saving",
        value: "Exit Without Saving",
      },
      { key: "ui.brain.learn.consent.actions.keep_unsaved", value: "Keep Unsaved" },
      { key: "ui.brain.learn.consent.actions.save", value: "Save to Content DNA" },

      // Learn completion
      { key: "ui.brain.learn.complete.title", value: "Interview Complete!" },
      { key: "ui.brain.learn.complete.actions.view", value: "View Content DNA" },
      { key: "ui.brain.learn.complete.actions.return", value: "Return to Dashboard" },
      { key: "ui.brain.learn.complete.actions.revoke", value: "Revoke Saved Memory" },

      // Teach mode
      { key: "ui.brain.teach.title", value: "Add Knowledge Sources" },
      {
        key: "ui.brain.teach.subtitle",
        value: "Upload documents, paste links, or add text to teach the AI about your domain.",
      },
      { key: "ui.brain.teach.actions.add", value: "Add" },
      { key: "ui.brain.teach.input.title_placeholder", value: "Title (optional)" },
      { key: "ui.brain.teach.actions.cancel", value: "Cancel" },
      { key: "ui.brain.teach.actions.add_note", value: "Add Note" },
      { key: "ui.brain.teach.empty.title", value: "No sources added yet." },
      { key: "ui.brain.teach.empty.body", value: "Choose a source type above to add knowledge." },
      { key: "ui.brain.teach.actions.remove", value: "Remove" },
      { key: "ui.brain.teach.error.title", value: "Ingestion failures captured" },
      { key: "ui.brain.teach.stats.pending", value: "pending" },
      { key: "ui.brain.teach.stats.processing", value: "processing" },
      { key: "ui.brain.teach.stats.complete", value: "complete" },
      { key: "ui.brain.teach.actions.clear_completed", value: "Clear Completed" },
      { key: "ui.brain.teach.actions.processing", value: "Processing..." },
      { key: "ui.brain.teach.actions.process_sources", value: "Process {count} Source(s)" },

      // Review mode
      { key: "ui.brain.review.date.today", value: "Today" },
      { key: "ui.brain.review.date.yesterday", value: "Yesterday" },
      { key: "ui.brain.review.date.days_ago", value: "{count} days ago" },
      { key: "ui.brain.review.search.placeholder", value: "Search knowledge..." },
      { key: "ui.brain.review.category.all", value: "All Knowledge" },
      { key: "ui.brain.review.category.content_dna", value: "Content DNA" },
      { key: "ui.brain.review.category.documents", value: "Documents" },
      { key: "ui.brain.review.category.links", value: "Web Links" },
      { key: "ui.brain.review.category.notes", value: "Notes" },
      { key: "ui.brain.review.stats.total_items", value: "{count} total items" },
      { key: "ui.brain.review.stats.visible_items", value: "{count} item(s)" },
      { key: "ui.brain.review.stats.matching", value: "matching \"{query}\"" },
      { key: "ui.brain.review.actions.refresh", value: "Refresh" },
      { key: "ui.brain.review.state.loading", value: "Loading knowledge base..." },
      { key: "ui.brain.review.state.error.title", value: "Could not load the knowledge base." },
      { key: "ui.brain.review.actions.retry", value: "Retry" },
      { key: "ui.brain.review.state.empty_search", value: "No items match your search." },
      { key: "ui.brain.review.state.empty", value: "No knowledge items yet." },
      { key: "ui.brain.review.state.empty_hint", value: "Use Learn or Teach mode to add knowledge." },
      { key: "ui.brain.review.badge.dna", value: "DNA" },
      { key: "ui.brain.review.actions.open_link", value: "Open link" },
      { key: "ui.brain.review.expanded.full_content", value: "Full content:" },
      { key: "ui.brain.review.expanded.source_ids", value: "Source IDs: {ids}" },
      { key: "ui.brain.review.actions.edit", value: "Edit" },
      { key: "ui.brain.review.actions.delete", value: "Delete" },
    ];

    let inserted = 0;
    let updated = 0;

    for (const translation of translations) {
      for (const locale of supportedLocales) {
        const result = await upsertTranslation(
          ctx.db,
          systemOrg._id,
          systemUser._id,
          translation.key,
          translation.value,
          locale,
          "ui",
          "brain-window",
        );

        if (result.inserted) inserted += 1;
        if (result.updated) updated += 1;
      }
    }

    console.log(
      `Brain window translations seeded: ${inserted} inserted, ${updated} updated (${translations.length} keys x ${supportedLocales.length} locales)`,
    );

    return {
      success: true,
      inserted,
      updated,
      totalKeys: translations.length,
      locales: supportedLocales.length,
      totalRows: translations.length * supportedLocales.length,
    };
  },
});
