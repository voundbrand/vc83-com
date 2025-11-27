/**
 * EVENT INVITATION EMAIL TEMPLATE
 *
 * Invite to webinar, conference, or event.
 *
 * Suggested sections: hero, body, eventDetails, cta
 */

import type { EmailTemplateProps, EmailTemplateOutput } from "../types";
import type { GenericEmailProps } from "../generic-types";
import { GenericEmailTemplate } from "../generic/index";

export function EventInvitationEmailTemplate(props: EmailTemplateProps): EmailTemplateOutput {
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
        title: `You're Invited to ${props.event.name}`,
        subtitle: "Join us for an exciting event",
      },
      {
        type: "body",
        paragraphs: [
          `Hi ${props.attendee.firstName},`,
          `We're excited to invite you to ${props.event.name}.`,
          props.event.customProperties?.description || "This will be an amazing event you won't want to miss!",
        ],
      },
      {
        type: "eventDetails",
        eventName: props.event.name,
        date: props.event.customProperties?.startDate || 'TBD',
        time: props.event.customProperties?.startTime || 'TBD',
        location: props.event.customProperties?.location || 'TBD',
      },
      {
        type: "cta",
        text: "Register Now",
        url: props.domain.siteUrl,
        style: "primary",
      },
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
    subject: `You're Invited: ${props.event.name}`,
  };
}

export const EVENT_INVITATION_EMAIL_METADATA = {
  code: "email_event_invitation",
  name: "Event Invitation Email",
  description: "Invite recipients to webinars, conferences, or events",
  category: "event" as const,
  suggestedSections: ["hero", "body", "eventDetails", "cta"] as const,
  previewImageUrl: "",
  supportedLanguages: ["en", "de", "es", "fr"],
  author: "System",
  version: "1.0.0",
};
