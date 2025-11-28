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
import { getTranslations } from "../translations";

export function EventConfirmationEmailTemplate(props: EmailTemplateProps): EmailTemplateOutput {
  const t = getTranslations(props.language);

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
        title: t.ticketConfirmationTitle,
        subtitle: `${t.greeting} ${props.attendee.firstName}! ${props.event.name}`,
      },
      {
        type: "body",
        paragraphs: [
          t.ticketThankYou,
          t.presentAtEntrance,
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
            name: t.ticketPdfAttachment,
            description: t.ticketPdfDescription,
            icon: "🎫",
          },
          {
            name: t.calendarFile,
            description: t.calendarFileDescription,
            icon: "📅",
          },
        ],
      },
      ...(props.domain.mapsUrl ? [{
        type: "cta" as const,
        text: t.getDirections,
        url: props.domain.mapsUrl,
        style: "primary" as const,
      }] : []),
    ],
    footer: {
      companyName: props.domain.displayName || props.domain.domainName,
      tagline: t.lookForward,
    },
    language: props.language,
  };

  const result = GenericEmailTemplate(genericProps);

  return {
    ...result,
    subject: `${props.event.name} - ${t.ticketConfirmationTitle}`,
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
