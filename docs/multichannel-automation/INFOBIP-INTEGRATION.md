# Infobip Integration Guide

## Overview

We use Infobip as a **delivery provider** for SMS and WhatsApp messages. Infobip handles:
- SMS delivery to German/DACH phone numbers
- WhatsApp Business API messaging
- Delivery status webhooks (optional)

We build our own automation logic (the "Moments" equivalent) - Infobip is just the delivery layer.

---

## Account Setup

1. Create account at [infobip.com](https://www.infobip.com)
2. Get API Key from Portal → Developers → API Keys
3. Note your Base URL (shown in portal, e.g., `https://xxxxx.api.infobip.com`)
4. For WhatsApp: Connect your WhatsApp Business Account in Portal → Channels → WhatsApp

---

## Environment Variables

Add these to your Convex environment:

```env
# Required
INFOBIP_API_KEY=your-api-key-here
INFOBIP_BASE_URL=https://xxxxx.api.infobip.com

# SMS
INFOBIP_SMS_SENDER_ID=HaffSegeln    # Max 11 alphanumeric chars

# WhatsApp
INFOBIP_WHATSAPP_NUMBER=+4915123456789
```

---

## SMS API

### Endpoint

```
POST {INFOBIP_BASE_URL}/sms/3/messages
```

### Headers

```
Authorization: App {INFOBIP_API_KEY}
Content-Type: application/json
```

### Request Body

```json
{
  "messages": [
    {
      "destinations": [
        { "to": "+4915123456789" }
      ],
      "from": "HaffSegeln",
      "text": "Ahoi Max! Morgen 9:00 am Haff. Wir freuen uns!"
    }
  ]
}
```

### Response (Success)

```json
{
  "bulkId": "bulk-123",
  "messages": [
    {
      "to": "+4915123456789",
      "status": {
        "groupId": 1,
        "groupName": "PENDING",
        "id": 26,
        "name": "PENDING_ACCEPTED"
      },
      "messageId": "msg-abc123"
    }
  ]
}
```

### Phone Number Format

Always use **E.164 format**:
- Start with `+` and country code
- No spaces, dashes, or parentheses

| Input | E.164 |
|-------|-------|
| `0151 2345 6789` | `+4915123456789` |
| `+49 151 234 5678` | `+4915123456789` |
| `0049151234567` | `+4915123456789` |

### Phone Conversion Function

```typescript
function toE164(phone: string, defaultCountry = "49"): string {
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, "");

  // Handle different formats
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  if (cleaned.startsWith("00")) {
    return "+" + cleaned.slice(2);
  }
  if (cleaned.startsWith("0")) {
    return "+" + defaultCountry + cleaned.slice(1);
  }

  return "+" + defaultCountry + cleaned;
}
```

### Sender ID Rules (Germany)

- Max **11 alphanumeric characters**
- No special characters or spaces
- Must be pre-registered with some carriers
- Examples: `HaffSegeln`, `Segelschule`, `HaffErleben`

---

## WhatsApp API

### Template Messages (Required)

WhatsApp Business API **requires pre-approved templates** for business-initiated messages.

### Register a Template

1. Go to Infobip Portal → Channels → WhatsApp → Templates
2. Click "Create Template"
3. Fill in details:
   - **Name**: `haff_reminder` (lowercase, underscores)
   - **Category**: `UTILITY` (for reminders) or `MARKETING`
   - **Language**: `de` (German)
   - **Body**: Include variables as `{{1}}`, `{{2}}`, etc.
4. Submit for Meta approval (24-72 hours)

### Example Template: `haff_reminder`

```
Name: haff_reminder
Category: UTILITY
Language: de

Header: none
Body: Hallo {{1}}, in {{2}} Tagen ist es soweit! Dein {{3}} am Stettiner Haff. Wir freuen uns auf dich!
Footer: Segelschule Haff
Buttons: none
```

### Send Template Message

#### Endpoint

```
POST {INFOBIP_BASE_URL}/whatsapp/1/message/template
```

#### Request Body

```json
{
  "messages": [
    {
      "from": "+4915123456789",
      "to": "+4917612345678",
      "content": {
        "templateName": "haff_reminder",
        "templateData": {
          "body": {
            "placeholders": ["Max", "3", "SBF Binnen Kurs"]
          }
        },
        "language": "de"
      }
    }
  ]
}
```

### WhatsApp Template Categories

| Category | Use Case | Cost |
|----------|----------|------|
| `UTILITY` | Reminders, confirmations, updates | Lower |
| `MARKETING` | Promotions, newsletters | Higher |
| `AUTHENTICATION` | OTP, verification | Lowest |

For Gerrit's use case, most templates should be `UTILITY`.

---

## Rate Limits

| Channel | Default Limit |
|---------|---------------|
| SMS | 1000 messages/second |
| WhatsApp | Tier-based (see below) |

### WhatsApp Business Tiers

| Tier | Daily Limit | How to Qualify |
|------|-------------|----------------|
| Tier 1 | 1,000 | New accounts |
| Tier 2 | 10,000 | Good quality score |
| Tier 3 | 100,000 | Sustained quality |
| Unlimited | No limit | Excellent quality |

Our 5-minute cron with 50 batch size = ~600/hour, well within limits.

---

## Error Handling

### SMS Status Codes

| groupId | groupName | Meaning | Action |
|---------|-----------|---------|--------|
| 1 | PENDING | Message queued | Wait |
| 2 | UNDELIVERABLE | Invalid number | Mark failed |
| 3 | DELIVERED | Success | Mark sent |
| 4 | EXPIRED | Not delivered in time | Retry or fail |
| 5 | REJECTED | Blocked/spam | Mark failed |

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid phone number` | Wrong format | Use E.164 |
| `Sender ID not allowed` | Not registered | Register sender ID |
| `Insufficient balance` | No credits | Top up account |
| `Template not found` | Wrong name | Check template name |
| `Template rejected` | Not approved | Resubmit template |

### Retry Strategy

```typescript
const RETRY_DELAYS = [
  5 * 60 * 1000,   // 5 minutes
  15 * 60 * 1000,  // 15 minutes
  60 * 60 * 1000,  // 1 hour
];

function shouldRetry(error: string, retryCount: number): boolean {
  // Don't retry permanent failures
  const permanentFailures = [
    "Invalid phone number",
    "Sender ID not allowed",
    "Template rejected",
  ];

  if (permanentFailures.some(f => error.includes(f))) {
    return false;
  }

  return retryCount < 3;
}
```

---

## Cost Estimation

### SMS Pricing (Germany)

| Destination | Cost per SMS |
|-------------|--------------|
| German mobile | ~€0.07-0.09 |
| Austrian mobile | ~€0.08-0.10 |
| Swiss mobile | ~€0.10-0.12 |

### WhatsApp Pricing (Germany)

| Category | Cost per Message |
|----------|------------------|
| Utility | ~€0.05-0.07 |
| Marketing | ~€0.10-0.15 |
| Authentication | ~€0.03-0.05 |

### Monthly Estimate for Gerrit

Assuming 50 bookings/month, 5 messages each:

| Channel | Volume | Cost |
|---------|--------|------|
| SMS | 50 | ~€3.50 |
| WhatsApp | 200 | ~€12.00 |
| **Total** | 250 | **~€15.50** |

---

## Delivery Webhooks (Optional)

Infobip can send delivery status updates to your webhook.

### Setup

1. Go to Portal → Channels → SMS → Forwarding
2. Add webhook URL: `https://your-api.com/webhooks/infobip`
3. Select events: `DELIVERED`, `UNDELIVERABLE`, `EXPIRED`

### Webhook Payload

```json
{
  "results": [
    {
      "messageId": "msg-abc123",
      "to": "+4915123456789",
      "sentAt": "2025-01-09T10:00:00.000+0000",
      "doneAt": "2025-01-09T10:00:05.000+0000",
      "status": {
        "groupId": 3,
        "groupName": "DELIVERED",
        "id": 5,
        "name": "DELIVERED_TO_HANDSET"
      }
    }
  ]
}
```

### Webhook Handler

```typescript
// convex/http.ts or API route
export const infobipWebhook = httpAction(async (ctx, request) => {
  const body = await request.json();

  for (const result of body.results) {
    // Update message status in database
    await ctx.runMutation(internal.messageQueue.updateDeliveryStatus, {
      externalId: result.messageId,
      status: result.status.groupName === "DELIVERED" ? "delivered" : "failed",
      deliveredAt: new Date(result.doneAt).getTime(),
    });
  }

  return new Response("OK", { status: 200 });
});
```

---

## Testing

### Test SMS Sending

```bash
curl -X POST "https://xxxxx.api.infobip.com/sms/3/messages" \
  -H "Authorization: App YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "destinations": [{"to": "+49YOUR_PHONE"}],
      "from": "HaffSegeln",
      "text": "Test message from Haff automation"
    }]
  }'
```

### Test WhatsApp Sending

```bash
curl -X POST "https://xxxxx.api.infobip.com/whatsapp/1/message/template" \
  -H "Authorization: App YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "from": "+49WHATSAPP_NUMBER",
      "to": "+49YOUR_PHONE",
      "content": {
        "templateName": "haff_reminder",
        "templateData": {
          "body": {"placeholders": ["Test", "7", "Test Event"]}
        },
        "language": "de"
      }
    }]
  }'
```

---

## Checklist

- [ ] Create Infobip account
- [ ] Get API key and base URL
- [ ] Add environment variables
- [ ] Register SMS sender ID
- [ ] Connect WhatsApp Business Account
- [ ] Create and approve WhatsApp templates
- [ ] Test SMS delivery
- [ ] Test WhatsApp delivery
- [ ] Set up webhooks (optional)
