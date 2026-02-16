import { z } from "zod";

export const TransactionShape = z.object({
  amount: z.number().optional(),
  currency: z.string().optional(),
  status: z
    .enum(["pending", "paid", "failed", "refunded", "awaiting_employer_payment", "partially_refunded"])
    .optional(),
  paymentStatus: z.string().optional(),
  stripePaymentIntentId: z.string().optional(),
  totalPriceInCents: z.number().optional(),
  unitPriceInCents: z.number().optional(),
  taxAmountInCents: z.number().optional(),
  refundAmount: z.number().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number(),
      })
    )
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const TicketShape = z.object({
  attendeeName: z.string().optional(),
  attendeeEmail: z.string().optional(),
  ticketHash: z.string().optional(),
  transactionId: z.string().optional(),
});

export const EventShape = z.object({
  location: z.string().optional(),
  formattedAddress: z.string().optional(),
  startDate: z.number().optional(),
  endDate: z.number().optional(),
  timezone: z.string().optional(),
  googleMapsUrl: z.string().optional(),
});

export const ContactShape = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
});

export type Transaction = z.infer<typeof TransactionShape>;
export type Ticket = z.infer<typeof TicketShape>;
export type Event = z.infer<typeof EventShape>;
export type Contact = z.infer<typeof ContactShape>;
