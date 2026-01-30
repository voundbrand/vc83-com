"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  L4yercak3Client: () => L4yercak3Client,
  L4yercak3Error: () => L4yercak3Error,
  createL4yercak3Client: () => createL4yercak3Client,
  getL4yercak3Client: () => getL4yercak3Client
});
module.exports = __toCommonJS(index_exports);

// src/client.ts
var DEFAULT_BASE_URL = "https://agreeable-lion-828.convex.site";
var L4yercak3Client = class {
  constructor(config = {}) {
    this.apiKey = config.apiKey || this.getEnvVar("NEXT_PUBLIC_L4YERCAK3_API_KEY") || this.getEnvVar("L4YERCAK3_API_KEY") || "";
    this.baseUrl = config.baseUrl || this.getEnvVar("NEXT_PUBLIC_L4YERCAK3_URL") || DEFAULT_BASE_URL;
    this.organizationId = config.organizationId || this.getEnvVar("L4YERCAK3_ORG_ID");
    if (!this.apiKey) {
      console.warn("[@l4yercak3/sdk] No API key provided. Set NEXT_PUBLIC_L4YERCAK3_API_KEY or pass apiKey to constructor.");
    }
    this.contacts = new ContactsAPI(this);
    this.organizations = new OrganizationsAPI(this);
    this.events = new EventsAPI(this);
    this.forms = new FormsAPI(this);
    this.products = new ProductsAPI(this);
    this.checkout = new CheckoutAPI(this);
    this.orders = new OrdersAPI(this);
    this.invoices = new InvoicesAPI(this);
    this.benefits = new BenefitsAPI(this);
    this.certificates = new CertificatesAPI(this);
  }
  getEnvVar(name) {
    if (typeof process !== "undefined" && process.env) {
      return process.env[name];
    }
    return void 0;
  }
  /** Make a raw API request */
  async request(method, path, options) {
    const url = new URL(path, this.baseUrl);
    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== void 0 && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((v) => url.searchParams.append(key, String(v)));
          } else {
            url.searchParams.set(key, String(value));
          }
        }
      });
    }
    const headers = {
      "Content-Type": "application/json"
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }
    if (this.organizationId) {
      headers["X-Organization-Id"] = this.organizationId;
    }
    const response = await fetch(url.toString(), {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : void 0
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new L4yercak3Error(
        response.status,
        error.message || `Request failed: ${response.status}`,
        error.code,
        error
      );
    }
    if (response.status === 204) {
      return void 0;
    }
    return response.json();
  }
};
var ContactsAPI = class {
  constructor(client) {
    this.client = client;
  }
  /** List contacts with optional filtering */
  async list(params) {
    return this.client.request("GET", "/api/v1/crm/contacts", { params });
  }
  /** Get a single contact by ID */
  async get(id, options) {
    return this.client.request("GET", `/api/v1/crm/contacts/${id}`, { params: options });
  }
  /** Create a new contact */
  async create(data) {
    return this.client.request("POST", "/api/v1/crm/contacts", { body: data });
  }
  /** Update an existing contact */
  async update(id, data) {
    return this.client.request("PATCH", `/api/v1/crm/contacts/${id}`, { body: data });
  }
  /** Delete a contact */
  async delete(id) {
    return this.client.request("DELETE", `/api/v1/crm/contacts/${id}`);
  }
  /** Add tags to a contact */
  async addTags(id, tags) {
    return this.client.request("POST", `/api/v1/crm/contacts/${id}/tags`, { body: { tags } });
  }
  /** Remove tags from a contact */
  async removeTags(id, tags) {
    return this.client.request("DELETE", `/api/v1/crm/contacts/${id}/tags`, { body: { tags } });
  }
};
var OrganizationsAPI = class {
  constructor(client) {
    this.client = client;
  }
  /** List organizations with optional filtering */
  async list(params) {
    return this.client.request("GET", "/api/v1/crm/organizations", { params });
  }
  /** Get a single organization by ID */
  async get(id, options) {
    return this.client.request("GET", `/api/v1/crm/organizations/${id}`, { params: options });
  }
  /** Create a new organization */
  async create(data) {
    return this.client.request("POST", "/api/v1/crm/organizations", { body: data });
  }
  /** Update an existing organization */
  async update(id, data) {
    return this.client.request("PATCH", `/api/v1/crm/organizations/${id}`, { body: data });
  }
  /** Delete an organization */
  async delete(id) {
    return this.client.request("DELETE", `/api/v1/crm/organizations/${id}`);
  }
};
var EventsAPI = class {
  constructor(client) {
    this.client = client;
  }
  /** List events with optional filtering */
  async list(params) {
    return this.client.request("GET", "/api/v1/events", { params });
  }
  /** Get a single event by ID */
  async get(id, options) {
    return this.client.request("GET", `/api/v1/events/${id}`, { params: options });
  }
  /** Create a new event */
  async create(data) {
    return this.client.request("POST", "/api/v1/events", { body: data });
  }
  /** Update an existing event */
  async update(id, data) {
    return this.client.request("PATCH", `/api/v1/events/${id}`, { body: data });
  }
  /** Delete an event */
  async delete(id) {
    return this.client.request("DELETE", `/api/v1/events/${id}`);
  }
  /** Get attendees for an event */
  async getAttendees(eventId, params) {
    return this.client.request("GET", `/api/v1/events/${eventId}/attendees`, { params });
  }
  /** Check in an attendee */
  async checkInAttendee(eventId, attendeeId) {
    return this.client.request("POST", `/api/v1/events/${eventId}/attendees/${attendeeId}/check-in`);
  }
  /** Cancel an attendee's registration */
  async cancelAttendee(eventId, attendeeId) {
    return this.client.request("POST", `/api/v1/events/${eventId}/attendees/${attendeeId}/cancel`);
  }
};
var FormsAPI = class {
  constructor(client) {
    this.client = client;
  }
  /** List forms with optional filtering */
  async list(params) {
    return this.client.request("GET", "/api/v1/forms", { params });
  }
  /** Get a single form by ID */
  async get(id) {
    return this.client.request("GET", `/api/v1/forms/${id}`);
  }
  /** Submit a form response */
  async submit(formId, data) {
    return this.client.request("POST", `/api/v1/forms/${formId}/submit`, { body: data });
  }
  /** Get submissions for a form */
  async getSubmissions(formId, params) {
    return this.client.request("GET", `/api/v1/forms/${formId}/responses`, { params });
  }
  /** Get a single submission by ID */
  async getSubmission(formId, submissionId) {
    return this.client.request("GET", `/api/v1/forms/${formId}/responses/${submissionId}`);
  }
};
var ProductsAPI = class {
  constructor(client) {
    this.client = client;
  }
  /** List products with optional filtering */
  async list(params) {
    return this.client.request("GET", "/api/v1/products", { params });
  }
  /** Get a single product by ID */
  async get(id) {
    return this.client.request("GET", `/api/v1/products/${id}`);
  }
};
var CheckoutAPI = class {
  constructor(client) {
    this.client = client;
  }
  /** Create a new checkout session */
  async createSession(data) {
    return this.client.request("POST", "/api/v1/checkout/sessions", { body: data });
  }
  /** Get a checkout session by ID */
  async getSession(sessionId) {
    return this.client.request("GET", `/api/v1/checkout/sessions/${sessionId}`);
  }
};
var OrdersAPI = class {
  constructor(client) {
    this.client = client;
  }
  /** List orders with optional filtering */
  async list(params) {
    return this.client.request("GET", "/api/v1/orders", { params });
  }
  /** Get a single order by ID */
  async get(id) {
    return this.client.request("GET", `/api/v1/orders/${id}`);
  }
  /** Get an order by order number */
  async getByOrderNumber(orderNumber) {
    return this.client.request("GET", `/api/v1/orders/by-number/${orderNumber}`);
  }
};
var InvoicesAPI = class {
  constructor(client) {
    this.client = client;
  }
  /** List invoices with optional filtering */
  async list(params) {
    return this.client.request("GET", "/api/v1/invoices", { params });
  }
  /** Get a single invoice by ID */
  async get(id) {
    return this.client.request("GET", `/api/v1/invoices/${id}`);
  }
  /** Create a new invoice */
  async create(data) {
    return this.client.request("POST", "/api/v1/invoices", { body: data });
  }
  /** Send an invoice */
  async send(id, options) {
    return this.client.request("POST", `/api/v1/invoices/${id}/send`, { body: options });
  }
  /** Mark an invoice as paid */
  async markPaid(id, data) {
    return this.client.request("POST", `/api/v1/invoices/${id}/mark-paid`, { body: data });
  }
  /** Get the PDF URL for an invoice */
  async getPdf(id) {
    return this.client.request("GET", `/api/v1/invoices/${id}/pdf`);
  }
  /** Void an invoice */
  async void(id) {
    return this.client.request("POST", `/api/v1/invoices/${id}/void`);
  }
};
var BenefitsAPI = class {
  constructor(client) {
    this.client = client;
  }
  /** List benefit claims with optional filtering */
  async listClaims(params) {
    return this.client.request("GET", "/api/v1/benefits/claims", { params });
  }
  /** Get a single benefit claim by ID */
  async getClaim(id) {
    return this.client.request("GET", `/api/v1/benefits/claims/${id}`);
  }
  /** Create a new benefit claim */
  async createClaim(data) {
    return this.client.request("POST", "/api/v1/benefits/claims", { body: data });
  }
  /** Approve a benefit claim */
  async approveClaim(id, notes) {
    return this.client.request("POST", `/api/v1/benefits/claims/${id}/approve`, { body: { notes } });
  }
  /** Reject a benefit claim */
  async rejectClaim(id, reason) {
    return this.client.request("POST", `/api/v1/benefits/claims/${id}/reject`, { body: { reason } });
  }
  /** List commission payouts with optional filtering */
  async listCommissions(params) {
    return this.client.request("GET", "/api/v1/benefits/commissions", { params });
  }
  /** Get a single commission payout by ID */
  async getCommission(id) {
    return this.client.request("GET", `/api/v1/benefits/commissions/${id}`);
  }
};
var CertificatesAPI = class {
  constructor(client) {
    this.client = client;
  }
  /** List certificates */
  async list(params) {
    return this.client.request("GET", "/api/v1/certificates", { params });
  }
  /** Get a single certificate by ID */
  async get(id) {
    return this.client.request("GET", `/api/v1/certificates/${id}`);
  }
  /** Verify a certificate by certificate number */
  async verify(certificateNumber) {
    return this.client.request("GET", `/api/v1/certificates/verify/${certificateNumber}`);
  }
};
var L4yercak3Error = class extends Error {
  constructor(status, message, code, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.name = "L4yercak3Error";
  }
};
var defaultClient = null;
function getL4yercak3Client() {
  if (!defaultClient) {
    defaultClient = new L4yercak3Client();
  }
  return defaultClient;
}
function createL4yercak3Client(config) {
  return new L4yercak3Client(config);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  L4yercak3Client,
  L4yercak3Error,
  createL4yercak3Client,
  getL4yercak3Client
});
//# sourceMappingURL=index.js.map