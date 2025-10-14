/**
 * LANDING PAGE TEMPLATE SCHEMA
 *
 * Defines the editable content structure for the landing page template.
 * This schema is used to:
 * 1. Generate form fields in the UI
 * 2. Validate content before saving
 * 3. Provide defaults for new pages
 * 4. Type-check content in the template
 */

import { TemplateContentSchema, FieldType } from "../../schema-types";

/**
 * Landing Page Content Type
 *
 * TypeScript interface for landing page content.
 */
export interface LandingPageContent {
  hero: {
    headline: string;
    subheadline: string;
    ctaText: string;
    ctaUrl: string;
    backgroundImage?: string;
  };
  features: Array<{
    id: string;
    title: string;
    description: string;
    icon?: string;
  }>;
  testimonials: Array<{
    id: string;
    quote: string;
    author: string;
    role: string;
    avatar?: string;
  }>;
  pricing: {
    plans: Array<{
      id: string;
      name: string;
      price: string;
      features: string[];
      ctaText: string;
      ctaUrl: string;
      highlighted?: boolean;
    }>;
  };
  footer: {
    companyName: string;
    links: Array<{
      id: string;
      text: string;
      url: string;
    }>;
    socialLinks?: {
      twitter?: string;
      linkedin?: string;
      facebook?: string;
      instagram?: string;
    };
  };
}

/**
 * Landing Page Template Schema
 *
 * Describes the structure and UI for editing landing page content.
 */
export const landingPageSchema: TemplateContentSchema<LandingPageContent> = {
  templateCode: "landing-page",
  templateName: "Landing Page",
  description: "Classic landing page with hero, features, testimonials, pricing, and footer",

  // Default content for new pages
  defaultContent: {
    hero: {
      headline: "Transform Your Business Today",
      subheadline: "The all-in-one platform for modern teams",
      ctaText: "Get Started Free",
      ctaUrl: "/signup",
    },
    features: [
      {
        id: crypto.randomUUID(),
        title: "Lightning Fast",
        description: "Built for speed from the ground up",
        icon: "zap",
      },
      {
        id: crypto.randomUUID(),
        title: "Secure by Default",
        description: "Enterprise-grade security included",
        icon: "shield",
      },
      {
        id: crypto.randomUUID(),
        title: "Easy to Use",
        description: "Intuitive interface that anyone can master",
        icon: "smile",
      },
    ],
    testimonials: [],
    pricing: {
      plans: [],
    },
    footer: {
      companyName: "",
      links: [
        { id: crypto.randomUUID(), text: "Privacy", url: "/privacy" },
        { id: crypto.randomUUID(), text: "Terms", url: "/terms" },
        { id: crypto.randomUUID(), text: "Contact", url: "/contact" },
      ],
    },
  },

  // Field definitions for the form
  sections: [
    {
      id: "hero",
      label: "Hero Section",
      description: "The first thing visitors see",
      fields: [
        {
          id: "hero.headline",
          label: "Headline",
          type: FieldType.Text,
          required: true,
          placeholder: "Transform Your Business Today",
          helpText: "Main headline - keep it punchy and benefit-focused",
          maxLength: 100,
        },
        {
          id: "hero.subheadline",
          label: "Subheadline",
          type: FieldType.Textarea,
          required: true,
          placeholder: "The all-in-one platform for modern teams",
          helpText: "Supporting text that explains your value proposition",
          maxLength: 200,
          rows: 2,
        },
        {
          id: "hero.ctaText",
          label: "Call to Action Button Text",
          type: FieldType.Text,
          required: true,
          placeholder: "Get Started Free",
          maxLength: 30,
        },
        {
          id: "hero.ctaUrl",
          label: "Call to Action URL",
          type: FieldType.Url,
          required: true,
          placeholder: "/signup",
          helpText: "Where the button should link to",
        },
        {
          id: "hero.backgroundImage",
          label: "Background Image",
          type: FieldType.Image,
          required: false,
          helpText: "Optional hero background image",
        },
      ],
    },
    {
      id: "features",
      label: "Features",
      description: "Highlight your key features",
      type: FieldType.Repeater,
      minItems: 0,
      maxItems: 12,
      defaultItem: {
        id: "",
        title: "",
        description: "",
        icon: "",
      },
      fields: [
        {
          id: "title",
          label: "Feature Title",
          type: FieldType.Text,
          required: true,
          placeholder: "Lightning Fast",
          maxLength: 50,
        },
        {
          id: "description",
          label: "Feature Description",
          type: FieldType.Textarea,
          required: true,
          placeholder: "Built for speed from the ground up",
          maxLength: 200,
          rows: 3,
        },
        {
          id: "icon",
          label: "Icon Name",
          type: FieldType.Icon,
          required: false,
          helpText: "Lucide icon name (e.g., 'zap', 'shield', 'smile')",
        },
      ],
    },
    {
      id: "testimonials",
      label: "Testimonials",
      description: "Social proof from happy customers",
      type: FieldType.Repeater,
      minItems: 0,
      maxItems: 12,
      defaultItem: {
        id: "",
        quote: "",
        author: "",
        role: "",
      },
      fields: [
        {
          id: "quote",
          label: "Testimonial Quote",
          type: FieldType.Textarea,
          required: true,
          placeholder: "This product changed everything for us!",
          maxLength: 300,
          rows: 3,
        },
        {
          id: "author",
          label: "Author Name",
          type: FieldType.Text,
          required: true,
          placeholder: "Jane Doe",
          maxLength: 100,
        },
        {
          id: "role",
          label: "Author Role",
          type: FieldType.Text,
          required: true,
          placeholder: "CEO, Acme Inc",
          maxLength: 100,
        },
        {
          id: "avatar",
          label: "Avatar Image",
          type: FieldType.Image,
          required: false,
          helpText: "Optional customer photo",
        },
      ],
    },
    {
      id: "pricing",
      label: "Pricing Plans",
      description: "Your product pricing",
      fields: [
        {
          id: "pricing.plans",
          label: "Plans",
          type: FieldType.Repeater,
          minItems: 0,
          maxItems: 6,
          defaultItem: {
            id: "",
            name: "",
            price: "",
            features: [],
            ctaText: "",
            ctaUrl: "",
            highlighted: false,
          },
          fields: [
            {
              id: "name",
              label: "Plan Name",
              type: FieldType.Text,
              required: true,
              placeholder: "Starter",
              maxLength: 50,
            },
            {
              id: "price",
              label: "Price",
              type: FieldType.Text,
              required: true,
              placeholder: "$29/mo",
              helpText: "Display price (e.g., '$29/mo' or 'Free')",
              maxLength: 30,
            },
            {
              id: "features",
              label: "Features",
              type: FieldType.TextArray,
              required: true,
              minItems: 1,
              maxItems: 20,
              placeholder: "10 users, Basic support, 1GB storage",
              helpText: "Add features one per line or comma-separated",
            },
            {
              id: "ctaText",
              label: "Button Text",
              type: FieldType.Text,
              required: true,
              placeholder: "Start Free Trial",
              maxLength: 30,
            },
            {
              id: "ctaUrl",
              label: "Button URL",
              type: FieldType.Url,
              required: true,
              placeholder: "/signup?plan=starter",
            },
            {
              id: "highlighted",
              label: "Highlight This Plan",
              type: FieldType.Boolean,
              required: false,
              helpText: "Show this plan with special styling",
            },
          ],
        },
      ],
    },
    {
      id: "footer",
      label: "Footer",
      description: "Footer links and company info",
      fields: [
        {
          id: "footer.companyName",
          label: "Company Name",
          type: FieldType.Text,
          required: false,
          placeholder: "Acme Inc",
          maxLength: 100,
        },
        {
          id: "footer.links",
          label: "Footer Links",
          type: FieldType.Repeater,
          minItems: 0,
          maxItems: 20,
          defaultItem: {
            id: "",
            text: "",
            url: "",
          },
          fields: [
            {
              id: "text",
              label: "Link Text",
              type: FieldType.Text,
              required: true,
              placeholder: "About",
              maxLength: 50,
            },
            {
              id: "url",
              label: "Link URL",
              type: FieldType.Url,
              required: true,
              placeholder: "/about",
            },
          ],
        },
        {
          id: "footer.socialLinks.twitter",
          label: "Twitter URL",
          type: FieldType.Url,
          required: false,
          placeholder: "https://twitter.com/yourcompany",
        },
        {
          id: "footer.socialLinks.linkedin",
          label: "LinkedIn URL",
          type: FieldType.Url,
          required: false,
          placeholder: "https://linkedin.com/company/yourcompany",
        },
        {
          id: "footer.socialLinks.facebook",
          label: "Facebook URL",
          type: FieldType.Url,
          required: false,
          placeholder: "https://facebook.com/yourcompany",
        },
        {
          id: "footer.socialLinks.instagram",
          label: "Instagram URL",
          type: FieldType.Url,
          required: false,
          placeholder: "https://instagram.com/yourcompany",
        },
      ],
    },
  ],
};
