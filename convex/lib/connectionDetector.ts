/**
 * Connection Detector — Shared Pure Functions
 *
 * Detects connectable items (products, contacts, events, forms, etc.)
 * from page schemas and builder files. Runs on Convex server (no React).
 *
 * Used by:
 * - Agent tools (connectionToolActions.ts) — channel-agnostic detection
 * - Future: builder-context.tsx can import these instead of inline logic
 */

// ============================================================================
// TYPES
// ============================================================================

export type DetectedItemType =
  | "product"
  | "event"
  | "contact"
  | "form"
  | "invoice"
  | "ticket"
  | "booking"
  | "workflow"
  | "checkout"
  | "conversation"
  | "agent";

export interface DetectedItemServer {
  id: string;
  type: DetectedItemType;
  placeholderData: {
    name?: string;
    price?: number | string;
    description?: string;
    date?: string;
    email?: string;
    [key: string]: unknown;
  };
}

export interface SectionConnectionServer {
  sectionId: string;
  sectionType: string;
  sectionLabel: string;
  detectedItems: DetectedItemServer[];
}

export interface DetectionResult {
  sections: SectionConnectionServer[];
  totalItems: number;
}

interface SimpleDetection {
  name: string;
  description?: string;
}

interface ContactDetection {
  name: string;
  email?: string;
  role?: string;
}

interface ProductDetection {
  name: string;
  price?: string;
  description?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PageSchema = { sections: any[]; [key: string]: unknown };

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Unified detection: runs both page schema analysis and file-based detection,
 * merges results, and returns all detected items.
 */
export function detectAllConnections(
  pageSchema: PageSchema | null,
  builderFiles: Array<{ path: string; content: string }>
): DetectionResult {
  const allSections: SectionConnectionServer[] = [];

  // 1. Page schema detection (pricing, team, events)
  if (pageSchema?.sections) {
    const schemaResult = detectFromPageSchema(pageSchema);
    allSections.push(...schemaResult.sections);
  }

  // 2. File-based detection (forms, contacts, products, bookings, etc.)
  if (builderFiles.length > 0) {
    const fileResult = detectFromBuilderFiles(builderFiles);
    // Only add file-detected items that aren't already covered by schema detection
    const existingIds = new Set(
      allSections.flatMap((s) => s.detectedItems.map((i) => i.type + ":" + (i.placeholderData.name || "")))
    );
    for (const section of fileResult.sections) {
      const newItems = section.detectedItems.filter(
        (item) => !existingIds.has(item.type + ":" + (item.placeholderData.name || ""))
      );
      if (newItems.length > 0) {
        allSections.push({ ...section, detectedItems: newItems });
      }
    }
  }

  const totalItems = allSections.reduce((sum, s) => sum + s.detectedItems.length, 0);
  return { sections: allSections, totalItems };
}

// ============================================================================
// PAGE SCHEMA DETECTION
// ============================================================================

/**
 * Analyze JSON page schema for connectable items.
 * Ported from builder-context.tsx lines 1525-1633.
 */
export function detectFromPageSchema(schema: PageSchema): DetectionResult {
  const sections: SectionConnectionServer[] = [];
  let itemIdCounter = 0;

  for (const section of schema.sections) {
    const sectionConnection: SectionConnectionServer = {
      sectionId: section.id || `section_${itemIdCounter}`,
      sectionType: section.type,
      sectionLabel: section.type
        ? section.type.charAt(0).toUpperCase() + section.type.slice(1)
        : "Section",
      detectedItems: [],
    };

    // Pricing sections → products
    if (section.type === "pricing" && section.props?.tiers) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tiers = section.props.tiers as any[];
      for (const tier of tiers) {
        if (tier.name) {
          sectionConnection.detectedItems.push({
            id: `item_${++itemIdCounter}`,
            type: "product",
            placeholderData: {
              name: tier.name,
              price: tier.price,
              description: tier.description,
            },
          });
        }
      }
    }

    // Team sections → contacts
    if (section.type === "team" && section.props?.members) {
      const members = section.props.members as Array<{
        name?: string;
        role?: string;
        email?: string;
      }>;
      for (const member of members) {
        if (member.name) {
          sectionConnection.detectedItems.push({
            id: `item_${++itemIdCounter}`,
            type: "contact",
            placeholderData: {
              name: member.name,
              description: member.role,
              email: member.email,
            },
          });
        }
      }
    }

    // Hero/CTA sections with date references → events
    if ((section.type === "hero" || section.type === "cta") && section.props) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props = section.props as any;
      const hasDateContent = JSON.stringify(props).match(
        /\d{1,2}[./]\d{1,2}[./]\d{2,4}|\d{4}-\d{2}-\d{2}|January|February|March|April|May|June|July|August|September|October|November|December/i
      );

      if (hasDateContent && props.title) {
        sectionConnection.detectedItems.push({
          id: `item_${++itemIdCounter}`,
          type: "event",
          placeholderData: {
            name: props.title as string,
            description: (props.subtitle as string) || (props.description as string),
            date: hasDateContent[0],
          },
        });
      }
    }

    if (sectionConnection.detectedItems.length > 0) {
      sections.push(sectionConnection);
    }
  }

  const totalItems = sections.reduce((sum, s) => sum + s.detectedItems.length, 0);
  return { sections, totalItems };
}

// ============================================================================
// FILE-BASED DETECTION
// ============================================================================

/**
 * Analyze builder files (TSX/JSX) for connectable UI elements.
 * Ported from src/lib/builder/v0-file-analyzer.ts.
 */
export function detectFromBuilderFiles(
  files: Array<{ path: string; content: string }>
): DetectionResult {
  const sections: SectionConnectionServer[] = [];
  let itemCounter = 0;

  for (const file of files) {
    if (!isComponentFile(file.path)) continue;

    const items: DetectedItemServer[] = [];

    // Forms
    for (const detection of detectForms(file)) {
      items.push({
        id: `detected_${++itemCounter}`,
        type: "form",
        placeholderData: { name: detection.name, description: detection.description },
      });
    }

    // Contacts
    for (const detection of detectContacts(file)) {
      items.push({
        id: `detected_${++itemCounter}`,
        type: "contact",
        placeholderData: { name: detection.name, email: detection.email, description: detection.role },
      });
    }

    // Products
    for (const detection of detectProducts(file)) {
      items.push({
        id: `detected_${++itemCounter}`,
        type: "product",
        placeholderData: { name: detection.name, price: detection.price, description: detection.description },
      });
    }

    // Events
    for (const detection of detectEvents(file)) {
      items.push({
        id: `detected_${++itemCounter}`,
        type: "event",
        placeholderData: { name: detection.name, description: detection.description },
      });
    }

    // Bookings
    for (const detection of detectBookings(file)) {
      items.push({
        id: `detected_${++itemCounter}`,
        type: "booking",
        placeholderData: { name: detection.name, description: detection.description },
      });
    }

    // Tickets
    for (const detection of detectTickets(file)) {
      items.push({
        id: `detected_${++itemCounter}`,
        type: "ticket",
        placeholderData: { name: detection.name, description: detection.description },
      });
    }

    // Invoices
    for (const detection of detectInvoices(file)) {
      items.push({
        id: `detected_${++itemCounter}`,
        type: "invoice",
        placeholderData: { name: detection.name, description: detection.description },
      });
    }

    // Checkout
    for (const detection of detectCheckout(file)) {
      items.push({
        id: `detected_${++itemCounter}`,
        type: "checkout",
        placeholderData: { name: detection.name, description: detection.description },
      });
    }

    // Conversations
    for (const detection of detectConversations(file)) {
      items.push({
        id: `detected_${++itemCounter}`,
        type: "conversation",
        placeholderData: { name: detection.name, description: detection.description },
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
      });
    }
  }

  const totalItems = sections.reduce((sum, s) => sum + s.detectedItems.length, 0);
  return { sections, totalItems };
}

// ============================================================================
// INDIVIDUAL DETECTORS
// ============================================================================

function detectForms(file: { path: string; content: string }): SimpleDetection[] {
  const content = file.content;
  const hasFormTag = /<form[\s>]/i.test(content);
  const hasSubmitHandler = /onSubmit|handleSubmit|action=/i.test(content);
  const formComponentMatch = content.match(
    /export\s+(?:default\s+)?function\s+(\w*(?:Form|Contact|Register|Signup|Subscribe|Newsletter)\w*)/i
  );
  const inputCount = (content.match(/<(?:input|textarea|select)[\s>]/gi) || []).length;
  const hasMultipleInputs = inputCount >= 3;

  if (hasFormTag || hasSubmitHandler || formComponentMatch || hasMultipleInputs) {
    const name = formComponentMatch?.[1] || extractComponentName(file.path) || "Form";
    const readableName = name.replace(/([a-z])([A-Z])/g, "$1 $2");
    return [{ name: readableName, description: `Detected in ${file.path}${inputCount > 0 ? ` (${inputCount} input fields)` : ""}` }];
  }
  return [];
}

function detectContacts(file: { path: string; content: string }): ContactDetection[] {
  const content = file.content;
  const teamVarPattern = /(?:const|let|var)\s+(team|members|staff|contacts|people)\s*=\s*\[/i;
  if (!teamVarPattern.test(content)) return [];

  const results: ContactDetection[] = [];
  const objectPattern = /\{\s*(?:[^}]*?)name\s*:\s*["']([^"']+)["'](?:[^}]*?)(?:email\s*:\s*["']([^"']+)["'])?(?:[^}]*?)(?:(?:role|title|position)\s*:\s*["']([^"']+)["'])?[^}]*\}/gi;
  let match;
  while ((match = objectPattern.exec(content)) !== null) {
    results.push({ name: match[1], email: match[2] || undefined, role: match[3] || undefined });
  }
  return results;
}

function detectProducts(file: { path: string; content: string }): ProductDetection[] {
  const content = file.content;
  const pricingVarPattern = /(?:const|let|var)\s+(plans|pricing|tiers|packages|products)\s*=\s*\[/i;
  if (!pricingVarPattern.test(content)) return [];

  const results: ProductDetection[] = [];
  const tierPattern = /\{\s*(?:[^}]*?)name\s*:\s*["']([^"']+)["'](?:[^}]*?)(?:price\s*:\s*["']?([^"',}]+)["']?)?(?:[^}]*?)(?:description\s*:\s*["']([^"']+)["'])?[^}]*\}/gi;
  let match;
  while ((match = tierPattern.exec(content)) !== null) {
    results.push({ name: match[1], price: match[2]?.trim() || undefined, description: match[3] || undefined });
  }
  return results;
}

function detectEvents(file: { path: string; content: string }): SimpleDetection[] {
  const content = file.content;
  const hasEventTerms =
    /event|conference|summit|workshop|meetup|webinar|admission|agenda|speaker/i.test(
      content
    );
  const hasDateOrTimeSignal =
    /\d{4}-\d{2}-\d{2}|\d{1,2}[:.]\d{2}\s?(?:AM|PM)?|january|february|march|april|may|june|july|august|september|october|november|december/i.test(
      content
    );

  if (!hasEventTerms || !hasDateOrTimeSignal) return [];

  const componentName = extractComponentName(file.path) || "Event";
  return [
    {
      name: componentName.replace(/([a-z])([A-Z])/g, "$1 $2"),
      description: `Detected event-oriented content in ${file.path}`,
    },
  ];
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
  const hasTicketComponent = /(?:const|let|var)\s+(?:tickets|passes|admissions)\s*=/i.test(content);
  if (!hasTicketUI && !hasTicketComponent) return [];
  const componentName = extractComponentName(file.path) || "Ticket";
  if (!hasTicketComponent && !/(Ticket|Admission|CheckIn|Pass)/i.test(componentName)) return [];
  return [{ name: componentName.replace(/([a-z])([A-Z])/g, "$1 $2"), description: `Detected in ${file.path}` }];
}

function detectInvoices(file: { path: string; content: string }): SimpleDetection[] {
  const content = file.content;
  const hasInvoiceUI = /invoice|billing|line.?item|subtotal|due.?date|payment.?status/i.test(content);
  const hasTableOrList = /<table|<thead|<tbody/i.test(content);
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
  const hasChatUI = /chat|message|conversation|inbox|thread|live.?support|customer.?support/i.test(content);
  const hasMessageList = /(?:const|let|var)\s+(?:messages|chatMessages|conversationMessages|threads|conversations)\s*=/i.test(content);
  const hasChatComponents = /MessageList|ChatWindow|ConversationList|ChatBubble|MessageInput/i.test(content);
  const hasSendMessageHandler = /sendMessage|handleSend|onSendMessage|submitMessage/i.test(content);

  const signals = [hasChatUI, hasMessageList, hasChatComponents, hasSendMessageHandler].filter(Boolean).length;
  if (signals < 2) return [];

  const componentName = extractComponentName(file.path) || "Chat";
  if (!hasMessageList && !hasChatComponents && !/(Chat|Message|Conversation|Inbox|Support)/i.test(componentName)) return [];
  return [{ name: componentName.replace(/([a-z])([A-Z])/g, "$1 $2"), description: `Detected in ${file.path}` }];
}

// ============================================================================
// HELPERS
// ============================================================================

function isComponentFile(path: string): boolean {
  return /\.(tsx|jsx)$/.test(path) && !path.includes("node_modules");
}

function extractComponentName(filePath: string): string | null {
  const match = filePath.match(/([^/]+)\.(tsx|jsx)$/);
  if (!match) return null;
  const filename = match[1];
  if (filename === "page") {
    const dirMatch = filePath.match(/([^/]+)\/page\.(tsx|jsx)$/);
    if (dirMatch) return dirMatch[1].charAt(0).toUpperCase() + dirMatch[1].slice(1);
  }
  return filename.charAt(0).toUpperCase() + filename.slice(1);
}

function inferSectionType(items: DetectedItemServer[]): string {
  const typeMap: Record<string, string> = {
    product: "pricing", contact: "team", form: "forms", booking: "bookings",
    ticket: "tickets", invoice: "invoices", checkout: "checkout", event: "events",
    workflow: "workflows", conversation: "conversations",
  };
  return typeMap[items[0].type] || "form";
}

function inferSectionLabel(
  filePath: string,
  sectionType: string,
  items: DetectedItemServer[]
): string {
  const shortPath = filePath.replace(/^(app|src|components)\//, "");
  const typeLabels: Record<string, string> = {
    pricing: "Pricing", team: "Team", forms: "Form", bookings: "Booking",
    tickets: "Tickets", invoices: "Invoice", checkout: "Checkout",
    events: "Events", workflows: "Workflow", conversations: "Conversations",
  };
  const label = typeLabels[sectionType] || "Section";
  if (items.length === 1 && items[0].placeholderData.name) {
    return `${items[0].placeholderData.name} (${shortPath})`;
  }
  return `${label} (${shortPath})`;
}

// ============================================================================
// SUMMARY BUILDER (for agent-friendly output)
// ============================================================================

/**
 * Build a human-readable summary of detection results for the agent to relay.
 */
export function buildDetectionSummary(result: DetectionResult): string {
  if (result.totalItems === 0) return "No connectable items detected.";

  const typeCounts: Record<string, number> = {};
  const matchCounts: Record<string, number> = {};

  for (const section of result.sections) {
    for (const item of section.detectedItems) {
      typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const section of result.sections as any[]) {
    for (const item of section.detectedItems) {
      if (item.existingMatches?.length > 0) {
        const exactMatches = item.existingMatches.filter(
          (m: { similarity: number }) => m.similarity >= 1.0
        ).length;
        if (exactMatches > 0) {
          matchCounts[item.type] = (matchCounts[item.type] || 0) + 1;
        }
      }
    }
  }

  const typeLabels: Record<string, string> = {
    product: "product", contact: "contact", event: "event", form: "form",
    invoice: "invoice", ticket: "ticket", booking: "booking", workflow: "workflow",
    checkout: "checkout", conversation: "conversation",
  };

  const parts: string[] = [];
  for (const [type, count] of Object.entries(typeCounts)) {
    const label = typeLabels[type] || type;
    const plural = count === 1 ? label : label + "s";
    const matchInfo = matchCounts[type]
      ? ` (${matchCounts[type]} with exact match)`
      : "";
    parts.push(`${count} ${plural}${matchInfo}`);
  }

  return `Detected: ${parts.join(", ")}.`;
}
