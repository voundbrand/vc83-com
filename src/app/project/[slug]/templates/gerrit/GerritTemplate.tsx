"use client";

import { useState, useMemo, useRef, useEffect, Suspense } from "react";
import { Inter, Playfair_Display } from "next/font/google";
import { Anchor, Ship, Wind, Calendar, Mail, Phone, CheckCircle2, ArrowRight, ArrowUp, Play, ChevronDown, ChevronUp, TrendingUp, Users, Globe, Zap, FileText, Clock, Shield, Sparkles, Search, Target, Bot, Megaphone, Home, AlertCircle, Star, MessageSquare, Award, Bell, Heart, Package, MapPin, X, Info, Layers, Link2, FileSearch, PenTool, BarChart2, Eye, Lightbulb, Video, Camera, Film, Scissors, Instagram, Mic, Smartphone, Send, RefreshCw } from "lucide-react";
import { useLanguage, LanguageToggle, LanguageProvider } from "./language-context";
import { t } from "./translations";
import {
  EditModeProvider,
  EditableText,
  EditableMultilineText,
  EditModeToolbar,
} from "@/components/project-editing";
import {
  EditableEmailSubject,
  EditableEmailPreview,
} from "./EditableEmailContent";
import { useProjectDrawer } from "@/components/project-drawer";

// Initialize fonts
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});
import { Id } from "@convex/_generated/dataModel";
import {
  ProjectDrawerProvider,
  ProjectDrawerTrigger,
  ProjectDrawer,
  MeetingDetailModal,
  type ProjectDrawerConfig,
} from "@/components/project-drawer";

// ============================================
// TYPES
// ============================================

interface PricingOption {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  originalPrice?: number;
  savings?: number;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

interface Milestone {
  week: string;
  title: string;
  description: string;
  deliverables: string[];
}

interface LTVInputs {
  // Primary course (e.g., SBF Binnen)
  primaryCourseValue: number;
  primaryCoursesPerYear: number;
  // Upsell courses (e.g., SBF See, SKS, advanced)
  upsellRate: number; // % of customers who book additional courses
  avgUpsellValue: number;
  // Referral
  referralRate: number; // % of customers who refer others
  // For house: different model
  avgBookingValue: number;
  bookingsPerYear: number;
  repeatGuestRate: number;
}


// ============================================
// DETAIL MODAL COMPONENT
// ============================================

function DetailModal({
  isOpen,
  onClose,
  title,
  icon,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-white border border-stone-200 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <h3 className="text-xl font-serif font-bold text-slate-800">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================
// FLYWHEEL MODAL COMPONENT
// ============================================

interface FlywheelTouchpoint {
  id: string;
  phase: "acquire" | "book" | "nurture" | "deliver" | "advocacy";
  day: string;
  subject: string;
  preview: string;
  business: "segelschule" | "haus";
  journeyPhase: "vorher" | "waehrend" | "nachher";
  visualizationType: "message" | "google-search" | "ai-chat" | "social-ads" | "booking-flow" | "certificate" | "photo" | "review-request" | "referral-card";
  deviceContext: "phone" | "laptop" | "notification" | "none";
}

// All touchpoints for the flywheel - defined outside component for stability
const getAllTouchpoints = (language: "de" | "en"): FlywheelTouchpoint[] => {
  const isDE = language === "de";
  return [
    // ACQUIRE phase - marketing touchpoints
    {
      id: "acquire-seo",
      phase: "acquire",
      day: isDE ? "Fortlaufend" : "Ongoing",
      subject: isDE ? "SEO & Suchmaschinenoptimierung" : "SEO & Search Engine Optimization",
      preview: isDE
        ? "Organische Sichtbarkeit in Google für Suchbegriffe wie 'Segelkurs Ostsee', 'Ferienwohnung Stettiner Haff'. Langfristig der wichtigste Kanal."
        : "Organic visibility in Google for search terms like 'sailing course Baltic Sea', 'vacation rental Szczecin Lagoon'. The most important channel long-term.",
      business: "segelschule",
      journeyPhase: "vorher",
      visualizationType: "google-search",
      deviceContext: "none",
    },
    {
      id: "acquire-geo",
      phase: "acquire",
      day: isDE ? "Fortlaufend" : "Ongoing",
      subject: isDE ? "GEO & KI-Optimierung" : "GEO & AI Optimization",
      preview: isDE
        ? "Sichtbarkeit in ChatGPT, Perplexity und anderen KI-Assistenten. Die neue Art, wie Menschen Reisen planen."
        : "Visibility in ChatGPT, Perplexity and other AI assistants. The new way people plan trips.",
      business: "segelschule",
      journeyPhase: "vorher",
      visualizationType: "ai-chat",
      deviceContext: "none",
    },
    {
      id: "acquire-ads",
      phase: "acquire",
      day: isDE ? "Kampagnenbasiert" : "Campaign-based",
      subject: isDE ? "Bezahlte Werbung" : "Paid Advertising",
      preview: isDE
        ? "Gezielte Anzeigen auf Google, Facebook und Instagram. Schnelle Ergebnisse für saisonale Buchungen."
        : "Targeted ads on Google, Facebook and Instagram. Quick results for seasonal bookings.",
      business: "segelschule",
      journeyPhase: "vorher",
      visualizationType: "social-ads",
      deviceContext: "none",
    },
    // BOOK phase - booking touchpoints
    {
      id: "book-confirmation",
      phase: "book",
      day: isDE ? "Sofort nach Buchung" : "Immediately after booking",
      subject: isDE ? "Buchungsbestätigung" : "Booking Confirmation",
      preview: isDE
        ? "Deine Buchung ist bestätigt! Alle Details zu deinem Segelkurs am Stettiner Haff. Wir freuen uns auf dich."
        : "Your booking is confirmed! All details about your sailing course at the Szczecin Lagoon. We look forward to seeing you.",
      business: "segelschule",
      journeyPhase: "vorher",
      visualizationType: "booking-flow",
      deviceContext: "none",
    },
    {
      id: "book-invoice",
      phase: "book",
      day: isDE ? "Mit Bestätigung" : "With confirmation",
      subject: isDE ? "Rechnung & Zahlungsdetails" : "Invoice & Payment Details",
      preview: isDE
        ? "Im Anhang findest du deine Rechnung für den SBF Binnen Intensivkurs (15.-17. Juni 2024). Betrag: 549€. Zahlbar innerhalb von 14 Tagen per Überweisung. Bei Fragen zur Rechnung erreichst du uns unter 0123-456789."
        : "Attached you'll find your invoice for the SBF Inland Intensive Course (June 15-17, 2024). Amount: €549. Payable within 14 days by bank transfer. For questions about the invoice, reach us at 0123-456789.",
      business: "segelschule",
      journeyPhase: "vorher",
      visualizationType: "message",
      deviceContext: "laptop",
    },
    {
      id: "book-theory-access",
      phase: "book",
      day: isDE ? "Sofort nach Buchung" : "Immediately after booking",
      subject: isDE ? "Dein Theorie-Zugang ist freigeschaltet" : "Your Theory Access is Activated",
      preview: isDE
        ? "Dein persönlicher Zugang zum Online-Theorie-Portal ist jetzt aktiv! Benutzername: max.mustermann@email.de | Passwort: In separater E-Mail. Empfehlung: Starte mit den Navigationsregeln und mache täglich 15-20 Minuten. Die Praxis am Haff wird so viel leichter!"
        : "Your personal access to the online theory portal is now active! Username: max.mustermann@email.com | Password: In separate email. Tip: Start with navigation rules and do 15-20 minutes daily. Practice at the Haff will be so much easier!",
      business: "segelschule",
      journeyPhase: "vorher",
      visualizationType: "message",
      deviceContext: "laptop",
    },
    // NURTURE phase - anticipation sequence
    {
      id: "nurture-7days",
      phase: "nurture",
      day: isDE ? "7 Tage vorher" : "7 days before",
      subject: isDE ? "Das erwartet dich am Haff" : "What awaits you at the Haff",
      preview: isDE
        ? "In einer Woche ist es soweit! Das Stettiner Haff wartet auf dich – Stille, Weite, und das Gefühl, wirklich anzukommen. Hier ist ein kurzer Vorgeschmack: Wir starten morgens um 9 Uhr direkt am Wasser. Die ersten Stunden verbringst du mit den Grundlagen: Windrichtung lesen, Segel setzen, erste Manöver. Mittags gibt es eine Pause am Ufer. Bring bequeme Kleidung mit, die nass werden darf!"
        : "In one week it's time! The Szczecin Lagoon is waiting for you – silence, expanse, and the feeling of truly arriving. Here's a quick preview: We start at 9 AM right by the water. The first hours you'll spend on the basics: reading wind direction, setting sails, first maneuvers. Lunch break by the shore. Bring comfortable clothes that can get wet!",
      business: "segelschule",
      journeyPhase: "vorher",
      visualizationType: "message",
      deviceContext: "phone",
    },
    {
      id: "nurture-3days",
      phase: "nurture",
      day: isDE ? "3 Tage vorher" : "3 days before",
      subject: isDE ? "Deine Packliste fürs Haff" : "Your packing list for the Haff",
      preview: isDE
        ? "Fast geschafft! Hier ist deine Packliste:\n\n✓ Wasserdichte Jacke (wir haben Leih-Jacken falls nötig)\n✓ Schuhe mit heller Sohle (keine schwarzen Streifen auf dem Deck!)\n✓ Sonnencreme & Sonnenbrille\n✓ Wechselkleidung\n✓ Handtuch\n\nUnd ein Tipp: Lass das Handy im Auto. Die Zeit auf dem Wasser ist zum Abschalten da. Dein Ausbilder Gerrit freut sich auf dich!"
        : "Almost there! Here's your packing list:\n\n✓ Waterproof jacket (we have loaners if needed)\n✓ Shoes with light soles (no black marks on deck!)\n✓ Sunscreen & sunglasses\n✓ Change of clothes\n✓ Towel\n\nAnd a tip: Leave your phone in the car. Time on the water is for disconnecting. Your instructor Gerrit is looking forward to meeting you!",
      business: "segelschule",
      journeyPhase: "vorher",
      visualizationType: "message",
      deviceContext: "laptop",
    },
    {
      id: "nurture-1day",
      phase: "nurture",
      day: isDE ? "1 Tag vorher" : "1 day before",
      subject: isDE ? "Morgen geht's los!" : "Tomorrow it begins!",
      preview: isDE
        ? "Wettercheck: ☀️ 22°C, leichter Wind aus West – perfekte Segelbedingungen! Das Boot ist bereit, die Theorie hast du drauf. Morgen früh um 9 Uhr an der Slip-Anlage in Altwarp. Wir freuen uns auf dich! P.S. Bei Fragen erreichst du Gerrit unter 0170-1234567"
        : "Weather check: ☀️ 22°C, light westerly wind – perfect sailing conditions! The boat is ready, you've got the theory down. Tomorrow at 9 AM at the slipway in Altwarp. We're looking forward to seeing you! P.S. Questions? Reach Gerrit at 0170-1234567",
      business: "segelschule",
      journeyPhase: "vorher",
      visualizationType: "message",
      deviceContext: "notification",
    },
    {
      id: "nurture-upgrade",
      phase: "nurture",
      day: isDE ? "Mit Buchungsbestätigung" : "With booking confirmation",
      subject: isDE ? "Dein Upgrade-Angebot" : "Your Upgrade Offer",
      preview: isDE
        ? "Hey Max! Du fährst 3 Stunden aus Berlin? Dann mach eine richtige Auszeit daraus! Unser Komplett-Paket für dich: 3-Tage SBF Binnen Kurs + 2 Nächte in unserer Ferienwohnung direkt am Haff. Normalpreis: 749€. Für dich als Kursteilnehmer: nur 599€. Morgens aus dem Fenster schauen, Boot sehen, Kaffee trinken, lossegeln. So macht Lernen Spaß! Interesse? Antworte einfach auf diese Nachricht."
        : "Hey Max! Driving 3 hours from Berlin? Then make it a proper getaway! Our complete package for you: 3-day SBF Inland course + 2 nights in our vacation apartment right at the Haff. Regular price: €749. For you as a course participant: only €599. Wake up, see the boat from your window, have coffee, go sailing. That's how learning should be! Interested? Just reply to this message.",
      business: "segelschule",
      journeyPhase: "vorher",
      visualizationType: "message",
      deviceContext: "phone",
    },
    // DELIVER phase - during the experience
    {
      id: "deliver-welcome",
      phase: "deliver",
      day: isDE ? "Tag 1, Ankunft" : "Day 1, Arrival",
      subject: isDE ? "Willkommen am Haff!" : "Welcome to the Haff!",
      preview: isDE
        ? "Schön, dass du da bist, Max! 🌊 Hier sind die wichtigsten Infos für heute:\n\n📍 Treffpunkt: Slip-Anlage Altwarp\n⏰ Start: 9:00 Uhr\n👕 Kleidung: Wettergerecht, kann nass werden\n📱 WLAN-Passwort Bootshaus: HaffSailing2024\n\nBei Fragen: Gerrit ist unter 0170-1234567 erreichbar. Viel Spaß auf dem Wasser!"
        : "Great to have you here, Max! 🌊 Here's the key info for today:\n\n📍 Meeting point: Slipway Altwarp\n⏰ Start: 9:00 AM\n👕 Clothing: Weather-appropriate, can get wet\n📱 Boathouse WiFi password: HaffSailing2024\n\nQuestions? Gerrit is reachable at 0170-1234567. Have fun on the water!",
      business: "segelschule",
      journeyPhase: "waehrend",
      visualizationType: "message",
      deviceContext: "notification",
    },
    {
      id: "deliver-checkin",
      phase: "deliver",
      day: isDE ? "Tag 2, 10:00 Uhr" : "Day 2, 10:00 AM",
      subject: isDE ? "Wie läuft's auf dem Wasser?" : "How's it going on the water?",
      preview: isDE
        ? "Hey Max, kurze Frage zum zweiten Tag: Läuft alles nach Plan? Ist das Tempo okay? Verstehst du dich mit der Gruppe? Wenn irgendetwas nicht passt – melde dich sofort! Wir wollen, dass du das Beste aus dem Kurs rausholst. Antworte einfach auf diese Nachricht oder ruf Gerrit direkt an."
        : "Hey Max, quick check-in on day two: Is everything going as planned? Is the pace okay? Getting along with the group? If anything's not right – let us know immediately! We want you to get the most out of this course. Just reply to this message or call Gerrit directly.",
      business: "segelschule",
      journeyPhase: "waehrend",
      visualizationType: "message",
      deviceContext: "phone",
    },
    {
      id: "deliver-photo",
      phase: "deliver",
      day: isDE ? "Tag 1, Nachmittag" : "Day 1, afternoon",
      subject: isDE ? "📸 Foto-Zeit!" : "📸 Photo Time!",
      preview: isDE
        ? "Perfektes Licht gerade! Zeit für ein Gruppenfoto auf dem Plattboden? Diese Fotos schickst du deinen Freunden und Familie – und in einem Jahr denkst du 'Das war der Moment, als ich segeln gelernt habe'. Die Bilder bekommst du nach dem Kurs digital zugeschickt!"
        : "Perfect light right now! Time for a group photo on the flat-bottom boat? These are the photos you'll send to friends and family – and in a year you'll think 'That was the moment I learned to sail'. You'll receive the pictures digitally after the course!",
      business: "segelschule",
      journeyPhase: "waehrend",
      visualizationType: "photo",
      deviceContext: "phone",
    },
    {
      id: "deliver-progress",
      phase: "deliver",
      day: isDE ? "Jeden Abend" : "Every evening",
      subject: isDE ? "Dein Tag auf dem Wasser" : "Your day on the water",
      preview: isDE
        ? "Tag 2 geschafft, Max! 💪\n\n✅ Heute gelernt: Wende und Halse\n✅ Highlight: Deine erste selbstständige Wende!\n📋 Morgen: Anlegen unter Segeln\n\nDu machst das wirklich großartig. Der Wind war heute dein Freund – und du hast verstanden, ihn zu nutzen. Ruh dich gut aus, morgen wird spannend!"
        : "Day 2 complete, Max! 💪\n\n✅ Learned today: Tacking and jibing\n✅ Highlight: Your first independent tack!\n📋 Tomorrow: Docking under sail\n\nYou're doing really great. The wind was your friend today – and you learned to use it. Rest well, tomorrow will be exciting!",
      business: "segelschule",
      journeyPhase: "waehrend",
      visualizationType: "message",
      deviceContext: "phone",
    },
    // ADVOCACY phase - after the experience
    {
      id: "advocacy-certificate",
      phase: "advocacy",
      day: isDE ? "1 Tag danach" : "1 day after",
      subject: isDE ? "Du hast es geschafft! Dein Zertifikat" : "You did it! Your certificate",
      preview: isDE
        ? "Herzlichen Glückwunsch, Max! 🎉 Du hast den SBF Binnen erfolgreich bestanden! Im Anhang findest du dein Teilnahmezertifikat. Deinen offiziellen Führerschein bekommst du in den nächsten 4-6 Wochen per Post. Wir sind stolz auf dich – du bist jetzt Teil der Haff-Familie!"
        : "Congratulations, Max! 🎉 You've successfully passed your SBF Inland! Attached is your participation certificate. Your official license will arrive by mail in 4-6 weeks. We're proud of you – you're now part of the Haff family!",
      business: "segelschule",
      journeyPhase: "nachher",
      visualizationType: "certificate",
      deviceContext: "none",
    },
    {
      id: "advocacy-review",
      phase: "advocacy",
      day: isDE ? "3 Tage danach" : "3 days after",
      subject: isDE ? "Wie war dein Erlebnis am Haff?" : "How was your experience at the Haff?",
      preview: isDE
        ? "Hey Max, wie geht's dir nach dem Kurs? 🌊 Deine Meinung hilft anderen, das Haff zu entdecken. Eine kurze Google-Bewertung würde uns sehr viel bedeuten – dauert nur 1 Minute! Was hat dir am besten gefallen? Das idyllische Revier? Die kleine Gruppe? Gerrits Unterricht? Teile deine Erfahrung: [Link zur Bewertung]"
        : "Hey Max, how are you feeling after the course? 🌊 Your opinion helps others discover the Haff. A quick Google review would mean a lot to us – takes only 1 minute! What did you like best? The idyllic area? The small group? Gerrit's teaching? Share your experience: [Link to review]",
      business: "segelschule",
      journeyPhase: "nachher",
      visualizationType: "review-request",
      deviceContext: "phone",
    },
    {
      id: "advocacy-referral",
      phase: "advocacy",
      day: isDE ? "7 Tage danach" : "7 days after",
      subject: isDE ? "Kennst du jemanden, der segeln lernen möchte?" : "Know someone who wants to learn sailing?",
      preview: isDE
        ? "Du warst begeistert vom Kurs am Haff? Dann teile diese Erfahrung! 🎁 Für jeden Freund, der über deine Empfehlung bucht, bekommst du 50€ Gutschein für deinen nächsten Kurs (SBF See, SKS, oder Urlaubssegeln). Dein persönlicher Empfehlungscode: HAFF-MAX2024. Einfach weitergeben – dein Freund bekommt auch 25€ Rabatt!"
        : "Loved your course at the Haff? Share the experience! 🎁 For every friend who books through your referral, you get a €50 voucher for your next course (SBF Sea, SKS, or vacation sailing). Your personal referral code: HAFF-MAX2024. Just share it – your friend also gets €25 off!",
      business: "segelschule",
      journeyPhase: "nachher",
      visualizationType: "referral-card",
      deviceContext: "phone",
    },
    {
      id: "advocacy-upsell",
      phase: "advocacy",
      day: isDE ? "14 Tage danach" : "14 days after",
      subject: isDE ? "Bereit für den nächsten Schritt? SBF See wartet!" : "Ready for the next step? SBF Sea awaits!",
      preview: isDE
        ? "Hey Max! 14 Tage sind vergangen – kribbelt es schon wieder in den Fingern? ⛵ Mit deinem SBF Binnen kannst du jetzt den logischen nächsten Schritt machen: SBF See. Vom Haff aufs offene Meer!\n\nDein Vorteil als ehemaliger Schüler:\n✅ 15% Rabatt auf den SBF See Kurs\n✅ Die Theorie kennst du schon zum Teil\n✅ Du weißt, wie wir arbeiten\n\nNächster Termin: 20.-22. Juli. Interesse?"
        : "Hey Max! 14 days have passed – feeling the itch again? ⛵ With your SBF Inland, you can now take the logical next step: SBF Sea. From the Haff to the open sea!\n\nYour advantage as a former student:\n✅ 15% discount on the SBF Sea course\n✅ You already know part of the theory\n✅ You know how we work\n\nNext date: July 20-22. Interested?",
      business: "segelschule",
      journeyPhase: "nachher",
      visualizationType: "message",
      deviceContext: "phone",
    },
    {
      id: "advocacy-anniversary",
      phase: "advocacy",
      day: isDE ? "1 Jahr später" : "1 year later",
      subject: isDE ? "Ein Jahr ist vergangen – erinnerst du dich?" : "One year later – do you remember?",
      preview: isDE
        ? "Hey Max! 🎂 Heute vor genau einem Jahr hast du am Stettiner Haff segeln gelernt. Erinnerst du dich an diesen Moment, als du das erste Mal alleine gewendet hast? Der Wind, die Stille, das Gefühl von Freiheit?\n\nZeit für eine Wiederkehr! Wie wäre es mit:\n🌅 Wochenend-Törn am Haff\n📜 Auffrischungskurs\n⛵ SKS Kurs für ambitionierte Segler\n\nAls Jubiläumsgeschenk: 20% auf alle Kurse diesen Monat!"
        : "Hey Max! 🎂 Exactly one year ago today, you learned to sail at the Szczecin Lagoon. Remember that moment when you first tacked by yourself? The wind, the silence, the feeling of freedom?\n\nTime to return! How about:\n🌅 Weekend trip at the Haff\n📜 Refresher course\n⛵ SKS course for ambitious sailors\n\nAs an anniversary gift: 20% off all courses this month!",
      business: "segelschule",
      journeyPhase: "nachher",
      visualizationType: "message",
      deviceContext: "laptop",
    },
    {
      id: "advocacy-earlybird",
      phase: "advocacy",
      day: isDE ? "Vor der Saison" : "Before the season",
      subject: isDE ? "Early-Bird 2025: Dein Platz am Haff wartet" : "Early-Bird 2025: Your spot at the Haff awaits",
      preview: isDE
        ? "Hey Max! ☀️ Die neue Saison 2025 startet – und als ehemaliger Schüler bekommst du First Access!\n\n🐦 Early-Bird Rabatt: 10% auf alle Kurse\n📅 Beste Termine: Mai & Juni (weniger voll, perfektes Wetter)\n⏰ Angebot gültig bis: 31. März 2025\n\nWas planst du?\n• SBF See (der nächste Schritt)\n• SKS (für Fortgeschrittene)\n• Wochenend-Törn (einfach entspannen)\n\nDie beliebtesten Termine sind schnell weg. Sichere dir deinen Platz!"
        : "Hey Max! ☀️ The new 2025 season is starting – and as a former student, you get First Access!\n\n🐦 Early-Bird discount: 10% off all courses\n📅 Best dates: May & June (less crowded, perfect weather)\n⏰ Offer valid until: March 31, 2025\n\nWhat are you planning?\n• SBF Sea (the next step)\n• SKS (for advanced sailors)\n• Weekend trip (just relax)\n\nThe most popular dates go fast. Secure your spot!",
      business: "segelschule",
      journeyPhase: "nachher",
      visualizationType: "message",
      deviceContext: "laptop",
    },

    // ============================================
    // HAUS / HAFF ERLEBEN TOUCHPOINTS
    // ============================================

    // ACQUIRE phase - Haus marketing touchpoints
    {
      id: "haus-acquire-seo",
      phase: "acquire",
      day: isDE ? "Fortlaufend" : "Ongoing",
      subject: isDE ? "SEO & Suchmaschinenoptimierung" : "SEO & Search Engine Optimization",
      preview: isDE
        ? "Organische Sichtbarkeit in Google für Suchbegriffe wie 'Ferienwohnung Stettiner Haff', 'Kapitänshaus Altwarp', 'Urlaub am Haff'. Gäste suchen nach authentischen Unterkünften abseits des Massentourismus."
        : "Organic visibility in Google for search terms like 'vacation rental Szczecin Lagoon', 'Captain's house Altwarp', 'holiday at the Haff'. Guests search for authentic accommodations away from mass tourism.",
      business: "haus",
      journeyPhase: "vorher",
      visualizationType: "google-search",
      deviceContext: "none",
    },
    {
      id: "haus-acquire-geo",
      phase: "acquire",
      day: isDE ? "Fortlaufend" : "Ongoing",
      subject: isDE ? "GEO & KI-Optimierung" : "GEO & AI Optimization",
      preview: isDE
        ? "Sichtbarkeit in ChatGPT, Perplexity und anderen KI-Assistenten. 'Wo kann ich einen ruhigen Urlaub am Wasser machen, nicht zu weit von Berlin?' – Haff Erleben als Antwort."
        : "Visibility in ChatGPT, Perplexity and other AI assistants. 'Where can I have a quiet vacation by the water, not too far from Berlin?' – Haff Erleben as the answer.",
      business: "haus",
      journeyPhase: "vorher",
      visualizationType: "ai-chat",
      deviceContext: "none",
    },
    {
      id: "haus-acquire-ads",
      phase: "acquire",
      day: isDE ? "Kampagnenbasiert" : "Campaign-based",
      subject: isDE ? "Bezahlte Werbung" : "Paid Advertising",
      preview: isDE
        ? "Gezielte Anzeigen auf Google, Facebook und Instagram. Bilder vom Kapitänshaus, Sonnenuntergänge am Haff, die Ruhe der Natur. Saisonale Kampagnen für Kurzurlaub und Feiertage."
        : "Targeted ads on Google, Facebook and Instagram. Images of the Captain's house, sunsets at the Haff, the tranquility of nature. Seasonal campaigns for short breaks and holidays.",
      business: "haus",
      journeyPhase: "vorher",
      visualizationType: "social-ads",
      deviceContext: "none",
    },

    // BOOK phase - Haus booking touchpoints
    {
      id: "haus-book-confirmation",
      phase: "book",
      day: isDE ? "Sofort nach Buchung" : "Immediately after booking",
      subject: isDE ? "Buchungsbestätigung – Willkommen im Kapitänshaus!" : "Booking Confirmation – Welcome to the Captain's House!",
      preview: isDE
        ? "Deine Buchung ist bestätigt! Das historische Kapitänshaus am Stettiner Haff erwartet dich. Alle Details zu deinem Aufenthalt, Anreise und was dich erwartet."
        : "Your booking is confirmed! The historic Captain's house at the Szczecin Lagoon awaits you. All details about your stay, arrival and what to expect.",
      business: "haus",
      journeyPhase: "vorher",
      visualizationType: "booking-flow",
      deviceContext: "none",
    },
    {
      id: "haus-book-invoice",
      phase: "book",
      day: isDE ? "Mit Bestätigung" : "With confirmation",
      subject: isDE ? "Rechnung & Zahlungsdetails" : "Invoice & Payment Details",
      preview: isDE
        ? "Im Anhang findest du deine Rechnung für deinen Aufenthalt im Kapitänshaus (21.-24. Juni 2024, 3 Nächte). Betrag: 387€ inkl. Endreinigung. Zahlbar innerhalb von 7 Tagen per Überweisung. Anzahlung: 50% sofort, Rest 14 Tage vor Anreise."
        : "Attached you'll find your invoice for your stay at the Captain's House (June 21-24, 2024, 3 nights). Amount: €387 incl. final cleaning. Payable within 7 days by bank transfer. Deposit: 50% now, remainder 14 days before arrival.",
      business: "haus",
      journeyPhase: "vorher",
      visualizationType: "message",
      deviceContext: "laptop",
    },
    {
      id: "haus-book-checkin-info",
      phase: "book",
      day: isDE ? "Mit Bestätigung" : "With confirmation",
      subject: isDE ? "Check-in Informationen & Anreise" : "Check-in Information & Directions",
      preview: isDE
        ? "Alles Wichtige für deine Anreise:\n\n📍 Adresse: Hafenstraße 12, 17375 Altwarp\n🕐 Check-in: ab 15:00 Uhr\n🕐 Check-out: bis 11:00 Uhr\n🔑 Schlüsselübergabe: Schlüsselbox am Eingang (Code kommt 1 Tag vorher)\n🚗 Parkplatz: Direkt am Haus, kostenlos\n🐕 Haustiere: Willkommen! (bitte vorher anmelden)\n\nBei Fragen: 0170-1234567"
        : "Everything important for your arrival:\n\n📍 Address: Hafenstraße 12, 17375 Altwarp\n🕐 Check-in: from 3:00 PM\n🕐 Check-out: by 11:00 AM\n🔑 Key handover: Key box at entrance (code comes 1 day before)\n🚗 Parking: Right at the house, free\n🐕 Pets: Welcome! (please register in advance)\n\nQuestions: 0170-1234567",
      business: "haus",
      journeyPhase: "vorher",
      visualizationType: "message",
      deviceContext: "laptop",
    },

    // NURTURE phase - Haus anticipation sequence
    {
      id: "haus-nurture-7days",
      phase: "nurture",
      day: isDE ? "7 Tage vorher" : "7 days before",
      subject: isDE ? "In einer Woche am Haff – Das erwartet dich" : "One week until the Haff – What awaits you",
      preview: isDE
        ? "In 7 Tagen öffnet sich die Tür zum Kapitänshaus! 🏠\n\nDas erwartet dich:\n• Hohe Decken und historisches Ambiente aus der Kapitänszeit\n• Blick aufs Haff von deinem Zimmer\n• Vollausgestattete Küche für Selbstversorger\n• Kaminzimmer für gemütliche Abende\n• Direkter Zugang zum Wasser (100m)\n\nDie Ruhe hier ist unbezahlbar. Kein Handyempfang nötig – nur Ankommen."
        : "In 7 days the door to the Captain's House opens! 🏠\n\nWhat awaits you:\n• High ceilings and historic ambiance from the captain's era\n• View of the Haff from your room\n• Fully equipped kitchen for self-catering\n• Fireplace room for cozy evenings\n• Direct water access (100m)\n\nThe tranquility here is priceless. No cell reception needed – just arriving.",
      business: "haus",
      journeyPhase: "vorher",
      visualizationType: "message",
      deviceContext: "phone",
    },
    {
      id: "haus-nurture-3days",
      phase: "nurture",
      day: isDE ? "3 Tage vorher" : "3 days before",
      subject: isDE ? "Packliste & Geheimtipps fürs Haff" : "Packing list & insider tips for the Haff",
      preview: isDE
        ? "Fast geschafft! Hier deine Packliste:\n\n✓ Bequeme Kleidung (es ist entspannt hier!)\n✓ Wanderschuhe für Küstenwege\n✓ Fernglas (Vogelbeobachtung!)\n✓ Lieblingsbuch fürs Kaminzimmer\n✓ Badesachen (Naturstrand 10 Min. zu Fuß)\n\n🎯 Geheimtipp: Frag im Hafen nach frischem Fisch direkt vom Kutter!\n\n📍 Supermarkt: Ueckermünde (15 Min.) – am besten vorher einkaufen"
        : "Almost there! Your packing list:\n\n✓ Comfortable clothes (it's relaxed here!)\n✓ Hiking shoes for coastal paths\n✓ Binoculars (bird watching!)\n✓ Favorite book for the fireplace room\n✓ Swimwear (natural beach 10 min walk)\n\n🎯 Insider tip: Ask at the harbor for fresh fish straight from the cutter!\n\n📍 Supermarket: Ueckermünde (15 min) – best to shop beforehand",
      business: "haus",
      journeyPhase: "vorher",
      visualizationType: "message",
      deviceContext: "laptop",
    },
    {
      id: "haus-nurture-1day",
      phase: "nurture",
      day: isDE ? "1 Tag vorher" : "1 day before",
      subject: isDE ? "Morgen geht's los! Dein Schlüsselcode" : "Tomorrow it begins! Your key code",
      preview: isDE
        ? "Das Kapitänshaus ist bereit für dich! 🔑\n\n📍 Adresse: Hafenstraße 12, 17375 Altwarp\n🔐 Schlüsselbox-Code: 4729\n🕐 Check-in ab: 15:00 Uhr\n\nWettervorhersage: ☀️ 24°C – perfekt für den Naturstrand!\n\nBei Ankunft findest du:\n• Willkommenskorb mit lokalen Spezialitäten\n• Frische Handtücher und Bettwäsche\n• Infos zu Ausflügen in der Gegend\n\nGute Anreise! Bei Fragen: 0170-1234567"
        : "The Captain's House is ready for you! 🔑\n\n📍 Address: Hafenstraße 12, 17375 Altwarp\n🔐 Key box code: 4729\n🕐 Check-in from: 3:00 PM\n\nWeather forecast: ☀️ 24°C – perfect for the natural beach!\n\nOn arrival you'll find:\n• Welcome basket with local specialties\n• Fresh towels and linens\n• Info about excursions in the area\n\nSafe travels! Questions: 0170-1234567",
      business: "haus",
      journeyPhase: "vorher",
      visualizationType: "message",
      deviceContext: "notification",
    },
    {
      id: "haus-nurture-crosssell-sailing",
      phase: "nurture",
      day: isDE ? "Mit Buchungsbestätigung" : "With booking confirmation",
      subject: isDE ? "Segeln lernen während deines Aufenthalts?" : "Learn to sail during your stay?",
      preview: isDE
        ? "Hey! Eine Idee für deinen Aufenthalt: ⛵\n\nUnser Partner Gerrit bietet Segelkurse direkt am Haff an. Du könntest während deines Urlaubs deinen Segelschein machen!\n\n🎓 SBF Binnen Schnupperkurs (1 Tag): 149€\n🎓 SBF Binnen Komplett (3 Tage): 549€\n\nAls Hausgast bekommst du 10% Rabatt!\n\nStell dir vor: Morgens aufwachen im Kapitänshaus, dann raus aufs Wasser segeln. Abends mit einem Glas Wein am Kamin die Erlebnisse Revue passieren lassen.\n\nInteresse? Antworte einfach auf diese Nachricht."
        : "Hey! An idea for your stay: ⛵\n\nOur partner Gerrit offers sailing courses right at the Haff. You could get your sailing license during your vacation!\n\n🎓 SBF Inland Taster Course (1 day): €149\n🎓 SBF Inland Complete (3 days): €549\n\nAs a house guest you get 10% off!\n\nImagine: Wake up in the Captain's House, then go out sailing. In the evening, review the day's experiences with a glass of wine by the fireplace.\n\nInterested? Just reply to this message.",
      business: "haus",
      journeyPhase: "vorher",
      visualizationType: "message",
      deviceContext: "phone",
    },

    // DELIVER phase - Haus during stay
    {
      id: "haus-deliver-welcome",
      phase: "deliver",
      day: isDE ? "Anreisetag, 18:00 Uhr" : "Arrival day, 6:00 PM",
      subject: isDE ? "Willkommen im Kapitänshaus! Alles gefunden?" : "Welcome to the Captain's House! Found everything?",
      preview: isDE
        ? "Hallo und herzlich willkommen! 🏠\n\nIch hoffe, du hast gut hergefunden und dich schon ein bisschen umgeschaut. Das Kapitänshaus hat viele kleine Ecken zu entdecken!\n\n📌 Kurze Erinnerung:\n• WLAN-Passwort: HaffRuhe2024\n• Heizung/Kamin: Anleitung im Wohnzimmer\n• Mülltrennung: Tonnen hinterm Haus\n\n🌅 Tipp für heute Abend: Der Sonnenuntergang am Hafen ist magisch. Nur 5 Minuten zu Fuß!\n\nBei Fragen bin ich unter 0170-1234567 erreichbar. Genieß die Ruhe!"
        : "Hello and welcome! 🏠\n\nI hope you found your way and have already looked around a bit. The Captain's House has many little corners to discover!\n\n📌 Quick reminder:\n• WiFi password: HaffRuhe2024\n• Heating/fireplace: Instructions in living room\n• Waste separation: Bins behind the house\n\n🌅 Tip for tonight: The sunset at the harbor is magical. Just 5 minutes walk!\n\nQuestions? Reach me at 0170-1234567. Enjoy the tranquility!",
      business: "haus",
      journeyPhase: "waehrend",
      visualizationType: "message",
      deviceContext: "notification",
    },
    {
      id: "haus-deliver-midstay",
      phase: "deliver",
      day: isDE ? "Tag 2, 10:00 Uhr" : "Day 2, 10:00 AM",
      subject: isDE ? "Wie gefällt's dir am Haff?" : "How do you like it at the Haff?",
      preview: isDE
        ? "Guten Morgen! ☕\n\nIch hoffe, du hast gut geschlafen – die Ruhe hier ist was Besonderes, oder?\n\nKurze Frage: Ist alles in Ordnung? Funktioniert alles? Brauchst du irgendwas?\n\nFalls du heute was unternehmen möchtest:\n🚶 Wanderung zur Steilküste (2h, wunderschön)\n🚢 Bootsfahrt nach Nowe Warpno/Polen (ab Hafen)\n🍺 Fischbrötchen im Hafenkiosk\n🚴 Fahrräder gibt's im Schuppen (Schlüssel am Haken)\n\nGenieß den Tag!"
        : "Good morning! ☕\n\nI hope you slept well – the tranquility here is special, isn't it?\n\nQuick question: Is everything okay? Everything working? Need anything?\n\nIf you want to do something today:\n🚶 Hike to the cliff coast (2h, beautiful)\n🚢 Boat trip to Nowe Warpno/Poland (from harbor)\n🍺 Fish sandwich at the harbor kiosk\n🚴 Bikes in the shed (key on the hook)\n\nEnjoy your day!",
      business: "haus",
      journeyPhase: "waehrend",
      visualizationType: "message",
      deviceContext: "phone",
    },
    {
      id: "haus-deliver-localtips",
      phase: "deliver",
      day: isDE ? "Tag 2, Nachmittag" : "Day 2, Afternoon",
      subject: isDE ? "Ausflugstipps: Das Beste der Region" : "Excursion tips: The best of the region",
      preview: isDE
        ? "Falls du Lust auf Ausflüge hast – hier meine persönlichen Favoriten:\n\n🏰 Stettin (50km): Altstadt, Hakenterrasse, tolle Restaurants\n🏖️ Ueckermünde (15km): Sandstrand, Tierpark, Altstadt\n⚔️ Ukranenland Torgelow (30km): Freilichtmuseum, toll für Familien\n✈️ Anklam (40km): Lilienthal-Museum (Flugpionier)\n🦅 Vogelinsel Lysa Wyspa: Vom Ufer aus zu sehen!\n\n🍽️ Restaurant-Tipp: 'Zur Fähre' in Altwarp – frischer Zander!\n\nBrauchst du genauere Infos zu einem Ziel?"
        : "If you're in the mood for excursions – here are my personal favorites:\n\n🏰 Szczecin (50km): Old town, Haken Terrace, great restaurants\n🏖️ Ueckermünde (15km): Sandy beach, zoo, old town\n⚔️ Ukranenland Torgelow (30km): Open-air museum, great for families\n✈️ Anklam (40km): Lilienthal Museum (aviation pioneer)\n🦅 Bird island Lysa Wyspa: Visible from shore!\n\n🍽️ Restaurant tip: 'Zur Fähre' in Altwarp – fresh pike-perch!\n\nNeed more details about any destination?",
      business: "haus",
      journeyPhase: "waehrend",
      visualizationType: "message",
      deviceContext: "phone",
    },
    {
      id: "haus-deliver-photo",
      phase: "deliver",
      day: isDE ? "Vorletzter Tag" : "Second to last day",
      subject: isDE ? "📸 Das perfekte Haff-Foto?" : "📸 The perfect Haff photo?",
      preview: isDE
        ? "Hast du schon das perfekte Erinnerungsfoto gemacht? 📸\n\nMeine Lieblings-Fotospots:\n🌅 Hafen bei Sonnenuntergang (18:30-19:30)\n🏠 Kapitänshaus von der Wasserseite\n🌊 Steilküste mit Blick aufs Haff\n🦅 Vogelinsel im Morgenlicht\n\nFalls du Fotos vom Haus oder der Gegend auf Instagram teilst: @HaffErleben – ich freue mich über jeden Tag, den ich mit Gästen wie dir teilen kann!\n\nGenießt den letzten vollen Tag!"
        : "Have you taken the perfect memory photo yet? 📸\n\nMy favorite photo spots:\n🌅 Harbor at sunset (6:30-7:30 PM)\n🏠 Captain's House from the water side\n🌊 Cliff coast with Haff view\n🦅 Bird island in morning light\n\nIf you share photos of the house or area on Instagram: @HaffErleben – I love sharing days like this with guests like you!\n\nEnjoy your last full day!",
      business: "haus",
      journeyPhase: "waehrend",
      visualizationType: "photo",
      deviceContext: "phone",
    },

    // ADVOCACY phase - Haus after stay
    {
      id: "haus-advocacy-thankyou",
      phase: "advocacy",
      day: isDE ? "Abreisetag" : "Departure day",
      subject: isDE ? "Danke für deinen Besuch! Gute Heimreise" : "Thank you for your visit! Safe travels home",
      preview: isDE
        ? "Lieber Gast,\n\ndanke, dass du das Kapitänshaus mit Leben gefüllt hast! 🏠\n\nIch hoffe, du nimmst ein Stück Haff-Ruhe mit nach Hause. Die Tür steht dir immer offen – für ein Wochenende, eine Woche, oder wann immer du dem Alltag entfliehen möchtest.\n\nGute Heimreise und bis bald!\n\nP.S. Falls du was vergessen hast – melde dich einfach. Ich schicke es dir nach."
        : "Dear guest,\n\nthank you for filling the Captain's House with life! 🏠\n\nI hope you take a piece of Haff tranquility home with you. The door is always open – for a weekend, a week, or whenever you want to escape everyday life.\n\nSafe travels home and see you soon!\n\nP.S. If you forgot something – just let me know. I'll send it to you.",
      business: "haus",
      journeyPhase: "nachher",
      visualizationType: "message",
      deviceContext: "notification",
    },
    {
      id: "haus-advocacy-review",
      phase: "advocacy",
      day: isDE ? "3 Tage danach" : "3 days after",
      subject: isDE ? "Wie war dein Aufenthalt am Haff?" : "How was your stay at the Haff?",
      preview: isDE
        ? "Hey! Bist du gut zu Hause angekommen? 🏠\n\nIch hoffe, die Erinnerungen ans Haff sind noch frisch. Deine Meinung hilft anderen, diesen besonderen Ort zu entdecken.\n\nEine kurze Google-Bewertung würde mir sehr viel bedeuten – dauert nur 1 Minute!\n\nWas hat dir am besten gefallen?\n• Das historische Kapitänshaus?\n• Die Ruhe am Haff?\n• Der Sonnenuntergang am Hafen?\n• Die Natur und Wanderwege?\n\nJede Bewertung hilft! [Link zur Bewertung]"
        : "Hey! Did you get home safely? 🏠\n\nI hope the memories of the Haff are still fresh. Your opinion helps others discover this special place.\n\nA quick Google review would mean a lot to me – takes only 1 minute!\n\nWhat did you like best?\n• The historic Captain's House?\n• The tranquility at the Haff?\n• The sunset at the harbor?\n• The nature and hiking trails?\n\nEvery review helps! [Link to review]",
      business: "haus",
      journeyPhase: "nachher",
      visualizationType: "review-request",
      deviceContext: "phone",
    },
    {
      id: "haus-advocacy-referral",
      phase: "advocacy",
      day: isDE ? "7 Tage danach" : "7 days after",
      subject: isDE ? "Kennst du jemanden, der Ruhe braucht?" : "Know someone who needs tranquility?",
      preview: isDE
        ? "Du warst begeistert vom Kapitänshaus? Teile diese Erfahrung! 🎁\n\nFür jeden Freund oder Bekannten, der über deine Empfehlung bucht:\n• Du bekommst: 50€ Gutschein für deinen nächsten Aufenthalt\n• Dein Freund bekommt: 25€ Rabatt auf die erste Buchung\n\nDein persönlicher Empfehlungscode: HAFF-GAST2024\n\nEinfach weitergeben – per WhatsApp, E-Mail, oder erzähl einfach davon. Manchmal reicht ein 'Du musst da mal hin!' 😊"
        : "Loved the Captain's House? Share the experience! 🎁\n\nFor every friend who books through your referral:\n• You get: €50 voucher for your next stay\n• Your friend gets: €25 off their first booking\n\nYour personal referral code: HAFF-GAST2024\n\nJust share it – via WhatsApp, email, or just tell them about it. Sometimes a 'You have to go there!' is enough! 😊",
      business: "haus",
      journeyPhase: "nachher",
      visualizationType: "referral-card",
      deviceContext: "phone",
    },
    {
      id: "haus-advocacy-crosssell-sailing",
      phase: "advocacy",
      day: isDE ? "14 Tage danach" : "14 days after",
      subject: isDE ? "Nächstes Mal: Segeln lernen am Haff?" : "Next time: Learn to sail at the Haff?",
      preview: isDE
        ? "Hey! Vermisst du das Haff schon? ⛵\n\nEine Idee für deinen nächsten Besuch: Kombiniere Urlaub mit Segelkurs!\n\n🎓 3-Tage SBF Binnen Kurs\n🏠 + 3 Nächte im Kapitänshaus\n= Komplett-Paket für nur 899€ (statt 999€)\n\nMorgens Theorie, nachmittags aufs Wasser, abends am Kamin entspannen. So macht Lernen Spaß!\n\nNächste Termine:\n• 15.-17. Juli\n• 5.-7. August\n• 19.-21. August\n\nInteresse? Antworte einfach!"
        : "Hey! Missing the Haff already? ⛵\n\nAn idea for your next visit: Combine vacation with sailing course!\n\n🎓 3-day SBF Inland course\n🏠 + 3 nights at the Captain's House\n= Complete package for only €899 (instead of €999)\n\nMorning theory, afternoon on the water, evening relaxing by the fireplace. That's how learning should be!\n\nUpcoming dates:\n• July 15-17\n• August 5-7\n• August 19-21\n\nInterested? Just reply!",
      business: "haus",
      journeyPhase: "nachher",
      visualizationType: "message",
      deviceContext: "phone",
    },
    {
      id: "haus-advocacy-anniversary",
      phase: "advocacy",
      day: isDE ? "1 Jahr später" : "1 year later",
      subject: isDE ? "Ein Jahr ist vergangen – Zeit fürs Haff?" : "One year later – Time for the Haff?",
      preview: isDE
        ? "Hey! 🎂\n\nHeute vor genau einem Jahr bist du im Kapitänshaus angekommen. Erinnerst du dich?\n\n• Der erste Blick auf das Haff\n• Die Stille am Morgen\n• Der Sonnenuntergang am Hafen\n• Das Knistern im Kamin\n\nDas Haus wartet auf dich. Die Möwen sind noch da. Der Fisch im Hafen ist immer noch frisch.\n\nAls Jubiläumsgeschenk: 15% auf deinen nächsten Aufenthalt!\n\nCode: WIEDERSEHEN15\n\nGültig für Buchungen in den nächsten 30 Tagen."
        : "Hey! 🎂\n\nExactly one year ago today, you arrived at the Captain's House. Do you remember?\n\n• The first view of the Haff\n• The silence in the morning\n• The sunset at the harbor\n• The crackling fireplace\n\nThe house is waiting for you. The seagulls are still there. The fish at the harbor is still fresh.\n\nAs an anniversary gift: 15% off your next stay!\n\nCode: WIEDERSEHEN15\n\nValid for bookings in the next 30 days.",
      business: "haus",
      journeyPhase: "nachher",
      visualizationType: "message",
      deviceContext: "laptop",
    },
    {
      id: "haus-advocacy-earlybird",
      phase: "advocacy",
      day: isDE ? "Vor der Saison" : "Before the season",
      subject: isDE ? "Early-Bird 2025: Dein Platz am Haff" : "Early-Bird 2025: Your spot at the Haff",
      preview: isDE
        ? "Hey! ☀️\n\nDie Saison 2025 startet – und als ehemaliger Gast bekommst du First Access!\n\n🐦 Early-Bird Rabatt: 10% auf alle Buchungen\n📅 Beste Zeiten:\n   • Mai/Juni: Vogelzug, lange Abende\n   • September: Goldener Herbst, ruhig\n⏰ Angebot gültig bis: 28. Februar 2025\n\nBeliebteste Wochenenden (buchen sich schnell):\n• Pfingsten\n• Himmelfahrt\n• Herbstferien\n\nDein Code: FRUEHBUCHER2025\n\nDas Kapitänshaus freut sich auf dich! 🏠"
        : "Hey! ☀️\n\nThe 2025 season is starting – and as a former guest, you get First Access!\n\n🐦 Early-Bird discount: 10% off all bookings\n📅 Best times:\n   • May/June: Bird migration, long evenings\n   • September: Golden autumn, quiet\n⏰ Offer valid until: February 28, 2025\n\nMost popular weekends (book fast):\n• Pentecost\n• Ascension Day\n• Fall break\n\nYour code: FRUEHBUCHER2025\n\nThe Captain's House is looking forward to you! 🏠",
      business: "haus",
      journeyPhase: "nachher",
      visualizationType: "message",
      deviceContext: "laptop",
    },

    // ============================================
    // CROSS-SELL TOUCHPOINTS (Sailing -> Haus)
    // ============================================
    {
      id: "segelschule-crosssell-haus",
      phase: "nurture",
      day: isDE ? "Mit Buchungsbestätigung" : "With booking confirmation",
      subject: isDE ? "Übernachten am Haff? Perfekte Ergänzung!" : "Stay at the Haff? Perfect addition!",
      preview: isDE
        ? "Hey! Du hast deinen Segelkurs gebucht – super Entscheidung! ⛵\n\nEine Idee: Du fährst vermutlich ein paar Stunden her. Wie wäre es, wenn du das Ganze zu einem Mini-Urlaub machst?\n\n🏠 Das Kapitänshaus (100m vom Hafen)\n• Historisches Ambiente, hohe Decken\n• Blick aufs Haff\n• Kaminzimmer für die Abende\n\n📦 Dein Komplett-Paket:\n3-Tage Kurs + 2 Nächte = 749€ (statt 849€)\n\nMorgens aufwachen, zum Frühstück aufs Wasser schauen, dann zum Kurs schlendern. Abends die Erlebnisse am Kamin verarbeiten.\n\nInteresse?"
        : "Hey! You've booked your sailing course – great decision! ⛵\n\nAn idea: You're probably driving a few hours. How about making it a mini-vacation?\n\n🏠 The Captain's House (100m from harbor)\n• Historic ambiance, high ceilings\n• View of the Haff\n• Fireplace room for evenings\n\n📦 Your complete package:\n3-day course + 2 nights = €749 (instead of €849)\n\nWake up, watch the water over breakfast, stroll to the course. Process the day's experiences by the fireplace in the evening.\n\nInterested?",
      business: "segelschule",
      journeyPhase: "vorher",
      visualizationType: "message",
      deviceContext: "phone",
    },
  ];
};

// ============================================
// FLYWHEEL PREVIEW COMPONENTS
// ============================================

// Google Search Preview - for SEO touchpoint
function GoogleSearchPreview({ language, business }: { language: "de" | "en"; business: "segelschule" | "haus" }) {
  const isDE = language === "de";
  const isHaus = business === "haus";

  const searchQuery = isHaus
    ? (isDE ? "ferienwohnung stettiner haff" : "vacation rental szczecin lagoon")
    : (isDE ? "segelkurs ostsee bodden" : "sailing course baltic sea");

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-stone-200">
      {/* Google Header */}
      <div className="bg-white px-4 py-3 border-b border-stone-100">
        <div className="flex items-center gap-4">
          {/* Google Logo */}
          <div className="flex items-center">
            <span className="text-2xl font-bold">
              <span className="text-blue-500">G</span>
              <span className="text-red-500">o</span>
              <span className="text-yellow-500">o</span>
              <span className="text-blue-500">g</span>
              <span className="text-green-500">l</span>
              <span className="text-red-500">e</span>
            </span>
          </div>
          {/* Search Bar */}
          <div className="flex-1 max-w-xl">
            <div className="flex items-center bg-white border border-stone-300 rounded-full px-4 py-2 shadow-sm">
              <span className="text-slate-700 text-sm">{searchQuery}</span>
              <div className="ml-auto flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Results */}
      <div className="p-4 space-y-4">
        {/* Top Result */}
        <div className="group">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-6 h-6 ${isHaus ? "bg-amber-100" : "bg-sky-100"} rounded-full flex items-center justify-center`}>
              {isHaus ? <Home className="w-3 h-3 text-amber-600" /> : <Ship className="w-3 h-3 text-sky-600" />}
            </div>
            <span className="text-xs text-slate-500">{isHaus ? "www.haff-erleben.de" : "www.segelschule-altwarp.de"}</span>
          </div>
          <a className="text-lg text-blue-700 hover:underline cursor-pointer font-medium">
            {isHaus
              ? (isDE ? "Haff Erleben | Kapitänshaus am Stettiner Haff" : "Haff Erleben | Captain's House at Szczecin Lagoon")
              : (isDE ? "Segelschule Altwarp | Segelkurse am Stettiner Haff" : "Sailing School Altwarp | Courses at Szczecin Lagoon")}
          </a>
          <p className="text-sm text-slate-600 mt-1">
            {isHaus
              ? (isDE
                ? "Historisches Kapitänshaus direkt am Haff. Hohe Decken, Kaminzimmer, Blick aufs Wasser. Ruhe & Erholung pur. ★★★★★ 4.8"
                : "Historic Captain's house right at the lagoon. High ceilings, fireplace room, water view. Pure peace & relaxation. ★★★★★ 4.8")
              : (isDE
                ? "Segeln lernen am Stettiner Haff. SBF Binnen & See, Praxis am idyllischen Bodden. Kleine Gruppen, erfahrene Ausbilder. ★★★★★ 4.9"
                : "Learn to sail at Szczecin Lagoon. SBF inland & sea licenses, practice at the idyllic bodden. Small groups, experienced instructors. ★★★★★ 4.9")}
          </p>
        </div>

        {/* Second Result */}
        <div className="opacity-60">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-stone-100 rounded-full flex items-center justify-center">
              <Globe className="w-3 h-3 text-stone-400" />
            </div>
            <span className="text-xs text-slate-500">{isHaus ? "www.ferienwohnungen-usedom.de" : "www.andere-segelschule.de"}</span>
          </div>
          <a className="text-lg text-blue-700/70 cursor-pointer">
            {isHaus
              ? (isDE ? "Ferienwohnungen Usedom - Strandnah" : "Vacation Rentals Usedom - Near Beach")
              : (isDE ? "Segelschule Usedom - Kurse für Anfänger" : "Sailing School Usedom - Beginner Courses")}
          </a>
          <p className="text-sm text-slate-500 mt-1">
            {isHaus
              ? (isDE ? "Ferienwohnungen auf Usedom. Verschiedene Größen verfügbar..." : "Vacation rentals on Usedom. Various sizes available...")
              : (isDE ? "Segelkurse auf Usedom. Verschiedene Termine verfügbar..." : "Sailing courses on Usedom. Various dates available...")}
          </p>
        </div>

        {/* Third Result */}
        <div className="opacity-40">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-stone-100 rounded-full flex items-center justify-center">
              <Globe className="w-3 h-3 text-stone-400" />
            </div>
            <span className="text-xs text-slate-500">{isHaus ? "www.booking.com" : "www.segelverein-ostsee.de"}</span>
          </div>
          <a className="text-lg text-blue-700/50 cursor-pointer">
            {isHaus
              ? (isDE ? "Booking.com - Unterkünfte Ostsee" : "Booking.com - Baltic Sea Accommodations")
              : (isDE ? "Segelverein Ostsee e.V." : "Baltic Sea Sailing Club")}
          </a>
          <p className="text-sm text-slate-400 mt-1">
            {isHaus
              ? (isDE ? "Hotels und Ferienwohnungen an der Ostsee..." : "Hotels and vacation rentals at the Baltic Sea...")
              : (isDE ? "Vereinsmitgliedschaft und Segelkurse..." : "Club membership and sailing courses...")}
          </p>
        </div>
      </div>
    </div>
  );
}

// AI Chat Preview - for GEO/AI touchpoint
function AIChatPreview({ language, business }: { language: "de" | "en"; business: "segelschule" | "haus" }) {
  const isDE = language === "de";
  const isHaus = business === "haus";

  return (
    <div className="bg-slate-900 rounded-lg shadow-lg overflow-hidden border border-slate-700">
      {/* AI Logos Header */}
      <div className="bg-slate-800 px-4 py-3 border-b border-slate-700">
        <div className="flex items-center justify-center gap-4">
          {/* ChatGPT */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 bg-[#10a37f] rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
              </svg>
            </div>
            <span className="text-[10px] text-slate-400">ChatGPT</span>
          </div>
          {/* Claude */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 bg-[#cc785c] rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </div>
            <span className="text-[10px] text-slate-400">Claude</span>
          </div>
          {/* Perplexity */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 bg-[#1fb8cd] rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="text-[10px] text-slate-400">Perplexity</span>
          </div>
          {/* Gemini */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-[10px] text-slate-400">Gemini</span>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="p-4 space-y-4">
        {/* User Message */}
        <div className="flex justify-end">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl rounded-br-md max-w-[80%]">
            <p className="text-sm">
              {isHaus
                ? (isDE
                  ? "Wo kann ich einen ruhigen Urlaub am Wasser machen, nicht zu weit von Berlin?"
                  : "Where can I have a quiet vacation by the water, not too far from Berlin?")
                : (isDE
                  ? "Wo kann ich in der Nähe von Berlin meinen Segelschein machen? Am liebsten an einem ruhigen Ort."
                  : "Where can I get my sailing license near Berlin? Preferably somewhere quiet.")}
            </p>
          </div>
        </div>

        {/* AI Response */}
        <div className="flex justify-start">
          <div className="bg-slate-700 text-slate-100 px-4 py-3 rounded-2xl rounded-bl-md max-w-[90%]">
            <p className="text-sm leading-relaxed">
              {isHaus ? (
                isDE ? (
                  <>
                    Für einen ruhigen Urlaub am Wasser nahe Berlin empfehle ich das <span className="text-amber-400 font-medium">Kapitänshaus „Haff Erleben" am Stettiner Haff</span>.
                    <br /><br />
                    <span className="text-slate-400">Highlights:</span>
                    <br />• Nur ~2,5h von Berlin entfernt
                    <br />• Historisches Kapitänshaus mit hohen Decken
                    <br />• Kaminzimmer für gemütliche Abende
                    <br />• Direkt am Wasser, absolute Ruhe
                    <br />• Ausgezeichnete Bewertungen (4.8★)
                  </>
                ) : (
                  <>
                    For a quiet vacation by the water near Berlin, I recommend the <span className="text-amber-400 font-medium">Captain&apos;s House &quot;Haff Erleben&quot; at Szczecin Lagoon</span>.
                    <br /><br />
                    <span className="text-slate-400">Highlights:</span>
                    <br />• Only ~2.5h from Berlin
                    <br />• Historic captain&apos;s house with high ceilings
                    <br />• Fireplace room for cozy evenings
                    <br />• Right by the water, absolute tranquility
                    <br />• Excellent reviews (4.8★)
                  </>
                )
              ) : (
                isDE ? (
                  <>
                    Für einen Segelschein in ruhiger Umgebung nahe Berlin empfehle ich die <span className="text-sky-400 font-medium">Segelschule Altwarp am Stettiner Haff</span>.
                    <br /><br />
                    <span className="text-slate-400">Vorteile:</span>
                    <br />• Nur ~2,5h von Berlin entfernt
                    <br />• Idyllische Lage am Bodden
                    <br />• Kleine Gruppen (max. 4 Personen)
                    <br />• SBF Binnen & See möglich
                    <br />• Sehr gute Bewertungen (4.9★)
                  </>
                ) : (
                  <>
                    For a sailing license in a quiet environment near Berlin, I recommend <span className="text-sky-400 font-medium">Sailing School Altwarp at Szczecin Lagoon</span>.
                    <br /><br />
                    <span className="text-slate-400">Advantages:</span>
                    <br />• Only ~2.5h from Berlin
                    <br />• Idyllic location at the bodden
                    <br />• Small groups (max. 4 people)
                    <br />• SBF inland & sea available
                    <br />• Excellent reviews (4.9★)
                  </>
                )
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Social Ads Preview - for paid advertising touchpoint
function SocialAdsPreview({ language, business }: { language: "de" | "en"; business: "segelschule" | "haus" }) {
  const isDE = language === "de";
  const isHaus = business === "haus";

  const adContent = isHaus
    ? {
        headline: isDE ? "Auszeit am Haff" : "Escape to the Lagoon",
        text: isDE
          ? "Historisches Kapitänshaus am Stettiner Haff. Hohe Decken, Kamin, absolute Ruhe. Nur 2,5h von Berlin."
          : "Historic Captain's house at Szczecin Lagoon. High ceilings, fireplace, absolute tranquility. Only 2.5h from Berlin.",
        cta: isDE ? "Jetzt buchen" : "Book Now",
      }
    : {
        headline: isDE ? "Segelschein am Haff" : "Sailing License at the Lagoon",
        text: isDE
          ? "Segeln lernen, wo andere Urlaub machen. SBF Binnen in 3 Tagen. Kleine Gruppen, große Erlebnisse."
          : "Learn to sail where others vacation. SBF license in 3 days. Small groups, big experiences.",
        cta: isDE ? "Jetzt buchen" : "Book Now",
      };

  const gradientColors = isHaus
    ? { fb: "from-amber-400 to-amber-600", ig: "from-amber-300 to-orange-400", tt: "from-amber-500 to-orange-600" }
    : { fb: "from-sky-400 to-sky-600", ig: "from-amber-400 to-orange-500", tt: "from-cyan-400 to-teal-500" };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Facebook Ad */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-stone-200">
        <div className="bg-[#1877f2] px-3 py-2 flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          <span className="text-white text-xs font-medium">Facebook</span>
        </div>
        <div className={`aspect-video bg-gradient-to-br ${gradientColors.fb} flex items-center justify-center`}>
          {isHaus ? <Home className="w-12 h-12 text-white/80" /> : <Ship className="w-12 h-12 text-white/80" />}
        </div>
        <div className="p-3">
          <h4 className="font-semibold text-sm text-slate-800 mb-1">{adContent.headline}</h4>
          <p className="text-xs text-slate-600 line-clamp-2">{adContent.text}</p>
          <button className="mt-2 w-full bg-[#1877f2] text-white text-xs py-1.5 rounded font-medium">
            {adContent.cta}
          </button>
        </div>
      </div>

      {/* Instagram Ad */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-stone-200">
        <div className="bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] px-3 py-2 flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
          <span className="text-white text-xs font-medium">Instagram</span>
        </div>
        <div className={`aspect-video bg-gradient-to-br ${gradientColors.ig} flex items-center justify-center`}>
          {isHaus ? <MapPin className="w-12 h-12 text-white/80" /> : <Wind className="w-12 h-12 text-white/80" />}
        </div>
        <div className="p-3">
          <h4 className="font-semibold text-sm text-slate-800 mb-1">{adContent.headline}</h4>
          <p className="text-xs text-slate-600 line-clamp-2">{adContent.text}</p>
          <button className="mt-2 w-full bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white text-xs py-1.5 rounded font-medium">
            {adContent.cta}
          </button>
        </div>
      </div>

      {/* TikTok Ad */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-stone-200">
        <div className="bg-black px-3 py-2 flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
          </svg>
          <span className="text-white text-xs font-medium">TikTok</span>
        </div>
        <div className={`aspect-video bg-gradient-to-br ${gradientColors.tt} flex items-center justify-center`}>
          {isHaus ? <Star className="w-12 h-12 text-white/80" /> : <Anchor className="w-12 h-12 text-white/80" />}
        </div>
        <div className="p-3">
          <h4 className="font-semibold text-sm text-slate-800 mb-1">{adContent.headline}</h4>
          <p className="text-xs text-slate-600 line-clamp-2">{adContent.text}</p>
          <button className="mt-2 w-full bg-black text-white text-xs py-1.5 rounded font-medium">
            {adContent.cta}
          </button>
        </div>
      </div>
    </div>
  );
}

// Device Frame Component - realistic phone/laptop frames
function DeviceFrame({
  type,
  children
}: {
  type: "phone" | "laptop" | "notification";
  children: React.ReactNode;
}) {
  if (type === "notification") {
    return (
      <div className="max-w-sm mx-auto">
        {/* Phone with notification */}
        <div className="bg-slate-800 rounded-[2.5rem] p-2 shadow-xl">
          {/* Phone inner bezel */}
          <div className="bg-black rounded-[2rem] overflow-hidden">
            {/* Status bar */}
            <div className="bg-black px-6 py-2 flex items-center justify-between">
              <span className="text-white text-xs font-medium">9:41</span>
              <div className="absolute left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-2xl" />
              <div className="flex items-center gap-1">
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 bg-white rounded-full" />
                  <div className="w-1 h-1 bg-white rounded-full" />
                  <div className="w-1 h-1 bg-white rounded-full" />
                  <div className="w-1 h-1 bg-white/50 rounded-full" />
                </div>
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 4h-3V2h-4v2H7v18h10V4zm-4 16h-2v-2h2v2zm0-4h-2V9h2v7z"/>
                </svg>
              </div>
            </div>

            {/* Lock screen with notification */}
            <div className="bg-gradient-to-b from-slate-700 to-slate-900 min-h-[400px] p-4">
              {/* Time */}
              <div className="text-center mt-8 mb-12">
                <div className="text-white text-5xl font-light">9:41</div>
                <div className="text-white/60 text-sm mt-1">Donnerstag, 15. Juni</div>
              </div>

              {/* Notification */}
              <div className="bg-white/90 backdrop-blur-md rounded-2xl p-3 shadow-lg">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "phone") {
    return (
      <div className="max-w-sm mx-auto">
        {/* Phone frame */}
        <div className="bg-slate-800 rounded-[2.5rem] p-2 shadow-xl">
          {/* Phone inner bezel */}
          <div className="bg-white rounded-[2rem] overflow-hidden">
            {/* Status bar */}
            <div className="bg-slate-100 px-6 py-2 flex items-center justify-between">
              <span className="text-slate-800 text-xs font-medium">9:41</span>
              <div className="w-24 h-6 bg-black rounded-full mx-auto" />
              <div className="flex items-center gap-1">
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 bg-slate-800 rounded-full" />
                  <div className="w-1 h-1 bg-slate-800 rounded-full" />
                  <div className="w-1 h-1 bg-slate-800 rounded-full" />
                  <div className="w-1 h-1 bg-slate-400 rounded-full" />
                </div>
                <svg className="w-4 h-4 text-slate-800" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 4h-3V2h-4v2H7v18h10V4zm-4 16h-2v-2h2v2zm0-4h-2V9h2v7z"/>
                </svg>
              </div>
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
              {children}
            </div>

            {/* Home indicator */}
            <div className="bg-white py-2 flex justify-center">
              <div className="w-32 h-1 bg-slate-300 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Laptop
  return (
    <div className="max-w-2xl mx-auto">
      {/* Laptop screen */}
      <div className="bg-slate-700 rounded-t-xl p-2">
        <div className="bg-white rounded-lg overflow-hidden">
          {/* Browser chrome */}
          <div className="bg-slate-100 px-3 py-2 flex items-center gap-2 border-b border-slate-200">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-white rounded px-3 py-1 text-xs text-slate-500 border border-slate-200">
              mail.google.com
            </div>
          </div>

          {/* Content */}
          <div className="min-h-[300px]">
            {children}
          </div>
        </div>
      </div>
      {/* Laptop base */}
      <div className="bg-slate-600 h-4 rounded-b-xl mx-8" />
      <div className="bg-slate-500 h-1 rounded-b mx-16" />
    </div>
  );
}

// Booking Flow Preview - for booking confirmation touchpoint
function BookingFlowPreview({ language }: { language: "de" | "en" }) {
  const isDE = language === "de";
  const [selectedChannel, setSelectedChannel] = useState<string>("email");

  const channels = [
    { id: "email", label: "Email", icon: <Mail className="w-4 h-4" /> },
    { id: "sms", label: "SMS", icon: <Smartphone className="w-4 h-4" /> },
    { id: "whatsapp", label: "WhatsApp", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "push", label: "Push", icon: <Bell className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-stone-200">
      {/* Success Banner */}
      <div className="bg-emerald-500 px-4 py-3 flex items-center gap-3">
        <CheckCircle2 className="w-6 h-6 text-white" />
        <div>
          <h4 className="text-white font-semibold">
            {isDE ? "Buchung erfolgreich!" : "Booking successful!"}
          </h4>
          <p className="text-emerald-100 text-sm">
            {isDE ? "Dein Segelkurs ist bestätigt" : "Your sailing course is confirmed"}
          </p>
        </div>
      </div>

      {/* Booking Details */}
      <div className="p-4 border-b border-stone-100">
        <div className="flex items-center gap-4">
          {/* Calendar */}
          <div className="bg-sky-50 rounded-lg p-3 text-center border border-sky-100">
            <div className="text-sky-600 text-xs font-medium uppercase">
              {isDE ? "Juni" : "June"}
            </div>
            <div className="text-2xl font-bold text-slate-800">15</div>
            <div className="text-xs text-slate-500">
              {isDE ? "Sa" : "Sat"}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1">
            <h5 className="font-semibold text-slate-800">SBF Binnen Kurs</h5>
            <p className="text-sm text-slate-500">Segelschule Altwarp</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              <Clock className="w-3 h-3" />
              <span>3 {isDE ? "Tage" : "days"} • 09:00 - 17:00</span>
            </div>
          </div>
        </div>
      </div>

      {/* Channel Preference Selection */}
      <div className="p-4 bg-stone-50">
        <h5 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-sky-600" />
          {isDE ? "Wie möchtest du informiert werden?" : "How would you like to be notified?"}
        </h5>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => setSelectedChannel(channel.id)}
              className={`flex flex-col items-center gap-1 p-2 sm:p-3 rounded-lg border-2 transition-all ${
                selectedChannel === channel.id
                  ? "border-sky-500 bg-sky-50 text-sky-700"
                  : "border-stone-200 bg-white text-slate-500 hover:border-stone-300"
              }`}
            >
              {channel.icon}
              <span className="text-xs font-medium">{channel.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-3 text-center">
          {isDE
            ? "Alle Erinnerungen und Updates werden über diesen Kanal gesendet"
            : "All reminders and updates will be sent through this channel"}
        </p>
      </div>
    </div>
  );
}

// Certificate Preview - for certificate touchpoint
function CertificatePreview({ language }: { language: "de" | "en" }) {
  const isDE = language === "de";

  return (
    <div className="flex justify-center">
      {/* Certificate Frame */}
      <div className="bg-amber-50 p-4 shadow-xl border-8 border-amber-100 max-w-md">
        <div className="border-2 border-amber-200 p-6 bg-white">
          {/* Certificate Content */}
          <div className="text-center space-y-4">
            {/* Logo/Header */}
            <div className="flex justify-center mb-2">
              <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center">
                <Ship className="w-8 h-8 text-sky-600" />
              </div>
            </div>

            <div className="text-amber-700 text-xs uppercase tracking-widest font-medium">
              {isDE ? "Zertifikat" : "Certificate"}
            </div>

            <h3 className="text-2xl font-serif text-slate-800">
              {isDE ? "Sportbootführerschein Binnen" : "Small Boat License - Inland"}
            </h3>

            <div className="text-slate-500 text-sm">
              {isDE ? "Hiermit wird bestätigt, dass" : "This certifies that"}
            </div>

            <div className="text-xl font-serif text-slate-800 py-2 border-b border-amber-200">
              Max Mustermann
            </div>

            <div className="text-slate-500 text-sm">
              {isDE
                ? "die theoretische und praktische Prüfung erfolgreich bestanden hat"
                : "has successfully passed the theoretical and practical examination"}
            </div>

            <div className="pt-4 flex justify-between items-end">
              <div className="text-left">
                <div className="text-xs text-slate-400">
                  {isDE ? "Ausgestellt am" : "Issued on"}
                </div>
                <div className="text-sm text-slate-600">15.06.2024</div>
              </div>
              <div className="text-right">
                <div className="w-24 border-t border-slate-300 pt-1">
                  <div className="text-xs text-slate-400">
                    {isDE ? "Ausbilder" : "Instructor"}
                  </div>
                </div>
              </div>
            </div>

            {/* Seal */}
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-amber-100 rounded-full border-4 border-amber-200 flex items-center justify-center rotate-12 opacity-80">
              <Award className="w-8 h-8 text-amber-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Photo Moment Preview - for photo touchpoint
function PhotoMomentPreview({ language }: { language: "de" | "en" }) {
  const isDE = language === "de";

  return (
    <div className="space-y-3">
      {/* Instructor notification */}
      <div className="flex items-start gap-3 bg-white rounded-xl p-3 shadow-sm border border-stone-100">
        <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Camera className="w-5 h-5 text-sky-600" />
        </div>
        <div className="flex-1">
          <div className="font-medium text-slate-800 text-sm">Segelschule Altwarp</div>
          <p className="text-xs text-slate-500">
            {isDE ? "hat gerade ein Foto geteilt" : "just shared a photo"}
          </p>
        </div>
        <span className="text-xs text-slate-400">
          {isDE ? "Jetzt" : "Now"}
        </span>
      </div>

      {/* Photo placeholder */}
      <div className="bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 rounded-xl aspect-video flex items-center justify-center relative overflow-hidden">
        {/* Sailing scene illustration */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-blue-900" />
          <div className="absolute top-1/4 left-1/4 w-32 h-32">
            <Ship className="w-full h-full text-white" />
          </div>
        </div>
        <div className="text-center text-white z-10">
          <Camera className="w-12 h-12 mx-auto mb-2 opacity-80" />
          <p className="text-sm font-medium">
            {isDE ? "Dein Segelerlebnis" : "Your Sailing Experience"}
          </p>
          <p className="text-xs opacity-70">
            {isDE ? "Platzhalter für echtes Foto" : "Placeholder for real photo"}
          </p>
        </div>
      </div>

      {/* Share prompt */}
      <div className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2">
        <span className="text-xs text-slate-500">
          {isDE ? "Diese Erinnerung teilen?" : "Share this memory?"}
        </span>
        <div className="flex gap-2">
          <button className="p-1.5 bg-white rounded-full shadow-sm">
            <Heart className="w-4 h-4 text-rose-500" />
          </button>
          <button className="p-1.5 bg-white rounded-full shadow-sm">
            <Send className="w-4 h-4 text-sky-500" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Review Request Preview - for review touchpoint
function ReviewRequestPreview({ language }: { language: "de" | "en" }) {
  const isDE = language === "de";

  return (
    <div className="space-y-3">
      {/* Google Review Card */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center">
            <span className="text-xl font-bold">
              <span className="text-blue-500">G</span>
              <span className="text-red-500">o</span>
              <span className="text-yellow-500">o</span>
              <span className="text-blue-500">g</span>
              <span className="text-green-500">l</span>
              <span className="text-red-500">e</span>
            </span>
          </div>
          <span className="text-xs text-slate-400">Reviews</span>
        </div>

        <h4 className="font-medium text-slate-800 mb-2">
          {isDE ? "Wie war dein Erlebnis?" : "How was your experience?"}
        </h4>

        {/* Star Rating */}
        <div className="flex gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} className="group">
              <Star className="w-8 h-8 text-yellow-400 fill-yellow-400 group-hover:scale-110 transition-transform" />
            </button>
          ))}
        </div>

        {/* Review Input */}
        <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
          <p className="text-sm text-slate-400 italic">
            {isDE
              ? "\"Der Kurs war fantastisch! Kleine Gruppe, toller Ausbilder...\""
              : "\"The course was fantastic! Small group, great instructor...\""}
          </p>
        </div>

        <button className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          {isDE ? "Bewertung abgeben" : "Submit Review"}
        </button>
      </div>
    </div>
  );
}

// Referral Card Preview - for referral touchpoint
function ReferralCardPreview({ language }: { language: "de" | "en" }) {
  const isDE = language === "de";

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-sky-500 to-sky-700 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <span className="font-medium">
              {isDE ? "Freunde werben" : "Refer Friends"}
            </span>
          </div>
          <div className="bg-white/20 rounded-full px-2 py-1 text-xs">
            50€ {isDE ? "Gutschein" : "Voucher"}
          </div>
        </div>

        <p className="text-sm text-sky-100 mb-4">
          {isDE
            ? "Teile dein Segelerlebnis! Für jeden Freund, der bucht, erhältst du 50€ Gutschein."
            : "Share your sailing experience! For every friend who books, you get a €50 voucher."}
        </p>

        {/* Referral Code */}
        <div className="bg-white rounded-lg p-3">
          <div className="text-xs text-slate-500 mb-1">
            {isDE ? "Dein persönlicher Code" : "Your personal code"}
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-slate-800 text-lg">HAFF-MAX23</span>
            <button className="bg-sky-100 text-sky-700 px-3 py-1 rounded text-sm font-medium hover:bg-sky-200 transition-colors">
              {isDE ? "Kopieren" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      {/* Share Options */}
      <div className="flex gap-2">
        <button className="flex-1 bg-[#25D366] text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
          <MessageSquare className="w-4 h-4" />
          WhatsApp
        </button>
        <button className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
          <Mail className="w-4 h-4" />
          Email
        </button>
      </div>
    </div>
  );
}

// Channel-specific message previews
function EmailPreview({
  touchpoint,
  language
}: {
  touchpoint: FlywheelTouchpoint;
  language: "de" | "en";
}) {
  const isDE = language === "de";
  const businessName = touchpoint.business === "segelschule" ? "Segelschule Altwarp" : "Haff Erleben";

  return (
    <DeviceFrame type="laptop">
      <div className="bg-white">
        {/* Email client header */}
        <div className="bg-stone-50 px-4 py-2 border-b border-stone-200 flex items-center gap-3">
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-full bg-slate-300" />
            <div className="w-3 h-3 rounded-full bg-slate-300" />
            <div className="w-3 h-3 rounded-full bg-slate-300" />
          </div>
          <div className="flex-1 flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500">Posteingang</span>
          </div>
        </div>

        {/* Email content */}
        <div className="p-4">
          <div className="border-b border-stone-100 pb-3 mb-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
                <Ship className="w-5 h-5 text-sky-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-800">{businessName}</div>
                <div className="text-xs text-slate-400">info@{touchpoint.business === "segelschule" ? "segelschule-altwarp" : "haff-erleben"}.de</div>
              </div>
              <div className="text-xs text-slate-400">{isDE ? "Heute" : "Today"}, 10:00</div>
            </div>
            <div className="font-semibold text-slate-800 text-lg">{touchpoint.subject}</div>
          </div>

          <div className="text-slate-600 text-sm leading-relaxed">
            <p className="mb-3">{isDE ? "Hallo Max," : "Hello Max,"}</p>
            <p className="mb-3 whitespace-pre-line">{touchpoint.preview}</p>
            <p className="mb-3">{isDE ? "Beste Grüße," : "Best regards,"}</p>
            <p className="text-sky-600">{isDE ? "Dein Team von" : "Your team at"} {businessName}</p>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="w-3 h-3" />
              <span>{isDE ? "Automatisch gesendet" : "Automatically sent"}: {touchpoint.day}</span>
            </div>
          </div>
        </div>
      </div>
    </DeviceFrame>
  );
}

function SMSPreview({
  touchpoint,
  language
}: {
  touchpoint: FlywheelTouchpoint;
  language: "de" | "en";
}) {
  const isDE = language === "de";
  const businessName = touchpoint.business === "segelschule" ? "Segelschule Altwarp" : "Haff Erleben";

  return (
    <DeviceFrame type="phone">
      <div className="bg-slate-100 min-h-[400px]">
        {/* Messages header */}
        <div className="bg-slate-200 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <Smartphone className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-slate-800 text-sm">{businessName}</div>
            <div className="text-xs text-slate-500">SMS</div>
          </div>
        </div>

        {/* Messages */}
        <div className="p-4 space-y-3">
          {/* Incoming SMS bubble */}
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%] shadow-sm">
              <p className="text-slate-800 text-sm">{touchpoint.subject}</p>
              <p className="text-slate-600 text-sm mt-2 whitespace-pre-line">{touchpoint.preview}</p>
              <div className="text-right mt-2">
                <span className="text-xs text-slate-400">10:00</span>
              </div>
            </div>
          </div>

          {/* Typing indicator hint */}
          <div className="flex justify-end">
            <div className="bg-green-500 text-white rounded-2xl rounded-br-md px-4 py-2 max-w-[70%]">
              <p className="text-sm">{isDE ? "Super, danke! 👍" : "Great, thanks! 👍"}</p>
              <div className="text-right mt-1">
                <span className="text-xs text-green-100">10:02 ✓✓</span>
              </div>
            </div>
          </div>
        </div>

        {/* Input area */}
        <div className="bg-white border-t border-slate-200 p-3 mt-auto">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-100 rounded-full px-4 py-2">
              <span className="text-slate-400 text-sm">{isDE ? "Nachricht..." : "Message..."}</span>
            </div>
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <Send className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>
    </DeviceFrame>
  );
}

function WhatsAppPreview({
  touchpoint,
  language
}: {
  touchpoint: FlywheelTouchpoint;
  language: "de" | "en";
}) {
  const isDE = language === "de";
  const businessName = touchpoint.business === "segelschule" ? "Segelschule Altwarp" : "Haff Erleben";

  return (
    <DeviceFrame type="phone">
      <div className="bg-[#ece5dd] min-h-[400px]">
        {/* WhatsApp header */}
        <div className="bg-[#075e54] px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center overflow-hidden">
            <Ship className="w-5 h-5 text-slate-600" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-white text-sm">{businessName}</div>
            <div className="text-xs text-green-100">{isDE ? "Online" : "Online"}</div>
          </div>
          <div className="flex items-center gap-3 text-white">
            <Video className="w-5 h-5" />
            <Phone className="w-5 h-5" />
          </div>
        </div>

        {/* Chat background pattern */}
        <div className="p-4 space-y-3 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABNSURBVDiNY2AYBaNg2AImBgYGhv///zMwMDAwMDAwMPz//5+RkZGRgYGBgYGJiYmBgYGBgZGRkZGBgYGBiYmJiYGBgYGRiYmJaVQfDAAAJi4F4xrG/jcAAAAASUVORK5CYII=')] bg-repeat">
          {/* Business message */}
          <div className="flex justify-start">
            <div className="bg-white rounded-lg rounded-tl-none px-3 py-2 max-w-[85%] shadow-sm">
              <p className="text-slate-800 text-sm font-medium">{touchpoint.subject}</p>
              <p className="text-slate-600 text-sm mt-1 whitespace-pre-line">{touchpoint.preview}</p>
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-xs text-slate-400">10:00</span>
              </div>
            </div>
          </div>

          {/* User reply */}
          <div className="flex justify-end">
            <div className="bg-[#dcf8c6] rounded-lg rounded-tr-none px-3 py-2 max-w-[70%] shadow-sm">
              <p className="text-slate-800 text-sm">{isDE ? "Perfekt, vielen Dank! 🙏" : "Perfect, thank you! 🙏"}</p>
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-xs text-slate-500">10:02</span>
                <svg className="w-4 h-4 text-blue-500" viewBox="0 0 16 15" fill="currentColor">
                  <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.032L1.892 7.77a.366.366 0 0 0-.516.005l-.423.433a.364.364 0 0 0 .006.514l3.255 3.185a.32.32 0 0 0 .484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Input area */}
        <div className="bg-[#f0f0f0] p-2 mt-auto">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white rounded-full px-4 py-2 flex items-center gap-2">
              <span className="text-slate-400 text-sm">{isDE ? "Nachricht" : "Message"}</span>
            </div>
            <div className="w-10 h-10 bg-[#075e54] rounded-full flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>
    </DeviceFrame>
  );
}

function PushNotificationPreview({
  touchpoint,
  language
}: {
  touchpoint: FlywheelTouchpoint;
  language: "de" | "en";
}) {
  const isDE = language === "de";
  const businessName = touchpoint.business === "segelschule" ? "Segelschule Altwarp" : "Haff Erleben";

  return (
    <DeviceFrame type="notification">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Ship className="w-5 h-5 text-sky-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-800 text-sm">{businessName}</span>
            <span className="text-xs text-slate-400">{isDE ? "jetzt" : "now"}</span>
          </div>
          <p className="text-sm font-medium text-slate-700 mt-0.5">{touchpoint.subject}</p>
          <p className="text-sm text-slate-500 line-clamp-2 mt-0.5">{touchpoint.preview}</p>
        </div>
      </div>
    </DeviceFrame>
  );
}

// Message Preview that switches based on channel
function MessagePreview({
  touchpoint,
  language,
  channel
}: {
  touchpoint: FlywheelTouchpoint;
  language: "de" | "en";
  channel: "email" | "sms" | "whatsapp" | "push";
}) {
  switch (channel) {
    case "email":
      return <EmailPreview touchpoint={touchpoint} language={language} />;
    case "sms":
      return <SMSPreview touchpoint={touchpoint} language={language} />;
    case "whatsapp":
      return <WhatsAppPreview touchpoint={touchpoint} language={language} />;
    case "push":
      return <PushNotificationPreview touchpoint={touchpoint} language={language} />;
    default:
      return <EmailPreview touchpoint={touchpoint} language={language} />;
  }
}

function FlywheelModal({
  isOpen,
  onClose,
  touchpoint,
}: {
  isOpen: boolean;
  onClose: () => void;
  touchpoint: FlywheelTouchpoint | null;
}) {
  const { language } = useLanguage();

  // Get all touchpoints - memoized to prevent recreation
  const allTouchpoints = useMemo(
    () => getAllTouchpoints(language === "de" ? "de" : "en"),
    [language]
  );

  // State for current touchpoint
  const [currentIndex, setCurrentIndex] = useState(0);

  // State for selected channel (for message-type touchpoints)
  const [selectedChannel, setSelectedChannel] = useState<"email" | "sms" | "whatsapp" | "push">("email");

  // State for selected business
  const [selectedBusiness, setSelectedBusiness] = useState<"segelschule" | "haus">("segelschule");

  // Filter touchpoints by selected business
  const filteredTouchpoints = useMemo(
    () => allTouchpoints.filter(t => t.business === selectedBusiness),
    [allTouchpoints, selectedBusiness]
  );

  // Update index when touchpoint or business changes
  useEffect(() => {
    if (touchpoint && isOpen) {
      const idx = filteredTouchpoints.findIndex(t =>
        t.day === touchpoint.day && t.subject === touchpoint.subject
      );
      if (idx >= 0) {
        setCurrentIndex(idx);
      }
    }
  }, [touchpoint, isOpen, filteredTouchpoints]);

  // Reset to first touchpoint when business changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedBusiness]);

  if (!isOpen) return null;

  const currentTouchpoint = filteredTouchpoints[currentIndex] || filteredTouchpoints[0];
  const activePhase = currentTouchpoint?.phase || "acquire";

  // Navigation functions
  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % filteredTouchpoints.length);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + filteredTouchpoints.length) % filteredTouchpoints.length);
  };

  const goToPhase = (phaseId: string) => {
    const idx = filteredTouchpoints.findIndex(t => t.phase === phaseId);
    if (idx >= 0) {
      setCurrentIndex(idx);
    }
  };

  const goToTouchpoint = (idx: number) => {
    setCurrentIndex(idx);
  };

  // Get touchpoints for current phase (filtered by business)
  const phaseTouchpoints = filteredTouchpoints.filter(t => t.phase === activePhase);
  const currentPhaseIndex = phaseTouchpoints.findIndex(t => t.id === currentTouchpoint?.id);

  // Flywheel stages with their content
  const flywheelStages = language === "de" ? [
    { id: "acquire", title: "Akquise", description: "Kunden finden & anziehen", icon: <Search className="w-4 h-4" /> },
    { id: "book", title: "Buchung", description: "Bestellung & Bestätigung", icon: <Calendar className="w-4 h-4" /> },
    { id: "nurture", title: "Betreuung", description: "Vorfreude aufbauen", icon: <Heart className="w-4 h-4" /> },
    { id: "deliver", title: "Erlebnis", description: "Service & Support", icon: <Ship className="w-4 h-4" /> },
    { id: "advocacy", title: "Empfehlung", description: "Loyalität & Wachstum", icon: <Star className="w-4 h-4" /> },
  ] : [
    { id: "acquire", title: "Acquire", description: "Find & attract customers", icon: <Search className="w-4 h-4" /> },
    { id: "book", title: "Book", description: "Order & confirmation", icon: <Calendar className="w-4 h-4" /> },
    { id: "nurture", title: "Nurture", description: "Build anticipation", icon: <Heart className="w-4 h-4" /> },
    { id: "deliver", title: "Deliver", description: "Service & support", icon: <Ship className="w-4 h-4" /> },
    { id: "advocacy", title: "Advocacy", description: "Loyalty & growth", icon: <Star className="w-4 h-4" /> },
  ];

  // Channel icons for omni-channel display
  const channels = [
    { id: "email", name: "Email", icon: <Mail className="w-4 h-4" />, color: "bg-blue-500" },
    { id: "sms", name: "SMS", icon: <Smartphone className="w-4 h-4" />, color: "bg-green-500" },
    { id: "whatsapp", name: "WhatsApp", icon: <MessageSquare className="w-4 h-4" />, color: "bg-emerald-500" },
    { id: "push", name: "Push", icon: <Bell className="w-4 h-4" />, color: "bg-purple-500" },
  ];

  const getStageColorClasses = (stageId: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; activeBg: string }> = {
      acquire: { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700", activeBg: "bg-sky-600" },
      book: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", activeBg: "bg-emerald-600" },
      nurture: { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", activeBg: "bg-cyan-600" },
      deliver: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", activeBg: "bg-amber-600" },
      advocacy: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", activeBg: "bg-purple-600" },
    };
    return colors[stageId] || colors.nurture;
  };

  const colors = getStageColorClasses(activePhase);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pt-20">
      {/* Backdrop - darker */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-5xl max-h-[calc(90vh-2rem)] sm:max-h-[calc(90vh-4rem)] overflow-y-auto bg-white border border-stone-200 shadow-2xl z-[201] mx-2 sm:mx-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-stone-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-[202]">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-sky-100">
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600" />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-serif font-bold text-slate-800">
                Customer Flywheel
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">
                {language === "de" ? "Multi-Channel Kommunikationsplattform" : "Multi-Channel Communications Platform"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Channel Icons */}
            <div className="hidden md:flex items-center gap-2">
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  className={`${channel.color} text-white p-1.5 rounded`}
                  title={channel.name}
                >
                  {channel.icon}
                </div>
              ))}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-3 sm:px-6 py-4 sm:py-6">
          {/* Business Toggle */}
          <div className="mb-4 sm:mb-6 flex justify-center">
            <div className="inline-flex bg-stone-100 p-1 gap-1">
              <button
                onClick={() => setSelectedBusiness("segelschule")}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 sm:gap-2 ${
                  selectedBusiness === "segelschule"
                    ? "bg-white text-sky-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Ship className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Segelschule</span>
              </button>
              <button
                onClick={() => setSelectedBusiness("haus")}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 sm:gap-2 ${
                  selectedBusiness === "haus"
                    ? "bg-white text-amber-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Haff Erleben</span>
              </button>
            </div>
          </div>

          {/* Flywheel Navigation - Clickable Stages */}
          <div className="mb-6">
            <div className="flex flex-wrap justify-center gap-1 md:gap-0">
              {flywheelStages.map((stage, idx) => {
                const isActive = stage.id === activePhase;
                const stageColors = getStageColorClasses(stage.id);
                const stageCount = filteredTouchpoints.filter(t => t.phase === stage.id).length;

                return (
                  <div key={stage.id} className="flex items-center">
                    <button
                      onClick={() => goToPhase(stage.id)}
                      className={`relative p-3 md:p-5 transition-all cursor-pointer hover:scale-105 ${
                        isActive
                          ? `${stageColors.activeBg} text-white shadow-lg scale-105`
                          : `${stageColors.bg} ${stageColors.border} border ${stageColors.text} hover:shadow-md`
                      }`}
                    >
                      {isActive && (
                        <div className="absolute -top-2 -right-2 bg-white text-sky-600 p-1 rounded-full shadow-md">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                      <div className="text-center">
                        <div className={`mb-1 ${isActive ? "text-white" : ""}`}>
                          {stage.icon}
                        </div>
                        <div className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${isActive ? "text-white/90" : ""}`}>
                          {stage.title}
                        </div>
                        <div className={`text-[10px] ${isActive ? "text-white/70" : "text-slate-400"}`}>
                          {stageCount} {language === "de" ? "Schritte" : "steps"}
                        </div>
                      </div>
                    </button>
                    {idx < flywheelStages.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-slate-300 mx-1 hidden md:block" />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="text-center mt-3">
              <div className="inline-flex items-center gap-1 text-xs text-slate-400">
                <RefreshCw className="w-3 h-3" />
                <span>{language === "de" ? "Klicke auf eine Phase zum Navigieren" : "Click a phase to navigate"}</span>
              </div>
            </div>
          </div>

          {/* Phase Touchpoints Navigation */}
          <div className="mb-6 bg-stone-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className={`text-sm font-semibold ${colors.text}`}>
                {flywheelStages.find(s => s.id === activePhase)?.title}: {language === "de" ? "Alle Schritte" : "All Steps"}
              </h4>
              <span className="text-xs text-slate-500">
                {currentPhaseIndex + 1} / {phaseTouchpoints.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {phaseTouchpoints.map((tp, idx) => {
                const globalIdx = filteredTouchpoints.findIndex(t => t.id === tp.id);
                const isCurrentStep = tp.id === currentTouchpoint.id;
                return (
                  <button
                    key={tp.id}
                    onClick={() => goToTouchpoint(globalIdx)}
                    className={`px-3 py-1.5 text-xs transition-all ${
                      isCurrentStep
                        ? `${colors.activeBg} text-white`
                        : `bg-white border ${colors.border} ${colors.text} hover:shadow-sm`
                    }`}
                  >
                    {tp.day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Touchpoint Detail */}
          <div className={`${colors.bg} border ${colors.border} p-3 sm:p-6 mb-4 sm:mb-6`}>
            <div className="flex items-start gap-3 sm:gap-4">
              <div className={`p-2 sm:p-3 ${colors.activeBg} text-white shrink-0`}>
                <Send className="w-4 h-4 sm:w-6 sm:h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                  <span className={`text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 ${colors.activeBg} text-white`}>
                    {flywheelStages.find(s => s.id === activePhase)?.title}
                  </span>
                  <span className="text-[10px] sm:text-xs text-slate-500">{currentTouchpoint.day}</span>
                </div>
                <h4 className="text-sm sm:text-lg font-serif font-bold text-slate-800 mb-1 sm:mb-2">{currentTouchpoint.subject}</h4>
                <p className="text-xs sm:text-base text-slate-600 whitespace-pre-line line-clamp-4 sm:line-clamp-none">{currentTouchpoint.preview}</p>
              </div>
            </div>
          </div>

          {/* Dynamic Preview based on visualization type */}
          <div className="bg-white border border-stone-200 overflow-hidden mb-4 sm:mb-6">
            <div className="bg-stone-100 px-2 sm:px-4 py-2 border-b border-stone-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {currentTouchpoint.visualizationType === "google-search" && <Search className="w-4 h-4 text-slate-500" />}
                {currentTouchpoint.visualizationType === "ai-chat" && <Bot className="w-4 h-4 text-slate-500" />}
                {currentTouchpoint.visualizationType === "social-ads" && <Megaphone className="w-4 h-4 text-slate-500" />}
                {currentTouchpoint.visualizationType === "booking-flow" && <Calendar className="w-4 h-4 text-slate-500" />}
                {currentTouchpoint.visualizationType === "certificate" && <Award className="w-4 h-4 text-slate-500" />}
                {currentTouchpoint.visualizationType === "photo" && <Camera className="w-4 h-4 text-slate-500" />}
                {currentTouchpoint.visualizationType === "review-request" && <Star className="w-4 h-4 text-slate-500" />}
                {currentTouchpoint.visualizationType === "referral-card" && <Users className="w-4 h-4 text-slate-500" />}
                {currentTouchpoint.visualizationType === "message" && <Mail className="w-4 h-4 text-slate-500" />}
                <span className="text-xs sm:text-sm text-slate-600 truncate">
                  {currentTouchpoint.visualizationType === "google-search" && (language === "de" ? "Google Suche" : "Google Search")}
                  {currentTouchpoint.visualizationType === "ai-chat" && (language === "de" ? "KI-Assistenten" : "AI Assistants")}
                  {currentTouchpoint.visualizationType === "social-ads" && (language === "de" ? "Social Ads" : "Social Ads")}
                  {currentTouchpoint.visualizationType === "booking-flow" && (language === "de" ? "Buchung" : "Booking")}
                  {currentTouchpoint.visualizationType === "certificate" && (language === "de" ? "Zertifikat" : "Certificate")}
                  {currentTouchpoint.visualizationType === "photo" && (language === "de" ? "Foto" : "Photo")}
                  {currentTouchpoint.visualizationType === "review-request" && (language === "de" ? "Bewertung" : "Review")}
                  {currentTouchpoint.visualizationType === "referral-card" && (language === "de" ? "Empfehlung" : "Referral")}
                  {currentTouchpoint.visualizationType === "message" && (language === "de" ? "Nachricht" : "Message")}
                </span>
              </div>
              {currentTouchpoint.visualizationType === "message" && (
                <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                  {channels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => setSelectedChannel(channel.id as "email" | "sms" | "whatsapp" | "push")}
                      className={`${channel.color} text-white p-1 sm:p-1.5 rounded transition-all ${
                        selectedChannel === channel.id
                          ? "opacity-100 ring-2 ring-offset-1 ring-slate-400 scale-110"
                          : "opacity-40 hover:opacity-70"
                      }`}
                      title={channel.name}
                    >
                      {channel.icon}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-3 sm:p-6 overflow-x-auto">
              {/* Render appropriate preview based on visualization type */}
              {currentTouchpoint.visualizationType === "google-search" && (
                <GoogleSearchPreview language={language === "de" ? "de" : "en"} business={selectedBusiness} />
              )}
              {currentTouchpoint.visualizationType === "ai-chat" && (
                <AIChatPreview language={language === "de" ? "de" : "en"} business={selectedBusiness} />
              )}
              {currentTouchpoint.visualizationType === "social-ads" && (
                <SocialAdsPreview language={language === "de" ? "de" : "en"} business={selectedBusiness} />
              )}
              {currentTouchpoint.visualizationType === "booking-flow" && (
                <BookingFlowPreview language={language === "de" ? "de" : "en"} />
              )}
              {currentTouchpoint.visualizationType === "certificate" && (
                <CertificatePreview language={language === "de" ? "de" : "en"} />
              )}
              {currentTouchpoint.visualizationType === "photo" && (
                <DeviceFrame type="phone">
                  <PhotoMomentPreview language={language === "de" ? "de" : "en"} />
                </DeviceFrame>
              )}
              {currentTouchpoint.visualizationType === "review-request" && (
                <DeviceFrame type="phone">
                  <ReviewRequestPreview language={language === "de" ? "de" : "en"} />
                </DeviceFrame>
              )}
              {currentTouchpoint.visualizationType === "referral-card" && (
                <DeviceFrame type="phone">
                  <ReferralCardPreview language={language === "de" ? "de" : "en"} />
                </DeviceFrame>
              )}
              {currentTouchpoint.visualizationType === "message" && (
                <MessagePreview touchpoint={currentTouchpoint} language={language === "de" ? "de" : "en"} channel={selectedChannel} />
              )}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={goToPrev}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 text-slate-600 hover:bg-stone-50 transition-colors"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              {language === "de" ? "Vorheriger" : "Previous"}
            </button>
            <div className="text-sm text-slate-500">
              {currentIndex + 1} / {allTouchpoints.length}
            </div>
            <button
              onClick={goToNext}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white hover:bg-sky-700 transition-colors"
            >
              {language === "de" ? "Nächster" : "Next"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Channel Preference Info */}
          <div className="mt-6 p-4 bg-stone-50 border border-stone-200">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="font-semibold text-slate-800 mb-1">
                  {language === "de" ? "Kanal-Präferenz" : "Channel Preference"}
                </h5>
                <p className="text-sm text-slate-600">
                  {language === "de"
                    ? "Bei der Buchung fragen wir nach dem bevorzugten Kommunikationskanal. Alle automatisierten Nachrichten werden über diesen Kanal gesendet."
                    : "At booking, we ask for the preferred communication channel. All automated messages are sent through this channel."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// LTV:CAC CALCULATOR COMPONENT (Website Investment)
// ============================================

function LTVCACCalculator() {
  const { language } = useLanguage();
  // Default to "combined" to show the full ecosystem value
  const [businessType, setBusinessType] = useState<"segelschule" | "haus" | "combined">("combined");
  const [showDetails, setShowDetails] = useState(true); // Open by default

  // Segelschule: One-time course business with upsell potential
  // Defaults set to show excellent LTV (≥3x ratio)
  const [segelschuleInputs, setSegelschuleInputs] = useState<LTVInputs>({
    // Primary course (e.g., SBF Binnen, basic sailing)
    primaryCourseValue: 550, // Higher value courses
    primaryCoursesPerYear: 40, // More students with good marketing
    // Upsells: Some students continue to SBF See, SKS, etc.
    upsellRate: 35, // 35% book another course (system encourages this)
    avgUpsellValue: 750, // Advanced courses cost more
    // Referrals: Satisfied students tell friends
    referralRate: 30, // 30% bring a friend (system drives referrals)
    // House fields (not used for segelschule)
    avgBookingValue: 0,
    bookingsPerYear: 0,
    repeatGuestRate: 0,
  });

  // House: Repeat guest model
  // Defaults set to show excellent LTV (≥3x ratio)
  const [houseInputs, setHouseInputs] = useState<LTVInputs>({
    primaryCourseValue: 0,
    primaryCoursesPerYear: 0,
    upsellRate: 0,
    avgUpsellValue: 0,
    referralRate: 25, // 25% recommend to others (system drives referrals)
    // House-specific
    avgBookingValue: 180, // Per night (premium pricing)
    bookingsPerYear: 80, // More nights booked with good marketing
    repeatGuestRate: 40, // 40% come back (system builds loyalty)
  });

  const calculations = useMemo(() => {
    // ===========================================
    // SEGELSCHULE LTV CALCULATION
    // Most customers are one-time, but:
    // - Some upsell to advanced courses
    // - Some refer friends (which is essentially new revenue)
    // ===========================================

    // Base revenue from primary courses
    const primaryRevenue = segelschuleInputs.primaryCourseValue * segelschuleInputs.primaryCoursesPerYear;

    // Upsell revenue (% of students who take advanced courses)
    const upsellRevenue = segelschuleInputs.primaryCoursesPerYear *
      (segelschuleInputs.upsellRate / 100) *
      segelschuleInputs.avgUpsellValue;

    // Referral value: Each referral is essentially a "free" customer acquisition
    // We count this as additional LTV because it reduces effective CAC
    const referralValue = segelschuleInputs.primaryCoursesPerYear *
      (segelschuleInputs.referralRate / 100) *
      segelschuleInputs.primaryCourseValue;

    const segelschuleYearlyRevenue = primaryRevenue + upsellRevenue;

    // LTV per customer = base course + upsell chance + referral value
    const segelschuleLTVPerCustomer =
      segelschuleInputs.primaryCourseValue +
      (segelschuleInputs.upsellRate / 100) * segelschuleInputs.avgUpsellValue +
      (segelschuleInputs.referralRate / 100) * segelschuleInputs.primaryCourseValue;

    // Total LTV over the projection period (yearly revenue including referral effect)
    const segelschuleTotalLTV = segelschuleYearlyRevenue + referralValue;

    const segelschuleCAC = 8500;
    const segelschuleRatio = segelschuleTotalLTV / segelschuleCAC;

    // ===========================================
    // HOUSE LTV CALCULATION
    // Guests can return, and they can refer others
    // ===========================================

    // Average guest stays ~2-3 nights
    const avgNightsPerGuest = 2.5;
    const guestsPerYear = Math.round(houseInputs.bookingsPerYear / avgNightsPerGuest);

    // Base revenue
    const houseBaseRevenue = houseInputs.avgBookingValue * houseInputs.bookingsPerYear;

    // Repeat guest value (they come back ~1.5x on average if they return)
    const repeatGuestRevenue = guestsPerYear *
      (houseInputs.repeatGuestRate / 100) *
      houseInputs.avgBookingValue * avgNightsPerGuest;

    // Referral value
    const houseReferralValue = guestsPerYear *
      (houseInputs.referralRate / 100) *
      houseInputs.avgBookingValue * avgNightsPerGuest;

    const houseYearlyRevenue = houseBaseRevenue;
    const houseTotalLTV = houseBaseRevenue + repeatGuestRevenue + houseReferralValue;

    const houseCAC = 8500;
    const houseRatio = houseTotalLTV / houseCAC;

    // ===========================================
    // COMBINED: Synergy from cross-selling
    // Sailing students who stay at the house (and vice versa)
    // ===========================================

    // Synergy: 15% of sailing students also book accommodation
    const crossSellRate = 0.15;
    const crossSellRevenue = segelschuleInputs.primaryCoursesPerYear *
      crossSellRate *
      houseInputs.avgBookingValue * avgNightsPerGuest;

    const combinedYearlyRevenue = segelschuleYearlyRevenue + houseYearlyRevenue + crossSellRevenue;
    const combinedTotalLTV = segelschuleTotalLTV + houseTotalLTV + crossSellRevenue;

    const combinedCAC = 15000;
    const combinedRatio = combinedTotalLTV / combinedCAC;

    return {
      segelschule: {
        ltv: segelschuleTotalLTV,
        ltvPerCustomer: segelschuleLTVPerCustomer,
        cac: segelschuleCAC,
        ratio: segelschuleRatio,
        yearlyRevenue: segelschuleYearlyRevenue,
        breakEvenMonths: Math.ceil(segelschuleCAC / (segelschuleYearlyRevenue / 12)),
        studentsPerYear: segelschuleInputs.primaryCoursesPerYear,
        upsellRevenue,
        referralValue,
      },
      haus: {
        ltv: houseTotalLTV,
        cac: houseCAC,
        ratio: houseRatio,
        yearlyRevenue: houseYearlyRevenue,
        breakEvenMonths: Math.ceil(houseCAC / (houseYearlyRevenue / 12)),
        guestsPerYear,
        repeatGuestRevenue,
        referralValue: houseReferralValue,
      },
      combined: {
        ltv: combinedTotalLTV,
        cac: combinedCAC,
        ratio: combinedRatio,
        yearlyRevenue: combinedYearlyRevenue,
        breakEvenMonths: Math.ceil(combinedCAC / (combinedYearlyRevenue / 12)),
        synergyBonus: crossSellRevenue,
      },
    };
  }, [segelschuleInputs, houseInputs]);

  const current = businessType === "segelschule"
    ? calculations.segelschule
    : businessType === "haus"
    ? calculations.haus
    : calculations.combined;

  const ratioColor = current.ratio >= 3 ? "text-sky-700" : current.ratio >= 2 ? "text-amber-600" : "text-rose-600";

  return (
    <div className="bg-white p-6 md:p-8 border border-sky-100 shadow-lg shadow-sky-900/5">
      <div className="flex items-center gap-3 mb-2">
        <TrendingUp className="w-6 h-6 text-sky-600" />
        <h3 className="text-xl font-serif font-semibold text-slate-800">{language === "de" ? "Website-Investition" : "Website Investment"}</h3>
      </div>
      <p className="text-slate-600 text-sm mb-6">
        {language === "de" ? "Wie schnell macht sich die Website-Entwicklung bezahlt?" : "How quickly does the website development pay off?"}
      </p>

      {/* Business Type Toggle - 3 tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-sky-50 border border-sky-100">
        <button
          onClick={() => setBusinessType("segelschule")}
          className={`flex-1 py-2 px-3 text-sm font-medium transition-all ${
            businessType === "segelschule"
              ? "bg-sky-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-800 hover:bg-sky-100/50"
          }`}
        >
          {language === "de" ? "Segelschule" : "Sailing School"}
        </button>
        <button
          onClick={() => setBusinessType("haus")}
          className={`flex-1 py-2 px-3 text-sm font-medium transition-all ${
            businessType === "haus"
              ? "bg-sky-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-800 hover:bg-sky-100/50"
          }`}
        >
          {language === "de" ? "Haff Erleben" : "Haff Experience"}
        </button>
        <button
          onClick={() => setBusinessType("combined")}
          className={`flex-1 py-2 px-3 text-sm font-medium transition-all ${
            businessType === "combined"
              ? "bg-sky-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-800 hover:bg-sky-100/50"
          }`}
        >
          {language === "de" ? "Komplett" : "Complete"}
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-sky-50 p-4 text-center border border-sky-100">
          <div className="text-2xl md:text-3xl font-bold text-sky-700">
            {current.ltv.toLocaleString(language === "de" ? "de-DE" : "en-US")}€
          </div>
          <div className="text-xs text-slate-500 mt-1">Customer Lifetime Value</div>
        </div>
        <div className="bg-amber-50 p-4 text-center border border-amber-100">
          <div className="text-2xl md:text-3xl font-bold text-amber-700">
            {current.cac.toLocaleString(language === "de" ? "de-DE" : "en-US")}€
          </div>
          <div className="text-xs text-slate-500 mt-1">{language === "de" ? "Website-Investition" : "Website Investment"}</div>
        </div>
        <div className="bg-white p-4 text-center border border-stone-200">
          <div className={`text-2xl md:text-3xl font-bold ${ratioColor}`}>
            {current.ratio.toFixed(1)}x
          </div>
          <div className="text-xs text-slate-500 mt-1">LTV:CAC Ratio</div>
        </div>
        <div className="bg-sky-50 p-4 text-center border border-sky-200">
          <div className="text-2xl md:text-3xl font-bold text-sky-700">
            ~{current.breakEvenMonths} {language === "de" ? "Mo." : "mo."}
          </div>
          <div className="text-xs text-slate-500 mt-1">Break-Even</div>
        </div>
      </div>

      {/* Ratio Interpretation */}
      <div className={`p-4 mb-6 ${
        current.ratio >= 3 ? "bg-sky-50 border border-sky-200" :
        current.ratio >= 2 ? "bg-amber-50 border border-amber-200" :
        "bg-rose-50 border border-rose-200"
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 ${
            current.ratio >= 3 ? "bg-sky-100" :
            current.ratio >= 2 ? "bg-amber-100" :
            "bg-rose-100"
          }`}>
            {current.ratio >= 3 ? <CheckCircle2 className="w-5 h-5 text-sky-700" /> :
             current.ratio >= 2 ? <TrendingUp className="w-5 h-5 text-amber-600" /> :
             <TrendingUp className="w-5 h-5 text-rose-600" />}
          </div>
          <div>
            <div className={`font-semibold ${
              current.ratio >= 3 ? "text-sky-700" :
              current.ratio >= 2 ? "text-amber-700" :
              "text-rose-700"
            }`}>
              {current.ratio >= 3
                ? (language === "de" ? "Exzellent" : "Excellent")
                : current.ratio >= 2
                ? (language === "de" ? "Gut" : "Good")
                : (language === "de" ? "Entwicklungspotenzial" : "Growth Potential")}
            </div>
            <div className="text-sm text-slate-600 mt-1">
              {current.ratio >= 3
                ? (language === "de"
                    ? "Ein LTV:CAC von 3:1 oder höher gilt als exzellent. Jeder investierte Euro bringt mindestens 3€ zurück."
                    : "An LTV:CAC of 3:1 or higher is considered excellent. Every invested euro returns at least €3.")
                : current.ratio >= 2
                ? (language === "de"
                    ? "Ein solides Verhältnis. Mit gezieltem Marketing lässt sich das weiter steigern."
                    : "A solid ratio. With targeted marketing, this can be improved further.")
                : (language === "de"
                    ? "Mit Marketing-Maßnahmen (siehe unten) verbessern sich die Zahlen deutlich."
                    : "With marketing measures (see below), the numbers improve significantly.")}
            </div>
          </div>
        </div>
      </div>

      {/* Show/Hide Details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 text-sky-600 hover:text-sky-500 transition-colors mb-4"
      >
        {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        <span className="text-sm">{language === "de" ? "Parameter anpassen" : "Adjust parameters"}</span>
      </button>

      {/* Adjustable Inputs - Show relevant params based on selected tab */}
      {showDetails && (
        <div className="p-4 bg-stone-50">
          {/* Segelschule Parameters */}
          {businessType === "segelschule" && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-500">{language === "de" ? "Kurspreis (z.B. SBF Binnen)" : "Course Price (e.g. SBF Binnen)"}</label>
                <input
                  type="range"
                  min="250"
                  max="800"
                  step="25"
                  value={segelschuleInputs.primaryCourseValue}
                  onChange={(e) => setSegelschuleInputs(prev => ({ ...prev, primaryCourseValue: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
                <div className="text-right text-xs text-sky-600">{segelschuleInputs.primaryCourseValue}€</div>
              </div>
              <div>
                <label className="text-xs text-slate-500">{language === "de" ? "Schüler pro Jahr" : "Students per Year"}</label>
                <input
                  type="range"
                  min="10"
                  max="80"
                  step="5"
                  value={segelschuleInputs.primaryCoursesPerYear}
                  onChange={(e) => setSegelschuleInputs(prev => ({ ...prev, primaryCoursesPerYear: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
                <div className="text-right text-xs text-sky-600">{segelschuleInputs.primaryCoursesPerYear}</div>
              </div>
              <div>
                <label className="text-xs text-slate-500">{language === "de" ? "Upsell-Rate (% Folgekurs)" : "Upsell Rate (% follow-up)"}</label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={segelschuleInputs.upsellRate}
                  onChange={(e) => setSegelschuleInputs(prev => ({ ...prev, upsellRate: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
                <div className="text-right text-xs text-amber-600">{segelschuleInputs.upsellRate}%</div>
              </div>
              <div>
                <label className="text-xs text-slate-500">{language === "de" ? "Folgekurs-Preis (SBF See, SKS...)" : "Follow-up Course Price (SBF See, SKS...)"}</label>
                <input
                  type="range"
                  min="400"
                  max="1200"
                  step="50"
                  value={segelschuleInputs.avgUpsellValue}
                  onChange={(e) => setSegelschuleInputs(prev => ({ ...prev, avgUpsellValue: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
                <div className="text-right text-xs text-amber-600">{segelschuleInputs.avgUpsellValue}€</div>
              </div>
              <div>
                <label className="text-xs text-slate-500">{language === "de" ? "Empfehlungsrate (%)" : "Referral Rate (%)"}</label>
                <input
                  type="range"
                  min="5"
                  max="40"
                  step="5"
                  value={segelschuleInputs.referralRate}
                  onChange={(e) => setSegelschuleInputs(prev => ({ ...prev, referralRate: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
                <div className="text-right text-xs text-sky-600">{segelschuleInputs.referralRate}%</div>
              </div>
            </div>
          )}

          {/* House Parameters */}
          {businessType === "haus" && (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-slate-500">{language === "de" ? "Preis pro Nacht" : "Price per Night"}</label>
                <input
                  type="range"
                  min="80"
                  max="250"
                  step="10"
                  value={houseInputs.avgBookingValue}
                  onChange={(e) => setHouseInputs(prev => ({ ...prev, avgBookingValue: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
                <div className="text-right text-xs text-sky-600">{houseInputs.avgBookingValue}€</div>
              </div>
              <div>
                <label className="text-xs text-slate-500">{language === "de" ? "Gebuchte Nächte/Jahr" : "Booked Nights/Year"}</label>
                <input
                  type="range"
                  min="20"
                  max="200"
                  step="10"
                  value={houseInputs.bookingsPerYear}
                  onChange={(e) => setHouseInputs(prev => ({ ...prev, bookingsPerYear: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
                <div className="text-right text-xs text-sky-600">{houseInputs.bookingsPerYear}</div>
              </div>
              <div>
                <label className="text-xs text-slate-500">{language === "de" ? "Wiederkommer (%)" : "Return Guests (%)"}</label>
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="5"
                  value={houseInputs.repeatGuestRate}
                  onChange={(e) => setHouseInputs(prev => ({ ...prev, repeatGuestRate: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
                <div className="text-right text-xs text-amber-600">{houseInputs.repeatGuestRate}%</div>
              </div>
              <div>
                <label className="text-xs text-slate-500">{language === "de" ? "Empfehlungsrate (%)" : "Referral Rate (%)"}</label>
                <input
                  type="range"
                  min="5"
                  max="40"
                  step="5"
                  value={houseInputs.referralRate}
                  onChange={(e) => setHouseInputs(prev => ({ ...prev, referralRate: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
                <div className="text-right text-xs text-sky-600">{houseInputs.referralRate}%</div>
              </div>
            </div>
          )}

          {/* Combined: Show both */}
          {businessType === "combined" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-sky-600 mb-3">Segelschule</h4>
                <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="text-xs text-slate-500">Kurspreis</label>
                    <input
                      type="range"
                      min="250"
                      max="800"
                      step="25"
                      value={segelschuleInputs.primaryCourseValue}
                      onChange={(e) => setSegelschuleInputs(prev => ({ ...prev, primaryCourseValue: Number(e.target.value) }))}
                      className="w-full mt-1"
                    />
                    <div className="text-right text-xs text-sky-600">{segelschuleInputs.primaryCourseValue}€</div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Schüler/Jahr</label>
                    <input
                      type="range"
                      min="10"
                      max="80"
                      step="5"
                      value={segelschuleInputs.primaryCoursesPerYear}
                      onChange={(e) => setSegelschuleInputs(prev => ({ ...prev, primaryCoursesPerYear: Number(e.target.value) }))}
                      className="w-full mt-1"
                    />
                    <div className="text-right text-xs text-sky-600">{segelschuleInputs.primaryCoursesPerYear}</div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Upsell %</label>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      step="5"
                      value={segelschuleInputs.upsellRate}
                      onChange={(e) => setSegelschuleInputs(prev => ({ ...prev, upsellRate: Number(e.target.value) }))}
                      className="w-full mt-1"
                    />
                    <div className="text-right text-xs text-amber-600">{segelschuleInputs.upsellRate}%</div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Folgekurs €</label>
                    <input
                      type="range"
                      min="400"
                      max="1200"
                      step="50"
                      value={segelschuleInputs.avgUpsellValue}
                      onChange={(e) => setSegelschuleInputs(prev => ({ ...prev, avgUpsellValue: Number(e.target.value) }))}
                      className="w-full mt-1"
                    />
                    <div className="text-right text-xs text-amber-600">{segelschuleInputs.avgUpsellValue}€</div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Empfehlung %</label>
                    <input
                      type="range"
                      min="5"
                      max="40"
                      step="5"
                      value={segelschuleInputs.referralRate}
                      onChange={(e) => setSegelschuleInputs(prev => ({ ...prev, referralRate: Number(e.target.value) }))}
                      className="w-full mt-1"
                    />
                    <div className="text-right text-xs text-sky-600">{segelschuleInputs.referralRate}%</div>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-amber-600 mb-3">Haff Erleben</h4>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs text-slate-500">Preis/Nacht</label>
                    <input
                      type="range"
                      min="80"
                      max="250"
                      step="10"
                      value={houseInputs.avgBookingValue}
                      onChange={(e) => setHouseInputs(prev => ({ ...prev, avgBookingValue: Number(e.target.value) }))}
                      className="w-full mt-1"
                    />
                    <div className="text-right text-xs text-sky-600">{houseInputs.avgBookingValue}€</div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Nächte/Jahr</label>
                    <input
                      type="range"
                      min="20"
                      max="200"
                      step="10"
                      value={houseInputs.bookingsPerYear}
                      onChange={(e) => setHouseInputs(prev => ({ ...prev, bookingsPerYear: Number(e.target.value) }))}
                      className="w-full mt-1"
                    />
                    <div className="text-right text-xs text-sky-600">{houseInputs.bookingsPerYear}</div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Wiederkommer %</label>
                    <input
                      type="range"
                      min="10"
                      max="60"
                      step="5"
                      value={houseInputs.repeatGuestRate}
                      onChange={(e) => setHouseInputs(prev => ({ ...prev, repeatGuestRate: Number(e.target.value) }))}
                      className="w-full mt-1"
                    />
                    <div className="text-right text-xs text-amber-600">{houseInputs.repeatGuestRate}%</div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Empfehlung %</label>
                    <input
                      type="range"
                      min="5"
                      max="40"
                      step="5"
                      value={houseInputs.referralRate}
                      onChange={(e) => setHouseInputs(prev => ({ ...prev, referralRate: Number(e.target.value) }))}
                      className="w-full mt-1"
                    />
                    <div className="text-right text-xs text-sky-600">{houseInputs.referralRate}%</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Business Model Explanation */}
      {businessType === "segelschule" && (
        <div className="mt-6 p-4 bg-white border border-stone-200">
          <h4 className="font-serif font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-600" />
            LTV-Berechnung für Segelschulen
          </h4>
          <p className="text-sm text-slate-500 mb-3">
            Bei einer Segelschule sind die meisten Kunden <strong className="text-slate-600">Einmalkunden</strong> – sie machen einen Schein und sind fertig.
            Aber der Wert entsteht durch:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-white p-3">
              <div className="text-sky-600 font-semibold">{segelschuleInputs.primaryCoursesPerYear} Schüler</div>
              <div className="text-slate-500 text-xs">× {segelschuleInputs.primaryCourseValue}€ Grundkurs</div>
              <div className="text-slate-800 font-semibold mt-1">
                = {(segelschuleInputs.primaryCoursesPerYear * segelschuleInputs.primaryCourseValue).toLocaleString("de-DE")}€
              </div>
            </div>
            <div className="bg-white p-3">
              <div className="text-amber-600 font-semibold">{segelschuleInputs.upsellRate}% Upsell</div>
              <div className="text-slate-500 text-xs">buchen Folgekurs ({segelschuleInputs.avgUpsellValue}€)</div>
              <div className="text-slate-800 font-semibold mt-1">
                + {calculations.segelschule.upsellRevenue.toLocaleString("de-DE")}€
              </div>
            </div>
            <div className="bg-white p-3">
              <div className="text-sky-600 font-semibold">{segelschuleInputs.referralRate}% Empfehlungen</div>
              <div className="text-slate-500 text-xs">bringen Freunde</div>
              <div className="text-slate-800 font-semibold mt-1">
                + {calculations.segelschule.referralValue.toLocaleString("de-DE")}€
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            💡 Typische Upsell-Pfade: SBF Binnen → SBF See → SKS → SSS. Empfehlungen sind "kostenlose" Neukunden.
          </p>
        </div>
      )}

      {/* House Model Explanation */}
      {businessType === "haus" && (
        <div className="mt-6 p-4 bg-white border border-stone-200">
          <h4 className="font-serif font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Home className="w-4 h-4 text-amber-600" />
            LTV-Berechnung für Ferienwohnungen
          </h4>
          <p className="text-sm text-slate-500 mb-3">
            Bei Übernachtungen ist das Modell anders – Gäste <strong className="text-slate-600">kommen zurück</strong> und empfehlen weiter.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-white p-3">
              <div className="text-sky-600 font-semibold">{houseInputs.bookingsPerYear} Nächte</div>
              <div className="text-slate-500 text-xs">× {houseInputs.avgBookingValue}€ pro Nacht</div>
              <div className="text-slate-800 font-semibold mt-1">
                = {(houseInputs.bookingsPerYear * houseInputs.avgBookingValue).toLocaleString("de-DE")}€
              </div>
            </div>
            <div className="bg-white p-3">
              <div className="text-amber-600 font-semibold">{houseInputs.repeatGuestRate}% Wiederkommer</div>
              <div className="text-slate-500 text-xs">kommen nochmal</div>
              <div className="text-slate-800 font-semibold mt-1">
                + {calculations.haus.repeatGuestRevenue.toLocaleString("de-DE")}€
              </div>
            </div>
            <div className="bg-white p-3">
              <div className="text-sky-600 font-semibold">{houseInputs.referralRate}% Empfehlungen</div>
              <div className="text-slate-500 text-xs">bringen Freunde</div>
              <div className="text-slate-800 font-semibold mt-1">
                + {calculations.haus.referralValue.toLocaleString("de-DE")}€
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Synergy Bonus (Combined only) */}
      {businessType === "combined" && (
        <div className="mt-6 p-4 bg-gradient-to-r from-sky-500/10 to-purple-500/10 border border-sky-200">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-sky-600" />
            <span className="font-semibold text-slate-800">Cross-Selling Synergie</span>
          </div>
          <p className="text-sm text-slate-600">
            ~15% der Segelschüler buchen auch eine Übernachtung. Das sind zusätzliche{" "}
            <span className="text-sky-600 font-semibold">{calculations.combined.synergyBonus?.toLocaleString("de-DE")}€</span> Umsatz
            ohne extra Marketing-Kosten.
          </p>
          <p className="text-xs text-slate-500 mt-2">
            💡 Das ist der eigentliche Hebel: Berliner buchen nicht einzeln – sie wollen ein Komplett-Paket "Auszeit am Haff".
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================
// STORYBRAND: PROBLEM SECTION
// ============================================

function ProblemSection() {
  const { language } = useLanguage();

  const problems = [
    {
      type: "external",
      icon: <Globe className="w-6 h-6" />,
      title: language === "de" ? "Das externe Problem" : "The External Problem",
      problem: language === "de" ? "Keine digitale Präsenz – unsichtbar für die Welt" : "No digital presence – invisible to the world",
      description: language === "de"
        ? "Ohne Website existierst du für die meisten Menschen nicht. Sie suchen 'Segelkurs Ostsee' – und finden andere. Das Haff bleibt ein Geheimnis, das keiner kennt."
        : "Without a website, you don't exist for most people. They search for 'sailing course Baltic Sea' – and find others. The Haff remains a secret no one knows.",
    },
    {
      type: "internal",
      icon: <Heart className="w-6 h-6" />,
      title: language === "de" ? "Das innere Problem" : "The Internal Problem",
      problem: language === "de" ? "Die Frustration, nicht verstanden zu werden" : "The frustration of not being understood",
      description: language === "de"
        ? "Du weißt, dass das Haff etwas Besonderes ist. Aber wie erklärst du das Menschen, die noch nie dort waren? Wie vermeidest du den typischen 'Segeln-an-der-Ostsee'-Einheitsbrei?"
        : "You know the Haff is special. But how do you explain that to people who've never been there? How do you avoid the typical 'sailing on the Baltic' cookie-cutter approach?",
    },
    {
      type: "philosophical",
      icon: <Sparkles className="w-6 h-6" />,
      title: language === "de" ? "Das tiefere Problem" : "The Deeper Problem",
      problem: language === "de" ? "Authentizität vs. Marketing" : "Authenticity vs. Marketing",
      description: language === "de"
        ? "Du willst keinen lauten, aufdringlichen Internetauftritt. Das widerspricht allem, wofür der Ort steht. Aber wie baust du ein Geschäft auf, das wirtschaftlich funktioniert – ohne dich zu verbiegen?"
        : "You don't want a loud, pushy online presence. That contradicts everything the place stands for. But how do you build a business that works economically – without compromising who you are?",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-800 mb-4">
          {language === "de" ? "Die Herausforderung" : "The Challenge"}
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          {language === "de"
            ? "Du hast etwas Besonderes aufgebaut. Aber die digitale Welt versteht das nicht von selbst."
            : "You've built something special. But the digital world doesn't understand that on its own."}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {problems.map((item, idx) => (
          <div
            key={idx}
            className="group relative bg-white p-6 shadow-md shadow-lg shadow-stone-900/5 hover:shadow-xl transition-all"
          >
            {/* Problem Type Badge */}
            <div className="absolute -top-3 left-6 bg-stone-100 text-stone-600 text-xs font-medium px-3 py-1 border border-stone-200">
              {item.title}
            </div>

            <div className="pt-4">
              <div className="text-stone-400 mb-4">
                {item.icon}
              </div>

              <h3 className="text-lg font-serif font-semibold text-slate-800 mb-3">
                {item.problem}
              </h3>

              <p className="text-slate-600 text-sm leading-relaxed">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* The Stakes */}
      <div className="bg-stone-50 p-6 shadow-md mt-8 border border-stone-100">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-stone-400 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-serif font-semibold text-slate-800 mb-2">
              {language === "de" ? "Was passiert, wenn nichts passiert?" : "What happens if nothing changes?"}
            </h4>
            <p className="text-slate-600 text-sm leading-relaxed">
              {language === "de"
                ? "Jedes Jahr kommen neue Segelschulen dazu. Ferienwohnungen gibt es wie Sand am Meer. Wer nicht online sichtbar ist – mit einer Präsenz, die überzeugt – verliert nicht nur Buchungen. Er verliert die Chance, Menschen zu erreichen, die genau das suchen, was du bietest."
                : "New sailing schools open every year. Vacation rentals are a dime a dozen. Those who aren't visible online – with a presence that convinces – don't just lose bookings. They lose the chance to reach people who are looking for exactly what you offer."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// STORYBRAND: GUIDE SECTION
// ============================================

function GuideSection() {
  const { language } = useLanguage();

  return (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-800 mb-4">
          {language === "de" ? "Warum ich das verstehe" : "Why I understand this"}
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          {language === "de"
            ? "Du bist nicht der erste, der vor dieser Herausforderung steht."
            : "You're not the first to face this challenge."}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Empathy */}
        <div className="bg-white p-8 shadow-lg shadow-sky-900/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="text-sky-600">
              <Heart className="w-5 h-5 text-sky-600" />
            </div>
            <h3 className="text-lg font-serif font-semibold text-slate-800">
              {language === "de" ? "Ich kenne das Gefühl" : "I know the feeling"}
            </h3>
          </div>

          <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
            <p>
              {language === "de"
                ? <>Du hast etwas aufgebaut, das dir wichtig ist. Etwas, das mehr ist als ein Geschäft. Und dann kommt jemand und sagt: <em className="text-slate-500">"Du brauchst mehr SEO"</em> oder <em className="text-slate-500">"Mach mal Instagram-Reels"</em>.</>
                : <>You've built something that matters to you. Something that's more than just a business. And then someone comes along and says: <em className="text-slate-500">"You need more SEO"</em> or <em className="text-slate-500">"Make some Instagram Reels"</em>.</>}
            </p>
            <p>
              {language === "de"
                ? "Das fühlt sich falsch an. Weil es falsch ist. Nicht jede Lösung passt zu jedem Problem."
                : "That feels wrong. Because it is wrong. Not every solution fits every problem."}
            </p>
            <p className="text-sky-700 font-medium">
              {language === "de"
                ? "Du brauchst keine laute Marketing-Maschine. Du brauchst ein System, das so arbeitet wie du: ruhig, durchdacht, authentisch."
                : "You don't need a loud marketing machine. You need a system that works like you do: calm, thoughtful, authentic."}
            </p>
          </div>
        </div>

        {/* Authority */}
        <div className="bg-white p-8 shadow-lg shadow-stone-900/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="text-stone-600">
              <Award className="w-5 h-5 text-stone-700" />
            </div>
            <h3 className="text-lg font-serif font-semibold text-slate-800">
              {language === "de" ? "Was ich mitbringe" : "What I bring"}
            </h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-sky-600 mt-1 flex-shrink-0" />
              <p className="text-slate-600 text-sm">
                <strong className="text-slate-800">{language === "de" ? "Fast 20 Jahre" : "Almost 20 years"}</strong> {language === "de" ? "Erfahrung in Webentwicklung und digitalem Marketing" : "experience in web development and digital marketing"}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-sky-600 mt-1 flex-shrink-0" />
              <p className="text-slate-600 text-sm">
                <strong className="text-slate-800">{language === "de" ? "Menschen verstehen:" : "Understanding people:"}</strong> {language === "de" ? "Was treibt deine Kunden an? Was suchen sie wirklich? Ich versetze mich in ihre Schuhe – und in deine." : "What drives your customers? What are they really looking for? I put myself in their shoes – and yours."}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-sky-600 mt-1 flex-shrink-0" />
              <p className="text-slate-600 text-sm">
                <strong className="text-slate-800">{language === "de" ? "Automatisierungs-Experte:" : "Automation Expert:"}</strong> {language === "de" ? "Systeme, die arbeiten, während du auf dem Wasser bist" : "Systems that work while you're on the water"}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-sky-600 mt-1 flex-shrink-0" />
              <p className="text-slate-600 text-sm">
                <strong className="text-slate-800">Full-Stack:</strong> {language === "de" ? "Vom Design bis zur Technik – alles aus einer Hand" : "From design to technology – everything from one source"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-stone-50 p-6 border border-stone-200 text-center">
        <p className="text-slate-600 text-sm max-w-2xl mx-auto">
          {language === "de"
            ? "Eine digitale Präsenz, die die Stille transportiert. Ein System, das dein Geschäft wachsen lässt – ohne dass du dafür deine Werte opfern musst. Authentisch, automatisiert, wirksam."
            : "A digital presence that conveys the silence. A system that grows your business – without sacrificing your values. Authentic, automated, effective."}
        </p>
      </div>
    </div>
  );
}

// ============================================
// STORYBRAND: SUCCESS VISION SECTION
// ============================================

function SuccessVisionSection() {
  const { language } = useLanguage();

  const successPoints = [
    {
      before: language === "de" ? "Du beantwortest dieselben Fragen immer wieder" : "You answer the same questions over and over",
      after: language === "de" ? "Das System antwortet automatisch – professionell und persönlich" : "The system responds automatically – professionally and personally",
      icon: <MessageSquare className="w-5 h-5" />,
    },
    {
      before: language === "de" ? "Kunden buchen, ohne sich vorzubereiten" : "Customers book without preparing",
      after: language === "de" ? "Sie kommen vorbereitet an, voller Vorfreude" : "They arrive prepared, full of anticipation",
      icon: <Bell className="w-5 h-5" />,
    },
    {
      before: language === "de" ? "Nach dem Kurs – Stille. Keine Folgbuchungen" : "After the course – silence. No follow-up bookings",
      after: language === "de" ? "Automatische Einladungen zur Weiterreise: SBF See, SKS, Haus" : "Automatic invitations to continue: SBF See, SKS, accommodation",
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      before: language === "de" ? "Wenige, sporadische Google-Bewertungen" : "Few, sporadic Google reviews",
      after: language === "de" ? "Konstanter Strom an 5-Sterne-Reviews" : "Steady stream of 5-star reviews",
      icon: <Star className="w-5 h-5" />,
    },
    {
      before: language === "de" ? "Segelschule und Haus laufen getrennt" : "Sailing school and house run separately",
      after: language === "de" ? "Ein Ökosystem, das sich gegenseitig füttert" : "An ecosystem that feeds itself",
      icon: <Layers className="w-5 h-5" />,
    },
    {
      before: language === "de" ? "Du bist Verkäufer, Admin, Support – alles" : "You're salesperson, admin, support – everything",
      after: language === "de" ? "Du bist auf dem Wasser. Das System kümmert sich." : "You're on the water. The system takes care of it.",
      icon: <Wind className="w-5 h-5" />,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-800 mb-4">
          {language === "de" ? "Stell dir vor..." : "Imagine..."}
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          {language === "de" ? "So sieht dein Alltag aus, wenn das System läuft." : "This is what your daily life looks like when the system is running."}
        </p>
      </div>

      <div className="space-y-4">
        {successPoints.map((point, idx) => (
          <div
            key={idx}
            className="group bg-white p-5 shadow-md hover:shadow-lg hover:border-sky-200 transition-all"
          >
            <div className="flex items-center gap-6">
              {/* Before */}
              <div className="flex-1 flex items-center gap-3">
                <div className="text-rose-400">
                  {point.icon}
                </div>
                <p className="text-slate-500 text-sm line-through decoration-rose-300/50">
                  {point.before}
                </p>
              </div>

              {/* Arrow */}
              <div className="flex-shrink-0">
                <ArrowRight className="w-5 h-5 text-sky-600" />
              </div>

              {/* After */}
              <div className="flex-1">
                <p className="text-slate-800 text-sm font-medium">
                  {point.after}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ultimate Success */}
      <div className="bg-gradient-to-br from-sky-50 to-stone-50 p-8 shadow-md text-center mt-8 shadow-sm">
        <Wind className="w-10 h-10 text-sky-600 mx-auto mb-4" />
        <h3 className="text-xl font-serif font-bold text-slate-800 mb-3">
          {language === "de" ? "Das Ergebnis?" : "The Result?"}
        </h3>
        <p className="text-slate-600 max-w-xl mx-auto leading-relaxed">
          {language === "de"
            ? <>Du bist da, wo du sein sollst: <strong className="text-sky-700">Auf dem Wasser. Bei deinen Gästen. Im Moment.</strong> Das System arbeitet im Hintergrund – leise, zuverlässig, jeden Tag. Und dein Geschäft wächst, ohne dass du mehr arbeitest.</>
            : <>You're where you should be: <strong className="text-sky-700">On the water. With your guests. In the moment.</strong> The system works in the background – quietly, reliably, every day. And your business grows without you working more.</>}
        </p>
      </div>
    </div>
  );
}

// ============================================
// STORYBRAND: AVOID FAILURE SECTION
// ============================================

function AvoidFailureSection() {
  const { language } = useLanguage();

  const failures = [
    {
      stat: "73%",
      description: language === "de"
        ? "der Websitebesucher verlassen eine Seite innerhalb von 3 Sekunden, wenn sie nicht überzeugt"
        : "of website visitors leave a page within 3 seconds if they're not convinced",
    },
    {
      stat: "60%",
      description: language === "de"
        ? "der Tourismus-Buchungen beginnen mit einer Google-Suche – wer dort nicht auftaucht, existiert nicht"
        : "of tourism bookings start with a Google search – if you don't show up, you don't exist",
    },
    {
      stat: "5x",
      description: language === "de"
        ? "teurer ist es, einen neuen Kunden zu gewinnen, als einen bestehenden zu halten – ohne System passiert das nicht"
        : "more expensive to acquire a new customer than to retain an existing one – without a system, that doesn't happen",
    },
  ];

  const losses = language === "de" ? [
    "Buchungen von Menschen, die genau das suchen, was du bietest – aber dich nie finden",
    "Folgekurse, Wiederbuchungen, Empfehlungen – weil niemand dran erinnert wird",
    "Die Synergie zwischen Segelschule und Haus – zwei Geschäfte, die nebeneinander her laufen",
    "Deine Zeit – weil du Admin-Arbeit machst, statt auf dem Wasser zu sein",
  ] : [
    "Bookings from people who are looking for exactly what you offer – but never find you",
    "Follow-up courses, repeat bookings, referrals – because no one gets reminded",
    "The synergy between sailing school and house – two businesses running side by side",
    "Your time – because you're doing admin work instead of being on the water",
  ];

  return (
    <div className="bg-gradient-to-br from-rose-50/70 to-stone-50 p-8 shadow-md">
      <div className="text-center mb-8">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-4" />
        <h2 className="text-2xl font-serif font-bold text-slate-800 mb-2">
          {language === "de" ? "Die Alternative? Nichts tun." : "The alternative? Do nothing."}
        </h2>
        <p className="text-slate-600 text-sm">
          {language === "de" ? "Und das sind die Konsequenzen." : "And these are the consequences."}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {failures.map((item, idx) => (
          <div key={idx} className="text-center">
            <div className="text-3xl font-bold text-rose-500 mb-2">{item.stat}</div>
            <p className="text-slate-600 text-sm">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="bg-white/80 p-6 border border-rose-100">
        <h4 className="font-serif font-semibold text-slate-800 mb-4 text-center">
          {language === "de" ? "Was du verlierst:" : "What you lose:"}
        </h4>
        <div className="grid md:grid-cols-2 gap-4">
          {losses.map((loss, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <X className="w-4 h-4 text-rose-400 mt-1 flex-shrink-0" />
              <p className="text-slate-600 text-sm">{loss}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// STORYBRAND JOURNEY SECTION (Donald Miller Framework)
// ============================================

function StoryBrandJourneySection() {
  const { language } = useLanguage();
  const [activeBusiness, setActiveBusiness] = useState<"segelschule" | "haus">("segelschule");
  const [activeStep, setActiveStep] = useState(0);

  // StoryBrand journey for Segelschule
  // Colors: Hero=blue, Problem=red, Guide=purple, Plan=amber, CTA=orange, Result=green
  const segelschuleJourney = language === "de" ? [
    {
      step: "Der Held",
      title: "Dein Segelschüler",
      icon: <Users className="w-6 h-6" />,
      color: "blue",
      avatar: "Max, 35, Berliner, Bürojob, sucht Abenteuer und Freiheit auf dem Wasser",
      wants: "Segeln lernen. Endlich raus aus dem Alltag. Etwas Echtes erleben.",
      feels: "Neugierig, aber unsicher. Wird er es schaffen? Ist das der richtige Ort?",
    },
    {
      step: "Das Problem",
      title: "Seine Herausforderung",
      icon: <AlertCircle className="w-6 h-6" />,
      color: "red",
      external: "Keinen Segelschein – kann nicht aufs Wasser",
      internal: "Zweifel: Bin ich sportlich genug? Kann ich mir das leisten? Finde ich Zeit?",
      philosophical: "Das Gefühl, etwas zu verpassen – ein Leben ohne echte Erlebnisse",
    },
    {
      step: "Der Guide",
      title: "Du – Gerrit",
      icon: <Award className="w-6 h-6" />,
      color: "purple",
      empathy: "Du verstehst, dass es um mehr geht als einen Schein – es geht ums Ankommen",
      authority: "Erfahrener Skipper, das Plattbodenschiff, das Haff als perfekter Lernort",
      promise: "'Bei mir lernst du verantwortungsvolles Segeln – der erste Schritt aufs Meer'",
    },
    {
      step: "Der Plan",
      title: "Der klare Weg",
      icon: <FileText className="w-6 h-6" />,
      color: "amber",
      steps: [
        "1. Buchung: Sofort Zugang zur Theorie-Vorbereitung",
        "2. Vorfreude: E-Mails stimmen auf das Haff ein",
        "3. Kurs: Praxis am Plattboden, Theorie verstanden",
        "4. Prüfung: Bestanden! Der Schein ist da.",
        "5. Weiter: Einladung zu SBF See – der nächste Schritt",
      ],
    },
    {
      step: "Der Call-to-Action",
      title: "Jetzt buchen",
      icon: <Zap className="w-6 h-6" />,
      color: "orange",
      primary: "'Jetzt Segelkurs buchen' – klarer Button auf der Website",
      secondary: "'Erstgespräch vereinbaren' für Unentschlossene",
      trigger: "Das System erinnert: Vorfreude-Mail 7 Tage vorher",
    },
    {
      step: "Das Ergebnis",
      title: "Erfolg vs. Scheitern",
      icon: <Star className="w-6 h-6" />,
      color: "green",
      success: "Max hat den SBF Binnen. Er fühlt sich lebendig. Er erzählt allen davon. Er bucht SBF See.",
      failure: "Ohne klaren Weg: Max googelt weiter, bucht woanders, oder gar nicht.",
      transformation: "Vom Schreibtisch aufs Wasser – vom Träumer zum Segler",
    },
  ] : [
    {
      step: "The Hero",
      title: "Your Sailing Student",
      icon: <Users className="w-6 h-6" />,
      color: "blue",
      avatar: "Max, 35, from Berlin, office job, seeking adventure and freedom on the water",
      wants: "Learn to sail. Finally escape everyday life. Experience something real.",
      feels: "Curious but uncertain. Will he make it? Is this the right place?",
    },
    {
      step: "The Problem",
      title: "His Challenge",
      icon: <AlertCircle className="w-6 h-6" />,
      color: "red",
      external: "No sailing license – can't get on the water",
      internal: "Doubts: Am I athletic enough? Can I afford it? Can I find time?",
      philosophical: "The feeling of missing out – a life without real experiences",
    },
    {
      step: "The Guide",
      title: "You – Gerrit",
      icon: <Award className="w-6 h-6" />,
      color: "purple",
      empathy: "You understand it's about more than a license – it's about arriving",
      authority: "Experienced skipper, the flat-bottom boat, the Haff as perfect learning spot",
      promise: "'With me you'll learn responsible sailing – the first step onto the sea'",
    },
    {
      step: "The Plan",
      title: "The Clear Path",
      icon: <FileText className="w-6 h-6" />,
      color: "amber",
      steps: [
        "1. Booking: Immediate access to theory preparation",
        "2. Anticipation: Emails set the mood for the Haff",
        "3. Course: Practice on flat-bottom, theory understood",
        "4. Exam: Passed! The license is here.",
        "5. Next: Invitation to SBF See – the next step",
      ],
    },
    {
      step: "The Call-to-Action",
      title: "Book Now",
      icon: <Zap className="w-6 h-6" />,
      color: "orange",
      primary: "'Book Sailing Course Now' – clear button on website",
      secondary: "'Schedule Consultation' for the undecided",
      trigger: "The system reminds: Anticipation email 7 days before",
    },
    {
      step: "The Result",
      title: "Success vs. Failure",
      icon: <Star className="w-6 h-6" />,
      color: "green",
      success: "Max has his SBF Binnen. He feels alive. He tells everyone. He books SBF See.",
      failure: "Without clear path: Max keeps googling, books elsewhere, or not at all.",
      transformation: "From desk to water – from dreamer to sailor",
    },
  ];

  // StoryBrand journey for Haus
  // Colors: Hero=blue, Problem=red, Guide=purple, Plan=amber, CTA=orange, Result=green
  const hausJourney = language === "de" ? [
    {
      step: "Der Held",
      title: "Dein Gast",
      icon: <Users className="w-6 h-6" />,
      color: "blue",
      avatar: "Anna & Tom, beide 42, zwei Kinder, Hamburg, Stress im Alltag",
      wants: "Auszeit. Stille. Einfach mal abschalten. Qualitätszeit als Familie.",
      feels: "Erschöpft, aber hoffnungsvoll. Gibt es noch Orte ohne WLAN-Zwang?",
    },
    {
      step: "Das Problem",
      title: "Ihre Herausforderung",
      icon: <AlertCircle className="w-6 h-6" />,
      color: "red",
      external: "Kein Ort zum Abschalten – überall Tourismus, Lärm, Stress",
      internal: "Schuldgefühl: Sollten wir nicht produktiv sein? Ist Auszeit egoistisch?",
      philosophical: "Die Sehnsucht nach echtem Leben – nicht nur funktionieren",
    },
    {
      step: "Der Guide",
      title: "Du – Gerrit & Axinja",
      icon: <Award className="w-6 h-6" />,
      color: "purple",
      empathy: "Ihr wisst, was Menschen brauchen: Raum, Stille, Offenheit – keine Bewertung",
      authority: "Das Haus am Haff, Axinjas Walking, der Ort der keiner kennt",
      promise: "'Bei uns darfst du einfach sein – ohne Programm, ohne Erwartung'",
    },
    {
      step: "Der Plan",
      title: "Der klare Weg",
      icon: <FileText className="w-6 h-6" />,
      color: "amber",
      steps: [
        "1. Buchung: Sofort Bestätigung + Geheimtipp-PDF",
        "2. Vorfreude: Wetter, Anreise, Walking-Angebot",
        "3. Ankunft: Das Haff empfängt – Stille, Weite, Ankommen",
        "4. Aufenthalt: Tag-2-Check-in, Digital Concierge wenn nötig",
        "5. Danach: 'Das Haff vermisst dich' – Early-Bird nächste Saison",
      ],
    },
    {
      step: "Der Call-to-Action",
      title: "Jetzt buchen",
      icon: <Zap className="w-6 h-6" />,
      color: "orange",
      primary: "'Verfügbarkeit prüfen' – klarer Button",
      secondary: "'Walking dazubuchen' als Upgrade",
      trigger: "Das System cross-sellet: 'Segeln probieren am Plattboden?'",
    },
    {
      step: "Das Ergebnis",
      title: "Erfolg vs. Scheitern",
      icon: <Star className="w-6 h-6" />,
      color: "green",
      success: "Anna & Tom kommen jedes Jahr. Sie empfehlen das Haff weiter. Sie buchen Walking, Segeln, alles.",
      failure: "Ohne Präsenz: Sie finden einen anderen Airbnb. Austauschbar. Vergessen.",
      transformation: "Von erschöpft zu erholt – vom Funktionieren zum Leben",
    },
  ] : [
    {
      step: "The Hero",
      title: "Your Guest",
      icon: <Users className="w-6 h-6" />,
      color: "blue",
      avatar: "Anna & Tom, both 42, two kids, Hamburg, everyday stress",
      wants: "Time out. Silence. Just switch off. Quality time as a family.",
      feels: "Exhausted but hopeful. Are there still places without WiFi pressure?",
    },
    {
      step: "The Problem",
      title: "Their Challenge",
      icon: <AlertCircle className="w-6 h-6" />,
      color: "red",
      external: "No place to switch off – tourism, noise, stress everywhere",
      internal: "Guilt: Shouldn't we be productive? Is taking time off selfish?",
      philosophical: "The longing for real life – not just functioning",
    },
    {
      step: "The Guide",
      title: "You – Gerrit & Axinja",
      icon: <Award className="w-6 h-6" />,
      color: "purple",
      empathy: "You know what people need: space, silence, openness – no judgment",
      authority: "The house on the Haff, Axinja's walking, the place no one knows",
      promise: "'With us you can just be – no program, no expectations'",
    },
    {
      step: "The Plan",
      title: "The Clear Path",
      icon: <FileText className="w-6 h-6" />,
      color: "amber",
      steps: [
        "1. Booking: Immediate confirmation + Insider tips PDF",
        "2. Anticipation: Weather, directions, walking offer",
        "3. Arrival: The Haff welcomes – silence, expanse, arriving",
        "4. Stay: Day-2 check-in, Digital Concierge if needed",
        "5. After: 'The Haff misses you' – Early-Bird next season",
      ],
    },
    {
      step: "The Call-to-Action",
      title: "Book Now",
      icon: <Zap className="w-6 h-6" />,
      color: "orange",
      primary: "'Check Availability' – clear button",
      secondary: "'Add Walking' as upgrade",
      trigger: "The system cross-sells: 'Try sailing on the flat-bottom?'",
    },
    {
      step: "The Result",
      title: "Success vs. Failure",
      icon: <Star className="w-6 h-6" />,
      color: "green",
      success: "Anna & Tom come every year. They recommend the Haff. They book walking, sailing, everything.",
      failure: "Without presence: They find another Airbnb. Interchangeable. Forgotten.",
      transformation: "From exhausted to refreshed – from functioning to living",
    },
  ];

  const journey = activeBusiness === "segelschule" ? segelschuleJourney : hausJourney;
  const currentStepData = journey[activeStep];

  // Color scheme: Hero=blue, Problem=red, Guide=purple, Plan=amber, CTA=orange, Result=green
  const colorClasses: Record<string, { bg: string; text: string; border: string; dot: string; nav: string }> = {
    blue: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", dot: "bg-sky-600", nav: "bg-sky-600" },
    red: { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-200", dot: "bg-rose-500", nav: "bg-rose-500" },
    purple: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-600", nav: "bg-violet-600" },
    amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500", nav: "bg-amber-500" },
    orange: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-500", nav: "bg-orange-500" },
    green: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-600", nav: "bg-emerald-600" },
  };

  const colors = colorClasses[currentStepData.color];

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 text-amber-700 mb-6">
          <Layers className="w-4 h-4 text-amber-600" />
          <span className="text-amber-700 text-sm font-medium">StoryBrand Framework</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-800 mb-4">
          {language === "de" ? "Die Kundenreise – visualisiert" : "The Customer Journey – Visualized"}
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto mb-2">
          {language === "de"
            ? "So führt das System deine Kunden von der ersten Google-Suche bis zum Stammgast."
            : "This is how the system guides your customers from the first Google search to loyal regulars."}
        </p>
        <p className="text-slate-500 text-xs">
          {language === "de" ? "Basierend auf dem StoryBrand-Framework von" : "Based on the StoryBrand framework by"}{" "}
          <a
            href="https://storybrand.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-600 hover:text-amber-700 underline"
          >
            Donald Miller
          </a>
        </p>
      </div>

      {/* Business Type Toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex gap-1 p-1 bg-white shadow-md">
          <button
            onClick={() => { setActiveBusiness("segelschule"); setActiveStep(0); }}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all ${
              activeBusiness === "segelschule"
                ? "bg-sky-600 text-white shadow-md"
                : "text-slate-600 hover:text-slate-800 hover:bg-sky-50"
            }`}
          >
            <Ship className="w-4 h-4" />
            {language === "de" ? "Segelschule" : "Sailing School"}
          </button>
          <button
            onClick={() => { setActiveBusiness("haus"); setActiveStep(0); }}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all ${
              activeBusiness === "haus"
                ? "bg-stone-600 text-white shadow-md"
                : "text-slate-600 hover:text-slate-800 hover:bg-stone-100"
            }`}
          >
            <Home className="w-4 h-4" />
            {language === "de" ? "Haff Erleben" : "Experience Haff"}
          </button>
        </div>
      </div>

      {/* Journey Steps - Horizontal Clickable */}
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-8 left-0 right-0 h-px bg-stone-300" />

        {/* Steps */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {journey.map((step, idx) => {
            const isActive = activeStep === idx;
            const isPast = idx < activeStep;
            const stepColors = colorClasses[step.color];

            return (
              <button
                key={idx}
                onClick={() => setActiveStep(idx)}
                className={`relative flex flex-col items-center pt-0 pb-4 transition-all ${
                  isActive ? "scale-105" : "hover:scale-102"
                }`}
              >
                {/* Circle */}
                <div className={`w-12 h-12 md:w-16 md:h-16 flex items-center justify-center transition-all z-10 ${
                  isActive
                    ? `${stepColors.nav} text-white shadow-md`
                    : isPast
                    ? `${stepColors.bg} ${stepColors.text}`
                    : "bg-white text-slate-500 shadow-sm"
                }`}>
                  <span>
                    {step.icon}
                  </span>
                </div>

                {/* Label */}
                <span className={`mt-2 md:mt-3 text-[10px] md:text-xs font-medium text-center leading-tight ${
                  isActive ? stepColors.text : isPast ? stepColors.text : "text-slate-500"
                }`}>
                  {step.step}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Step Content */}
      <div className={`${colors.bg} p-4 md:p-8 border ${colors.border} transition-all duration-300 shadow-lg`}>
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-3 ${colors.bg} border ${colors.border}`}>
            {currentStepData.icon}
          </div>
          <div>
            <span className={`text-xs font-semibold ${colors.text} uppercase tracking-wider`}>
              {currentStepData.step}
            </span>
            <h3 className="text-xl font-serif font-bold text-slate-800">{currentStepData.title}</h3>
          </div>
        </div>

        {/* Content varies by step type */}
        {"avatar" in currentStepData && (
          <div className="space-y-4">
            <div className="bg-white p-4 border border-stone-200">
              <div className="text-xs text-slate-500 mb-1">{language === "de" ? "Wer ist das?" : "Who is this?"}</div>
              <p className="text-slate-700">{currentStepData.avatar}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white p-4 border border-stone-200">
                <div className="text-xs text-slate-500 mb-1">{language === "de" ? "Was will er/sie?" : "What do they want?"}</div>
                <p className="text-slate-700 text-sm">{currentStepData.wants}</p>
              </div>
              <div className="bg-white p-4 border border-stone-200">
                <div className="text-xs text-slate-500 mb-1">{language === "de" ? "Was fühlt er/sie?" : "What do they feel?"}</div>
                <p className="text-slate-700 text-sm">{currentStepData.feels}</p>
              </div>
            </div>
          </div>
        )}

        {"external" in currentStepData && (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white p-4 border border-stone-200">
              <div className="text-xs text-slate-500 mb-1">{language === "de" ? "Externes Problem" : "External Problem"}</div>
              <p className="text-slate-700 text-sm">{currentStepData.external}</p>
            </div>
            <div className="bg-white p-4 border border-stone-200">
              <div className="text-xs text-slate-500 mb-1">{language === "de" ? "Internes Problem" : "Internal Problem"}</div>
              <p className="text-slate-700 text-sm">{currentStepData.internal}</p>
            </div>
            <div className="bg-white p-4 border border-stone-200">
              <div className="text-xs text-slate-500 mb-1">{language === "de" ? "Philosophisches Problem" : "Philosophical Problem"}</div>
              <p className="text-slate-700 text-sm">{currentStepData.philosophical}</p>
            </div>
          </div>
        )}

        {"empathy" in currentStepData && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white p-4 border border-stone-200">
                <div className="text-xs text-slate-500 mb-1">{language === "de" ? "Empathie" : "Empathy"}</div>
                <p className="text-slate-700 text-sm">{currentStepData.empathy}</p>
              </div>
              <div className="bg-white p-4 border border-stone-200">
                <div className="text-xs text-slate-500 mb-1">{language === "de" ? "Autorität" : "Authority"}</div>
                <p className="text-slate-700 text-sm">{currentStepData.authority}</p>
              </div>
            </div>
            <div className="bg-white p-4 border border-stone-200">
              <div className="text-xs text-slate-500 mb-1">{language === "de" ? "Das Versprechen" : "The Promise"}</div>
              <p className="text-slate-700 font-medium">{currentStepData.promise}</p>
            </div>
          </div>
        )}

        {"steps" in currentStepData && currentStepData.steps && (
          <div className="space-y-3">
            {currentStepData.steps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 bg-white p-4 border border-stone-200">
                <div className="w-6 h-6 bg-stone-100 border border-stone-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-slate-600 text-xs font-bold">{idx + 1}</span>
                </div>
                <p className="text-slate-700 text-sm">{step.substring(3)}</p>
              </div>
            ))}
          </div>
        )}

        {"primary" in currentStepData && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white p-4 border border-stone-200">
                <div className="text-xs text-slate-500 mb-1">{language === "de" ? "Primärer CTA" : "Primary CTA"}</div>
                <p className="text-slate-700 text-sm">{currentStepData.primary}</p>
              </div>
              <div className="bg-white p-4 border border-stone-200">
                <div className="text-xs text-slate-500 mb-1">{language === "de" ? "Sekundärer CTA" : "Secondary CTA"}</div>
                <p className="text-slate-700 text-sm">{currentStepData.secondary}</p>
              </div>
            </div>
            <div className="bg-white p-4 border border-stone-200">
              <div className="text-xs text-slate-500 mb-1">{language === "de" ? "Das System übernimmt" : "The System Takes Over"}</div>
              <p className="text-slate-700 text-sm">{currentStepData.trigger}</p>
            </div>
          </div>
        )}

        {"success" in currentStepData && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white p-4 border border-stone-200">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {language === "de" ? "Erfolg (mit System)" : "Success (with System)"}
                </div>
                <p className="text-slate-700 text-sm">{currentStepData.success}</p>
              </div>
              <div className="bg-white p-4 border border-stone-200">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <X className="w-4 h-4" />
                  {language === "de" ? "Scheitern (ohne System)" : "Failure (without System)"}
                </div>
                <p className="text-slate-700 text-sm">{currentStepData.failure}</p>
              </div>
            </div>
            <div className="bg-white p-4 border border-stone-200">
              <div className="text-xs text-slate-500 mb-1">{language === "de" ? "Die Transformation" : "The Transformation"}</div>
              <p className="text-slate-700 font-semibold">
                {currentStepData.transformation}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
          disabled={activeStep === 0}
          className={`flex items-center gap-2 px-4 py-2 transition-all ${
            activeStep === 0
              ? "text-slate-600 cursor-not-allowed"
              : "text-slate-600 hover:text-slate-800 hover:bg-white"
          }`}
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          {language === "de" ? "Zurück" : "Back"}
        </button>

        <div className="flex gap-1">
          {journey.map((step, idx) => {
            const stepColors = colorClasses[step.color];
            return (
              <button
                key={idx}
                onClick={() => setActiveStep(idx)}
                className={`w-2 h-2 transition-all ${
                  activeStep === idx ? `${stepColors.dot} w-6` : "bg-stone-300 hover:bg-stone-400"
                }`}
              />
            );
          })}
        </div>

        <button
          onClick={() => setActiveStep(Math.min(journey.length - 1, activeStep + 1))}
          disabled={activeStep === journey.length - 1}
          className={`flex items-center gap-2 px-4 py-2 transition-all ${
            activeStep === journey.length - 1
              ? "text-slate-600 cursor-not-allowed"
              : "text-slate-600 hover:text-slate-800 hover:bg-white"
          }`}
        >
          {language === "de" ? "Weiter" : "Next"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================
// VISUALLY DYNAMIC LTV BOOSTER (Scroll-Reveal Style)
// ============================================

function DynamicLTVBooster() {
  const { language } = useLanguage();
  const [activeBusiness, setActiveBusiness] = useState<"segelschule" | "haus">("segelschule");
  const [activePhase, setActivePhase] = useState<"vorher" | "waehrend" | "nachher">("vorher");

  // Flywheel modal state
  const [flywheelModalOpen, setFlywheelModalOpen] = useState(false);
  const [selectedTouchpoint, setSelectedTouchpoint] = useState<FlywheelTouchpoint | null>(null);

  // Handler for clicking on a touchpoint (email)
  const handleTouchpointClick = (email: { day: string; subject: string; preview: string }) => {
    setSelectedTouchpoint({
      id: `${activeBusiness}-${activePhase}-${email.day}`,
      phase: activePhase === "vorher" ? "nurture" : activePhase === "waehrend" ? "deliver" : "advocacy",
      day: email.day,
      subject: email.subject,
      preview: email.preview,
      business: activeBusiness,
      journeyPhase: activePhase,
      visualizationType: "message",
      deviceContext: "phone",
    });
    setFlywheelModalOpen(true);
  };

  // Detailed content for Segelschule phases with email previews
  const segelschuleContent = language === "de" ? {
    vorher: {
      color: "emerald",
      title: "VORHER",
      subtitle: "Vor dem Kurs",
      description: "Das System baut Vorfreude auf und bereitet deine Segelschüler optimal vor.",
      items: [
        {
          title: "Vorfreude-Sequenz",
          impact: "-50% No-Shows",
          timing: "7, 3 und 1 Tag vorher",
          emails: [
            { day: "7 Tage vorher", subject: "Das erwartet dich am Haff", preview: "In einer Woche ist es soweit. Das Haff wartet auf dich – Stille, Weite, und das Gefühl, wirklich anzukommen...", icon: <Mail className="w-5 h-5" /> },
            { day: "3 Tage vorher", subject: "Deine Packliste fürs Haff", preview: "Fast geschafft! Hier ist, was du mitbringen solltest. Und ein Tipp: Lass das Handy im Auto.", icon: <FileText className="w-5 h-5" /> },
            { day: "1 Tag vorher", subject: "Morgen geht's los!", preview: "Das Wetter sieht gut aus. Das Boot ist bereit. Wir freuen uns auf dich.", icon: <Bell className="w-5 h-5" /> },
          ],
        },
        {
          title: "Theorie-Zugang",
          impact: "+30% Prüfungserfolg",
          timing: "Sofort nach Buchung",
          description: "Sofortiger Zugriff auf die Online-Theorie. Dein Schüler kann sich vorbereiten, wann er will.",
          mockup: { type: "portal", title: "Dein Theorie-Portal", items: ["Kapitel 1: Grundlagen", "Kapitel 2: Vorfahrtsregeln", "Kapitel 3: Knoten", "Fortschritt: 0%"] },
        },
        {
          title: "Packliste & Tipps",
          impact: "+35% Zufriedenheit",
          timing: "Mit der 3-Tage-Mail",
          description: "Was mitbringen? Was erwartet mich? Praktische Infos, die Unsicherheit nehmen.",
          mockup: { type: "checklist", title: "Packliste Segelkurs", items: ["☐ Sonnencreme", "☐ Windjacke", "☐ Feste Schuhe", "☐ Gute Laune", "☑ Handy im Auto lassen"] },
        },
        {
          title: "Upgrade-Angebot",
          impact: "+25% Zusatzumsatz",
          timing: "Mit der Buchungsbestätigung",
          description: "Intelligentes Cross-Selling: Unterkunft am Haff dazubuchen?",
          mockup: { type: "offer", title: "Dein Upgrade", items: ["Du fährst 3h aus Berlin?", "→ Segeln + 2 Nächte am Haff", "Deine Komplett-Auszeit: 599€"] },
        },
      ],
    },
    waehrend: {
      color: "cyan",
      title: "WÄHREND",
      subtitle: "Während des Kurses",
      description: "Unsichtbare Unterstützung, die Probleme verhindert und Momente schafft.",
      items: [
        {
          title: "Foto-Moments",
          impact: "+40% Social Shares",
          timing: "Tag 1, Nachmittag",
          description: "Automatische Erinnerung: Zeit für ein Gruppenfoto! Diese Bilder werden zu Bewertungen.",
          mockup: { type: "notification", title: "📸 Foto-Zeit!", items: ["Perfektes Licht gerade", "Gruppenfoto am Plattboden?", "Diese Erinnerung teilen sie"] },
        },
        {
          title: "Tag-2-Check-in",
          impact: "-70% negative Reviews",
          timing: "Tag 2, 10:00 Uhr",
          emails: [{ day: "Tag 2", subject: "Wie läuft's auf dem Wasser?", preview: "Kurze Frage: Ist alles okay? Läuft der Kurs wie erwartet? Falls nicht – melde dich!", icon: <MessageSquare className="w-5 h-5" /> }],
        },
        {
          title: "Digital Concierge",
          impact: "-80% Support-Aufwand",
          timing: "24/7 verfügbar",
          description: "Bot für häufige Fragen: Zeiten, Treffpunkt, Theorie. Du musst nicht ans Telefon.",
          mockup: { type: "chat", title: "Frag den Concierge", items: ["'Wann ist morgen Treffpunkt?'", "→ 9:00 Uhr am Steg", "'Wo kann ich parken?'", "→ Parkplatz hinter dem..."] },
        },
        {
          title: "Fortschritts-Updates",
          impact: "+25% Zufriedenheit",
          timing: "Täglich abends",
          emails: [{ day: "Jeden Abend", subject: "Dein Tag auf dem Wasser", preview: "Heute gelernt: Wende und Halse. Morgen: Anlegen unter Segeln. Du machst das großartig!", icon: <TrendingUp className="w-5 h-5" /> }],
        },
      ],
    },
    nachher: {
      color: "purple",
      title: "NACHHER",
      subtitle: "Nach dem Kurs",
      description: "Verbindung halten, Folgekurse einladen, Empfehlungen generieren.",
      items: [
        {
          title: "Zertifikat + Danke",
          impact: "+40% mehr Reviews",
          timing: "Tag 1 nach Kursende",
          emails: [{ day: "1 Tag danach", subject: "Du hast es geschafft! Dein Zertifikat", preview: "Herzlichen Glückwunsch zum SBF Binnen! Im Anhang dein Zertifikat. Du hast den ersten Schritt gemacht.", icon: <Award className="w-5 h-5" /> }],
        },
        {
          title: "Upsell-Sequenz",
          impact: "+15% Upsells",
          timing: "14 Tage danach",
          emails: [{ day: "14 Tage danach", subject: "Bereit für den nächsten Schritt?", preview: "SBF See wartet. Vom Haff aufs Meer. Der logische nächste Schritt.", icon: <ArrowRight className="w-5 h-5" /> }],
        },
        {
          title: "Wiederkommer-Magie",
          impact: "+30% Wiederbuchung",
          timing: "Jahrestag + Saisonstart",
          emails: [
            { day: "1 Jahr später", subject: "Erinnerst du dich?", preview: "Vor genau einem Jahr warst du hier am Haff. Zeit für eine Wiederkehr?", icon: <Heart className="w-5 h-5" /> },
            { day: "Vor der Saison", subject: "Early-Bird für dich", preview: "Die neue Saison startet. Als ehemaliger Schüler: 10% Frühbucher-Rabatt.", icon: <Star className="w-5 h-5" /> },
          ],
        },
        {
          title: "Empfehlungs-Engine",
          impact: "+25% Empfehlungen",
          timing: "7 Tage nach Kursende",
          emails: [{ day: "7 Tage danach", subject: "Kennst du jemanden?", preview: "Du warst begeistert? Für jede Empfehlung: 50€ Gutschein für deinen nächsten Kurs.", icon: <Users className="w-5 h-5" /> }],
        },
      ],
    },
  } : {
    vorher: {
      color: "emerald",
      title: "BEFORE",
      subtitle: "Before the Course",
      description: "The system builds anticipation and prepares your sailing students optimally.",
      items: [
        {
          title: "Anticipation Sequence",
          impact: "-50% No-Shows",
          timing: "7, 3 and 1 day before",
          emails: [
            { day: "7 days before", subject: "What awaits you at the Haff", preview: "In one week it's time. The Haff is waiting for you – silence, expanse, and the feeling of truly arriving...", icon: <Mail className="w-5 h-5" /> },
            { day: "3 days before", subject: "Your packing list for the Haff", preview: "Almost there! Here's what you should bring. And a tip: Leave your phone in the car.", icon: <FileText className="w-5 h-5" /> },
            { day: "1 day before", subject: "Tomorrow it begins!", preview: "Weather looks good. The boat is ready. We're looking forward to seeing you.", icon: <Bell className="w-5 h-5" /> },
          ],
        },
        {
          title: "Theory Access",
          impact: "+30% Exam Success",
          timing: "Immediately after booking",
          description: "Immediate access to online theory. Your student can prepare whenever they want.",
          mockup: { type: "portal", title: "Your Theory Portal", items: ["Chapter 1: Basics", "Chapter 2: Right of Way Rules", "Chapter 3: Knots", "Progress: 0%"] },
        },
        {
          title: "Packing List & Tips",
          impact: "+35% Satisfaction",
          timing: "With the 3-day email",
          description: "What to bring? What to expect? Practical info that removes uncertainty.",
          mockup: { type: "checklist", title: "Sailing Course Packing List", items: ["☐ Sunscreen", "☐ Windbreaker", "☐ Sturdy shoes", "☐ Good mood", "☑ Leave phone in car"] },
        },
        {
          title: "Upgrade Offer",
          impact: "+25% Additional Revenue",
          timing: "With booking confirmation",
          description: "Smart cross-selling: Add accommodation at the Haff?",
          mockup: { type: "offer", title: "Your Upgrade", items: ["Driving 3h from Berlin?", "→ Sailing + 2 nights at the Haff", "Your complete getaway: €599"] },
        },
      ],
    },
    waehrend: {
      color: "cyan",
      title: "DURING",
      subtitle: "During the Course",
      description: "Invisible support that prevents problems and creates moments.",
      items: [
        {
          title: "Photo Moments",
          impact: "+40% Social Shares",
          timing: "Day 1, afternoon",
          description: "Automatic reminder: Time for a group photo! These pictures become reviews.",
          mockup: { type: "notification", title: "📸 Photo Time!", items: ["Perfect light right now", "Group photo at the flat-bottom?", "These memories they'll share"] },
        },
        {
          title: "Day-2 Check-in",
          impact: "-70% negative Reviews",
          timing: "Day 2, 10:00 AM",
          emails: [{ day: "Day 2", subject: "How's it going on the water?", preview: "Quick question: Is everything okay? Is the course going as expected? If not – let us know!", icon: <MessageSquare className="w-5 h-5" /> }],
        },
        {
          title: "Digital Concierge",
          impact: "-80% Support Effort",
          timing: "Available 24/7",
          description: "Bot for common questions: times, meeting point, theory. You don't have to answer the phone.",
          mockup: { type: "chat", title: "Ask the Concierge", items: ["'When do we meet tomorrow?'", "→ 9:00 AM at the dock", "'Where can I park?'", "→ Parking behind the..."] },
        },
        {
          title: "Progress Updates",
          impact: "+25% Satisfaction",
          timing: "Every evening",
          emails: [{ day: "Every evening", subject: "Your day on the water", preview: "Learned today: Tacking and jibing. Tomorrow: Docking under sail. You're doing great!", icon: <TrendingUp className="w-5 h-5" /> }],
        },
      ],
    },
    nachher: {
      color: "purple",
      title: "AFTER",
      subtitle: "After the Course",
      description: "Maintain connection, invite to follow-up courses, generate referrals.",
      items: [
        {
          title: "Certificate + Thanks",
          impact: "+40% more Reviews",
          timing: "Day 1 after course end",
          emails: [{ day: "1 day after", subject: "You did it! Your certificate", preview: "Congratulations on your SBF Binnen! Your certificate is attached. You've taken the first step.", icon: <Award className="w-5 h-5" /> }],
        },
        {
          title: "Upsell Sequence",
          impact: "+15% Upsells",
          timing: "14 days after",
          emails: [{ day: "14 days after", subject: "Ready for the next step?", preview: "SBF See awaits. From the Haff to the sea. The logical next step.", icon: <ArrowRight className="w-5 h-5" /> }],
        },
        {
          title: "Return Magic",
          impact: "+30% Rebooking",
          timing: "Anniversary + Season start",
          emails: [
            { day: "1 year later", subject: "Do you remember?", preview: "Exactly one year ago you were here at the Haff. Time to return?", icon: <Heart className="w-5 h-5" /> },
            { day: "Before the season", subject: "Early-Bird for you", preview: "The new season is starting. As a former student: 10% early-bird discount.", icon: <Star className="w-5 h-5" /> },
          ],
        },
        {
          title: "Referral Engine",
          impact: "+25% Referrals",
          timing: "7 days after course end",
          emails: [{ day: "7 days after", subject: "Know someone?", preview: "You were excited? For every referral: €50 voucher for your next course.", icon: <Users className="w-5 h-5" /> }],
        },
      ],
    },
  };

  // Detailed content for Haus phases with email previews
  const hausContent = language === "de" ? {
    vorher: {
      color: "emerald",
      title: "VORHER",
      subtitle: "Vor dem Aufenthalt",
      description: "Das System stimmt deine Gäste auf das Haff ein und baut Vorfreude auf.",
      items: [
        {
          title: "Vorfreude-Sequenz",
          impact: "-50% No-Shows",
          timing: "7 und 3 Tage vorher",
          emails: [
            { day: "7 Tage vorher", subject: "Das Haff wartet auf dich", preview: "In einer Woche bist du hier. Stille. Weite. Ankommen. Hier sind Orte, die nur Einheimische kennen...", icon: <Mail className="w-5 h-5" /> },
            { day: "3 Tage vorher", subject: "Letzte Infos vor deiner Auszeit", preview: "Das Wetter sieht gut aus. Die Anfahrt, wo der Schlüssel liegt, und ein Tipp...", icon: <MapPin className="w-5 h-5" /> },
          ],
        },
        {
          title: "Geheimtipp-Guide",
          impact: "+35% Zufriedenheit",
          timing: "Mit der Buchungsbestätigung",
          description: "PDF mit Orten, die nur Einheimische kennen. Macht dich zum Insider.",
          mockup: { type: "pdf", title: "Geheimtipps am Haff", items: ["🏖️ Der versteckte Strand", "🍽️ Fischerhütte (kein Tourist)", "🌅 Bester Sonnenuntergang-Spot", "🚶 Axinjas Lieblingsweg"] },
        },
        {
          title: "Walking-Angebot",
          impact: "+20% Zusatzbuchungen",
          timing: "Mit der 7-Tage-Mail",
          description: "Hinweis auf Axinjas begleitete Walks. Cross-Selling, das zum Erlebnis passt.",
          mockup: { type: "offer", title: "Walking mit Axinja", items: ["Während eures Aufenthalts:", "Begleitete Walks in der Natur", "Zeit mit sich selbst", "→ Jetzt dazubuchen"] },
        },
        {
          title: "Anreise-Infos",
          impact: "+30% positive Ankunft",
          timing: "1 Tag vorher",
          emails: [{ day: "1 Tag vorher", subject: "Morgen bist du hier!", preview: "Aktuelles Wetter: Sonnig, 22°C. Die Anfahrt, der Schlüssel, was dich erwartet.", icon: <Bell className="w-5 h-5" /> }],
        },
      ],
    },
    waehrend: {
      color: "cyan",
      title: "WÄHREND",
      subtitle: "Während des Aufenthalts",
      description: "Der stille Gastgeber – da wenn nötig, unsichtbar wenn nicht.",
      items: [
        {
          title: "Tag-2-Check-in",
          impact: "-70% negative Reviews",
          timing: "Tag 2, morgens",
          emails: [{ day: "Tag 2", subject: "Alles okay bei euch?", preview: "Kurze Frage: Ist alles so, wie ihr es euch vorgestellt habt? Falls etwas fehlt – melde dich.", icon: <MessageSquare className="w-5 h-5" /> }],
        },
        {
          title: "Digital Concierge",
          impact: "-80% Support-Aufwand",
          timing: "24/7 verfügbar",
          description: "WLAN-Passwort, Checkout-Zeit, Restaurant-Tipps – ohne dass du ans Telefon musst.",
          mockup: { type: "chat", title: "Frag den Concierge", items: ["'Wie ist das WLAN-Passwort?'", "→ HaffStille2024", "'Checkout-Zeit?'", "→ 11:00, flexibel auf Anfrage"] },
        },
        {
          title: "Aktivitäten-Tipp",
          impact: "+15% Cross-Selling",
          timing: "Tag 2-3",
          emails: [{ day: "Tag 2-3", subject: "Lust auf was Neues?", preview: "Segeln probieren? Gerrit bietet Schnupperkurse am Plattbodenschiff. Eine Stunde auf dem Wasser.", icon: <Ship className="w-5 h-5" /> }],
        },
        {
          title: "Foto-Erinnerung",
          impact: "+40% Social Shares",
          timing: "Bei schönem Wetter",
          mockup: { type: "notification", title: "📸 Perfektes Licht!", items: ["Sonnenuntergang in 1h", "Bester Spot: Am Steg", "Diese Momente festhalten"] },
        },
      ],
    },
    nachher: {
      color: "purple",
      title: "NACHHER",
      subtitle: "Nach dem Aufenthalt",
      description: "Verbindung halten – aus Gästen werden Stammgäste und Botschafter.",
      items: [
        {
          title: "Review-Pipeline",
          impact: "+40% mehr Reviews",
          timing: "2 Tage nach Abreise",
          emails: [{ day: "2 Tage danach", subject: "Danke für euren Besuch!", preview: "Wir hoffen, ihr hattet eine gute Zeit am Haff. Ein kurzes Feedback würde uns helfen.", icon: <Star className="w-5 h-5" /> }],
        },
        {
          title: "3-Monate-Mail",
          impact: "+30% Wiederbuchung",
          timing: "3 Monate später",
          emails: [{ day: "3 Monate später", subject: "Das Haff vermisst dich", preview: "Der Herbst ist da. Das Haff ist ruhiger denn je. Die Stille, die du kennst – sie wartet.", icon: <Heart className="w-5 h-5" /> }],
        },
        {
          title: "Early-Bird Stammgäste",
          impact: "+25% Frühbuchungen",
          timing: "Vor der Saison",
          emails: [{ day: "Januar/Februar", subject: "Exklusiv für dich: Early-Bird", preview: "Die neue Saison wird geplant. Als Stammgast: Erste Wahl + 10% Frühbucher-Rabatt.", icon: <Star className="w-5 h-5" /> }],
        },
        {
          title: "Jahrestag-Erinnerung",
          impact: "+20% Empfehlungen",
          timing: "Genau 1 Jahr später",
          emails: [{ day: "1 Jahr später", subject: "Letztes Jahr um diese Zeit...", preview: "...wart ihr hier am Haff. Die Stille, die Weite. Wie wär's mit einer Wiederkehr?", icon: <Calendar className="w-5 h-5" /> }],
        },
      ],
    },
  } : {
    vorher: {
      color: "emerald",
      title: "BEFORE",
      subtitle: "Before the Stay",
      description: "The system tunes your guests into the Haff and builds anticipation.",
      items: [
        {
          title: "Anticipation Sequence",
          impact: "-50% No-Shows",
          timing: "7 and 3 days before",
          emails: [
            { day: "7 days before", subject: "The Haff is waiting for you", preview: "In one week you'll be here. Silence. Expanse. Arriving. Here are places only locals know...", icon: <Mail className="w-5 h-5" /> },
            { day: "3 days before", subject: "Last info before your getaway", preview: "Weather looks good. Directions, where the key is, and a tip...", icon: <MapPin className="w-5 h-5" /> },
          ],
        },
        {
          title: "Insider Tips Guide",
          impact: "+35% Satisfaction",
          timing: "With booking confirmation",
          description: "PDF with places only locals know. Makes you an insider.",
          mockup: { type: "pdf", title: "Insider Tips at the Haff", items: ["🏖️ The hidden beach", "🍽️ Fisher's hut (no tourists)", "🌅 Best sunset spot", "🚶 Axinja's favorite path"] },
        },
        {
          title: "Walking Offer",
          impact: "+20% Additional Bookings",
          timing: "With the 7-day email",
          description: "Mention of Axinja's guided walks. Cross-selling that fits the experience.",
          mockup: { type: "offer", title: "Walking with Axinja", items: ["During your stay:", "Guided walks in nature", "Time with yourself", "→ Book now"] },
        },
        {
          title: "Arrival Info",
          impact: "+30% positive Arrival",
          timing: "1 day before",
          emails: [{ day: "1 day before", subject: "Tomorrow you'll be here!", preview: "Current weather: Sunny, 22°C. Directions, the key, what awaits you.", icon: <Bell className="w-5 h-5" /> }],
        },
      ],
    },
    waehrend: {
      color: "cyan",
      title: "DURING",
      subtitle: "During the Stay",
      description: "The quiet host – there when needed, invisible when not.",
      items: [
        {
          title: "Day-2 Check-in",
          impact: "-70% negative Reviews",
          timing: "Day 2, morning",
          emails: [{ day: "Day 2", subject: "Everything okay with you?", preview: "Quick question: Is everything as you imagined? If something's missing – let us know.", icon: <MessageSquare className="w-5 h-5" /> }],
        },
        {
          title: "Digital Concierge",
          impact: "-80% Support Effort",
          timing: "Available 24/7",
          description: "WiFi password, checkout time, restaurant tips – without you having to answer the phone.",
          mockup: { type: "chat", title: "Ask the Concierge", items: ["'What's the WiFi password?'", "→ HaffStille2024", "'Checkout time?'", "→ 11:00, flexible on request"] },
        },
        {
          title: "Activity Tip",
          impact: "+15% Cross-Selling",
          timing: "Day 2-3",
          emails: [{ day: "Day 2-3", subject: "Want to try something new?", preview: "Try sailing? Gerrit offers taster courses on the flat-bottom boat. One hour on the water.", icon: <Ship className="w-5 h-5" /> }],
        },
        {
          title: "Photo Reminder",
          impact: "+40% Social Shares",
          timing: "In good weather",
          mockup: { type: "notification", title: "📸 Perfect Light!", items: ["Sunset in 1 hour", "Best spot: At the dock", "Capture these moments"] },
        },
      ],
    },
    nachher: {
      color: "purple",
      title: "AFTER",
      subtitle: "After the Stay",
      description: "Maintain connection – turning guests into regulars and ambassadors.",
      items: [
        {
          title: "Review Pipeline",
          impact: "+40% more Reviews",
          timing: "2 days after departure",
          emails: [{ day: "2 days after", subject: "Thanks for your visit!", preview: "We hope you had a great time at the Haff. A quick feedback would help us.", icon: <Star className="w-5 h-5" /> }],
        },
        {
          title: "3-Month Email",
          impact: "+30% Rebooking",
          timing: "3 months later",
          emails: [{ day: "3 months later", subject: "The Haff misses you", preview: "Fall is here. The Haff is quieter than ever. The silence you know – it's waiting.", icon: <Heart className="w-5 h-5" /> }],
        },
        {
          title: "Early-Bird for Regulars",
          impact: "+25% Early Bookings",
          timing: "Before the season",
          emails: [{ day: "January/February", subject: "Exclusive for you: Early-Bird", preview: "The new season is being planned. As a regular: First choice + 10% early-bird discount.", icon: <Star className="w-5 h-5" /> }],
        },
        {
          title: "Anniversary Reminder",
          impact: "+20% Referrals",
          timing: "Exactly 1 year later",
          emails: [{ day: "1 year later", subject: "This time last year...", preview: "...you were here at the Haff. The silence, the expanse. How about a return?", icon: <Calendar className="w-5 h-5" /> }],
        },
      ],
    },
  };

  const content = activeBusiness === "segelschule" ? segelschuleContent : hausContent;
  const currentPhase = content[activePhase];

  const colorClasses = {
    emerald: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", light: "bg-sky-50/50" },
    cyan: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", light: "bg-sky-50/50" },
    purple: { bg: "bg-stone-100", text: "text-stone-700", border: "border-stone-300", light: "bg-stone-50" },
  };
  const colors = colorClasses[currentPhase.color as keyof typeof colorClasses];

  // Calculate progress percentage
  const progressPercent = activePhase === "vorher" ? 0 : activePhase === "waehrend" ? 50 : 100;

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 text-sky-700 mb-6">
          <Sparkles className="w-4 h-4 text-sky-700" />
          <span className="text-sky-700 text-sm font-medium">{language === "de" ? "Die Transformation" : "The Transformation"}</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-800 mb-4">
          {language === "de" ? "Das System, das leise arbeitet" : "The System That Works Quietly"}
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          {language === "de" ? "Drei Phasen, ein Ziel: Mehr Wert aus jedem Gast – automatisch." : "Three phases, one goal: More value from every guest – automatically."}
        </p>
      </div>

      {/* Business Type Toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex gap-1 p-1 bg-white shadow-md">
          <button
            onClick={() => { setActiveBusiness("segelschule"); setActivePhase("vorher"); }}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all ${
              activeBusiness === "segelschule"
                ? "bg-sky-600 text-white shadow-md"
                : "text-slate-600 hover:text-slate-800 hover:bg-sky-50"
            }`}
          >
            <Ship className="w-4 h-4" />
            {language === "de" ? "Segelschule" : "Sailing School"}
          </button>
          <button
            onClick={() => { setActiveBusiness("haus"); setActivePhase("vorher"); }}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all ${
              activeBusiness === "haus"
                ? "bg-stone-600 text-white shadow-md"
                : "text-slate-600 hover:text-slate-800 hover:bg-stone-100"
            }`}
          >
            <Home className="w-4 h-4" />
            {language === "de" ? "Haff Erleben" : "Haff Experience"}
          </button>
        </div>
      </div>

      {/* Phase Selector - Simple Tabs */}
      <div className="flex justify-center gap-2">
        {(["vorher", "waehrend", "nachher"] as const).map((phase) => {
          const phaseData = content[phase];
          const isActive = activePhase === phase;

          return (
            <button
              key={phase}
              onClick={() => setActivePhase(phase)}
              className={`px-6 py-3 text-sm font-medium transition-all ${
                isActive
                  ? "bg-sky-600 text-white shadow-md"
                  : "bg-white text-slate-600 hover:bg-stone-50 shadow-sm"
              }`}
            >
              {phaseData.title}
            </button>
          );
        })}
      </div>

      {/* Active Phase Content - Alternating Layout */}
      <div className="bg-white p-6 md:p-8 shadow-md transition-all duration-300">
        <p className="text-slate-600 text-center mb-10 max-w-2xl mx-auto">
          {currentPhase.description}
        </p>

        <div className="space-y-12">
          {currentPhase.items.map((item, idx) => {
            const isEven = idx % 2 === 0;

            return (
              <div
                key={idx}
                className={`flex flex-col ${isEven ? "md:flex-row" : "md:flex-row-reverse"} gap-6 md:gap-10 items-center`}
              >
                {/* Text Content */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h4 className="text-xl font-serif font-bold text-slate-800">{item.title}</h4>
                    <span className={`text-xs font-semibold ${colors.text} ${colors.bg} px-3 py-1`}>
                      {item.impact}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>{item.timing}</span>
                  </div>
                  {"description" in item && item.description && (
                    <p className="text-slate-600">{item.description}</p>
                  )}
                </div>

                {/* Visual Content - Emails or Mockups */}
                <div className="flex-1 w-full">
                  {"emails" in item && item.emails && (
                    <div className="space-y-3">
                      {item.emails.map((email, emailIdx) => {
                        // Generate unique block ID for this email
                        const emailBlockId = `systems.${activeBusiness}.${activePhase}.item${idx}.email${emailIdx}`;
                        return (
                          <div
                            key={emailIdx}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleTouchpointClick(email)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleTouchpointClick(email);
                              }
                            }}
                            className="w-full text-left bg-white p-4 border border-stone-200 hover:border-sky-400 hover:shadow-md transition-all cursor-pointer group"
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`p-2 ${colors.bg} group-hover:bg-sky-100 transition-colors`}>
                                <span className={`${colors.text} group-hover:text-sky-600 transition-colors`}>{email.icon}</span>
                              </div>
                              <div className="flex-1">
                                <div className="text-xs text-slate-500">{email.day}</div>
                                <div className="font-semibold text-slate-800 text-sm group-hover:text-sky-700 transition-colors">
                                  <EditableEmailSubject
                                    blockId={emailBlockId}
                                    defaultValue={email.subject}
                                  />
                                </div>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <RefreshCw className="w-4 h-4 text-sky-500" />
                              </div>
                            </div>
                            <div className="text-slate-500 text-sm pl-12 leading-relaxed">
                              <EditableEmailPreview
                                blockId={emailBlockId}
                                defaultValue={email.preview}
                              />
                            </div>
                            <div className="mt-2 pl-12 opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-xs text-sky-600 font-medium flex items-center gap-1">
                                {language === "de" ? "Flywheel ansehen" : "View Flywheel"}
                                <ArrowRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {"mockup" in item && item.mockup && (
                    <div className="bg-white p-5 border border-stone-200">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex gap-1">
                          <div className="w-3 h-3 bg-red-500/50" />
                          <div className="w-3 h-3 bg-yellow-500/50" />
                          <div className="w-3 h-3 bg-green-500/50" />
                        </div>
                        <span className="text-slate-500 text-xs ml-2">{item.mockup.title}</span>
                      </div>
                      <div className="space-y-2">
                        {item.mockup.items.map((mockItem, mockIdx) => (
                          <div key={mockIdx} className={`text-sm ${mockItem.startsWith("→") || mockItem.startsWith("☑") ? colors.text : mockItem.startsWith("☐") ? "text-slate-500" : "text-slate-600"} ${mockItem.startsWith("→") ? "pl-4" : ""}`}>
                            {mockItem}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-white p-6 border border-stone-200">
        <h4 className="font-serif font-semibold text-slate-800 text-center mb-6">
          {language === "de"
            ? `Zusammengefasst: Was diese Systeme für ${activeBusiness === "segelschule" ? "die Segelschule" : "Haff Erleben"} tun`
            : `Summary: What these systems do for ${activeBusiness === "segelschule" ? "the Sailing School" : "Haff Experience"}`}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-white">
            <div className="text-2xl font-bold text-rose-500">-50%</div>
            <div className="text-xs text-slate-500 mt-1">No-Shows</div>
          </div>
          <div className="text-center p-4 bg-white">
            <div className="text-2xl font-bold text-amber-600">+15%</div>
            <div className="text-xs text-slate-500 mt-1">{activeBusiness === "segelschule" ? "Upsells" : "Cross-Sells"}</div>
          </div>
          <div className="text-center p-4 bg-white">
            <div className="text-2xl font-bold text-sky-600">+40%</div>
            <div className="text-xs text-slate-500 mt-1">Reviews</div>
          </div>
          <div className="text-center p-4 bg-white">
            <div className="text-2xl font-bold text-sky-600">+30%</div>
            <div className="text-xs text-slate-500 mt-1">{language === "de" ? "Wiederkommer" : "Return Guests"}</div>
          </div>
          <div className="text-center p-4 bg-white">
            <div className="text-2xl font-bold text-stone-600">+25%</div>
            <div className="text-xs text-slate-500 mt-1">{language === "de" ? "Empfehlungen" : "Referrals"}</div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 p-4 bg-sky-50 border border-sky-200 mt-6">
          <CheckCircle2 className="w-5 h-5 text-sky-600" />
          <span className="text-sky-600 font-medium text-sm">
            {language === "de"
              ? "Alle Automationen sind im Website-Preis enthalten – kein Aufpreis"
              : "All automations are included in the website price – no extra charge"}
          </span>
        </div>
      </div>

      {/* Flywheel Modal */}
      <FlywheelModal
        isOpen={flywheelModalOpen}
        onClose={() => setFlywheelModalOpen(false)}
        touchpoint={selectedTouchpoint}
      />
    </div>
  );
}

// ============================================
// MARKETING PACKAGES SELECTOR WITH DETAIL MODALS
// ============================================

function MarketingPackagesSection() {
  const { language } = useLanguage();
  // Package selection state
  const [selectedPackages, setSelectedPackages] = useState<{
    seo: boolean;
    geo: boolean;
    ads: boolean;
  }>({
    seo: false,
    geo: false,
    ads: false,
  });

  // Modal state
  const [activeModal, setActiveModal] = useState<"seo" | "geo" | "ads" | null>(null);

  // Custom parameters for fine-tuning
  const [customParams, setCustomParams] = useState({
    adsMonthlyBudget: 400,
    adsCostPerClick: 0.80,
    adsConversionRate: 3,
  });

  // Package definitions
  const packages = language === "de" ? {
    seo: {
      name: "SEO (Suchmaschinenoptimierung)",
      icon: <Search className="w-6 h-6 text-sky-600" />,
      color: "cyan",
      monthlyPrice: 350,
      setupFee: 500,
      timeToResults: "4-6 Monate",
      description: "Nachhaltige Sichtbarkeit bei Google & Co.",
      features: [
        "Keyword-Recherche & Strategie",
        "On-Page Optimierung",
        "Technisches SEO",
        "Content-Erstellung (2 Artikel/Monat)",
        "Lokales SEO (Google Business Profile)",
        "Monatliches Reporting",
        "Backlink-Aufbau (Basis)",
      ],
      expectedBookingsYear: 15,
    },
    geo: {
      name: "GEO (AI-Sichtbarkeit)",
      icon: <Bot className="w-6 h-6 text-stone-600" />,
      color: "purple",
      monthlyPrice: 250,
      setupFee: 400,
      timeToResults: "2-4 Monate",
      description: "Gefunden werden von ChatGPT, Perplexity & Co.",
      features: [
        "AI-optimierte Inhalte",
        "Strukturierte Daten (Schema.org)",
        "FAQ & Knowledge-Base Aufbau",
        "Erwähnungen in AI-freundlichen Quellen",
        "Monitoring der AI-Sichtbarkeit",
        "Monatliches Reporting",
      ],
      expectedBookingsYear: 8,
      isNew: true,
    },
    ads: {
      name: "Bezahlte Werbung",
      icon: <Target className="w-6 h-6 text-amber-600" />,
      color: "orange",
      monthlyPrice: customParams.adsMonthlyBudget,
      setupFee: 300,
      timeToResults: "Sofort",
      description: "Sofortige Sichtbarkeit durch Anzeigen.",
      features: [
        "Kampagnen-Setup & Strategie",
        "Zielgruppen-Targeting",
        "Anzeigen-Erstellung",
        "A/B Testing",
        "Conversion-Tracking",
        "Wöchentliche Optimierung",
        "Monatliches Reporting",
      ],
      managementFee: 150,
      expectedBookingsYear: Math.round((customParams.adsMonthlyBudget / customParams.adsCostPerClick) * (customParams.adsConversionRate / 100) * 12),
    },
  } : {
    seo: {
      name: "SEO (Search Engine Optimization)",
      icon: <Search className="w-6 h-6 text-sky-600" />,
      color: "cyan",
      monthlyPrice: 350,
      setupFee: 500,
      timeToResults: "4-6 months",
      description: "Sustainable visibility on Google & Co.",
      features: [
        "Keyword research & strategy",
        "On-page optimization",
        "Technical SEO",
        "Content creation (2 articles/month)",
        "Local SEO (Google Business Profile)",
        "Monthly reporting",
        "Backlink building (basic)",
      ],
      expectedBookingsYear: 15,
    },
    geo: {
      name: "GEO (AI Visibility)",
      icon: <Bot className="w-6 h-6 text-stone-600" />,
      color: "purple",
      monthlyPrice: 250,
      setupFee: 400,
      timeToResults: "2-4 months",
      description: "Get found by ChatGPT, Perplexity & Co.",
      features: [
        "AI-optimized content",
        "Structured data (Schema.org)",
        "FAQ & knowledge base setup",
        "Mentions in AI-friendly sources",
        "AI visibility monitoring",
        "Monthly reporting",
      ],
      expectedBookingsYear: 8,
      isNew: true,
    },
    ads: {
      name: "Paid Advertising",
      icon: <Target className="w-6 h-6 text-amber-600" />,
      color: "orange",
      monthlyPrice: customParams.adsMonthlyBudget,
      setupFee: 300,
      timeToResults: "Immediately",
      description: "Immediate visibility through ads.",
      features: [
        "Campaign setup & strategy",
        "Audience targeting",
        "Ad creation",
        "A/B Testing",
        "Conversion tracking",
        "Weekly optimization",
        "Monthly reporting",
      ],
      managementFee: 150,
      expectedBookingsYear: Math.round((customParams.adsMonthlyBudget / customParams.adsCostPerClick) * (customParams.adsConversionRate / 100) * 12),
    },
  };

  // Calculate totals
  const totals = useMemo(() => {
    let monthlyTotal = 0;
    let setupTotal = 0;
    let yearlyBookings = 0;

    if (selectedPackages.seo) {
      monthlyTotal += packages.seo.monthlyPrice;
      setupTotal += packages.seo.setupFee;
      yearlyBookings += packages.seo.expectedBookingsYear;
    }
    if (selectedPackages.geo) {
      monthlyTotal += packages.geo.monthlyPrice;
      setupTotal += packages.geo.setupFee;
      yearlyBookings += packages.geo.expectedBookingsYear;
    }
    if (selectedPackages.ads) {
      monthlyTotal += packages.ads.monthlyPrice + packages.ads.managementFee;
      setupTotal += packages.ads.setupFee;
      yearlyBookings += packages.ads.expectedBookingsYear;
    }

    const yearlyTotal = monthlyTotal * 12 + setupTotal;
    const costPerBooking = yearlyBookings > 0 ? Math.round(yearlyTotal / yearlyBookings) : 0;

    return { monthlyTotal, setupTotal, yearlyTotal, yearlyBookings, costPerBooking };
  }, [selectedPackages, customParams]);

  const togglePackage = (pkg: "seo" | "geo" | "ads") => {
    setSelectedPackages(prev => ({ ...prev, [pkg]: !prev[pkg] }));
  };

  return (
    <div className="bg-white backdrop-blur-sm p-6 md:p-8 border border-stone-200">
      <div className="flex items-center gap-3 mb-2">
        <Megaphone className="w-6 h-6 text-stone-600" />
        <h3 className="text-xl font-serif font-semibold text-slate-800">{language === "de" ? "Marketing-Optionen" : "Marketing Options"}</h3>
        <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1">{language === "de" ? "Zusatzleistung" : "Add-on"}</span>
      </div>
      <p className="text-slate-500 text-sm mb-6">
        {language === "de"
          ? "Wähle die Kanäle, die für dich Sinn machen. Klicke auf 'Details' für technische Informationen."
          : "Choose the channels that make sense for you. Click 'Details' for technical information."}
      </p>

      {/* Important Note */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/30 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-600">{language === "de" ? "Wichtig zu verstehen" : "Important to understand"}</div>
            <p className="text-sm text-slate-600 mt-1">
              {language === "de"
                ? <>Die Website allein macht dich nicht automatisch sichtbar. Marketing ist eine <strong>separate, laufende Investition</strong>. Wähle unten, was zu deinen Zielen passt.</>
                : <>The website alone doesn&apos;t make you automatically visible. Marketing is a <strong>separate, ongoing investment</strong>. Choose below what fits your goals.</>}
            </p>
          </div>
        </div>
      </div>

      {/* Package Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {/* SEO Package */}
        <div
          className={`relative p-5 border-2 transition-all cursor-pointer ${
            selectedPackages.seo
              ? "bg-sky-50 border-sky-500"
              : "bg-white border-stone-200 hover:border-slate-300"
          }`}
          onClick={() => togglePackage("seo")}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {packages.seo.icon}
              <h4 className="font-serif font-semibold text-slate-800 text-sm">SEO</h4>
            </div>
            <div className={`w-5 h-5 border-2 flex items-center justify-center transition-all ${
              selectedPackages.seo ? "bg-sky-600 border-sky-500" : "border-slate-300"
            }`}>
              {selectedPackages.seo && <CheckCircle2 className="w-4 h-4 text-white" />}
            </div>
          </div>

          <p className="text-xs text-slate-500 mb-3">{packages.seo.description}</p>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{language === "de" ? "Monatlich" : "Monthly"}</span>
              <span className="text-slate-800 font-semibold">{packages.seo.monthlyPrice}€</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{language === "de" ? "Setup (einmalig)" : "Setup (one-time)"}</span>
              <span className="text-slate-600">{packages.seo.setupFee}€</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{language === "de" ? "Erste Ergebnisse" : "First results"}</span>
              <span className="text-sky-600">{packages.seo.timeToResults}</span>
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); setActiveModal("seo"); }}
            className="w-full py-2 px-3 bg-white hover:bg-stone-100 text-sm text-sky-600 flex items-center justify-center gap-2 transition-colors"
          >
            <Info className="w-4 h-4" />
            {language === "de" ? "Details & Technik" : "Details & Technical"}
          </button>
        </div>

        {/* GEO Package */}
        <div
          className={`relative p-5 border-2 transition-all cursor-pointer ${
            selectedPackages.geo
              ? "bg-stone-100 border-stone-400"
              : "bg-white border-stone-200 hover:border-slate-300"
          }`}
          onClick={() => togglePackage("geo")}
        >
          <div className="absolute -top-2 -right-2 text-xs bg-stone-600 text-white px-2 py-0.5">
            {language === "de" ? "Neu" : "New"}
          </div>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {packages.geo.icon}
              <h4 className="font-serif font-semibold text-slate-800 text-sm">GEO</h4>
            </div>
            <div className={`w-5 h-5 border-2 flex items-center justify-center transition-all ${
              selectedPackages.geo ? "bg-stone-600 border-stone-400" : "border-slate-300"
            }`}>
              {selectedPackages.geo && <CheckCircle2 className="w-4 h-4 text-white" />}
            </div>
          </div>

          <p className="text-xs text-slate-500 mb-3">{packages.geo.description}</p>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{language === "de" ? "Monatlich" : "Monthly"}</span>
              <span className="text-slate-800 font-semibold">{packages.geo.monthlyPrice}€</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{language === "de" ? "Setup (einmalig)" : "Setup (one-time)"}</span>
              <span className="text-slate-600">{packages.geo.setupFee}€</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{language === "de" ? "Erste Ergebnisse" : "First results"}</span>
              <span className="text-stone-600">{packages.geo.timeToResults}</span>
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); setActiveModal("geo"); }}
            className="w-full py-2 px-3 bg-white hover:bg-stone-100 text-sm text-stone-600 flex items-center justify-center gap-2 transition-colors"
          >
            <Info className="w-4 h-4" />
            {language === "de" ? "Details & Technik" : "Details & Technical"}
          </button>
        </div>

        {/* Ads Package */}
        <div
          className={`relative p-5 border-2 transition-all cursor-pointer ${
            selectedPackages.ads
              ? "bg-amber-50 border-orange-500"
              : "bg-white border-stone-200 hover:border-slate-300"
          }`}
          onClick={() => togglePackage("ads")}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {packages.ads.icon}
              <h4 className="font-serif font-semibold text-slate-800 text-sm">Ads</h4>
            </div>
            <div className={`w-5 h-5 border-2 flex items-center justify-center transition-all ${
              selectedPackages.ads ? "bg-orange-500 border-orange-500" : "border-slate-300"
            }`}>
              {selectedPackages.ads && <CheckCircle2 className="w-4 h-4 text-slate-800" />}
            </div>
          </div>

          <p className="text-xs text-slate-500 mb-3">{packages.ads.description}</p>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{language === "de" ? "Werbebudget" : "Ad budget"}</span>
              <span className="text-slate-800 font-semibold">{customParams.adsMonthlyBudget}€/{language === "de" ? "Mo" : "mo"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">+ Management</span>
              <span className="text-slate-600">{packages.ads.managementFee}€/{language === "de" ? "Mo" : "mo"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{language === "de" ? "Erste Ergebnisse" : "First results"}</span>
              <span className="text-amber-600">{packages.ads.timeToResults}</span>
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); setActiveModal("ads"); }}
            className="w-full py-2 px-3 bg-white hover:bg-stone-100 text-sm text-amber-600 flex items-center justify-center gap-2 transition-colors"
          >
            <Info className="w-4 h-4" />
            {language === "de" ? "Details & Technik" : "Details & Technical"}
          </button>
        </div>
      </div>

      {/* Ads Budget Slider (shown when ads selected) */}
      {selectedPackages.ads && (
        <div className="p-4 bg-stone-50 mb-6">
          <h4 className="text-sm font-semibold text-slate-800 mb-3">{language === "de" ? "Werbebudget anpassen" : "Adjust ad budget"}</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-500">{language === "de" ? "Monatliches Werbebudget" : "Monthly ad budget"}</label>
              <input
                type="range"
                min="200"
                max="2000"
                step="100"
                value={customParams.adsMonthlyBudget}
                onChange={(e) => setCustomParams(prev => ({ ...prev, adsMonthlyBudget: Number(e.target.value) }))}
                className="w-full mt-1"
              />
              <div className="text-right text-xs text-amber-600">{customParams.adsMonthlyBudget}€</div>
            </div>
            <div>
              <label className="text-xs text-slate-500">{language === "de" ? "Kosten pro Klick (geschätzt)" : "Cost per click (estimated)"}</label>
              <input
                type="range"
                min="0.4"
                max="2.5"
                step="0.1"
                value={customParams.adsCostPerClick}
                onChange={(e) => setCustomParams(prev => ({ ...prev, adsCostPerClick: Number(e.target.value) }))}
                className="w-full mt-1"
              />
              <div className="text-right text-xs text-slate-500">{customParams.adsCostPerClick.toFixed(2)}€</div>
            </div>
            <div>
              <label className="text-xs text-slate-500">{language === "de" ? "Conversion Rate (geschätzt)" : "Conversion rate (estimated)"}</label>
              <input
                type="range"
                min="1"
                max="8"
                step="0.5"
                value={customParams.adsConversionRate}
                onChange={(e) => setCustomParams(prev => ({ ...prev, adsConversionRate: Number(e.target.value) }))}
                className="w-full mt-1"
              />
              <div className="text-right text-xs text-sky-600">{customParams.adsConversionRate}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Total Summary */}
      {(selectedPackages.seo || selectedPackages.geo || selectedPackages.ads) ? (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-sky-500/10 via-purple-500/10 to-orange-500/10 p-5 border border-sky-200">
            <h4 className="font-serif font-semibold text-slate-800 mb-4">{language === "de" ? "Deine Auswahl" : "Your Selection"}</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-slate-500 text-xs">{language === "de" ? "Setup (einmalig)" : "Setup (one-time)"}</div>
                <div className="text-slate-800 font-bold text-lg">{totals.setupTotal.toLocaleString(language === "de" ? "de-DE" : "en-US")}€</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs">{language === "de" ? "Monatlich" : "Monthly"}</div>
                <div className="text-slate-800 font-bold text-lg">{totals.monthlyTotal.toLocaleString(language === "de" ? "de-DE" : "en-US")}€</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs">{language === "de" ? "Erwartete Buchungen/Jahr" : "Expected bookings/year"}</div>
                <div className="text-sky-600 font-bold text-lg">~{totals.yearlyBookings}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs">{language === "de" ? "Ø Kosten/Buchung" : "Avg. cost/booking"}</div>
                <div className="text-amber-600 font-bold text-lg">~{totals.costPerBooking}€</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-stone-200">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">{language === "de" ? "Erstes Jahr (Setup + 12× Monatlich)" : "First year (Setup + 12× Monthly)"}</span>
                <span className="text-xl font-serif font-bold text-slate-800">{totals.yearlyTotal.toLocaleString(language === "de" ? "de-DE" : "en-US")}€</span>
              </div>
            </div>
          </div>

          {/* LTV:CAC Impact Section - HERO DISPLAY */}
          <div className="bg-gradient-to-br from-sky-500/20 via-sky-500/10 to-stone-500/10 p-6 md:p-8 border border-sky-200 relative overflow-hidden">
            {/* Background glow effect */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-sky-50 blur-3xl -translate-y-1/2 translate-x-1/2" />

            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-sky-600">
                  <TrendingUp className="w-6 h-6 text-sky-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-lg">{language === "de" ? "Auswirkung auf deinen ROI" : "Impact on your ROI"}</h4>
                  <p className="text-slate-500 text-sm">{language === "de" ? "So verbessert Marketing dein LTV:CAC Verhältnis" : "How marketing improves your LTV:CAC ratio"}</p>
                </div>
              </div>

              {(() => {
                // Calculate LTV:CAC impact
                // Base values (from LTVCACCalculator defaults)
                const baseLTV = 66000; // Combined LTV without marketing
                const baseCAC = 15000; // Website investment
                const baseRatio = baseLTV / baseCAC;

                // With marketing: More customers = more LTV, but also higher CAC
                const avgCustomerValue = 550 + 180 * 2.5; // Segelschule + Haus combined avg
                const additionalLTV = totals.yearlyBookings * avgCustomerValue * 1.35; // 35% upsell/repeat factor
                const newLTV = baseLTV + additionalLTV;
                const newCAC = baseCAC + totals.yearlyTotal;
                const newRatio = newLTV / newCAC;

                const ratioImprovement = ((newRatio - baseRatio) / baseRatio) * 100;
                const ltvIncrease = ((newLTV - baseLTV) / baseLTV) * 100;
                const isImproved = newRatio > baseRatio;

                return (
                  <div className="space-y-6">
                    {/* HERO: Big Improvement Percentage */}
                    {isImproved && (
                      <div className="text-center py-6 bg-gradient-to-r from-sky-500/10 via-sky-500/20 to-teal-500/10 border border-sky-400/20">
                        <div className="flex items-center justify-center gap-3 mb-2">
                          <ArrowUp className="w-8 h-8 text-sky-600 animate-bounce" />
                          <span className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-sky-600 tabular-nums transition-all duration-500">
                            +{ratioImprovement.toFixed(0)}%
                          </span>
                        </div>
                        <div className="text-sky-700 font-semibold text-lg">{language === "de" ? "LTV:CAC Verbesserung" : "LTV:CAC Improvement"}</div>
                        <div className="text-slate-500 text-sm mt-1">{language === "de" ? "durch deine Marketing-Auswahl" : "through your marketing selection"}</div>
                      </div>
                    )}

                    {/* Before vs After Cards */}
                    <div className="grid md:grid-cols-3 gap-4">
                      {/* Before */}
                      <div className="bg-white p-5 border border-stone-200">
                        <div className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-3">{language === "de" ? "Ohne Marketing" : "Without Marketing"}</div>
                        <div className="text-3xl font-serif font-bold text-slate-500 mb-1">{baseRatio.toFixed(1)}x</div>
                        <div className="text-xs text-slate-500">LTV:CAC Ratio</div>
                        <div className="mt-3 pt-3 border-t border-stone-200/50 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">LTV</span>
                            <span className="text-slate-500">{baseLTV.toLocaleString(language === "de" ? "de-DE" : "en-US")}€</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">CAC</span>
                            <span className="text-slate-500">{baseCAC.toLocaleString(language === "de" ? "de-DE" : "en-US")}€</span>
                          </div>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="hidden md:flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                          <ArrowRight className="w-8 h-8 text-sky-600" />
                          <div className="text-xs text-sky-600 font-medium">Marketing</div>
                        </div>
                      </div>

                      {/* After */}
                      <div className="bg-gradient-to-br from-sky-500/20 to-sky-500/10 p-5 border-2 border-sky-400/50 relative">
                        <div className="absolute -top-3 -right-3 bg-teal-600 text-white text-xs font-bold px-3 py-1 shadow-lg">
                          {language === "de" ? "NEU" : "NEW"}
                        </div>
                        <div className="text-sky-600 text-xs font-medium uppercase tracking-wider mb-3">{language === "de" ? "Mit Marketing" : "With Marketing"}</div>
                        <div className={`text-4xl font-black mb-1 transition-all duration-500 ${
                          newRatio >= 3 ? "text-sky-600" : newRatio >= 2 ? "text-amber-600" : "text-rose-600"
                        }`}>
                          {newRatio.toFixed(1)}x
                        </div>
                        <div className="text-xs text-sky-700/80">LTV:CAC Ratio</div>
                        <div className="mt-3 pt-3 border-t border-sky-200 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-sky-700/60">LTV</span>
                            <span className="text-sky-700 font-semibold">{Math.round(newLTV).toLocaleString(language === "de" ? "de-DE" : "en-US")}€</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-sky-700/60">CAC</span>
                            <span className="text-sky-700">{Math.round(newCAC).toLocaleString(language === "de" ? "de-DE" : "en-US")}€</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Additional LTV Increase Highlight */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-white/90 p-4 border border-stone-200/50">
                        <div className="flex items-center gap-3">
                          <div className="text-sky-600">
                            <Users className="w-5 h-5 text-sky-600" />
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-sky-600">+{totals.yearlyBookings}</div>
                            <div className="text-xs text-slate-500">{language === "de" ? "Zusätzliche Buchungen/Jahr" : "Additional bookings/year"}</div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white/90 p-4 border border-stone-200/50">
                        <div className="flex items-center gap-3">
                          <div className="text-stone-600">
                            <TrendingUp className="w-5 h-5 text-stone-600" />
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-stone-600">+{ltvIncrease.toFixed(0)}%</div>
                            <div className="text-xs text-slate-500">{language === "de" ? "Mehr Lifetime Value" : "More Lifetime Value"}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>LTV:CAC Ratio</span>
                        <span className={newRatio >= 3 ? "text-sky-600 font-semibold" : newRatio >= 2 ? "text-amber-600" : "text-rose-600"}>
                          {newRatio >= 3 ? (language === "de" ? "Exzellent" : "Excellent") : newRatio >= 2 ? (language === "de" ? "Gut" : "Good") : (language === "de" ? "Verbesserungswürdig" : "Needs improvement")}
                        </span>
                      </div>
                      <div className="relative h-6 bg-white overflow-hidden">
                        {/* Base ratio (ghost) */}
                        <div
                          className="absolute inset-y-0 left-0 bg-stone-100"
                          style={{ width: `${Math.min((baseRatio / 6) * 100, 100)}%` }}
                        />
                        {/* New ratio (animated) */}
                        <div
                          className={`absolute inset-y-0 left-0 transition-all duration-700 ease-out ${
                            newRatio >= 3 ? "bg-gradient-to-r from-sky-600 via-sky-500 to-sky-600" :
                            newRatio >= 2 ? "bg-gradient-to-r from-amber-600 to-amber-400" :
                            "bg-gradient-to-r from-red-600 to-red-400"
                          }`}
                          style={{ width: `${Math.min((newRatio / 6) * 100, 100)}%` }}
                        >
                          {/* Shimmer effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                        </div>
                        {/* Markers */}
                        <div className="absolute inset-y-0 left-[33.3%] w-0.5 bg-stone-300/50" />
                        <div className="absolute inset-y-0 left-[50%] w-0.5 bg-stone-300/50" />
                        {/* Current value indicator */}
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white shadow-lg border-2 border-emerald-400 transition-all duration-700"
                          style={{ left: `calc(${Math.min((newRatio / 6) * 100, 100)}% - 8px)` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>0x</span>
                        <span>2x</span>
                        <span>3x</span>
                        <span>6x+</span>
                      </div>
                    </div>

                    {/* Explanation */}
                    <div className="bg-stone-50 p-4 border border-stone-200/50">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-slate-600">
                          <strong className="text-slate-800">{language === "de" ? "Das Prinzip:" : "The principle:"}</strong> {language === "de"
                            ? "Marketing erhöht deinen CAC (Kundenakquisitionskosten), aber jeder neue Kunde generiert durch das automatisierte System mehr Umsatz (Upsells, Wiederkehrer, Empfehlungen)."
                            : "Marketing increases your CAC (customer acquisition costs), but each new customer generates more revenue through the automated system (upsells, return visitors, referrals)."}
                          {isImproved ? (
                            <span className="text-sky-600 font-medium"> {language === "de" ? "Das System macht jeden Marketing-Euro wertvoller!" : "The system makes every marketing euro more valuable!"}</span>
                          ) : (
                            <span className="text-amber-600"> {language === "de" ? "Die Buchungen müssen den höheren CAC rechtfertigen." : "The bookings must justify the higher CAC."}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500">
          <p>{language === "de" ? "Wähle oben mindestens eine Option, um die Kosten zu sehen." : "Select at least one option above to see the costs."}</p>
        </div>
      )}

      {/* === DETAIL MODALS === */}

      {/* SEO Detail Modal */}
      <DetailModal
        isOpen={activeModal === "seo"}
        onClose={() => setActiveModal(null)}
        title={language === "de" ? "SEO im Detail" : "SEO in Detail"}
        icon={<Search className="w-6 h-6 text-sky-600" />}
      >
        <div className="space-y-6">
          {/* What is SEO */}
          <div>
            <h4 className="font-serif font-semibold text-slate-800 mb-2">{language === "de" ? "Was ist SEO?" : "What is SEO?"}</h4>
            <p className="text-slate-600 text-sm">
              {language === "de"
                ? "SEO (Search Engine Optimization) sorgt dafür, dass deine Website bei Google, Bing und anderen Suchmaschinen gefunden wird, wenn jemand nach 'Segelschule Ostsee' oder 'Ferienwohnung Haff' sucht."
                : "SEO (Search Engine Optimization) ensures your website is found on Google, Bing and other search engines when someone searches for 'sailing school Baltic Sea' or 'holiday apartment Haff'."}
            </p>
          </div>

          {/* Technical Breakdown */}
          <div>
            <h4 className="font-serif font-semibold text-slate-800 mb-3">{language === "de" ? "Was wir technisch machen" : "What we do technically"}</h4>
            <div className="space-y-4">
              <div className="bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileSearch className="w-4 h-4 text-sky-600" />
                  <span className="font-medium text-slate-800 text-sm">{language === "de" ? "Keyword-Recherche" : "Keyword Research"}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {language === "de"
                    ? "Wir finden heraus, wonach deine Zielgruppe sucht: 'SBF Binnen Kurs', 'Segelschein machen', 'Urlaub am Stettiner Haff', etc. Diese Keywords werden strategisch in deine Inhalte eingebaut."
                    : "We find out what your target audience searches for: 'SBF inland course', 'get sailing license', 'vacation at Szczecin Lagoon', etc. These keywords are strategically integrated into your content."}
                </p>
              </div>

              <div className="bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-sky-600" />
                  <span className="font-medium text-slate-800 text-sm">{language === "de" ? "On-Page Optimierung" : "On-Page Optimization"}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {language === "de"
                    ? "Titel, Meta-Beschreibungen, Überschriften, Bildtexte – alles wird so optimiert, dass Google versteht, worum es auf deiner Seite geht. Technisch sauber, für Menschen lesbar."
                    : "Titles, meta descriptions, headings, image text – everything is optimized so Google understands what your page is about. Technically clean, readable for humans."}
                </p>
              </div>

              <div className="bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-sky-600" />
                  <span className="font-medium text-slate-800 text-sm">{language === "de" ? "Technisches SEO" : "Technical SEO"}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {language === "de"
                    ? "Ladezeiten optimieren, Mobile-Friendliness, XML-Sitemaps, strukturierte Daten (Schema.org), Core Web Vitals. Google belohnt schnelle, gut strukturierte Websites."
                    : "Optimize loading times, mobile-friendliness, XML sitemaps, structured data (Schema.org), Core Web Vitals. Google rewards fast, well-structured websites."}
                </p>
              </div>

              <div className="bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <PenTool className="w-4 h-4 text-sky-600" />
                  <span className="font-medium text-slate-800 text-sm">{language === "de" ? "Content-Erstellung" : "Content Creation"}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {language === "de"
                    ? "2 SEO-optimierte Blogartikel pro Monat: 'Die 5 häufigsten Fehler beim Segelschein', 'Warum das Stettiner Haff perfekt für Anfänger ist', etc. Bringt Traffic und baut Autorität auf."
                    : "2 SEO-optimized blog articles per month: 'The 5 most common mistakes when getting a sailing license', 'Why the Szczecin Lagoon is perfect for beginners', etc. Brings traffic and builds authority."}
                </p>
              </div>

              <div className="bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-sky-600" />
                  <span className="font-medium text-slate-800 text-sm">{language === "de" ? "Lokales SEO" : "Local SEO"}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {language === "de"
                    ? "Google Business Profile optimieren, lokale Verzeichnisse, Bewertungsmanagement. Wenn jemand in der Nähe sucht, erscheinst du ganz oben."
                    : "Optimize Google Business Profile, local directories, review management. When someone searches nearby, you appear at the top."}
                </p>
              </div>

              <div className="bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="w-4 h-4 text-sky-600" />
                  <span className="font-medium text-slate-800 text-sm">{language === "de" ? "Backlink-Aufbau (Basis)" : "Backlink Building (Basic)"}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {language === "de"
                    ? "Links von anderen Websites zu deiner Seite = Vertrauenssignal für Google. Wir bauen qualitative Verlinkungen auf (keine Spam-Links)."
                    : "Links from other websites to your page = trust signal for Google. We build quality links (no spam links)."}
                </p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h4 className="font-serif font-semibold text-slate-800 mb-3">{language === "de" ? "Zeitlicher Ablauf" : "Timeline"}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-sky-100 flex items-center justify-center text-sky-600 font-semibold">1</div>
                <div><span className="text-slate-800">{language === "de" ? "Monat 1:" : "Month 1:"}</span> <span className="text-slate-500">{language === "de" ? "Setup, Keyword-Recherche, technische Optimierung" : "Setup, keyword research, technical optimization"}</span></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-sky-100 flex items-center justify-center text-sky-600 font-semibold">2</div>
                <div><span className="text-slate-800">{language === "de" ? "Monat 2-3:" : "Month 2-3:"}</span> <span className="text-slate-500">{language === "de" ? "On-Page Optimierung, erste Inhalte, lokales SEO" : "On-page optimization, first content, local SEO"}</span></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-sky-100 flex items-center justify-center text-sky-600 font-semibold">3</div>
                <div><span className="text-slate-800">{language === "de" ? "Monat 4-6:" : "Month 4-6:"}</span> <span className="text-slate-500">{language === "de" ? "Erste Rankings sichtbar, kontinuierliche Optimierung" : "First rankings visible, continuous optimization"}</span></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-sky-100 flex items-center justify-center text-sky-600 font-semibold">✓</div>
                <div><span className="text-slate-800">{language === "de" ? "Ab Monat 6:" : "From Month 6:"}</span> <span className="text-slate-500">{language === "de" ? "Stabiler Traffic, messbare Buchungen" : "Stable traffic, measurable bookings"}</span></div>
              </div>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div>
            <h4 className="font-serif font-semibold text-slate-800 mb-3">{language === "de" ? "Kostenaufschlüsselung" : "Cost Breakdown"}</h4>
            <div className="bg-white p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === "de" ? "Setup (einmalig)" : "Setup (one-time)"}</span>
                  <span className="text-slate-800">{packages.seo.setupFee}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === "de" ? "Monatliche Betreuung" : "Monthly support"}</span>
                  <span className="text-slate-800">{packages.seo.monthlyPrice}€</span>
                </div>
                <div className="pt-2 border-t border-stone-200 flex justify-between">
                  <span className="text-slate-600">{language === "de" ? "Erstes Jahr gesamt" : "First year total"}</span>
                  <span className="text-sky-600 font-semibold">{(packages.seo.setupFee + packages.seo.monthlyPrice * 12).toLocaleString(language === "de" ? "de-DE" : "en-US")}€</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DetailModal>

      {/* GEO Detail Modal */}
      <DetailModal
        isOpen={activeModal === "geo"}
        onClose={() => setActiveModal(null)}
        title={language === "de" ? "GEO im Detail" : "GEO in Detail"}
        icon={<Bot className="w-6 h-6 text-stone-600" />}
      >
        <div className="space-y-6">
          {/* What is GEO */}
          <div>
            <h4 className="font-serif font-semibold text-slate-800 mb-2">{language === "de" ? "Was ist GEO?" : "What is GEO?"}</h4>
            <p className="text-slate-600 text-sm">
              {language === "de"
                ? "GEO (Generative Engine Optimization) ist die nächste Evolution nach SEO. Immer mehr Menschen fragen KI-Assistenten wie ChatGPT, Perplexity oder Claude: 'Wo kann ich in der Nähe von Berlin segeln lernen?' – und die KI empfiehlt Anbieter basierend auf verfügbaren Informationen."
                : "GEO (Generative Engine Optimization) is the next evolution after SEO. More and more people ask AI assistants like ChatGPT, Perplexity or Claude: 'Where can I learn to sail near Berlin?' – and the AI recommends providers based on available information."}
            </p>
          </div>

          {/* Why it matters */}
          <div className="bg-stone-100 border border-stone-300 p-4">
            <h4 className="font-semibold text-stone-600 mb-2">{language === "de" ? "Warum ist das wichtig?" : "Why is this important?"}</h4>
            <ul className="text-sm text-slate-600 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-stone-600 flex-shrink-0 mt-0.5" />
                <span>{language === "de" ? "30% der Gen Z nutzen TikTok/KI statt Google für Suchanfragen (Tendenz steigend)" : "30% of Gen Z use TikTok/AI instead of Google for searches (trend increasing)"}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-stone-600 flex-shrink-0 mt-0.5" />
                <span>{language === "de" ? "ChatGPT hat 200+ Millionen wöchentliche Nutzer" : "ChatGPT has 200+ million weekly users"}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-stone-600 flex-shrink-0 mt-0.5" />
                <span>{language === "de" ? "Wer jetzt optimiert, hat einen First-Mover-Vorteil" : "Those who optimize now have a first-mover advantage"}</span>
              </li>
            </ul>
          </div>

          {/* Technical Breakdown */}
          <div>
            <h4 className="font-serif font-semibold text-slate-800 mb-3">{language === "de" ? "Was wir technisch machen" : "What we do technically"}</h4>
            <div className="space-y-4">
              <div className="bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-stone-600" />
                  <span className="font-medium text-slate-800 text-sm">{language === "de" ? "Strukturierte Daten (Schema.org)" : "Structured Data (Schema.org)"}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {language === "de"
                    ? "Wir implementieren umfassende Schema-Markups: LocalBusiness, Course, Event, FAQPage, Review. Das hilft KI-Systemen, dein Angebot korrekt zu verstehen und einzuordnen."
                    : "We implement comprehensive schema markups: LocalBusiness, Course, Event, FAQPage, Review. This helps AI systems correctly understand and categorize your offering."}
                </p>
              </div>

              <div className="bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-stone-600" />
                  <span className="font-medium text-slate-800 text-sm">{language === "de" ? "FAQ-Optimierung" : "FAQ Optimization"}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {language === "de"
                    ? "Umfangreiche FAQ-Seiten mit natürlich formulierten Fragen und Antworten. KI-Systeme lieben gut strukturierte Q&A-Inhalte."
                    : "Comprehensive FAQ pages with naturally formulated questions and answers. AI systems love well-structured Q&A content."}
                </p>
              </div>

              <div className="bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <PenTool className="w-4 h-4 text-stone-600" />
                  <span className="font-medium text-slate-800 text-sm">{language === "de" ? "KI-optimierte Inhalte" : "AI-optimized Content"}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {language === "de"
                    ? "Texte, die sowohl für Menschen lesbar als auch für KI-Systeme gut parsebar sind. Klare Fakten, strukturierte Informationen, verifizierbare Details."
                    : "Text that is both human-readable and easily parseable by AI systems. Clear facts, structured information, verifiable details."}
                </p>
              </div>

              <div className="bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-stone-600" />
                  <span className="font-medium text-slate-800 text-sm">{language === "de" ? "Präsenz in KI-freundlichen Quellen" : "Presence in AI-friendly Sources"}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {language === "de"
                    ? "Wikipedia-artige Quellen, Branchenverzeichnisse, lokale Portale – überall dort, wo KI-Systeme ihre Informationen herziehen."
                    : "Wikipedia-like sources, industry directories, local portals – everywhere AI systems get their information from."}
                </p>
              </div>

              <div className="bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-stone-600" />
                  <span className="font-medium text-slate-800 text-sm">{language === "de" ? "KI-Sichtbarkeits-Monitoring" : "AI Visibility Monitoring"}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {language === "de"
                    ? "Wir tracken, ob und wie ChatGPT, Perplexity & Co. dein Business erwähnen. Monatliche Reports zeigen die Entwicklung."
                    : "We track if and how ChatGPT, Perplexity & Co. mention your business. Monthly reports show the progress."}
                </p>
              </div>
            </div>
          </div>

          {/* Example */}
          <div>
            <h4 className="font-serif font-semibold text-slate-800 mb-3">{language === "de" ? "Beispiel: Was passiert bei einer KI-Anfrage?" : "Example: What happens with an AI query?"}</h4>
            <div className="bg-white p-4">
              <div className="mb-3">
                <div className="text-xs text-stone-600 mb-1">{language === "de" ? "Nutzer fragt ChatGPT:" : "User asks ChatGPT:"}</div>
                <p className="text-sm text-slate-800 italic">{language === "de" ? "\"Wo kann ich in der Nähe von Berlin segeln lernen? Am liebsten in einer ruhigen Gegend.\"" : "\"Where can I learn to sail near Berlin? Preferably in a quiet area.\""}</p>
              </div>
              <div>
                <div className="text-xs text-sky-600 mb-1">{language === "de" ? "Optimierte Antwort könnte sein:" : "Optimized response could be:"}</div>
                <p className="text-sm text-slate-600">
                  {language === "de"
                    ? "\"Eine empfehlenswerte Option ist die Segelschule am Stettiner Haff. Sie bietet SBF-Binnen-Kurse auf einem Plattbodenschiff in einer besonders ruhigen, naturbelassenen Umgebung. Die Anfahrt von Berlin dauert etwa 2 Stunden...\""
                    : "\"A recommended option is the sailing school at the Szczecin Lagoon. They offer SBF inland courses on a flat-bottom boat in a particularly quiet, natural environment. The journey from Berlin takes about 2 hours...\""}
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div>
            <h4 className="font-serif font-semibold text-slate-800 mb-3">{language === "de" ? "Kostenaufschlüsselung" : "Cost Breakdown"}</h4>
            <div className="bg-white p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === "de" ? "Setup (einmalig)" : "Setup (one-time)"}</span>
                  <span className="text-slate-800">{packages.geo.setupFee}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === "de" ? "Monatliche Betreuung" : "Monthly support"}</span>
                  <span className="text-slate-800">{packages.geo.monthlyPrice}€</span>
                </div>
                <div className="pt-2 border-t border-stone-200 flex justify-between">
                  <span className="text-slate-600">{language === "de" ? "Erstes Jahr gesamt" : "First year total"}</span>
                  <span className="text-stone-600 font-semibold">{(packages.geo.setupFee + packages.geo.monthlyPrice * 12).toLocaleString(language === "de" ? "de-DE" : "en-US")}€</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DetailModal>

      {/* Ads Detail Modal */}
      <DetailModal
        isOpen={activeModal === "ads"}
        onClose={() => setActiveModal(null)}
        title={language === "de" ? "Bezahlte Werbung im Detail" : "Paid Advertising in Detail"}
        icon={<Target className="w-6 h-6 text-amber-600" />}
      >
        <div className="space-y-6">
          {/* What are Ads */}
          <div>
            <h4 className="font-serif font-semibold text-slate-800 mb-2">
              {language === "de" ? "Was ist bezahlte Werbung?" : "What is Paid Advertising?"}
            </h4>
            <p className="text-slate-600 text-sm">
              {language === "de"
                ? "Mit bezahlter Werbung (Paid Ads) schaltest du Anzeigen auf Plattformen wie Facebook, Instagram und Google. Du zahlst pro Klick oder Impression und erreichst sofort deine Zielgruppe."
                : "With paid advertising (Paid Ads), you place ads on platforms like Facebook, Instagram, and Google. You pay per click or impression and immediately reach your target audience."}
            </p>
          </div>

          {/* Platforms */}
          <div>
            <h4 className="font-serif font-semibold text-slate-800 mb-3">
              {language === "de" ? "Plattformen & Einsatzbereiche" : "Platforms & Use Cases"}
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-slate-800 text-xs font-bold">f</div>
                  <span className="font-medium text-slate-800 text-sm">Facebook & Instagram</span>
                </div>
                <p className="text-xs text-slate-500">
                  {language === "de"
                    ? "Ideal für: Emotionale Ansprache, Lifestyle-Content, Reichweite. Gut für Haff Erleben (Urlaubsgefühl) und Segelschule (Abenteuer)."
                    : "Ideal for: Emotional appeal, lifestyle content, reach. Great for Experience Haff (vacation feeling) and Sailing School (adventure)."}
                </p>
              </div>

              <div className="bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center text-slate-800 text-xs font-bold">G</div>
                  <span className="font-medium text-slate-800 text-sm">Google Ads</span>
                </div>
                <p className="text-xs text-slate-500">
                  {language === "de"
                    ? "Ideal für: Nutzer mit konkreter Suchintention. 'SBF Kurs buchen', 'Ferienwohnung Stettiner Haff'."
                    : "Ideal for: Users with specific search intent. 'Book sailing course', 'Vacation rental Szczecin Lagoon'."}
                </p>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div>
            <h4 className="font-serif font-semibold text-slate-800 mb-3">
              {language === "de" ? "Wie es funktioniert" : "How It Works"}
            </h4>
            <div className="space-y-4">
              <div className="bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span className="font-medium text-slate-800 text-sm">
                    {language === "de" ? "Zielgruppen-Targeting" : "Audience Targeting"}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {language === "de"
                    ? "Wir definieren genau, wer deine Anzeigen sieht: Alter, Interessen (Segeln, Wassersport, Natururlaub), Standort (z.B. Berlin, Hamburg), Verhalten (kürzlich nach Segelkursen gesucht)."
                    : "We define exactly who sees your ads: age, interests (sailing, water sports, nature vacations), location (e.g., Berlin, Hamburg), behavior (recently searched for sailing courses)."}
                </p>
              </div>

              <div className="bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <PenTool className="w-4 h-4 text-amber-600" />
                  <span className="font-medium text-slate-800 text-sm">
                    {language === "de" ? "Anzeigen-Erstellung" : "Ad Creation"}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {language === "de"
                    ? "Wir erstellen ansprechende Anzeigen: Texte, Bilder, Videos. Mehrere Varianten zum Testen, was am besten funktioniert."
                    : "We create compelling ads: text, images, videos. Multiple variants to test what works best."}
                </p>
              </div>

              <div className="bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart2 className="w-4 h-4 text-amber-600" />
                  <span className="font-medium text-slate-800 text-sm">
                    {language === "de" ? "Optimierung & Reporting" : "Optimization & Reporting"}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {language === "de"
                    ? "Wöchentliche Anpassungen basierend auf Performance. Monatliche Reports mit allen wichtigen Zahlen: Klicks, Kosten, Buchungen, ROI."
                    : "Weekly adjustments based on performance. Monthly reports with all key metrics: clicks, costs, bookings, ROI."}
                </p>
              </div>
            </div>
          </div>

          {/* Example Calculation */}
          <div>
            <h4 className="font-serif font-semibold text-slate-800 mb-3">
              {language === "de" ? "Beispielrechnung" : "Example Calculation"}
            </h4>
            <div className="bg-white p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === "de" ? "Monatliches Budget" : "Monthly Budget"}</span>
                  <span className="text-slate-800">400€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === "de" ? "Ø Kosten pro Klick" : "Avg. Cost per Click"}</span>
                  <span className="text-slate-800">{language === "de" ? "0,80€" : "€0.80"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === "de" ? "= Klicks pro Monat" : "= Clicks per Month"}</span>
                  <span className="text-amber-600">~500</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === "de" ? "Ø Conversion Rate" : "Avg. Conversion Rate"}</span>
                  <span className="text-slate-800">3%</span>
                </div>
                <div className="pt-2 border-t border-stone-200 flex justify-between">
                  <span className="text-slate-600">{language === "de" ? "= Buchungen pro Monat" : "= Bookings per Month"}</span>
                  <span className="text-sky-600 font-semibold">~15</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div>
            <h4 className="font-serif font-semibold text-slate-800 mb-3">
              {language === "de" ? "Kostenaufschlüsselung" : "Cost Breakdown"}
            </h4>
            <div className="bg-white p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === "de" ? "Setup (einmalig)" : "Setup (one-time)"}</span>
                  <span className="text-slate-800">{packages.ads.setupFee}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === "de" ? "Werbebudget (dein Wert oben)" : "Ad Budget (your value above)"}</span>
                  <span className="text-slate-800">{customParams.adsMonthlyBudget}€/{language === "de" ? "Mo" : "mo"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === "de" ? "Management-Fee" : "Management Fee"}</span>
                  <span className="text-slate-800">{packages.ads.managementFee}€/{language === "de" ? "Mo" : "mo"}</span>
                </div>
                <div className="pt-2 border-t border-stone-200 flex justify-between">
                  <span className="text-slate-600">{language === "de" ? "Erstes Jahr gesamt" : "First Year Total"}</span>
                  <span className="text-amber-600 font-semibold">
                    {(packages.ads.setupFee + (customParams.adsMonthlyBudget + packages.ads.managementFee) * 12).toLocaleString(language === "de" ? "de-DE" : "en-US")}€
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                {language === "de"
                  ? "* Das Werbebudget geht direkt an die Plattform (Facebook/Google). Die Management-Fee ist unsere Leistung."
                  : "* The ad budget goes directly to the platform (Facebook/Google). The management fee is our service."}
              </p>
            </div>
          </div>
        </div>
      </DetailModal>
    </div>
  );
}

// ============================================
// PRICING SECTION - 3 Options
// ============================================

function PricingSection() {
  const { language } = useLanguage();
  const [selectedOption, setSelectedOption] = useState<string>("combined");

  const options: PricingOption[] = [
    {
      id: "segelschule",
      title: language === "de" ? "Segelschule" : "Sailing School",
      subtitle: language === "de" ? "Fokussierter Start" : "Focused Start",
      price: 8500,
      features: language === "de" ? [
        "Brand Identity (Logo, Farben, Schriften)",
        "Responsive Website (Mobile-first)",
        "Buchungssystem mit Kalender",
        "Automatische Rechnungsstellung",
        "E-Mail-Benachrichtigungen",
        "4 Sprachen (DE, EN, NL, CH)",
        "SEO-Grundstruktur*",
        "1 Jahr Hosting inklusive",
        "90 Tage Support nach Launch",
      ] : [
        "Brand Identity (Logo, Colors, Fonts)",
        "Responsive Website (Mobile-first)",
        "Booking System with Calendar",
        "Automatic Invoicing",
        "Email Notifications",
        "4 Languages (DE, EN, NL, CH)",
        "Basic SEO Structure*",
        "1 Year Hosting Included",
        "90 Days Support After Launch",
      ],
    },
    {
      id: "haus",
      title: language === "de" ? "Haff Erleben" : "Experience Haff",
      subtitle: language === "de" ? "Das Haus mit Angeboten" : "The House with Offerings",
      price: 8500,
      features: language === "de" ? [
        "Brand Identity (Logo, Farben, Schriften)",
        "Responsive Website (Mobile-first)",
        "Buchungssystem für Übernachtungen",
        "Automatische Rechnungsstellung",
        "E-Mail-Benachrichtigungen",
        "4 Sprachen (DE, EN, NL, CH)",
        "SEO-Grundstruktur*",
        "1 Jahr Hosting inklusive",
        "90 Tage Support nach Launch",
      ] : [
        "Brand Identity (Logo, Colors, Fonts)",
        "Responsive Website (Mobile-first)",
        "Booking System for Accommodations",
        "Automatic Invoicing",
        "Email Notifications",
        "4 Languages (DE, EN, NL, CH)",
        "Basic SEO Structure*",
        "1 Year Hosting Included",
        "90 Days Support After Launch",
      ],
    },
    {
      id: "combined",
      title: language === "de" ? "Komplett-Paket" : "Complete Package",
      subtitle: language === "de" ? "Segelschule + Haff Erleben" : "Sailing School + Experience Haff",
      price: 15000,
      originalPrice: 17000,
      savings: 2000,
      highlighted: true,
      badge: language === "de" ? "Empfohlen" : "Recommended",
      features: language === "de" ? [
        "Alles aus beiden Einzelpaketen",
        "Gemeinsames Buchungssystem",
        "Cross-Selling Features",
        "Paket-Buchungen (Segeln + Übernachtung)",
        "Einheitliches Brand-System",
        "Erweiterte Analytics",
        "Prioritäts-Support",
        "Strategieberatung (2h)",
      ] : [
        "Everything from Both Individual Packages",
        "Shared Booking System",
        "Cross-Selling Features",
        "Package Bookings (Sailing + Accommodation)",
        "Unified Brand System",
        "Extended Analytics",
        "Priority Support",
        "Strategy Consultation (2h)",
      ],
    },
  ];

  return (
    <div>
      <div className="grid md:grid-cols-3 gap-6">
        {options.map((option) => (
          <div
            key={option.id}
            onClick={() => setSelectedOption(option.id)}
            className={`relative cursor-pointer p-6 transition-all duration-300 ${
              option.highlighted
                ? "bg-sky-50 border-2 border-sky-300"
                : "bg-white border border-stone-200 hover:border-slate-300"
            } ${selectedOption === option.id ? "ring-2 ring-sky-400 ring-offset-2 ring-offset-white" : ""}`}
          >
            {option.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sky-600 text-white text-xs font-semibold px-4 py-1">
                {option.badge}
              </div>
            )}

            <div className="text-center mb-6">
              <div className="mb-3">
                {option.id === "segelschule" ? <Ship className="w-8 h-8 mx-auto text-sky-600" /> :
                 option.id === "haus" ? <Home className="w-8 h-8 mx-auto text-sky-600" /> :
                 <Sparkles className="w-8 h-8 mx-auto text-sky-600" />}
              </div>
              <h3 className="text-xl font-serif font-bold text-slate-800">{option.title}</h3>
              <p className="text-slate-500 text-sm">{option.subtitle}</p>
            </div>

            <div className="text-center mb-6">
              {option.originalPrice && (
                <div className="text-slate-500 line-through text-lg">
                  {option.originalPrice.toLocaleString("de-DE")}€
                </div>
              )}
              <div className="text-3xl md:text-4xl font-serif font-bold text-slate-800">
                {option.price.toLocaleString("de-DE")}€
              </div>
              {option.savings && (
                <div className="text-sky-600 text-sm mt-1">
                  {language === "de" ? "Du sparst" : "You save"} {option.savings.toLocaleString(language === "de" ? "de-DE" : "en-US")}€
                </div>
              )}
            </div>

            <ul className="space-y-3">
              {option.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600 text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 pt-6 border-t border-stone-200">
              <div className={`w-full py-3 text-center font-semibold transition-all ${
                selectedOption === option.id
                  ? "bg-sky-700 text-white shadow-lg shadow-sky-900/20"
                  : "bg-white text-slate-600 border border-stone-200 hover:border-sky-300"
              }`}>
                {selectedOption === option.id
                  ? (language === "de" ? "Ausgewählt" : "Selected")
                  : (language === "de" ? "Auswählen" : "Select")}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Clarification */}
      <div className="mt-6 p-4 bg-stone-50 border border-stone-200">
        <p className="text-sm text-slate-500">
          <span className="text-slate-800">{language === "de" ? "*SEO-Grundstruktur:" : "*Basic SEO Structure:"}</span> {language === "de"
            ? "Die Website wird technisch SEO-optimiert gebaut (schnelle Ladezeiten, sauberer Code, Meta-Tags, strukturierte Daten). Laufende SEO-Arbeit (Content, Backlinks, Monitoring) ist eine separate Leistung."
            : "The website is built technically SEO-optimized (fast load times, clean code, meta tags, structured data). Ongoing SEO work (content, backlinks, monitoring) is a separate service."}
        </p>
      </div>
    </div>
  );
}

// ============================================
// TIMELINE SECTION
// ============================================

function TimelineSection() {
  const { language } = useLanguage();

  const segelschuleMilestones: Milestone[] = language === "de" ? [
    {
      week: "Woche 1",
      title: "Discovery & Brand",
      description: "Wir tauchen ein in deine Vision für die Segelschule.",
      deliverables: [
        "Kick-off Workshop (online)",
        "Markenanalyse & Positionierung",
        "Logo-Entwürfe (3 Varianten)",
        "Farbpalette & Typografie",
      ],
    },
    {
      week: "Woche 2-3",
      title: "Design & Struktur",
      description: "Die visuelle Welt der Segelschule nimmt Form an.",
      deliverables: [
        "Wireframes aller Seiten",
        "Mobile-first Designs",
        "Bildsprache & Fotoselektion",
        "Content-Struktur für Kurse",
      ],
    },
    {
      week: "Woche 3-4",
      title: "Entwicklung",
      description: "Code wird geschrieben, Buchungssystem entsteht.",
      deliverables: [
        "Website-Entwicklung",
        "Kursbuchungssystem",
        "Rechnungssystem (B2C & B2B)",
        "E-Mail-Automatisierung (Vorher/Nachher)",
      ],
    },
    {
      week: "Woche 5",
      title: "Content & Feinschliff",
      description: "Texte, Bilder, Details.",
      deliverables: [
        "Content-Einpflege",
        "SEO-Grundoptimierung",
        "Mehrsprachigkeit (DE, EN, NL)",
        "Performance-Tuning",
      ],
    },
    {
      week: "Woche 6",
      title: "Launch Segelschule",
      description: "Die Segelschule geht live.",
      deliverables: [
        "Finaler Test",
        "DNS-Umstellung",
        "Go-Live Segelschule",
        "Übergabe & Einweisung",
      ],
    },
  ] : [
    {
      week: "Week 1",
      title: "Discovery & Brand",
      description: "We dive into your vision for the sailing school.",
      deliverables: [
        "Kick-off Workshop (online)",
        "Brand Analysis & Positioning",
        "Logo Drafts (3 variants)",
        "Color Palette & Typography",
      ],
    },
    {
      week: "Week 2-3",
      title: "Design & Structure",
      description: "The visual world of the sailing school takes shape.",
      deliverables: [
        "Wireframes of all pages",
        "Mobile-first Designs",
        "Visual language & Photo selection",
        "Content structure for courses",
      ],
    },
    {
      week: "Week 3-4",
      title: "Development",
      description: "Code is written, booking system is created.",
      deliverables: [
        "Website Development",
        "Course Booking System",
        "Invoicing System (B2C & B2B)",
        "Email Automation (Before/After)",
      ],
    },
    {
      week: "Week 5",
      title: "Content & Polish",
      description: "Texts, images, details.",
      deliverables: [
        "Content Integration",
        "Basic SEO Optimization",
        "Multilingual (DE, EN, NL)",
        "Performance Tuning",
      ],
    },
    {
      week: "Week 6",
      title: "Launch Sailing School",
      description: "The sailing school goes live.",
      deliverables: [
        "Final Testing",
        "DNS Migration",
        "Go-Live Sailing School",
        "Handover & Training",
      ],
    },
  ];

  const hausMilestones: Milestone[] = language === "de" ? [
    {
      week: "Woche 7",
      title: "Haus-Konzept",
      description: "Das Haus als Ort der Offenheit digital übersetzen.",
      deliverables: [
        "Konzept-Workshop Haus & Walking",
        "Design-Adaption für Haus-Website",
        "Bildsprache: Stille & Ankommen",
        "Axinjas Walking-Angebot integrieren",
      ],
    },
    {
      week: "Woche 8-9",
      title: "Design & Entwicklung",
      description: "Die Haus-Präsenz entsteht.",
      deliverables: [
        "Haus-spezifische Seiten",
        "Unterkunft-Buchungssystem",
        "Walking-Buchungsintegration",
        "Cross-Selling Segelschule ↔ Haus",
      ],
    },
    {
      week: "Woche 10",
      title: "Ökosystem-Verbindung",
      description: "Segelschule und Haus werden vernetzt.",
      deliverables: [
        "Paket-Buchungen (Segeln + Übernachtung)",
        "Intelligente Empfehlungen",
        "Gemeinsame Newsletter-Automatisierung",
        "Digital Concierge Setup",
      ],
    },
    {
      week: "Woche 11",
      title: "Content & Walking",
      description: "Inhalte und Walking-Bereich fertigstellen.",
      deliverables: [
        "Haus-Content einpflegen",
        "Walking-Beschreibungen & Buchung",
        "Geheimtipps für Gäste",
        "Mehrsprachigkeit",
      ],
    },
    {
      week: "Woche 12",
      title: "Launch Haus",
      description: "Das Haus geht live – das Ökosystem ist komplett.",
      deliverables: [
        "Finaler Test Gesamtsystem",
        "Go-Live Haus",
        "Cross-Selling aktivieren",
        "Übergabe & Schulung",
      ],
    },
  ] : [
    {
      week: "Week 7",
      title: "House Concept",
      description: "Digitally translate the house as a place of openness.",
      deliverables: [
        "Concept Workshop House & Walking",
        "Design Adaptation for House Website",
        "Visual Language: Silence & Arrival",
        "Integrate Axinja's Walking Offering",
      ],
    },
    {
      week: "Week 8-9",
      title: "Design & Development",
      description: "The house presence is created.",
      deliverables: [
        "House-specific Pages",
        "Accommodation Booking System",
        "Walking Booking Integration",
        "Cross-Selling Sailing School ↔ House",
      ],
    },
    {
      week: "Week 10",
      title: "Ecosystem Connection",
      description: "Sailing school and house are networked.",
      deliverables: [
        "Package Bookings (Sailing + Accommodation)",
        "Smart Recommendations",
        "Shared Newsletter Automation",
        "Digital Concierge Setup",
      ],
    },
    {
      week: "Week 11",
      title: "Content & Walking",
      description: "Finalize content and walking section.",
      deliverables: [
        "House Content Integration",
        "Walking Descriptions & Booking",
        "Insider Tips for Guests",
        "Multilingual",
      ],
    },
    {
      week: "Week 12",
      title: "Launch House",
      description: "The house goes live – the ecosystem is complete.",
      deliverables: [
        "Final Test Complete System",
        "Go-Live House",
        "Activate Cross-Selling",
        "Handover & Training",
      ],
    },
  ];

  return (
    <div className="relative">
      {/* Phase 1: Segelschule */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="text-sky-600">
            <Ship className="w-6 h-6 text-sky-600" />
          </div>
          <div>
            <h3 className="text-xl font-serif font-bold text-slate-800">{language === "de" ? "Phase 1: Segelschule" : "Phase 1: Sailing School"}</h3>
            <p className="text-sm text-slate-500">{language === "de" ? "Woche 1-6" : "Week 1-6"}</p>
          </div>
        </div>

        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-stone-300 -translate-x-1/2" />

          <div className="space-y-8">
            {segelschuleMilestones.map((milestone, idx) => (
              <div
                key={idx}
                className={`relative flex flex-col md:flex-row gap-4 md:gap-8 ${
                  idx % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Simple Dot */}
                <div className="absolute left-4 md:left-1/2 -translate-x-1/2 z-10 w-3 h-3 bg-sky-600" />

                {/* Content */}
                <div className={`ml-10 md:ml-0 md:w-1/2 ${idx % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"}`}>
                  <div className="bg-white p-5 shadow-md">
                    <div className="text-sky-600 text-sm font-semibold mb-1">{milestone.week}</div>
                    <h4 className="text-lg font-serif font-bold text-slate-800 mb-2">{milestone.title}</h4>
                    <p className="text-slate-500 text-sm mb-4">{milestone.description}</p>
                    <ul className={`space-y-2 ${idx % 2 === 0 ? "md:text-right" : ""}`}>
                      {milestone.deliverables.map((item, i) => (
                        <li key={i} className={`flex items-center gap-2 text-sm text-slate-600 ${idx % 2 === 0 ? "md:flex-row-reverse" : ""}`}>
                          <CheckCircle2 className="w-4 h-4 text-sky-600 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="relative flex items-center justify-center my-12">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-stone-200" />
        </div>
        <div className="relative px-4 py-2 bg-white border border-stone-200">
          <span className="text-sm text-slate-500">{language === "de" ? "Segelschule live" : "Sailing School Live"}</span>
          <CheckCircle2 className="w-4 h-4 text-sky-600 inline-block ml-2" />
        </div>
      </div>

      {/* Phase 2: Haus */}
      <div className="mt-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="text-stone-600">
            <Home className="w-6 h-6 text-stone-600" />
          </div>
          <div>
            <h3 className="text-xl font-serif font-bold text-slate-800">{language === "de" ? "Phase 2: Haus & Walking" : "Phase 2: House & Walking"}</h3>
            <p className="text-sm text-slate-500">{language === "de" ? "Woche 7-12" : "Week 7-12"}</p>
          </div>
        </div>

        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-stone-300 -translate-x-1/2" />

          <div className="space-y-8">
            {hausMilestones.map((milestone, idx) => (
              <div
                key={idx}
                className={`relative flex flex-col md:flex-row gap-4 md:gap-8 ${
                  idx % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Simple Dot */}
                <div className="absolute left-4 md:left-1/2 -translate-x-1/2 z-10 w-3 h-3 bg-stone-500" />

                {/* Content */}
                <div className={`ml-10 md:ml-0 md:w-1/2 ${idx % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"}`}>
                  <div className="bg-white p-5 shadow-md">
                    <div className="text-stone-600 text-sm font-semibold mb-1">{milestone.week}</div>
                    <h4 className="text-lg font-serif font-bold text-slate-800 mb-2">{milestone.title}</h4>
                    <p className="text-slate-500 text-sm mb-4">{milestone.description}</p>
                    <ul className={`space-y-2 ${idx % 2 === 0 ? "md:text-right" : ""}`}>
                      {milestone.deliverables.map((item, i) => (
                        <li key={i} className={`flex items-center gap-2 text-sm text-slate-600 ${idx % 2 === 0 ? "md:flex-row-reverse" : ""}`}>
                          <CheckCircle2 className="w-4 h-4 text-sky-600 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Final Divider */}
      <div className="relative flex items-center justify-center mt-12">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-stone-200" />
        </div>
        <div className="relative px-4 py-2 bg-sky-50 border border-sky-200 shadow-sm">
          <span className="text-sm text-slate-700 font-semibold">{language === "de" ? "Ökosystem komplett" : "Ecosystem Complete"}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// DELIVERABLES SECTION
// ============================================

function DeliverablesSection() {
  const { language } = useLanguage();

  const categories = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Brand Identity",
      items: language === "de" ? [
        "Logo in allen Formaten (Web, Print, Social)",
        "Farbpalette mit Hex-Codes",
        "Typografie-System",
        "Brand Guidelines PDF",
      ] : [
        "Logo in all formats (Web, Print, Social)",
        "Color palette with hex codes",
        "Typography system",
        "Brand Guidelines PDF",
      ],
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Website",
      items: language === "de" ? [
        "Mobile-first, responsive Design",
        "Schnelle Ladezeiten (<2s)",
        "4 Sprachen (DE, EN, NL, CH)",
        "SEO-optimierte Struktur",
        "DSGVO-konform",
      ] : [
        "Mobile-first, responsive design",
        "Fast loading times (<2s)",
        "4 languages (DE, EN, NL, CH)",
        "SEO-optimized structure",
        "GDPR compliant",
      ],
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: language === "de" ? "Buchungssystem" : "Booking System",
      items: language === "de" ? [
        "Online-Kalender mit Verfügbarkeit",
        "Automatische Buchungsbestätigung",
        "Erinnerungs-E-Mails",
        "Admin-Dashboard",
      ] : [
        "Online calendar with availability",
        "Automatic booking confirmation",
        "Reminder emails",
        "Admin dashboard",
      ],
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: language === "de" ? "Rechnungen" : "Invoices",
      items: language === "de" ? [
        "Automatische Rechnungserstellung",
        "Gebrandete PDF-Rechnungen",
        "B2B und B2C Formate",
        "Steuernummer & USt-ID",
      ] : [
        "Automatic invoice generation",
        "Branded PDF invoices",
        "B2B and B2C formats",
        "Tax number & VAT ID",
      ],
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: language === "de" ? "E-Mail-System" : "Email System",
      items: language === "de" ? [
        "Buchungsbestätigung (gebrandet)",
        "Kurs-Erinnerungen",
        "Interne Benachrichtigungen",
        "Anpassbare Vorlagen",
      ] : [
        "Booking confirmation (branded)",
        "Course reminders",
        "Internal notifications",
        "Customizable templates",
      ],
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Support & Hosting",
      items: language === "de" ? [
        "1 Jahr Hosting inklusive",
        "90 Tage Support nach Launch",
        "SSL-Zertifikat",
        "Regelmäßige Backups",
      ] : [
        "1 year hosting included",
        "90 days support after launch",
        "SSL certificate",
        "Regular backups",
      ],
    },
  ];

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {categories.map((category, idx) => (
        <div
          key={idx}
          className="bg-white backdrop-blur-sm p-6 shadow-md hover:border-sky-500/50 transition-colors"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="text-sky-600">
              {category.icon}
            </div>
            <h4 className="font-serif font-semibold text-slate-800">{category.title}</h4>
          </div>
          <ul className="space-y-2">
            {category.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ============================================
// VIDEO SECTION
// ============================================

function VideoSection({ videoId }: { videoId?: string }) {
  const { language } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);

  if (!videoId) {
    return (
      <div className="aspect-video bg-white flex items-center justify-center border border-stone-200">
        <div className="text-center">
          <Play className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500">{language === "de" ? "Video kommt bald..." : "Video coming soon..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="aspect-video relative overflow-hidden">
      {!isPlaying ? (
        <div
          onClick={() => setIsPlaying(true)}
          className="absolute inset-0 bg-white cursor-pointer group"
        >
          <img
            src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
            alt="Video thumbnail"
            className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-sky-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play className="w-8 h-8 text-slate-800 ml-1" />
            </div>
          </div>
        </div>
      ) : (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&vq=hd1080&hd=1&rel=0&modestbranding=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      )}
    </div>
  );
}

// ============================================
// TEMPLATE PROPS INTERFACE
// ============================================

interface ProjectPageConfig {
  projectId: string;
  organizationId: string;
  name: string;
  description?: string;
  theme: string;
  template: string;
  logoUrl?: string;
}

interface GerritTemplateProps {
  config: ProjectPageConfig;
  slug: string;
}

// ============================================
// MAIN PAGE COMPONENT (Inner - uses language context)
// ============================================

function GerritOfferPageInner({ config }: { config: ProjectPageConfig }) {
  // Language
  const { language } = useLanguage();

  // Create ProjectDrawer config from the page config
  const projectDrawerConfig: ProjectDrawerConfig = {
    organizationId: config.organizationId as Id<"organizations">,
    projectId: config.projectId as Id<"objects">,
    theme: "blue", // Match the maritime theme
    drawerTitle: "Projekt-Meetings",
  };

  // YouTube video ID for the proposal walkthrough
  const youtubeVideoId = "ucENnHjFeWE";

  // Password protection state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  // Sound effect refs for door opening
  const wavesAudioRef = useRef<HTMLAudioElement>(null);
  const seagullAudioRef = useRef<HTMLAudioElement>(null);

  // The password - "haff" - simple, fitting, related to the location
  const correctPassword = "haffleben";

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.toLowerCase() === correctPassword) {
      setPasswordError(false);
      setIsOpening(true);

      // Play sound effects when doors open
      if (wavesAudioRef.current) {
        wavesAudioRef.current.volume = 0.4;
        wavesAudioRef.current.play().catch(() => {});
      }
      setTimeout(() => {
        if (seagullAudioRef.current) {
          seagullAudioRef.current.volume = 0.3;
          seagullAudioRef.current.play().catch(() => {});
        }
      }, 800);

      // Delay the unlock to show the door opening animation (slower for dramatic effect)
      setTimeout(() => {
        setIsUnlocked(true);
      }, 2500);
    } else {
      setPasswordError(true);
      setPassword("");
    }
  };

  return (
    <Suspense fallback={<div className="min-h-screen bg-sky-50" />}>
      <ProjectDrawerProvider config={projectDrawerConfig}>
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-stone-50">
      {/* Sound effects for door opening - place your audio files in /public */}
      <audio ref={wavesAudioRef} src="/sounds/waves.mp3" preload="auto" />
      <audio ref={seagullAudioRef} src="/sounds/seagull.mp3" preload="auto" />

      {/* Password Modal Overlay - Light Maritime Style */}
      {!isUnlocked && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-[2500ms] ${isOpening ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
          {/* Background - Soft sky and sea gradient */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-sky-100 to-blue-50" />
            {/* Horizon line */}
            <div className="absolute top-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />
            {/* Gentle water reflection */}
            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-sky-200/50 to-transparent" />
          </div>

          {/* Door Opening Animation - Clean blue doors */}
          <div className={`absolute inset-0 flex transition-all duration-[2500ms] ease-out ${isOpening ? "scale-110 opacity-0" : ""}`}>
            {/* Left Door */}
            <div className={`w-1/2 h-full bg-gradient-to-b from-sky-100 via-sky-50 to-white border-r border-sky-200 transition-transform duration-[2500ms] ease-out origin-left shadow-xl ${isOpening ? "-translate-x-full" : ""}`}>
              {/* Subtle wave pattern */}
              <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='40' viewBox='0 0 80 40'%3E%3Cpath d='M0 20 Q20 10 40 20 T80 20' fill='none' stroke='%230369a1' stroke-width='1.5'/%3E%3Cpath d='M0 30 Q20 20 40 30 T80 30' fill='none' stroke='%230369a1' stroke-width='1'/%3E%3C/svg%3E")`, backgroundSize: '80px 40px' }} />
            </div>
            {/* Right Door */}
            <div className={`w-1/2 h-full bg-gradient-to-b from-sky-100 via-sky-50 to-white border-l border-sky-200 transition-transform duration-[2500ms] ease-out origin-right shadow-xl ${isOpening ? "translate-x-full" : ""}`}>
              <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='40' viewBox='0 0 80 40'%3E%3Cpath d='M0 20 Q20 10 40 20 T80 20' fill='none' stroke='%230369a1' stroke-width='1.5'/%3E%3Cpath d='M0 30 Q20 20 40 30 T80 30' fill='none' stroke='%230369a1' stroke-width='1'/%3E%3C/svg%3E")`, backgroundSize: '80px 40px' }} />
            </div>
          </div>

          {/* Password Form - Clean maritime card */}
          <div className={`relative z-10 max-w-md w-full mx-4 transition-all duration-500 ${isOpening ? "scale-90 opacity-0" : ""}`}>
            <div className="bg-white/95 backdrop-blur-sm p-8 border border-sky-100 shadow-2xl shadow-sky-900/10">
              {/* Anchor Icon */}
              <div className="flex justify-center mb-6">
                <Anchor className="w-10 h-10 text-sky-700" />
              </div>

              {/* Title */}
              <h1 className="text-2xl font-serif font-bold text-slate-800 text-center mb-2">
                {t("passwordModal.welcome", language)}
              </h1>
              <p className="text-slate-500 text-center mb-6">
                {t("passwordModal.subtitle", language)}
              </p>

              {/* Password Form */}
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm text-slate-600 mb-2">
                    {t("passwordModal.passwordLabel", language)}
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError(false);
                    }}
                    placeholder="••••"
                    className={`w-full px-4 py-3 bg-sky-50/50 border text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                      passwordError
                        ? "border-red-400 focus:ring-red-400/50"
                        : "border-sky-200 focus:ring-sky-400/50 focus:border-sky-400"
                    }`}
                    autoFocus
                  />
                  {passwordError && (
                    <p className="mt-2 text-sm text-rose-600 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {t("passwordModal.wrongPassword", language)}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-sky-700 text-white font-semibold hover:bg-sky-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-900/20 shimmer-button"
                >
                  <Ship className="w-5 h-5" />
                  {t("passwordModal.submitButton", language)}
                </button>
              </form>

              {/* Hint */}
              <p className="mt-6 text-center text-slate-500 text-sm">
                <Wind className="w-4 h-4 inline mr-1 text-sky-400" />
                <span className="text-slate-600">{t("passwordModal.hintLabel", language)}</span> {t("passwordModal.hint", language)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - with blur when locked */}
      <div className={`transition-all duration-1000 ${!isUnlocked && !isOpening ? "blur-lg scale-105 pointer-events-none" : ""}`}>

      {/* Header - Clean light maritime style */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-sky-100 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-sky-600">
              <Anchor className="w-6 h-6 text-sky-700" />
            </div>
            <span className="font-serif font-bold text-slate-800">l4yercak3</span>
          </div>
          <div className="flex items-center gap-4">
            <LanguageToggle />
            <a href="mailto:remington@l4yercak3.com?subject=Angebot%20Segelschule%20-%20Gerrit" className="text-slate-500 hover:text-sky-700 transition-colors hidden sm:block" title={language === "de" ? "E-Mail senden" : "Send email"}>
              <Mail className="w-5 h-5" />
            </a>
            <a href="tel:+4915140427103" className="text-slate-500 hover:text-sky-700 transition-colors hidden sm:block" title={language === "de" ? "Anrufen" : "Call"}>
              <Phone className="w-5 h-5" />
            </a>
            <a href="https://cal.com/voundbrand/open-end-meeting" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-sky-700 transition-colors" title={language === "de" ? "Termin buchen" : "Book appointment"}>
              <Calendar className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-16">
        {/* ============================================ */}
        {/* STORYBRAND FLOW - Light Maritime Style */}
        {/* ============================================ */}

        {/* 1. HERO - The Hook */}
        <section className="py-20 md:py-32 px-4 relative overflow-hidden">
          {/* Hero background with soft gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-sky-100/50 via-white to-white" />

          <div className="max-w-4xl mx-auto text-center relative">
            <div className="inline-flex items-center gap-2 text-sky-700 mb-8">
              <Ship className="w-4 h-4 text-sky-600" />
              <span className="text-sky-700 text-sm font-medium">{t("hero.badge", language)}</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-serif font-bold text-slate-800 mb-6 leading-tight">
              <EditableText
                blockId="hero.title"
                defaultValue={t("hero.title", language)}
                as="span"
                sectionId="hero"
              />
              <span className="block text-sky-700 mt-2">
                <EditableText
                  blockId="hero.highlight"
                  defaultValue={t("hero.titleHighlight", language)}
                  as="span"
                  sectionId="hero"
                />
              </span>
            </h1>

            <EditableMultilineText
              blockId="hero.description"
              defaultValue={t("hero.description", language)}
              as="p"
              className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed"
              sectionId="hero"
            />

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#video"
                className="inline-flex items-center gap-2 bg-sky-700 text-white font-semibold px-8 py-4 hover:bg-sky-600 transition-colors shadow-lg shadow-sky-900/20 shimmer-button"
              >
                <Play className="w-5 h-5" />
                {language === "de" ? "Video ansehen" : "Watch video"}
              </a>
              <a
                href="#angebot"
                className="inline-flex items-center gap-2 text-slate-600 hover:text-sky-700 transition-colors font-medium"
              >
                {language === "de" ? "Direkt zum Angebot" : "Go to offer"}
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </section>

        {/* 2. VIDEO - Build Connection */}
        <section id="video" className="py-16 px-4 bg-stone-50">
          <div className="max-w-4xl mx-auto">
            <VideoSection videoId={youtubeVideoId} />
          </div>
        </section>

        {/* 3. WHAT I UNDERSTOOD - Show we understand his world */}
        <section id="verstanden" className="py-20 px-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-800 mb-4">
                {t("understanding.badge", language)}
              </h2>
              <p className="text-slate-600 text-lg">
                {t("understanding.subtitle", language)}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Das Segeln */}
              <div className="bg-white p-6 shadow-lg shadow-sky-900/5 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-sky-600">
                    <Ship className="w-5 h-5 text-sky-600" />
                  </div>
                  <h3 className="font-serif font-semibold text-slate-800">
                    <EditableText
                      blockId="understanding.sailing.title"
                      defaultValue={t("understanding.sailing.title", language)}
                      as="span"
                      sectionId="understanding"
                    />
                  </h3>
                </div>
                <EditableMultilineText
                  blockId="understanding.sailing.description"
                  defaultValue={`${t("understanding.sailing.description", language)} ${t("understanding.sailing.highlight", language)} ${t("understanding.sailing.descriptionEnd", language)}`}
                  as="p"
                  className="text-slate-600 text-sm leading-relaxed mb-4"
                  sectionId="understanding"
                />
                <p className="text-slate-500 text-sm italic">
                  {t("understanding.sailing.quote", language)}
                </p>
                <p className="text-slate-500 text-xs mt-2">
                  {t("understanding.sailing.note", language)}
                </p>
              </div>

              {/* Der Ort */}
              <div className="bg-white p-6 border border-sky-200 shadow-lg shadow-teal-900/5 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-sky-600">
                    <MapPin className="w-5 h-5 text-sky-700" />
                  </div>
                  <h3 className="font-serif font-semibold text-slate-800">
                    <EditableText
                      blockId="understanding.location.title"
                      defaultValue={t("understanding.location.title", language)}
                      as="span"
                      sectionId="understanding"
                    />
                  </h3>
                </div>
                <EditableMultilineText
                  blockId="understanding.location.description"
                  defaultValue={`${t("understanding.location.description", language)} ${t("understanding.location.highlight", language)}`}
                  as="p"
                  className="text-slate-600 text-sm leading-relaxed mb-4"
                  sectionId="understanding"
                />
                <p className="text-slate-500 text-sm italic">
                  {t("understanding.location.quote", language)}
                </p>
                <p className="text-slate-500 text-xs mt-2">
                  {t("understanding.location.note", language)}
                </p>
              </div>

              {/* Das Haus */}
              <div className="bg-white p-6 border border-amber-100 shadow-lg shadow-amber-900/5 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-amber-600">
                    <Home className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="font-serif font-semibold text-slate-800">
                    <EditableText
                      blockId="understanding.house.title"
                      defaultValue={t("understanding.house.title", language)}
                      as="span"
                      sectionId="understanding"
                    />
                  </h3>
                </div>
                <EditableMultilineText
                  blockId="understanding.house.description"
                  defaultValue={`${t("understanding.house.description", language)} ${t("understanding.house.highlight", language)}${t("understanding.house.descriptionEnd", language)}`}
                  as="p"
                  className="text-slate-600 text-sm leading-relaxed mb-4"
                  sectionId="understanding"
                />
                <p className="text-slate-500 text-xs mt-2">
                  {t("understanding.house.note", language)}
                </p>
              </div>

              {/* Das Walking */}
              <div className="bg-white p-6 border border-stone-200 shadow-lg shadow-stone-900/5 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-stone-600">
                    <Heart className="w-5 h-5 text-stone-700" />
                  </div>
                  <h3 className="font-serif font-semibold text-slate-800">{t("understanding.walking.title", language)}</h3>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  {t("understanding.walking.description", language)}
                  <strong className="text-stone-700">{t("understanding.walking.highlight", language)}</strong>{t("understanding.walking.descriptionEnd", language)}
                </p>
                <p className="text-slate-500 text-xs mt-2">
                  {t("understanding.walking.note", language)}
                </p>
              </div>
            </div>

            {/* The Ecosystem */}
            <div className="mt-8 bg-stone-50 p-6 border border-stone-200">
              <div className="text-center">
                <h4 className="font-serif font-semibold text-slate-800 mb-3">{t("understanding.ecosystem.title", language)}</h4>
                <p className="text-slate-600 text-sm max-w-2xl mx-auto">
                  {t("understanding.ecosystem.description", language)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. THE PROBLEM - External, Internal, Philosophical */}
        <section className="py-16 px-4 bg-stone-50">
          <div className="max-w-4xl mx-auto">
            <ProblemSection />
          </div>
        </section>

        {/* 5. THE GUIDE - Empathy + Authority */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <GuideSection />
          </div>
        </section>

        {/* 5.5. STORYBRAND JOURNEY - Visualize the customer journey */}
        <section className="py-16 px-4 bg-sky-50/50">
          <div className="max-w-5xl mx-auto">
            <StoryBrandJourneySection />
          </div>
        </section>

        {/* 6. THE PLAN - Timeline (12 Weeks) */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 text-sky-700 mb-6">
                <Clock className="w-4 h-4 text-sky-600" />
                <span className="text-sky-700 text-sm font-medium">{t("timeline.badge", language)}</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-800 mb-4">
                {t("timeline.title", language)}
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                {t("timeline.description", language)}
              </p>
            </div>
            <TimelineSection />
          </div>
        </section>

        {/* 7. THE TRANSFORMATION - Dynamic LTV Booster (Success Preview) */}
        <section className="py-16 px-4 bg-stone-50">
          <div className="max-w-5xl mx-auto">
            <DynamicLTVBooster />
          </div>
        </section>

        {/* 8. SUCCESS VISION - What life looks like after */}
        <section className="py-16 px-4 bg-stone-50">
          <div className="max-w-4xl mx-auto">
            <SuccessVisionSection />
          </div>
        </section>

        {/* 9. AVOID FAILURE - The Stakes */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <AvoidFailureSection />
          </div>
        </section>

        {/* ============================================ */}
        {/* OFFER SECTION (Bottom) */}
        {/* ============================================ */}

        {/* 10. THE OFFER - Pricing */}
        <section id="angebot" className="py-16 px-4 bg-sky-50/50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 text-stone-700 mb-6">
                <Package className="w-4 h-4 text-stone-700" />
                <span className="text-stone-700 text-sm font-medium">{language === "de" ? "Das Angebot" : "The Offer"}</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-800 mb-4">
                {language === "de" ? "Website-Entwicklung" : "Website Development"}
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                {language === "de" ? "Drei Optionen – wähle was zu deinem aktuellen Stand passt." : "Three options – choose what fits your current situation."}
              </p>
            </div>
            <PricingSection />
          </div>
        </section>

        {/* ROI Calculator */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-800 mb-4">
                {language === "de" ? "Rechnet sich die Website?" : "Is the Website Worth It?"}
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                {language === "de" ? "Interaktiver Rechner: Passe die Werte an deine Erwartungen an." : "Interactive calculator: Adjust the values to your expectations."}
              </p>
            </div>
            <LTVCACCalculator />
          </div>
        </section>

        {/* Marketing Options */}
        <section className="py-16 px-4 bg-stone-50">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-800 mb-4">
                <Megaphone className="w-8 h-8 inline-block mr-3 text-stone-600" />
                {language === "de" ? "Sichtbarkeit: Der nächste Schritt" : "Visibility: The Next Step"}
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                {language === "de" ? "Die Website bringt keine automatische Sichtbarkeit. Hier siehst du, was Marketing kostet und bringt." : "The website doesn't bring automatic visibility. Here you can see what marketing costs and delivers."}
              </p>
            </div>
            <MarketingPackagesSection />
          </div>
        </section>

        {/* Deliverables */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-800 mb-4">
                {language === "de" ? "Was du bekommst" : "What You Get"}
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                {language === "de" ? "Alles, was du brauchst. Nichts, was du nicht brauchst." : "Everything you need. Nothing you don't."}
              </p>
            </div>
            <DeliverablesSection />
          </div>
        </section>

        {/* Hosting & Support */}
        <section className="py-16 px-4 bg-sky-50/50">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-800 mb-4">
                {language === "de" ? "Nach dem Launch" : "After Launch"}
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                {language === "de" ? "Hosting und Support, wenn du sie brauchst." : "Hosting and support when you need them."}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-10">
              {/* Hosting */}
              <div className="bg-white p-6 border border-sky-100 shadow-lg shadow-sky-900/5">
                <h3 className="text-lg font-serif font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-sky-600" />
                  Hosting
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">{language === "de" ? "Erstes Jahr" : "First Year"}</span>
                    <span className="text-sky-700 font-semibold">{language === "de" ? "Inklusive" : "Included"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">{language === "de" ? "Danach monatlich" : "After, monthly"}</span>
                    <span className="text-slate-800 font-semibold">{language === "de" ? "25€/Monat" : "€25/month"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">{language === "de" ? "Oder jährlich" : "Or yearly"}</span>
                    <span className="text-slate-800 font-semibold">{language === "de" ? "250€/Jahr" : "€250/year"}</span>
                  </div>
                </div>
              </div>

              {/* Support included */}
              <div className="bg-white p-6 border border-sky-100 shadow-lg shadow-sky-900/5">
                <h3 className="text-lg font-serif font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-sky-600" />
                  {language === "de" ? "Support inklusive" : "Support Included"}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">{language === "de" ? "Nach Launch" : "After Launch"}</span>
                    <span className="text-sky-700 font-semibold">{language === "de" ? "90 Tage inklusive" : "90 days included"}</span>
                  </div>
                  <p className="text-slate-500 text-sm pt-2">
                    {language === "de" ? "Bug-Fixes, kleine Anpassungen, Fragen – alles dabei." : "Bug fixes, small adjustments, questions – all included."}
                  </p>
                </div>
              </div>
            </div>

            {/* Support Plans */}
            <div className="bg-white p-6 border border-sky-100 shadow-lg shadow-sky-900/5">
              <h3 className="text-lg font-serif font-bold text-slate-800 mb-6 text-center">
                {language === "de" ? "Optionale Support-Pakete (nach den ersten 90 Tagen)" : "Optional Support Packages (after the first 90 days)"}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-sky-100">
                      <th className="text-left py-3 px-4 text-slate-500 font-medium"></th>
                      <th className="text-center py-3 px-4 text-slate-700">Standard</th>
                      <th className="text-center py-3 px-4 text-slate-700">Business</th>
                      <th className="text-center py-3 px-4 text-sky-700 font-semibold">Premium</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-sky-50">
                      <td className="py-3 px-4 text-slate-500">{language === "de" ? "Preis" : "Price"}</td>
                      <td className="text-center py-3 px-4 text-slate-800">{language === "de" ? "75€/Monat" : "€75/month"}</td>
                      <td className="text-center py-3 px-4 text-slate-800">{language === "de" ? "150€/Monat" : "€150/month"}</td>
                      <td className="text-center py-3 px-4 text-slate-800">{language === "de" ? "300€/Monat" : "€300/month"}</td>
                    </tr>
                    <tr className="border-b border-sky-50">
                      <td className="py-3 px-4 text-slate-500">{language === "de" ? "Reaktionszeit (kritisch)" : "Response Time (critical)"}</td>
                      <td className="text-center py-3 px-4 text-slate-800">48h</td>
                      <td className="text-center py-3 px-4 text-slate-800">12h</td>
                      <td className="text-center py-3 px-4 text-slate-800">4h (24/7)</td>
                    </tr>
                    <tr className="border-b border-sky-50">
                      <td className="py-3 px-4 text-slate-500">{language === "de" ? "Inkl. Änderungen" : "Incl. Changes"}</td>
                      <td className="text-center py-3 px-4 text-slate-800">{language === "de" ? "1h/Monat" : "1h/month"}</td>
                      <td className="text-center py-3 px-4 text-slate-800">{language === "de" ? "3h/Monat" : "3h/month"}</td>
                      <td className="text-center py-3 px-4 text-slate-800">{language === "de" ? "8h/Monat" : "8h/month"}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-slate-500">Backups</td>
                      <td className="text-center py-3 px-4 text-slate-800">{language === "de" ? "Monatlich" : "Monthly"}</td>
                      <td className="text-center py-3 px-4 text-slate-800">{language === "de" ? "Wöchentlich" : "Weekly"}</td>
                      <td className="text-center py-3 px-4 text-slate-800">{language === "de" ? "Täglich" : "Daily"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-center text-slate-500 text-sm mt-4">
                {language === "de" ? "Monatlich kündbar. Keine Verpflichtung." : "Cancel monthly. No commitment."}
              </p>
            </div>
          </div>
        </section>

        {/* Media Production Section */}
        <section className="py-16 px-4 bg-gradient-to-b from-white via-amber-50/30 to-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 text-amber-700 mb-4">
                <Camera className="w-4 h-4 text-amber-600" />
                <span className="text-amber-700 text-sm">{language === "de" ? "Zusätzliche Option" : "Additional Option"}</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-800 mb-4">
                {language === "de" ? "Medienproduktion & Content" : "Media Production & Content"}
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                {language === "de"
                  ? "Die Stille des Haffs lässt sich nicht mit Stockfotos transportieren. Authentische Bilder und Videos machen den Unterschied."
                  : "The tranquility of the lagoon cannot be captured with stock photos. Authentic images and videos make the difference."}
              </p>
            </div>

            {/* Special Offer: Podcast */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 md:p-8 border border-amber-200 mb-8">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="p-4 bg-amber-100">
                  <Mic className="w-10 h-10 text-amber-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-serif font-bold text-slate-800">{language === "de" ? "Podcast-Angebot" : "Podcast Offer"}</h3>
                    <span className="text-xs bg-teal-600 text-white px-2 py-1 font-semibold">{language === "de" ? "GRATIS" : "FREE"}</span>
                  </div>
                  <p className="text-slate-600 mb-4">
                    {language === "de"
                      ? "Ich komme vorbei und wir nehmen gemeinsam eine Podcast-Folge auf – über das Haff, das Segeln, deine Geschichte. Authentisch, persönlich, ohne Skript."
                      : "I'll come by and we'll record a podcast episode together – about the lagoon, sailing, your story. Authentic, personal, unscripted."}
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <div className="flex items-center gap-2 text-sky-700">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{language === "de" ? "Aufnahme vor Ort" : "On-location recording"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sky-700">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{language === "de" ? "Professionelles Equipment" : "Professional equipment"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sky-700">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{language === "de" ? "Veröffentlichung auf meinem Kanal" : "Published on my channel"}</span>
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm mt-4 italic">
                    {language === "de"
                      ? "→ Authentischer Content für dich, interessante Geschichte für mein Publikum. Win-win."
                      : "→ Authentic content for you, interesting story for my audience. Win-win."}
                  </p>
                </div>
              </div>
            </div>

            {/* Media Packages Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Podcast Clips */}
              <div className="bg-white p-5 shadow-md hover:shadow-lg hover:border-amber-200 transition-all">
                <div className="text-amber-600 mb-4">
                  <Scissors className="w-6 h-6 text-amber-600" />
                </div>
                <h4 className="font-serif font-semibold text-slate-800 mb-2">{language === "de" ? "Podcast-Clips" : "Podcast Clips"}</h4>
                <p className="text-slate-600 text-sm mb-4">
                  {language === "de"
                    ? "10 kurze Clips aus der Podcast-Aufnahme, optimiert für Social Media."
                    : "10 short clips from the podcast recording, optimized for social media."}
                </p>
                <div className="text-2xl font-bold text-amber-600 mb-2">{language === "de" ? "500€" : "€500"}</div>
                <ul className="text-xs text-slate-500 space-y-1">
                  <li>• {language === "de" ? "10 Kurzclips (15-60 Sek.)" : "10 short clips (15-60 sec.)"}</li>
                  <li>• {language === "de" ? "Untertitel & Branding" : "Subtitles & Branding"}</li>
                  <li>• {language === "de" ? "Hochformat für Reels/TikTok" : "Vertical format for Reels/TikTok"}</li>
                  <li>• {language === "de" ? "Querformat für YouTube" : "Horizontal format for YouTube"}</li>
                </ul>
              </div>

              {/* Video Production */}
              <div className="bg-white p-5 shadow-md hover:shadow-lg hover:border-amber-200 transition-all">
                <div className="text-amber-600 mb-4">
                  <Video className="w-6 h-6 text-amber-600" />
                </div>
                <h4 className="font-serif font-semibold text-slate-800 mb-2">{language === "de" ? "Video-Dreh" : "Video Shoot"}</h4>
                <p className="text-slate-600 text-sm mb-4">
                  {language === "de"
                    ? "Halber Tag vor Ort: Segeln, Haff, Haus – echte Momente einfangen."
                    : "Half day on location: sailing, lagoon, house – capturing real moments."}
                </p>
                <div className="text-2xl font-bold text-amber-600 mb-2">{language === "de" ? "2.000€" : "€2,000"}</div>
                <ul className="text-xs text-slate-500 space-y-1">
                  <li>• {language === "de" ? "4-5 Stunden Dreh" : "4-5 hours of shooting"}</li>
                  <li>• {language === "de" ? "Professionelle Kamera & Drohne" : "Professional camera & drone"}</li>
                  <li>• {language === "de" ? "Rohschnitt inkl." : "Rough cut included"}</li>
                  <li>• {language === "de" ? "Nutzungsrechte vollständig" : "Full usage rights"}</li>
                </ul>
              </div>

              {/* Image Film */}
              <div className="bg-white p-5 shadow-md hover:shadow-lg hover:border-sky-200 transition-all">
                <div className="text-sky-600 mb-4">
                  <Film className="w-6 h-6 text-sky-600" />
                </div>
                <h4 className="font-serif font-semibold text-slate-800 mb-2">{language === "de" ? "Imagefilm" : "Promo Film"}</h4>
                <p className="text-slate-600 text-sm mb-4">
                  {language === "de"
                    ? "Professionell geschnittener Film (30 Sek. bis 3 Min.) für Website & Ads."
                    : "Professionally edited film (30 sec. to 3 min.) for website & ads."}
                </p>
                <div className="text-2xl font-bold text-sky-600 mb-2">{language === "de" ? "1.500€" : "€1,500"}</div>
                <ul className="text-xs text-slate-500 space-y-1">
                  <li>• {language === "de" ? "Storytelling-Konzept" : "Storytelling concept"}</li>
                  <li>• {language === "de" ? "Professioneller Schnitt" : "Professional editing"}</li>
                  <li>• {language === "de" ? "Musik & Sound-Design" : "Music & sound design"}</li>
                  <li>• Color Grading</li>
                </ul>
              </div>

              {/* Social Media Marketing */}
              <div className="bg-white p-5 shadow-md hover:shadow-lg hover:border-stone-300 transition-all relative">
                <div className="absolute -top-2 -right-2 bg-stone-600 text-white text-xs font-bold px-2 py-1">
                  {language === "de" ? "LAUFEND" : "ONGOING"}
                </div>
                <div className="text-stone-600 mb-4">
                  <Instagram className="w-6 h-6 text-stone-700" />
                </div>
                <h4 className="font-serif font-semibold text-slate-800 mb-2">Social Media</h4>
                <p className="text-slate-600 text-sm mb-4">
                  {language === "de"
                    ? "Content-Kalender, Posting, Community – alles aus einer Hand."
                    : "Content calendar, posting, community – all from one source."}
                </p>
                <div className="text-2xl font-bold text-stone-700 mb-2">{language === "de" ? "1.200-3.000€" : "€1,200-3,000"}<span className="text-sm font-normal text-slate-500">/{language === "de" ? "Mo" : "mo"}</span></div>
                <ul className="text-xs text-slate-500 space-y-1">
                  <li>• {language === "de" ? "Content-Strategie" : "Content strategy"}</li>
                  <li>• {language === "de" ? "8-20 Posts/Monat" : "8-20 posts/month"}</li>
                  <li>• Stories & Reels</li>
                  <li>• Community Management</li>
                </ul>
              </div>
            </div>

            {/* Note */}
            <div className="mt-8 bg-amber-50 p-5 border border-amber-200">
              <div className="flex items-start gap-4">
                <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-slate-700 text-sm">
                    <strong className="text-slate-800">{language === "de" ? "Tipp:" : "Tip:"}</strong> {language === "de"
                      ? "Authentische Bilder und Videos vom Haff sind Gold wert. Sie transportieren das Gefühl, das Worte nicht können – und heben dich von der Konkurrenz ab, die mit Stockfotos arbeitet."
                      : "Authentic images and videos from the lagoon are worth their weight in gold. They convey the feeling that words cannot – and set you apart from competitors using stock photos."}
                  </p>
                  <p className="text-slate-500 text-xs mt-2">
                    {language === "de"
                      ? "Diese Pakete sind optional und können jederzeit dazugebucht werden."
                      : "These packages are optional and can be added at any time."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-sky-50">
          <div className="max-w-3xl mx-auto text-center">
            <div className="bg-gradient-to-br from-sky-100 to-sky-50 p-8 md:p-12 border border-sky-200 shadow-xl shadow-sky-900/10">
              <Wind className="w-12 h-12 text-sky-600 mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-800 mb-4">
                <EditableText
                  blockId="cta.title"
                  defaultValue={t("finalCta.title", language)}
                  as="span"
                  sectionId="cta"
                />
              </h2>
              <EditableMultilineText
                blockId="cta.description"
                defaultValue={t("finalCta.description", language)}
                as="p"
                className="text-slate-600 mb-8 max-w-xl mx-auto"
                sectionId="cta"
              />
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 flex-wrap">
                <a
                  href="https://cal.com/voundbrand/open-end-meeting"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-sky-700 text-white font-semibold px-8 py-4 hover:bg-sky-600 transition-colors shadow-lg shadow-sky-900/20 shimmer-button"
                >
                  <Calendar className="w-5 h-5" />
                  {t("finalCta.bookCall", language)}
                </a>
                <a
                  href="mailto:remington@l4yercak3.com?subject=Angebot%20Segelschule%20-%20Gerrit"
                  className="inline-flex items-center gap-2 bg-white text-slate-700 font-semibold px-8 py-4 hover:bg-stone-50 transition-colors border border-stone-200"
                >
                  <Mail className="w-5 h-5" />
                  {t("finalCta.sendEmail", language)}
                </a>
                <a
                  href="tel:+4915140427103"
                  className="inline-flex items-center gap-2 bg-white text-slate-700 font-semibold px-8 py-4 hover:bg-stone-50 transition-colors border border-stone-200"
                >
                  <Phone className="w-5 h-5" />
                  {t("finalCta.call", language)}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-sky-200 py-8 px-4 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Anchor className="w-5 h-5 text-sky-600" />
            <span className="text-slate-600">{t("footer.copyright", language)}</span>
          </div>
          <div className="text-slate-500 text-sm">
            {t("footer.validFor", language)}
          </div>
        </div>
      </footer>

      {/* Project Drawer Components */}
      <ProjectDrawerTrigger />
      <ProjectDrawer />
      <MeetingDetailModal />
      </div>{/* End of main content wrapper */}
    </div>
      </ProjectDrawerProvider>
    </Suspense>
  );
}

// ============================================
// EDIT MODE WRAPPER (bridges ProjectDrawer session to EditModeProvider)
// ============================================

function EditModeWrapper({ config, children }: { config: ProjectPageConfig; children: React.ReactNode }) {
  // Get session from ProjectDrawer context
  const { session, isAuthenticated } = useProjectDrawer();

  return (
    <EditModeProvider
      projectId={config.projectId}
      organizationId={config.organizationId as Id<"organizations">}
      sessionId={session?.sessionId ?? null}
      userEmail={session?.contactEmail ?? null}
      userName={null} // Could be enhanced to get contact name from CRM
    >
      {children}
      {/* Only show edit toolbar when authenticated via drawer */}
      {isAuthenticated && <EditModeToolbar />}
    </EditModeProvider>
  );
}

// ============================================
// EXPORTED TEMPLATE COMPONENT (Wrapper with fonts and language provider)
// ============================================

export default function GerritTemplate({ config }: GerritTemplateProps) {
  return (
    <LanguageProvider>
      <EditModeWrapper config={config}>
        <div className={`${inter.variable} ${playfair.variable} font-sans`}>
          <GerritOfferPageInner config={config} />
        </div>
      </EditModeWrapper>
    </LanguageProvider>
  );
}
