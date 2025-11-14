# Backend Event Setup - HaffSymposium

## Phase 1: Backend Event Structure

This document explains how to configure your L4yerCak3 backend for the HaffSymposium event registration system.

---

## 1. Event Object Structure

### Create Event in Backend

**Location:** L4yerCak3 Admin UI → Events → Create New Event

**Event Configuration:**

```json
{
  "type": "event",
  "subtype": "symposium",

  "name": "8. HaffSymposium der Sportmedizin",
  "slug": "haffsymposium-2024",
  "description": "Das 8. HaffSymposium der Sportmedizin findet am 31. Mai und 1. Juni 2024 in Ueckermünde statt. Eine zweitägige Veranstaltung für Sportmediziner, Physiotherapeuten und medizinisches Fachpersonal.",

  "eventDetails": {
    "startDate": "2024-05-31T09:00:00Z",
    "endDate": "2024-06-01T18:00:00Z",
    "location": "Ueckermünde",
    "venue": "Bürgersaal",
    "address": {
      "street": "Am Markt 1",
      "city": "Ueckermünde",
      "postalCode": "17373",
      "country": "Deutschland"
    }
  },

  "registration": {
    "enabled": true,
    "formId": "haffsymposium_registration_2024",
    "registrationOpenDate": "2024-01-15T00:00:00Z",
    "registrationCloseDate": "2024-05-25T23:59:59Z",
    "maxAttendees": 200,
    "currentRegistrations": 0,

    "categories": [
      {
        "value": "1",
        "label": "Externer Teilnehmer",
        "description": "Ich bin ein externer Teilnehmer.",
        "basePrice": 150.00,
        "currency": "EUR"
      },
      {
        "value": "2",
        "label": "AMEOS Mitarbeiter",
        "description": "Ich bin ein Mitarbeiter der AMEOS Einrichtungen in Vorpommern.",
        "basePrice": 0.00,
        "currency": "EUR",
        "notes": "Ihr Arbeitgeber übernimmt die Kosten für die Veranstaltung sowie die UCRA-Ausfahrt."
      },
      {
        "value": "3",
        "label": "HaffNet-Mitglied/-Partner",
        "description": "Ich bin ein HaffNet-Mitglied/-Partner.",
        "basePrice": 100.00,
        "currency": "EUR"
      },
      {
        "value": "4",
        "label": "Referent",
        "description": "Ich bin ein Referent der Veranstaltung.",
        "basePrice": 0.00,
        "currency": "EUR"
      },
      {
        "value": "5",
        "label": "Sponsoring-Partner",
        "description": "Ich bin ein Sponsoring-Partner.",
        "basePrice": 0.00,
        "currency": "EUR"
      },
      {
        "value": "6",
        "label": "Orga-Team",
        "description": "Ich gehöre zum Orga-Team.",
        "basePrice": 0.00,
        "currency": "EUR"
      }
    ],

    "addons": [
      {
        "id": "ucra_boat_trip",
        "name": "Pommernkogge UCRA Abendveranstaltung",
        "description": "Individuelle Abendveranstaltung auf der Pommernkogge UCRA",
        "pricePerPerson": 30.00,
        "currency": "EUR",
        "maxQuantity": 2,
        "availableForCategories": ["1", "2", "3", "4", "5"]
      }
    ]
  },

  "workflow": {
    "triggerOn": "event_registration_complete",
    "workflowId": "wf_haffsymposium_2024"
  },

  "publishedAt": "2024-01-15T00:00:00Z",
  "status": "published"
}
```

---

## 2. Workflow Configuration

### Create Workflow for Event Registrations

**Location:** L4yerCak3 Admin UI → Workflows → Create New Workflow

**Workflow Name:** HaffSymposium 2024 Registration

**Trigger:** `event_registration_complete`

**Workflow ID:** `wf_haffsymposium_2024`

### Behavior Chain:

```json
{
  "name": "HaffSymposium 2024 Registration Workflow",
  "trigger": "event_registration_complete",
  "description": "Processes registrations for HaffSymposium 2024, including cost calculation, employer detection, contact creation, and notifications",

  "behaviors": [
    {
      "type": "event-cost-calculation",
      "priority": 100,
      "enabled": true,
      "config": {
        "eventId": "event_haffsymposium_2024",
        "basePriceField": "attendee_category",
        "basePrices": {
          "1": 150.00,
          "2": 0.00,
          "3": 100.00,
          "4": 0.00,
          "5": 0.00,
          "6": 0.00
        },
        "addons": {
          "ucra_boat_trip": {
            "pricePerUnit": 30.00,
            "quantityField": "ucra_participants",
            "applicableCategories": ["1", "2", "3", "4", "5"]
          }
        },
        "outputField": "totalCost"
      }
    },

    {
      "type": "employer-detection",
      "priority": 90,
      "enabled": true,
      "config": {
        "emailDomainField": "customerData.email",
        "knownEmployers": [
          {
            "name": "AMEOS Gruppe",
            "domains": ["ameos.de", "ameos.eu"],
            "category": "healthcare_provider"
          }
        ],
        "outputFields": {
          "employerDetected": "employerDetected",
          "employerName": "employerName",
          "employerId": "employerId"
        }
      }
    },

    {
      "type": "invoice-mapping",
      "priority": 85,
      "enabled": true,
      "config": {
        "rules": [
          {
            "condition": "employerDetected === true",
            "invoiceTo": "employer",
            "paymentTerms": "net30",
            "skipPaymentStep": true,
            "requireUpfrontPayment": false
          },
          {
            "condition": "attendee_category === '2'",
            "invoiceTo": "employer",
            "employerName": "AMEOS Gruppe",
            "paymentTerms": "net30",
            "skipPaymentStep": true,
            "requireUpfrontPayment": false
          },
          {
            "condition": "attendee_category === '1' || attendee_category === '3'",
            "invoiceTo": "customer",
            "paymentTerms": "immediate",
            "skipPaymentStep": false,
            "requireUpfrontPayment": true
          },
          {
            "default": true,
            "invoiceTo": "customer",
            "paymentTerms": "immediate",
            "skipPaymentStep": true,
            "requireUpfrontPayment": false
          }
        ]
      }
    },

    {
      "type": "contact-creation",
      "priority": 80,
      "enabled": true,
      "config": {
        "updateIfExists": true,
        "matchFields": ["email"],
        "mapping": {
          "email": "customerData.email",
          "firstName": "customerData.firstName",
          "lastName": "customerData.lastName",
          "title": "customerData.title",
          "salutation": "customerData.salutation",
          "phone": "customerData.phone",
          "mobilePhone": "customerData.phone",
          "organization": "customerData.organization",
          "profession": "customerData.profession"
        },
        "tags": ["haffsymposium_2024", "event_attendee"],
        "customFields": {
          "attendee_category": "formResponses.attendee_category",
          "dietary_requirements": "formResponses.dietary || formResponses.special_requests",
          "accommodation_needs": "formResponses.accommodation"
        }
      }
    },

    {
      "type": "consolidated-invoice-generation",
      "priority": 70,
      "enabled": true,
      "config": {
        "templateId": "haffsymposium_invoice_template",
        "invoiceNumberPrefix": "HAFF2024-",
        "includeLineItems": true,
        "lineItems": [
          {
            "description": "HaffSymposium 2024 - Teilnahmegebühr",
            "quantityField": "1",
            "priceField": "behaviorData.event-cost-calculation.basePrice",
            "taxRate": 0.19
          },
          {
            "description": "UCRA Abendveranstaltung",
            "quantityField": "formResponses.ucra_participants",
            "priceField": "30.00",
            "taxRate": 0.19,
            "conditional": "formResponses.ucra_participants > 0"
          }
        ],
        "recipientField": "behaviorData.invoice-mapping.invoiceTo",
        "paymentTermsField": "behaviorData.invoice-mapping.paymentTerms",
        "dueDate": {
          "type": "relative",
          "days": 30,
          "from": "invoiceDate"
        }
      }
    },

    {
      "type": "ticket-generation",
      "priority": 60,
      "enabled": true,
      "config": {
        "eventIdField": "inputData.eventId",
        "ticketType": "event_admission",
        "generateQRCode": true,
        "deliveryMethod": "email",
        "ticketFields": {
          "attendeeName": "customerData.firstName + ' ' + customerData.lastName",
          "attendeeEmail": "customerData.email",
          "category": "formResponses.attendee_category",
          "eventName": "8. HaffSymposium der Sportmedizin",
          "eventDate": "31. Mai - 1. Juni 2024",
          "venue": "Bürgersaal Ueckermünde"
        }
      }
    },

    {
      "type": "email-notification",
      "priority": 50,
      "enabled": true,
      "config": {
        "templates": [
          {
            "name": "customer_confirmation",
            "templateId": "haffsymposium_confirmation_email",
            "recipients": ["customerData.email"],
            "subject": "Anmeldebestätigung - 8. HaffSymposium der Sportmedizin",
            "attachments": [
              {
                "type": "ticket",
                "source": "behaviorData.ticket-generation.ticketPdfUrl"
              },
              {
                "type": "invoice",
                "source": "behaviorData.consolidated-invoice-generation.pdfUrl",
                "conditional": "behaviorData.invoice-mapping.invoiceTo === 'customer'"
              }
            ],
            "variables": {
              "firstName": "customerData.firstName",
              "lastName": "customerData.lastName",
              "eventName": "8. HaffSymposium der Sportmedizin",
              "eventDate": "31. Mai - 1. Juni 2024",
              "ticketId": "behaviorData.ticket-generation.ticketId",
              "totalCost": "behaviorData.event-cost-calculation.totalCost",
              "invoiceUrl": "behaviorData.consolidated-invoice-generation.pdfUrl"
            }
          },
          {
            "name": "admin_notification",
            "templateId": "haffsymposium_admin_notification",
            "recipients": ["info@haffnet.de", "symposium@haffnet.de"],
            "subject": "Neue Anmeldung - HaffSymposium 2024",
            "variables": {
              "attendeeName": "customerData.firstName + ' ' + customerData.lastName",
              "attendeeEmail": "customerData.email",
              "category": "formResponses.attendee_category",
              "ucraParticipants": "formResponses.ucra_participants",
              "totalCost": "behaviorData.event-cost-calculation.totalCost",
              "registrationId": "transactionId"
            }
          }
        ]
      }
    },

    {
      "type": "crm-activity-log",
      "priority": 40,
      "enabled": true,
      "config": {
        "activityType": "event_registration",
        "contactIdField": "behaviorData.contact-creation.contactId",
        "description": "Registered for HaffSymposium 2024",
        "metadata": {
          "eventId": "event_haffsymposium_2024",
          "category": "formResponses.attendee_category",
          "totalCost": "behaviorData.event-cost-calculation.totalCost",
          "registrationDate": "timestamp"
        }
      }
    }
  ],

  "errorHandling": {
    "onBehaviorFailure": "continue",
    "notifyAdminOnError": true,
    "adminEmail": "tech@haffnet.de",
    "logAllExecutions": true
  }
}
```

---

## 3. Custom Behaviors (If Not Already Available)

### 3.1 Event Cost Calculation Behavior

**Behavior Type:** `event-cost-calculation`

**Purpose:** Calculate total event cost based on attendee category and add-ons

**Logic:**

```typescript
export const eventCostCalculation: BehaviorHandler = {
  type: "event-cost-calculation",
  name: "Event Cost Calculation",
  description: "Calculates total cost for event registration including base price and add-ons",

  extract: (config, inputs, context) => {
    const formResponses = context.inputs?.[0]?.data?.formResponses || {};
    const category = formResponses[config.basePriceField];
    const basePrice = config.basePrices[category] || 0;

    let addonsTotal = 0;
    Object.entries(config.addons || {}).forEach(([addonKey, addonConfig]) => {
      const quantity = parseInt(formResponses[addonConfig.quantityField] || '0');
      if (quantity > 0 && addonConfig.applicableCategories.includes(category)) {
        addonsTotal += quantity * addonConfig.pricePerUnit;
      }
    });

    return {
      category,
      basePrice,
      addonsTotal,
      totalCost: basePrice + addonsTotal
    };
  },

  apply: async (config, extracted, context) => {
    return {
      success: true,
      data: {
        basePrice: extracted.basePrice,
        addonsTotal: extracted.addonsTotal,
        totalCost: extracted.totalCost,
        currency: 'EUR',
        breakdown: {
          category: extracted.category,
          basePriceLabel: `Teilnahmegebühr (Kategorie ${extracted.category})`,
          addonsLabel: 'Zusatzleistungen'
        }
      },
      modifiedContext: {
        behaviorData: {
          ...context.behaviorData,
          'event-cost-calculation': {
            basePrice: extracted.basePrice,
            addonsTotal: extracted.addonsTotal,
            totalCost: extracted.totalCost
          }
        }
      }
    };
  },

  validate: (config) => {
    if (!config.basePrices) {
      return [{ message: "basePrices configuration is required" }];
    }
    return [];
  }
};
```

### 3.2 CRM Activity Log Behavior

**Behavior Type:** `crm-activity-log`

**Purpose:** Log event registration as CRM activity

**Logic:**

```typescript
export const crmActivityLog: BehaviorHandler = {
  type: "crm-activity-log",
  name: "CRM Activity Logger",
  description: "Logs activities to CRM contact timeline",

  extract: (config, inputs, context) => {
    return {
      contactId: context.behaviorData?.['contact-creation']?.contactId,
      activityType: config.activityType,
      description: config.description,
      metadata: config.metadata
    };
  },

  apply: async (config, extracted, context) => {
    // Log to CRM system
    // Implementation depends on your CRM integration

    return {
      success: true,
      data: {
        activityId: `activity_${Date.now()}`,
        logged: true
      }
    };
  },

  validate: (config) => {
    if (!config.activityType) {
      return [{ message: "activityType is required" }];
    }
    return [];
  }
};
```

---

## 4. API Endpoint Requirements

### Event Retrieval Endpoint

**Endpoint:** `GET /api/v1/events/{slug}`

**Purpose:** Fetch event details for frontend display

**Response:**

```json
{
  "success": true,
  "event": {
    "_id": "event_haffsymposium_2024",
    "type": "event",
    "name": "8. HaffSymposium der Sportmedizin",
    "slug": "haffsymposium-2024",
    "description": "...",
    "eventDetails": { /* ... */ },
    "registration": { /* ... */ }
  }
}
```

### Events List Endpoint

**Endpoint:** `GET /api/v1/events`

**Query Parameters:**
- `type` (optional): Filter by event type (e.g., "event", "seminar")
- `status` (optional): Filter by status (e.g., "published", "draft")
- `upcoming` (optional): Boolean to show only upcoming events

**Response:**

```json
{
  "success": true,
  "events": [
    {
      "_id": "event_haffsymposium_2024",
      "name": "8. HaffSymposium der Sportmedizin",
      "slug": "haffsymposium-2024",
      "eventDetails": {
        "startDate": "2024-05-31T09:00:00Z",
        "location": "Ueckermünde"
      }
    }
  ],
  "total": 1
}
```

---

## 5. Email Templates

### Customer Confirmation Email

**Template ID:** `haffsymposium_confirmation_email`

**Subject:** Anmeldebestätigung - 8. HaffSymposium der Sportmedizin

**Template:**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #2c5282;">Anmeldebestätigung</h1>

    <p>Sehr geehrte/r {{title}} {{firstName}} {{lastName}},</p>

    <p>vielen Dank für Ihre Anmeldung zum <strong>{{eventName}}</strong>.</p>

    <div style="background: #f0f7ff; border-left: 4px solid #2c5282; padding: 15px; margin: 20px 0;">
      <h2 style="margin-top: 0;">Veranstaltungsdetails</h2>
      <p><strong>Datum:</strong> {{eventDate}}</p>
      <p><strong>Ort:</strong> Bürgersaal Ueckermünde</p>
      <p><strong>Ihre Ticket-ID:</strong> {{ticketId}}</p>
    </div>

    {{#if totalCost}}
    <div style="background: #fff9e6; border-left: 4px solid #f6ad55; padding: 15px; margin: 20px 0;">
      <h3 style="margin-top: 0;">Kosten</h3>
      <p><strong>Gesamtbetrag:</strong> {{totalCost}} EUR</p>
      {{#if invoiceUrl}}
      <p>Ihre Rechnung finden Sie im Anhang oder unter: <a href="{{invoiceUrl}}">Rechnung herunterladen</a></p>
      {{/if}}
    </div>
    {{/if}}

    <p>Im Anhang finden Sie Ihr Ticket. Bitte bringen Sie dieses ausgedruckt oder auf Ihrem Mobilgerät zur Veranstaltung mit.</p>

    <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>

    <p>Mit freundlichen Grüßen<br>
    Ihr HaffNet-Team</p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
    <p style="font-size: 12px; color: #718096;">
      HaffNet e.V.<br>
      info@haffnet.de<br>
      www.haffnet.de
    </p>
  </div>
</body>
</html>
```

### Admin Notification Email

**Template ID:** `haffsymposium_admin_notification`

**Subject:** Neue Anmeldung - HaffSymposium 2024

**Template:**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif;">
  <h2>Neue Anmeldung - HaffSymposium 2024</h2>

  <table style="border-collapse: collapse; width: 100%;">
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>Teilnehmer:</strong></td>
      <td style="padding: 8px; border: 1px solid #ddd;">{{attendeeName}}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>Email:</strong></td>
      <td style="padding: 8px; border: 1px solid #ddd;">{{attendeeEmail}}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>Kategorie:</strong></td>
      <td style="padding: 8px; border: 1px solid #ddd;">{{category}}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>UCRA Teilnehmer:</strong></td>
      <td style="padding: 8px; border: 1px solid #ddd;">{{ucraParticipants}}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>Gesamtkosten:</strong></td>
      <td style="padding: 8px; border: 1px solid #ddd;">{{totalCost}} EUR</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>Registrierungs-ID:</strong></td>
      <td style="padding: 8px; border: 1px solid #ddd;">{{registrationId}}</td>
    </tr>
  </table>
</body>
</html>
```

---

## 6. Setup Checklist

### In L4yerCak3 Backend:

- [ ] Create event object for HaffSymposium 2024
- [ ] Configure registration categories and pricing
- [ ] Set up UCRA boat trip addon
- [ ] Create workflow: `wf_haffsymposium_2024`
- [ ] Configure all 8 behaviors in workflow
- [ ] Create email template: `haffsymposium_confirmation_email`
- [ ] Create email template: `haffsymposium_admin_notification`
- [ ] Test workflow with sample data

### API Endpoints:

- [ ] Verify `GET /api/v1/events` endpoint exists
- [ ] Verify `GET /api/v1/events/{slug}` endpoint exists
- [ ] Verify `POST /api/v1/workflows/trigger` endpoint works
- [ ] Test event retrieval
- [ ] Test workflow trigger

### Testing:

- [ ] Test external participant registration (category 1)
- [ ] Test AMEOS employee registration (category 2)
- [ ] Test HaffNet member registration (category 3)
- [ ] Test speaker registration (category 4)
- [ ] Test cost calculation with UCRA addon
- [ ] Test employer detection for AMEOS emails
- [ ] Verify invoice generation
- [ ] Verify ticket generation
- [ ] Verify email notifications sent
- [ ] Verify CRM contact created/updated

---

## 7. Next Steps

Once backend is configured:

1. **Test the workflow** manually in L4yerCak3 admin
2. **Verify API endpoints** return correct data
3. **Move to Phase 2** - Build frontend events listing page

**Ready to proceed?** Say: "Backend is configured, let's build the frontend"
