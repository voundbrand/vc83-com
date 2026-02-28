/**
 * WORKFLOW HELP MODAL
 *
 * Step-by-step guide for creating workflows.
 * Shows examples and explains how objects and behaviors connect.
 */

"use client";

import React from "react";
import { X, HelpCircle, CheckCircle } from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

interface WorkflowHelpModalProps {
  onClose: () => void;
}

export function WorkflowHelpModal({ onClose }: WorkflowHelpModalProps) {
  const { t } = useNamespaceTranslations("ui.workflows.help_modal");
  const tx = (key: string, fallback: string): string => {
    const translated = t(key);
    return translated === key ? fallback : translated;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div
        className="max-w-3xl w-full max-h-[90vh] overflow-auto border-4 shadow-2xl"
        style={{ borderColor: 'var(--window-document-border)', background: 'var(--window-document-bg-elevated)' }}
      >
        {/* Header */}
        <div className="border-b-2 p-4 flex items-center justify-between" style={{ borderColor: 'var(--window-document-border)', background: 'var(--tone-accent)' }}>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-white" />
            <h2 className="text-sm font-bold text-white">{tx("title", "How to Build Workflows")}</h2>
          </div>
          <button
            onClick={onClose}
            className="desktop-interior-button p-1 hover:bg-red-500 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Overview */}
          <section>
            <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--window-document-text)' }}>
              {tx("overview.heading", "What is a Workflow?")}
            </h3>
            <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
              {tx("overview.prefix", "A workflow connects your")}{" "}
              <strong>{tx("overview.objects_label", "objects")}</strong>{" "}
              {tx("overview.objects_description", "(products, forms, checkouts) with")}{" "}
              <strong>{tx("overview.behaviors_label", "behaviors")}</strong>{" "}
              {tx(
                "overview.behaviors_description",
                "(actions like form linking, add-on calculation) to create automated business processes."
              )}
            </p>
          </section>

          {/* Step-by-Step Guide */}
          <section className="border-2 p-4 rounded" style={{ borderColor: 'var(--window-document-border)', background: 'var(--window-document-bg)' }}>
            <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--window-document-text)' }}>
              {tx("guide.heading", "Step-by-Step Guide")}
            </h3>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white" style={{ background: 'var(--tone-accent)' }}>
                  1
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold mb-1" style={{ color: 'var(--window-document-text)' }}>
                    {tx("step_1.heading", "Add Objects (Left Panel)")}
                  </h4>
                  <p className="text-xs mb-2" style={{ color: 'var(--neutral-gray)' }}>
                    {tx("step_1.description", "Select objects that will be part of this workflow:")}
                  </p>
                  <ul className="text-xs space-y-1 ml-4" style={{ color: 'var(--neutral-gray)' }}>
                    <li>
                      • <strong>{tx("step_1.forms.label", "Forms")}</strong>{" "}
                      {tx("step_1.forms.description", "- Collect customer information")}
                    </li>
                    <li>
                      • <strong>{tx("step_1.products.label", "Products")}</strong>{" "}
                      {tx("step_1.products.description", "- Items to sell (tickets, merchandise)")}
                    </li>
                    <li>
                      • <strong>{tx("step_1.checkouts.label", "Checkouts")}</strong>{" "}
                      {tx("step_1.checkouts.description", "- Payment processing flows")}
                    </li>
                  </ul>
                  <div className="mt-2 p-2 rounded text-xs" style={{ background: '#fef3c7', color: '#92400e' }}>
                    <strong>{tx("step_1.tip_label", "Tip:")}</strong>{" "}
                    {tx(
                      "step_1.tip_text",
                      "Start with 1 Product + 1 Form + 1 Checkout for a basic flow"
                    )}
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white" style={{ background: 'var(--tone-accent)' }}>
                  2
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold mb-1" style={{ color: 'var(--window-document-text)' }}>
                    {tx("step_2.heading", "Watch Arrows Auto-Connect")}
                  </h4>
                  <p className="text-xs mb-2" style={{ color: 'var(--neutral-gray)' }}>
                    {tx("step_2.description", "The canvas automatically shows how objects relate:")}
                  </p>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-0.5 w-8" style={{ background: '#9333ea' }} />
                      <span style={{ color: 'var(--neutral-gray)' }}>
                        {tx("step_2.connection_form_product", 'Form → Product = "Collects data for"')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-0.5 w-8" style={{ background: '#2563eb' }} />
                      <span style={{ color: 'var(--neutral-gray)' }}>
                        {tx("step_2.connection_product_checkout", 'Product → Checkout = "Sold through"')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white" style={{ background: 'var(--tone-accent)' }}>
                  3
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold mb-1" style={{ color: 'var(--window-document-text)' }}>
                    {tx("step_3.heading", "Add Behaviors (Right Panel)")}
                  </h4>
                  <p className="text-xs mb-2" style={{ color: 'var(--neutral-gray)' }}>
                    {tx(
                      "step_3.description",
                      "Behaviors add intelligence to your workflow. Each behavior works with specific objects:"
                    )}
                  </p>
                  <div className="space-y-2">
                    <div className="p-2 rounded border" style={{ borderColor: 'var(--window-document-border)', background: 'var(--window-document-bg-elevated)' }}>
                      <div className="font-bold text-xs mb-1" style={{ color: '#059669' }}>
                        {tx("step_3.form_linking.heading", "Form Linking")}
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--neutral-gray)' }}>
                        <strong>{tx("step_3.form_linking.what_label", "What it does:")}</strong>{" "}
                        {tx("step_3.form_linking.what_text", "Shows a form during checkout")}
                        <br />
                        <strong>{tx("step_3.form_linking.needs_label", "Needs:")}</strong>{" "}
                        {tx("step_3.form_linking.needs_text", "1+ Forms, 1+ Checkout")}
                        <br />
                        <strong>{tx("step_3.form_linking.configure_label", "Configure:")}</strong>{" "}
                        {tx("step_3.form_linking.configure_text", "Which form + when to show it")}
                      </div>
                    </div>

                    <div className="p-2 rounded border" style={{ borderColor: 'var(--window-document-border)', background: 'var(--window-document-bg-elevated)' }}>
                      <div className="font-bold text-xs mb-1" style={{ color: '#dc2626' }}>
                        {tx("step_3.add_on_calculation.heading", "Add-on Calculation")}
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--neutral-gray)' }}>
                        <strong>{tx("step_3.add_on_calculation.what_label", "What it does:")}</strong>{" "}
                        {tx("step_3.add_on_calculation.what_text", "Adds extra items based on form responses")}
                        <br />
                        <strong>{tx("step_3.add_on_calculation.needs_label", "Needs:")}</strong>{" "}
                        {tx("step_3.add_on_calculation.needs_text", "1+ Forms")}
                        <br />
                        <strong>{tx("step_3.add_on_calculation.configure_label", "Configure:")}</strong>{" "}
                        {tx(
                          "step_3.add_on_calculation.configure_text",
                          "Which form fields + quantity mappings"
                        )}
                      </div>
                    </div>

                    <div className="p-2 rounded border" style={{ borderColor: 'var(--window-document-border)', background: 'var(--window-document-bg-elevated)' }}>
                      <div className="font-bold text-xs mb-1" style={{ color: '#f59e0b' }}>
                        {tx("step_3.employer_detection.heading", "Employer Detection")}
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--neutral-gray)' }}>
                        <strong>{tx("step_3.employer_detection.what_label", "What it does:")}</strong>{" "}
                        {tx("step_3.employer_detection.what_text", "Auto-fills billing from CRM")}
                        <br />
                        <strong>{tx("step_3.employer_detection.needs_label", "Needs:")}</strong>{" "}
                        {tx("step_3.employer_detection.needs_text", "1+ Forms, 1+ Checkout")}
                        <br />
                        <strong>{tx("step_3.employer_detection.configure_label", "Configure:")}</strong>{" "}
                        {tx("step_3.employer_detection.configure_text", "Employer field + CRM mappings")}
                      </div>
                    </div>

                    <div className="p-2 rounded border" style={{ borderColor: 'var(--window-document-border)', background: 'var(--window-document-bg-elevated)' }}>
                      <div className="font-bold text-xs mb-1" style={{ color: '#8b5cf6' }}>
                        {tx("step_3.invoice_mapping.heading", "Invoice Mapping")}
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--neutral-gray)' }}>
                        <strong>{tx("step_3.invoice_mapping.what_label", "What it does:")}</strong>{" "}
                        {tx("step_3.invoice_mapping.what_text", "Creates B2B invoices")}
                        <br />
                        <strong>{tx("step_3.invoice_mapping.needs_label", "Needs:")}</strong>{" "}
                        {tx("step_3.invoice_mapping.needs_text", "1+ Forms, 1+ Checkout")}
                        <br />
                        <strong>{tx("step_3.invoice_mapping.configure_label", "Configure:")}</strong>{" "}
                        {tx("step_3.invoice_mapping.configure_text", "Organization field + payment terms")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white" style={{ background: 'var(--tone-accent)' }}>
                  4
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold mb-1" style={{ color: 'var(--window-document-text)' }}>
                    {tx("step_4.heading", "Configure Each Behavior")}
                  </h4>
                  <p className="text-xs mb-2" style={{ color: 'var(--neutral-gray)' }}>
                    {tx(
                      "step_4.description",
                      "Click on a behavior to expand its configuration form. The arrows will update to show how the behavior connects to your objects."
                    )}
                  </p>
                  <div className="mt-2 p-2 rounded text-xs" style={{ background: '#fee2e2', color: '#991b1b' }}>
                    <strong>{tx("step_4.important_label", "Important:")}</strong>{" "}
                    {tx(
                      "step_4.important_text",
                      "Behaviors need the right objects to work! If you don't see arrows connecting, you might be missing required objects."
                    )}
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white" style={{ background: '#16a34a' }}>
                  <CheckCircle className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold mb-1" style={{ color: 'var(--window-document-text)' }}>
                    {tx("step_5.heading", "Save and Activate")}
                  </h4>
                  <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                    {tx("step_5.prefix", "Click")}{" "}
                    <strong>{tx("step_5.save_label", "Save")}</strong>{" "}
                    {tx(
                      "step_5.suffix",
                      "in the top-right. Your workflow is created as a draft. You can activate it later from the workflows list."
                    )}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Example Workflow */}
          <section className="border-2 p-4 rounded" style={{ borderColor: '#16a34a', background: '#f0fdf4' }}>
            <h3 className="text-sm font-bold mb-2" style={{ color: '#166534' }}>
              {tx("example.heading", "Example: Event Ticket Checkout")}
            </h3>
            <div className="space-y-2 text-xs" style={{ color: '#166534' }}>
              <p>
                <strong>{tx("example.goal_label", "Goal:")}</strong>{" "}
                {tx(
                  "example.goal_text",
                  "Sell event tickets with registration form and optional add-ons"
                )}
              </p>

              <div className="mt-3">
                <p className="font-bold mb-1">{tx("example.objects_label", "Objects to add:")}</p>
                <ol className="ml-4 space-y-1">
                  <li>
                    1. <strong>{tx("example.objects.form_label", "Form:")}</strong>{" "}
                    {tx(
                      "example.objects.form_text",
                      '"Event Registration" (collects attendee info, UCRA participants)'
                    )}
                  </li>
                  <li>
                    2. <strong>{tx("example.objects.product_label", "Product:")}</strong>{" "}
                    {tx("example.objects.product_text", '"Conference Ticket" (main item)')}
                  </li>
                  <li>
                    3. <strong>{tx("example.objects.checkout_label", "Checkout:")}</strong>{" "}
                    {tx("example.objects.checkout_text", '"Event Checkout" (payment flow)')}
                  </li>
                </ol>
              </div>

              <div className="mt-3">
                <p className="font-bold mb-1">{tx("example.behaviors_label", "Behaviors to add:")}</p>
                <ol className="ml-4 space-y-1">
                  <li>
                    1. <strong>{tx("example.behaviors.form_linking_label", "Form Linking:")}</strong>{" "}
                    {tx("example.behaviors.form_linking_text", 'Show "Event Registration" during checkout')}
                  </li>
                  <li>
                    2. <strong>{tx("example.behaviors.add_on_label", "Add-on Calculation:")}</strong>{" "}
                    {tx("example.behaviors.add_on_text", "Add UCRA tickets based on form response")}
                  </li>
                  <li>
                    3. <strong>{tx("example.behaviors.employer_label", "Employer Detection:")}</strong>{" "}
                    {tx("example.behaviors.employer_text", "Auto-fill billing for BDE students")}
                  </li>
                </ol>
              </div>

              <div className="mt-3 p-2 rounded" style={{ background: 'white', border: '1px solid #16a34a' }}>
                <p className="font-bold mb-1">{tx("example.result_label", "Result:")}</p>
                <p className="text-[10px]">
                  {tx(
                    "example.result_text",
                    'Customer buys ticket → Fills registration form → Form detects "BDE Students" employer → Billing auto-filled → Form asks "UCRA participants: 2" → 2 UCRA tickets added to cart → Invoice created for BDE → Payment processed'
                  )}
                </p>
              </div>
            </div>
          </section>

          {/* Common Issues */}
          <section>
            <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--window-document-text)' }}>
              {tx("issues.heading", "Common Issues")}
            </h3>
            <div className="space-y-2 text-xs">
              <div className="p-2 rounded" style={{ background: '#fef3c7', color: '#92400e' }}>
                <strong>{tx("issues.no_arrows_label", '"No arrows appear"')}</strong>
                <br />
                {tx(
                  "issues.no_arrows_text",
                  "→ Add at least 2 objects (e.g., Form + Checkout) to see connections"
                )}
              </div>
              <div className="p-2 rounded" style={{ background: '#fef3c7', color: '#92400e' }}>
                <strong>{tx("issues.behavior_disconnect_label", "\"Behavior doesn't connect\"")}</strong>
                <br />
                {tx(
                  "issues.behavior_disconnect_text",
                  "→ Check if you have the required objects. For example, Add-on Calculation needs a Form."
                )}
              </div>
              <div className="p-2 rounded" style={{ background: '#fef3c7', color: '#92400e' }}>
                <strong>{tx("issues.which_objects_label", '"Which objects does my behavior use?"')}</strong>
                <br />
                {tx(
                  "issues.which_objects_text",
                  "→ Look at the arrows! Dashed lines show behavior connections."
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t-2 p-4 flex justify-end" style={{ borderColor: 'var(--window-document-border)' }}>
          <button
            onClick={onClose}
            className="desktop-interior-button px-4 py-2 text-xs font-bold"
          >
            {tx("footer.cta", "Got it! Let's build")}
          </button>
        </div>
      </div>
    </div>
  );
}
