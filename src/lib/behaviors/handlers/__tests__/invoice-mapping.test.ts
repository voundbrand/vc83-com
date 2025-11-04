/**
 * Tests for Invoice Mapping Behavior
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  invoiceMappingHandler,
  createInvoiceMappingFromLegacyConfig,
  createCheckoutInvoiceMapping,
  createAPIInvoiceMapping,
  type InvoiceMappingConfig,
} from "../invoice-mapping";
import type { InputSource, BehaviorContext } from "../../types";
import type { Id } from "../../../../../convex/_generated/dataModel";

describe("Invoice Mapping Behavior", () => {
  let context: BehaviorContext;

  beforeEach(() => {
    context = {
      organizationId: "test-org" as Id<"organizations">,
      sessionId: "test-session",
      workflow: "checkout",
      objects: [
        {
          objectId: "product-1" as Id<"objects">,
          objectType: "product",
          quantity: 1,
        },
      ],
    };
  });

  describe("extract", () => {
    it("should extract organization from form input", () => {
      const config: InvoiceMappingConfig = {
        organizationSourceField: "employer",
        organizationMapping: {
          "Acme Corp": "org-123",
        },
      };

      const inputs: InputSource[] = [
        {
          type: "form",
          data: {
            employer: "Acme Corp",
            email: "user@example.com",
          },
          metadata: {
            timestamp: Date.now(),
          },
        },
      ];

      const extracted = invoiceMappingHandler.extract(config, inputs, context);

      expect(extracted).not.toBeNull();
      expect(extracted?.organizationValue).toBe("Acme Corp");
      expect(extracted?.crmOrganizationId).toBe("org-123");
    });

    it("should extract organization from API input", () => {
      const config: InvoiceMappingConfig = {
        organizationSourceField: "company_id",
        organizationMapping: {
          "12345": "org-abc",
        },
      };

      const inputs: InputSource[] = [
        {
          type: "api",
          data: {
            company_id: 12345,
            amount: 100,
          },
          metadata: {
            timestamp: Date.now(),
          },
        },
      ];

      const extracted = invoiceMappingHandler.extract(config, inputs, context);

      expect(extracted).not.toBeNull();
      expect(extracted?.organizationValue).toBe("12345");
      expect(extracted?.crmOrganizationId).toBe("org-abc");
    });

    it("should extract organization from agent decision", () => {
      const config: InvoiceMappingConfig = {
        organizationSourceField: "selected_organization",
        organizationMapping: {
          "Tech Corp": "org-tech",
        },
      };

      const inputs: InputSource[] = [
        {
          type: "agent_decision",
          data: {
            selected_organization: "Tech Corp",
            reasoning: "User works at Tech Corp",
          },
          metadata: {
            timestamp: Date.now(),
          },
        },
      ];

      const extracted = invoiceMappingHandler.extract(config, inputs, context);

      expect(extracted).not.toBeNull();
      expect(extracted?.organizationValue).toBe("Tech Corp");
      expect(extracted?.crmOrganizationId).toBe("org-tech");
    });

    it("should handle null organization value", () => {
      const config: InvoiceMappingConfig = {
        organizationSourceField: "employer",
        organizationMapping: {
          null: "individual-org",
        },
      };

      const inputs: InputSource[] = [
        {
          type: "form",
          data: {
            employer: null,
          },
          metadata: {
            timestamp: Date.now(),
          },
        },
      ];

      const extracted = invoiceMappingHandler.extract(config, inputs, context);

      expect(extracted).not.toBeNull();
      expect(extracted?.organizationValue).toBeNull();
      expect(extracted?.crmOrganizationId).toBe("individual-org");
    });

    it("should return null when field not found in any input", () => {
      const config: InvoiceMappingConfig = {
        organizationSourceField: "employer",
        organizationMapping: {},
      };

      const inputs: InputSource[] = [
        {
          type: "form",
          data: {
            email: "user@example.com",
          },
          metadata: {
            timestamp: Date.now(),
          },
        },
      ];

      const extracted = invoiceMappingHandler.extract(config, inputs, context);

      expect(extracted).toBeNull();
    });

    it("should extract additional invoice data when field mapping provided", () => {
      const config: InvoiceMappingConfig = {
        organizationSourceField: "company",
        organizationMapping: {
          "Acme": "org-acme",
        },
        invoiceFieldMapping: {
          customer_email: "email",
          customer_name: "name",
          po_number: "poNumber",
        },
      };

      const inputs: InputSource[] = [
        {
          type: "api",
          data: {
            company: "Acme",
            customer_email: "user@acme.com",
            customer_name: "John Doe",
            po_number: "PO-12345",
          },
          metadata: {
            timestamp: Date.now(),
          },
        },
      ];

      const extracted = invoiceMappingHandler.extract(config, inputs, context);

      expect(extracted?.additionalData).toEqual({
        email: "user@acme.com",
        name: "John Doe",
        poNumber: "PO-12345",
      });
    });
  });

  describe("apply", () => {
    it("should create invoice action with mapped organization", async () => {
      const config: InvoiceMappingConfig = {
        organizationSourceField: "employer",
        organizationMapping: {
          "Acme Corp": "org-123",
        },
        defaultPaymentTerms: "net30",
      };

      const extracted = {
        organizationValue: "Acme Corp",
        crmOrganizationId: "org-123",
        inputSource: {
          type: "form" as const,
          data: {},
          metadata: { timestamp: Date.now() },
        },
      };

      const result = await invoiceMappingHandler.apply(config, extracted, context);

      expect(result.success).toBe(true);
      expect(result.data?.crmOrganizationId).toBe("org-123");
      expect(result.data?.templateId).toBe("b2b_consolidated"); // Default template
      expect(result.data?.paymentTerms).toBe("net30");
      expect(result.data?.mappingSource).toBe("explicit");
      expect(result.actions).toHaveLength(1);
      expect(result.actions?.[0].type).toBe("create_invoice");
      expect(result.actions?.[0].when).toBe("deferred");
    });

    it("should fail when mapping required but not found", async () => {
      const config: InvoiceMappingConfig = {
        organizationSourceField: "employer",
        organizationMapping: {},
        requireMapping: true,
      };

      const extracted = {
        organizationValue: "Unknown Corp",
        crmOrganizationId: null,
        inputSource: {
          type: "form" as const,
          data: {},
          metadata: { timestamp: Date.now() },
        },
      };

      const result = await invoiceMappingHandler.apply(config, extracted, context);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]).toContain("No CRM organization mapping found");
    });

    it("should skip when mapping not required and not found", async () => {
      const config: InvoiceMappingConfig = {
        organizationSourceField: "employer",
        organizationMapping: {},
        requireMapping: false,
      };

      const extracted = {
        organizationValue: "Unknown Corp",
        crmOrganizationId: null,
        inputSource: {
          type: "form" as const,
          data: {},
          metadata: { timestamp: Date.now() },
        },
      };

      const result = await invoiceMappingHandler.apply(config, extracted, context);

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.warnings).toBeDefined();
    });

    it("should update context with invoice mapping data", async () => {
      const config: InvoiceMappingConfig = {
        organizationSourceField: "employer",
        organizationMapping: {
          "Acme Corp": "org-123",
        },
        defaultPaymentTerms: "net60",
      };

      const extracted = {
        organizationValue: "Acme Corp",
        crmOrganizationId: "org-123",
        inputSource: {
          type: "form" as const,
          data: {},
          metadata: { timestamp: Date.now() },
        },
      };

      const result = await invoiceMappingHandler.apply(config, extracted, context);

      expect(result.modifiedContext?.workflowData?.billingOrganizationId).toBe(
        "org-123"
      );
      expect(result.modifiedContext?.workflowData?.invoicePaymentTerms).toBe(
        "net60"
      );
      expect(result.modifiedContext?.behaviorData?.invoice_mapping).toBeDefined();
    });

    it("should use default payment terms when not specified", async () => {
      const config: InvoiceMappingConfig = {
        organizationSourceField: "employer",
        organizationMapping: {
          "Acme": "org-acme",
        },
      };

      const extracted = {
        organizationValue: "Acme",
        crmOrganizationId: "org-acme",
        inputSource: {
          type: "form" as const,
          data: {},
          metadata: { timestamp: Date.now() },
        },
      };

      const result = await invoiceMappingHandler.apply(config, extracted, context);

      expect(result.data?.paymentTerms).toBe("net30");
    });
  });

  describe("validate", () => {
    it("should pass validation for valid config", () => {
      const config: InvoiceMappingConfig = {
        organizationSourceField: "employer",
        organizationMapping: {
          "Acme Corp": "org-123",
        },
      };

      const errors = invoiceMappingHandler.validate(config);

      expect(errors).toHaveLength(0);
    });

    it("should fail when organizationSourceField missing", () => {
      const config = {
        organizationMapping: {},
      } as InvoiceMappingConfig;

      const errors = invoiceMappingHandler.validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.field === "organizationSourceField")).toBe(true);
    });

    it("should fail when organizationMapping missing", () => {
      const config = {
        organizationSourceField: "employer",
      } as InvoiceMappingConfig;

      const errors = invoiceMappingHandler.validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.field === "organizationMapping")).toBe(true);
    });

    it("should fail when organizationMapping is empty", () => {
      const config: InvoiceMappingConfig = {
        organizationSourceField: "employer",
        organizationMapping: {},
      };

      const errors = invoiceMappingHandler.validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.code === "empty")).toBe(true);
    });

    it("should fail when payment terms invalid", () => {
      const config = {
        organizationSourceField: "employer",
        organizationMapping: { test: "org" },
        defaultPaymentTerms: "invalid" as unknown,
      } as InvoiceMappingConfig;

      const errors = invoiceMappingHandler.validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.field === "defaultPaymentTerms")).toBe(true);
    });
  });

  describe("helper functions", () => {
    it("should convert legacy config to invoice mapping", () => {
      const legacyConfig = {
        employerSourceField: "employer",
        employerMapping: {
          "Acme Corp": "org-123",
          null: "individual-org",
        },
        defaultPaymentTerms: "net60" as const,
      };

      const config = createInvoiceMappingFromLegacyConfig(legacyConfig);

      expect(config.organizationSourceField).toBe("employer");
      expect(config.organizationMapping).toEqual(legacyConfig.employerMapping);
      expect(config.defaultPaymentTerms).toBe("net60");
      expect(config.requireMapping).toBe(false);
    });

    it("should create checkout invoice mapping", () => {
      const config = createCheckoutInvoiceMapping("employer", {
        "Acme": "org-acme",
        "Tech Corp": "org-tech",
      });

      expect(config.organizationSourceField).toBe("employer");
      expect(config.organizationMapping).toEqual({
        "Acme": "org-acme",
        "Tech Corp": "org-tech",
      });
      expect(config.defaultPaymentTerms).toBe("net30");
      expect(config.requireMapping).toBe(true);
    });

    it("should create API invoice mapping", () => {
      const config = createAPIInvoiceMapping("org_id", "net90");

      expect(config.organizationSourceField).toBe("org_id");
      expect(config.defaultPaymentTerms).toBe("net90");
      expect(config.requireMapping).toBe(false);
      expect(config.invoiceFieldMapping).toBeDefined();
    });
  });
});
