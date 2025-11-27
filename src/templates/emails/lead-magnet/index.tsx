/**
 * LEAD MAGNET DELIVERY EMAIL TEMPLATE
 *
 * Ebook, guide, checklist delivery with PDF attachment.
 *
 * Suggested sections: hero, body, leadMagnetInfo, attachmentInfo
 */

import type { EmailTemplateProps, EmailTemplateOutput } from "../types";
import type { GenericEmailProps } from "../generic-types";
import { GenericEmailTemplate } from "../generic/index";

export function LeadMagnetEmailTemplate(props: EmailTemplateProps): EmailTemplateOutput {
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
        title: "Your Free Guide is Ready!",
        subtitle: "Download your exclusive resource",
      },
      {
        type: "body",
        paragraphs: [
          `Hi ${props.attendee.firstName},`,
          "Thanks for your interest! We've prepared an exclusive resource just for you.",
          "Your download is attached to this email and also available via the button below.",
        ],
      },
      // AI adds leadMagnetInfo section with download details
      {
        type: "attachmentInfo",
        attachments: [
          {
            name: "Your Free Guide (PDF)",
            description: "Download attached or click the button above",
            icon: "📚",
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
    subject: "Your Free Resource is Ready to Download",
  };
}

export const LEAD_MAGNET_EMAIL_METADATA = {
  code: "email_lead_magnet_delivery",
  name: "Lead Magnet Delivery Email",
  description: "Ebook, guide, or checklist delivery with PDF attachment",
  category: "marketing" as const,
  suggestedSections: ["hero", "body", "leadMagnetInfo", "attachmentInfo"] as const,
  previewImageUrl: "",
  supportedLanguages: ["en", "de", "es", "fr"],
  author: "System",
  version: "1.0.0",
};
