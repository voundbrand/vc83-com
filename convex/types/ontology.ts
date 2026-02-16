import { Id } from "../_generated/dataModel";

export type CustomProperties = Record<string, unknown>;

export interface OntologyObject {
  _id: Id<"objects">;
  _creationTime: number;
  type: string;
  subtype?: string;
  name?: string;
  description?: string;
  customProperties?: CustomProperties;
}

export interface TransactionObject extends OntologyObject {
  type: "transaction";
  customProperties: {
    amount?: number;
    currency?: string;
    status?: string;
    [key: string]: unknown;
  };
}

export interface CheckoutSessionObject extends OntologyObject {
  customProperties?: {
    defaultLanguage?: string;
    domainConfigId?: Id<"objects">;
    checkoutInstanceId?: Id<"objects">;
    companyName?: string;
    billingLine1?: string;
    billingCity?: string;
    billingState?: string;
    billingPostalCode?: string;
    billingCountry?: string;
    vatNumber?: string;
    customerName?: string;
    customerEmail?: string;
    formResponses?: Array<{
      productId: Id<"objects">;
      ticketNumber: number;
      formId?: string;
      responses: Record<string, unknown>;
      addedCosts: number;
    }>;
    [key: string]: unknown;
  };
}

export interface DomainConfigObject extends OntologyObject {
  status?: string;
  customProperties?: {
    branding?: Record<string, unknown>;
    webPublishing?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

export interface OrganizationSettingsObject extends OntologyObject {
  customProperties?: CustomProperties;
}

export interface CrmOrganizationObject extends OntologyObject {
  customProperties?: CustomProperties;
}

export interface ProductObject extends OntologyObject {
  customProperties?: CustomProperties;
}

export interface EventObject extends OntologyObject {
  customProperties?: {
    location?: string;
    formattedAddress?: string;
    latitude?: number;
    longitude?: number;
    googleMapsUrl?: string;
    startDate?: number;
    endDate?: number;
    timezone?: string;
    [key: string]: unknown;
  } & CustomProperties;
}

export interface TicketObject extends OntologyObject {
  customProperties?: {
    attendeeName?: string;
    attendeeEmail?: string;
    ticketHash?: string;
    transactionId?: Id<"objects">;
    [key: string]: unknown;
  } & CustomProperties;
}

export interface VerifySessionResult {
  valid: boolean;
  error?: string;
  userId?: Id<"users">;
}
