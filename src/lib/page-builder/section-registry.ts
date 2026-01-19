/**
 * SECTION REGISTRY
 *
 * TypeScript definitions for AI-generated page sections.
 * The AI outputs JSON matching these interfaces, and the PageRenderer
 * maps them to React components.
 */

// ============================================================================
// SECTION TYPES
// ============================================================================

export type SectionType =
  | "hero"
  | "features"
  | "cta"
  | "testimonials"
  | "pricing"
  | "gallery"
  | "team"
  | "faq"
  | "process"
  | "booking";

// ============================================================================
// CTA ACTION TYPES
// ============================================================================

export type CTAActionType = "link" | "booking" | "form" | "scroll" | "contact";

export interface CTAConfig {
  text: string;
  href?: string;
  actionType?: CTAActionType;
  variant?: "primary" | "secondary" | "outline";
  className?: string;
  // Integration references
  bookingResourceId?: string;
  formId?: string;
  contactEmail?: string;
}

// ============================================================================
// BASE SECTION
// ============================================================================

interface BaseSection {
  id: string; // Unique section ID (e.g., "sec_abc123")
  type: SectionType;
  className?: string; // Custom Tailwind classes for section wrapper
}

// ============================================================================
// HERO SECTION
// ============================================================================

export interface HeroSectionProps {
  badge?: string;
  title: string;
  subtitle?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  backgroundClassName?: string;
  alignment?: "left" | "center" | "right";
  cta?: CTAConfig;
  secondaryCta?: CTAConfig;
  image?: {
    src: string;
    alt: string;
    className?: string;
  };

  // Premium: Full-viewport background image with overlay
  backgroundImage?: {
    src: string;
    alt: string;
    overlay?: string; // Tailwind gradient, e.g., "bg-gradient-to-b from-black/40 via-black/20 to-black/60"
  };

  // Premium: Image slider/carousel (auto-rotating hero images)
  slider?: {
    images: Array<{ src: string; alt: string }>;
    autoPlay?: boolean;
    interval?: number; // ms, default 5000
    showControls?: boolean;
    showIndicators?: boolean;
  };

  // Premium: Full viewport height
  fullHeight?: boolean | string; // true = h-screen, string = custom like "h-[85vh]"

  // Premium: Scroll indicator with animation
  scrollIndicator?: {
    enabled: boolean;
    targetId?: string; // e.g., "#about"
    animation?: "bounce" | "pulse";
  };
}

export interface HeroSection extends BaseSection {
  type: "hero";
  props: HeroSectionProps;
}

// ============================================================================
// FEATURES SECTION
// ============================================================================

export interface FeatureItem {
  id: string;
  icon?: string; // Lucide icon name
  title: string;
  description: string;
  titleClassName?: string;
  descriptionClassName?: string;
  iconClassName?: string;

  // Premium: Card image (for "cards" layout variant)
  image?: {
    src: string;
    alt: string;
    className?: string;
  };

  // Premium: Per-item CTA button
  cta?: CTAConfig;
}

export interface FeaturesSectionProps {
  badge?: string;
  title: string;
  subtitle?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  backgroundClassName?: string;
  layout?: "grid-2" | "grid-3" | "grid-4" | "list" | "cards"; // "cards" = image cards with CTAs
  features: FeatureItem[];
}

export interface FeaturesSection extends BaseSection {
  type: "features";
  props: FeaturesSectionProps;
}

// ============================================================================
// CTA SECTION
// ============================================================================

export interface CTASectionProps {
  title: string;
  description?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  backgroundClassName?: string;
  alignment?: "left" | "center" | "right";
  primaryCta: CTAConfig;
  secondaryCta?: CTAConfig;
}

export interface CTASection extends BaseSection {
  type: "cta";
  props: CTASectionProps;
}

// ============================================================================
// TESTIMONIALS SECTION
// ============================================================================

export interface TestimonialItem {
  id: string;
  quote: string;
  author: string;
  role?: string;
  company?: string;
  avatar?: string;
  rating?: number; // 1-5 stars
}

export interface TestimonialsSectionProps {
  badge?: string;
  title: string;
  subtitle?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  backgroundClassName?: string;
  layout?: "grid" | "carousel" | "single";
  testimonials: TestimonialItem[];
}

export interface TestimonialsSection extends BaseSection {
  type: "testimonials";
  props: TestimonialsSectionProps;
}

// ============================================================================
// PRICING SECTION
// ============================================================================

export interface PricingFeature {
  text: string;
  included: boolean;
}

export interface PricingTier {
  id: string;
  name: string;
  description?: string;
  price: string; // e.g., "€99", "$29/mo", "Free"
  priceSubtext?: string; // e.g., "per month", "one-time"
  highlighted?: boolean; // Popular/recommended tier
  features: PricingFeature[];
  cta: CTAConfig;
}

export interface PricingSectionProps {
  badge?: string;
  title: string;
  subtitle?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  backgroundClassName?: string;
  tiers: PricingTier[];
}

export interface PricingSection extends BaseSection {
  type: "pricing";
  props: PricingSectionProps;
}

// ============================================================================
// GALLERY SECTION
// ============================================================================

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  caption?: string;
}

export interface GallerySectionProps {
  badge?: string;
  title: string;
  subtitle?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  backgroundClassName?: string;
  layout?: "grid-2" | "grid-3" | "grid-4" | "masonry";
  images: GalleryImage[];
}

export interface GallerySection extends BaseSection {
  type: "gallery";
  props: GallerySectionProps;
}

// ============================================================================
// TEAM SECTION
// ============================================================================

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio?: string;
  image?: string;
  social?: {
    linkedin?: string;
    twitter?: string;
    email?: string;
  };
}

export interface TeamSectionProps {
  badge?: string;
  title: string;
  subtitle?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  backgroundClassName?: string;
  layout?: "grid-2" | "grid-3" | "grid-4";
  members: TeamMember[];
}

export interface TeamSection extends BaseSection {
  type: "team";
  props: TeamSectionProps;
}

// ============================================================================
// FAQ SECTION
// ============================================================================

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface FAQSectionProps {
  badge?: string;
  title: string;
  subtitle?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  backgroundClassName?: string;
  layout?: "accordion" | "grid";
  faqs: FAQItem[];
}

export interface FAQSection extends BaseSection {
  type: "faq";
  props: FAQSectionProps;
}

// ============================================================================
// PROCESS/STEPS SECTION
// ============================================================================

export interface ProcessStep {
  id: string;
  number?: number;
  icon?: string; // Lucide icon name
  title: string;
  description: string;
}

export interface ProcessSectionProps {
  badge?: string;
  title: string;
  subtitle?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  backgroundClassName?: string;
  layout?: "horizontal" | "vertical" | "alternating";
  steps: ProcessStep[];
}

export interface ProcessSection extends BaseSection {
  type: "process";
  props: ProcessSectionProps;
}

// ============================================================================
// BOOKING SECTION
// ============================================================================

export interface BookingSectionProps {
  badge?: string;
  title?: string;
  subtitle?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  backgroundClassName?: string;
  /** Reference to booking resource ID */
  resourceId: string;
  /** Show pricing information */
  showPricing?: boolean;
  /** Price per unit (e.g., 75 for €75/night) */
  pricePerUnit?: number;
  /** Price unit label */
  priceUnit?: "night" | "hour" | "person" | "session";
  /** Which input fields to show */
  fields?: Array<"dates" | "guests" | "time">;
  /** Layout variant */
  layout?: "inline" | "card" | "sidebar";
}

export interface BookingSection extends BaseSection {
  type: "booking";
  props: BookingSectionProps;
}

// ============================================================================
// UNION TYPE
// ============================================================================

export type PageSection =
  | HeroSection
  | FeaturesSection
  | CTASection
  | TestimonialsSection
  | PricingSection
  | GallerySection
  | TeamSection
  | FAQSection
  | ProcessSection
  | BookingSection;

// ============================================================================
// SECTION DEFAULTS
// ============================================================================

export const sectionDefaults: Record<SectionType, object> = {
  hero: {
    props: {
      alignment: "center",
      backgroundClassName:
        "bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-16 sm:py-24",
      titleClassName:
        "text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 tracking-tight",
      subtitleClassName:
        "text-lg sm:text-xl text-gray-600 mt-6 max-w-2xl mx-auto",
    },
  },
  features: {
    props: {
      layout: "grid-3",
      backgroundClassName: "bg-white py-16 sm:py-24",
      titleClassName: "text-3xl sm:text-4xl font-bold text-gray-900",
      subtitleClassName: "text-lg text-gray-600 mt-4 max-w-2xl mx-auto",
    },
  },
  cta: {
    props: {
      alignment: "center",
      backgroundClassName:
        "bg-gradient-to-r from-indigo-600 to-purple-600 py-16 sm:py-20",
      titleClassName: "text-3xl sm:text-4xl font-bold text-white",
      descriptionClassName: "text-indigo-100 mt-4 max-w-xl mx-auto",
    },
  },
  testimonials: {
    props: {
      layout: "grid",
      backgroundClassName: "bg-gray-50 py-16 sm:py-24",
      titleClassName: "text-3xl sm:text-4xl font-bold text-gray-900",
      subtitleClassName: "text-lg text-gray-600 mt-4 max-w-2xl mx-auto",
    },
  },
  pricing: {
    props: {
      backgroundClassName: "bg-white py-16 sm:py-24",
      titleClassName: "text-3xl sm:text-4xl font-bold text-gray-900",
      subtitleClassName: "text-lg text-gray-600 mt-4 max-w-2xl mx-auto",
    },
  },
  gallery: {
    props: {
      layout: "grid-3",
      backgroundClassName: "bg-white py-16 sm:py-24",
      titleClassName: "text-3xl sm:text-4xl font-bold text-gray-900",
      subtitleClassName: "text-lg text-gray-600 mt-4 max-w-2xl mx-auto",
    },
  },
  team: {
    props: {
      layout: "grid-3",
      backgroundClassName: "bg-gray-50 py-16 sm:py-24",
      titleClassName: "text-3xl sm:text-4xl font-bold text-gray-900",
      subtitleClassName: "text-lg text-gray-600 mt-4 max-w-2xl mx-auto",
    },
  },
  faq: {
    props: {
      layout: "accordion",
      backgroundClassName: "bg-white py-16 sm:py-24",
      titleClassName: "text-3xl sm:text-4xl font-bold text-gray-900",
      subtitleClassName: "text-lg text-gray-600 mt-4 max-w-2xl mx-auto",
    },
  },
  process: {
    props: {
      layout: "horizontal",
      backgroundClassName: "bg-gray-50 py-16 sm:py-24",
      titleClassName: "text-3xl sm:text-4xl font-bold text-gray-900",
      subtitleClassName: "text-lg text-gray-600 mt-4 max-w-2xl mx-auto",
    },
  },
  booking: {
    props: {
      layout: "card",
      backgroundClassName: "bg-white py-16 sm:py-24",
      titleClassName: "text-3xl sm:text-4xl font-bold text-gray-900",
      subtitleClassName: "text-lg text-gray-600 mt-4 max-w-2xl mx-auto",
      fields: ["dates", "guests"],
      showPricing: true,
    },
  },
};

// ============================================================================
// EDITABLE PROPS MAPPING
// ============================================================================

/**
 * Maps section types to their editable properties.
 * These connect to the EditableText system for post-generation editing.
 * Path notation: "props.field" or "props.array.*.field" for arrays
 */
export const editablePropsMap: Record<SectionType, string[]> = {
  hero: [
    "props.badge",
    "props.title",
    "props.subtitle",
    "props.cta.text",
    "props.secondaryCta.text",
  ],
  features: [
    "props.badge",
    "props.title",
    "props.subtitle",
    "props.features.*.title",
    "props.features.*.description",
  ],
  cta: [
    "props.title",
    "props.description",
    "props.primaryCta.text",
    "props.secondaryCta.text",
  ],
  testimonials: [
    "props.badge",
    "props.title",
    "props.subtitle",
    "props.testimonials.*.quote",
    "props.testimonials.*.author",
    "props.testimonials.*.role",
  ],
  pricing: [
    "props.badge",
    "props.title",
    "props.subtitle",
    "props.tiers.*.name",
    "props.tiers.*.description",
    "props.tiers.*.price",
    "props.tiers.*.features.*.text",
  ],
  gallery: [
    "props.badge",
    "props.title",
    "props.subtitle",
    "props.images.*.caption",
  ],
  team: [
    "props.badge",
    "props.title",
    "props.subtitle",
    "props.members.*.name",
    "props.members.*.role",
    "props.members.*.bio",
  ],
  faq: [
    "props.badge",
    "props.title",
    "props.subtitle",
    "props.faqs.*.question",
    "props.faqs.*.answer",
  ],
  process: [
    "props.badge",
    "props.title",
    "props.subtitle",
    "props.steps.*.title",
    "props.steps.*.description",
  ],
  booking: [
    "props.badge",
    "props.title",
    "props.subtitle",
  ],
};

// ============================================================================
// LUCIDE ICONS WHITELIST
// ============================================================================

/**
 * Common Lucide icons that the AI can use for features.
 * This helps the AI choose from a curated set rather than inventing icons.
 */
export const allowedIcons = [
  // General
  "Check",
  "CheckCircle",
  "CheckCircle2",
  "Star",
  "Heart",
  "ThumbsUp",
  "Award",
  "Trophy",
  "Target",
  "Zap",
  "Sparkles",
  "Flame",
  "Rocket",
  // Business
  "Users",
  "UserPlus",
  "Building",
  "Briefcase",
  "DollarSign",
  "CreditCard",
  "TrendingUp",
  "BarChart",
  "PieChart",
  "LineChart",
  // Tech
  "Globe",
  "Smartphone",
  "Laptop",
  "Monitor",
  "Wifi",
  "Cloud",
  "Database",
  "Server",
  "Lock",
  "Shield",
  "ShieldCheck",
  "Key",
  // Communication
  "Mail",
  "MessageSquare",
  "MessageCircle",
  "Phone",
  "Video",
  "Headphones",
  "Bell",
  "Send",
  // Time & Calendar
  "Clock",
  "Calendar",
  "CalendarDays",
  "Timer",
  "Hourglass",
  // Navigation
  "ArrowRight",
  "ArrowUp",
  "ChevronRight",
  "ExternalLink",
  "Link",
  "MapPin",
  "Navigation",
  "Compass",
  // Content
  "FileText",
  "File",
  "Folder",
  "Image",
  "Camera",
  "Play",
  "Download",
  "Upload",
  // Tools
  "Settings",
  "Wrench",
  "Hammer",
  "Pencil",
  "Edit",
  "Brush",
  "Palette",
  // Nature
  "Sun",
  "Moon",
  "Leaf",
  "Tree",
  "Flower",
  "Mountain",
  "Waves",
  "Wind",
  "Anchor",
  "Ship",
  // Misc
  "Gift",
  "Package",
  "ShoppingCart",
  "ShoppingBag",
  "Tag",
  "Bookmark",
  "Flag",
  "Lightbulb",
  "Puzzle",
  "Layers",
  // Numbers (for process steps)
  "CircleDot",
  "Circle",
  "Square",
  // Quote
  "Quote",
  "MessageQuote",
] as const;

export type AllowedIcon = (typeof allowedIcons)[number];
