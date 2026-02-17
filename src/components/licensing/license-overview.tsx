"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Loader2, Target, Rocket, BriefcaseBusiness, Building2, Crown, Circle, BarChart3, Zap } from "lucide-react";
import { LicenseHeader } from "./license-header";
import { LimitCategory } from "./limit-category";
import { FeatureCategory } from "./feature-category";

interface LicenseOverviewProps {
  organizationId: Id<"organizations">;
  sessionId?: string;
  editable?: boolean;
}

export function LicenseOverview({ organizationId, sessionId, editable = false }: LicenseOverviewProps) {
  const license = useQuery(
    api.licensing.helpers.getLicense,
    organizationId ? { organizationId } : "skip"
  );

  const usageStats = useQuery(
    api.licensing.helpers.getAllUsageStats,
    organizationId ? { organizationId } : "skip"
  );

  const detailedCounts = useQuery(
    api.licensing.helpers.getDetailedUsageCounts,
    organizationId ? { organizationId } : "skip"
  );

  const toggleFeature = useMutation(api.licensing.helpers.toggleFeature);
  const changePlanTier = useMutation(api.licensing.helpers.changePlanTier);
  const updateLicenseLimits = useMutation(api.licensing.superAdmin.updateLicenseLimits);

  const handleToggleFeature = async (featureKey: string, currentValue: boolean) => {
    if (!editable || !sessionId) return;

    try {
      await toggleFeature({
        sessionId,
        organizationId,
        featureKey,
        enabled: !currentValue,
      });
    } catch (error) {
      console.error("Failed to toggle feature:", error);
      alert("Failed to toggle feature: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const handleChangePlanTier = async (newTier: "free" | "starter" | "professional" | "agency" | "enterprise") => {
    if (!editable || !sessionId) return;

    try {
      await changePlanTier({
        sessionId,
        organizationId,
        planTier: newTier,
      });
    } catch (error) {
      console.error("Failed to change plan tier:", error);
      alert("Failed to change plan tier: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const handleLimitChange = async (limitKey: string, newValue: number) => {
    if (!editable || !sessionId) return;

    try {
      await updateLicenseLimits({
        sessionId,
        organizationId,
        customLimits: {
          [limitKey]: newValue,
        },
        reason: `Super admin override: ${limitKey} set to ${newValue === -1 ? "unlimited" : newValue}`,
      });
    } catch (error) {
      console.error("Failed to update limit:", error);
      alert("Failed to update limit: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  if (!license) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2
          size={32}
          className="animate-spin"
          style={{ color: "var(--win95-highlight)" }}
        />
      </div>
    );
  }

  // Helper to get usage for a resource
  const getUsage = (resourceKey: string) => {
    if (!usageStats?.usage) return 0;
    const usage = usageStats.usage as Record<string, { current: number; limit: number; percentUsed: number }>;
    return usage[resourceKey]?.current ?? 0;
  };

  // Helper to get detailed counts
  const getDetailedCount = (key: string) => {
    if (!detailedCounts) return 0;
    return (detailedCounts as Record<string, number>)[key] ?? 0;
  };

  // Organize limits by category
  const limitCategories = [
    {
      title: "Core Platform (4 limits)",
      limits: [
        {
          key: "maxUsers",
          label: "Maximum Users",
          value: license.limits.maxUsers,
          current: getDetailedCount("usersCount"),
        },
        {
          key: "maxApiKeys",
          label: "Maximum API Keys",
          value: license.limits.maxApiKeys,
          current: getDetailedCount("apiKeysCount"),
        },
        {
          key: "maxSubOrganizations",
          label: "Maximum Sub-Organizations",
          value: license.limits.maxSubOrganizations,
          current: getDetailedCount("subOrganizationsCount"),
        },
        {
          key: "maxCustomDomains",
          label: "Maximum Custom Domains",
          value: license.limits.maxCustomDomains,
          current: getDetailedCount("customDomainsCount"),
        },
      ],
    },
    {
      title: "CRM (4 limits)",
      limits: [
        {
          key: "maxContacts",
          label: "Maximum Contacts",
          value: license.limits.maxContacts,
          current: getUsage("contacts"),
        },
        {
          key: "maxOrganizations",
          label: "Maximum Organizations",
          value: license.limits.maxOrganizations,
          current: getUsage("organizations"),
        },
        {
          key: "maxPipelines",
          label: "Maximum Pipelines",
          value: license.limits.maxPipelines,
          current: getDetailedCount("pipelinesCount"),
        },
        {
          key: "maxEmailsPerMonth",
          label: "Maximum Emails (per month)",
          value: license.limits.maxEmailsPerMonth,
          current: getDetailedCount("emailsThisMonthCount"),
        },
      ],
    },
    {
      title: "Projects (3 limits)",
      limits: [
        {
          key: "maxProjects",
          label: "Maximum Projects",
          value: license.limits.maxProjects,
          current: getUsage("projects"),
        },
        {
          key: "maxMilestonesPerProject",
          label: "Maximum Milestones per Project",
          value: license.limits.maxMilestonesPerProject,
          current: getDetailedCount("milestonesCount"),
        },
        {
          key: "maxTasksPerProject",
          label: "Maximum Tasks per Project",
          value: license.limits.maxTasksPerProject,
          current: getDetailedCount("tasksCount"),
        },
      ],
    },
    {
      title: "Events (3 limits)",
      limits: [
        {
          key: "maxEvents",
          label: "Maximum Events",
          value: license.limits.maxEvents,
          current: getUsage("events"),
        },
        {
          key: "maxAttendeesPerEvent",
          label: "Maximum Attendees per Event",
          value: license.limits.maxAttendeesPerEvent,
          current: getDetailedCount("attendeesCount"),
        },
        {
          key: "maxSponsorsPerEvent",
          label: "Maximum Sponsors per Event",
          value: license.limits.maxSponsorsPerEvent,
          current: getDetailedCount("sponsorsCount"),
        },
      ],
    },
    {
      title: "Products (2 limits)",
      limits: [
        {
          key: "maxProducts",
          label: "Maximum Products",
          value: license.limits.maxProducts,
          current: getUsage("products"),
        },
        {
          key: "maxAddonsPerProduct",
          label: "Maximum Addons per Product",
          value: license.limits.maxAddonsPerProduct,
          current: getDetailedCount("addonsCount"),
        },
      ],
    },
    {
      title: "Checkout (1 limit)",
      limits: [
        {
          key: "maxCheckoutInstances",
          label: "Maximum Checkout Instances",
          value: license.limits.maxCheckoutInstances,
          current: getDetailedCount("checkoutInstancesCount"),
        },
      ],
    },
    {
      title: "Invoicing (1 limit)",
      limits: [
        {
          key: "maxInvoicesPerMonth",
          label: "Maximum Invoices (per month)",
          value: license.limits.maxInvoicesPerMonth,
          current: getUsage("invoicesThisMonth"),
        },
      ],
    },
    {
      title: "Forms (2 limits)",
      limits: [
        {
          key: "maxForms",
          label: "Maximum Forms",
          value: license.limits.maxForms,
          current: getUsage("forms"),
        },
        {
          key: "maxResponsesPerForm",
          label: "Maximum Responses per Form",
          value: license.limits.maxResponsesPerForm,
          current: getDetailedCount("formResponsesCount"),
        },
      ],
    },
    {
      title: "Web Publishing (1 limit)",
      limits: [
        {
          key: "maxPages",
          label: "Maximum Pages",
          value: license.limits.maxPages,
          current: getUsage("pages"),
        },
      ],
    },
    {
      title: "Workflows (2 limits)",
      limits: [
        {
          key: "maxWorkflows",
          label: "Maximum Workflows",
          value: license.limits.maxWorkflows,
          current: getUsage("workflows"),
        },
        {
          key: "maxBehaviorsPerWorkflow",
          label: "Maximum Behaviors per Workflow",
          value: license.limits.maxBehaviorsPerWorkflow,
          current: getDetailedCount("behaviorsCount"),
        },
      ],
    },
    {
      title: "Templates (1 limit)",
      limits: [
        {
          key: "maxCustomTemplates",
          label: "Maximum Custom Templates",
          value: license.limits.maxCustomTemplates,
          current: getDetailedCount("customTemplatesCount"),
        },
      ],
    },
    {
      title: "Media Library (3 limits)",
      limits: [
        {
          key: "totalStorageGB",
          label: "Total Storage (GB)",
          value: license.limits.totalStorageGB,
          current: getDetailedCount("storageUsedGB"),
        },
        {
          key: "maxFileUploadMB",
          label: "Maximum File Upload (MB)",
          value: license.limits.maxFileUploadMB,
          current: 0, // Not applicable for usage
        },
        {
          key: "perUserStorageGB",
          label: "Per-User Storage (GB)",
          value: license.limits.perUserStorageGB,
          current: getDetailedCount("perUserStorageUsedGB"),
        },
      ],
    },
    {
      title: "Certificates (1 limit)",
      limits: [
        {
          key: "maxCertificates",
          label: "Maximum Certificates",
          value: license.limits.maxCertificates,
          current: getUsage("certificates"),
        },
      ],
    },
    {
      title: "API & OAuth (6 limits)",
      limits: [
        {
          key: "maxWebsitesPerKey",
          label: "Maximum Websites per API Key",
          value: license.limits.maxWebsitesPerKey,
          current: getDetailedCount("websitesCount"),
        },
        {
          key: "maxCustomOAuthApps",
          label: "Maximum Custom OAuth Apps",
          value: license.limits.maxCustomOAuthApps,
          current: getDetailedCount("oauthAppsCount"),
        },
        {
          key: "maxThirdPartyIntegrations",
          label: "Maximum Third-Party Integrations",
          value: license.limits.maxThirdPartyIntegrations,
          current: getDetailedCount("integrationsCount"),
        },
        {
          key: "rateLimitPerMinute",
          label: "Rate Limit (per minute)",
          value: license.limits.rateLimitPerMinute,
          current: 0, // Not applicable for usage
        },
        {
          key: "rateLimitPerDay",
          label: "Rate Limit (per day)",
          value: license.limits.rateLimitPerDay,
          current: 0, // Not applicable for usage
        },
        {
          key: "maxWebhooks",
          label: "Maximum Webhooks",
          value: license.limits.maxWebhooks,
          current: getDetailedCount("webhooksCount"),
        },
      ],
    },
    {
      title: "Audit (1 limit)",
      limits: [
        {
          key: "auditLogRetentionDays",
          label: "Audit Log Retention (days)",
          value: license.limits.auditLogRetentionDays,
          current: 0, // Not applicable for usage
        },
      ],
    },
  ];

  // Organize features by category
  const featureCategories = [
    {
      title: "Core Features (5 features)",
      features: [
        {
          key: "badgeRequired",
          label: "Badge Required",
          value: license.features.badgeRequired,
        },
        {
          key: "subOrgsEnabled",
          label: "Sub-Organizations Enabled",
          value: license.features.subOrgsEnabled,
        },
        {
          key: "customDomainsEnabled",
          label: "Custom Domains Enabled",
          value: license.features.customDomainsEnabled,
        },
        {
          key: "whiteLabelEnabled",
          label: "White Label Enabled",
          value: license.features.whiteLabelEnabled,
        },
        {
          key: "whiteLabelLevel",
          label: "White Label Level",
          value: license.features.whiteLabelLevel,
        },
      ],
    },
    {
      title: "CRM Features (3 features)",
      features: [
        {
          key: "contactImportExportEnabled",
          label: "Contact Import/Export",
          value: license.features.contactImportExportEnabled,
        },
        {
          key: "contactSyncEnabled",
          label: "Contact Sync",
          value: license.features.contactSyncEnabled,
        },
        {
          key: "bulkEmailEnabled",
          label: "Bulk Email",
          value: license.features.bulkEmailEnabled,
        },
      ],
    },
    {
      title: "Project Features (2 features)",
      features: [
        {
          key: "budgetTrackingEnabled",
          label: "Budget Tracking",
          value: license.features.budgetTrackingEnabled,
        },
        {
          key: "advancedReportsEnabled",
          label: "Advanced Reports",
          value: license.features.advancedReportsEnabled,
        },
      ],
    },
    {
      title: "Event Features (2 features)",
      features: [
        {
          key: "mediaGalleryEnabled",
          label: "Media Gallery",
          value: license.features.mediaGalleryEnabled,
        },
        {
          key: "eventAnalyticsEnabled",
          label: "Event Analytics",
          value: license.features.eventAnalyticsEnabled,
        },
      ],
    },
    {
      title: "Product Features (3 features)",
      features: [
        {
          key: "inventoryTrackingEnabled",
          label: "Inventory Tracking",
          value: license.features.inventoryTrackingEnabled,
        },
        {
          key: "b2bInvoicingEnabled",
          label: "B2B Invoicing",
          value: license.features.b2bInvoicingEnabled,
        },
        {
          key: "templateSetOverridesEnabled",
          label: "Template Set Overrides",
          value: license.features.templateSetOverridesEnabled,
        },
      ],
    },
    {
      title: "Checkout Features (6 features)",
      features: [
        {
          key: "stripeConnectEnabled",
          label: "Stripe Connect",
          value: license.features.stripeConnectEnabled,
        },
        {
          key: "invoicePaymentEnabled",
          label: "Invoice Payment",
          value: license.features.invoicePaymentEnabled,
        },
        {
          key: "manualPaymentEnabled",
          label: "Manual Payment",
          value: license.features.manualPaymentEnabled,
        },
        {
          key: "customBrandingEnabled",
          label: "Custom Branding",
          value: license.features.customBrandingEnabled,
        },
        {
          key: "multiLanguageEnabled",
          label: "Multi-Language",
          value: license.features.multiLanguageEnabled,
        },
        {
          key: "stripeTaxEnabled",
          label: "Stripe Tax",
          value: license.features.stripeTaxEnabled,
        },
      ],
    },
    {
      title: "Invoicing Features (5 features)",
      features: [
        {
          key: "consolidatedInvoicingEnabled",
          label: "Consolidated Invoicing",
          value: license.features.consolidatedInvoicingEnabled,
        },
        {
          key: "multiCurrencyEnabled",
          label: "Multi-Currency",
          value: license.features.multiCurrencyEnabled,
        },
        {
          key: "automatedGenerationEnabled",
          label: "Automated Generation",
          value: license.features.automatedGenerationEnabled,
        },
        {
          key: "emailDeliveryEnabled",
          label: "Email Delivery",
          value: license.features.emailDeliveryEnabled,
        },
        {
          key: "customTemplatesEnabled",
          label: "Custom Templates",
          value: license.features.customTemplatesEnabled,
        },
      ],
    },
    {
      title: "Forms Features (4 features)",
      features: [
        {
          key: "multiStepFormsEnabled",
          label: "Multi-Step Forms",
          value: license.features.multiStepFormsEnabled,
        },
        {
          key: "conditionalLogicEnabled",
          label: "Conditional Logic",
          value: license.features.conditionalLogicEnabled,
        },
        {
          key: "fileUploadsEnabled",
          label: "File Uploads",
          value: license.features.fileUploadsEnabled,
        },
        {
          key: "formAnalyticsEnabled",
          label: "Form Analytics",
          value: license.features.formAnalyticsEnabled,
        },
      ],
    },
    {
      title: "Web Publishing Features (3 features)",
      features: [
        {
          key: "seoToolsEnabled",
          label: "SEO Tools",
          value: license.features.seoToolsEnabled,
        },
        {
          key: "contentRulesEnabled",
          label: "Content Rules",
          value: license.features.contentRulesEnabled,
        },
        {
          key: "pageAnalyticsEnabled",
          label: "Page Analytics",
          value: license.features.pageAnalyticsEnabled,
        },
      ],
    },
    {
      title: "Workflow Features (3 features)",
      features: [
        {
          key: "workflowTemplatesEnabled",
          label: "Workflow Templates",
          value: license.features.workflowTemplatesEnabled,
        },
        {
          key: "advancedConditionsEnabled",
          label: "Advanced Conditions",
          value: license.features.advancedConditionsEnabled,
        },
        {
          key: "testModeEnabled",
          label: "Test Mode",
          value: license.features.testModeEnabled,
        },
      ],
    },
    {
      title: "Template Features (4 features)",
      features: [
        {
          key: "templateSetsEnabled",
          label: "Template Sets",
          value: license.features.templateSetsEnabled,
        },
        {
          key: "templateVersioningEnabled",
          label: "Template Versioning",
          value: license.features.templateVersioningEnabled,
        },
        {
          key: "advancedEditorEnabled",
          label: "Advanced Editor",
          value: license.features.advancedEditorEnabled,
        },
        {
          key: "templateSharingEnabled",
          label: "Template Sharing",
          value: license.features.templateSharingEnabled,
        },
      ],
    },
    {
      title: "Media Features (2 features)",
      features: [
        {
          key: "folderOrganizationEnabled",
          label: "Folder Organization",
          value: license.features.folderOrganizationEnabled,
        },
        {
          key: "cloudIntegrationEnabled",
          label: "Cloud Integration",
          value: license.features.cloudIntegrationEnabled,
        },
      ],
    },
    {
      title: "Certificate Features (3 features)",
      features: [
        {
          key: "customCertificateTemplatesEnabled",
          label: "Custom Certificate Templates",
          value: license.features.customCertificateTemplatesEnabled,
        },
        {
          key: "automatedCertificateDeliveryEnabled",
          label: "Automated Certificate Delivery",
          value: license.features.automatedCertificateDeliveryEnabled,
        },
        {
          key: "qrCodeEnabled",
          label: "QR Code",
          value: license.features.qrCodeEnabled,
        },
      ],
    },
    {
      title: "Translation Features (2 features)",
      features: [
        {
          key: "customTranslationsEnabled",
          label: "Custom Translations",
          value: license.features.customTranslationsEnabled,
        },
        {
          key: "autoTranslationEnabled",
          label: "Auto Translation",
          value: license.features.autoTranslationEnabled,
        },
      ],
    },
    {
      title: "Organization Features (3 features)",
      features: [
        {
          key: "rbacEnabled",
          label: "RBAC",
          value: license.features.rbacEnabled,
        },
        {
          key: "customRolesEnabled",
          label: "Custom Roles",
          value: license.features.customRolesEnabled,
        },
        {
          key: "ssoEnabled",
          label: "SSO",
          value: license.features.ssoEnabled,
        },
      ],
    },
    {
      title: "API & OAuth Features (3 features)",
      features: [
        {
          key: "apiKeysEnabled",
          label: "API Keys",
          value: license.features.apiKeysEnabled,
        },
        {
          key: "oauthEnabled",
          label: "OAuth",
          value: license.features.oauthEnabled,
        },
        {
          key: "apiWebhooksEnabled",
          label: "API Webhooks",
          value: license.features.apiWebhooksEnabled,
        },
      ],
    },
    {
      title: "AI Features (1 feature)",
      features: [
        {
          key: "aiEnabled",
          label: "AI",
          value: license.features.aiEnabled,
        },
      ],
    },
    {
      title: "Compliance Features (6 features)",
      features: [
        {
          key: "gdprToolsEnabled",
          label: "GDPR Tools",
          value: license.features.gdprToolsEnabled,
        },
        {
          key: "cookieConsentEnabled",
          label: "Cookie Consent",
          value: license.features.cookieConsentEnabled,
        },
        {
          key: "privacyPolicyGeneratorEnabled",
          label: "Privacy Policy Generator",
          value: license.features.privacyPolicyGeneratorEnabled,
        },
        {
          key: "termsGeneratorEnabled",
          label: "Terms Generator",
          value: license.features.termsGeneratorEnabled,
        },
        {
          key: "dataExportEnabled",
          label: "Data Export",
          value: license.features.dataExportEnabled,
        },
        {
          key: "dataDeleteRequestsEnabled",
          label: "Data Delete Requests",
          value: license.features.dataDeleteRequestsEnabled,
        },
      ],
    },
    {
      title: "Audit Features (2 features)",
      features: [
        {
          key: "detailedLogsEnabled",
          label: "Detailed Logs",
          value: license.features.detailedLogsEnabled,
        },
        {
          key: "auditLogExportEnabled",
          label: "Audit Log Export",
          value: license.features.auditLogExportEnabled,
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Plan Tier Selector (Super Admin Only) */}
      {editable && sessionId && (
        <div
          className="border-2 p-4"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg-light)",
          }}
        >
          <h3
            className="text-sm font-bold mb-3"
            style={{ color: "var(--win95-text)" }}
          >
            <span className="inline-flex items-center gap-2">
              <Target className="w-4 h-4" />
              Plan Tier Selector
            </span>
          </h3>
          <div className="grid grid-cols-5 gap-3">
            {(["free", "starter", "professional", "agency", "enterprise"] as const).map((tier) => {
              const isActive = license.planTier === tier;
              const TierIcon = tier === "free"
                ? Circle
                : tier === "starter"
                ? Rocket
                : tier === "professional"
                ? BriefcaseBusiness
                : tier === "agency"
                ? Building2
                : Crown;
              return (
                <button
                  key={tier}
                  onClick={() => handleChangePlanTier(tier)}
                  className="p-3 border-2 text-center transition-all hover:opacity-80"
                  style={{
                    borderColor: isActive ? "var(--win95-highlight)" : "var(--win95-border)",
                    background: isActive ? "var(--win95-highlight)" : "var(--win95-bg)",
                    color: isActive ? "white" : "var(--win95-text)",
                    fontWeight: "bold",
                  }}
                >
                  <div className="text-xs mb-1 flex justify-center">
                    <TierIcon className="w-4 h-4" />
                  </div>
                  <div className="text-xs uppercase">{tier}</div>
                  {isActive && (
                    <div className="text-[10px] mt-1">ACTIVE</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* License Header */}
      <LicenseHeader license={license} />

      {/* Resource Limits */}
      <div>
        <h3
          className="text-sm font-bold mb-3 flex items-center gap-2"
          style={{ color: "var(--win95-text)" }}
        >
          <BarChart3 className="w-4 h-4" />
          Resource Limits
          <span
            className="px-2 py-0.5 text-xs font-mono"
            style={{
              background: "var(--win95-bg-light)",
              color: "var(--neutral-gray)",
              border: "1px solid var(--win95-border)",
            }}
          >
            86 total limits
          </span>
        </h3>
        <div className="space-y-3">
          {limitCategories.map((category, index) => (
            <LimitCategory
              key={category.title}
              title={category.title}
              limits={category.limits}
              defaultExpanded={index === 0} // Expand first category by default
              editable={editable}
              onLimitChange={handleLimitChange}
            />
          ))}
        </div>
      </div>

      {/* Feature Access */}
      <div>
        <h3
          className="text-sm font-bold mb-3 flex items-center gap-2"
          style={{ color: "var(--win95-text)" }}
        >
          <Zap className="w-4 h-4" />
          Feature Access
          <span
            className="px-2 py-0.5 text-xs font-mono"
            style={{
              background: "var(--win95-bg-light)",
              color: "var(--neutral-gray)",
              border: "1px solid var(--win95-border)",
            }}
          >
            48 total features
          </span>
        </h3>
        <div className="space-y-3">
          {featureCategories.map((category, index) => (
            <FeatureCategory
              key={category.title}
              title={category.title}
              features={category.features}
              defaultExpanded={index === 0} // Expand first category by default
              editable={editable}
              onToggle={handleToggleFeature}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
