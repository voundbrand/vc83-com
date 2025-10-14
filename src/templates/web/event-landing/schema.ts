/**
 * EVENT LANDING PAGE TEMPLATE SCHEMA
 *
 * Defines the editable content structure for the event landing page template.
 * This schema is used to:
 * 1. Generate form fields in the UI
 * 2. Validate content before saving
 * 3. Provide defaults for new pages
 * 4. Type-check content in the template
 */

import { TemplateContentSchema, FieldType } from "../../schema-types";

/**
 * Event Landing Page Content Type
 *
 * TypeScript interface for event landing page content.
 */
export interface EventLandingContent {
  hero: {
    headline: string;
    subheadline: string;
    date: string;
    location: string;
    format: string;
    videoUrl?: string;
    imageUrl?: string;
    ctaButtons: Array<{
      id: string;
      text: string;
      url: string;
      variant: "primary" | "outline";
    }>;
  };
  about: {
    title: string;
    description: string;
    stats: Array<{
      id: string;
      icon: string;
      value: string;
      label: string;
    }>;
    highlights: Array<{
      id: string;
      icon: string;
      title: string;
      description: string;
    }>;
  };
  agenda: {
    title: string;
    subtitle?: string;
    days: Array<{
      id: string;
      date: string;
      sessions: Array<{
        id: string;
        time: string;
        title: string;
        description?: string;
        speaker?: string;
        location?: string;
        type: "keynote" | "workshop" | "panel" | "break" | "session" | "general";
      }>;
    }>;
  };
  speakers: {
    title: string;
    subtitle?: string;
    speakers: Array<{
      id: string;
      name: string;
      role: string;
      company: string;
      bio: string;
      imageUrl: string;
      socialLinks?: {
        twitter?: string;
        linkedin?: string;
      };
    }>;
  };
  testimonials: {
    title: string;
    subtitle?: string;
    testimonials: Array<{
      id: string;
      quote: string;
      author: string;
      role: string;
      company: string;
      imageUrl?: string;
    }>;
  };
  faq: {
    title: string;
    subtitle?: string;
    contactEmail?: string;
    questions: Array<{
      id: string;
      question: string;
      answer: string;
    }>;
  };
  checkout: {
    title: string;
    description: string;
    tickets: Array<{
      id: string;
      name: string;
      price: number;
      originalPrice?: number;
      description: string;
      features: string[];
      checkoutUrl: string;
    }>;
  };
}

/**
 * Event Landing Page Template Schema
 *
 * Describes the structure and UI for editing event landing page content.
 */
export const eventLandingSchema: TemplateContentSchema<EventLandingContent> = {
  templateCode: "event-landing",
  templateName: "Event Landing Page",
  description:
    "Full-featured event landing page with hero, agenda, speakers, testimonials, FAQ, and sticky checkout",

  // Default content for new pages
  defaultContent: {
    hero: {
      headline: "The Future of Innovation Starts Here",
      subheadline:
        "Join industry leaders, innovators, and visionaries for two days of groundbreaking insights, networking, and inspiration.",
      date: "JUNE 15-16, 2025",
      location: "San Francisco Convention Center",
      format: "In-Person & Virtual",
      ctaButtons: [
        {
          id: crypto.randomUUID(),
          text: "GET TICKETS →",
          url: "#checkout",
          variant: "primary",
        },
        {
          id: crypto.randomUUID(),
          text: "VIEW SCHEDULE",
          url: "#agenda",
          variant: "outline",
        },
      ],
    },
    about: {
      title: "Where Innovation Meets Opportunity",
      description:
        "INNOVATE 2025 brings together the brightest minds in technology, business, and design for an unforgettable experience. Discover cutting-edge solutions, forge meaningful connections, and gain insights that will transform your business.",
      stats: [
        {
          id: crypto.randomUUID(),
          icon: "users",
          value: "2,500+",
          label: "Attendees",
        },
        {
          id: crypto.randomUUID(),
          icon: "lightbulb",
          value: "50+",
          label: "Sessions",
        },
        {
          id: crypto.randomUUID(),
          icon: "network",
          value: "100+",
          label: "Speakers",
        },
        {
          id: crypto.randomUUID(),
          icon: "award",
          value: "30+",
          label: "Sponsors",
        },
      ],
      highlights: [
        {
          id: crypto.randomUUID(),
          icon: "lightbulb",
          title: "Inspiring Keynotes",
          description:
            "Hear from industry pioneers and thought leaders shaping the future of technology and business.",
        },
        {
          id: crypto.randomUUID(),
          icon: "network",
          title: "Networking",
          description:
            "Connect with peers, partners, and potential collaborators in dedicated networking sessions.",
        },
        {
          id: crypto.randomUUID(),
          icon: "award",
          title: "Hands-on Workshops",
          description:
            "Participate in interactive sessions and gain practical skills you can apply immediately.",
        },
      ],
    },
    agenda: {
      title: "Event Schedule",
      subtitle: "Two days packed with inspiring talks, hands-on workshops, and networking opportunities.",
      days: [],
    },
    speakers: {
      title: "Featured Speakers",
      subtitle: "Learn from industry leaders and innovators at the forefront of their fields.",
      speakers: [],
    },
    testimonials: {
      title: "What Attendees Say",
      subtitle: "Join thousands of satisfied attendees who have transformed their businesses.",
      testimonials: [],
    },
    faq: {
      title: "Frequently Asked Questions",
      subtitle: "Everything you need to know about attending INNOVATE 2025.",
      questions: [],
      contactEmail: "support@innovate2025.com",
    },
    checkout: {
      title: "Get Your Ticket",
      description: "Early bird pricing ends soon!",
      tickets: [
        {
          id: crypto.randomUUID(),
          name: "In-Person Ticket",
          price: 599,
          originalPrice: 799,
          description: "Full access to all sessions and networking events",
          features: [
            "Access to all sessions",
            "Networking events",
            "Meals included",
            "Swag bag",
            "Recording access",
          ],
          checkoutUrl: "/checkout",
        },
        {
          id: crypto.randomUUID(),
          name: "Virtual Ticket",
          price: 199,
          originalPrice: 299,
          description: "Live stream access and recordings",
          features: [
            "Live stream access",
            "Interactive Q&A",
            "Virtual networking",
            "Recording access",
          ],
          checkoutUrl: "/checkout",
        },
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
          placeholder: "The Future of Innovation Starts Here",
          helpText: "Main headline - make it compelling and event-focused",
          maxLength: 150,
        },
        {
          id: "hero.subheadline",
          label: "Subheadline",
          type: FieldType.Textarea,
          required: true,
          placeholder: "Join industry leaders for two days of insights...",
          helpText: "Supporting text that explains the event value",
          maxLength: 300,
          rows: 3,
        },
        {
          id: "hero.date",
          label: "Event Date",
          type: FieldType.Text,
          required: true,
          placeholder: "JUNE 15-16, 2025",
          maxLength: 50,
        },
        {
          id: "hero.location",
          label: "Location",
          type: FieldType.Text,
          required: true,
          placeholder: "San Francisco Convention Center",
          maxLength: 100,
        },
        {
          id: "hero.format",
          label: "Event Format",
          type: FieldType.Text,
          required: true,
          placeholder: "In-Person & Virtual",
          maxLength: 50,
        },
        {
          id: "hero.videoUrl",
          label: "Hero Video URL",
          type: FieldType.Url,
          required: false,
          helpText: "Optional video for hero background",
        },
        {
          id: "hero.imageUrl",
          label: "Hero Image URL",
          type: FieldType.Image,
          required: false,
          helpText: "Fallback image if no video provided",
        },
        {
          id: "hero.ctaButtons",
          label: "Call to Action Buttons",
          type: FieldType.Repeater,
          minItems: 1,
          maxItems: 3,
          defaultItem: {
            id: "",
            text: "",
            url: "",
            variant: "primary",
          },
          fields: [
            {
              id: "text",
              label: "Button Text",
              type: FieldType.Text,
              required: true,
              placeholder: "GET TICKETS",
              maxLength: 30,
            },
            {
              id: "url",
              label: "Button URL",
              type: FieldType.Url,
              required: true,
              placeholder: "#checkout",
            },
            {
              id: "variant",
              label: "Button Style",
              type: FieldType.Text,
              required: true,
              placeholder: "primary or outline",
              helpText: "Enter 'primary' for filled button or 'outline' for outlined button",
            },
          ],
        },
      ],
    },
    {
      id: "about",
      label: "About Section",
      description: "Event overview, stats, and highlights",
      fields: [
        {
          id: "about.title",
          label: "Section Title",
          type: FieldType.Text,
          required: true,
          placeholder: "Where Innovation Meets Opportunity",
          maxLength: 100,
        },
        {
          id: "about.description",
          label: "Description",
          type: FieldType.Textarea,
          required: true,
          placeholder: "Brief description of the event...",
          maxLength: 500,
          rows: 4,
        },
        {
          id: "about.stats",
          label: "Event Stats",
          type: FieldType.Repeater,
          minItems: 0,
          maxItems: 8,
          defaultItem: {
            id: "",
            icon: "users",
            value: "",
            label: "",
          },
          fields: [
            {
              id: "icon",
              label: "Icon Name",
              type: FieldType.Icon,
              required: true,
              helpText: "Lucide icon name (e.g., 'users', 'lightbulb')",
            },
            {
              id: "value",
              label: "Stat Value",
              type: FieldType.Text,
              required: true,
              placeholder: "2,500+",
              maxLength: 20,
            },
            {
              id: "label",
              label: "Stat Label",
              type: FieldType.Text,
              required: true,
              placeholder: "Attendees",
              maxLength: 50,
            },
          ],
        },
        {
          id: "about.highlights",
          label: "Key Highlights",
          type: FieldType.Repeater,
          minItems: 0,
          maxItems: 6,
          defaultItem: {
            id: "",
            icon: "lightbulb",
            title: "",
            description: "",
          },
          fields: [
            {
              id: "icon",
              label: "Icon Name",
              type: FieldType.Icon,
              required: true,
              helpText: "Lucide icon name",
            },
            {
              id: "title",
              label: "Highlight Title",
              type: FieldType.Text,
              required: true,
              placeholder: "Inspiring Keynotes",
              maxLength: 100,
            },
            {
              id: "description",
              label: "Description",
              type: FieldType.Textarea,
              required: true,
              placeholder: "Hear from industry pioneers...",
              maxLength: 250,
              rows: 3,
            },
          ],
        },
      ],
    },
    {
      id: "agenda",
      label: "Agenda/Schedule",
      description: "Day-by-day event schedule",
      fields: [
        {
          id: "agenda.title",
          label: "Section Title",
          type: FieldType.Text,
          required: true,
          placeholder: "Event Schedule",
          maxLength: 100,
        },
        {
          id: "agenda.subtitle",
          label: "Section Subtitle",
          type: FieldType.Text,
          required: false,
          placeholder: "Two days packed with inspiring talks...",
          maxLength: 200,
        },
        {
          id: "agenda.days",
          label: "Event Days",
          type: FieldType.Repeater,
          minItems: 0,
          maxItems: 10,
          defaultItem: {
            id: "",
            date: "",
            sessions: [],
          },
          fields: [
            {
              id: "date",
              label: "Day/Date",
              type: FieldType.Text,
              required: true,
              placeholder: "Day 1 - June 15, 2025",
              maxLength: 100,
            },
            {
              id: "sessions",
              label: "Sessions",
              type: FieldType.Repeater,
              minItems: 0,
              maxItems: 50,
              defaultItem: {
                id: "",
                time: "",
                title: "",
                description: "",
                speaker: "",
                type: "keynote",
              },
              fields: [
                {
                  id: "time",
                  label: "Time",
                  type: FieldType.Text,
                  required: true,
                  placeholder: "9:00 AM",
                  maxLength: 20,
                },
                {
                  id: "title",
                  label: "Session Title",
                  type: FieldType.Text,
                  required: true,
                  placeholder: "Opening Keynote",
                  maxLength: 150,
                },
                {
                  id: "description",
                  label: "Description",
                  type: FieldType.Textarea,
                  required: false,
                  placeholder: "Session description...",
                  maxLength: 300,
                  rows: 2,
                },
                {
                  id: "speaker",
                  label: "Speaker Name",
                  type: FieldType.Text,
                  required: false,
                  placeholder: "Jane Doe",
                  maxLength: 100,
                },
                {
                  id: "location",
                  label: "Location",
                  type: FieldType.Text,
                  required: false,
                  placeholder: "Main Stage",
                  maxLength: 100,
                  helpText: "Session location (e.g., Main Stage, Hall A, Room 101)",
                },
                {
                  id: "type",
                  label: "Session Type",
                  type: FieldType.Text,
                  required: true,
                  placeholder: "keynote, workshop, panel, break, session, or general",
                  helpText: "Enter session type: keynote, workshop, panel, break, session, or general",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "speakers",
      label: "Speakers",
      description: "Featured speakers and their bios",
      fields: [
        {
          id: "speakers.title",
          label: "Section Title",
          type: FieldType.Text,
          required: true,
          placeholder: "Featured Speakers",
          maxLength: 100,
        },
        {
          id: "speakers.subtitle",
          label: "Section Subtitle",
          type: FieldType.Text,
          required: false,
          placeholder: "Learn from industry leaders...",
          maxLength: 200,
        },
        {
          id: "speakers.speakers",
          label: "Speakers",
          type: FieldType.Repeater,
          minItems: 0,
          maxItems: 100,
          defaultItem: {
            id: "",
            name: "",
            role: "",
            company: "",
            bio: "",
            imageUrl: "",
          },
          fields: [
            {
              id: "name",
              label: "Speaker Name",
              type: FieldType.Text,
              required: true,
              placeholder: "Jane Doe",
              maxLength: 100,
            },
            {
              id: "role",
              label: "Role/Title",
              type: FieldType.Text,
              required: true,
              placeholder: "CEO & Founder",
              maxLength: 100,
            },
            {
              id: "company",
              label: "Company",
              type: FieldType.Text,
              required: true,
              placeholder: "Acme Inc",
              maxLength: 100,
            },
            {
              id: "bio",
              label: "Biography",
              type: FieldType.Textarea,
              required: true,
              placeholder: "Speaker biography...",
              maxLength: 500,
              rows: 4,
            },
            {
              id: "imageUrl",
              label: "Profile Image",
              type: FieldType.Image,
              required: true,
              helpText: "Speaker headshot",
            },
            {
              id: "socialLinks.twitter",
              label: "Twitter URL",
              type: FieldType.Url,
              required: false,
              placeholder: "https://twitter.com/speaker",
            },
            {
              id: "socialLinks.linkedin",
              label: "LinkedIn URL",
              type: FieldType.Url,
              required: false,
              placeholder: "https://linkedin.com/in/speaker",
            },
          ],
        },
      ],
    },
    {
      id: "testimonials",
      label: "Testimonials",
      description: "Past attendee testimonials",
      fields: [
        {
          id: "testimonials.title",
          label: "Section Title",
          type: FieldType.Text,
          required: true,
          placeholder: "What Attendees Say",
          maxLength: 100,
        },
        {
          id: "testimonials.subtitle",
          label: "Section Subtitle",
          type: FieldType.Text,
          required: false,
          placeholder: "Join thousands of satisfied attendees...",
          maxLength: 200,
        },
        {
          id: "testimonials.testimonials",
          label: "Testimonials",
          type: FieldType.Repeater,
          minItems: 0,
          maxItems: 20,
          defaultItem: {
            id: "",
            quote: "",
            author: "",
            role: "",
            company: "",
          },
          fields: [
            {
              id: "quote",
              label: "Testimonial Quote",
              type: FieldType.Textarea,
              required: true,
              placeholder: "This event was transformative...",
              maxLength: 400,
              rows: 3,
            },
            {
              id: "author",
              label: "Author Name",
              type: FieldType.Text,
              required: true,
              placeholder: "John Smith",
              maxLength: 100,
            },
            {
              id: "role",
              label: "Author Role",
              type: FieldType.Text,
              required: true,
              placeholder: "Product Manager",
              maxLength: 100,
            },
            {
              id: "company",
              label: "Company",
              type: FieldType.Text,
              required: true,
              placeholder: "Tech Corp",
              maxLength: 100,
            },
            {
              id: "imageUrl",
              label: "Profile Image",
              type: FieldType.Image,
              required: false,
              helpText: "Optional author photo",
            },
          ],
        },
      ],
    },
    {
      id: "faq",
      label: "FAQ",
      description: "Frequently asked questions",
      fields: [
        {
          id: "faq.title",
          label: "Section Title",
          type: FieldType.Text,
          required: true,
          placeholder: "Frequently Asked Questions",
          maxLength: 100,
        },
        {
          id: "faq.subtitle",
          label: "Section Subtitle",
          type: FieldType.Text,
          required: false,
          placeholder: "Everything you need to know...",
          maxLength: 200,
        },
        {
          id: "faq.contactEmail",
          label: "Contact Email",
          type: FieldType.Email,
          required: false,
          placeholder: "support@event.com",
          helpText: "Email shown in 'Still have questions?' section",
        },
        {
          id: "faq.questions",
          label: "Questions",
          type: FieldType.Repeater,
          minItems: 0,
          maxItems: 30,
          defaultItem: {
            id: "",
            question: "",
            answer: "",
          },
          fields: [
            {
              id: "question",
              label: "Question",
              type: FieldType.Text,
              required: true,
              placeholder: "What is included in the ticket?",
              maxLength: 200,
            },
            {
              id: "answer",
              label: "Answer",
              type: FieldType.Textarea,
              required: true,
              placeholder: "Your ticket includes...",
              maxLength: 800,
              rows: 4,
            },
          ],
        },
      ],
    },
    {
      id: "checkout",
      label: "Checkout/Tickets",
      description: "Ticket options and pricing",
      fields: [
        {
          id: "checkout.title",
          label: "Section Title",
          type: FieldType.Text,
          required: true,
          placeholder: "Get Your Ticket",
          maxLength: 100,
        },
        {
          id: "checkout.description",
          label: "Description",
          type: FieldType.Text,
          required: false,
          placeholder: "Early bird pricing ends soon!",
          maxLength: 200,
        },
        {
          id: "checkout.tickets",
          label: "Ticket Types",
          type: FieldType.Repeater,
          minItems: 1,
          maxItems: 10,
          defaultItem: {
            id: "",
            name: "",
            price: 0,
            description: "",
            features: [],
            checkoutUrl: "",
          },
          fields: [
            {
              id: "name",
              label: "Ticket Name",
              type: FieldType.Text,
              required: true,
              placeholder: "In-Person Ticket",
              maxLength: 100,
            },
            {
              id: "price",
              label: "Price",
              type: FieldType.Number,
              required: true,
              min: 0,
              helpText: "Current price in dollars",
            },
            {
              id: "originalPrice",
              label: "Original Price",
              type: FieldType.Number,
              required: false,
              min: 0,
              helpText: "Optional: Shows as crossed out",
            },
            {
              id: "description",
              label: "Description",
              type: FieldType.Text,
              required: true,
              placeholder: "Full access to all sessions",
              maxLength: 200,
            },
            {
              id: "features",
              label: "Features",
              type: FieldType.TextArray,
              required: true,
              minItems: 1,
              maxItems: 20,
              placeholder: "Access to all sessions, Networking events, Meals included",
              helpText: "What's included in this ticket",
            },
            {
              id: "checkoutUrl",
              label: "Checkout URL",
              type: FieldType.Url,
              required: true,
              placeholder: "/checkout?ticket=in-person",
              helpText: "Link to checkout/payment page",
            },
          ],
        },
      ],
    },
  ],
};
