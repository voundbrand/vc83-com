/**
 * STATUS UPDATE EMAIL TEMPLATE
 *
 * Generic status updates for projects, orders, tickets, etc.
 *
 * Suggested sections: hero, body, cta
 */

import type { EmailTemplateProps, EmailTemplateOutput } from "../types";
import type { GenericEmailProps } from "../generic-types";
import { GenericEmailTemplate } from "../generic/index";

export function StatusUpdateEmailTemplate(props: EmailTemplateProps): EmailTemplateOutput {
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
        title: "Status Update",
        subtitle: "Here's what's happening",
      },
      {
        type: "body",
        paragraphs: [
          `Hi ${props.attendee.firstName},`,
          "We wanted to update you on the status of your request.",
          "AI will populate this with specific status information...",
        ],
      },
      {
        type: "cta",
        text: "View Details",
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
    subject: "Status Update",
  };
}

export const STATUS_UPDATE_EMAIL_METADATA = {
  code: "email_status_update",
  name: "Status Update Email",
  description: "Generic status updates for projects, orders, or tickets",
  category: "transactional" as const,
  suggestedSections: ["hero", "body", "cta"] as const,
  previewImageUrl: "",
  supportedLanguages: ["en", "de", "es", "fr"],
  author: "System",
  version: "1.0.0",
};
