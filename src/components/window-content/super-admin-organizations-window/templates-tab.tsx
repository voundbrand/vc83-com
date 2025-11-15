"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { FileText, Check, X, Loader2, AlertCircle, FileInput, ShoppingCart, FileType, Package, Zap } from "lucide-react";

/**
 * Templates Tab
 *
 * Super admin UI to manage which templates are available to which organizations.
 * Displays matrices for:
 * 1. Web Page Templates
 * 2. Form Templates
 * 3. Checkout Templates
 * 4. PDF Templates (Tickets, Invoices, Certificates)
 */
export function TemplatesTab() {
  const { sessionId } = useAuth();

  // Fetch all system web page templates
  const allWebTemplates = useQuery(
    api.templateAvailability.getAllSystemTemplates,
    sessionId ? { sessionId } : "skip"
  );

  // Fetch all web template availabilities (for all orgs)
  const allWebAvailabilities = useQuery(
    api.templateAvailability.getAllTemplateAvailabilities,
    sessionId ? { sessionId } : "skip"
  );

  // Fetch all system form templates
  const allFormTemplates = useQuery(
    api.formTemplateAvailability.getAllSystemFormTemplates,
    sessionId ? { sessionId } : "skip"
  );

  // Fetch all form template availabilities (for all orgs)
  const allFormAvailabilities = useQuery(
    api.formTemplateAvailability.getAllFormTemplateAvailabilities,
    sessionId ? { sessionId } : "skip"
  );

  // Fetch all system checkout templates
  const allCheckoutTemplates = useQuery(
    api.checkoutTemplateAvailability.getAllSystemCheckoutTemplates,
    sessionId ? { sessionId } : "skip"
  );

  // Fetch all checkout template availabilities (for all orgs)
  const allCheckoutAvailabilities = useQuery(
    api.checkoutTemplateAvailability.getAllCheckoutTemplateAvailabilities,
    sessionId ? { sessionId } : "skip"
  );

  // Fetch all system PDF templates
  const allPdfTemplates = useQuery(
    api.pdfTemplateAvailability.getAllSystemPdfTemplates,
    sessionId ? { sessionId } : "skip"
  );

  // Fetch all PDF template availabilities (for all orgs)
  const allPdfAvailabilities = useQuery(
    api.pdfTemplateAvailability.getAllPdfTemplateAvailabilities,
    sessionId ? { sessionId } : "skip"
  );

  // Fetch all system template sets
  const allTemplateSets = useQuery(
    api.templateSetAvailability.getAllSystemTemplateSets,
    sessionId ? { sessionId } : "skip"
  );

  // Fetch all template set availabilities (for all orgs)
  const allTemplateSetAvailabilities = useQuery(
    api.templateSetAvailability.getAllTemplateSetAvailabilities,
    sessionId ? { sessionId } : "skip"
  );

  // Fetch all system workflow templates
  const allWorkflowTemplates = useQuery(
    api.workflowTemplateAvailability.getAllSystemWorkflowTemplates,
    sessionId ? { sessionId } : "skip"
  );

  // Fetch all workflow template availabilities (for all orgs)
  const allWorkflowAvailabilities = useQuery(
    api.workflowTemplateAvailability.getAllWorkflowTemplateAvailabilities,
    sessionId ? { sessionId } : "skip"
  );

  // Fetch all organizations
  const organizations = useQuery(
    api.organizations.listAll,
    sessionId ? { sessionId } : "skip"
  );

  if (!sessionId) {
    return (
      <div className="p-4">
        <div className="border-2 border-red-600 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-red-900">Authentication Required</h4>
              <p className="text-xs text-red-800 mt-1">
                Please log in to manage templates.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (
    !allWebTemplates ||
    !allWebAvailabilities ||
    !allFormTemplates ||
    !allFormAvailabilities ||
    !allCheckoutTemplates ||
    !allCheckoutAvailabilities ||
    !allPdfTemplates ||
    !allPdfAvailabilities ||
    !allTemplateSets ||
    !allTemplateSetAvailabilities ||
    !allWorkflowTemplates ||
    !allWorkflowAvailabilities ||
    !organizations
  ) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin text-purple-600" />
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="p-4">
        <div className="border-2 border-yellow-600 bg-yellow-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-yellow-900">No Organizations Found</h4>
              <p className="text-xs text-yellow-800 mt-1">
                No organizations exist yet.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 overflow-y-auto">
      {/* WEB PAGE TEMPLATES SECTION */}
      <div>
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <FileText size={16} />
            Web Page Templates Availability
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            Control which web page templates are visible to each organization for publishing websites.
          </p>
        </div>

        {allWebTemplates.length === 0 ? (
          <div className="border-2 border-yellow-600 bg-yellow-50 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-yellow-900">No Web Templates Found</h4>
                <p className="text-xs text-yellow-800 mt-1">
                  No web page templates have been seeded yet. Run the seed script to create templates.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Matrix Table */}
            <div className="border-2 border-gray-400 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-200 border-b-2 border-gray-400">
                    <th className="px-3 py-2 text-left font-bold sticky left-0 bg-gray-200 z-10">
                      Organization
                    </th>
                    {allWebTemplates.map((template) => (
                      <th key={template._id} className="px-3 py-2 text-center font-bold min-w-[120px]">
                        <div className="flex flex-col items-center gap-1">
                          <span>
                            {template.customProperties?.category === "events" && "🎉"}
                            {template.customProperties?.category === "checkout" && "🛒"}
                            {template.customProperties?.category === "invoicing" && "💰"}
                            {template.customProperties?.category === "forms" && "📝"}
                            {!template.customProperties?.category && "📄"}
                          </span>
                          <span className="text-center">{template.name}</span>
                          <code className="text-xs text-gray-500 bg-gray-100 px-1">
                            {template.customProperties?.code}
                          </code>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((org) => (
                    <WebTemplateRow
                      key={org._id}
                      organization={org}
                      templates={allWebTemplates}
                      availabilities={allWebAvailabilities.filter((a) => a.organizationId === org._id)}
                      sessionId={sessionId}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-500 border-2 border-gray-400 flex items-center justify-center">
                  <Check size={10} className="text-white" />
                </div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-500 border-2 border-gray-400 flex items-center justify-center">
                  <X size={10} className="text-white" />
                </div>
                <span>Not Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-gray-300 border-2 border-gray-400 flex items-center justify-center">
                  <Loader2 size={10} className="animate-spin" />
                </div>
                <span>Updating...</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* FORM TEMPLATES SECTION */}
      <div>
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <FileInput size={16} />
            Form Templates Availability
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            Control which form templates are visible to each organization for creating registration, survey, and application forms.
          </p>
        </div>

        {allFormTemplates.length === 0 ? (
          <div className="border-2 border-yellow-600 bg-yellow-50 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-yellow-900">No Form Templates Found</h4>
                <p className="text-xs text-yellow-800 mt-1">
                  No form templates have been seeded yet. Run the seed script to create form templates.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Matrix Table */}
            <div className="border-2 border-gray-400 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-200 border-b-2 border-gray-400">
                    <th className="px-3 py-2 text-left font-bold sticky left-0 bg-gray-200 z-10">
                      Organization
                    </th>
                    {allFormTemplates.map((template) => (
                      <th key={template._id} className="px-3 py-2 text-center font-bold min-w-[120px]">
                        <div className="flex flex-col items-center gap-1">
                          <span>
                            {template.subtype === "registration" && "🎫"}
                            {template.subtype === "survey" && "📊"}
                            {template.subtype === "application" && "📝"}
                            {!template.subtype && "📋"}
                          </span>
                          <span className="text-center">{template.name}</span>
                          <code className="text-xs text-gray-500 bg-gray-100 px-1">
                            {template.customProperties?.code}
                          </code>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((org) => (
                    <FormTemplateRow
                      key={org._id}
                      organization={org}
                      templates={allFormTemplates}
                      availabilities={allFormAvailabilities.filter((a) => a.organizationId === org._id)}
                      sessionId={sessionId}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-500 border-2 border-gray-400 flex items-center justify-center">
                  <Check size={10} className="text-white" />
                </div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-500 border-2 border-gray-400 flex items-center justify-center">
                  <X size={10} className="text-white" />
                </div>
                <span>Not Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-gray-300 border-2 border-gray-400 flex items-center justify-center">
                  <Loader2 size={10} className="animate-spin" />
                </div>
                <span>Updating...</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* CHECKOUT TEMPLATES SECTION */}
      <div>
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <ShoppingCart size={16} />
            Checkout Templates Availability
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            Control which checkout templates are visible to each organization for creating checkout pages and payment flows.
          </p>
        </div>

        {allCheckoutTemplates.length === 0 ? (
          <div className="border-2 border-yellow-600 bg-yellow-50 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-yellow-900">No Checkout Templates Found</h4>
                <p className="text-xs text-yellow-800 mt-1">
                  No checkout templates have been seeded yet. Run the seed script to create checkout templates.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Matrix Table */}
            <div className="border-2 border-gray-400 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-200 border-b-2 border-gray-400">
                    <th className="px-3 py-2 text-left font-bold sticky left-0 bg-gray-200 z-10">
                      Organization
                    </th>
                    {allCheckoutTemplates.map((template) => (
                      <th key={template._id} className="px-3 py-2 text-center font-bold min-w-[120px]">
                        <div className="flex flex-col items-center gap-1">
                          <span>
                            {template.subtype === "ticket" && "🎫"}
                            {template.subtype === "product" && "📦"}
                            {template.subtype === "service" && "⚙️"}
                            {!template.subtype && "🛒"}
                          </span>
                          <span className="text-center">{template.name}</span>
                          <code className="text-xs text-gray-500 bg-gray-100 px-1">
                            {template.customProperties?.code}
                          </code>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((org) => (
                    <CheckoutTemplateRow
                      key={org._id}
                      organization={org}
                      templates={allCheckoutTemplates}
                      availabilities={allCheckoutAvailabilities.filter((a) => a.organizationId === org._id)}
                      sessionId={sessionId}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-500 border-2 border-gray-400 flex items-center justify-center">
                  <Check size={10} className="text-white" />
                </div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-500 border-2 border-gray-400 flex items-center justify-center">
                  <X size={10} className="text-white" />
                </div>
                <span>Not Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-gray-300 border-2 border-gray-400 flex items-center justify-center">
                  <Loader2 size={10} className="animate-spin" />
                </div>
                <span>Updating...</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* PDF TEMPLATES SECTION */}
      <div>
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <FileType size={16} />
            PDF Templates Availability
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            Control which PDF templates are visible to each organization for generating tickets, invoices, and certificates.
          </p>
        </div>

        {allPdfTemplates.length === 0 ? (
          <div className="border-2 border-yellow-600 bg-yellow-50 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-yellow-900">No PDF Templates Found</h4>
                <p className="text-xs text-yellow-800 mt-1">
                  No PDF templates have been seeded yet. Run the seed script to create PDF templates.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Matrix Table */}
            <div className="border-2 border-gray-400 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-200 border-b-2 border-gray-400">
                    <th className="px-3 py-2 text-left font-bold sticky left-0 bg-gray-200 z-10">
                      Organization
                    </th>
                    {allPdfTemplates.map((template) => (
                      <th key={template._id} className="px-3 py-2 text-center font-bold min-w-[120px]">
                        <div className="flex flex-col items-center gap-1">
                          <span>
                            {template.customProperties?.category === "ticket" && "🎫"}
                            {template.customProperties?.category === "invoice" && "💰"}
                            {template.customProperties?.category === "receipt" && "🧾"}
                            {template.customProperties?.category === "certificate" && "🏆"}
                            {!template.customProperties?.category && "📄"}
                          </span>
                          <span className="text-center">{template.name}</span>
                          <code className="text-xs text-gray-500 bg-gray-100 px-1">
                            {template.customProperties?.code}
                          </code>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((org) => (
                    <PdfTemplateRow
                      key={org._id}
                      organization={org}
                      templates={allPdfTemplates}
                      availabilities={allPdfAvailabilities.filter((a) => a.organizationId === org._id)}
                      sessionId={sessionId}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-500 border-2 border-gray-400 flex items-center justify-center">
                  <Check size={10} className="text-white" />
                </div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-500 border-2 border-gray-400 flex items-center justify-center">
                  <X size={10} className="text-white" />
                </div>
                <span>Not Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-gray-300 border-2 border-gray-400 flex items-center justify-center">
                  <Loader2 size={10} className="animate-spin" />
                </div>
                <span>Updating...</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* TEMPLATE SETS SECTION */}
      <div>
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Package size={16} />
            Template Sets Availability
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            Control which template sets are visible to each organization. Template sets bundle ticket, invoice, and email templates for consistent branding.
          </p>
        </div>

        {allTemplateSets.length === 0 ? (
          <div className="border-2 border-yellow-600 bg-yellow-50 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-yellow-900">No Template Sets Found</h4>
                <p className="text-xs text-yellow-800 mt-1">
                  No template sets have been seeded yet. Run the seed script to create template sets.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Matrix Table */}
            <div className="border-2 border-gray-400 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-200 border-b-2 border-gray-400">
                    <th className="px-3 py-2 text-left font-bold sticky left-0 bg-gray-200 z-10">
                      Organization
                    </th>
                    {allTemplateSets.map((templateSet) => (
                      <th key={templateSet._id} className="px-3 py-2 text-center font-bold min-w-[140px]">
                        <div className="flex flex-col items-center gap-1">
                          <span>
                            {templateSet.isSystemDefault ? "⭐" : "📦"}
                          </span>
                          <span className="text-center">{templateSet.name}</span>
                          {templateSet.tags && templateSet.tags.length > 0 && (
                            <div className="flex gap-1 flex-wrap justify-center">
                              {templateSet.tags.map((tag) => (
                                <code key={tag} className="text-xs text-gray-500 bg-gray-100 px-1">
                                  {tag}
                                </code>
                              ))}
                            </div>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((org) => (
                    <TemplateSetRow
                      key={org._id}
                      organization={org}
                      templateSets={allTemplateSets}
                      availabilities={allTemplateSetAvailabilities.filter((a) => a.organizationId === org._id)}
                      sessionId={sessionId}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-500 border-2 border-gray-400 flex items-center justify-center">
                  <Check size={10} className="text-white" />
                </div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-500 border-2 border-gray-400 flex items-center justify-center">
                  <X size={10} className="text-white" />
                </div>
                <span>Not Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-gray-300 border-2 border-gray-400 flex items-center justify-center">
                  <Loader2 size={10} className="animate-spin" />
                </div>
                <span>Updating...</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* WORKFLOW TEMPLATES SECTION */}
      <div>
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Zap size={16} />
            Workflow Templates Availability
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            Control which workflow templates are visible to each organization for creating automated workflows and business processes.
          </p>
        </div>

        {allWorkflowTemplates.length === 0 ? (
          <div className="border-2 border-yellow-600 bg-yellow-50 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-yellow-900">No Workflow Templates Found</h4>
                <p className="text-xs text-yellow-800 mt-1">
                  No workflow templates have been seeded yet. Run: npx convex run seedWorkflowTemplates:seedWorkflowTemplates
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Matrix Table */}
            <div className="border-2 border-gray-400 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-200 border-b-2 border-gray-400">
                    <th className="px-3 py-2 text-left font-bold sticky left-0 bg-gray-200 z-10">
                      Organization
                    </th>
                    {allWorkflowTemplates.map((template) => (
                      <th key={template._id} className="px-3 py-2 text-center font-bold min-w-[120px]">
                        <div className="flex flex-col items-center gap-1">
                          <span>
                            {template.customProperties?.icon || "⚡"}
                          </span>
                          <span className="text-center">{template.name}</span>
                          <code className="text-xs text-gray-500 bg-gray-100 px-1">
                            {template.customProperties?.code}
                          </code>
                          <span className="text-xs text-gray-500">
                            {template.customProperties?.category}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((org) => (
                    <WorkflowTemplateRow
                      key={org._id}
                      organization={org}
                      templates={allWorkflowTemplates}
                      availabilities={allWorkflowAvailabilities.filter((a) => a.organizationId === org._id)}
                      sessionId={sessionId}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-500 border-2 border-gray-400 flex items-center justify-center">
                  <Check size={10} className="text-white" />
                </div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-500 border-2 border-gray-400 flex items-center justify-center">
                  <X size={10} className="text-white" />
                </div>
                <span>Not Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-gray-300 border-2 border-gray-400 flex items-center justify-center">
                  <Loader2 size={10} className="animate-spin" />
                </div>
                <span>Updating...</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Web Template Row - for web page templates
 */
function WebTemplateRow({
  organization,
  templates,
  availabilities,
  sessionId,
}: {
  organization: { _id: Id<"organizations">; name: string; slug?: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  templates: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  availabilities: any[];
  sessionId: string;
}) {
  const [loadingTemplateCode, setLoadingTemplateCode] = useState<string | null>(null);
  const enableTemplate = useMutation(api.templateAvailability.enableTemplateForOrg);
  const disableTemplate = useMutation(api.templateAvailability.disableTemplateForOrg);

  const handleToggle = async (templateCode: string, currentState: boolean) => {
    try {
      setLoadingTemplateCode(templateCode);

      if (currentState) {
        // Disable
        await disableTemplate({
          sessionId,
          organizationId: organization._id,
          templateCode: templateCode,
        });
      } else {
        // Enable
        await enableTemplate({
          sessionId,
          organizationId: organization._id,
          templateCode: templateCode,
        });
      }
    } catch (error) {
      console.error("Failed to toggle web template availability:", error);
      alert(`Failed to update: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoadingTemplateCode(null);
    }
  };

  return (
    <tr className="border-b border-gray-300 hover:bg-gray-50">
      <td className="px-3 py-2 font-semibold sticky left-0 bg-white z-10">
        <div>
          <div>{organization.name}</div>
          <div className="text-gray-500 text-xs font-normal">
            {organization.slug}
          </div>
        </div>
      </td>
      {templates.map((template) => {
        const templateCode = template.customProperties?.code as string;
        const availability = availabilities.find(
          (a) => a.customProperties?.templateCode === templateCode
        );
        const isAvailable = availability?.customProperties?.available ?? false;
        const isLoading = loadingTemplateCode === templateCode;

        return (
          <td key={template._id} className="px-3 py-2 text-center">
            <button
              onClick={() => handleToggle(templateCode, isAvailable)}
              disabled={isLoading}
              className="w-8 h-8 border-2 border-gray-400 flex items-center justify-center transition-colors hover:opacity-80 disabled:opacity-50 mx-auto"
              style={{
                backgroundColor: isLoading
                  ? "#d1d5db"
                  : isAvailable
                  ? "#22c55e"
                  : "#ef4444",
              }}
              title={
                isLoading
                  ? "Updating..."
                  : isAvailable
                  ? `Click to disable ${template.name} for ${organization.name}`
                  : `Click to enable ${template.name} for ${organization.name}`
              }
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin text-gray-600" />
              ) : isAvailable ? (
                <Check size={16} className="text-white" />
              ) : (
                <X size={16} className="text-white" />
              )}
            </button>
          </td>
        );
      })}
    </tr>
  );
}

/**
 * Form Template Row - for form templates
 */
function FormTemplateRow({
  organization,
  templates,
  availabilities,
  sessionId,
}: {
  organization: { _id: Id<"organizations">; name: string; slug?: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  templates: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  availabilities: any[];
  sessionId: string;
}) {
  const [loadingTemplateCode, setLoadingTemplateCode] = useState<string | null>(null);
  const enableTemplate = useMutation(api.formTemplateAvailability.enableFormTemplate);
  const disableTemplate = useMutation(api.formTemplateAvailability.disableFormTemplate);

  const handleToggle = async (templateCode: string, currentState: boolean) => {
    try {
      setLoadingTemplateCode(templateCode);

      if (currentState) {
        // Disable
        await disableTemplate({
          sessionId,
          organizationId: organization._id,
          templateCode,
        });
      } else {
        // Enable
        await enableTemplate({
          sessionId,
          organizationId: organization._id,
          templateCode,
        });
      }
    } catch (error) {
      console.error("Failed to toggle form template availability:", error);
      alert(`Failed to update: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoadingTemplateCode(null);
    }
  };

  return (
    <tr className="border-b border-gray-300 hover:bg-gray-50">
      <td className="px-3 py-2 font-semibold sticky left-0 bg-white z-10">
        <div>
          <div>{organization.name}</div>
          <div className="text-gray-500 text-xs font-normal">
            {organization.slug}
          </div>
        </div>
      </td>
      {templates.map((template) => {
        const templateCode = template.customProperties?.code as string;
        const availability = availabilities.find(
          (a) => a.customProperties?.templateCode === templateCode
        );
        const isAvailable = availability?.customProperties?.available ?? false;
        const isLoading = loadingTemplateCode === templateCode;

        return (
          <td key={template._id} className="px-3 py-2 text-center">
            <button
              onClick={() => handleToggle(templateCode, isAvailable)}
              disabled={isLoading}
              className="w-8 h-8 border-2 border-gray-400 flex items-center justify-center transition-colors hover:opacity-80 disabled:opacity-50 mx-auto"
              style={{
                backgroundColor: isLoading
                  ? "#d1d5db"
                  : isAvailable
                  ? "#22c55e"
                  : "#ef4444",
              }}
              title={
                isLoading
                  ? "Updating..."
                  : isAvailable
                  ? `Click to disable ${template.name} for ${organization.name}`
                  : `Click to enable ${template.name} for ${organization.name}`
              }
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin text-gray-600" />
              ) : isAvailable ? (
                <Check size={16} className="text-white" />
              ) : (
                <X size={16} className="text-white" />
              )}
            </button>
          </td>
        );
      })}
    </tr>
  );
}

/**
 * Checkout Template Row - for checkout templates
 */
function CheckoutTemplateRow({
  organization,
  templates,
  availabilities,
  sessionId,
}: {
  organization: { _id: Id<"organizations">; name: string; slug?: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  templates: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  availabilities: any[];
  sessionId: string;
}) {
  const [loadingTemplateCode, setLoadingTemplateCode] = useState<string | null>(null);
  const enableTemplate = useMutation(api.checkoutTemplateAvailability.enableCheckoutTemplate);
  const disableTemplate = useMutation(api.checkoutTemplateAvailability.disableCheckoutTemplate);

  const handleToggle = async (templateCode: string, currentState: boolean) => {
    try {
      setLoadingTemplateCode(templateCode);

      if (currentState) {
        // Disable
        await disableTemplate({
          sessionId,
          organizationId: organization._id,
          templateCode,
        });
      } else {
        // Enable
        await enableTemplate({
          sessionId,
          organizationId: organization._id,
          templateCode,
        });
      }
    } catch (error) {
      console.error("Failed to toggle checkout template availability:", error);
      alert(`Failed to update: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoadingTemplateCode(null);
    }
  };

  return (
    <tr className="border-b border-gray-300 hover:bg-gray-50">
      <td className="px-3 py-2 font-semibold sticky left-0 bg-white z-10">
        <div>
          <div>{organization.name}</div>
          <div className="text-gray-500 text-xs font-normal">
            {organization.slug}
          </div>
        </div>
      </td>
      {templates.map((template) => {
        const templateCode = template.customProperties?.code as string;
        const availability = availabilities.find(
          (a) => a.customProperties?.templateCode === templateCode
        );
        const isAvailable = availability?.customProperties?.available ?? false;
        const isLoading = loadingTemplateCode === templateCode;

        return (
          <td key={template._id} className="px-3 py-2 text-center">
            <button
              onClick={() => handleToggle(templateCode, isAvailable)}
              disabled={isLoading}
              className="w-8 h-8 border-2 border-gray-400 flex items-center justify-center transition-colors hover:opacity-80 disabled:opacity-50 mx-auto"
              style={{
                backgroundColor: isLoading
                  ? "#d1d5db"
                  : isAvailable
                  ? "#22c55e"
                  : "#ef4444",
              }}
              title={
                isLoading
                  ? "Updating..."
                  : isAvailable
                  ? `Click to disable ${template.name} for ${organization.name}`
                  : `Click to enable ${template.name} for ${organization.name}`
              }
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin text-gray-600" />
              ) : isAvailable ? (
                <Check size={16} className="text-white" />
              ) : (
                <X size={16} className="text-white" />
              )}
            </button>
          </td>
        );
      })}
    </tr>
  );
}
/**
 * PDF Template Row - for PDF templates (tickets, invoices, certificates)
 */
function PdfTemplateRow({
  organization,
  templates,
  availabilities,
  sessionId,
}: {
  organization: { _id: Id<"organizations">; name: string; slug?: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  templates: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  availabilities: any[];
  sessionId: string;
}) {
  const [loadingTemplateCode, setLoadingTemplateCode] = useState<string | null>(null);
  const enableTemplate = useMutation(api.pdfTemplateAvailability.enablePdfTemplate);
  const disableTemplate = useMutation(api.pdfTemplateAvailability.disablePdfTemplate);

  const handleToggle = async (templateCode: string, currentState: boolean) => {
    try {
      setLoadingTemplateCode(templateCode);

      if (currentState) {
        // Disable
        await disableTemplate({
          sessionId,
          organizationId: organization._id,
          templateCode,
        });
      } else {
        // Enable
        await enableTemplate({
          sessionId,
          organizationId: organization._id,
          templateCode,
        });
      }
    } catch (error) {
      console.error("Failed to toggle PDF template availability:", error);
      alert(`Failed to update: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoadingTemplateCode(null);
    }
  };

  return (
    <tr className="border-b border-gray-300 hover:bg-gray-50">
      <td className="px-3 py-2 font-semibold sticky left-0 bg-white z-10">
        <div>
          <div>{organization.name}</div>
          <div className="text-gray-500 text-xs font-normal">
            {organization.slug}
          </div>
        </div>
      </td>
      {templates.map((template) => {
        const templateCode = template.customProperties?.code as string;
        const availability = availabilities.find(
          (a) => a.customProperties?.templateCode === templateCode
        );
        const isAvailable = availability?.customProperties?.available ?? false;
        const isLoading = loadingTemplateCode === templateCode;

        return (
          <td key={template._id} className="px-3 py-2 text-center">
            <button
              onClick={() => handleToggle(templateCode, isAvailable)}
              disabled={isLoading}
              className="w-8 h-8 border-2 border-gray-400 flex items-center justify-center transition-colors hover:opacity-80 disabled:opacity-50 mx-auto"
              style={{
                backgroundColor: isLoading
                  ? "#d1d5db"
                  : isAvailable
                  ? "#22c55e"
                  : "#ef4444",
              }}
              title={
                isLoading
                  ? "Updating..."
                  : isAvailable
                  ? `Click to disable ${template.name} for ${organization.name}`
                  : `Click to enable ${template.name} for ${organization.name}`
              }
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin text-gray-600" />
              ) : isAvailable ? (
                <Check size={16} className="text-white" />
              ) : (
                <X size={16} className="text-white" />
              )}
            </button>
          </td>
        );
      })}
    </tr>
  );
}


/**
 * Template Set Row - for template sets (bundles of ticket, invoice, email templates)
 */
function TemplateSetRow({
  organization,
  templateSets,
  availabilities,
  sessionId,
}: {
  organization: { _id: Id<"organizations">; name: string; slug?: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  templateSets: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  availabilities: any[];
  sessionId: string;
}) {
  const [loadingTemplateSetId, setLoadingTemplateSetId] = useState<string | null>(null);
  const enableTemplateSet = useMutation(api.templateSetAvailability.enableTemplateSet);
  const disableTemplateSet = useMutation(api.templateSetAvailability.disableTemplateSet);

  const handleToggle = async (templateSetId: string, currentState: boolean) => {
    try {
      setLoadingTemplateSetId(templateSetId);

      if (currentState) {
        // Disable
        await disableTemplateSet({
          sessionId,
          organizationId: organization._id,
          templateSetId: templateSetId as Id<"objects">,
        });
      } else {
        // Enable
        await enableTemplateSet({
          sessionId,
          organizationId: organization._id,
          templateSetId: templateSetId as Id<"objects">,
        });
      }
    } catch (error) {
      console.error("Failed to toggle template set availability:", error);
      alert(`Failed to update: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoadingTemplateSetId(null);
    }
  };

  return (
    <tr className="border-b border-gray-300 hover:bg-gray-50">
      <td className="px-3 py-2 font-semibold sticky left-0 bg-white z-10">
        <div>
          <div>{organization.name}</div>
          <div className="text-gray-500 text-xs font-normal">
            {organization.slug}
          </div>
        </div>
      </td>
      {templateSets.map((templateSet) => {
        const availability = availabilities.find(
          (a) => a.templateSetId === templateSet._id
        );
        const isAvailable = availability?.available ?? false;
        const isLoading = loadingTemplateSetId === templateSet._id;

        return (
          <td key={templateSet._id} className="px-3 py-2 text-center">
            <button
              onClick={() => handleToggle(templateSet._id, isAvailable)}
              disabled={isLoading}
              className="w-8 h-8 border-2 border-gray-400 flex items-center justify-center transition-colors hover:opacity-80 disabled:opacity-50 mx-auto"
              style={{
                backgroundColor: isLoading
                  ? "#d1d5db"
                  : isAvailable
                  ? "#22c55e"
                  : "#ef4444",
              }}
              title={
                isLoading
                  ? "Updating..."
                  : isAvailable
                  ? `Click to disable ${templateSet.name} for ${organization.name}`
                  : `Click to enable ${templateSet.name} for ${organization.name}`
              }
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin text-gray-600" />
              ) : isAvailable ? (
                <Check size={16} className="text-white" />
              ) : (
                <X size={16} className="text-white" />
              )}
            </button>
          </td>
        );
      })}
    </tr>
  );
}

/**
 * Workflow Template Row - for workflow templates
 */
function WorkflowTemplateRow({
  organization,
  templates,
  availabilities,
  sessionId,
}: {
  organization: { _id: Id<"organizations">; name: string; slug?: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  templates: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  availabilities: any[];
  sessionId: string;
}) {
  const [loadingTemplateCode, setLoadingTemplateCode] = useState<string | null>(null);
  const enableTemplate = useMutation(api.workflowTemplateAvailability.enableWorkflowTemplate);
  const disableTemplate = useMutation(api.workflowTemplateAvailability.disableWorkflowTemplate);

  const handleToggle = async (templateCode: string, currentState: boolean) => {
    try {
      setLoadingTemplateCode(templateCode);

      if (currentState) {
        // Disable
        await disableTemplate({
          sessionId,
          organizationId: organization._id,
          templateCode,
        });
      } else {
        // Enable
        await enableTemplate({
          sessionId,
          organizationId: organization._id,
          templateCode,
        });
      }
    } catch (error) {
      console.error("Failed to toggle workflow template availability:", error);
      alert(`Failed to update: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoadingTemplateCode(null);
    }
  };

  return (
    <tr className="border-b border-gray-300 hover:bg-gray-50">
      <td className="px-3 py-2 font-semibold sticky left-0 bg-white z-10">
        <div>
          <div>{organization.name}</div>
          <div className="text-gray-500 text-xs font-normal">
            {organization.slug}
          </div>
        </div>
      </td>
      {templates.map((template) => {
        const templateCode = template.customProperties?.code as string;
        const availability = availabilities.find(
          (a) => a.customProperties?.templateCode === templateCode
        );
        const isAvailable = availability?.customProperties?.available ?? false;
        const isLoading = loadingTemplateCode === templateCode;

        return (
          <td key={template._id} className="px-3 py-2 text-center">
            <button
              onClick={() => handleToggle(templateCode, isAvailable)}
              disabled={isLoading}
              className="w-8 h-8 border-2 border-gray-400 flex items-center justify-center transition-colors hover:opacity-80 disabled:opacity-50 mx-auto"
              style={{
                backgroundColor: isLoading
                  ? "#d1d5db"
                  : isAvailable
                  ? "#22c55e"
                  : "#ef4444",
              }}
              title={
                isLoading
                  ? "Updating..."
                  : isAvailable
                  ? `Click to disable ${template.name} for ${organization.name}`
                  : `Click to enable ${template.name} for ${organization.name}`
              }
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin text-gray-600" />
              ) : isAvailable ? (
                <Check size={16} className="text-white" />
              ) : (
                <X size={16} className="text-white" />
              )}
            </button>
          </td>
        );
      })}
    </tr>
  );
}
