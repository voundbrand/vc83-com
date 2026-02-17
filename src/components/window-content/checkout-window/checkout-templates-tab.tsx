"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { AlertCircle, Check, Clock3, ExternalLink, FileText, Lightbulb, Loader2, Package, PlugZap, Settings, ShoppingCart, Ticket, X } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

/**
 * Checkout Templates Tab
 *
 * Browse and use available checkout templates for the current organization.
 * Templates are enabled by super admins in the Organizations window.
 *
 * NOTE: Template capabilities (form support, etc.) are read from DATABASE
 * template records (source of truth), not from TypeScript schemas.
 */

interface CheckoutTemplatesTabProps {
  onCreateNew?: () => void;
}

export function CheckoutTemplatesTab({}: CheckoutTemplatesTabProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.checkout_window");

  // Fetch available checkout templates for this organization
  const availableTemplates = useQuery(
    api.checkoutTemplateAvailability.getAvailableCheckoutTemplates,
    sessionId && currentOrg?.id
      ? {
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
        }
      : "skip"
  );

  if (!sessionId || !currentOrg) {
    return (
      <div className="p-4">
        <div className="border-2 p-4" style={{ borderColor: 'var(--error)', background: 'rgba(239, 68, 68, 0.1)' }}>
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--error)' }} />
            <div>
              <h4 className="font-bold text-sm" style={{ color: 'var(--error)' }}>
                {translationsLoading ? "Authentication Required" : t("ui.checkout_window.error.auth_required_title")}
              </h4>
              <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>
                {translationsLoading ? "Please log in to view available checkout templates." : t("ui.checkout_window.error.auth_required_templates")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (availableTemplates === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--win95-highlight)' }} />
      </div>
    );
  }

  // Get icon for template category
  const getTemplateIcon = (categoryOrIcon: string) => {
    switch (categoryOrIcon) {
      case "ticket":
        return <Ticket size={28} />;
      case "product":
        return <Package size={28} />;
      case "service":
        return <Settings size={28} />;
      default:
        return <FileText size={28} />;
    }
  };

  // Get complexity badge color
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case "beginner":
        return { bg: "var(--success)", text: "var(--win95-titlebar-text)" };
      case "intermediate":
        return { bg: "#F59E0B", text: "var(--win95-titlebar-text)" };
      case "advanced":
        return { bg: "var(--error)", text: "var(--win95-titlebar-text)" };
      default:
        return { bg: "var(--neutral-gray)", text: "var(--win95-titlebar-text)" };
    }
  };

  const plural = availableTemplates.length !== 1 ? 's' : '';

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
          <FileText size={16} />
          {translationsLoading ? "Available Checkout Templates" : t("ui.checkout_window.templates.title")}
        </h3>
        <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
          {translationsLoading
            ? `${availableTemplates.length} template${plural} enabled for your organization`
            : t("ui.checkout_window.templates.count", { count: availableTemplates.length, plural })
          }
        </p>
      </div>

      {/* Empty State */}
      {availableTemplates.length === 0 ? (
        <div className="border-2 p-8 text-center" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg)' }}>
          <div className="mb-4" style={{ color: 'var(--win95-border)' }}>
            <FileText size={64} className="mx-auto" />
          </div>
          <h4 className="font-bold text-sm mb-2" style={{ color: 'var(--win95-text)' }}>
            {translationsLoading ? "No Templates Available" : t("ui.checkout_window.templates.empty.title")}
          </h4>
          <p className="text-xs mb-4" style={{ color: 'var(--neutral-gray)' }}>
            {translationsLoading
              ? "Your organization doesn't have access to any checkout templates yet."
              : t("ui.checkout_window.templates.empty.description")
            }
          </p>
          <p className="text-xs inline-flex items-center gap-1" style={{ color: 'var(--neutral-gray)' }}>
            <Lightbulb size={12} />
            {translationsLoading
              ? "Contact your administrator to enable checkout templates for your organization."
              : t("ui.checkout_window.templates.empty.help")
            }
          </p>
        </div>
      ) : (
        /* Templates Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableTemplates.map((template) => {
            const props = template.customProperties as Record<string, unknown>;
            const icon = getTemplateIcon((props.icon as string) || template.subtype || "");
            const features = props.features as string[] || [];
            const useCases = props.useCases as string[] || [];
            const complexity = props.complexity as string || "intermediate";
            const estimatedSetupTime = props.estimatedSetupTime as string;
            const requiredIntegrations = props.requiredIntegrations as string[] || [];
            const comingSoon = props.comingSoon as boolean;
            const complexityColor = getComplexityColor(complexity);

            // Read form support from database (source of truth)
            const supportsFormIntegration = props.supportsFormIntegration as boolean || false;

            // Get translated complexity label
            const complexityKey = `ui.checkout_window.templates.complexity.${complexity}`;
            const complexityLabel = translationsLoading ? complexity : t(complexityKey);

            return (
              <div
                key={template._id}
                className="border-2 p-4 hover:shadow-lg transition-all"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-bg-light)',
                  opacity: comingSoon ? 0.7 : 1
                }}
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-3xl">{icon}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-sm leading-tight" style={{ color: 'var(--win95-text)' }}>
                        {template.name}
                      </h4>
                      <span
                        className="text-xs px-2 py-0.5 rounded whitespace-nowrap"
                        style={{
                          backgroundColor: complexityColor.bg,
                          color: complexityColor.text,
                        }}
                      >
                        {complexityLabel}
                      </span>
                    </div>

                    {/* Badges Row */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {/* Form Compatibility Badge - Read from database */}
                      <span
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded whitespace-nowrap"
                        style={{
                          backgroundColor: supportsFormIntegration ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                          color: supportsFormIntegration ? "var(--success)" : "var(--error)",
                          border: `1px solid ${supportsFormIntegration ? "var(--success)" : "var(--error)"}`,
                        }}
                        title={translationsLoading ? (supportsFormIntegration ? "This template supports form integration during checkout" : "This template does not support form integration") : t(supportsFormIntegration ? "ui.checkout_window.templates.tooltip.form_supports" : "ui.checkout_window.templates.tooltip.form_not_supports")}
                      >
                        {supportsFormIntegration ? <Check size={12} /> : <X size={12} />} {translationsLoading
                          ? (supportsFormIntegration ? "Form Compatible" : "Form Incompatible")
                          : t(supportsFormIntegration ? "ui.checkout_window.templates.badge.form_compatible" : "ui.checkout_window.templates.badge.form_incompatible")
                        }
                      </span>

                      {/* Coming Soon Badge */}
                      {comingSoon && (
                        <span
                          className="inline-block text-xs px-2 py-0.5 rounded border"
                          style={{
                            background: 'rgba(245, 158, 11, 0.1)',
                            color: '#F59E0B',
                            borderColor: '#F59E0B'
                          }}
                        >
                          {translationsLoading ? "Coming Soon" : t("ui.checkout_window.templates.badge.coming_soon")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs mb-3 line-clamp-3" style={{ color: 'var(--neutral-gray)' }}>
                  {template.description}
                </p>

                {/* Metadata */}
                {(estimatedSetupTime || requiredIntegrations.length > 0) && (
                  <div className="flex flex-wrap gap-2 mb-3 text-xs" style={{ color: 'var(--neutral-gray)' }}>
                    {estimatedSetupTime && (
                      <span className="flex items-center gap-1">
                        <Clock3 size={12} />
                        {estimatedSetupTime}
                      </span>
                    )}
                    {requiredIntegrations.length > 0 && (
                      <span className="flex items-center gap-1">
                        <PlugZap size={12} />
                        {requiredIntegrations.join(", ")}
                      </span>
                    )}
                  </div>
                )}

                {/* Features (collapsible) */}
                {features.length > 0 && (
                  <details className="mb-3">
                    <summary className="text-xs font-bold cursor-pointer hover:opacity-80 inline-flex items-center gap-1" style={{ color: 'var(--win95-text)' }}>
                      <FileText size={12} />
                      {translationsLoading ? `Features (${features.length})` : t("ui.checkout_window.templates.sections.features", { count: features.length })}
                    </summary>
                    <ul className="mt-2 space-y-1 text-xs ml-4" style={{ color: 'var(--neutral-gray)' }}>
                      {features.slice(0, 5).map((feature, idx) => (
                        <li key={idx} className="list-disc">
                          {feature}
                        </li>
                      ))}
                      {features.length > 5 && (
                        <li className="italic" style={{ color: 'var(--win95-border)' }}>
                          +{features.length - 5} more...
                        </li>
                      )}
                    </ul>
                  </details>
                )}

                {/* Use Cases (collapsible) */}
                {useCases.length > 0 && (
                  <details className="mb-3">
                    <summary className="text-xs font-bold cursor-pointer hover:opacity-80 inline-flex items-center gap-1" style={{ color: 'var(--win95-text)' }}>
                      <Lightbulb size={12} />
                      {translationsLoading ? `Use Cases (${useCases.length})` : t("ui.checkout_window.templates.sections.use_cases", { count: useCases.length })}
                    </summary>
                    <ul className="mt-2 space-y-1 text-xs ml-4" style={{ color: 'var(--neutral-gray)' }}>
                      {useCases.slice(0, 4).map((useCase, idx) => (
                        <li key={idx} className="list-disc">
                          {useCase}
                        </li>
                      ))}
                      {useCases.length > 4 && (
                        <li className="italic" style={{ color: 'var(--win95-border)' }}>
                          +{useCases.length - 4} more...
                        </li>
                      )}
                    </ul>
                  </details>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-4 pt-3 border-t" style={{ borderColor: 'var(--win95-border)' }}>
                  {comingSoon ? (
                    <button
                      className="flex-1 px-3 py-2 text-xs font-bold border-2 cursor-not-allowed"
                      style={{
                        borderColor: 'var(--win95-border)',
                        background: 'var(--win95-bg)',
                        color: 'var(--neutral-gray)'
                      }}
                      disabled
                    >
                      {translationsLoading ? "Coming Soon" : t("ui.checkout_window.templates.badge.coming_soon")}
                    </button>
                  ) : (
                    <>
                      <button
                        className="flex-1 px-3 py-2 text-xs font-bold border-2 hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
                        style={{
                          borderColor: 'var(--win95-highlight)',
                          background: 'var(--win95-highlight)',
                          color: 'var(--win95-titlebar-text)'
                        }}
                        onClick={() => {
                          // For now, direct users to Web Publishing
                          const alertMessage = translationsLoading
                            ? "To use this checkout template:\n\n1. Go to Web Publishing app\n2. Create a new page (Event Landing, Product Page, etc.)\n3. Link your products to the page\n4. The checkout template will be automatically applied!"
                            : t("ui.checkout_window.templates.alerts.use_template_instructions");
                          alert(alertMessage);
                        }}
                      >
                        <ShoppingCart size={12} />
                        {translationsLoading ? "Use Template" : t("ui.checkout_window.templates.actions.use_template")}
                      </button>
                      <button
                        className="px-3 py-2 text-xs font-bold border-2 hover:opacity-90 transition-opacity flex items-center gap-1"
                        style={{
                          borderColor: 'var(--win95-border)',
                          background: 'var(--win95-bg-light)',
                          color: 'var(--win95-text)'
                        }}
                        onClick={() => {
                          // TODO: Show template documentation/preview
                          const alertMessage = translationsLoading
                            ? "Template documentation coming soon!"
                            : t("ui.checkout_window.templates.alerts.docs_coming_soon");
                          alert(alertMessage);
                        }}
                        title={translationsLoading ? "View documentation" : t("ui.checkout_window.templates.actions.view_docs")}
                      >
                        <ExternalLink size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Help Section */}
      <div className="mt-6 p-4 border-2" style={{ borderColor: 'var(--info-border)', background: 'rgba(59, 130, 246, 0.1)' }}>
        <h4 className="font-bold text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
          <AlertCircle size={16} />
          {translationsLoading ? "How to Use Checkout Templates" : t("ui.checkout_window.templates.help.title")}
        </h4>
        <ul className="text-xs space-y-1" style={{ color: 'var(--win95-text)' }}>
          <li>{translationsLoading ? "1. Choose a template that fits your use case" : `1. ${t("ui.checkout_window.templates.help.step1")}`}</li>
          <li>{translationsLoading ? "2. Create products/tickets in the Products window" : `2. ${t("ui.checkout_window.templates.help.step2")}`}</li>
          <li>{translationsLoading ? "3. Use Web Publishing to create a page and link products" : `3. ${t("ui.checkout_window.templates.help.step3")}`}</li>
          <li>{translationsLoading ? "4. The checkout template will be automatically applied to your page" : `4. ${t("ui.checkout_window.templates.help.step4")}`}</li>
        </ul>
      </div>
    </div>
  );
}
