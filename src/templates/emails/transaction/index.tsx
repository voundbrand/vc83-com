/**
 * TRANSACTION EMAIL TEMPLATE
 *
 * Generic transaction confirmation for orders, payments, bookings, etc.
 * Uses purple branding by default, AI can customize.
 *
 * Suggested sections: hero, body, orderDetails, cta
 */

import type { EmailTemplateProps, EmailTemplateOutput } from "../types";
import type { GenericEmailProps } from "../generic-types";
import { GenericEmailTemplate } from "../generic/index";

export function TransactionEmailTemplate(props: EmailTemplateProps): EmailTemplateOutput {
  // Convert legacy props to generic props
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
        title: "Transaction Confirmed",
        subtitle: `Thank you for your purchase, ${props.attendee.firstName}!`,
      },
      {
        type: "body",
        paragraphs: [
          "Your transaction has been processed successfully.",
          "You'll receive additional details shortly.",
        ],
      },
      // AI can add orderDetails section here with actual order data
      {
        type: "cta",
        text: "View Receipt",
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
    subject: `Transaction Confirmed - ${props.domain.displayName || props.domain.domainName}`,
  };
}

export const TRANSACTION_EMAIL_METADATA = {
  code: "email_transaction_generic",
  name: "Generic Transaction Email",
  description: "Universal transaction confirmation for orders, payments, bookings",
  category: "transactional" as const,
  suggestedSections: ["hero", "body", "orderDetails", "cta"] as const,
  previewImageUrl: "",
  supportedLanguages: ["en", "de", "es", "fr"],
  author: "System",
  version: "1.0.0",
};
