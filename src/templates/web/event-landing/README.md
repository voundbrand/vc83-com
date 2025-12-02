# Event Landing Page Template

**Template Code:** `event-landing`
**Category:** Web Templates
**Version:** 1.0.0

---

## Overview

Full-featured event landing page template with everything needed for a professional event website:

- **Hero section** with video/image background and CTA buttons
- **About section** with stats grid and key highlights
- **Agenda section** with multi-day schedule
- **Speakers section** with profiles and bios
- **Testimonials section** from past attendees
- **FAQ section** for common questions
- **Sticky checkout sidebar** (desktop) with ticket selection
- **Fixed mobile checkout** bar at bottom
- **Smooth scroll navigation** to all sections

---

## Features

### 🎨 Theme-Agnostic Design
- Works with any theme (modern-gradient, minimalist, etc.)
- All colors, fonts, and spacing from theme object
- CSS variables for complete flexibility

### 📱 Fully Responsive
- Desktop: 2-column layout (content + sticky sidebar)
- Tablet: Optimized grid layouts
- Mobile: Single column + fixed bottom checkout

### 🎯 Conversion-Optimized
- Sticky navigation with CTA
- Multiple CTA placements
- Prominent checkout sidebar
- Mobile-friendly checkout bar

### ⚡ Performance
- Semantic HTML structure
- Efficient CSS with CSS modules
- Optimized for fast loading
- SEO-friendly markup

---

## Content Structure

### Hero Section
```typescript
hero: {
  headline: string              // Main event headline
  subheadline: string          // Supporting text
  date: string                 // "JUNE 15-16, 2025"
  location: string             // "San Francisco Convention Center"
  format: string               // "In-Person & Virtual"
  videoUrl?: string            // Optional background video
  imageUrl?: string            // Fallback background image
  ctaButtons: Array<{
    text: string               // Button text
    url: string                // Button link
    variant: "primary" | "outline"
  }>
}
```

### About Section
```typescript
about: {
  title: string                // Section title
  description: string          // Event overview
  stats: Array<{              // Quick stats grid
    icon: string               // Lucide icon name
    value: string              // "2,500+"
    label: string              // "Attendees"
  }>
  highlights: Array<{         // Key highlights
    icon: string
    title: string
    description: string
  }>
}
```

### Agenda Section
```typescript
agenda: {
  title: string
  days: Array<{
    date: string               // "Day 1 - June 15, 2025"
    sessions: Array<{
      time: string             // "9:00 AM"
      title: string            // Session title
      description?: string     // Session details
      speaker?: string         // Speaker name
      type: "keynote" | "workshop" | "panel" | "break"
    }>
  }>
}
```

### Speakers Section
```typescript
speakers: {
  title: string
  speakers: Array<{
    name: string
    role: string
    company: string
    bio: string
    imageUrl: string           // Headshot
    socialLinks?: {
      twitter?: string
      linkedin?: string
    }
  }>
}
```

### Testimonials Section
```typescript
testimonials: {
  title: string
  testimonials: Array<{
    quote: string
    author: string
    role: string
    company: string
    imageUrl?: string
  }>
}
```

### FAQ Section
```typescript
faq: {
  title: string
  questions: Array<{
    question: string
    answer: string
  }>
}
```

### Checkout Section
```typescript
checkout: {
  title: string                // "Get Your Ticket"
  description: string          // "Early bird pricing ends soon!"
  tickets: Array<{
    name: string               // "In-Person Ticket"
    price: number              // 599
    originalPrice?: number     // 799 (shows crossed out)
    description: string
    features: string[]         // What's included
    checkoutUrl: string        // Link to checkout
  }>
}
```

---

## Usage Example

### 1. Create Event Landing Page

```typescript
// In Web Publishing window
{
  templateCode: "event-landing",
  themeCode: "modern-gradient",
  slug: "ai-conference-2025",
  name: "AI Innovation Conference 2025",
  data: {
    hero: {
      headline: "The Future of AI Innovation",
      subheadline: "Join 2,500+ AI leaders for groundbreaking insights",
      date: "JUNE 15-16, 2025",
      location: "San Francisco Convention Center",
      format: "In-Person & Virtual",
      imageUrl: "/events/ai-conf-hero.jpg",
      ctaButtons: [
        { text: "GET TICKETS →", url: "#checkout", variant: "primary" },
        { text: "VIEW SCHEDULE", url: "#agenda", variant: "outline" }
      ]
    },
    about: {
      title: "Where AI Meets Innovation",
      description: "Two days of cutting-edge AI insights...",
      stats: [
        { icon: "users", value: "2,500+", label: "Attendees" },
        { icon: "lightbulb", value: "50+", label: "Sessions" }
      ],
      highlights: [
        {
          icon: "lightbulb",
          title: "Inspiring Keynotes",
          description: "Hear from AI pioneers..."
        }
      ]
    },
    // ... more sections
  }
}
```

### 2. Published URL
`https://yourdomain.com/ai-conference-2025`

---

## Theme Compatibility

Works with all themes! Example themes:

- **Modern Gradient** - Purple gradient with clean design
- **Minimalist** - Black and white, typography-focused
- **Bold Dark** - Dark mode with high contrast
- **Retro 80s** - Fun retro aesthetic

---

## Customization

### Adding Custom Sections
Edit `index.tsx` to add new sections:

```tsx
{/* Custom Sponsors Section */}
<section className={styles.section} id="sponsors">
  <h2 className={styles.sectionTitle}>Our Sponsors</h2>
  {/* Sponsor logos */}
</section>
```

### Styling Custom Elements
Add to `styles.module.css`:

```css
.sponsorsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-xl);
}
```

### Extending Content Schema
Edit `schema.ts` to add new fields:

```typescript
export interface EventLandingContent {
  // ... existing sections
  sponsors: {
    title: string;
    sponsors: Array<{
      name: string;
      logoUrl: string;
      website: string;
    }>;
  };
}
```

---

## Best Practices

### Images
- **Hero image:** 1920x1080px, optimized for web
- **Speaker photos:** 400x400px, square format
- **Testimonial images:** 200x200px
- Use WebP format for best performance

### Content
- **Headlines:** Keep under 100 characters
- **Descriptions:** 200-300 characters for readability
- **CTAs:** Use action-oriented text ("Get Tickets", not "Click Here")

### SEO
- Set proper meta title and description in page settings
- Use descriptive alt text for images
- Include structured data for events (future enhancement)

---

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

## Related Templates

- **Landing Page** - Simple landing page structure
- **Blog Post** (coming soon) - Article/blog template
- **Product Page** (coming soon) - Product showcase

---

## Support

For issues or questions:
- Check documentation: `/docs/templates/event-landing`
- Contact support: [support@l4yercak3.com](mailto:support@l4yercak3.com)

---

**Built with ❤️ by the l4yercak3 Team**
