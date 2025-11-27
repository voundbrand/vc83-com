/**
 * EVENT CONFIRMATION EMAIL TEMPLATE
 *
 * Event booking confirmed with ticket PDF attached.
 * This is the main event use case (previously modern-minimal).
 *
 * Suggested sections: hero, body, eventDetails, attachmentInfo, cta
 */

import type { EmailTemplateProps, EmailTemplateOutput } from "../types";
import type { GenericEmailProps } from "../generic-types";
import { GenericEmailTemplate } from "../generic/index";

export function EventConfirmationEmailTemplate(props: EmailTemplateProps): EmailTemplateOutput {
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
        title: "Your Event is Confirmed!",
        subtitle: `We're excited to see you at ${props.event.name}`,
      },
      {
        type: "body",
        paragraphs: [
          `Hi ${props.attendee.firstName},`,
          "Thank you for registering! Your tickets are confirmed and attached to this email.",
          "Please bring your ticket (digital or printed) to the event for check-in.",
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
      {
        type: "attachmentInfo",
        attachments: [
          {
            name: "Event Ticket (PDF)",
            description: "Your ticket with QR code for check-in",
            icon: "🎫",
          },
          {
            name: "Calendar Event (ICS)",
            description: "Add this event to your calendar",
            icon: "📅",
          },
        ],
      },
      ...(props.domain.mapsUrl ? [{
        type: "cta" as const,
        text: "Get Directions",
        url: props.domain.mapsUrl,
        style: "primary" as const,
      }] : []),
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
    subject: `${props.event.name} - Confirmed`,
  };
}

export const EVENT_CONFIRMATION_EMAIL_METADATA = {
  code: "email_event_confirmation",
  name: "Event Confirmation Email",
  description: "Event booking confirmed with ticket PDF attached",
  category: "event" as const,
  suggestedSections: ["hero", "body", "eventDetails", "attachmentInfo", "cta"] as const,
  previewImageUrl: "",
  supportedLanguages: ["en", "de", "es", "fr"],
  author: "System",
  version: "2.0.0", // v2.0 - Updated to generic system
};
