#!/usr/bin/env npx tsx
/**
 * SYNTHETIC TRAINING DATA GENERATOR
 *
 * Generates training examples from v0 prototypes for fine-tuning custom models.
 * Each template produces multiple training examples with varied prompts.
 *
 * Usage:
 *   npx tsx scripts/training/generate-synthetic.ts
 *   npx tsx scripts/training/generate-synthetic.ts --output ./output.jsonl
 *   npx tsx scripts/training/generate-synthetic.ts --templates sailing-school,cafe-website
 *
 * Output: JSONL file in Hugging Face instruction format
 */

import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TYPES
// ============================================================================

interface HuggingFaceExample {
  instruction: string;
  input: string;
  output: string;
  metadata: {
    example_type: "page_generation";
    source: "synthetic";
    template_name: string;
    prompt_variant: number;
    sections_count: number;
  };
}

interface TemplateConfig {
  name: string;
  industry: string;
  description: string;
  sections: SectionConfig[];
  theme: ThemeConfig;
  promptVariants: PromptVariant[];
}

interface SectionConfig {
  type: string;
  props: Record<string, unknown>;
}

interface ThemeConfig {
  primaryColor: string;
  secondaryColor?: string;
  fontFamily?: string;
  borderRadius?: string;
}

interface PromptVariant {
  instruction: string;
  input: string;
  emphasis?: string[]; // Which aspects to emphasize
}

// ============================================================================
// TEMPLATE DEFINITIONS
// ============================================================================

const TEMPLATES: TemplateConfig[] = [
  // 1. SAILING SCHOOL
  {
    name: "sailing-school",
    industry: "maritime education",
    description: "Professional sailing school in Germany offering courses from beginner to advanced certification",
    theme: {
      primaryColor: "#0369a1", // Ocean blue
      secondaryColor: "#0ea5e9",
      fontFamily: "Inter",
      borderRadius: "lg",
    },
    sections: [
      {
        type: "hero",
        props: {
          title: "Learn to Sail on the Baltic Sea",
          subtitle: "Professional sailing courses from beginner to certification. Join 2,000+ graduates who learned with us.",
          alignment: "center",
          backgroundImage: {
            src: "/sailing-boat-on-baltic-sea.jpg",
            alt: "Sailing boat on Baltic Sea",
            overlay: "bg-gradient-to-b from-black/40 via-black/20 to-black/60",
          },
          fullHeight: "h-[85vh]",
          cta: { text: "View Courses", href: "#courses", actionType: "scroll" },
          secondaryCta: { text: "Book Trial Lesson", href: "#booking", actionType: "booking" },
        },
      },
      {
        type: "features",
        props: {
          title: "Why Choose Our Sailing School",
          subtitle: "Experience makes the difference",
          layout: "grid-4",
          features: [
            { id: "f1", icon: "Award", title: "Certified Instructors", description: "All instructors hold international certifications" },
            { id: "f2", icon: "Ship", title: "Modern Fleet", description: "Well-maintained boats from 24 to 42 feet" },
            { id: "f3", icon: "Users", title: "Small Groups", description: "Maximum 4 students per instructor" },
            { id: "f4", icon: "Calendar", title: "Flexible Scheduling", description: "Weekend and weekday courses available" },
          ],
        },
      },
      {
        type: "process",
        props: {
          title: "Your Path to Sailing",
          subtitle: "From complete beginner to confident skipper",
          layout: "horizontal",
          steps: [
            { id: "s1", number: 1, title: "Trial Lesson", description: "Experience sailing with a 3-hour introductory session" },
            { id: "s2", number: 2, title: "Basic Course", description: "Learn fundamentals over 5 days with theory and practice" },
            { id: "s3", number: 3, title: "Certification", description: "Pass your SBF-See exam and earn your license" },
            { id: "s4", number: 4, title: "Advanced Training", description: "Continue with night sailing, navigation, and more" },
          ],
        },
      },
      {
        type: "pricing",
        props: {
          title: "Course Pricing",
          subtitle: "Invest in a lifetime skill",
          tiers: [
            {
              id: "t1",
              name: "Trial Lesson",
              description: "Perfect for beginners",
              price: "€89",
              priceSubtext: "3 hours",
              features: [
                { text: "Hands-on sailing experience", included: true },
                { text: "Safety briefing", included: true },
                { text: "Equipment provided", included: true },
              ],
              cta: { text: "Book Now", actionType: "booking" },
            },
            {
              id: "t2",
              name: "Basic Course",
              description: "Complete sailing foundation",
              price: "€599",
              priceSubtext: "5 days",
              highlighted: true,
              features: [
                { text: "Theory and practical training", included: true },
                { text: "Course materials included", included: true },
                { text: "Exam preparation", included: true },
                { text: "Certificate upon completion", included: true },
              ],
              cta: { text: "Enroll Now", actionType: "booking" },
            },
            {
              id: "t3",
              name: "SBF-See License",
              description: "Official certification",
              price: "€899",
              priceSubtext: "including exam fees",
              features: [
                { text: "Complete basic course", included: true },
                { text: "Official exam registration", included: true },
                { text: "Practice tests", included: true },
                { text: "License card", included: true },
              ],
              cta: { text: "Get Certified", actionType: "booking" },
            },
          ],
        },
      },
      {
        type: "testimonials",
        props: {
          title: "What Our Students Say",
          layout: "grid",
          testimonials: [
            { id: "r1", quote: "Finally achieved my dream of getting a sailing license. The instructors were patient and professional.", author: "Thomas M.", role: "SBF-See Graduate", rating: 5 },
            { id: "r2", quote: "Small groups meant lots of hands-on time. I felt confident after just the first day.", author: "Anna K.", role: "Basic Course Graduate", rating: 5 },
            { id: "r3", quote: "Beautiful location on the Baltic Sea. Learning to sail here was an unforgettable experience.", author: "Michael S.", role: "Advanced Course Graduate", rating: 5 },
          ],
        },
      },
      {
        type: "gallery",
        props: {
          title: "Life at the School",
          subtitle: "See what awaits you",
          layout: "grid-3",
          images: [
            { id: "g1", src: "/gallery-1.jpg", alt: "Students rigging a sailboat" },
            { id: "g2", src: "/gallery-2.jpg", alt: "Sailing on the Baltic Sea" },
            { id: "g3", src: "/gallery-3.jpg", alt: "Theory classroom session" },
            { id: "g4", src: "/gallery-4.jpg", alt: "Sunset sailing" },
            { id: "g5", src: "/gallery-5.jpg", alt: "Group photo of graduates" },
            { id: "g6", src: "/gallery-6.jpg", alt: "Docking practice" },
          ],
        },
      },
      {
        type: "team",
        props: {
          title: "Meet Your Instructors",
          subtitle: "Experienced professionals passionate about sailing",
          layout: "grid-3",
          members: [
            { id: "m1", name: "Captain Hans Weber", role: "Head Instructor", bio: "30 years sailing experience, 15 years teaching" },
            { id: "m2", name: "Marina Schmidt", role: "Senior Instructor", bio: "Former competitive sailor, specializes in youth programs" },
            { id: "m3", name: "Peter Lange", role: "Instructor", bio: "Navigation expert with ocean crossing experience" },
          ],
        },
      },
      {
        type: "faq",
        props: {
          title: "Frequently Asked Questions",
          layout: "accordion",
          faqs: [
            { id: "q1", question: "Do I need any prior experience?", answer: "No! Our courses are designed for complete beginners. We'll teach you everything from scratch." },
            { id: "q2", question: "What should I bring?", answer: "Comfortable clothes, non-marking shoes, sunglasses, and sunscreen. We provide all sailing equipment." },
            { id: "q3", question: "What if the weather is bad?", answer: "Safety comes first. If conditions are unsuitable, we'll reschedule at no extra cost." },
            { id: "q4", question: "How long until I can sail alone?", answer: "After completing our 5-day basic course, most students are ready for supervised solo sailing." },
          ],
        },
      },
      {
        type: "cta",
        props: {
          title: "Ready to Set Sail?",
          description: "Book your first lesson today and start your sailing journey",
          alignment: "center",
          primaryCta: { text: "Book Trial Lesson", actionType: "booking" },
          secondaryCta: { text: "Contact Us", actionType: "contact" },
        },
      },
    ],
    promptVariants: [
      {
        instruction: "Create a landing page for a sailing school in Germany. Include hero with booking CTA, course pricing, instructor team, testimonials, FAQ, and a gallery.",
        input: "Industry: maritime education. Location: Baltic Sea. Features needed: course booking, instructor profiles, student testimonials, course pricing tiers.",
      },
      {
        instruction: "Build a professional website for a sailing academy offering certification courses. The page should convert visitors into course bookings.",
        input: "Focus on: trust signals (certifications, testimonials), clear pricing, easy booking process. Target audience: adults wanting sailing licenses.",
      },
      {
        instruction: "Design a landing page for Baltic Sea sailing courses with emphasis on the learning journey from beginner to certified skipper.",
        input: "Show progression through courses (trial → basic → certification). Include pricing, FAQ, and social proof from graduates.",
      },
      {
        instruction: "Create a sailing school website with German audience in mind. Professional but approachable tone, focus on course offerings and instructor expertise.",
        input: "Key sections: hero, why us features, learning process steps, pricing tiers, testimonials, team, FAQ, booking CTA.",
      },
      {
        instruction: "I need a website for my sailing school that shows our courses, prices, and lets people book lessons online.",
        input: "We offer trial lessons (€89), basic courses (€599), and certification courses (€899). We have 3 instructors and are located on the Baltic Sea.",
      },
      {
        instruction: "Make a landing page for a water sports education business. Should look professional and trustworthy.",
        input: "Business type: sailing school. Need to show: course options, pricing, team, student reviews. Must have booking functionality.",
      },
    ],
  },

  // 2. CAFE WEBSITE
  {
    name: "cafe-website",
    industry: "food & beverage",
    description: "Cozy neighborhood café with specialty coffee and artisan baked goods",
    theme: {
      primaryColor: "#78350f", // Coffee brown
      secondaryColor: "#f59e0b",
      fontFamily: "Playfair Display",
      borderRadius: "md",
    },
    sections: [
      {
        type: "hero",
        props: {
          title: "Artisan Coffee & Fresh Pastries",
          subtitle: "Your neighborhood café since 2015. Handcrafted drinks, locally-sourced ingredients, and a warm atmosphere.",
          alignment: "center",
          backgroundImage: {
            src: "/cafe-interior.jpg",
            alt: "Cozy café interior",
            overlay: "bg-gradient-to-b from-black/30 to-black/50",
          },
          fullHeight: true,
          cta: { text: "View Menu", href: "#menu", actionType: "scroll" },
          secondaryCta: { text: "Reserve Table", href: "#booking", actionType: "booking" },
        },
      },
      {
        type: "features",
        props: {
          title: "What Makes Us Special",
          layout: "grid-3",
          features: [
            { id: "f1", icon: "Coffee", title: "Specialty Coffee", description: "Single-origin beans roasted locally, brewed with precision" },
            { id: "f2", icon: "Cake", title: "Fresh Pastries", description: "Baked in-house daily using traditional recipes" },
            { id: "f3", icon: "Leaf", title: "Local Ingredients", description: "Partnering with regional farms and suppliers" },
          ],
        },
      },
      {
        type: "gallery",
        props: {
          title: "Our Creations",
          subtitle: "A taste of what awaits",
          layout: "grid-3",
          images: [
            { id: "g1", src: "/latte-art.jpg", alt: "Latte art" },
            { id: "g2", src: "/croissants.jpg", alt: "Fresh croissants" },
            { id: "g3", src: "/cafe-seating.jpg", alt: "Cozy seating area" },
          ],
        },
      },
      {
        type: "testimonials",
        props: {
          title: "What Our Guests Say",
          layout: "carousel",
          testimonials: [
            { id: "r1", quote: "Best cappuccino in the city. The atmosphere is perfect for both work and relaxation.", author: "Sarah L.", rating: 5 },
            { id: "r2", quote: "Their almond croissants are addictive! I come here every Sunday morning.", author: "Marcus T.", rating: 5 },
          ],
        },
      },
      {
        type: "cta",
        props: {
          title: "Visit Us Today",
          description: "Open daily 7am - 7pm. Walk-ins welcome, reservations recommended for weekends.",
          alignment: "center",
          primaryCta: { text: "Get Directions", actionType: "link", href: "#" },
          secondaryCta: { text: "See Menu", actionType: "scroll", href: "#menu" },
        },
      },
    ],
    promptVariants: [
      {
        instruction: "Create a landing page for a cozy neighborhood café featuring specialty coffee and artisan pastries.",
        input: "Industry: food & beverage. Atmosphere: warm, inviting. Key features: specialty coffee, fresh baked goods, local ingredients.",
      },
      {
        instruction: "Design a café website that showcases artisan coffee culture and homemade pastries with a warm, inviting aesthetic.",
        input: "Target audience: coffee enthusiasts, remote workers, weekend brunch seekers. Include gallery and testimonials.",
      },
      {
        instruction: "Build a simple but elegant landing page for a coffee shop. Focus on the quality of products and cozy atmosphere.",
        input: "Sections needed: hero with atmosphere photo, features highlighting specialties, gallery, testimonials, location/hours CTA.",
      },
      {
        instruction: "I want a website for my café that shows off our coffee and pastries. Should feel warm and welcoming.",
        input: "We specialize in single-origin coffee and fresh-baked pastries. Open 7am-7pm daily. Need to show photos and reviews.",
      },
      {
        instruction: "Create a landing page for an artisan coffee shop with a focus on local sourcing and handcrafted drinks.",
        input: "Style: cozy, warm, artisan. Features: specialty coffee, in-house baking, local ingredients. Include social proof.",
      },
      {
        instruction: "Design a website for a neighborhood café that emphasizes the quality of their coffee and baked goods.",
        input: "Key selling points: single-origin beans, fresh daily pastries, cozy atmosphere. Include photos and customer reviews.",
      },
    ],
  },

  // 3. VACATION RENTAL
  {
    name: "vacation-rental",
    industry: "hospitality",
    description: "Charming German countryside pension with cozy rooms and regional breakfast",
    theme: {
      primaryColor: "#166534", // Forest green
      secondaryColor: "#84cc16",
      fontFamily: "Merriweather",
      borderRadius: "lg",
    },
    sections: [
      {
        type: "hero",
        props: {
          title: "Pension Landstübchen",
          subtitle: "Romantic countryside retreat in Viereck. Surrounded by forests and meadows, perfect for peace and relaxation.",
          alignment: "center",
          slider: {
            images: [
              { src: "/pension-exterior.jpg", alt: "Traditional half-timbered house" },
              { src: "/double-room.jpg", alt: "Cozy double room" },
              { src: "/family-room.jpg", alt: "Spacious family room" },
              { src: "/countryside.jpg", alt: "Beautiful countryside" },
            ],
            autoPlay: true,
            interval: 5000,
            showControls: true,
            showIndicators: true,
          },
          fullHeight: "h-[85vh]",
          cta: { text: "View Rooms", href: "#rooms", actionType: "scroll" },
          secondaryCta: { text: "Book Now", href: "#booking", actionType: "booking" },
        },
      },
      {
        type: "features",
        props: {
          title: "Your Home Away From Home",
          layout: "grid-4",
          features: [
            { id: "f1", icon: "Tree", title: "Nature Location", description: "Surrounded by forest and meadows" },
            { id: "f2", icon: "Wifi", title: "Modern Amenities", description: "WiFi in all rooms" },
            { id: "f3", icon: "Coffee", title: "Regional Breakfast", description: "Fresh local products daily" },
            { id: "f4", icon: "Car", title: "Free Parking", description: "Directly at the house" },
          ],
        },
      },
      {
        type: "pricing",
        props: {
          title: "Our Rooms",
          subtitle: "Comfortable accommodations for every need",
          tiers: [
            {
              id: "r1",
              name: "Single Room",
              description: "Cozy room for solo travelers",
              price: "€55",
              priceSubtext: "per night",
              features: [
                { text: "Comfortable single bed", included: true },
                { text: "Private bathroom", included: true },
                { text: "Breakfast included", included: true },
              ],
              cta: { text: "Book Room", actionType: "booking" },
            },
            {
              id: "r2",
              name: "Double Room Comfort",
              description: "Spacious room with double bed",
              price: "€75",
              priceSubtext: "per night",
              highlighted: true,
              features: [
                { text: "King-size bed", included: true },
                { text: "Modern bathroom", included: true },
                { text: "Breakfast included", included: true },
                { text: "Garden view", included: true },
              ],
              cta: { text: "Book Room", actionType: "booking" },
            },
            {
              id: "r3",
              name: "Family Room",
              description: "Perfect for families",
              price: "€120",
              priceSubtext: "per night",
              features: [
                { text: "Multiple beds (4 persons)", included: true },
                { text: "Large private bathroom", included: true },
                { text: "Breakfast included", included: true },
                { text: "Extra space for children", included: true },
              ],
              cta: { text: "Book Room", actionType: "booking" },
            },
          ],
        },
      },
      {
        type: "gallery",
        props: {
          title: "Impressions",
          layout: "grid-3",
          images: [
            { id: "g1", src: "/room-1.jpg", alt: "Double room interior" },
            { id: "g2", src: "/breakfast.jpg", alt: "Regional breakfast spread" },
            { id: "g3", src: "/garden.jpg", alt: "Garden seating area" },
          ],
        },
      },
      {
        type: "cta",
        props: {
          title: "Ready for Your Countryside Retreat?",
          description: "Book your stay and experience the peace of rural Germany",
          alignment: "center",
          backgroundClassName: "bg-primary text-white py-20",
          primaryCta: { text: "Check Availability", actionType: "booking" },
        },
      },
    ],
    promptVariants: [
      {
        instruction: "Create a landing page for a German countryside pension (bed & breakfast) with room booking functionality.",
        input: "Industry: hospitality. Location: rural Germany. Features: room types with pricing, image slider, amenities, booking CTA.",
      },
      {
        instruction: "Design a vacation rental website for a traditional German guesthouse. Warm, welcoming tone emphasizing nature and relaxation.",
        input: "Key selling points: countryside location, regional breakfast, family-friendly, affordable. Include room pricing and gallery.",
      },
      {
        instruction: "Build a booking page for a small pension offering single, double, and family rooms with German countryside charm.",
        input: "Sections: hero with image slider, amenities features, room pricing cards, photo gallery, booking CTA.",
      },
      {
        instruction: "I need a website for my bed and breakfast in rural Germany. Show the rooms, prices, and let people book online.",
        input: "Rooms: single €55/night, double €75/night, family €120/night. All include breakfast. Located in countryside.",
      },
      {
        instruction: "Create a landing page for a countryside hotel with emphasis on nature, relaxation, and regional cuisine.",
        input: "Features: nature location, regional breakfast, WiFi, free parking. Need room pricing and booking functionality.",
      },
      {
        instruction: "Design a pension website that appeals to families and couples looking for a peaceful rural getaway.",
        input: "Location: German countryside. Rooms available for 1-4 persons. Include photos, amenities, pricing, and booking.",
      },
    ],
  },

  // 4. EVENT REGISTRATION
  {
    name: "event-registration",
    industry: "events",
    description: "Professional conference or workshop registration page",
    theme: {
      primaryColor: "#7c3aed", // Purple
      secondaryColor: "#a855f7",
      fontFamily: "Inter",
      borderRadius: "xl",
    },
    sections: [
      {
        type: "hero",
        props: {
          badge: "June 15-17, 2024 • Berlin",
          title: "TechForward Conference 2024",
          subtitle: "Join 500+ industry leaders for three days of insights, networking, and innovation in software development.",
          alignment: "center",
          backgroundClassName: "bg-gradient-to-br from-blue-600 via-cyan-600 to-indigo-700 text-white py-24",
          cta: { text: "Register Now - €299", actionType: "form" },
          secondaryCta: { text: "View Agenda", href: "#agenda", actionType: "scroll" },
        },
      },
      {
        type: "features",
        props: {
          badge: "What to Expect",
          title: "Conference Highlights",
          layout: "grid-3",
          features: [
            { id: "f1", icon: "Mic", title: "30+ Speakers", description: "Industry experts sharing cutting-edge insights" },
            { id: "f2", icon: "Users", title: "Networking", description: "Connect with 500+ professionals" },
            { id: "f3", icon: "Lightbulb", title: "Workshops", description: "Hands-on sessions to build new skills" },
          ],
        },
      },
      {
        type: "process",
        props: {
          title: "Conference Agenda",
          subtitle: "Three days of learning and connection",
          layout: "vertical",
          steps: [
            { id: "d1", number: 1, title: "Day 1: Foundations", description: "Keynotes on AI, cloud architecture, and developer experience" },
            { id: "d2", number: 2, title: "Day 2: Deep Dives", description: "Technical workshops, breakout sessions, and panel discussions" },
            { id: "d3", number: 3, title: "Day 3: Future Forward", description: "Innovation showcase, networking lunch, and closing keynote" },
          ],
        },
      },
      {
        type: "team",
        props: {
          title: "Featured Speakers",
          layout: "grid-4",
          members: [
            { id: "s1", name: "Dr. Sarah Chen", role: "AI Research Lead, Google", image: "/speaker-1.jpg" },
            { id: "s2", name: "Marcus Williams", role: "CTO, Stripe", image: "/speaker-2.jpg" },
            { id: "s3", name: "Elena Rodriguez", role: "VP Engineering, Netflix", image: "/speaker-3.jpg" },
            { id: "s4", name: "James Park", role: "Founder, DevTools Inc", image: "/speaker-4.jpg" },
          ],
        },
      },
      {
        type: "pricing",
        props: {
          title: "Registration Options",
          tiers: [
            {
              id: "t1",
              name: "Early Bird",
              description: "Limited availability",
              price: "€199",
              features: [
                { text: "Full conference access", included: true },
                { text: "Workshop participation", included: true },
                { text: "Networking events", included: true },
                { text: "Lunch included", included: true },
              ],
              cta: { text: "Register", actionType: "form" },
            },
            {
              id: "t2",
              name: "Standard",
              description: "Regular price",
              price: "€299",
              highlighted: true,
              features: [
                { text: "Full conference access", included: true },
                { text: "Workshop participation", included: true },
                { text: "Networking events", included: true },
                { text: "Lunch included", included: true },
                { text: "Recording access", included: true },
              ],
              cta: { text: "Register", actionType: "form" },
            },
            {
              id: "t3",
              name: "VIP",
              description: "Premium experience",
              price: "€499",
              features: [
                { text: "Everything in Standard", included: true },
                { text: "Speaker dinner access", included: true },
                { text: "Priority seating", included: true },
                { text: "Exclusive swag bag", included: true },
              ],
              cta: { text: "Register", actionType: "form" },
            },
          ],
        },
      },
      {
        type: "faq",
        props: {
          title: "Questions?",
          faqs: [
            { id: "q1", question: "Is there a refund policy?", answer: "Full refund until 30 days before the event, 50% until 14 days before." },
            { id: "q2", question: "Are recordings available?", answer: "Yes, Standard and VIP tickets include 6-month access to all session recordings." },
            { id: "q3", question: "What's included in the ticket?", answer: "All sessions, workshops, networking events, lunch, and coffee breaks." },
          ],
        },
      },
      {
        type: "cta",
        props: {
          title: "Don't Miss Out",
          description: "Early bird pricing ends May 1st. Secure your spot today.",
          primaryCta: { text: "Register Now", actionType: "form" },
        },
      },
    ],
    promptVariants: [
      {
        instruction: "Create an event registration landing page for a tech conference with speaker lineup, agenda, and ticket pricing.",
        input: "Event type: professional conference. Features needed: registration form integration, pricing tiers, speaker profiles, agenda/schedule.",
      },
      {
        instruction: "Design a conference registration page that converts visitors to registrations. Include social proof and clear value proposition.",
        input: "Key elements: compelling hero, conference highlights, speaker showcase, pricing comparison, FAQ, registration CTA.",
      },
      {
        instruction: "Build a landing page for a 3-day tech conference with multiple ticket tiers and early bird pricing.",
        input: "Sections: hero with date/location badge, features, agenda timeline, speakers, pricing tiers, FAQ, final CTA.",
      },
      {
        instruction: "I'm organizing a software development conference and need a registration page. Show speakers, schedule, and ticket options.",
        input: "Conference: 3 days, 30+ speakers, 500 attendees. Tickets: Early Bird €199, Standard €299, VIP €499. Location: Berlin.",
      },
      {
        instruction: "Create an event page for a professional workshop with multiple pricing tiers and a clear agenda.",
        input: "Event type: multi-day conference. Need: speaker profiles, day-by-day agenda, pricing comparison, FAQ, registration form.",
      },
      {
        instruction: "Design a conference landing page that emphasizes networking opportunities and expert speakers.",
        input: "Target audience: tech professionals. Key features: speaker lineup, workshop details, networking events, tiered pricing.",
      },
    ],
  },

  // 5. COWORKING SPACE
  {
    name: "coworking-space",
    industry: "real estate",
    description: "Modern coworking space with flexible memberships",
    theme: {
      primaryColor: "#0891b2", // Cyan
      secondaryColor: "#22d3ee",
      fontFamily: "Poppins",
      borderRadius: "xl",
    },
    sections: [
      {
        type: "hero",
        props: {
          title: "Your New Office Awaits",
          subtitle: "Flexible workspace solutions for freelancers, startups, and remote teams. Day passes to private offices.",
          alignment: "left",
          backgroundImage: {
            src: "/coworking-space.jpg",
            alt: "Modern coworking space",
            overlay: "bg-gradient-to-r from-black/60 to-transparent",
          },
          fullHeight: true,
          cta: { text: "Book a Tour", actionType: "booking" },
          secondaryCta: { text: "View Plans", href: "#pricing", actionType: "scroll" },
        },
      },
      {
        type: "features",
        props: {
          title: "Everything You Need",
          layout: "grid-4",
          features: [
            { id: "f1", icon: "Wifi", title: "High-Speed Internet", description: "1Gbps fiber connection" },
            { id: "f2", icon: "Coffee", title: "Free Coffee & Snacks", description: "Unlimited beverages all day" },
            { id: "f3", icon: "Video", title: "Meeting Rooms", description: "Bookable by the hour" },
            { id: "f4", icon: "Lock", title: "24/7 Access", description: "Work on your schedule" },
          ],
        },
      },
      {
        type: "pricing",
        props: {
          title: "Flexible Plans",
          subtitle: "From occasional use to full-time office",
          tiers: [
            {
              id: "p1",
              name: "Day Pass",
              description: "Drop in anytime",
              price: "€25",
              priceSubtext: "per day",
              features: [
                { text: "Hot desk access", included: true },
                { text: "High-speed WiFi", included: true },
                { text: "Coffee & snacks", included: true },
                { text: "Meeting rooms", included: false },
              ],
              cta: { text: "Get Pass", actionType: "booking" },
            },
            {
              id: "p2",
              name: "Flex",
              description: "10 days per month",
              price: "€199",
              priceSubtext: "per month",
              highlighted: true,
              features: [
                { text: "10 day passes", included: true },
                { text: "Dedicated locker", included: true },
                { text: "2h meeting rooms", included: true },
                { text: "Community events", included: true },
              ],
              cta: { text: "Join Now", actionType: "booking" },
            },
            {
              id: "p3",
              name: "Unlimited",
              description: "Full-time access",
              price: "€399",
              priceSubtext: "per month",
              features: [
                { text: "Unlimited access", included: true },
                { text: "Dedicated desk", included: true },
                { text: "5h meeting rooms", included: true },
                { text: "Mail handling", included: true },
              ],
              cta: { text: "Join Now", actionType: "booking" },
            },
          ],
        },
      },
      {
        type: "gallery",
        props: {
          title: "Our Space",
          layout: "grid-3",
          images: [
            { id: "g1", src: "/workspace-1.jpg", alt: "Open workspace area" },
            { id: "g2", src: "/meeting-room.jpg", alt: "Modern meeting room" },
            { id: "g3", src: "/lounge.jpg", alt: "Relaxation lounge" },
          ],
        },
      },
      {
        type: "testimonials",
        props: {
          title: "Member Stories",
          layout: "grid",
          testimonials: [
            { id: "t1", quote: "Finally found a workspace that matches my energy. Great community!", author: "Lisa M.", role: "Freelance Designer", rating: 5 },
            { id: "t2", quote: "The meeting rooms are perfect for client calls. Professional setup.", author: "Tom K.", role: "Startup Founder", rating: 5 },
          ],
        },
      },
      {
        type: "cta",
        props: {
          title: "Ready to Join?",
          description: "Book a free tour and try a day on us",
          primaryCta: { text: "Book Free Tour", actionType: "booking" },
        },
      },
    ],
    promptVariants: [
      {
        instruction: "Create a landing page for a modern coworking space with membership plans and booking functionality.",
        input: "Industry: real estate/workspace. Features: flexible membership tiers, amenities showcase, gallery, member testimonials.",
      },
      {
        instruction: "Design a coworking space website that converts visitors to members. Emphasize flexibility, community, and amenities.",
        input: "Key sections: hero, amenities grid, pricing tiers (day/flex/unlimited), space gallery, testimonials, booking CTA.",
      },
      {
        instruction: "I need a website for my coworking space. Show the space, amenities, and membership options.",
        input: "Plans: Day Pass €25, Flex €199/mo (10 days), Unlimited €399/mo. Amenities: fast WiFi, coffee, meeting rooms, 24/7 access.",
      },
      {
        instruction: "Build a landing page for a shared office space targeting freelancers and remote workers.",
        input: "Key features: flexible membership, high-speed internet, meeting rooms, community events. Include pricing and photos.",
      },
      {
        instruction: "Create a coworking website with emphasis on professional amenities and flexible membership options.",
        input: "Target audience: freelancers, startups, remote teams. Need: membership pricing, amenity features, gallery, testimonials.",
      },
      {
        instruction: "Design a workspace rental page with multiple membership tiers and focus on community benefits.",
        input: "Membership options: day pass, flexible, unlimited. Show: amenities, space photos, member reviews, booking CTA.",
      },
    ],
  },

  // 6. FREELANCER PORTFOLIO
  {
    name: "freelancer-portfolio",
    industry: "professional services",
    description: "Personal portfolio for a web developer or designer",
    theme: {
      primaryColor: "#2563eb", // Blue
      secondaryColor: "#3b82f6",
      fontFamily: "Inter",
      borderRadius: "lg",
    },
    sections: [
      {
        type: "hero",
        props: {
          badge: "Available for Projects",
          title: "I Build Digital Experiences",
          subtitle: "Full-stack developer specializing in React, Node.js, and cloud architecture. Let's bring your ideas to life.",
          alignment: "left",
          cta: { text: "View My Work", href: "#portfolio", actionType: "scroll" },
          secondaryCta: { text: "Get in Touch", href: "#contact", actionType: "contact" },
        },
      },
      {
        type: "features",
        props: {
          title: "What I Do",
          layout: "grid-3",
          features: [
            { id: "f1", icon: "Code", title: "Web Development", description: "Custom web applications built with modern frameworks" },
            { id: "f2", icon: "Smartphone", title: "Mobile Apps", description: "Cross-platform apps with React Native" },
            { id: "f3", icon: "Cloud", title: "Cloud Solutions", description: "Scalable infrastructure on AWS and GCP" },
          ],
        },
      },
      {
        type: "testimonials",
        props: {
          title: "Client Feedback",
          layout: "single",
          testimonials: [
            { id: "t1", quote: "Outstanding work! Delivered on time and exceeded expectations. Highly recommend.", author: "Jennifer Adams", company: "TechStart Inc.", rating: 5 },
          ],
        },
      },
      {
        type: "cta",
        props: {
          title: "Let's Work Together",
          description: "Have a project in mind? I'd love to hear about it.",
          primaryCta: { text: "Start a Conversation", actionType: "contact" },
        },
      },
    ],
    promptVariants: [
      {
        instruction: "Create a personal portfolio landing page for a freelance web developer.",
        input: "Style: professional, modern. Sections: hero with availability badge, services, client testimonial, contact CTA.",
      },
      {
        instruction: "Design a simple but effective portfolio page for a full-stack developer seeking new clients.",
        input: "Focus on: skills showcase, social proof, clear contact call-to-action. Minimal but impactful design.",
      },
      {
        instruction: "I need a portfolio website to showcase my web development services and attract new clients.",
        input: "Services: web development, mobile apps, cloud solutions. Include client testimonials and contact CTA.",
      },
      {
        instruction: "Build a freelancer portfolio page that converts visitors to client inquiries.",
        input: "Freelancer type: web developer. Need: services section, testimonials, clear CTA. Style: professional, modern.",
      },
      {
        instruction: "Create a developer portfolio with emphasis on services offered and client satisfaction.",
        input: "Key sections: hero with availability status, services grid, client feedback, contact section.",
      },
      {
        instruction: "Design a personal brand website for a software developer looking for freelance projects.",
        input: "Focus on: technical skills, past client reviews, easy contact. Minimal sections, maximum impact.",
      },
    ],
  },

  // 7. BNI NETWORKING GROUP
  {
    name: "bni-chapter",
    industry: "business networking",
    description: "Local BNI chapter website for business networking group",
    theme: {
      primaryColor: "#dc2626", // BNI Red
      secondaryColor: "#fbbf24",
      fontFamily: "Open Sans",
      borderRadius: "md",
    },
    sections: [
      {
        type: "hero",
        props: {
          title: "BNI Chapter Excellence",
          subtitle: "Your local business networking group. Meet weekly, share referrals, grow together.",
          alignment: "center",
          cta: { text: "Visit as a Guest", actionType: "form" },
          secondaryCta: { text: "Learn About BNI", href: "#about", actionType: "scroll" },
        },
      },
      {
        type: "features",
        props: {
          title: "Why Join Our Chapter",
          layout: "grid-3",
          features: [
            { id: "f1", icon: "Users", title: "35+ Members", description: "Diverse industries, one network" },
            { id: "f2", icon: "TrendingUp", title: "€2M+ Referrals", description: "Annual referral value passed" },
            { id: "f3", icon: "Calendar", title: "Weekly Meetings", description: "Every Tuesday, 7:00 AM" },
          ],
        },
      },
      {
        type: "process",
        props: {
          title: "How BNI Works",
          layout: "horizontal",
          steps: [
            { id: "s1", number: 1, title: "Visit", description: "Attend a meeting as our guest" },
            { id: "s2", number: 2, title: "Connect", description: "Meet members and share your business" },
            { id: "s3", number: 3, title: "Apply", description: "Apply for membership if it's a fit" },
            { id: "s4", number: 4, title: "Grow", description: "Receive referrals and grow your business" },
          ],
        },
      },
      {
        type: "testimonials",
        props: {
          title: "Member Success Stories",
          layout: "grid",
          testimonials: [
            { id: "t1", quote: "BNI transformed my business. I've gained 15 new clients through referrals this year alone.", author: "Michael S.", role: "Financial Advisor", rating: 5 },
            { id: "t2", quote: "The accountability and support from fellow members is invaluable.", author: "Sandra K.", role: "Marketing Consultant", rating: 5 },
          ],
        },
      },
      {
        type: "cta",
        props: {
          title: "Ready to Grow Your Business?",
          description: "Visit our chapter as a guest - breakfast is on us!",
          primaryCta: { text: "Request Invitation", actionType: "form" },
        },
      },
    ],
    promptVariants: [
      {
        instruction: "Create a landing page for a local BNI business networking chapter.",
        input: "Purpose: attract guest visitors and potential members. Highlight: referral stats, meeting schedule, member testimonials.",
      },
      {
        instruction: "Design a BNI chapter website that explains the networking process and encourages guest visits.",
        input: "Key elements: value proposition, how BNI works process steps, success stories, guest registration CTA.",
      },
      {
        instruction: "Build a landing page for a business networking group that meets weekly to exchange referrals.",
        input: "Group type: BNI chapter. Features: member count, referral value stats, meeting schedule, how it works, testimonials.",
      },
      {
        instruction: "I need a website for our BNI chapter to attract guest visitors and show our referral success.",
        input: "Chapter: 35+ members, €2M+ annual referrals, weekly Tuesday meetings. Include process explanation and member stories.",
      },
      {
        instruction: "Create a professional networking group landing page with emphasis on business growth through referrals.",
        input: "Key stats: member count, referral value. Show: how the process works, success stories, guest invitation CTA.",
      },
      {
        instruction: "Design a BNI chapter page that converts visitors to guest attendees at weekly meetings.",
        input: "Target audience: business owners seeking referrals. Include: chapter stats, process steps, testimonials, registration.",
      },
    ],
  },

  // 8. CME REGISTRATION (Medical Education)
  {
    name: "cme-registration",
    industry: "healthcare education",
    description: "Continuing Medical Education course registration",
    theme: {
      primaryColor: "#0f766e", // Teal
      secondaryColor: "#14b8a6",
      fontFamily: "Source Sans Pro",
      borderRadius: "md",
    },
    sections: [
      {
        type: "hero",
        props: {
          badge: "15 CME Credits",
          title: "Advanced Cardiology Update 2024",
          subtitle: "Stay current with the latest advances in cardiovascular medicine. Accredited by the German Medical Association.",
          alignment: "center",
          cta: { text: "Register Now", actionType: "form" },
          secondaryCta: { text: "Download Agenda", actionType: "link" },
        },
      },
      {
        type: "features",
        props: {
          title: "Course Highlights",
          layout: "grid-3",
          features: [
            { id: "f1", icon: "Award", title: "15 CME Points", description: "Accredited continuing education" },
            { id: "f2", icon: "Video", title: "Live & On-Demand", description: "Attend live or watch recordings" },
            { id: "f3", icon: "FileText", title: "Case Studies", description: "Real-world clinical scenarios" },
          ],
        },
      },
      {
        type: "team",
        props: {
          title: "Course Faculty",
          layout: "grid-3",
          members: [
            { id: "m1", name: "Prof. Dr. Hans Mueller", role: "Cardiology, Charité Berlin", bio: "Leading researcher in interventional cardiology" },
            { id: "m2", name: "Dr. Anna Schmidt", role: "Heart Center Munich", bio: "Specialist in cardiac imaging" },
            { id: "m3", name: "Prof. Dr. Peter Weber", role: "University Hospital Heidelberg", bio: "Expert in heart failure management" },
          ],
        },
      },
      {
        type: "pricing",
        props: {
          title: "Registration",
          tiers: [
            {
              id: "p1",
              name: "Early Bird",
              description: "Until March 31",
              price: "€249",
              features: [
                { text: "Full course access", included: true },
                { text: "CME certificate", included: true },
                { text: "Course materials", included: true },
              ],
              cta: { text: "Register", actionType: "form" },
            },
            {
              id: "p2",
              name: "Standard",
              description: "Regular price",
              price: "€349",
              highlighted: true,
              features: [
                { text: "Full course access", included: true },
                { text: "CME certificate", included: true },
                { text: "Course materials", included: true },
                { text: "6-month recording access", included: true },
              ],
              cta: { text: "Register", actionType: "form" },
            },
          ],
        },
      },
      {
        type: "faq",
        props: {
          title: "Questions",
          faqs: [
            { id: "q1", question: "How do I claim CME credits?", answer: "Complete the course evaluation and your certificate will be emailed within 48 hours." },
            { id: "q2", question: "Can I attend virtually?", answer: "Yes, the course is hybrid. Attend in Berlin or join via live stream." },
          ],
        },
      },
      {
        type: "cta",
        props: {
          title: "Secure Your Spot",
          description: "Limited to 200 participants. Early bird pricing ends March 31.",
          primaryCta: { text: "Register Now", actionType: "form" },
        },
      },
    ],
    promptVariants: [
      {
        instruction: "Create a CME (Continuing Medical Education) course registration page for healthcare professionals.",
        input: "Industry: healthcare education. Must include: CME credits badge, faculty profiles, pricing tiers, accreditation info.",
      },
      {
        instruction: "Design a medical conference registration page emphasizing CME accreditation and expert faculty.",
        input: "Target audience: physicians seeking CME credits. Key sections: course highlights, faculty, pricing, FAQ, registration.",
      },
      {
        instruction: "Build a professional development course page for doctors with accredited CME credits.",
        input: "Course: cardiology update. Features: CME points badge, expert faculty, pricing tiers, hybrid attendance option.",
      },
      {
        instruction: "I need a registration page for a medical education course offering CME credits.",
        input: "Course: 15 CME credits, cardiology topic. Faculty: 3 experts. Pricing: Early Bird €249, Standard €349.",
      },
      {
        instruction: "Create a healthcare education landing page with focus on accreditation and expert instructors.",
        input: "Course type: CME accredited. Include: credit information, faculty bios, pricing options, FAQ, registration form.",
      },
      {
        instruction: "Design a medical course registration page that builds trust through faculty credentials and accreditation.",
        input: "Key elements: CME credits badge, expert faculty profiles, course highlights, pricing comparison, registration CTA.",
      },
    ],
  },

  // ============================================================================
  // NEW TEMPLATES FROM V0 PROTOTYPES
  // ============================================================================

  // 9. ARTISAN BREAD MARKETPLACE
  {
    name: "bread-marketplace",
    industry: "food & beverage",
    description: "Local artisan bread marketplace connecting hobby bakers with customers",
    theme: {
      primaryColor: "#92400e", // Warm brown
      secondaryColor: "#d97706",
      fontFamily: "Lora",
      borderRadius: "lg",
    },
    sections: [
      {
        type: "hero",
        props: {
          title: "Frisch gebackenes Brot von lokalen Handwerkern",
          subtitle: "Entdecken Sie handgefertigtes Sauerteigbrot, Vollkornbrot und Spezialbrote, die mit Sorgfalt von leidenschaftlichen Hobbybäckern in Ihrer Gemeinde hergestellt werden.",
          alignment: "center",
          backgroundClassName: "bg-gradient-to-b from-amber-50 to-orange-50",
          cta: { text: "Brot-Abo starten", actionType: "form" },
          secondaryCta: { text: "Unsere Bäckereien", href: "#bakeries", actionType: "scroll" },
        },
      },
      {
        type: "features",
        props: {
          title: "Warum lokales Brot?",
          subtitle: "Frisch, handgemacht, aus der Nachbarschaft",
          layout: "grid-3",
          features: [
            { id: "f1", icon: "Heart", title: "Mit Liebe gebacken", description: "Jedes Brot wird von passionierten Hobbybäckern mit traditionellen Methoden hergestellt" },
            { id: "f2", icon: "Leaf", title: "Natürliche Zutaten", description: "Nur Mehl, Wasser, Salz und Zeit - keine Zusatzstoffe oder Konservierungsmittel" },
            { id: "f3", icon: "MapPin", title: "Lokal & Frisch", description: "Direkt aus Ihrer Gemeinde, gebacken am Abholtag" },
          ],
        },
      },
      {
        type: "gallery",
        props: {
          title: "Verfügbare Brote",
          subtitle: "Täglich frische Auswahl",
          layout: "grid-3",
          images: [
            { id: "g1", src: "/sourdough.jpg", alt: "Sauerteigbrot", caption: "Rustikales Sauerteigbrot" },
            { id: "g2", src: "/vollkorn.jpg", alt: "Vollkornbrot", caption: "Kerniges Vollkornbrot" },
            { id: "g3", src: "/baguette.jpg", alt: "Baguette", caption: "Französisches Baguette" },
            { id: "g4", src: "/roggenbrot.jpg", alt: "Roggenbrot", caption: "Dunkles Roggenbrot" },
            { id: "g5", src: "/ciabatta.jpg", alt: "Ciabatta", caption: "Italienisches Ciabatta" },
            { id: "g6", src: "/brötchen.jpg", alt: "Brötchen", caption: "Knusprige Brötchen" },
          ],
        },
      },
      {
        type: "process",
        props: {
          title: "So funktioniert's",
          layout: "horizontal",
          steps: [
            { id: "s1", number: 1, title: "Brot auswählen", description: "Stöbern Sie durch das Angebot lokaler Bäcker" },
            { id: "s2", number: 2, title: "Bestellen", description: "Wählen Sie Ihr Brot und den Abholtag" },
            { id: "s3", number: 3, title: "Frisch gebacken", description: "Ihr Bäcker backt am Morgen der Abholung" },
            { id: "s4", number: 4, title: "Abholen & Genießen", description: "Holen Sie Ihr warmes Brot ab" },
          ],
        },
      },
      {
        type: "testimonials",
        props: {
          title: "Was unsere Kunden sagen",
          layout: "grid",
          testimonials: [
            { id: "t1", quote: "Endlich wieder echtes Brot wie von Oma! Die Sauerteigbrote sind unglaublich.", author: "Maria K.", rating: 5 },
            { id: "t2", quote: "Tolle Initiative, lokale Bäcker zu unterstützen. Das Brot schmeckt fantastisch.", author: "Thomas H.", rating: 5 },
          ],
        },
      },
      {
        type: "cta",
        props: {
          title: "Bereit für echtes Brot?",
          description: "Starten Sie Ihr Brot-Abo und erhalten Sie wöchentlich frisches Brot von lokalen Bäckern.",
          alignment: "center",
          primaryCta: { text: "Jetzt Abo starten", actionType: "form" },
          secondaryCta: { text: "Mehr erfahren", actionType: "scroll" },
        },
      },
    ],
    promptVariants: [
      {
        instruction: "Create a landing page for an artisan bread marketplace connecting local hobby bakers with customers.",
        input: "Industry: food marketplace. Features: bread gallery, how it works process, customer testimonials, subscription CTA.",
      },
      {
        instruction: "Design a local food marketplace website for handmade bread from community bakers.",
        input: "German audience. Key elements: hero, why local bread features, product gallery, ordering process, testimonials.",
      },
      {
        instruction: "Build a landing page for a bread subscription service featuring local artisan bakers.",
        input: "Focus on: freshness, traditional methods, local community. Include: product showcase, process steps, reviews.",
      },
      {
        instruction: "I want a website for my local bread marketplace where hobby bakers can sell their fresh bread.",
        input: "German language. Show: bread varieties, how ordering works, customer testimonials, subscription signup.",
      },
      {
        instruction: "Create a food marketplace landing page emphasizing artisan quality and local community.",
        input: "Product: handmade bread. Key points: natural ingredients, local bakers, fresh daily. Include process and reviews.",
      },
      {
        instruction: "Design a marketplace website for artisan bread with emphasis on traditional baking methods.",
        input: "Target: customers seeking quality bread. Features: product gallery, baker profiles, ordering process, testimonials.",
      },
    ],
  },

  // 10. GUITAR FINGERSTYLE (Hobby/Personal Site)
  {
    name: "guitar-hobby",
    industry: "music & hobbies",
    description: "Personal website for a fingerstyle guitar enthusiast sharing resources and builds",
    theme: {
      primaryColor: "#7c2d12", // Warm wood brown
      secondaryColor: "#ea580c",
      fontFamily: "Georgia",
      borderRadius: "md",
    },
    sections: [
      {
        type: "hero",
        props: {
          badge: "Fingerstyle Guitar",
          title: "Guitarfingerstyle",
          subtitle: "Ich bin Hobbygitarrist und wollte schon immer mein eigenes Instrument bauen. Hier teile ich meine Erfahrungen, Materialien und Informationen.",
          alignment: "left",
          image: {
            src: "/guitar-milkyway.jpg",
            alt: "Handgefertigte Akustikgitarre",
          },
          cta: { text: "Noten & Tabs entdecken", href: "#tabs", actionType: "scroll" },
          secondaryCta: { text: "Gitarrenbau lernen", href: "#building", actionType: "scroll" },
        },
      },
      {
        type: "features",
        props: {
          title: "Alles rund um die akustische Gitarre",
          subtitle: "Auf diesen Seiten erfahren Sie alles über meine Gitarren, einzelne Stile und meine Lieblingsstücke.",
          layout: "grid-3",
          features: [
            { id: "f1", icon: "Wrench", title: "Gitarrenbau", description: "Erfahrungen, Materialien und Informationen zum Bau eigener Gitarren" },
            { id: "f2", icon: "FileText", title: "Noten & Tabs", description: "Alle Noten und Tabs für den privaten Gebrauch und Übungszwecke" },
            { id: "f3", icon: "ExternalLink", title: "Linksammlung", description: "Quellen für Materialien, Bausätze und Werkzeuge" },
          ],
        },
      },
      {
        type: "gallery",
        props: {
          title: "Meine Gitarren",
          subtitle: "Selbst gebaute Instrumente",
          layout: "grid-3",
          images: [
            { id: "g1", src: "/guitar-1.jpg", alt: "Klassische Gitarre" },
            { id: "g2", src: "/guitar-2.jpg", alt: "Stahlsaiten Akustik" },
            { id: "g3", src: "/guitar-3.jpg", alt: "Parlor Gitarre" },
          ],
        },
      },
      {
        type: "cta",
        props: {
          title: "Kontakt",
          description: "Fragen zum Gitarrenbau oder zu den Noten? Schreiben Sie mir gerne.",
          alignment: "center",
          primaryCta: { text: "Kontakt aufnehmen", actionType: "contact" },
        },
      },
    ],
    promptVariants: [
      {
        instruction: "Create a personal hobby website for a fingerstyle guitar enthusiast who builds guitars.",
        input: "Content: guitar building resources, sheet music/tabs, link collection. Style: warm, personal, passionate.",
      },
      {
        instruction: "Design a personal website for a musician sharing guitar building experiences and music resources.",
        input: "German audience. Sections: hero with personal intro, resource features, guitar gallery, contact CTA.",
      },
      {
        instruction: "Build a hobby website for someone passionate about acoustic guitars and guitar building.",
        input: "Features: personal story in hero, resource categories (building, tabs, links), photo gallery, contact.",
      },
      {
        instruction: "I want a personal website to share my guitar building hobby and fingerstyle music resources.",
        input: "German language. Include: personal introduction, resource sections, photos of my guitars, contact form.",
      },
      {
        instruction: "Create a personal passion project website for guitar building and fingerstyle playing.",
        input: "Style: warm, authentic, hobbyist. Sections: about me, resources (building, tabs, links), gallery, contact.",
      },
      {
        instruction: "Design a hobbyist website showcasing guitar building skills and sharing music resources.",
        input: "Personal tone. Features: intro with photo, resource categories, instrument gallery, contact section.",
      },
    ],
  },

  // 11. COWORKING DETAIL PAGE (Airbnb-style)
  {
    name: "coworking-detail",
    industry: "real estate",
    description: "Premium coworking space detail page in Airbnb listing style",
    theme: {
      primaryColor: "#0f172a", // Dark slate
      secondaryColor: "#3b82f6",
      fontFamily: "Inter",
      borderRadius: "xl",
    },
    sections: [
      {
        type: "hero",
        props: {
          badge: "Superhost",
          title: "l4yercak3 Studio - Premium Co-Working in a Traditional Marketplace House",
          subtitle: "4.9 ★ (127 reviews) • Historic Marketplace District",
          alignment: "left",
          cta: { text: "Book Workspace", actionType: "booking" },
        },
      },
      {
        type: "gallery",
        props: {
          title: "",
          layout: "grid-4",
          images: [
            { id: "g1", src: "/studio-main.jpg", alt: "Main workspace" },
            { id: "g2", src: "/recording-studio.jpg", alt: "Recording studio" },
            { id: "g3", src: "/lounge-area.jpg", alt: "Lounge with view" },
            { id: "g4", src: "/meeting-room.jpg", alt: "Meeting room" },
            { id: "g5", src: "/kitchen.jpg", alt: "Shared kitchen" },
          ],
        },
      },
      {
        type: "features",
        props: {
          title: "What this place offers",
          layout: "grid-4",
          features: [
            { id: "f1", icon: "Wifi", title: "High-speed WiFi", description: "1Gbps fiber connection" },
            { id: "f2", icon: "Monitor", title: "Dual Monitors", description: "At every workstation" },
            { id: "f3", icon: "Coffee", title: "Kitchen", description: "Fully equipped shared kitchen" },
            { id: "f4", icon: "Video", title: "Recording Studio", description: "Professional-grade equipment" },
            { id: "f5", icon: "Lock", title: "24/7 Access", description: "Key code entry" },
            { id: "f6", icon: "Car", title: "Parking", description: "Free parking nearby" },
          ],
        },
      },
      {
        type: "pricing",
        props: {
          title: "Workspace Options",
          subtitle: "Choose your perfect setup",
          tiers: [
            {
              id: "w1",
              name: "Hot Desk",
              description: "Flexible seating",
              price: "€25",
              priceSubtext: "per day",
              features: [
                { text: "Any available desk", included: true },
                { text: "Dual monitors", included: true },
                { text: "Kitchen access", included: true },
              ],
              cta: { text: "Book", actionType: "booking" },
            },
            {
              id: "w2",
              name: "Recording Studio",
              description: "Content creation",
              price: "€50",
              priceSubtext: "per half-day",
              highlighted: true,
              features: [
                { text: "Professional microphones", included: true },
                { text: "Soundproofed room", included: true },
                { text: "Editing workstation", included: true },
              ],
              cta: { text: "Book", actionType: "booking" },
            },
            {
              id: "w3",
              name: "Executive Suite",
              description: "Private office",
              price: "€75",
              priceSubtext: "per day",
              features: [
                { text: "Private room", included: true },
                { text: "Premium setup", included: true },
                { text: "Meeting room access", included: true },
              ],
              cta: { text: "Book", actionType: "booking" },
            },
          ],
        },
      },
      {
        type: "testimonials",
        props: {
          title: "Guest Reviews",
          layout: "grid",
          testimonials: [
            { id: "r1", quote: "Perfect space for content creation. The recording studio is amazing!", author: "Alex M.", role: "Podcaster", rating: 5 },
            { id: "r2", quote: "Beautiful historic building with all modern amenities. Highly recommend.", author: "Sarah K.", role: "Remote Worker", rating: 5 },
            { id: "r3", quote: "The marketplace views are incredible. Great atmosphere for focused work.", author: "James T.", role: "Freelance Designer", rating: 5 },
          ],
        },
      },
      {
        type: "faq",
        props: {
          title: "Things to know",
          layout: "grid",
          faqs: [
            { id: "q1", question: "Access hours", answer: "24/7 access for members. Key code provided upon booking. Check-in from 8:00 AM." },
            { id: "q2", question: "House rules", answer: "Professional environment. Respect quiet hours. Clean workspace after use." },
            { id: "q3", question: "Cancellation", answer: "Free cancellation 48h before. Flexible rebooking options. Full refund if applicable." },
          ],
        },
      },
      {
        type: "cta",
        props: {
          title: "Ready to book?",
          description: "Reserve your workspace today",
          alignment: "center",
          primaryCta: { text: "Check Availability", actionType: "booking" },
        },
      },
    ],
    promptVariants: [
      {
        instruction: "Create a detailed coworking space listing page in Airbnb style with workspace options and booking.",
        input: "Style: property listing (like Airbnb). Features: photo gallery, amenities, workspace tiers, reviews, house rules.",
      },
      {
        instruction: "Design a premium workspace detail page with multiple booking options and guest reviews.",
        input: "Layout: Airbnb-inspired. Include: hero with rating, gallery, amenities grid, pricing tiers, reviews, booking CTA.",
      },
      {
        instruction: "Build a workspace listing page for a premium coworking space in a historic building.",
        input: "Features: recording studio, hot desks, executive suite. Include: photos, amenities, pricing, reviews, policies.",
      },
      {
        instruction: "I need a detailed listing page for my coworking space, similar to how Airbnb shows properties.",
        input: "Space: historic building with recording studio. Show: photos, amenities, workspace options with pricing, reviews.",
      },
      {
        instruction: "Create a property-style listing for a creative coworking space with multiple workspace types.",
        input: "Style: Airbnb listing. Options: hot desk €25, recording studio €50, executive €75. Include reviews and policies.",
      },
      {
        instruction: "Design a coworking space page with emphasis on unique features and guest experience.",
        input: "Unique features: recording studio, historic building, marketplace views. Include: gallery, pricing, reviews, booking.",
      },
    ],
  },

  // 12. MEMBER BENEFITS PORTAL
  {
    name: "member-benefits",
    industry: "membership",
    description: "Member benefits portal for a startup community or incubator",
    theme: {
      primaryColor: "#059669", // Emerald
      secondaryColor: "#10b981",
      fontFamily: "Inter",
      borderRadius: "lg",
    },
    sections: [
      {
        type: "hero",
        props: {
          title: "Benefits für Mitglieder",
          subtitle: "Entdecke exklusive Vorteile von unseren Mitgliedern - Rabatte, kostenlose Beratung, und mehr.",
          alignment: "left",
          cta: { text: "Neuen Benefit erstellen", actionType: "form" },
          secondaryCta: { text: "Benefits durchsuchen", href: "#benefits", actionType: "scroll" },
        },
      },
      {
        type: "features",
        props: {
          title: "Kategorien",
          layout: "grid-4",
          features: [
            { id: "c1", icon: "TrendingUp", title: "Marketing", description: "Tools und Beratung für Wachstum" },
            { id: "c2", icon: "Scale", title: "Beratung", description: "Rechts- und Steuerberatung" },
            { id: "c3", icon: "Code", title: "Software", description: "Tools und Lizenzen" },
            { id: "c4", icon: "Palette", title: "Design", description: "Workshops und Services" },
            { id: "c5", icon: "Calculator", title: "Buchhaltung", description: "Finanz-Tools und Services" },
            { id: "c6", icon: "Briefcase", title: "Business", description: "Allgemeine Business-Vorteile" },
          ],
        },
      },
      {
        type: "testimonials",
        props: {
          title: "Beliebte Benefits",
          subtitle: "Von Mitgliedern für Mitglieder",
          layout: "grid",
          testimonials: [
            { id: "b1", quote: "50% Rabatt auf Marketing-Tools - Perfekt für Startups, die ihre Online-Präsenz ausbauen möchten.", author: "Anna Schmidt", role: "Marketing-Tools Anbieter" },
            { id: "b2", quote: "Kostenlose Rechtsberatung - Erste Beratungsstunde kostenfrei für alle Mitglieder.", author: "Michael Weber", role: "Rechtsanwalt" },
            { id: "b3", quote: "Cloud-Hosting mit 30% Nachlass - Skalierbar, sicher und mit deutschem Support.", author: "Sarah Müller", role: "Hosting-Anbieter" },
          ],
        },
      },
      {
        type: "process",
        props: {
          title: "So funktioniert's",
          layout: "horizontal",
          steps: [
            { id: "s1", number: 1, title: "Durchsuchen", description: "Finde passende Benefits für dein Business" },
            { id: "s2", number: 2, title: "Kontaktieren", description: "Nimm Kontakt zum Anbieter auf" },
            { id: "s3", number: 3, title: "Profitieren", description: "Nutze den exklusiven Mitgliedsvorteil" },
            { id: "s4", number: 4, title: "Teilen", description: "Biete selbst Benefits für andere an" },
          ],
        },
      },
      {
        type: "cta",
        props: {
          title: "Hast du auch einen Benefit anzubieten?",
          description: "Teile dein Angebot mit der Community und gewinne neue Kunden.",
          alignment: "center",
          primaryCta: { text: "Benefit erstellen", actionType: "form" },
        },
      },
    ],
    promptVariants: [
      {
        instruction: "Create a member benefits portal for a startup community or incubator.",
        input: "Features: benefit categories, featured benefits, how it works process, CTA to add new benefits.",
      },
      {
        instruction: "Design a benefits marketplace for community members to share exclusive offers.",
        input: "German audience. Sections: hero, category grid, featured benefits, process steps, create benefit CTA.",
      },
      {
        instruction: "Build a member portal landing page showcasing exclusive benefits from community members.",
        input: "Categories: marketing, legal, software, design, accounting. Include: benefit examples, how it works, submit CTA.",
      },
      {
        instruction: "I need a benefits portal for our startup community where members can share discounts and services.",
        input: "German language. Show: benefit categories, example benefits, how to use, how to contribute benefits.",
      },
      {
        instruction: "Create a community benefits marketplace emphasizing member-to-member value sharing.",
        input: "Style: clean, professional. Features: categories, featured offers, process explanation, contribution CTA.",
      },
      {
        instruction: "Design a member benefits directory with categories and easy navigation.",
        input: "Target: startup community members. Include: category grid, benefit examples, process steps, add benefit form.",
      },
    ],
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateSectionId(): string {
  return `sec_${Math.random().toString(36).substring(2, 9)}`;
}

function generateFeatureId(): string {
  return `feat_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Converts a template config into a valid AIGeneratedPageSchema
 */
function templateToPageSchema(template: TemplateConfig): object {
  const sections = template.sections.map((section) => ({
    id: generateSectionId(),
    type: section.type,
    props: section.props,
  }));

  // Determine language based on template content
  const germanTemplates = ["bread-marketplace", "guitar-hobby", "member-benefits", "bni-chapter", "vacation-rental"];
  const isGerman = germanTemplates.includes(template.name);

  return {
    version: "1.0",
    metadata: {
      title: template.description.split(" ").slice(0, 5).join(" "),
      slug: template.name,
      description: template.description,
      language: isGerman ? "de" : "en",
    },
    theme: template.theme,
    sections,
    generatedAt: Date.now(),
    generatedBy: "ai",
    revisions: [],
  };
}

/**
 * Generates training examples from a template
 */
function generateExamplesFromTemplate(template: TemplateConfig): HuggingFaceExample[] {
  const examples: HuggingFaceExample[] = [];
  const pageSchema = templateToPageSchema(template);
  const pageSchemaJson = JSON.stringify(pageSchema, null, 2);

  for (let i = 0; i < template.promptVariants.length; i++) {
    const variant = template.promptVariants[i];

    examples.push({
      instruction: variant.instruction,
      input: variant.input,
      output: pageSchemaJson,
      metadata: {
        example_type: "page_generation",
        source: "synthetic",
        template_name: template.name,
        prompt_variant: i + 1,
        sections_count: template.sections.length,
      },
    });
  }

  return examples;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let outputPath = "./scripts/training/output/synthetic-training-data.jsonl";
  let selectedTemplates: string[] | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--output" && args[i + 1]) {
      outputPath = args[i + 1];
      i++;
    } else if (args[i] === "--templates" && args[i + 1]) {
      selectedTemplates = args[i + 1].split(",").map((t) => t.trim());
      i++;
    }
  }

  // Filter templates if specified
  const templatesToProcess = selectedTemplates
    ? TEMPLATES.filter((t) => selectedTemplates!.includes(t.name))
    : TEMPLATES;

  if (templatesToProcess.length === 0) {
    console.error("No templates found matching:", selectedTemplates);
    process.exit(1);
  }

  console.log(`\n🚀 Synthetic Training Data Generator\n`);
  console.log(`📦 Processing ${templatesToProcess.length} templates...`);

  // Generate all examples
  const allExamples: HuggingFaceExample[] = [];

  for (const template of templatesToProcess) {
    const examples = generateExamplesFromTemplate(template);
    allExamples.push(...examples);
    console.log(`   ✓ ${template.name}: ${examples.length} examples (${template.sections.length} sections)`);
  }

  // Convert to JSONL
  const jsonlContent = allExamples.map((ex) => JSON.stringify(ex)).join("\n");

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write output file
  fs.writeFileSync(outputPath, jsonlContent, "utf-8");

  console.log(`\n✅ Generated ${allExamples.length} training examples`);
  console.log(`📁 Output: ${outputPath}`);
  console.log(`📊 File size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);

  // Print summary by template
  console.log(`\n📋 Summary by template:`);
  const summary = templatesToProcess.map((t) => ({
    name: t.name,
    industry: t.industry,
    variants: t.promptVariants.length,
    sections: t.sections.length,
  }));

  console.table(summary);

  console.log(`\n🎯 Next steps:`);
  console.log(`   1. Review the generated data in ${outputPath}`);
  console.log(`   2. Run the seed script to import into Convex`);
  console.log(`   3. Upload to Hugging Face Datasets`);
  console.log(`   4. Start fine-tuning with AutoTrain`);
  console.log(``);
}

main().catch(console.error);
