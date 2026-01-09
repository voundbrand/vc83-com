# Internal API Reference

This document describes all internal functions for the Multichannel Automation System.

---

## messageQueue.ts

### Mutations

#### scheduleMessage

Schedule a message for future delivery.

```typescript
export const scheduleMessage = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    channel: v.union(v.literal("email"), v.literal("sms"), v.literal("whatsapp")),
    recipientId: v.optional(v.id("objects")),
    recipientEmail: v.optional(v.string()),
    recipientPhone: v.optional(v.string()),
    templateId: v.optional(v.id("objects")),
    subject: v.optional(v.string()),
    body: v.string(),
    bodyHtml: v.optional(v.string()),
    whatsappTemplateName: v.optional(v.string()),
    whatsappTemplateParams: v.optional(v.array(v.string())),
    scheduledFor: v.number(),
    sequenceId: v.optional(v.id("objects")),
    sequenceStepIndex: v.optional(v.number()),
    bookingId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const messageId = await ctx.db.insert("messageQueue", {
      ...args,
      status: "scheduled",
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return { messageId };
  }
});
```

#### markAsSending

Mark a message as currently being processed.

```typescript
export const markAsSending = internalMutation({
  args: { messageId: v.id("messageQueue") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      status: "sending",
      updatedAt: Date.now(),
    });
  }
});
```

#### markAsSent

Mark a message as successfully sent.

```typescript
export const markAsSent = internalMutation({
  args: {
    messageId: v.id("messageQueue"),
    externalId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      status: "sent",
      sentAt: Date.now(),
      externalId: args.externalId,
      updatedAt: Date.now(),
    });
  }
});
```

#### markAsFailed

Mark a message as failed, with retry logic.

```typescript
export const markAsFailed = internalMutation({
  args: {
    messageId: v.id("messageQueue"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return;

    const newRetryCount = (message.retryCount || 0) + 1;
    const maxRetries = 3;

    await ctx.db.patch(args.messageId, {
      status: newRetryCount >= maxRetries ? "failed" : "scheduled",
      lastError: args.error,
      retryCount: newRetryCount,
      updatedAt: Date.now(),
    });

    return { willRetry: newRetryCount < maxRetries };
  }
});
```

#### cancelByBooking

Cancel all scheduled messages for a booking.

```typescript
export const cancelByBooking = internalMutation({
  args: { bookingId: v.id("objects") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messageQueue")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .filter((q) => q.eq(q.field("status"), "scheduled"))
      .collect();

    let cancelled = 0;
    for (const message of messages) {
      await ctx.db.patch(message._id, {
        status: "cancelled",
        updatedAt: Date.now(),
      });
      cancelled++;
    }

    return { cancelled };
  }
});
```

### Queries

#### getPendingMessages

Get messages due for delivery.

```typescript
export const getPendingMessages = internalQuery({
  args: {
    before: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    return await ctx.db
      .query("messageQueue")
      .withIndex("by_status_scheduled", (q) =>
        q.eq("status", "scheduled").lte("scheduledFor", args.before)
      )
      .take(limit);
  }
});
```

---

## messageDelivery.ts

### Actions

#### deliverMessage

Route and deliver a message to the appropriate channel.

```typescript
export const deliverMessage = internalAction({
  args: {
    message: v.object({
      _id: v.id("messageQueue"),
      channel: v.string(),
      recipientEmail: v.optional(v.string()),
      recipientPhone: v.optional(v.string()),
      subject: v.optional(v.string()),
      body: v.string(),
      bodyHtml: v.optional(v.string()),
      whatsappTemplateName: v.optional(v.string()),
      whatsappTemplateParams: v.optional(v.array(v.string())),
    })
  },
  handler: async (ctx, args) => {
    const { message } = args;

    switch (message.channel) {
      case "email":
        return await sendEmail(ctx, {
          to: message.recipientEmail!,
          subject: message.subject!,
          body: message.body,
          bodyHtml: message.bodyHtml,
        });

      case "sms":
        return await sendSms(ctx, {
          to: message.recipientPhone!,
          body: message.body,
        });

      case "whatsapp":
        return await sendWhatsApp(ctx, {
          to: message.recipientPhone!,
          templateName: message.whatsappTemplateName!,
          templateParams: message.whatsappTemplateParams || [],
        });

      default:
        return { success: false, error: `Unknown channel: ${message.channel}` };
    }
  }
});
```

#### sendEmail

Send email via Resend (existing integration).

```typescript
export const sendEmail = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    body: v.string(),
    bodyHtml: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Segelschule Haff <noreply@haff.de>",
        to: args.to,
        subject: args.subject,
        text: args.body,
        html: args.bodyHtml || args.body,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const result = await response.json();
    return { success: true, messageId: result.id };
  }
});
```

#### sendSms

Send SMS via Infobip.

```typescript
export const sendSms = internalAction({
  args: {
    to: v.string(),
    body: v.string(),
    from: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const INFOBIP_API_KEY = process.env.INFOBIP_API_KEY;
    const INFOBIP_BASE_URL = process.env.INFOBIP_BASE_URL;
    const SENDER_ID = args.from || process.env.INFOBIP_SMS_SENDER_ID;

    const response = await fetch(
      `${INFOBIP_BASE_URL}/sms/3/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `App ${INFOBIP_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{
            destinations: [{ to: args.to }],
            text: args.body,
            from: SENDER_ID,
          }],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const result = await response.json();
    const messageId = result.messages?.[0]?.messageId;

    return { success: true, messageId };
  }
});
```

#### sendWhatsApp

Send WhatsApp template message via Infobip.

```typescript
export const sendWhatsApp = internalAction({
  args: {
    to: v.string(),
    templateName: v.string(),
    templateParams: v.array(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const INFOBIP_API_KEY = process.env.INFOBIP_API_KEY;
    const INFOBIP_BASE_URL = process.env.INFOBIP_BASE_URL;
    const WHATSAPP_NUMBER = process.env.INFOBIP_WHATSAPP_NUMBER;

    const response = await fetch(
      `${INFOBIP_BASE_URL}/whatsapp/1/message/template`,
      {
        method: "POST",
        headers: {
          "Authorization": `App ${INFOBIP_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{
            from: WHATSAPP_NUMBER,
            to: args.to,
            content: {
              templateName: args.templateName,
              templateData: {
                body: { placeholders: args.templateParams }
              },
              language: args.language || "de",
            },
          }],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const result = await response.json();
    const messageId = result.messages?.[0]?.messageId;

    return { success: true, messageId };
  }
});
```

---

## automationSequences.ts

### Mutations

#### enrollBookingInSequences

Enroll a booking in all matching automation sequences.

```typescript
export const enrollBookingInSequences = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    bookingId: v.id("objects"),
    triggerEvent: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Load booking
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) return { enrolled: 0, messagesScheduled: 0 };

    const bookingProps = booking.customProperties as any;
    const bookingSubtype = booking.subtype;
    const eventStartTime = bookingProps.startDateTime;

    // 2. Get contact
    const contactLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.bookingId).eq("linkType", "booked_by")
      )
      .first();

    const contact = contactLink
      ? await ctx.db.get(contactLink.toObjectId)
      : null;

    // 3. Find matching sequences
    const sequences = await ctx.db
      .query("objects")
      .withIndex("by_org_type_status", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "automation_sequence")
          .eq("status", "active")
      )
      .collect();

    const matchingSequences = sequences.filter((seq) => {
      const props = seq.customProperties as any;
      return (
        props.enabled &&
        props.triggerEvent === args.triggerEvent &&
        (!props.bookingSubtypes?.length ||
         props.bookingSubtypes.includes(bookingSubtype))
      );
    });

    // 4. Schedule messages for each sequence step
    let enrolled = 0;
    let messagesScheduled = 0;

    for (const sequence of matchingSequences) {
      const props = sequence.customProperties as any;
      enrolled++;

      for (let i = 0; i < props.steps.length; i++) {
        const step = props.steps[i];

        // Calculate scheduled time
        const offsetMs = step.offsetHours * 60 * 60 * 1000;
        const scheduledFor = eventStartTime + offsetMs;

        // Check conditions
        const now = Date.now();
        const daysOut = (eventStartTime - now) / (24 * 60 * 60 * 1000);

        if (step.conditions?.minDaysOut && daysOut < step.conditions.minDaysOut) {
          continue; // Skip this step
        }

        if (scheduledFor <= now) {
          continue; // Don't schedule past messages
        }

        // Resolve template
        const template = await ctx.db.get(step.templateId);
        if (!template) continue;

        const templateProps = template.customProperties as any;
        const contactProps = contact?.customProperties as any;

        // Resolve variables
        const body = resolveVariables(templateProps.body, {
          firstName: contactProps?.firstName,
          lastName: contactProps?.lastName,
          eventName: bookingProps.eventName,
          eventDate: formatDate(eventStartTime),
          // ... more variables
        });

        // Determine channel
        let channel = step.channel;
        if (channel === "preferred") {
          channel = contactProps?.channelPreference || "email";
        }

        // Schedule message
        await ctx.runMutation(internal.messageQueue.scheduleMessage, {
          organizationId: args.organizationId,
          channel,
          recipientId: contact?._id,
          recipientEmail: contactProps?.email,
          recipientPhone: contactProps?.phone,
          templateId: step.templateId,
          subject: templateProps.subject,
          body,
          bodyHtml: templateProps.bodyHtml
            ? resolveVariables(templateProps.bodyHtml, variables)
            : undefined,
          scheduledFor,
          sequenceId: sequence._id,
          sequenceStepIndex: i,
          bookingId: args.bookingId,
        });

        messagesScheduled++;
      }
    }

    return { enrolled, messagesScheduled };
  }
});

// Helper function
function resolveVariables(
  template: string,
  variables: Record<string, string | undefined>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    variables[key] || `{{${key}}}`
  );
}
```

---

## automationEngine.ts

### Actions

#### processScheduledMessages

Cron job to process pending messages.

```typescript
export const processScheduledMessages = internalAction({
  handler: async (ctx) => {
    const now = Date.now();
    const batchSize = 50;

    // Get pending messages
    const messages = await ctx.runQuery(
      internal.messageQueue.getPendingMessages,
      { before: now, limit: batchSize }
    );

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const message of messages) {
      processed++;

      // Mark as sending
      await ctx.runMutation(
        internal.messageQueue.markAsSending,
        { messageId: message._id }
      );

      try {
        // Deliver
        const result = await ctx.runAction(
          internal.messageDelivery.deliverMessage,
          { message }
        );

        if (result.success) {
          succeeded++;

          await ctx.runMutation(
            internal.messageQueue.markAsSent,
            { messageId: message._id, externalId: result.messageId || "" }
          );

          // Log to communication tracking
          await ctx.runMutation(
            internal.communicationTracking.logEmailCommunication,
            {
              organizationId: message.organizationId,
              recipientEmail: message.recipientEmail || "",
              subject: message.subject || "",
              emailType: "transactional",
              success: true,
              messageId: result.messageId,
            }
          );
        } else {
          failed++;
          await ctx.runMutation(
            internal.messageQueue.markAsFailed,
            { messageId: message._id, error: result.error || "Unknown error" }
          );
        }
      } catch (error) {
        failed++;
        await ctx.runMutation(
          internal.messageQueue.markAsFailed,
          { messageId: message._id, error: String(error) }
        );
      }
    }

    console.log(`Processed ${processed} messages: ${succeeded} succeeded, ${failed} failed`);

    return { processed, succeeded, failed };
  }
});
```

---

## Cron Job Setup

Add to `convex/crons.ts`:

```typescript
crons.interval(
  "Process scheduled messages",
  { minutes: 5 },
  internal.automationEngine.processScheduledMessages
);
```
