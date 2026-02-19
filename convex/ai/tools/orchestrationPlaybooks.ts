import { detectAllConnections } from "../../lib/connectionDetector";
import { getEventPlaybookUnsupportedReason } from "./connectionTypeSupport";

export interface EventDraft {
  title: string;
  description?: string;
  startDate: number;
  endDate: number;
  location: string;
  timezone: string;
  eventType: string;
  capacity?: number;
  agenda?: unknown[];
  ticketTypes?: unknown[];
  virtualEventUrl?: string;
  registrationRequired: boolean;
  published: boolean;
}

export interface ProductDraft {
  name: string;
  description?: string;
  price: number;
  currency: string;
  subtype: string;
  ticketTier?: string;
}

export interface FormDraft {
  name: string;
  description?: string;
}

export interface CheckoutDraft {
  name: string;
  description?: string;
  paymentMode: "b2c" | "b2b" | "hybrid";
  paymentProviders?: string[];
  published: boolean;
}

export interface UnsupportedPlaybookItem {
  type: string;
  name?: string;
  reason: string;
}

export interface DerivedEventPlaybookInput {
  experienceName: string;
  summary?: string;
  event: EventDraft;
  products: ProductDraft[];
  form: FormDraft | null;
  checkout: CheckoutDraft;
  unsupportedItems: UnsupportedPlaybookItem[];
  detectedItemCount: number;
}

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as RecordValue;
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function parseDateInput(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = new Date(value).getTime();
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

function normalizePriceInCents(value: unknown): number {
  const price = asNumber(value);
  if (price === undefined || price <= 0) return 0;
  if (price > 10000) {
    return Math.round(price);
  }
  return Math.round(price * 100);
}

function asBuilderFiles(value: unknown): Array<{ path: string; content: string }> {
  if (!Array.isArray(value)) return [];
  const files: Array<{ path: string; content: string }> = [];
  for (const entry of value) {
    const record = asRecord(entry);
    if (!record) continue;
    const path = asString(record.path);
    const content = asString(record.content);
    if (!path || !content) continue;
    files.push({ path, content });
  }
  return files;
}

function toTicketProducts(ticketTypes: unknown[]): ProductDraft[] {
  const products: ProductDraft[] = [];
  for (const ticket of ticketTypes) {
    const record = asRecord(ticket);
    if (!record) continue;
    const name = asString(record.name);
    if (!name) continue;
    products.push({
      name,
      description: asString(record.description),
      price: normalizePriceInCents(record.price),
      currency: asString(record.currency) || "USD",
      subtype: "ticket",
      ticketTier: asString(record.name),
    });
  }
  return products;
}

function toProductDrafts(productsValue: unknown): ProductDraft[] {
  if (!Array.isArray(productsValue)) return [];
  const products: ProductDraft[] = [];
  for (const product of productsValue) {
    const record = asRecord(product);
    if (!record) continue;
    const name = asString(record.name);
    if (!name) continue;
    products.push({
      name,
      description: asString(record.description),
      price: normalizePriceInCents(record.price),
      currency: asString(record.currency) || "USD",
      subtype: asString(record.subtype) || "ticket",
      ticketTier: asString(record.ticketTier),
    });
  }
  return products;
}

export function deriveEventPlaybookInput(payload: unknown): DerivedEventPlaybookInput {
  const now = Date.now();
  const defaultStart = now + 7 * 24 * 60 * 60 * 1000;
  const defaultEnd = defaultStart + 2 * 60 * 60 * 1000;

  const payloadRecord = asRecord(payload);
  const payloadSummary =
    asString(payload) ||
    asString(payloadRecord?.summary) ||
    asString(payloadRecord?.brief) ||
    asString(payloadRecord?.prompt);

  const eventRecord = asRecord(payloadRecord?.event) || payloadRecord || {};
  const checkoutRecord = asRecord(payloadRecord?.checkout) || {};
  const formRecord = asRecord(payloadRecord?.form);

  const builderFiles = asBuilderFiles(payloadRecord?.builderFiles);
  const pageSchema = asRecord(payloadRecord?.pageSchema);
  const detection =
    builderFiles.length > 0 || pageSchema
      ? detectAllConnections(
          (pageSchema as { sections: unknown[] } | null) ?? null,
          builderFiles
        )
      : { sections: [], totalItems: 0 };

  const detectedEvent =
    detection.sections
      .flatMap((section) => section.detectedItems)
      .find((item) => item.type === "event") ?? null;

  const experienceName =
    asString(payloadRecord?.experienceName) ||
    asString(payloadRecord?.name) ||
    asString(eventRecord.title) ||
    asString(eventRecord.name) ||
    asString(detectedEvent?.placeholderData?.name) ||
    "New Event Experience";

  const startDate = parseDateInput(eventRecord.startDate) || defaultStart;
  const endDateRaw = parseDateInput(eventRecord.endDate);
  const durationMinutes = asNumber(eventRecord.durationMinutes);
  const derivedEndFromDuration =
    durationMinutes && durationMinutes > 0
      ? startDate + durationMinutes * 60 * 1000
      : undefined;
  const endDate =
    endDateRaw && endDateRaw > startDate
      ? endDateRaw
      : derivedEndFromDuration && derivedEndFromDuration > startDate
      ? derivedEndFromDuration
      : defaultEnd;

  let products = toProductDrafts(payloadRecord?.products);
  if (products.length === 0) {
    products = toTicketProducts(
      Array.isArray(eventRecord.ticketTypes) ? eventRecord.ticketTypes : []
    );
  }
  if (products.length === 0 && detection.totalItems > 0) {
    products = detection.sections
      .flatMap((section) => section.detectedItems)
      .filter((item) => item.type === "product")
      .map((item) => ({
        name: asString(item.placeholderData.name) || `${experienceName} Ticket`,
        description: asString(item.placeholderData.description),
        price: normalizePriceInCents(item.placeholderData.price),
        currency: "USD",
        subtype: "ticket",
        ticketTier: undefined,
      }));
  }
  if (products.length === 0) {
    products = [
      {
        name: `${experienceName} Ticket`,
        description: `General admission for ${experienceName}`,
        price: 0,
        currency: "USD",
        subtype: "ticket",
      },
    ];
  }

  const includeForm = payloadRecord?.includeForm !== false && payloadRecord?.form !== false;
  const detectedForm =
    detection.sections
      .flatMap((section) => section.detectedItems)
      .find((item) => item.type === "form") ?? null;
  const form: FormDraft | null = includeForm
    ? {
        name:
          asString(formRecord?.name) ||
          asString(detectedForm?.placeholderData?.name) ||
          `${experienceName} Registration Form`,
        description:
          asString(formRecord?.description) ||
          asString(detectedForm?.placeholderData?.description) ||
          `Registration details for ${experienceName}`,
      }
    : null;

  const unsupportedItems: UnsupportedPlaybookItem[] = [];
  for (const item of detection.sections.flatMap((section) => section.detectedItems)) {
    const reason = getEventPlaybookUnsupportedReason(item.type);
    if (!reason) continue;
    unsupportedItems.push({
      type: item.type,
      name: asString(item.placeholderData.name),
      reason,
    });
  }

  return {
    experienceName,
    summary: payloadSummary,
    event: {
      title:
        asString(eventRecord.title) ||
        asString(eventRecord.name) ||
        asString(detectedEvent?.placeholderData?.name) ||
        experienceName,
      description:
        asString(eventRecord.description) ||
        asString(detectedEvent?.placeholderData?.description) ||
        payloadSummary,
      startDate,
      endDate,
      location: asString(eventRecord.location) || "TBD",
      timezone: asString(eventRecord.timezone) || "America/Los_Angeles",
      eventType: asString(eventRecord.eventType) || "meetup",
      capacity: asNumber(eventRecord.capacity),
      agenda: Array.isArray(eventRecord.agenda) ? eventRecord.agenda : undefined,
      ticketTypes: Array.isArray(eventRecord.ticketTypes)
        ? eventRecord.ticketTypes
        : undefined,
      virtualEventUrl: asString(eventRecord.virtualEventUrl),
      registrationRequired: eventRecord.registrationRequired !== false,
      published: eventRecord.published === true,
    },
    products,
    form,
    checkout: {
      name:
        asString(checkoutRecord.name) || `${experienceName} Checkout`,
      description:
        asString(checkoutRecord.description) ||
        `Checkout flow for ${experienceName}`,
      paymentMode:
        checkoutRecord.paymentMode === "b2b" ||
        checkoutRecord.paymentMode === "hybrid"
          ? checkoutRecord.paymentMode
          : "b2c",
      paymentProviders: Array.isArray(checkoutRecord.paymentProviders)
        ? checkoutRecord.paymentProviders.filter(
            (provider): provider is string => typeof provider === "string"
          )
        : undefined,
      published: checkoutRecord.published === true,
    },
    unsupportedItems,
    detectedItemCount: detection.totalItems,
  };
}
