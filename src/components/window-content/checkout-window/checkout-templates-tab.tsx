"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { ShoppingCart, FileText, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";

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
        <div className="border-2 border-red-600 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-red-900">Authentication Required</h4>
              <p className="text-xs text-red-800 mt-1">
                Please log in to view available checkout templates.
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
        <Loader2 size={32} className="animate-spin text-purple-600" />
      </div>
    );
  }

  // Get icon for template category
  const getTemplateIcon = (category: string) => {
    switch (category) {
      case "ticket":
        return "🎫";
      case "product":
        return "📦";
      case "service":
        return "⚙️";
      default:
        return "📄";
    }
  };

  // Get complexity badge color
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case "beginner":
        return { bg: "#10B981", text: "white" };
      case "intermediate":
        return { bg: "#F59E0B", text: "white" };
      case "advanced":
        return { bg: "#EF4444", text: "white" };
      default:
        return { bg: "#6B7280", text: "white" };
    }
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <FileText size={16} />
          Available Checkout Templates
        </h3>
        <p className="text-xs text-gray-600 mt-1">
          {availableTemplates.length} template{availableTemplates.length !== 1 ? 's' : ''} enabled for your organization
        </p>
      </div>

      {/* Empty State */}
      {availableTemplates.length === 0 ? (
        <div className="border-2 border-gray-400 bg-gray-50 p-8 text-center">
          <div className="text-gray-400 mb-4">
            <FileText size={64} className="mx-auto" />
          </div>
          <h4 className="font-bold text-sm text-gray-700 mb-2">No Templates Available</h4>
          <p className="text-xs text-gray-600 mb-4">
            Your organization doesn&apos;t have access to any checkout templates yet.
          </p>
          <p className="text-xs text-gray-500">
            💡 Contact your administrator to enable checkout templates for your organization.
          </p>
        </div>
      ) : (
        /* Templates Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableTemplates.map((template) => {
            const props = template.customProperties as Record<string, unknown>;
            const icon = props.icon as string || getTemplateIcon(template.subtype || "");
            const features = props.features as string[] || [];
            const useCases = props.useCases as string[] || [];
            const complexity = props.complexity as string || "intermediate";
            const estimatedSetupTime = props.estimatedSetupTime as string;
            const requiredIntegrations = props.requiredIntegrations as string[] || [];
            const comingSoon = props.comingSoon as boolean;
            const complexityColor = getComplexityColor(complexity);

            // ✅ READ FORM SUPPORT FROM DATABASE (source of truth)
            const supportsFormIntegration = props.supportsFormIntegration as boolean || false;

            return (
              <div
                key={template._id}
                className="border-2 border-gray-400 bg-white p-4 hover:shadow-lg transition-all"
                style={{ opacity: comingSoon ? 0.7 : 1 }}
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-3xl">{icon}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-sm leading-tight">{template.name}</h4>
                      <span
                        className="text-xs px-2 py-0.5 rounded whitespace-nowrap"
                        style={{
                          backgroundColor: complexityColor.bg,
                          color: complexityColor.text,
                        }}
                      >
                        {complexity}
                      </span>
                    </div>

                    {/* Badges Row */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {/* Form Compatibility Badge - Read from database */}
                      <span
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded whitespace-nowrap"
                        style={{
                          backgroundColor: supportsFormIntegration ? "#D1FAE5" : "#FEE2E2",
                          color: supportsFormIntegration ? "#047857" : "#991B1B",
                          border: `1px solid ${supportsFormIntegration ? "#A7F3D0" : "#FECACA"}`,
                        }}
                        title={supportsFormIntegration ? "This template supports form integration during checkout" : "This template does not support form integration"}
                      >
                        {supportsFormIntegration ? "✓" : "✕"} Form {supportsFormIntegration ? "Compatible" : "Incompatible"}
                      </span>

                      {/* Coming Soon Badge */}
                      {comingSoon && (
                        <span className="inline-block text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded border border-yellow-300">
                          Coming Soon
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-600 mb-3 line-clamp-3">
                  {template.description}
                </p>

                {/* Metadata */}
                {(estimatedSetupTime || requiredIntegrations.length > 0) && (
                  <div className="flex flex-wrap gap-2 mb-3 text-xs text-gray-500">
                    {estimatedSetupTime && (
                      <span className="flex items-center gap-1">
                        ⏱️ {estimatedSetupTime}
                      </span>
                    )}
                    {requiredIntegrations.length > 0 && (
                      <span className="flex items-center gap-1">
                        🔌 {requiredIntegrations.join(", ")}
                      </span>
                    )}
                  </div>
                )}

                {/* Features (collapsible) */}
                {features.length > 0 && (
                  <details className="mb-3">
                    <summary className="text-xs font-bold text-gray-700 cursor-pointer hover:text-purple-600">
                      📋 Features ({features.length})
                    </summary>
                    <ul className="mt-2 space-y-1 text-xs text-gray-600 ml-4">
                      {features.slice(0, 5).map((feature, idx) => (
                        <li key={idx} className="list-disc">
                          {feature}
                        </li>
                      ))}
                      {features.length > 5 && (
                        <li className="text-gray-400 italic">
                          +{features.length - 5} more...
                        </li>
                      )}
                    </ul>
                  </details>
                )}

                {/* Use Cases (collapsible) */}
                {useCases.length > 0 && (
                  <details className="mb-3">
                    <summary className="text-xs font-bold text-gray-700 cursor-pointer hover:text-purple-600">
                      💡 Use Cases ({useCases.length})
                    </summary>
                    <ul className="mt-2 space-y-1 text-xs text-gray-600 ml-4">
                      {useCases.slice(0, 4).map((useCase, idx) => (
                        <li key={idx} className="list-disc">
                          {useCase}
                        </li>
                      ))}
                      {useCases.length > 4 && (
                        <li className="text-gray-400 italic">
                          +{useCases.length - 4} more...
                        </li>
                      )}
                    </ul>
                  </details>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
                  {comingSoon ? (
                    <button
                      className="flex-1 px-3 py-2 text-xs font-bold border-2 border-gray-400 bg-gray-200 text-gray-500 cursor-not-allowed"
                      disabled
                    >
                      Coming Soon
                    </button>
                  ) : (
                    <>
                      <button
                        className="flex-1 px-3 py-2 text-xs font-bold border-2 border-purple-600 bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center justify-center gap-1"
                        onClick={() => {
                          // For now, direct users to Web Publishing
                          alert(
                            "To use this checkout template:\n\n" +
                            "1. Go to Web Publishing app\n" +
                            "2. Create a new page (Event Landing, Product Page, etc.)\n" +
                            "3. Link your products to the page\n" +
                            "4. The checkout template will be automatically applied!"
                          );
                        }}
                      >
                        <ShoppingCart size={12} />
                        Use Template
                      </button>
                      <button
                        className="px-3 py-2 text-xs font-bold border-2 border-gray-400 bg-white text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1"
                        onClick={() => {
                          // TODO: Show template documentation/preview
                          alert("Template documentation coming soon!");
                        }}
                        title="View documentation"
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
      <div className="mt-6 p-4 border-2 border-purple-300 bg-purple-50">
        <h4 className="font-bold text-sm text-purple-900 mb-2 flex items-center gap-2">
          <AlertCircle size={16} />
          How to Use Checkout Templates
        </h4>
        <ul className="text-xs text-purple-800 space-y-1">
          <li>1. Choose a template that fits your use case</li>
          <li>2. Create products/tickets in the Products window</li>
          <li>3. Use Web Publishing to create a page and link products</li>
          <li>4. The checkout template will be automatically applied to your page</li>
        </ul>
      </div>
    </div>
  );
}
