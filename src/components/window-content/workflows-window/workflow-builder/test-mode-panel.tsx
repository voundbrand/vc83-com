/**
 * TEST MODE PANEL
 *
 * Bottom panel for testing workflows with sample data.
 * Inspired by n8n's execution testing interface.
 */

"use client";

import React, { useState, useEffect } from "react";
import { Play, Loader2, ChevronDown, ChevronUp, FileJson, Trash2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

interface ExecutionResult {
  behaviorId: string;
  behaviorType: string;
  status: "success" | "error" | "running";
  duration: number;
  input?: unknown;
  output?: unknown;
  error?: string;
}

interface TestModePanelProps {
  sessionId: string;
  organizationId: string;
  onExecute: (testData: Record<string, unknown>) => void;
  isExecuting: boolean;
  executionResults?: {
    success: boolean;
    message?: string;
    results: ExecutionResult[];
    finalOutput?: unknown;
  } | null;
  onClose: () => void;
}

const SAMPLE_TEMPLATES = [
  {
    name: "Event Registration (AMEOS - Employer Billing with Multiple Products)",
    data: {
      eventId: "ns73596xb9xmypy0g28pypyard7vcpv2",
      eventType: "haffsymposium_registration",
      formId: "form_id_here",
      products: [
        {
          productId: "product_id_here",
          quantity: 1
        }
      ],
      customerData: {
        email: "max.mustermann@ameos.de",
        firstName: "Max",
        lastName: "Mustermann",
        phone: "+49 123 456789",
        salutation: "Herr",
        title: "Dr.",
        organization: "AMEOS Klinikum Ueckermünde"
      },
      formResponses: {
        attendee_category: "ameos",
        salutation: "Herr",
        title: "Dr.",
        first_name: "Max",
        last_name: "Mustermann",
        email: "max.mustermann@ameos.de",
        phone: "+49 123 456789",
        profession: "Facharzt für Allgemeinmedizin",
        organization: "AMEOS Klinikum Ueckermünde",
        position: "Oberarzt",
        department: "Innere Medizin",
        street: "Ravensteinstraße 23",
        city: "Ueckermünde",
        postal_code: "17373",
        country: "Deutschland",
        arrival_time: "09:00",
        activity_day2: "workshop_a",
        bbq_attendance: true,
        accommodation_needs: "Einzelzimmer gewünscht",
        dietary_requirements: "Vegetarisch",
        ucra_participants: 2,
        comments: "Freue mich auf die Veranstaltung",
        consent_privacy: true,
        consent_photos: true
      },
      transactionData: {
        price: 29000,
        currency: "EUR",
        breakdown: {
          basePrice: 29000,
          products: [{
            productId: "product_id_here",
            productName: "Symposium Ticket",
            quantity: 1,
            pricePerUnit: 29000,
            total: 29000
          }],
          subtotal: 29000,
          total: 29000
        }
      }
    }
  },
  {
    name: "Event Registration (External - Direct Payment)",
    data: {
      eventId: "ns73596xb9xmypy0g28pypyard7vcpv2",
      eventType: "haffsymposium_registration",
      formId: "form_id_here",
      products: [
        {
          productId: "product_id_here",
          quantity: 1
        }
      ],
      customerData: {
        email: "anna.schmidt@example.com",
        firstName: "Anna",
        lastName: "Schmidt",
        phone: "+49 987 654321",
        salutation: "Frau",
        organization: "Freiberuflich"
      },
      formResponses: {
        attendee_category: "external",
        salutation: "Frau",
        first_name: "Anna",
        last_name: "Schmidt",
        email: "anna.schmidt@example.com",
        phone: "+49 987 654321",
        profession: "Physiotherapeutin",
        organization: "Freiberuflich",
        street: "Berliner Str. 45",
        city: "Berlin",
        postal_code: "10115",
        country: "Deutschland",
        arrival_time: "10:00",
        bbq_attendance: false,
        dietary_requirements: "Keine",
        consent_privacy: true,
        consent_photos: false
      },
      transactionData: {
        price: 29000,
        currency: "EUR",
        breakdown: {
          basePrice: 29000,
          products: [{
            productId: "product_id_here",
            productName: "Symposium Ticket",
            quantity: 1,
            pricePerUnit: 29000,
            total: 29000
          }],
          subtotal: 29000,
          total: 29000
        }
      }
    }
  },
  {
    name: "Invalid Registration (Missing Email)",
    data: {
      eventId: "ns73596xb9xmypy0g28pypyard7vcpv2",
      eventType: "haffsymposium_registration",
      formId: "form_id_here",
      products: [
        {
          productId: "product_id_here",
          quantity: 1
        }
      ],
      customerData: {
        firstName: "Test",
        lastName: "User",
        salutation: "Herr"
      },
      formResponses: {
        attendee_category: "external",
        salutation: "Herr",
        first_name: "Test",
        last_name: "User",
        consent_privacy: true
      },
      transactionData: {
        price: 29000,
        currency: "EUR",
        breakdown: {
          basePrice: 29000,
          products: [{
            productId: "product_id_here",
            productName: "Symposium Ticket",
            quantity: 1,
            pricePerUnit: 29000,
            total: 29000
          }],
          subtotal: 29000,
          total: 29000
        }
      }
    }
  }
];

export function TestModePanel({
  sessionId,
  organizationId,
  onExecute,
  isExecuting,
  executionResults,
  onClose,
}: TestModePanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [testData, setTestData] = useState(JSON.stringify(SAMPLE_TEMPLATES[0].data, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);

  // Object selection for injecting real IDs into test data
  const [selectedEventId, setSelectedEventId] = useState<Id<"objects"> | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Array<{ productId: Id<"objects">; quantity: number }>>([]);
  const [selectedFormId, setSelectedFormId] = useState<Id<"objects"> | null>(null);
  const [selectedCrmOrgId, setSelectedCrmOrgId] = useState<Id<"objects"> | null>(null);

  // Query available objects
  const events = useQuery(api.eventOntology.getEvents, {
    sessionId,
    organizationId: organizationId as Id<"organizations">,
  });
  const products = useQuery(api.productOntology.getProducts, {
    sessionId,
    organizationId: organizationId as Id<"organizations">,
  });
  const forms = useQuery(api.formsOntology.getForms, {
    sessionId,
    organizationId: organizationId as Id<"organizations">,
  });
  const crmOrganizations = useQuery(api.crmOntology.getCrmOrganizations, {
    sessionId,
    organizationId: organizationId as Id<"organizations">,
  });

  const handleRun = () => {
    try {
      const parsed = JSON.parse(testData);
      setParseError(null);
      onExecute(parsed);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Invalid JSON");
    }
  };

  const handleLoadTemplate = (template: typeof SAMPLE_TEMPLATES[0]) => {
    setTestData(JSON.stringify(template.data, null, 2));
    setParseError(null);
  };

  // Inject selected IDs into test data when they change
  useEffect(() => {
    if (!selectedEventId && selectedProducts.length === 0 && !selectedFormId && !selectedCrmOrgId) return;

    try {
      const currentData = JSON.parse(testData);
      let updated = false;

      if (selectedEventId && currentData.eventId !== selectedEventId) {
        currentData.eventId = selectedEventId;
        updated = true;
      }

      if (selectedProducts.length > 0) {
        // Update products array (v2.0 format)
        currentData.products = selectedProducts;
        updated = true;

        // Also update in transactionData breakdown if it exists
        if (currentData.transactionData?.breakdown?.products && products) {
          currentData.transactionData.breakdown.products = selectedProducts.map((p) => {
            const product = products.find((prod) => prod._id === p.productId);
            return {
              productId: p.productId,
              productName: product?.name || "Unknown Product",
              quantity: p.quantity,
              pricePerUnit: 0, // Will be calculated
              total: 0, // Will be calculated
            };
          });
          updated = true;
        }
      }

      if (selectedFormId && currentData.formId !== selectedFormId) {
        currentData.formId = selectedFormId;
        updated = true;
      }

      if (selectedCrmOrgId && currentData.crmOrganizationId !== selectedCrmOrgId) {
        currentData.crmOrganizationId = selectedCrmOrgId;
        updated = true;
      }

      if (updated) {
        setTestData(JSON.stringify(currentData, null, 2));
      }
    } catch {
      // Invalid JSON, don't try to inject
    }
  }, [selectedEventId, selectedProducts, selectedFormId, selectedCrmOrgId, testData, products]);

  const handleClear = () => {
    setTestData("{\n  \n}");
    setParseError(null);
  };

  // Render step results helper function
  const renderStepResults = (): React.ReactNode => {
    if (!executionResults?.results) return null;

    return (executionResults.results as ExecutionResult[]).map((result, index) => {
      const typedResult = result as ExecutionResult;
      const resultOutput = typedResult.output ? JSON.stringify(typedResult.output as Record<string, unknown>, null, 2) : null;

      // Determine border and text color based on status
      const statusColor = typedResult.status === "success"
        ? "var(--success)"
        : typedResult.status === "error"
        ? "var(--error)"
        : "var(--win95-highlight)";

      return (
        <div
          key={index}
          className="p-3 rounded border-2"
          style={{
            background: "var(--win95-bg-light)",
            borderColor: statusColor
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
              {index + 1}. {typedResult.behaviorType}
            </span>
            <span className="text-xs opacity-60" style={{ color: "var(--neutral-gray)" }}>{typedResult.duration}ms</span>
          </div>

          {typedResult.status === "success" && (
            <p className="text-xs" style={{ color: "var(--success)" }}>✓ Completed successfully</p>
          )}

          {typedResult.status === "error" && typedResult.error && (
            <p className="text-xs" style={{ color: "var(--error)" }}>✗ {typedResult.error}</p>
          )}

          {resultOutput && (
            <details className="mt-2">
              <summary className="text-xs cursor-pointer hover:underline" style={{ color: "var(--win95-highlight)" }}>
                View Output
              </summary>
              <pre className="text-[10px] mt-1 p-2 rounded overflow-auto max-h-32" style={{ background: "var(--win95-bg)", color: "var(--win95-text)" }}>
                {resultOutput}
              </pre>
            </details>
          )}
        </div>
      );
    });
  };

  return (
    <div
      className="fixed left-0 right-0 border-t-4 shadow-2xl transition-all duration-300"
      style={{
        bottom: "40px", // Sits above the Windows 95 taskbar (taskbar height ~40px)
        zIndex: 9998, // Below taskbar (9999) but above everything else
        borderColor: "var(--win95-border)",
        background: "var(--win95-bg-light)",
        height: isExpanded ? "65vh" : "48px", // Increased from 50vh to 65vh for better visibility
      }}
    >
      {/* Header Bar */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b-2 cursor-pointer"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-highlight)" }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Play className="h-4 w-4 text-white" />
          <h3 className="text-sm font-bold text-white">TEST MODE</h3>
          {executionResults && (
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{
                background: executionResults.success ? "var(--success)" : "var(--error)",
                color: "white"
              }}
            >
              {executionResults.success ? "✓ Success" : "✗ Failed"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isExpanded && (
            <span className="text-xs text-white opacity-80">
              Click to expand test panel
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-white hover:bg-white/20 p-1 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-white hover:bg-white/20 p-1 rounded ml-1"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Panel Content */}
      {isExpanded && (
        <div className="flex overflow-hidden" style={{ height: "calc(65vh - 48px)" }}>
          {/* Left: Input Data Editor */}
          <div className="flex-1 flex flex-col border-r-2" style={{ borderColor: "var(--win95-border)" }}>
            <div className="border-b-2 px-4 py-2 flex-shrink-0" style={{ borderColor: "var(--win95-border)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileJson className="h-4 w-4" style={{ color: "var(--win95-highlight)" }} />
                  <h4 className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                    Input Data (JSON)
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  {/* Sample Templates Dropdown */}
                  <select
                    onChange={(e) => {
                      const template = SAMPLE_TEMPLATES[parseInt(e.target.value)];
                      if (template) handleLoadTemplate(template);
                    }}
                    className="retro-input text-xs px-2 py-1"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Load Sample...
                    </option>
                    {SAMPLE_TEMPLATES.map((template, index) => (
                      <option key={index} value={index}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleClear}
                    className="retro-button p-1"
                    title="Clear input"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Object Selectors for Test Data */}
            <div className="px-4 py-3 border-b-2 flex-shrink-0" style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}>
              <p className="text-[10px] font-bold mb-2 opacity-60" style={{ color: "var(--win95-text)" }}>
                SELECT TEST OBJECTS (IDs auto-inject into JSON)
              </p>
              <div className="grid grid-cols-3 gap-2">
                {/* Event Selector */}
                <div>
                  <label className="text-[10px] font-bold mb-1 block" style={{ color: "var(--win95-text)" }}>
                    Event:
                  </label>
                  <select
                    value={selectedEventId || ""}
                    onChange={(e) => setSelectedEventId(e.target.value ? e.target.value as Id<"objects"> : null)}
                    className="retro-input w-full text-xs px-2 py-1"
                  >
                    <option value="">Select event...</option>
                    {events?.map((event) => (
                      <option key={event._id} value={event._id}>
                        {event.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Form Selector */}
                <div>
                  <label className="text-[10px] font-bold mb-1 block" style={{ color: "var(--win95-text)" }}>
                    Form:
                  </label>
                  <select
                    value={selectedFormId || ""}
                    onChange={(e) => setSelectedFormId(e.target.value ? e.target.value as Id<"objects"> : null)}
                    className="retro-input w-full text-xs px-2 py-1"
                  >
                    <option value="">Select form...</option>
                    {forms?.map((form) => (
                      <option key={form._id} value={form._id}>
                        {form.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* CRM Organization Selector */}
                <div>
                  <label className="text-[10px] font-bold mb-1 block" style={{ color: "var(--win95-text)" }}>
                    CRM Org:
                  </label>
                  <select
                    value={selectedCrmOrgId || ""}
                    onChange={(e) => setSelectedCrmOrgId(e.target.value ? e.target.value as Id<"objects"> : null)}
                    className="retro-input w-full text-xs px-2 py-1"
                  >
                    <option value="">Select CRM org...</option>
                    {crmOrganizations?.map((org) => (
                      <option key={org._id} value={org._id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Multi-Product Selector */}
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold" style={{ color: "var(--win95-text)" }}>
                    Products (Multiple):
                  </label>
                  <button
                    onClick={() => {
                      if (products && products.length > 0) {
                        setSelectedProducts([...selectedProducts, { productId: products[0]._id, quantity: 1 }]);
                      }
                    }}
                    className="retro-button text-xs px-2 py-1"
                    disabled={!products || products.length === 0}
                  >
                    + Add Product
                  </button>
                </div>

                {selectedProducts.length === 0 ? (
                  <p className="text-[10px] opacity-60 italic" style={{ color: "var(--win95-text)" }}>
                    No products selected. Click &quot;Add Product&quot; to add.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedProducts.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={p.productId}
                          onChange={(e) => {
                            const newProducts = [...selectedProducts];
                            newProducts[idx].productId = e.target.value as Id<"objects">;
                            setSelectedProducts(newProducts);
                          }}
                          className="retro-input flex-1 text-xs px-2 py-1"
                        >
                          {products?.map((product) => (
                            <option key={product._id} value={product._id}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="1"
                          value={p.quantity}
                          onChange={(e) => {
                            const newProducts = [...selectedProducts];
                            newProducts[idx].quantity = parseInt(e.target.value) || 1;
                            setSelectedProducts(newProducts);
                          }}
                          className="retro-input w-16 text-xs px-2 py-1 text-center"
                          placeholder="Qty"
                        />
                        <button
                          onClick={() => {
                            const newProducts = selectedProducts.filter((_, i) => i !== idx);
                            setSelectedProducts(newProducts);
                          }}
                          className="retro-button text-xs px-2 py-1 hover:bg-red-100"
                          title="Remove product"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* JSON Editor - fills entire available space */}
            <div className="flex-1 p-4 flex flex-col" style={{ minHeight: 0 }}>
              <textarea
                value={testData}
                onChange={(e) => {
                  setTestData(e.target.value);
                  setParseError(null);
                }}
                className="retro-input w-full flex-1 font-mono text-xs p-3 resize-none"
                placeholder='{\n  "email": "test@example.com",\n  "name": "John Doe"\n}'
                spellCheck={false}
              />
              {parseError && (
                <div className="mt-2 p-2 border-2 rounded flex-shrink-0" style={{ background: "var(--win95-bg-light)", borderColor: "var(--error)" }}>
                  <p className="text-xs font-bold" style={{ color: "var(--error)" }}>JSON Parse Error:</p>
                  <p className="text-xs" style={{ color: "var(--error)" }}>{parseError}</p>
                </div>
              )}
            </div>

            {/* Execute Button - ALWAYS VISIBLE AT BOTTOM */}
            <div className="border-t-2 p-3 flex-shrink-0" style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}>
              <button
                onClick={handleRun}
                disabled={isExecuting || !!parseError}
                className="retro-button-primary w-full py-2 flex items-center justify-center gap-2 font-bold disabled:opacity-50"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running Test...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run Test
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Execution Results */}
          <div className="w-1/2 flex flex-col">
            <div className="border-b-2 px-4 py-2 flex-shrink-0" style={{ borderColor: "var(--win95-border)" }}>
              <h4 className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                Execution Log
              </h4>
            </div>

            <div className="flex-1 overflow-auto p-4" style={{ minHeight: 0 }}>
              {!executionResults ? (
                <div className="text-center py-8">
                  <Play className="h-12 w-12 mx-auto mb-2" style={{ color: "var(--neutral-gray)", opacity: 0.3 }} />
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    Click "Run Test" to execute the workflow
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Overall Status */}
                  <div
                    className="p-3 rounded border-2"
                    style={{
                      background: "var(--win95-bg-light)",
                      borderColor: executionResults.success ? "var(--success)" : "var(--error)"
                    }}
                  >
                    <p className="text-xs font-bold mb-1" style={{ color: executionResults.success ? "var(--success)" : "var(--error)" }}>
                      {executionResults.success ? "✓ Execution Successful" : "✗ Execution Failed"}
                    </p>
                    {executionResults.message && (
                      <p className="text-xs opacity-80" style={{ color: "var(--win95-text)" }}>{executionResults.message}</p>
                    )}
                  </div>

                  {/* Step Results */}
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {renderStepResults() as any}

                  {/* Final Output */}
                  {executionResults.finalOutput && (
                    <div className="p-3 rounded border-2" style={{ background: "var(--win95-bg-light)", borderColor: "var(--win95-highlight)" }}>
                      <p className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>Final Output:</p>
                      <pre className="text-[10px] p-2 rounded overflow-auto max-h-32" style={{ background: "var(--win95-bg)", color: "var(--win95-text)" }}>
                        {JSON.stringify(executionResults.finalOutput as Record<string, unknown>, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
