/**
 * SYNTHETIC TEMPLATES DATA
 *
 * This file contains the template definitions for synthetic training data.
 * It's separated from the main seed script to keep the code organized.
 *
 * Each template represents a different industry/use case with multiple
 * prompt variants to train the model on different ways users might ask
 * for similar pages.
 */

export interface SectionConfig {
  type: string;
  props: Record<string, unknown>;
}

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor?: string;
  fontFamily?: string;
  borderRadius?: string;
}

export interface PromptVariant {
  instruction: string;
  input: string;
}

export interface TemplateConfig {
  name: string;
  industry: string;
  description: string;
  sections: SectionConfig[];
  theme: ThemeConfig;
  promptVariants: PromptVariant[];
}

// Helper to generate unique IDs
function generateSectionId(): string {
  return `sec_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Converts a template config into a valid AIGeneratedPageSchema
 */
export function templateToPageSchema(template: TemplateConfig): object {
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
 * All synthetic templates - abbreviated version for the dashboard
 * Full templates are in scripts/training/generate-synthetic.ts
 */
export const SYNTHETIC_TEMPLATES: TemplateConfig[] = [
  // 1. SAILING SCHOOL
  {
    name: "sailing-school",
    industry: "maritime education",
    description: "Professional sailing school in Germany offering courses from beginner to advanced certification",
    theme: {
      primaryColor: "#0369a1",
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
          backgroundImage: { src: "/sailing-boat-on-baltic-sea.jpg", alt: "Sailing boat on Baltic Sea" },
          fullHeight: "h-[85vh]",
          cta: { text: "View Courses", href: "#courses", actionType: "scroll" },
        },
      },
      {
        type: "features",
        props: {
          title: "Why Choose Our Sailing School",
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
        type: "pricing",
        props: {
          title: "Course Pricing",
          tiers: [
            { id: "t1", name: "Trial Lesson", price: "€89", priceSubtext: "3 hours", features: [{ text: "Hands-on sailing experience", included: true }], cta: { text: "Book Now", actionType: "booking" } },
            { id: "t2", name: "Basic Course", price: "€599", priceSubtext: "5 days", highlighted: true, features: [{ text: "Theory and practical training", included: true }], cta: { text: "Enroll Now", actionType: "booking" } },
            { id: "t3", name: "SBF-See License", price: "€899", priceSubtext: "including exam fees", features: [{ text: "Complete certification", included: true }], cta: { text: "Get Certified", actionType: "booking" } },
          ],
        },
      },
      {
        type: "testimonials",
        props: {
          title: "What Our Students Say",
          layout: "grid",
          testimonials: [
            { id: "r1", quote: "Finally achieved my dream of getting a sailing license.", author: "Thomas M.", role: "SBF-See Graduate", rating: 5 },
            { id: "r2", quote: "Small groups meant lots of hands-on time.", author: "Anna K.", role: "Basic Course Graduate", rating: 5 },
          ],
        },
      },
      {
        type: "cta",
        props: {
          title: "Ready to Set Sail?",
          description: "Book your first lesson today",
          primaryCta: { text: "Book Trial Lesson", actionType: "booking" },
        },
      },
    ],
    promptVariants: [
      { instruction: "Create a landing page for a sailing school in Germany with course pricing and booking.", input: "Industry: maritime education. Location: Baltic Sea. Features: course booking, testimonials, pricing tiers." },
      { instruction: "Build a professional website for a sailing academy offering certification courses.", input: "Focus on: trust signals, clear pricing, easy booking. Target: adults wanting sailing licenses." },
      { instruction: "Design a landing page for sailing courses emphasizing the learning journey.", input: "Show progression: trial → basic → certification. Include pricing, FAQ, and social proof." },
    ],
  },

  // 2. CAFE WEBSITE
  {
    name: "cafe-website",
    industry: "food & beverage",
    description: "Cozy neighborhood café with specialty coffee and artisan baked goods",
    theme: {
      primaryColor: "#78350f",
      secondaryColor: "#f59e0b",
      fontFamily: "Playfair Display",
      borderRadius: "md",
    },
    sections: [
      {
        type: "hero",
        props: {
          title: "Artisan Coffee & Fresh Pastries",
          subtitle: "Your neighborhood café since 2015. Handcrafted drinks, locally-sourced ingredients.",
          alignment: "center",
          backgroundImage: { src: "/cafe-interior.jpg", alt: "Cozy café interior" },
          cta: { text: "View Menu", href: "#menu", actionType: "scroll" },
        },
      },
      {
        type: "features",
        props: {
          title: "What Makes Us Special",
          layout: "grid-3",
          features: [
            { id: "f1", icon: "Coffee", title: "Specialty Coffee", description: "Single-origin beans roasted locally" },
            { id: "f2", icon: "Cake", title: "Fresh Pastries", description: "Baked in-house daily" },
            { id: "f3", icon: "Leaf", title: "Local Ingredients", description: "Partnering with regional farms" },
          ],
        },
      },
      {
        type: "gallery",
        props: {
          title: "Our Creations",
          layout: "grid-3",
          images: [
            { id: "g1", src: "/latte-art.jpg", alt: "Latte art" },
            { id: "g2", src: "/croissants.jpg", alt: "Fresh croissants" },
            { id: "g3", src: "/cafe-seating.jpg", alt: "Cozy seating area" },
          ],
        },
      },
      {
        type: "cta",
        props: {
          title: "Visit Us Today",
          description: "Open daily 7am - 7pm",
          primaryCta: { text: "Get Directions", actionType: "link" },
        },
      },
    ],
    promptVariants: [
      { instruction: "Create a landing page for a cozy neighborhood café with specialty coffee.", input: "Industry: food & beverage. Atmosphere: warm, inviting. Features: specialty coffee, fresh baked goods." },
      { instruction: "Design a café website showcasing artisan coffee and homemade pastries.", input: "Target: coffee enthusiasts, remote workers. Include gallery and testimonials." },
      { instruction: "Build a simple landing page for a coffee shop focusing on quality.", input: "Sections: hero, features, gallery, location CTA." },
    ],
  },

  // 3. VACATION RENTAL
  {
    name: "vacation-rental",
    industry: "hospitality",
    description: "Charming German countryside pension with cozy rooms and regional breakfast",
    theme: {
      primaryColor: "#166534",
      secondaryColor: "#84cc16",
      fontFamily: "Merriweather",
      borderRadius: "lg",
    },
    sections: [
      {
        type: "hero",
        props: {
          title: "Pension Landstübchen",
          subtitle: "Romantic countryside retreat. Surrounded by forests and meadows.",
          alignment: "center",
          slider: { images: [{ src: "/pension-exterior.jpg", alt: "Traditional house" }], autoPlay: true },
          cta: { text: "View Rooms", href: "#rooms", actionType: "scroll" },
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
          tiers: [
            { id: "r1", name: "Single Room", price: "€55", priceSubtext: "per night", features: [{ text: "Breakfast included", included: true }], cta: { text: "Book Room", actionType: "booking" } },
            { id: "r2", name: "Double Room", price: "€75", priceSubtext: "per night", highlighted: true, features: [{ text: "Breakfast included", included: true }], cta: { text: "Book Room", actionType: "booking" } },
            { id: "r3", name: "Family Room", price: "€120", priceSubtext: "per night", features: [{ text: "Fits 4 persons", included: true }], cta: { text: "Book Room", actionType: "booking" } },
          ],
        },
      },
      {
        type: "cta",
        props: {
          title: "Ready for Your Countryside Retreat?",
          primaryCta: { text: "Check Availability", actionType: "booking" },
        },
      },
    ],
    promptVariants: [
      { instruction: "Create a landing page for a German countryside pension with room booking.", input: "Industry: hospitality. Location: rural Germany. Features: room types with pricing, amenities." },
      { instruction: "Design a vacation rental website for a traditional German guesthouse.", input: "Key selling points: countryside, regional breakfast, family-friendly. Include room pricing." },
      { instruction: "Build a booking page for a small pension with single, double, and family rooms.", input: "Sections: hero slider, amenities, room pricing, booking CTA." },
    ],
  },

  // 4. EVENT REGISTRATION
  {
    name: "event-registration",
    industry: "events",
    description: "Professional conference or workshop registration page",
    theme: {
      primaryColor: "#7c3aed",
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
          subtitle: "Join 500+ industry leaders for three days of insights and networking.",
          alignment: "center",
          cta: { text: "Register Now - €299", actionType: "form" },
        },
      },
      {
        type: "features",
        props: {
          title: "Conference Highlights",
          layout: "grid-3",
          features: [
            { id: "f1", icon: "Mic", title: "30+ Speakers", description: "Industry experts sharing insights" },
            { id: "f2", icon: "Users", title: "Networking", description: "Connect with 500+ professionals" },
            { id: "f3", icon: "Lightbulb", title: "Workshops", description: "Hands-on sessions" },
          ],
        },
      },
      {
        type: "pricing",
        props: {
          title: "Registration Options",
          tiers: [
            { id: "t1", name: "Early Bird", price: "€199", features: [{ text: "Full conference access", included: true }], cta: { text: "Register", actionType: "form" } },
            { id: "t2", name: "Standard", price: "€299", highlighted: true, features: [{ text: "Full access + recordings", included: true }], cta: { text: "Register", actionType: "form" } },
            { id: "t3", name: "VIP", price: "€499", features: [{ text: "Everything + speaker dinner", included: true }], cta: { text: "Register", actionType: "form" } },
          ],
        },
      },
      {
        type: "cta",
        props: {
          title: "Don't Miss Out",
          description: "Early bird pricing ends May 1st",
          primaryCta: { text: "Register Now", actionType: "form" },
        },
      },
    ],
    promptVariants: [
      { instruction: "Create an event registration landing page for a tech conference.", input: "Event type: professional conference. Features: registration, pricing tiers, speaker profiles." },
      { instruction: "Design a conference registration page with speaker lineup and agenda.", input: "Key elements: hero, highlights, pricing comparison, FAQ, registration CTA." },
      { instruction: "Build a landing page for a 3-day conference with multiple ticket tiers.", input: "Sections: hero with date badge, features, pricing tiers, CTA." },
    ],
  },

  // 5. COWORKING SPACE
  {
    name: "coworking-space",
    industry: "real estate",
    description: "Modern coworking space with flexible memberships",
    theme: {
      primaryColor: "#0891b2",
      secondaryColor: "#22d3ee",
      fontFamily: "Poppins",
      borderRadius: "xl",
    },
    sections: [
      {
        type: "hero",
        props: {
          title: "Your New Office Awaits",
          subtitle: "Flexible workspace solutions for freelancers, startups, and remote teams.",
          alignment: "left",
          backgroundImage: { src: "/coworking-space.jpg", alt: "Modern coworking space" },
          cta: { text: "Book a Tour", actionType: "booking" },
        },
      },
      {
        type: "features",
        props: {
          title: "Everything You Need",
          layout: "grid-4",
          features: [
            { id: "f1", icon: "Wifi", title: "High-Speed Internet", description: "1Gbps fiber connection" },
            { id: "f2", icon: "Coffee", title: "Free Coffee & Snacks", description: "Unlimited beverages" },
            { id: "f3", icon: "Video", title: "Meeting Rooms", description: "Bookable by the hour" },
            { id: "f4", icon: "Lock", title: "24/7 Access", description: "Work on your schedule" },
          ],
        },
      },
      {
        type: "pricing",
        props: {
          title: "Flexible Plans",
          tiers: [
            { id: "p1", name: "Day Pass", price: "€25", priceSubtext: "per day", features: [{ text: "Hot desk access", included: true }], cta: { text: "Get Pass", actionType: "booking" } },
            { id: "p2", name: "Flex", price: "€199", priceSubtext: "per month", highlighted: true, features: [{ text: "10 day passes", included: true }], cta: { text: "Join Now", actionType: "booking" } },
            { id: "p3", name: "Unlimited", price: "€399", priceSubtext: "per month", features: [{ text: "Unlimited access", included: true }], cta: { text: "Join Now", actionType: "booking" } },
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
      { instruction: "Create a landing page for a modern coworking space with membership plans.", input: "Industry: real estate. Features: flexible membership tiers, amenities showcase, gallery." },
      { instruction: "Design a coworking space website emphasizing flexibility and community.", input: "Key sections: hero, amenities grid, pricing tiers, testimonials, booking CTA." },
      { instruction: "Build a landing page for a shared office space targeting freelancers.", input: "Key features: flexible membership, high-speed internet, meeting rooms." },
    ],
  },

  // 6. FREELANCER PORTFOLIO
  {
    name: "freelancer-portfolio",
    industry: "professional services",
    description: "Personal portfolio for a web developer or designer",
    theme: {
      primaryColor: "#2563eb",
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
          subtitle: "Full-stack developer specializing in React, Node.js, and cloud architecture.",
          alignment: "left",
          cta: { text: "View My Work", href: "#portfolio", actionType: "scroll" },
        },
      },
      {
        type: "features",
        props: {
          title: "What I Do",
          layout: "grid-3",
          features: [
            { id: "f1", icon: "Code", title: "Web Development", description: "Custom web applications" },
            { id: "f2", icon: "Smartphone", title: "Mobile Apps", description: "Cross-platform apps" },
            { id: "f3", icon: "Cloud", title: "Cloud Solutions", description: "Scalable infrastructure" },
          ],
        },
      },
      {
        type: "testimonials",
        props: {
          title: "Client Feedback",
          layout: "single",
          testimonials: [
            { id: "t1", quote: "Outstanding work! Delivered on time and exceeded expectations.", author: "Jennifer Adams", company: "TechStart Inc.", rating: 5 },
          ],
        },
      },
      {
        type: "cta",
        props: {
          title: "Let's Work Together",
          description: "Have a project in mind?",
          primaryCta: { text: "Start a Conversation", actionType: "contact" },
        },
      },
    ],
    promptVariants: [
      { instruction: "Create a personal portfolio landing page for a freelance web developer.", input: "Style: professional, modern. Sections: hero with availability badge, services, testimonial, contact." },
      { instruction: "Design a simple portfolio page for a full-stack developer seeking clients.", input: "Focus on: skills showcase, social proof, clear contact CTA. Minimal design." },
      { instruction: "Build a freelancer portfolio that converts visitors to client inquiries.", input: "Freelancer type: web developer. Need: services section, testimonials, contact CTA." },
    ],
  },

  // 7. BNI NETWORKING GROUP
  {
    name: "bni-chapter",
    industry: "business networking",
    description: "Local BNI chapter website for business networking group",
    theme: {
      primaryColor: "#dc2626",
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
        },
      },
      {
        type: "features",
        props: {
          title: "Why Join Our Chapter",
          layout: "grid-3",
          features: [
            { id: "f1", icon: "Users", title: "35+ Members", description: "Diverse industries, one network" },
            { id: "f2", icon: "TrendingUp", title: "€2M+ Referrals", description: "Annual referral value" },
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
            { id: "s4", number: 4, title: "Grow", description: "Receive referrals and grow" },
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
      { instruction: "Create a landing page for a local BNI business networking chapter.", input: "Purpose: attract guest visitors. Highlight: referral stats, meeting schedule, testimonials." },
      { instruction: "Design a BNI chapter website explaining the networking process.", input: "Key elements: value proposition, how BNI works, success stories, guest registration." },
      { instruction: "Build a landing page for a business networking group that meets weekly.", input: "Group type: BNI chapter. Features: member count, referral stats, how it works." },
    ],
  },

  // 8. CME REGISTRATION
  {
    name: "cme-registration",
    industry: "healthcare education",
    description: "Continuing Medical Education course registration",
    theme: {
      primaryColor: "#0f766e",
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
          subtitle: "Stay current with the latest advances in cardiovascular medicine.",
          alignment: "center",
          cta: { text: "Register Now", actionType: "form" },
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
        type: "pricing",
        props: {
          title: "Registration",
          tiers: [
            { id: "p1", name: "Early Bird", price: "€249", features: [{ text: "Full course access", included: true }], cta: { text: "Register", actionType: "form" } },
            { id: "p2", name: "Standard", price: "€349", highlighted: true, features: [{ text: "Access + 6-month recordings", included: true }], cta: { text: "Register", actionType: "form" } },
          ],
        },
      },
      {
        type: "cta",
        props: {
          title: "Secure Your Spot",
          description: "Limited to 200 participants",
          primaryCta: { text: "Register Now", actionType: "form" },
        },
      },
    ],
    promptVariants: [
      { instruction: "Create a CME course registration page for healthcare professionals.", input: "Industry: healthcare education. Must include: CME credits badge, faculty profiles, pricing." },
      { instruction: "Design a medical conference registration page with CME accreditation.", input: "Target audience: physicians seeking CME credits. Key sections: highlights, pricing, FAQ." },
      { instruction: "Build a professional development course page for doctors.", input: "Course: cardiology update. Features: CME points badge, expert faculty, pricing tiers." },
    ],
  },

  // 9. BREAD MARKETPLACE
  {
    name: "bread-marketplace",
    industry: "food & beverage",
    description: "Local artisan bread marketplace connecting hobby bakers with customers",
    theme: {
      primaryColor: "#92400e",
      secondaryColor: "#d97706",
      fontFamily: "Lora",
      borderRadius: "lg",
    },
    sections: [
      {
        type: "hero",
        props: {
          title: "Frisch gebackenes Brot von lokalen Handwerkern",
          subtitle: "Entdecken Sie handgefertigtes Sauerteigbrot von leidenschaftlichen Hobbybäckern.",
          alignment: "center",
          cta: { text: "Brot-Abo starten", actionType: "form" },
        },
      },
      {
        type: "features",
        props: {
          title: "Warum lokales Brot?",
          layout: "grid-3",
          features: [
            { id: "f1", icon: "Heart", title: "Mit Liebe gebacken", description: "Traditionelle Methoden" },
            { id: "f2", icon: "Leaf", title: "Natürliche Zutaten", description: "Keine Zusatzstoffe" },
            { id: "f3", icon: "MapPin", title: "Lokal & Frisch", description: "Aus Ihrer Gemeinde" },
          ],
        },
      },
      {
        type: "process",
        props: {
          title: "So funktioniert's",
          layout: "horizontal",
          steps: [
            { id: "s1", number: 1, title: "Brot auswählen", description: "Stöbern Sie durch das Angebot" },
            { id: "s2", number: 2, title: "Bestellen", description: "Wählen Sie den Abholtag" },
            { id: "s3", number: 3, title: "Frisch gebacken", description: "Am Morgen der Abholung" },
            { id: "s4", number: 4, title: "Abholen", description: "Warmes Brot genießen" },
          ],
        },
      },
      {
        type: "cta",
        props: {
          title: "Bereit für echtes Brot?",
          primaryCta: { text: "Jetzt Abo starten", actionType: "form" },
        },
      },
    ],
    promptVariants: [
      { instruction: "Create a landing page for an artisan bread marketplace.", input: "Industry: food marketplace. Features: bread gallery, how it works, subscription CTA." },
      { instruction: "Design a local food marketplace website for handmade bread.", input: "German audience. Key elements: hero, why local bread, product gallery, process." },
      { instruction: "Build a landing page for a bread subscription service.", input: "Focus on: freshness, traditional methods, local community." },
    ],
  },

  // 10. GUITAR HOBBY
  {
    name: "guitar-hobby",
    industry: "music & hobbies",
    description: "Personal website for a fingerstyle guitar enthusiast sharing resources",
    theme: {
      primaryColor: "#7c2d12",
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
          subtitle: "Ich bin Hobbygitarrist und teile hier meine Erfahrungen und Materialien.",
          alignment: "left",
          cta: { text: "Noten & Tabs entdecken", href: "#tabs", actionType: "scroll" },
        },
      },
      {
        type: "features",
        props: {
          title: "Alles rund um die akustische Gitarre",
          layout: "grid-3",
          features: [
            { id: "f1", icon: "Wrench", title: "Gitarrenbau", description: "Erfahrungen und Materialien" },
            { id: "f2", icon: "FileText", title: "Noten & Tabs", description: "Für Übungszwecke" },
            { id: "f3", icon: "ExternalLink", title: "Linksammlung", description: "Quellen für Materialien" },
          ],
        },
      },
      {
        type: "gallery",
        props: {
          title: "Meine Gitarren",
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
          description: "Fragen? Schreiben Sie mir gerne.",
          primaryCta: { text: "Kontakt aufnehmen", actionType: "contact" },
        },
      },
    ],
    promptVariants: [
      { instruction: "Create a personal hobby website for a fingerstyle guitar enthusiast.", input: "Content: guitar building resources, sheet music, link collection. Style: warm, personal." },
      { instruction: "Design a personal website for a musician sharing guitar resources.", input: "German audience. Sections: hero, resource features, guitar gallery, contact." },
      { instruction: "Build a hobby website for someone passionate about acoustic guitars.", input: "Features: personal story, resource categories, photo gallery, contact." },
    ],
  },

  // 11. COWORKING DETAIL
  {
    name: "coworking-detail",
    industry: "real estate",
    description: "Premium coworking space detail page in Airbnb listing style",
    theme: {
      primaryColor: "#0f172a",
      secondaryColor: "#3b82f6",
      fontFamily: "Inter",
      borderRadius: "xl",
    },
    sections: [
      {
        type: "hero",
        props: {
          badge: "Superhost",
          title: "l4yercak3 Studio - Premium Co-Working",
          subtitle: "4.9 ★ (127 reviews) • Historic Marketplace District",
          alignment: "left",
          cta: { text: "Book Workspace", actionType: "booking" },
        },
      },
      {
        type: "features",
        props: {
          title: "What this place offers",
          layout: "grid-4",
          features: [
            { id: "f1", icon: "Wifi", title: "High-speed WiFi", description: "1Gbps fiber" },
            { id: "f2", icon: "Monitor", title: "Dual Monitors", description: "At every workstation" },
            { id: "f3", icon: "Coffee", title: "Kitchen", description: "Fully equipped" },
            { id: "f4", icon: "Video", title: "Recording Studio", description: "Professional-grade" },
          ],
        },
      },
      {
        type: "pricing",
        props: {
          title: "Workspace Options",
          tiers: [
            { id: "w1", name: "Hot Desk", price: "€25", priceSubtext: "per day", features: [{ text: "Any available desk", included: true }], cta: { text: "Book", actionType: "booking" } },
            { id: "w2", name: "Recording Studio", price: "€50", priceSubtext: "per half-day", highlighted: true, features: [{ text: "Professional microphones", included: true }], cta: { text: "Book", actionType: "booking" } },
            { id: "w3", name: "Executive Suite", price: "€75", priceSubtext: "per day", features: [{ text: "Private room", included: true }], cta: { text: "Book", actionType: "booking" } },
          ],
        },
      },
      {
        type: "testimonials",
        props: {
          title: "Guest Reviews",
          layout: "grid",
          testimonials: [
            { id: "r1", quote: "Perfect space for content creation!", author: "Alex M.", role: "Podcaster", rating: 5 },
            { id: "r2", quote: "Beautiful historic building with modern amenities.", author: "Sarah K.", role: "Remote Worker", rating: 5 },
          ],
        },
      },
      {
        type: "cta",
        props: {
          title: "Ready to book?",
          primaryCta: { text: "Check Availability", actionType: "booking" },
        },
      },
    ],
    promptVariants: [
      { instruction: "Create a detailed coworking space listing page in Airbnb style.", input: "Style: property listing. Features: photo gallery, amenities, workspace tiers, reviews." },
      { instruction: "Design a premium workspace detail page with booking options.", input: "Layout: Airbnb-inspired. Include: hero with rating, amenities, pricing tiers, reviews." },
      { instruction: "Build a workspace listing for a premium coworking space.", input: "Features: recording studio, hot desks, executive suite. Include: photos, pricing, reviews." },
    ],
  },

  // 12. MEMBER BENEFITS
  {
    name: "member-benefits",
    industry: "membership",
    description: "Member benefits portal for a startup community or incubator",
    theme: {
      primaryColor: "#059669",
      secondaryColor: "#10b981",
      fontFamily: "Inter",
      borderRadius: "lg",
    },
    sections: [
      {
        type: "hero",
        props: {
          title: "Benefits für Mitglieder",
          subtitle: "Entdecke exklusive Vorteile von unseren Mitgliedern.",
          alignment: "left",
          cta: { text: "Neuen Benefit erstellen", actionType: "form" },
        },
      },
      {
        type: "features",
        props: {
          title: "Kategorien",
          layout: "grid-4",
          features: [
            { id: "c1", icon: "TrendingUp", title: "Marketing", description: "Tools und Beratung" },
            { id: "c2", icon: "Scale", title: "Beratung", description: "Rechts- und Steuerberatung" },
            { id: "c3", icon: "Code", title: "Software", description: "Tools und Lizenzen" },
            { id: "c4", icon: "Palette", title: "Design", description: "Workshops und Services" },
          ],
        },
      },
      {
        type: "process",
        props: {
          title: "So funktioniert's",
          layout: "horizontal",
          steps: [
            { id: "s1", number: 1, title: "Durchsuchen", description: "Finde passende Benefits" },
            { id: "s2", number: 2, title: "Kontaktieren", description: "Nimm Kontakt auf" },
            { id: "s3", number: 3, title: "Profitieren", description: "Nutze den Vorteil" },
            { id: "s4", number: 4, title: "Teilen", description: "Biete selbst Benefits an" },
          ],
        },
      },
      {
        type: "cta",
        props: {
          title: "Hast du auch einen Benefit anzubieten?",
          primaryCta: { text: "Benefit erstellen", actionType: "form" },
        },
      },
    ],
    promptVariants: [
      { instruction: "Create a member benefits portal for a startup community.", input: "Features: benefit categories, featured benefits, how it works, add benefit CTA." },
      { instruction: "Design a benefits marketplace for community members.", input: "German audience. Sections: hero, category grid, featured benefits, process steps." },
      { instruction: "Build a member portal showcasing exclusive community benefits.", input: "Categories: marketing, legal, software, design. Include: examples, how it works." },
    ],
  },
];

/**
 * Generate all synthetic examples from templates
 */
export function generateSyntheticExamples(): Array<{
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
}> {
  const examples: Array<{
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
  }> = [];

  for (const template of SYNTHETIC_TEMPLATES) {
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
  }

  return examples;
}
