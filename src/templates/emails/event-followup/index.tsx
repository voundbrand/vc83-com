/**
 * EVENT FOLLOW-UP EMAIL TEMPLATE
 *
 * Thank you, feedback request, replay link after event.
 *
 * Suggested sections: hero, body, cta
 */

import type { EmailTemplateProps, EmailTemplateOutput } from "../types";
import type { GenericEmailProps } from "../generic-types";
import { GenericEmailTemplate } from "../generic/index";

export function EventFollowupEmailTemplate(props: EmailTemplateProps): EmailTemplateOutput {
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
        title: "Thank You for Attending!",
        subtitle: `We hope you enjoyed ${props.event.name}`,
      },
      {
        type: "body",
        paragraphs: [
          `Hi ${props.attendee.firstName},`,
          `Thank you for attending ${props.event.name}! We hope it was valuable for you.`,
          "We'd love to hear your feedback to help us improve future events.",
        ],
      },
      {
        type: "cta",
        text: "Share Your Feedback",
        url: `${props.domain.siteUrl}/feedback`,
        style: "primary",
      },
      {
        type: "body",
        sections: [
          {
            title: "What's Next?",
            content: "Stay tuned for upcoming events and resources. We'll keep you updated on future opportunities.",
          },
        ],
      },
    ],
    footer: {
      companyName: props.domain.displayName || props.domain.domainName,
      tagline: "Professional digital communications",
      unsubscribeUrl: `${props.domain.siteUrl}/unsubscribe`,
    },
    language: props.language,
  };

  const result = GenericEmailTemplate(genericProps);

  return {
    ...result,
    subject: `Thank You for Attending ${props.event.name}!`,
  };
}

export const EVENT_FOLLOWUP_EMAIL_METADATA = {
  code: "email_event_followup",
  name: "Event Follow-up Email",
  description: "Thank you and feedback request after event completion",
  category: "event" as const,
  suggestedSections: ["hero", "body", "cta"] as const,
  previewImageUrl: "",
  supportedLanguages: ["en", "de", "es", "fr"],
  author: "System",
  version: "1.0.0",
};
