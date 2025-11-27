/**
 * NEWSLETTER EMAIL TEMPLATE
 *
 * Regular updates, announcements, content digests.
 *
 * Suggested sections: hero, body (with structured sections), cta
 */

import type { EmailTemplateProps, EmailTemplateOutput } from "../types";
import type { GenericEmailProps } from "../generic-types";
import { GenericEmailTemplate } from "../generic/index";

export function NewsletterEmailTemplate(props: EmailTemplateProps): EmailTemplateOutput {
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
        title: "This Month's Update",
        subtitle: "Latest news and insights",
      },
      {
        type: "body",
        sections: [
          {
            title: "Featured Story",
            content: "AI will populate this with newsletter content...",
          },
          {
            title: "Quick Updates",
            content: "AI will populate with brief updates...",
          },
        ],
      },
      {
        type: "cta",
        text: "Read More",
        url: props.domain.siteUrl,
        style: "primary",
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
    subject: `Newsletter - ${props.domain.displayName || props.domain.domainName}`,
  };
}

export const NEWSLETTER_EMAIL_METADATA = {
  code: "email_newsletter",
  name: "Newsletter Email",
  description: "Regular updates, announcements, and content digests",
  category: "marketing" as const,
  suggestedSections: ["hero", "body", "cta"] as const,
  previewImageUrl: "",
  supportedLanguages: ["en", "de", "es", "fr"],
  author: "System",
  version: "1.0.0",
};
