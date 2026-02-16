import type { OntologyObject } from "../types/ontology";
import { ContactShape, EventShape, TicketShape, TransactionShape } from "../schema/shapes";
import type { Contact, Event, Ticket, Transaction } from "../schema/shapes";

function isOntologyObject(doc: unknown): doc is OntologyObject {
  return typeof doc === "object" && doc !== null && "type" in (doc as Record<string, unknown>);
}

export function parseTransaction(doc: unknown): Transaction | null {
  if (!isOntologyObject(doc) || doc.type !== "transaction") return null;
  const result = TransactionShape.safeParse(doc.customProperties);
  return result.success ? result.data : null;
}

export function parseTicket(doc: unknown): Ticket | null {
  if (!isOntologyObject(doc) || doc.type !== "ticket") return null;
  const result = TicketShape.safeParse(doc.customProperties);
  return result.success ? result.data : null;
}

export function parseEvent(doc: unknown): Event | null {
  if (!isOntologyObject(doc) || doc.type !== "event") return null;
  const result = EventShape.safeParse(doc.customProperties);
  return result.success ? result.data : null;
}

export function parseContact(doc: unknown): Contact | null {
  if (!isOntologyObject(doc) || doc.type !== "contact") return null;
  const result = ContactShape.safeParse(doc.customProperties);
  return result.success ? result.data : null;
}
