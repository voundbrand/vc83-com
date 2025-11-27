/**
 * EVENT REMINDER EMAIL TEMPLATE
 *
 * "Event happening tomorrow" reminder.
 *
 * Suggested sections: hero, body, eventDetails, cta
 */

import type { EmailTemplateProps, EmailTemplateOutput } from "../types";
import type { GenericEmailProps } from "../generic-types";
import { GenericEmailTemplate } from "../generic/index";

export function EventReminderEmailTemplate(props: EmailTemplateProps): EmailTemplateOutput {
  const genericProps: GenericEmailProps = {
    header: {
      brandColor: props.branding.primaryColor || '#6B46C1',
      logo: props.branding.logoUrl,
      companyName: props.domain.displayName || props.domain.domainName,
    },
    recipient: {
      firstName: props.attendee.firstName,
      lastName: props.attendee.lastName,
      email: props.attendee.email,
    },
    sections: [
      {
        type: "hero",
        title: "Reminder: Event Tomorrow!",
        subtitle: `Don't forget about ${props.event.name}`,
      },
      {
        type: "body",
        paragraphs: [
          `Hi ${props.attendee.firstName},`,
          `This is a friendly reminder that ${props.event.name} is happening tomorrow!`,
          "We're looking forward to seeing you there. Don't forget to bring your ticket.",
        ],
      },
      {
        type: "eventDetails",
        eventName: props.event.name,
        date: props.event.customProperties?.startDate || 'TBD',
        time: props.event.customProperties?.startTime || 'TBD',
        location: props.event.customProperties?.location || 'TBD',
        guestCount: props.attendee.guestCount,
      },
      ...(props.domain.mapsUrl ? [{
        type: "cta" as const,
        text: "Get Directions",
        url: props.domain.mapsUrl,
        style: "primary" as const,
      }] : [{
        type: "cta" as const,
        text: "View Event Details",
        url: props.domain.siteUrl,
        style: "primary" as const,
      }]),
    ],
    footer: {
      companyName: props.domain.displayName || props.domain.domainName,
      tagline: "Professional digital communications",
    },
    language: props.language,
  };

  const result = GenericEmailTemplate(genericProps);

  return {
    ...result,
    subject: `Reminder: ${props.event.name} is Tomorrow!`,
  };
}

export const EVENT_REMINDER_EMAIL_METADATA = {
  code: "email_event_reminder",
  name: "Event Reminder Email",
  description: "Reminder email sent before event (e.g., 'Event tomorrow')",
  category: "event" as const,
  suggestedSections: ["hero", "body", "eventDetails", "cta"] as const,
  previewImageUrl: "",
  supportedLanguages: ["en", "de", "es", "fr"],
  author: "System",
  version: "1.0.0",
};
