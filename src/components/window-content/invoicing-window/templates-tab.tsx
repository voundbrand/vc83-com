"use client";

import { Eye, FileText, Building2, Users, FileStack } from "lucide-react";

/**
 * Templates Tab - PDF Invoice Templates
 *
 * Displays available invoice templates with preview functionality.
 * Shows 4 template types: B2C Receipt, B2B Single, B2B Consolidated, B2B Consolidated Detailed
 */

type TemplateId = "b2c_receipt" | "b2b_single" | "b2b_consolidated" | "b2b_consolidated_detailed";

interface Template {
  id: TemplateId;
  name: string;
  description: string;
  useCase: string;
  color: string;
  icon: React.ReactNode;
  features: string[];
}

const TEMPLATES: Template[] = [
  {
    id: "b2c_receipt",
    name: "B2C Receipt",
    description: "Simple customer receipt for individual purchases",
    useCase: "Single customer checkout",
    color: "#9F7AEA", // Purple
    icon: <FileText size={24} />,
    features: [
      "Clean, simple layout",
      "Customer details",
      "Line items with prices",
      "Tax breakdown",
      "Payment method",
    ],
  },
  {
    id: "b2b_single",
    name: "B2B Single Invoice",
    description: "Professional invoice for individual business transactions",
    useCase: "Single business customer",
    color: "#4299E1", // Blue
    icon: <Building2 size={24} />,
    features: [
      "Professional layout",
      "Company details & VAT",
      "Billing address",
      "Payment terms (NET30)",
      "Invoice number",
    ],
  },
  {
    id: "b2b_consolidated",
    name: "B2B Consolidated",
    description: "Multi-employee invoice for employer billing (AMEOS use case)",
    useCase: "Multiple employees → Single employer",
    color: "#48BB78", // Green
    icon: <Users size={24} />,
    features: [
      "Employee list view",
      "Grouped by employee",
      "Total per employee",
      "Consolidated total",
      "Employer billing",
    ],
  },
  {
    id: "b2b_consolidated_detailed",
    name: "B2B Consolidated (Detailed)",
    description: "Itemized breakdown per employee with full ticket details",
    useCase: "Detailed employer invoice",
    color: "#9F7AEA", // Purple
    icon: <FileStack size={24} />,
    features: [
      "Full itemization",
      "Product breakdown per employee",
      "Ticket-level details",
      "Subtotals & totals",
      "Comprehensive view",
    ],
  },
];

export function TemplatesTab() {
  const handlePreview = (templateId: TemplateId) => {
    // TODO: Open preview modal with sample PDF
    alert(`Preview for ${templateId} coming soon!`);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-sm font-bold mb-2" style={{ color: "var(--win95-text)" }}>
          Invoice Templates
        </h3>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          Choose a template for your invoice PDFs. Each template is optimized for specific use cases.
        </p>
      </div>

      {/* Template Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TEMPLATES.map((template) => (
          <div
            key={template.id}
            className="border-2 rounded-lg p-4 hover:shadow-md transition-shadow"
            style={{
              background: "var(--win95-bg-light)",
              borderColor: "var(--win95-border)",
            }}
          >
            {/* Template Header */}
            <div className="flex items-start gap-3 mb-3">
              <div
                className="p-2 rounded"
                style={{
                  backgroundColor: `${template.color}20`,
                  color: template.color,
                }}
              >
                {template.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                  {template.name}
                </h4>
                <p className="text-xs mb-2" style={{ color: "var(--neutral-gray)" }}>
                  {template.description}
                </p>
              </div>
            </div>

            {/* Use Case Badge */}
            <div
              className="inline-block px-2 py-1 text-[10px] font-bold rounded mb-3"
              style={{
                backgroundColor: `${template.color}20`,
                color: template.color,
              }}
            >
              {template.useCase}
            </div>

            {/* Features */}
            <div className="space-y-1 mb-4">
              {template.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
                  <span className="text-[10px] mt-0.5">✓</span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => handlePreview(template.id)}
                className="flex-1 px-3 py-2 text-xs font-semibold rounded flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                style={{
                  backgroundColor: template.color,
                  color: "white",
                }}
              >
                <Eye size={14} />
                Preview
              </button>
              <button
                className="px-3 py-2 text-xs font-semibold rounded opacity-50 cursor-not-allowed"
                style={{
                  backgroundColor: "var(--win95-bg)",
                  color: "var(--win95-text)",
                  border: "2px solid var(--win95-border)",
                }}
                disabled
                title="Use in Rules tab"
              >
                Use
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div
        className="mt-6 p-4 border-2 rounded"
        style={{
          backgroundColor: "var(--win95-bg-light)",
          borderColor: "var(--win95-border)",
        }}
      >
        <h4 className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
          💡 Template Usage
        </h4>
        <div className="text-xs space-y-1" style={{ color: "var(--neutral-gray)" }}>
          <p>• <strong>B2C Receipt:</strong> Used automatically for individual customer transactions</p>
          <p>• <strong>B2B Single:</strong> Used for single business transactions</p>
          <p>• <strong>B2B Consolidated:</strong> AMEOS use case - 10 doctors → 1 invoice to employer</p>
          <p>• <strong>B2B Consolidated (Detailed):</strong> Same as above but with full itemization</p>
        </div>
      </div>
    </div>
  );
}
