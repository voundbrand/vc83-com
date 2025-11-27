/**
 * SHIPPING/DELIVERY EMAIL TEMPLATE
 *
 * Order shipped, delivered, tracking updates.
 *
 * Suggested sections: hero, body, shippingInfo, cta
 */

import type { EmailTemplateProps, EmailTemplateOutput } from "../types";
import type { GenericEmailProps } from "../generic-types";
import { GenericEmailTemplate } from "../generic/index";

export function ShippingEmailTemplate(props: EmailTemplateProps): EmailTemplateOutput {
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
        title: "Your Order Has Shipped!",
      },
      {
        type: "body",
        paragraphs: [
          "Good news! Your order is on its way.",
          "Track your shipment using the information below.",
        ],
      },
      // AI adds shippingInfo section with tracking details
      {
        type: "cta",
        text: "Track Shipment",
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
    subject: "Your Order Has Shipped!",
  };
}

export const SHIPPING_EMAIL_METADATA = {
  code: "email_shipping_delivery",
  name: "Shipping/Delivery Email",
  description: "Order shipped, delivered, and tracking update emails",
  category: "transactional" as const,
  suggestedSections: ["hero", "body", "shippingInfo", "cta"] as const,
  previewImageUrl: "",
  supportedLanguages: ["en", "de", "es", "fr"],
  author: "System",
  version: "1.0.0",
};
