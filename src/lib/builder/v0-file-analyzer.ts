/**
 * V0 FILE ANALYZER
 *
 * Scans v0-generated React source files to detect UI elements
 * that can be wired to backend records (forms, contacts, products,
 * bookings, tickets, invoices, checkout).
 *
 * Returns SectionConnection[] matching the builder-context types
 * so the ConnectionPanel renders them directly.
 */

import type { SectionConnection, DetectedItem } from "@/contexts/builder-context";

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Analyze v0-generated files for connectable UI elements.
 * Groups results by file — each file with detected items becomes a section.
 */
export function analyzeV0FilesForConnections(
  files: Array<{ path: string; content: string }>
): SectionConnection[] {
  const sections: SectionConnection[] = [];
  let itemCounter = 0;

  for (const file of files) {
    // Only scan component/page files
    if (!isComponentFile(file.path)) continue;

    const items: DetectedItem[] = [];

    // Detect forms
    const formDetections = detectForms(file);
    for (const detection of formDetections) {
      items.push({
        id: `detected_${++itemCounter}`,
        type: "form",
        placeholderData: {
          name: detection.name,
          description: detection.description,
        },
        existingMatches: [],
        connectionChoice: null,
        linkedRecordId: null,
        createdRecordId: null,
      });
    }

    // Detect team/contact sections
    const contactDetections = detectContacts(file);
    for (const detection of contactDetections) {
      items.push({
        id: `detected_${++itemCounter}`,
        type: "contact",
        placeholderData: {
          name: detection.name,
          email: detection.email,
          description: detection.role,
        },
        existingMatches: [],
        connectionChoice: null,
        linkedRecordId: null,
        createdRecordId: null,
      });
    }

    // Detect pricing/product sections
    const productDetections = detectProducts(file);
    for (const detection of productDetections) {
      items.push({
        id: `detected_${++itemCounter}`,
        type: "product",
        placeholderData: {
          name: detection.name,
          price: detection.price,
          description: detection.description,
        },
        existingMatches: [],
        connectionChoice: null,
        linkedRecordId: null,
        createdRecordId: null,
      });
    }

    // Detect booking/calendar UI
    const bookingDetections = detectBookings(file);
    for (const detection of bookingDetections) {
      items.push({
        id: `detected_${++itemCounter}`,
        type: "booking",
        placeholderData: { name: detection.name, description: detection.description },
        existingMatches: [],
        connectionChoice: null,
        linkedRecordId: null,
        createdRecordId: null,
      });
    }

    // Detect ticket/admission UI
    const ticketDetections = detectTickets(file);
    for (const detection of ticketDetections) {
      items.push({
        id: `detected_${++itemCounter}`,
        type: "ticket",
        placeholderData: { name: detection.name, description: detection.description },
        existingMatches: [],
        connectionChoice: null,
        linkedRecordId: null,
        createdRecordId: null,
      });
    }

    // Detect invoice/billing UI
    const invoiceDetections = detectInvoices(file);
    for (const detection of invoiceDetections) {
      items.push({
        id: `detected_${++itemCounter}`,
        type: "invoice",
        placeholderData: { name: detection.name, description: detection.description },
        existingMatches: [],
        connectionChoice: null,
        linkedRecordId: null,
        createdRecordId: null,
      });
    }

    // Detect checkout/cart UI
    const checkoutDetections = detectCheckout(file);
    for (const detection of checkoutDetections) {
      items.push({
        id: `detected_${++itemCounter}`,
        type: "checkout",
        placeholderData: { name: detection.name, description: detection.description },
        existingMatches: [],
        connectionChoice: null,
        linkedRecordId: null,
        createdRecordId: null,
      });
    }

    // Detect conversation/chat UI
    const conversationDetections = detectConversations(file);
    for (const detection of conversationDetections) {
      items.push({
        id: `detected_${++itemCounter}`,
        type: "conversation",
        placeholderData: { name: detection.name, description: detection.description },
        existingMatches: [],
        connectionChoice: null,
        linkedRecordId: null,
        createdRecordId: null,
      });
    }

    if (items.length > 0) {
      const sectionType = inferSectionType(items);
      const label = inferSectionLabel(file.path, sectionType, items);

      sections.push({
        sectionId: `file:${file.path}`,
        sectionType,
        sectionLabel: label,
        detectedItems: items,
        connectionStatus: "pending",
      });
    }
  }

  return sections;
}

// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================

interface SimpleDetection {
  name: string;
  description?: string;
}

interface FormDetection {
  name: string;
  description?: string;
}

function detectForms(file: { path: string; content: string }): FormDetection[] {
  const results: FormDetection[] = [];
  const content = file.content;

  // Check for <form> tags or form-related handlers
  const hasFormTag = /<form[\s>]/i.test(content);
  const hasSubmitHandler = /onSubmit|handleSubmit|action=/i.test(content);

  // Check for form-related component names in exports
  const formComponentMatch = content.match(
    /export\s+(?:default\s+)?function\s+(\w*(?:Form|Contact|Register|Signup|Subscribe|Newsletter)\w*)/i
  );

  // Count input elements — 3+ inputs in a file suggests a form
  const inputCount = (content.match(/<(?:input|textarea|select)[\s>]/gi) || []).length;
  const hasMultipleInputs = inputCount >= 3;

  if (hasFormTag || hasSubmitHandler || formComponentMatch || hasMultipleInputs) {
    const name =
      formComponentMatch?.[1] ||
      extractComponentName(file.path) ||
      "Form";

    // Convert PascalCase to readable: "ContactForm" → "Contact Form"
    const readableName = name.replace(/([a-z])([A-Z])/g, "$1 $2");

    results.push({
      name: readableName,
      description: `Detected in ${file.path}${inputCount > 0 ? ` (${inputCount} input fields)` : ""}`,
    });
  }

  return results;
}

interface ContactDetection {
  name: string;
  email?: string;
  role?: string;
}

function detectContacts(file: { path: string; content: string }): ContactDetection[] {
  const results: ContactDetection[] = [];
  const content = file.content;

  // Look for team/member data arrays
  const teamVarPattern = /(?:const|let|var)\s+(team|members|staff|contacts|people)\s*=\s*\[/i;
  const hasTeamArray = teamVarPattern.test(content);

  if (!hasTeamArray) return results;

  // Try to extract individual entries from the array
  // Match objects with name + (email | role | title | position)
  const objectPattern = /\{\s*(?:[^}]*?)name\s*:\s*["']([^"']+)["'](?:[^}]*?)(?:email\s*:\s*["']([^"']+)["'])?(?:[^}]*?)(?:(?:role|title|position)\s*:\s*["']([^"']+)["'])?[^}]*\}/gi;

  let match;
  while ((match = objectPattern.exec(content)) !== null) {
    results.push({
      name: match[1],
      email: match[2] || undefined,
      role: match[3] || undefined,
    });
  }

  return results;
}

interface ProductDetection {
  name: string;
  price?: string;
  description?: string;
}

function detectProducts(file: { path: string; content: string }): ProductDetection[] {
  const results: ProductDetection[] = [];
  const content = file.content;

  // Look for pricing/plan data arrays
  const pricingVarPattern = /(?:const|let|var)\s+(plans|pricing|tiers|packages|products)\s*=\s*\[/i;
  const hasPricingArray = pricingVarPattern.test(content);

  if (!hasPricingArray) return results;

  // Extract pricing tier objects with name + price
  const tierPattern = /\{\s*(?:[^}]*?)name\s*:\s*["']([^"']+)["'](?:[^}]*?)(?:price\s*:\s*["']?([^"',}]+)["']?)?(?:[^}]*?)(?:description\s*:\s*["']([^"']+)["'])?[^}]*\}/gi;

  let match;
  while ((match = tierPattern.exec(content)) !== null) {
    results.push({
      name: match[1],
      price: match[2]?.trim() || undefined,
      description: match[3] || undefined,
    });
  }

  return results;
}

function detectBookings(file: { path: string; content: string }): SimpleDetection[] {
  const content = file.content;
  const hasCalendarUI = /calendar|datepicker|date-picker|availability|time.?slot|booking/i.test(content);
  const hasTimeSlots = /(?:const|let|var)\s+(?:slots|timeSlots|availability|schedule)\s*=/i.test(content);
  if (!hasCalendarUI && !hasTimeSlots) return [];
  const name = extractComponentName(file.path) || "Booking";
  return [{ name: name.replace(/([a-z])([A-Z])/g, "$1 $2"), description: `Detected in ${file.path}` }];
}

function detectTickets(file: { path: string; content: string }): SimpleDetection[] {
  const content = file.content;
  const hasTicketUI = /ticket|admission|qr.?code|check.?in|pass|barcode/i.test(content);
  // Avoid false positives from generic words like "pass" in other contexts
  const hasTicketComponent = /(?:const|let|var)\s+(?:tickets|passes|admissions)\s*=/i.test(content);
  if (!hasTicketUI && !hasTicketComponent) return [];
  // Only count if we have strong signals (component name or data array)
  const componentName = extractComponentName(file.path) || "Ticket";
  if (!hasTicketComponent && !/(Ticket|Admission|CheckIn|Pass)/i.test(componentName)) return [];
  return [{ name: componentName.replace(/([a-z])([A-Z])/g, "$1 $2"), description: `Detected in ${file.path}` }];
}

function detectInvoices(file: { path: string; content: string }): SimpleDetection[] {
  const content = file.content;
  const hasInvoiceUI = /invoice|billing|line.?item|subtotal|due.?date|payment.?status/i.test(content);
  const hasTableOrList = /<table|<thead|<tbody/i.test(content);
  // Need both invoice keywords AND tabular display
  if (!hasInvoiceUI || !hasTableOrList) return [];
  const name = extractComponentName(file.path) || "Invoice";
  return [{ name: name.replace(/([a-z])([A-Z])/g, "$1 $2"), description: `Detected in ${file.path}` }];
}

function detectCheckout(file: { path: string; content: string }): SimpleDetection[] {
  const content = file.content;
  const hasCheckoutUI = /checkout|shopping.?cart|order.?summary|add.?to.?cart|payment.?form/i.test(content);
  const hasCartData = /(?:const|let|var)\s+(?:cart|cartItems|orderItems|checkoutItems)\s*=/i.test(content);
  if (!hasCheckoutUI && !hasCartData) return [];
  const name = extractComponentName(file.path) || "Checkout";
  return [{ name: name.replace(/([a-z])([A-Z])/g, "$1 $2"), description: `Detected in ${file.path}` }];
}

function detectConversations(file: { path: string; content: string }): SimpleDetection[] {
  const content = file.content;
  // Look for chat/messaging UI patterns
  const hasChatUI = /chat|message|conversation|inbox|thread|live.?support|customer.?support/i.test(content);
  const hasMessageList = /(?:const|let|var)\s+(?:messages|chatMessages|conversationMessages|threads|conversations)\s*=/i.test(content);
  const hasChatComponents = /MessageList|ChatWindow|ConversationList|ChatBubble|MessageInput/i.test(content);
  const hasSendMessageHandler = /sendMessage|handleSend|onSendMessage|submitMessage/i.test(content);

  // Need at least 2 signals to avoid false positives
  const signals = [hasChatUI, hasMessageList, hasChatComponents, hasSendMessageHandler].filter(Boolean).length;
  if (signals < 2) return [];

  const componentName = extractComponentName(file.path) || "Chat";
  // Only count if we have strong signals (component name or data array)
  if (!hasMessageList && !hasChatComponents && !/(Chat|Message|Conversation|Inbox|Support)/i.test(componentName)) return [];

  return [{ name: componentName.replace(/([a-z])([A-Z])/g, "$1 $2"), description: `Detected in ${file.path}` }];
}

// ============================================================================
// HELPERS
// ============================================================================

function isComponentFile(path: string): boolean {
  return /\.(tsx|jsx)$/.test(path) && !path.includes("node_modules");
}

/**
 * Extract a component name from a file path.
 * e.g., "app/contact/page.tsx" → "Contact Page"
 */
function extractComponentName(filePath: string): string | null {
  const match = filePath.match(/([^/]+)\.(tsx|jsx)$/);
  if (!match) return null;

  const filename = match[1];
  if (filename === "page") {
    // Use parent directory name: "app/contact/page.tsx" → "Contact"
    const dirMatch = filePath.match(/([^/]+)\/page\.(tsx|jsx)$/);
    if (dirMatch) {
      return dirMatch[1].charAt(0).toUpperCase() + dirMatch[1].slice(1);
    }
  }

  return filename.charAt(0).toUpperCase() + filename.slice(1);
}

/**
 * Infer the section type from the detected items.
 */
function inferSectionType(items: DetectedItem[]): string {
  const typeMap: Record<string, string> = {
    product: "pricing",
    contact: "team",
    form: "forms",
    booking: "bookings",
    ticket: "tickets",
    invoice: "invoices",
    checkout: "checkout",
    event: "events",
    workflow: "workflows",
    conversation: "conversations",
  };
  // Use the first item's type to determine section type
  return typeMap[items[0].type] || "form";
}

/**
 * Create a human-readable section label.
 */
function inferSectionLabel(
  filePath: string,
  sectionType: string,
  items: DetectedItem[]
): string {
  const shortPath = filePath.replace(/^(app|src|components)\//, "");

  const typeLabels: Record<string, string> = {
    pricing: "Pricing",
    team: "Team",
    forms: "Form",
    bookings: "Booking",
    tickets: "Tickets",
    invoices: "Invoice",
    checkout: "Checkout",
    events: "Events",
    workflows: "Workflow",
    conversations: "Conversations",
  };

  const label = typeLabels[sectionType] || "Section";

  if (items.length === 1 && items[0].placeholderData.name) {
    return `${items[0].placeholderData.name} (${shortPath})`;
  }

  return `${label} (${shortPath})`;
}
