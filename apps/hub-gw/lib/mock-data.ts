import type { Benefit, Provision, Leistung, UserProfile, BenefitRequest } from "./types"

export const CURRENT_USER_ID = "user-1"

export const mockUser: UserProfile = {
  name: "Julia Schneider",
  email: "julia.schneider@muster-tech.de",
  phone: "+49 151 12345678",
  business: {
    legalName: "Muster Tech Solutions GmbH",
    registerNumber: "HRB 123456",
    taxId: "DE123456789",
    address: {
      street: "Hauptstraße 42",
      city: "Berlin",
      postalCode: "10115",
      country: "Deutschland",
    },
    foundedDate: "2022-03-15",
    industry: "IT & Software",
  },
}

export const initialBenefits: Benefit[] = [
  {
    id: "1",
    title: "50% Rabatt auf Marketing-Tools",
    description:
      "Exklusiver Rabatt auf alle Marketing-Automatisierungstools für Gründungswerft-Mitglieder.",
    fullDescription:
      "Unser Marketing-Automation-Tool bietet dir alles, was du für erfolgreiches Online-Marketing brauchst. Von E-Mail-Kampagnen über Social-Media-Planung bis hin zu detaillierten Analytics – alles in einer Plattform. Als Gründungswerft-Mitglied erhältst du 50% Rabatt auf alle Tarife für die ersten 12 Monate.",
    redemptionInstructions:
      "Um den Rabatt zu nutzen, registriere dich auf unserer Website und gib bei der Zahlung den Rabattcode ein. Der Rabatt wird automatisch angewendet.",
    redemptionCode: "GRUENDUNGSWERFT50",
    category: "Marketing",
    provider: {
      name: "MarketingPro GmbH",
      type: "startup",
      profileLink: "https://gruendungswerft.com/members/marketingpro",
    },
    discount: "50%",
    ownerId: "user-2",
    views: 245,
    clicks: 89,
  },
  {
    id: "2",
    title: "Kostenlose Rechtsberatung",
    description:
      "Erste Rechtsberatung kostenlos für alle Mitglieder. Spezialisiert auf Startup-Recht.",
    fullDescription:
      "Als spezialisierte Kanzlei für Startup-Recht bieten wir umfassende Beratung in allen Rechtsfragen der Gründungsphase. Von der Wahl der Rechtsform über Gesellschaftsverträge bis hin zu Investorenverträgen – wir begleiten dich kompetent durch alle rechtlichen Herausforderungen.",
    redemptionInstructions:
      "Kontaktiere uns direkt per E-Mail oder Telefon und erwähne deine Gründungswerft-Mitgliedschaft. Wir vereinbaren dann einen kostenlosen Erstberatungstermin.",
    category: "Beratung",
    provider: {
      name: "Michael Weber",
      type: "person",
      profileLink: "https://gruendungswerft.com/members/michael-weber",
    },
    discount: "100%",
    ownerId: "user-1",
    views: 312,
    clicks: 156,
  },
  {
    id: "3",
    title: "Cloud-Hosting Vergünstigung",
    description: "30% Rabatt auf Cloud-Hosting-Dienste für das erste Jahr.",
    fullDescription:
      "Unser Cloud-Hosting bietet dir die perfekte Infrastruktur für deine Web-Projekte. Mit Servern in Deutschland, automatischen Backups und 24/7 Support kannst du dich voll auf dein Produkt konzentrieren.",
    redemptionInstructions:
      "Klicke auf den Einlösen-Link unten und registriere dich mit deiner Gründungswerft-E-Mail-Adresse. Der Rabatt wird automatisch aktiviert.",
    redemptionLink: "https://cloudtech.example.com/gruendungswerft",
    category: "Software",
    provider: {
      name: "CloudTech Solutions",
      type: "startup",
      profileLink: "https://gruendungswerft.com/members/cloudtech",
    },
    discount: "30%",
    ownerId: "user-3",
    views: 178,
    clicks: 67,
  },
]

export const initialProvisionen: Provision[] = [
  {
    id: "1",
    title: "IT-Fachkräfte Vermittlung",
    description:
      "Vermittlung von qualifizierten IT-Fachkräften und Entwicklern für Startups und etablierte Unternehmen.",
    fullDescription:
      "Wir suchen ständig qualifizierte IT-Fachkräfte für unsere Kunden. Wenn du jemanden kennst, der auf der Suche nach einer neuen Herausforderung ist, vermittle ihn an uns und erhalte eine attraktive Provision.",
    category: "IT & Entwicklung",
    commission: "10%",
    provider: {
      name: "TechTalent GmbH",
      type: "startup",
      profileLink: "https://gruendungswerft.com/members/techtalent",
    },
    ownerId: "user-2",
    views: 189,
    clicks: 45,
  },
  {
    id: "2",
    title: "Büroflächen Vermittlung",
    description:
      "Vermittlung von Büro- und Coworking-Spaces in ganz Deutschland.",
    fullDescription:
      "Als führender Vermittler von Büroflächen bieten wir attraktive Provisionen für erfolgreiche Vermittlungen. Egal ob kleines Startup oder etabliertes Unternehmen – wir finden die passende Lösung.",
    category: "Immobilien",
    commission: "5%",
    provider: {
      name: "Anna Schmidt",
      type: "person",
      profileLink: "https://gruendungswerft.com/members/anna-schmidt",
    },
    ownerId: "user-1",
    views: 134,
    clicks: 28,
  },
]

export const initialLeistungen: Leistung[] = [
  {
    id: "1",
    title: "Webentwicklung & Design",
    description:
      "Professionelle Webentwicklung mit React, Next.js und modernen Technologien.",
    fullDescription:
      "Ich biete professionelle Webentwicklung von der Konzeption bis zur Umsetzung. Spezialisiert auf moderne Frameworks wie React und Next.js, erstelle ich skalierbare und performante Webanwendungen.",
    category: "Webentwicklung",
    skills: ["React", "Next.js", "TypeScript", "Tailwind CSS"],
    hourlyRate: "95€",
    location: "Berlin",
    provider: {
      name: "Julia Schneider",
      type: "person",
      profileLink: "https://gruendungswerft.com/members/julia-schneider",
    },
    rating: 4.9,
    ownerId: "user-1",
    views: 423,
    clicks: 178,
  },
  {
    id: "2",
    title: "Grafikdesign & Branding",
    description:
      "Kreatives Grafikdesign für Startups und etablierte Unternehmen.",
    fullDescription:
      "Von der Logo-Entwicklung über Corporate Identity bis hin zu Marketing-Materialien – ich entwickle visuelle Identitäten, die im Gedächtnis bleiben und deine Marke stärken.",
    category: "Design",
    skills: ["Adobe Suite", "Figma", "Branding", "UI/UX"],
    hourlyRate: "75€",
    location: "München",
    provider: {
      name: "DesignStudio Berlin",
      type: "startup",
      profileLink: "https://gruendungswerft.com/members/designstudio-berlin",
    },
    rating: 4.7,
    ownerId: "user-2",
    views: 287,
    clicks: 92,
  },
]

export const initialRequests: BenefitRequest[] = [
  {
    id: "req-1",
    benefitId: "1",
    benefitTitle: "50% Rabatt auf Marketing-Tools",
    status: "approved",
    message: "Ich würde gerne den Marketing-Tools Rabatt für mein Startup nutzen.",
    createdAt: "2025-01-15",
    respondedAt: "2025-01-16",
  },
  {
    id: "req-2",
    benefitId: "3",
    benefitTitle: "Cloud-Hosting Vergünstigung",
    status: "pending",
    message: "Wir suchen nach einer günstigen Hosting-Lösung für unsere neue App.",
    createdAt: "2025-02-01",
  },
  {
    id: "req-3",
    benefitId: "2",
    benefitTitle: "Kostenlose Rechtsberatung",
    status: "rejected",
    message: "Brauche Beratung zu meinem Gesellschaftsvertrag.",
    createdAt: "2025-01-20",
    respondedAt: "2025-01-22",
  },
]
