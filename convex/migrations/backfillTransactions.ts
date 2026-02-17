import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

type JsonObject = Record<string, unknown>;

type NormalizedLineItem = {
  productId: Id<"objects">;
  productName: string;
  quantity: number;
  unitPriceInCents: number;
  totalPriceInCents: number;
  taxAmountInCents: number;
  taxRatePercent: number;
  ticketId?: Id<"objects">;
  eventId?: Id<"objects">;
  eventName?: string;
  attendeeName?: string;
  attendeeEmail?: string;
  ticketNumber?: string;
};

function asRecord(value: unknown): JsonObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonObject;
  }
  return {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asObjectId(value: unknown): Id<"objects"> | undefined {
  return typeof value === "string" ? (value as Id<"objects">) : undefined;
}

function toStrictLineItem(item: NormalizedLineItem) {
  return {
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    unitPriceInCents: item.unitPriceInCents,
    totalPriceInCents: item.totalPriceInCents,
    taxAmountInCents: item.taxAmountInCents,
    taxRatePercent: item.taxRatePercent,
    ticketId: item.ticketId,
    eventId: item.eventId,
    eventName: item.eventName,
  };
}

function normalizeRawLineItem(raw: JsonObject): NormalizedLineItem | null {
  const productId = asObjectId(raw.productId);
  if (!productId) return null;

  const quantity = Math.max(1, Math.round(asNumber(raw.quantity) ?? 1));
  const totalPriceInCents = Math.round(
    asNumber(raw.totalPriceInCents) ??
      asNumber(raw.amountInCents) ??
      0
  );
  const unitPriceInCents = Math.round(
    asNumber(raw.unitPriceInCents) ??
      (quantity > 0 ? totalPriceInCents / quantity : totalPriceInCents)
  );

  return {
    productId,
    productName: asString(raw.productName) ?? "Unknown Product",
    quantity,
    unitPriceInCents,
    totalPriceInCents,
    taxAmountInCents: Math.round(asNumber(raw.taxAmountInCents) ?? 0),
    taxRatePercent: asNumber(raw.taxRatePercent) ?? 0,
    ticketId: asObjectId(raw.ticketId),
    eventId: asObjectId(raw.eventId),
    eventName: asString(raw.eventName),
    attendeeName: asString(raw.attendeeName),
    attendeeEmail: asString(raw.attendeeEmail),
    ticketNumber: asString(raw.ticketNumber),
  };
}

function normalizeLegacyLineItem(props: JsonObject): NormalizedLineItem | null {
  const productId = asObjectId(props.productId);
  if (!productId) return null;

  const quantity = Math.max(1, Math.round(asNumber(props.quantity) ?? 1));
  const totalPriceInCents = Math.round(
    asNumber(props.totalPriceInCents) ??
      asNumber(props.amountInCents) ??
      0
  );
  const unitPriceInCents = Math.round(
    asNumber(props.unitPriceInCents) ??
      (quantity > 0 ? totalPriceInCents / quantity : totalPriceInCents)
  );

  return {
    productId,
    productName: asString(props.productName) ?? "Unknown Product",
    quantity,
    unitPriceInCents,
    totalPriceInCents,
    taxAmountInCents: Math.round(asNumber(props.taxAmountInCents) ?? 0),
    taxRatePercent: asNumber(props.taxRatePercent) ?? 0,
    ticketId: asObjectId(props.ticketId),
    eventId: asObjectId(props.eventId),
    eventName: asString(props.eventName),
  };
}

function getLineItems(customProperties: unknown): NormalizedLineItem[] {
  const props = asRecord(customProperties);
  const rawLineItems = Array.isArray(props.lineItems) ? props.lineItems : [];
  const normalized = rawLineItems
    .map((item) => normalizeRawLineItem(asRecord(item)))
    .filter((item): item is NormalizedLineItem => item !== null);

  if (normalized.length > 0) return normalized;

  const legacy = normalizeLegacyLineItem(props);
  return legacy ? [legacy] : [];
}

/**
 * Backfill legacy ontology transactions into strict tables.
 * Run repeatedly with the returned cursor until hasNextPage is false.
 */
export const backfillTransactions = internalMutation({
  args: {
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    processed: number;
    migratedTransactions: number;
    migratedTickets: number;
    skippedAlreadyMigrated: number;
    skippedInvalid: number;
    nextCursor: string | null;
    hasNextPage: boolean;
  }> => {
    const batchSize = 50;
    const page = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "transaction"))
      .paginate({ cursor: args.cursor ?? null, numItems: batchSize });

    let migratedTransactions = 0;
    let migratedTickets = 0;
    let skippedAlreadyMigrated = 0;
    let skippedInvalid = 0;

    for (const doc of page.page) {
      const existing = await ctx.db
        .query("transactionsStrict")
        .withIndex("by_legacy", (q) => q.eq("legacyTransactionId", doc._id))
        .first();
      if (existing) {
        skippedAlreadyMigrated += 1;
        continue;
      }

      const props = asRecord(doc.customProperties);
      const lineItems = getLineItems(props);
      if (lineItems.length === 0) {
        skippedInvalid += 1;
        continue;
      }

      const subtotalFromLines = lineItems.reduce(
        (sum, item) => sum + item.unitPriceInCents * item.quantity,
        0
      );
      const taxFromLines = lineItems.reduce(
        (sum, item) => sum + item.taxAmountInCents,
        0
      );
      const subtotalInCents = Math.round(asNumber(props.subtotalInCents) ?? subtotalFromLines);
      const taxAmountInCents = Math.round(asNumber(props.taxAmountInCents) ?? taxFromLines);
      const totalInCents = Math.round(
        asNumber(props.totalInCents) ??
          asNumber(props.totalPriceInCents) ??
          subtotalInCents + taxAmountInCents
      );
      const payerType = props.payerType === "organization" ? "organization" : "individual";

      const strictTransactionId = await ctx.db.insert("transactionsStrict", {
        organizationId: doc.organizationId,
        legacyTransactionId: doc._id,
        legacySubtype: doc.subtype,
        checkoutSessionId: asObjectId(props.checkoutSessionId),
        lineItems: lineItems.map(toStrictLineItem),
        subtotalInCents,
        taxAmountInCents,
        totalInCents,
        currency: asString(props.currency) ?? "EUR",
        paymentMethod: asString(props.paymentMethod) ?? "unknown",
        paymentStatus: asString(props.paymentStatus) ?? "pending",
        payerType,
        payerId: asObjectId(props.payerId),
        originalTransactionId: asObjectId(props.originalTransactionId),
        refundId: asString(props.refundId),
        refundAmount: asNumber(props.refundAmount),
        refundDate: asNumber(props.refundDate),
        refundReason: asString(props.refundReason),
        customerName: asString(props.customerName) ?? doc.name,
        customerEmail: asString(props.customerEmail) ?? "",
        customerPhone: asString(props.customerPhone),
        language: asString(props.language),
        domainConfigId: asObjectId(props.domainConfigId),
        createdAt: Math.round(
          asNumber(doc.createdAt) ??
            asNumber(props.transactionDate) ??
            doc._creationTime
        ),
      });

      migratedTransactions += 1;

      const existingStrictTickets = await ctx.db
        .query("ticketsStrict")
        .withIndex("by_transaction", (q) => q.eq("transactionId", doc._id))
        .collect();
      const existingTicketIds = new Set(
        existingStrictTickets.map((ticket) => ticket.legacyTicketId as string)
      );

      const ticketIds = new Set<string>();
      const legacyTicketId = asObjectId(props.ticketId);
      if (legacyTicketId) ticketIds.add(legacyTicketId as string);
      for (const item of lineItems) {
        if (item.ticketId) ticketIds.add(item.ticketId as string);
      }

      for (const ticketIdRaw of ticketIds) {
        if (existingTicketIds.has(ticketIdRaw)) continue;

        const ticketId = ticketIdRaw as Id<"objects">;
        const ticketDoc = await ctx.db.get(ticketId);
        const ticketProps = asRecord(ticketDoc?.customProperties);
        const matchingLineItem =
          lineItems.find((item) => item.ticketId === ticketId) ?? lineItems[0];
        if (!matchingLineItem?.productId) continue;

        await ctx.db.insert("ticketsStrict", {
          organizationId: doc.organizationId,
          legacyTicketId: ticketId,
          transactionId: doc._id,
          strictTransactionId,
          productId: matchingLineItem.productId,
          attendeeName:
            matchingLineItem.attendeeName ??
            asString(ticketProps.holderName) ??
            asString(ticketProps.attendeeName),
          attendeeEmail:
            matchingLineItem.attendeeEmail ??
            asString(ticketProps.holderEmail) ??
            asString(ticketProps.attendeeEmail),
          ticketNumber:
            matchingLineItem.ticketNumber ??
            asString(ticketProps.ticketNumber) ??
            asString(ticketProps.ticketHash),
          eventId:
            matchingLineItem.eventId ??
            asObjectId(ticketProps.eventId) ??
            asObjectId(props.eventId),
          eventName:
            matchingLineItem.eventName ??
            asString(ticketProps.eventName) ??
            asString(props.eventName),
          createdAt: Math.round(
            asNumber(ticketDoc?.createdAt) ??
              asNumber(ticketProps.purchaseDate) ??
              doc._creationTime
          ),
        });

        migratedTickets += 1;
      }
    }

    return {
      processed: page.page.length,
      migratedTransactions,
      migratedTickets,
      skippedAlreadyMigrated,
      skippedInvalid,
      nextCursor: page.continueCursor ?? null,
      hasNextPage: !page.isDone,
    };
  },
});
