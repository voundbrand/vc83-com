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

// src/react/index.ts
var index_exports = {};
__export(index_exports, {
  L4yercak3Provider: () => L4yercak3Provider,
  useAttendees: () => useAttendees,
  useBenefitClaims: () => useBenefitClaims,
  useCertificates: () => useCertificates,
  useCheckout: () => useCheckout,
  useCommissions: () => useCommissions,
  useContacts: () => useContacts,
  useEvents: () => useEvents,
  useFormSubmissions: () => useFormSubmissions,
  useForms: () => useForms,
  useInvoices: () => useInvoices,
  useL4yercak3: () => useL4yercak3,
  useL4yercak3Client: () => useL4yercak3Client,
  useOrders: () => useOrders,
  useOrganizations: () => useOrganizations,
  useProducts: () => useProducts
});
module.exports = __toCommonJS(index_exports);

// src/react/provider.tsx
var import_react = require("react");

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

// src/react/provider.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var L4yercak3Context = (0, import_react.createContext)(null);
function L4yercak3Provider({
  children,
  apiKey,
  organizationId,
  baseUrl,
  client: providedClient
}) {
  const client = (0, import_react.useMemo)(() => {
    if (providedClient) {
      return providedClient;
    }
    const config = {};
    if (apiKey) config.apiKey = apiKey;
    if (organizationId) config.organizationId = organizationId;
    if (baseUrl) config.baseUrl = baseUrl;
    return new L4yercak3Client(config);
  }, [providedClient, apiKey, organizationId, baseUrl]);
  const value = (0, import_react.useMemo)(
    () => ({
      client,
      organizationId
    }),
    [client, organizationId]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(L4yercak3Context.Provider, { value, children });
}
function useL4yercak3() {
  const context = (0, import_react.useContext)(L4yercak3Context);
  if (!context) {
    throw new Error("useL4yercak3 must be used within a L4yercak3Provider");
  }
  return context;
}
function useL4yercak3Client() {
  const { client } = useL4yercak3();
  return client;
}

// src/react/hooks/useContacts.ts
var import_react2 = require("react");
function useContacts() {
  const client = useL4yercak3Client();
  const [contacts, setContacts] = (0, import_react2.useState)([]);
  const [loading, setLoading] = (0, import_react2.useState)(false);
  const [error, setError] = (0, import_react2.useState)(null);
  const [total, setTotal] = (0, import_react2.useState)(0);
  const [hasMore, setHasMore] = (0, import_react2.useState)(false);
  const fetchContacts = (0, import_react2.useCallback)(
    async (params) => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.contacts.list(params);
        setContacts(result.items);
        setTotal(result.total);
        setHasMore(result.hasMore);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const getContact = (0, import_react2.useCallback)(
    async (id) => {
      setLoading(true);
      setError(null);
      try {
        return await client.contacts.get(id);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const createContact = (0, import_react2.useCallback)(
    async (data) => {
      setLoading(true);
      setError(null);
      try {
        const contact = await client.contacts.create(data);
        setContacts((prev) => [...prev, contact]);
        setTotal((prev) => prev + 1);
        return contact;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const updateContact = (0, import_react2.useCallback)(
    async (id, data) => {
      setLoading(true);
      setError(null);
      try {
        const updated = await client.contacts.update(id, data);
        setContacts((prev) => prev.map((c) => c.id === id ? updated : c));
        return updated;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const deleteContact = (0, import_react2.useCallback)(
    async (id) => {
      setLoading(true);
      setError(null);
      try {
        await client.contacts.delete(id);
        setContacts((prev) => prev.filter((c) => c.id !== id));
        setTotal((prev) => prev - 1);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const addTags = (0, import_react2.useCallback)(
    async (id, tags) => {
      setLoading(true);
      setError(null);
      try {
        const updated = await client.contacts.addTags(id, tags);
        setContacts((prev) => prev.map((c) => c.id === id ? updated : c));
        return updated;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const removeTags = (0, import_react2.useCallback)(
    async (id, tags) => {
      setLoading(true);
      setError(null);
      try {
        const updated = await client.contacts.removeTags(id, tags);
        setContacts((prev) => prev.map((c) => c.id === id ? updated : c));
        return updated;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const clearError = (0, import_react2.useCallback)(() => {
    setError(null);
  }, []);
  return {
    contacts,
    loading,
    error,
    total,
    hasMore,
    fetchContacts,
    getContact,
    createContact,
    updateContact,
    deleteContact,
    addTags,
    removeTags,
    clearError
  };
}

// src/react/hooks/useOrganizations.ts
var import_react3 = require("react");
function useOrganizations() {
  const client = useL4yercak3Client();
  const [organizations, setOrganizations] = (0, import_react3.useState)([]);
  const [loading, setLoading] = (0, import_react3.useState)(false);
  const [error, setError] = (0, import_react3.useState)(null);
  const [total, setTotal] = (0, import_react3.useState)(0);
  const [hasMore, setHasMore] = (0, import_react3.useState)(false);
  const fetchOrganizations = (0, import_react3.useCallback)(
    async (params) => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.organizations.list(params);
        setOrganizations(result.items);
        setTotal(result.total);
        setHasMore(result.hasMore);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const getOrganization = (0, import_react3.useCallback)(
    async (id, options) => {
      setLoading(true);
      setError(null);
      try {
        return await client.organizations.get(id, options);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const createOrganization = (0, import_react3.useCallback)(
    async (data) => {
      setLoading(true);
      setError(null);
      try {
        const org = await client.organizations.create(data);
        setOrganizations((prev) => [...prev, org]);
        setTotal((prev) => prev + 1);
        return org;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const updateOrganization = (0, import_react3.useCallback)(
    async (id, data) => {
      setLoading(true);
      setError(null);
      try {
        const updated = await client.organizations.update(id, data);
        setOrganizations((prev) => prev.map((o) => o.id === id ? updated : o));
        return updated;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const deleteOrganization = (0, import_react3.useCallback)(
    async (id) => {
      setLoading(true);
      setError(null);
      try {
        await client.organizations.delete(id);
        setOrganizations((prev) => prev.filter((o) => o.id !== id));
        setTotal((prev) => prev - 1);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const clearError = (0, import_react3.useCallback)(() => {
    setError(null);
  }, []);
  return {
    organizations,
    loading,
    error,
    total,
    hasMore,
    fetchOrganizations,
    getOrganization,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    clearError
  };
}

// src/react/hooks/useEvents.ts
var import_react4 = require("react");
function useEvents() {
  const client = useL4yercak3Client();
  const [events, setEvents] = (0, import_react4.useState)([]);
  const [loading, setLoading] = (0, import_react4.useState)(false);
  const [error, setError] = (0, import_react4.useState)(null);
  const [total, setTotal] = (0, import_react4.useState)(0);
  const [hasMore, setHasMore] = (0, import_react4.useState)(false);
  const fetchEvents = (0, import_react4.useCallback)(
    async (params) => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.events.list(params);
        setEvents(result.items);
        setTotal(result.total);
        setHasMore(result.hasMore);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const getEvent = (0, import_react4.useCallback)(
    async (id, options) => {
      setLoading(true);
      setError(null);
      try {
        return await client.events.get(id, options);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const createEvent = (0, import_react4.useCallback)(
    async (data) => {
      setLoading(true);
      setError(null);
      try {
        const event = await client.events.create(data);
        setEvents((prev) => [...prev, event]);
        setTotal((prev) => prev + 1);
        return event;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const updateEvent = (0, import_react4.useCallback)(
    async (id, data) => {
      setLoading(true);
      setError(null);
      try {
        const updated = await client.events.update(id, data);
        setEvents((prev) => prev.map((e) => e.id === id ? updated : e));
        return updated;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const deleteEvent = (0, import_react4.useCallback)(
    async (id) => {
      setLoading(true);
      setError(null);
      try {
        await client.events.delete(id);
        setEvents((prev) => prev.filter((e) => e.id !== id));
        setTotal((prev) => prev - 1);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const clearError = (0, import_react4.useCallback)(() => {
    setError(null);
  }, []);
  return {
    events,
    loading,
    error,
    total,
    hasMore,
    fetchEvents,
    getEvent,
    createEvent,
    updateEvent,
    deleteEvent,
    clearError
  };
}
function useAttendees() {
  const client = useL4yercak3Client();
  const [attendees, setAttendees] = (0, import_react4.useState)([]);
  const [loading, setLoading] = (0, import_react4.useState)(false);
  const [error, setError] = (0, import_react4.useState)(null);
  const [total, setTotal] = (0, import_react4.useState)(0);
  const [hasMore, setHasMore] = (0, import_react4.useState)(false);
  const fetchAttendees = (0, import_react4.useCallback)(
    async (eventId, params) => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.events.getAttendees(eventId, params);
        setAttendees(result.items);
        setTotal(result.total);
        setHasMore(result.hasMore);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const checkIn = (0, import_react4.useCallback)(
    async (eventId, attendeeId) => {
      setLoading(true);
      setError(null);
      try {
        const updated = await client.events.checkInAttendee(eventId, attendeeId);
        setAttendees((prev) => prev.map((a) => a.id === attendeeId ? updated : a));
        return updated;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const cancelRegistration = (0, import_react4.useCallback)(
    async (eventId, attendeeId) => {
      setLoading(true);
      setError(null);
      try {
        const updated = await client.events.cancelAttendee(eventId, attendeeId);
        setAttendees((prev) => prev.map((a) => a.id === attendeeId ? updated : a));
        return updated;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const clearError = (0, import_react4.useCallback)(() => {
    setError(null);
  }, []);
  return {
    attendees,
    loading,
    error,
    total,
    hasMore,
    fetchAttendees,
    checkIn,
    cancelRegistration,
    clearError
  };
}

// src/react/hooks/useForms.ts
var import_react5 = require("react");
function useForms() {
  const client = useL4yercak3Client();
  const [forms, setForms] = (0, import_react5.useState)([]);
  const [loading, setLoading] = (0, import_react5.useState)(false);
  const [error, setError] = (0, import_react5.useState)(null);
  const [total, setTotal] = (0, import_react5.useState)(0);
  const [hasMore, setHasMore] = (0, import_react5.useState)(false);
  const fetchForms = (0, import_react5.useCallback)(
    async (params) => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.forms.list(params);
        setForms(result.items);
        setTotal(result.total);
        setHasMore(result.hasMore);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const getForm = (0, import_react5.useCallback)(
    async (id) => {
      setLoading(true);
      setError(null);
      try {
        return await client.forms.get(id);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const clearError = (0, import_react5.useCallback)(() => {
    setError(null);
  }, []);
  return {
    forms,
    loading,
    error,
    total,
    hasMore,
    fetchForms,
    getForm,
    clearError
  };
}
function useFormSubmissions() {
  const client = useL4yercak3Client();
  const [submissions, setSubmissions] = (0, import_react5.useState)([]);
  const [loading, setLoading] = (0, import_react5.useState)(false);
  const [isSubmitting, setIsSubmitting] = (0, import_react5.useState)(false);
  const [error, setError] = (0, import_react5.useState)(null);
  const [total, setTotal] = (0, import_react5.useState)(0);
  const [hasMore, setHasMore] = (0, import_react5.useState)(false);
  const fetchSubmissions = (0, import_react5.useCallback)(
    async (formId, params) => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.forms.getSubmissions(formId, params);
        setSubmissions(result.items);
        setTotal(result.total);
        setHasMore(result.hasMore);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const submitForm = (0, import_react5.useCallback)(
    async (formId, data) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const submission = await client.forms.submit(formId, data);
        setSubmissions((prev) => [submission, ...prev]);
        setTotal((prev) => prev + 1);
        return submission;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [client]
  );
  const clearError = (0, import_react5.useCallback)(() => {
    setError(null);
  }, []);
  return {
    submissions,
    loading,
    isSubmitting,
    error,
    total,
    hasMore,
    fetchSubmissions,
    submitForm,
    clearError
  };
}

// src/react/hooks/useCheckout.ts
var import_react6 = require("react");
function useProducts() {
  const client = useL4yercak3Client();
  const [products, setProducts] = (0, import_react6.useState)([]);
  const [loading, setLoading] = (0, import_react6.useState)(false);
  const [error, setError] = (0, import_react6.useState)(null);
  const [total, setTotal] = (0, import_react6.useState)(0);
  const [hasMore, setHasMore] = (0, import_react6.useState)(false);
  const fetchProducts = (0, import_react6.useCallback)(
    async (params) => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.products.list(params);
        setProducts(result.items);
        setTotal(result.total);
        setHasMore(result.hasMore);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const getProduct = (0, import_react6.useCallback)(
    async (id) => {
      setLoading(true);
      setError(null);
      try {
        return await client.products.get(id);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const clearError = (0, import_react6.useCallback)(() => {
    setError(null);
  }, []);
  return {
    products,
    loading,
    error,
    total,
    hasMore,
    fetchProducts,
    getProduct,
    clearError
  };
}
function useCheckout() {
  const client = useL4yercak3Client();
  const [cart, setCart] = (0, import_react6.useState)([]);
  const [isCreatingCheckout, setIsCreatingCheckout] = (0, import_react6.useState)(false);
  const [error, setError] = (0, import_react6.useState)(null);
  const [checkoutSession, setCheckoutSession] = (0, import_react6.useState)(null);
  const addToCart = (0, import_react6.useCallback)((productId, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map(
          (item) => item.productId === productId ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { productId, quantity }];
    });
  }, []);
  const removeFromCart = (0, import_react6.useCallback)((productId) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }, []);
  const updateQuantity = (0, import_react6.useCallback)((productId, quantity) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.productId !== productId));
    } else {
      setCart(
        (prev) => prev.map(
          (item) => item.productId === productId ? { ...item, quantity } : item
        )
      );
    }
  }, []);
  const clearCart = (0, import_react6.useCallback)(() => {
    setCart([]);
  }, []);
  const createCheckoutSession = (0, import_react6.useCallback)(
    async (options) => {
      if (cart.length === 0) {
        throw new Error("Cart is empty");
      }
      setIsCreatingCheckout(true);
      setError(null);
      try {
        const session = await client.checkout.createSession({
          ...options,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity
          }))
        });
        setCheckoutSession(session);
        return session;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setIsCreatingCheckout(false);
      }
    },
    [client, cart]
  );
  const getCheckoutSession = (0, import_react6.useCallback)(
    async (sessionId) => {
      setError(null);
      try {
        const session = await client.checkout.getSession(sessionId);
        setCheckoutSession(session);
        return session;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      }
    },
    [client]
  );
  const clearError = (0, import_react6.useCallback)(() => {
    setError(null);
  }, []);
  return {
    cart,
    isCreatingCheckout,
    error,
    checkoutSession,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    createCheckoutSession,
    getCheckoutSession,
    clearError
  };
}

// src/react/hooks/useOrders.ts
var import_react7 = require("react");
function useOrders() {
  const client = useL4yercak3Client();
  const [orders, setOrders] = (0, import_react7.useState)([]);
  const [loading, setLoading] = (0, import_react7.useState)(false);
  const [error, setError] = (0, import_react7.useState)(null);
  const [total, setTotal] = (0, import_react7.useState)(0);
  const [hasMore, setHasMore] = (0, import_react7.useState)(false);
  const fetchOrders = (0, import_react7.useCallback)(
    async (params) => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.orders.list(params);
        setOrders(result.items);
        setTotal(result.total);
        setHasMore(result.hasMore);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const getOrder = (0, import_react7.useCallback)(
    async (id) => {
      setLoading(true);
      setError(null);
      try {
        return await client.orders.get(id);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const getOrderByNumber = (0, import_react7.useCallback)(
    async (orderNumber) => {
      setLoading(true);
      setError(null);
      try {
        return await client.orders.getByOrderNumber(orderNumber);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const clearError = (0, import_react7.useCallback)(() => {
    setError(null);
  }, []);
  return {
    orders,
    loading,
    error,
    total,
    hasMore,
    fetchOrders,
    getOrder,
    getOrderByNumber,
    clearError
  };
}

// src/react/hooks/useInvoices.ts
var import_react8 = require("react");
function useInvoices() {
  const client = useL4yercak3Client();
  const [invoices, setInvoices] = (0, import_react8.useState)([]);
  const [loading, setLoading] = (0, import_react8.useState)(false);
  const [error, setError] = (0, import_react8.useState)(null);
  const [total, setTotal] = (0, import_react8.useState)(0);
  const [hasMore, setHasMore] = (0, import_react8.useState)(false);
  const fetchInvoices = (0, import_react8.useCallback)(
    async (params) => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.invoices.list(params);
        setInvoices(result.items);
        setTotal(result.total);
        setHasMore(result.hasMore);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const getInvoice = (0, import_react8.useCallback)(
    async (id) => {
      setLoading(true);
      setError(null);
      try {
        return await client.invoices.get(id);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const createInvoice = (0, import_react8.useCallback)(
    async (data) => {
      setLoading(true);
      setError(null);
      try {
        const invoice = await client.invoices.create(data);
        setInvoices((prev) => [...prev, invoice]);
        setTotal((prev) => prev + 1);
        return invoice;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const sendInvoice = (0, import_react8.useCallback)(
    async (id, options) => {
      setLoading(true);
      setError(null);
      try {
        await client.invoices.send(id, options);
        setInvoices(
          (prev) => prev.map((inv) => inv.id === id ? { ...inv, status: "sent" } : inv)
        );
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const markPaid = (0, import_react8.useCallback)(
    async (id, data) => {
      setLoading(true);
      setError(null);
      try {
        const updated = await client.invoices.markPaid(id, data);
        setInvoices((prev) => prev.map((inv) => inv.id === id ? updated : inv));
        return updated;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const getPdf = (0, import_react8.useCallback)(
    async (id) => {
      setError(null);
      try {
        return await client.invoices.getPdf(id);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      }
    },
    [client]
  );
  const voidInvoice = (0, import_react8.useCallback)(
    async (id) => {
      setLoading(true);
      setError(null);
      try {
        const updated = await client.invoices.void(id);
        setInvoices((prev) => prev.map((inv) => inv.id === id ? updated : inv));
        return updated;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const clearError = (0, import_react8.useCallback)(() => {
    setError(null);
  }, []);
  return {
    invoices,
    loading,
    error,
    total,
    hasMore,
    fetchInvoices,
    getInvoice,
    createInvoice,
    sendInvoice,
    markPaid,
    getPdf,
    voidInvoice,
    clearError
  };
}

// src/react/hooks/useBenefits.ts
var import_react9 = require("react");
function useBenefitClaims() {
  const client = useL4yercak3Client();
  const [claims, setClaims] = (0, import_react9.useState)([]);
  const [loading, setLoading] = (0, import_react9.useState)(false);
  const [error, setError] = (0, import_react9.useState)(null);
  const [total, setTotal] = (0, import_react9.useState)(0);
  const [hasMore, setHasMore] = (0, import_react9.useState)(false);
  const fetchClaims = (0, import_react9.useCallback)(
    async (params) => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.benefits.listClaims(params);
        setClaims(result.items);
        setTotal(result.total);
        setHasMore(result.hasMore);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const getClaim = (0, import_react9.useCallback)(
    async (id) => {
      setLoading(true);
      setError(null);
      try {
        return await client.benefits.getClaim(id);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const createClaim = (0, import_react9.useCallback)(
    async (data) => {
      setLoading(true);
      setError(null);
      try {
        const claim = await client.benefits.createClaim(data);
        setClaims((prev) => [claim, ...prev]);
        setTotal((prev) => prev + 1);
        return claim;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const approveClaim = (0, import_react9.useCallback)(
    async (id, notes) => {
      setLoading(true);
      setError(null);
      try {
        const updated = await client.benefits.approveClaim(id, notes);
        setClaims((prev) => prev.map((c) => c.id === id ? updated : c));
        return updated;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const rejectClaim = (0, import_react9.useCallback)(
    async (id, reason) => {
      setLoading(true);
      setError(null);
      try {
        const updated = await client.benefits.rejectClaim(id, reason);
        setClaims((prev) => prev.map((c) => c.id === id ? updated : c));
        return updated;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const clearError = (0, import_react9.useCallback)(() => {
    setError(null);
  }, []);
  return {
    claims,
    loading,
    error,
    total,
    hasMore,
    fetchClaims,
    getClaim,
    createClaim,
    approveClaim,
    rejectClaim,
    clearError
  };
}
function useCommissions() {
  const client = useL4yercak3Client();
  const [commissions, setCommissions] = (0, import_react9.useState)([]);
  const [loading, setLoading] = (0, import_react9.useState)(false);
  const [error, setError] = (0, import_react9.useState)(null);
  const [total, setTotal] = (0, import_react9.useState)(0);
  const [hasMore, setHasMore] = (0, import_react9.useState)(false);
  const fetchCommissions = (0, import_react9.useCallback)(
    async (params) => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.benefits.listCommissions(params);
        setCommissions(result.items);
        setTotal(result.total);
        setHasMore(result.hasMore);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const getCommission = (0, import_react9.useCallback)(
    async (id) => {
      setLoading(true);
      setError(null);
      try {
        return await client.benefits.getCommission(id);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const clearError = (0, import_react9.useCallback)(() => {
    setError(null);
  }, []);
  return {
    commissions,
    loading,
    error,
    total,
    hasMore,
    fetchCommissions,
    getCommission,
    clearError
  };
}

// src/react/hooks/useCertificates.ts
var import_react10 = require("react");
function useCertificates() {
  const client = useL4yercak3Client();
  const [certificates, setCertificates] = (0, import_react10.useState)([]);
  const [loading, setLoading] = (0, import_react10.useState)(false);
  const [error, setError] = (0, import_react10.useState)(null);
  const [total, setTotal] = (0, import_react10.useState)(0);
  const [hasMore, setHasMore] = (0, import_react10.useState)(false);
  const fetchCertificates = (0, import_react10.useCallback)(
    async (params) => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.certificates.list(params);
        setCertificates(result.items);
        setTotal(result.total);
        setHasMore(result.hasMore);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const getCertificate = (0, import_react10.useCallback)(
    async (id) => {
      setLoading(true);
      setError(null);
      try {
        return await client.certificates.get(id);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const verifyCertificate = (0, import_react10.useCallback)(
    async (certificateNumber) => {
      setLoading(true);
      setError(null);
      try {
        return await client.certificates.verify(certificateNumber);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );
  const clearError = (0, import_react10.useCallback)(() => {
    setError(null);
  }, []);
  return {
    certificates,
    loading,
    error,
    total,
    hasMore,
    fetchCertificates,
    getCertificate,
    verifyCertificate,
    clearError
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  L4yercak3Provider,
  useAttendees,
  useBenefitClaims,
  useCertificates,
  useCheckout,
  useCommissions,
  useContacts,
  useEvents,
  useFormSubmissions,
  useForms,
  useInvoices,
  useL4yercak3,
  useL4yercak3Client,
  useOrders,
  useOrganizations,
  useProducts
});
//# sourceMappingURL=index.js.map