/**
 * CLIENT-SIDE TEMPLATE RENDERER
 *
 * Simple template engine for rendering PDF invoice templates in the browser.
 * Supports Jinja2-like syntax used by API Template.io:
 * - {{variable}} - Variable substitution
 * - {%if condition%}...{%endif%} - Conditionals
 * - {%for item in items%}...{%endfor%} - Loops
 * - {{ '%0.2f' % (value / 100) }} - Python-style number formatting
 *
 * This is for PREVIEW ONLY. Production PDFs are rendered by API Template.io.
 */

// Import translations for mock preview data
const MOCK_TRANSLATIONS = {
  en: {
    invoice: "INVOICE",
    from: "From:",
    billTo: "Bill To:",
    itemDescription: "Item Description",
    quantity: "Quantity",
    qty: "Qty",
    unitPrice: "Unit Price",
    price: "Price",
    net: "Net",
    vat: "VAT",
    total: "Total",
    gross: "Gross",
    subtotal: "Subtotal",
    tax: "Tax",
    paymentTerms: "Payment Terms",
    terms: "Terms:",
    method: "Method:",
    dueDate: "Due Date",
    thankYou: "Thank you for your business!",
    paymentDue: "Payment is due by",
    latePayment: "Late payments may incur additional fees.",
    contactUs: "or",
    forQuestions: "For questions regarding this invoice, please contact us at",
    invoiceNumber: "Invoice #:",
    date: "Date:",
    due: "Due:",
    attention: "Attn:",
  },
};

export interface TemplateData {
  [key: string]: string | number | boolean | object | Array<unknown> | undefined;
}

/**
 * Render a template string with data
 */
export function renderTemplate(template: string, data: TemplateData): string {
  let rendered = template;

  // 1. Handle FOR loops
  rendered = renderForLoops(rendered, data);

  // 2. Handle IF conditionals
  rendered = renderIfConditionals(rendered, data);

  // 3. Handle variable substitution with Python-style formatting
  rendered = renderVariables(rendered, data);

  return rendered;
}

/**
 * Render FOR loops: {%for item in items%}...{%endfor%}
 */
function renderForLoops(template: string, data: TemplateData): string {
  const forPattern = /{%for\s+(\w+)\s+in\s+(\w+)%}([\s\S]*?){%endfor%}/g;

  return template.replace(forPattern, (match, itemName, arrayName, content) => {
    const array = data[arrayName];

    if (!Array.isArray(array)) {
      return ""; // Array not found, remove loop
    }

    // Render content for each item
    return array
      .map((item) => {
        // Create new context with loop item
        const loopData = { ...data, [itemName]: item };
        // Recursively render the loop content
        return renderVariables(content, loopData);
      })
      .join("");
  });
}

/**
 * Render IF conditionals: {%if condition%}...{%else%}...{%endif%}
 */
function renderIfConditionals(template: string, data: TemplateData): string {
  // Handle if-else
  const ifElsePattern = /{%if\s+(\w+(?:\.\w+)*)%}([\s\S]*?){%else%}([\s\S]*?){%endif%}/g;
  template = template.replace(ifElsePattern, (match, condition, ifContent, elseContent) => {
    const value = getNestedValue(data, condition);
    return value ? ifContent : elseContent;
  });

  // Handle if-only (no else)
  const ifPattern = /{%if\s+(\w+(?:\.\w+)*)%}([\s\S]*?){%endif%}/g;
  template = template.replace(ifPattern, (match, condition, content) => {
    const value = getNestedValue(data, condition);
    return value ? content : "";
  });

  return template;
}

/**
 * Render variables: {{variable}} or {{ '%0.2f' % (value / 100) }}
 */
function renderVariables(template: string, data: TemplateData): string {
  // Handle Python-style formatting: {{ '%0.2f' % (expression) }}
  const formatPattern = /{{\s*'%0\.(\d+)f'\s*%\s*\(([^)]+)\)\s*}}/g;
  template = template.replace(formatPattern, (match, decimals, expression) => {
    try {
      const value = evaluateExpression(expression, data);
      return typeof value === "number" ? value.toFixed(parseInt(decimals)) : String(value);
    } catch (error) {
      console.error("Error evaluating format expression:", expression, error);
      return "0.00";
    }
  });

  // Handle simple variables: {{variable}} or {{object.property}}
  const varPattern = /{{\s*([^}]+?)\s*}}/g;
  template = template.replace(varPattern, (match, path) => {
    // Skip if it's already been processed (contains Python formatting)
    if (path.includes("%") || path.includes("'%")) {
      return match;
    }

    const value = getNestedValue(data, path.trim());
    return value !== undefined && value !== null ? String(value) : "";
  });

  return template;
}

/**
 * Get nested value from object using dot notation
 * Example: "bill_to.company_name" -> data.bill_to.company_name
 */
function getNestedValue(obj: TemplateData, path: string): unknown {
  return path.split(".").reduce((current: any, key: string) => {
    return current?.[key];
  }, obj);
}

/**
 * Evaluate simple expressions like "value / 100" or "value * quantity"
 */
function evaluateExpression(expression: string, data: TemplateData): number {
  // Replace variable references with their values
  let evaluated = expression;

  // Find all variable references (words that aren't operators)
  const variables = expression.match(/[a-zA-Z_][a-zA-Z0-9_.]*/g) || [];

  variables.forEach((variable) => {
    const value = getNestedValue(data, variable);
    if (typeof value === "number") {
      evaluated = evaluated.replace(new RegExp(variable, "g"), String(value));
    }
  });

  // Safely evaluate the mathematical expression
  try {
    // Only allow basic math operations for security
    if (!/^[\d\s+*/().\-]+$/.test(evaluated)) {
      throw new Error("Invalid expression");
    }
     
    return eval(evaluated);
  } catch (error) {
    console.error("Error evaluating expression:", evaluated, error);
    return 0;
  }
}

/**
 * Create mock invoice data for PDF template preview
 */
export function createMockInvoiceData(templateCode: string): TemplateData {
  // Preview always uses English translations
  const mockLanguage = "en";
  const translations = MOCK_TRANSLATIONS[mockLanguage];

  const baseData = {
    // Organization (seller)
    organization_name: "Acme Medical Institute",
    organization_address: "456 Provider Street, New York, NY 10001",
    organization_phone: "(555) 123-4567",
    organization_email: "billing@acme-medical.org",
    logo_url: undefined, // No logo for mock preview
    highlight_color: "#6B46C1",

    // Invoice details
    invoice_number: "INV-2025-001234",
    invoice_date: "January 15, 2025",
    due_date: "February 14, 2025",

    // Currency
    currency: "€",

    // Payment
    payment_method: "Stripe",
    payment_terms: "NET30",

    // Language
    language: mockLanguage,

    // Translation strings (all text labels) - prefixed with t_
    t_invoice: translations.invoice,
    t_from: translations.from,
    t_billTo: translations.billTo,
    t_itemDescription: translations.itemDescription,
    t_quantity: translations.quantity,
    t_qty: translations.qty,
    t_unitPrice: translations.unitPrice,
    t_price: translations.price,
    t_net: translations.net,
    t_vat: translations.vat,
    t_total: translations.total,
    t_gross: translations.gross,
    t_subtotal: translations.subtotal,
    t_tax: translations.tax,
    t_paymentTerms: translations.paymentTerms,
    t_terms: translations.terms,
    t_method: translations.method,
    t_dueDate: translations.dueDate,
    t_thankYou: translations.thankYou,
    t_paymentDue: translations.paymentDue,
    t_latePayment: translations.latePayment,
    t_contactUs: translations.contactUs,
    t_forQuestions: translations.forQuestions,
    t_invoiceNumber: translations.invoiceNumber,
    t_date: translations.date,
    t_due: translations.due,
    t_attention: translations.attention,
  };

  // B2B-specific data
  if (templateCode.includes("b2b")) {
    return {
      ...baseData,

      // Bill To (customer)
      bill_to: {
        company_name: "ABC Medical School",
        contact_name: "Dr. John Smith",
        address: "123 University Avenue",
        city: "Boston",
        state: "MA",
        zip_code: "02115",
        vat_number: "DE123456789",
      },

      // Line items with VAT
      items: [
        {
          description: "VIP Conference Registration",
          quantity: 1,
          unit_price: 6639, // Net: €66.39 in cents
          tax_amount: 1261, // VAT: €12.61 in cents
          total_price: 7900, // Gross: €79.00 in cents
          tax_rate: 19,
        },
        {
          description: "Workshop: Advanced Diagnostics",
          quantity: 2,
          unit_price: 4202, // Net: €42.02 in cents
          tax_amount: 798, // VAT: €7.98 in cents
          total_price: 5000, // Gross: €50.00 in cents
          tax_rate: 19,
        },
      ],

      // Totals (in cents)
      subtotal: 15043, // Net: €150.43
      tax_rate: 19,
      tax: 2857, // VAT: €28.57
      total: 17900, // Gross: €179.00
    };
  }

  // B2C data
  return {
    ...baseData,

    customer_name: "John Doe",
    customer_email: "john.doe@example.com",

    // Line items
    items: [
      {
        description: "Event Ticket - General Admission",
        quantity: 2,
        unit_price: 2500, // €25.00 in cents
        tax_amount: 475, // €4.75 in cents
        total_price: 2975, // €29.75 in cents
        tax_rate: 19,
      },
    ],

    // Totals (in cents)
    subtotal: 5000, // Net: €50.00
    tax_rate: 19,
    tax: 950, // VAT: €9.50
    total: 5950, // Gross: €59.50
  };
}

/**
 * Create mock ticket data for preview
 */
export function createMockTicketData(_templateCode: string): TemplateData {
  const baseData = {
    // Organization (seller/organizer)
    organization_name: "L4YERCAK3 Events",
    organization_address: "123 Event Plaza, New York, NY 10001",
    organization_phone: "(555) 123-4567",
    organization_email: "tickets@l4yercak3.com",
    organization_website: "https://l4yercak3.com",
    logo_url: undefined, // No logo for mock preview
    highlight_color: "#d4af37", // Gold

    // Event details
    event_name: "Exclusive VIP Gala 2025",
    event_date: "Saturday, January 25, 2025",
    event_time: "7:00 PM - 11:00 PM",
    event_location: "Grand Ballroom",
    event_address: "456 Luxury Avenue, New York, NY 10022",
    event_sponsors: [
      { name: "Premium Sponsor Co.", level: "Platinum" },
      { name: "Gold Partner LLC", level: "Gold" },
    ],

    // Ticket details
    ticket_number: "TKT-2025-001234",
    ticket_type: "VIP Access",

    // Attendee details
    attendee_name: "John Doe",
    attendee_email: "john.doe@example.com",
    guest_count: 2,

    // QR Code data (URL-encoded verification URL)
    qr_code_data: encodeURIComponent("https://l4yercak3.com/verify/TKT-2025-001234"),

    // Additional metadata
    order_id: "ORD-2025-5678",
    purchase_date: "January 10, 2025",
    price_paid: "$79.00",
  };

  return baseData;
}
