/**
 * ACCOUNT MANAGEMENT EMAIL TEMPLATE
 *
 * Account creation, verification, password reset emails.
 *
 * Suggested sections: hero, body, accountDetails, cta
 */

import type { EmailTemplateProps, EmailTemplateOutput } from "../types";
import type { GenericEmailProps } from "../generic-types";
import { GenericEmailTemplate } from "../generic/index";

export function AccountEmailTemplate(props: EmailTemplateProps): EmailTemplateOutput {
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
        title: "Welcome!",
      },
      {
        type: "body",
        paragraphs: [
          "Your account has been created successfully.",
          "Get started by verifying your email address.",
        ],
      },
      // AI adds accountDetails section with verification link
      {
        type: "cta",
        text: "Get Started",
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
    subject: `Welcome to ${props.domain.displayName || props.domain.domainName}!`,
  };
}

export const ACCOUNT_EMAIL_METADATA = {
  code: "email_account_management",
  name: "Account Management Email",
  description: "Account creation, verification, and password reset emails",
  category: "system" as const,
  suggestedSections: ["hero", "body", "accountDetails", "cta"] as const,
  previewImageUrl: "",
  supportedLanguages: ["en", "de", "es", "fr"],
  author: "System",
  version: "1.0.0",
};
