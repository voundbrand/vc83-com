/**
 * SUPPORT RESPONSE EMAIL TEMPLATE
 *
 * Customer service reply to support tickets.
 *
 * Suggested sections: hero, body, supportInfo, cta
 */

import type { EmailTemplateProps, EmailTemplateOutput } from "../types";
import type { GenericEmailProps } from "../generic-types";
import { GenericEmailTemplate } from "../generic/index";

export function SupportResponseEmailTemplate(props: EmailTemplateProps): EmailTemplateOutput {
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
        title: "Support Update",
        subtitle: "We're here to help",
      },
      {
        type: "body",
        paragraphs: [
          `Hi ${props.attendee.firstName},`,
          "Thank you for contacting our support team. We've received your request and are working on it.",
          "Here's the latest update on your support ticket:",
        ],
      },
      // AI adds supportInfo section with ticket details
      {
        type: "cta",
        text: "View Ticket",
        url: `${props.domain.siteUrl}/support`,
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
    subject: "Support Ticket Update",
  };
}

export const SUPPORT_RESPONSE_EMAIL_METADATA = {
  code: "email_support_response",
  name: "Support Response Email",
  description: "Customer service replies to support tickets",
  category: "support" as const,
  suggestedSections: ["hero", "body", "supportInfo", "cta"] as const,
  previewImageUrl: "",
  supportedLanguages: ["en", "de", "es", "fr"],
  author: "System",
  version: "1.0.0",
};
