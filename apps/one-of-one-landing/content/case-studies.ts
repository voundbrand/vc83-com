export interface CaseStudyMetrics {
  label: string;
  before: string;
  after: string;
}

export interface CaseStudy {
  slug: string;
  name: string;
  role: string;
  location: string;
  tagline: string;
  initials: string;
  headline: string;
  problem: string[];
  solution: string[];
  metrics: CaseStudyMetrics[];
  quote: string;
  broaderAppeal?: string;
  escalationRules?: string[];
  researchLoop?: { title: string; description: string }[];
}

export type CaseStudyTranslations = {
  backToHome: string;
  theProblem: string;
  theSolution: string;
  theResults: string;
  customEscalationRules: string;
  researchPipeline: string;
  verifiedClient: string;
  readFullCaseStudy: string;
  caseStudies: Record<string, CaseStudy>;
  reviewCta: {
    headline: string;
    text: string;
  };
};

const en: CaseStudyTranslations = {
  backToHome: "Back to home",
  theProblem: "The Problem",
  theSolution: "The Solution",
  theResults: "The Results",
  customEscalationRules: "Custom Escalation Rules",
  researchPipeline: "Research Pipeline",
  verifiedClient: "Verified Client",
  readFullCaseStudy: "Read full case study",
  reviewCta: {
    headline: "Want to see this for your business?",
    text: "Book 30 minutes with Remington. No slides. He\u2019ll show you the assistant live.",
  },
  caseStudies: {
    "marcus-engel": {
      slug: "marcus-engel",
      name: "Marcus Engel",
      role: "Independent Real Estate Agent",
      location: "Eberswalde, Brandenburg",
      tagline: "Virtual Receptionist for Real Estate",
      initials: "ME",
      headline:
        "How a real estate agent in Eberswalde stopped losing deals to missed calls.",
      problem: [
        "Marcus Engel is an independent real estate agent in Eberswalde, a growing market town northeast of Berlin. His business runs on relationships and responsiveness \u2014 when a potential buyer calls about a listing, the first agent to answer wins.",
        "But Marcus was physically showing properties 4\u20135 hours a day, meaning he missed up to a third of his incoming calls. Every missed call was a potential buyer going to a competitor. He tried forwarding to a call center, but they didn\u2019t know his listings, couldn\u2019t answer specific questions, and the leads went cold.",
        "He tried voicemail \u2014 nobody under 40 leaves voicemails anymore.",
      ],
      solution: [
        "Marcus\u2019s assistant acts as his virtual receptionist. It knows every active listing, every price point, every neighborhood detail. When a call comes in that Marcus can\u2019t take, the assistant answers in his professional style, qualifies the lead \u2014 budget, timeline, property type \u2014 answers listing-specific questions, and books viewings directly into his calendar.",
        "After each interaction, Marcus gets a structured summary. Not a voicemail he has to decode, but a qualified lead brief with next steps already suggested.",
        "The assistant also handles follow-ups. If a prospect viewed a property but hasn\u2019t been in touch for three days, it sends a personalized check-in. If a new listing matches a prospect\u2019s criteria, it notifies them before it hits the portals.",
      ],
      metrics: [
        { label: "Missed calls", before: "34%", after: "2%" },
        { label: "Lead response time", before: "4+ hours", after: "< 3 min" },
        { label: "Viewings booked/mo", before: "14", after: "23" },
        { label: "Deals closed/quarter", before: "4", after: "7" },
      ],
      quote:
        "I was losing deals to agents who simply picked up the phone faster. Now my assistant picks up faster than anyone \u2014 and it actually knows what it\u2019s talking about.",
    },
    "lutz-splettstosser": {
      slug: "lutz-splettstosser",
      name: "Lutz Splettstö\u00DFer",
      role: "Retired Gesellschafter & Association Chair",
      location: "Germany",
      tagline: "Personal Email SPAM Blocker Assistant",
      initials: "LS",
      headline:
        "How a retired Gesellschafter reclaimed his inbox \u2014 and his mornings.",
      problem: [
        "Lutz Splettstö\u00DFer is a retired Gesellschafter who still holds stakes in several businesses and chairs two local associations. At 67, he remembers when email was a professional communication tool \u2014 not a garbage dump.",
        "Every morning, he opens his inbox to 40\u201360 emails: newsletter subscriptions he never signed up for, promotional offers from companies he bought from once five years ago, phishing attempts disguised as bank notices, and the occasional actual message from a business partner buried somewhere in the noise.",
        "He\u2019s tried spam filters, rules, unsubscribe links that lead to more spam. Nothing sticks. For business owners and Gesellschafter in their 60s, this isn\u2019t a minor annoyance \u2014 it\u2019s a daily assault on their time and attention that makes them distrust their own inbox.",
      ],
      solution: [
        "Lutz\u2019s assistant acts as his personal email gatekeeper. It learned his communication patterns in the first week: who he actually corresponds with, which topics matter \u2014 Gesellschafter reports, tax documents, family \u2014 and what\u2019s noise.",
        "Now it intercepts every incoming email before it hits his inbox. Legitimate messages pass through instantly. Spam gets silently archived with a weekly digest he can review if he wants. Borderline cases \u2014 a new contact, an unfamiliar but potentially legitimate sender \u2014 get flagged with a one-line summary so he can decide in seconds, not minutes.",
        "The assistant also handles unsubscription properly. When it identifies a persistent newsletter or marketing sender, it processes the unsubscribe and monitors for re-enrollment. If the sender ignores the unsubscribe, it escalates to a blocking rule.",
      ],
      metrics: [
        { label: "Spam reaching inbox", before: "47/day", after: "0\u20132/day" },
        {
          label: "Time managing email",
          before: "45 min/day",
          after: "< 5 min/day",
        },
        {
          label: "Legitimate emails missed",
          before: "\u2014",
          after: "0 (3 months)",
        },
        { label: "Phishing blocked", before: "\u2014", after: "12 in month 1" },
      ],
      quote:
        "I finally trust my inbox again. When my phone buzzes with an email, I know it\u2019s something that actually matters. I haven\u2019t felt that way in ten years.",
      broaderAppeal:
        "This isn\u2019t just Lutz\u2019s problem. Across Germany, business owners and Gesellschafter in their 60s \u2014 people who built companies before email existed \u2014 are drowning in digital noise they never asked for. They don\u2019t want to learn new software. They want the problem to go away. That\u2019s exactly what an assistant does: it doesn\u2019t add complexity, it removes it.",
    },
    "franziska-splettstosser": {
      slug: "franziska-splettstosser",
      name: "Franziska Splettstö\u00DFer",
      role: "Pharmacist & Pharmacy Owner",
      location: "Germany",
      tagline: "Slack Team Vacation Planning with Custom Escalation Rules",
      initials: "FS",
      headline:
        "How a pharmacist turned vacation chaos into one Slack channel with zero conflicts.",
      problem: [
        "Franziska Splettstö\u00DFer runs a pharmacy with a team of 17. Vacation planning was chaos: WhatsApp messages asking \u201Ccan I take off next Thursday?\u201D, a paper calendar on the break room wall that was never up to date, and constant scheduling conflicts that only surfaced when someone didn\u2019t show up.",
        "In pharmacy, understaffing isn\u2019t just inconvenient \u2014 it\u2019s a compliance issue. German regulations require minimum pharmacist coverage at all times.",
        "Franziska was spending 3+ hours per week managing vacation requests, cross-referencing coverage, and handling the inevitable conflicts.",
      ],
      solution: [
        "Franziska connected her existing Slack workspace to a dedicated vacation planning channel managed by her assistant. Team members submit vacation requests in natural language \u2014 \u201CI\u2019d like to take August 18\u201322 off.\u201D The assistant checks against the team calendar, verifies minimum coverage requirements that Franziska defined herself, and either approves automatically or flags conflicts.",
        "The assistant also maintains a live vacation calendar visible to the entire team, sends reminders before approved vacations, and generates monthly coverage reports.",
      ],
      escalationRules: [
        "If coverage drops below 2 pharmacists on any shift \u2192 automatic block + notification to Franziska",
        "If two people from the same role request overlapping dates \u2192 hold both, notify team, first-confirmed wins",
        "If someone requests time off less than 2 weeks out \u2192 requires Franziska\u2019s manual approval",
        "Holiday periods (Christmas, Easter) \u2192 all requests queued and batch-approved by Franziska with priority by seniority",
      ],
      metrics: [
        {
          label: "Scheduling conflicts",
          before: "Weekly",
          after: "0",
        },
        {
          label: "Time on coordination",
          before: "3+ hrs/week",
          after: "20 min/week",
        },
        {
          label: "Coverage violations",
          before: "2\u20133/quarter",
          after: "0",
        },
        {
          label: "Team satisfaction",
          before: "Frustrating",
          after: "Effortless",
        },
      ],
      quote:
        "I defined my rules once and the assistant enforces them every time. My team knows exactly where they stand, and I don\u2019t spend my Sundays doing schedule Tetris anymore.",
    },
    "thomas-berger": {
      slug: "thomas-berger",
      name: "Thomas Berger",
      role: "Master Electrician & Business Owner",
      location: "Potsdam, Brandenburg",
      tagline: "Voice-to-Quote Assistant for Field Documentation",
      initials: "TB",
      headline:
        "How a master electrician in Potsdam cut his quote time from 5 hours to 45 minutes a week.",
      problem: [
        "Thomas Berger runs a four-person electrical contracting business in Potsdam. His team does the work \u2014 rewiring apartments, installing panels, running diagnostics. The work itself isn\u2019t the problem. The paperwork after is.",
        "Every evening, after a full day on job sites, Thomas would sit down for another 2\u20133 hours: typing up measurements from scribbled notes, calculating line items, looking up material prices, formatting PDFs. Five quotes a week, each one taking an hour or more. By the time the customer received it, three days had passed \u2014 and half the time they\u2019d already hired someone faster.",
        "He tried dictation apps. They transcribed words but didn\u2019t understand electrical work. He tried templates. They saved 10 minutes per quote but still needed everything entered by hand. The bottleneck wasn\u2019t typing speed \u2014 it was the translation from what he saw on-site to a structured, priced document.",
      ],
      solution: [
        "Thomas\u2019s assistant acts as his documentation partner. On-site, he records a voice note describing what he found: \u2018Three-room apartment, full rewire, existing panel is 1970s, needs upgrade to 63A, roughly 120 meters of NYM-J 3x2.5.\u2019 The assistant turns that into a structured quote draft \u2014 correct line items, current material pricing, labor estimates based on Thomas\u2019s own rates.",
        "When something is ambiguous \u2014 missing room count, unclear panel spec \u2014 the assistant asks one follow-up question via WhatsApp instead of guessing. Thomas reviews the draft, adjusts if needed, and sends. The entire process takes 8\u201310 minutes instead of 60+.",
        "The assistant also tracks sent quotes and flags the ones that haven\u2019t gotten a response after 48 hours, so Thomas can follow up while the customer still remembers the conversation.",
      ],
      metrics: [
        { label: "Quote time/week", before: "5+ hrs", after: "45 min" },
        { label: "Same-day quotes", before: "20%", after: "85%" },
        { label: "Quote-to-close rate", before: "~30%", after: "52%" },
        {
          label: "Evening admin hours",
          before: "2\u20133 hrs/day",
          after: "< 20 min/day",
        },
      ],
      quote:
        "I used to lose jobs to electricians who just sent the quote faster. Now my quotes go out the same day, and they look more professional than anything I could have typed up in three hours.",
    },
    "kirsten-hoener-march": {
      slug: "kirsten-hoener-march",
      name: "Kirsten H\u00F6ner-March",
      role: "Specialist Attorney, Employment & Social Law",
      location: "Eberswalde, Brandenburg",
      tagline: "AI Receptionist with 4-Level Lead Classification",
      initials: "KH",
      headline:
        "How an attorney in Eberswalde stopped losing clients to gaps in coverage.",
      problem: [
        "Kirsten H\u00F6ner-March runs a solo law practice in Eberswalde, specializing in employment and social law. She has a human assistant who handles the phone during office hours \u2014 but office hours only cover about 22 hours a week. Monday through Thursday mornings, plus Tuesday afternoons. The rest of the time, the line goes unanswered.",
        "Her clients typically call in crisis \u2014 they\u2019ve just been terminated, denied disability benefits, or received a legal notice they don\u2019t understand. For them, reaching a lawyer isn\u2019t a convenience. It\u2019s urgent. But crises don\u2019t wait for office hours. And even during office hours, life gets in the way: the assistant is on vacation, calls in sick, steps out for lunch, or is already on another call.",
        "People in legal distress don\u2019t leave voicemails \u2014 they call the next name on Google. Every gap in coverage is a potential mandate lost.",
      ],
      solution: [
        "Kirsten and her human assistant personally trained an AI assistant to handle calls exactly the way they would. Together they defined the tone, the escalation logic, and a 4-level classification system that distinguishes a wrongful termination case from a sales call \u2014 something no external secretary service could do.",
        "Now the assistant takes over seamlessly whenever life gets in the way: evenings, weekends, holidays, sick days, lunch breaks, or when the human assistant is already on another call. It classifies every caller, books qualified consultations directly into Kirsten\u2019s calendar, collects case details for priority callbacks, and dismisses sales calls politely. If it can\u2019t confidently classify a caller, it escalates to Kirsten directly rather than guessing.",
        "The result: Kirsten\u2019s practice is always reachable, her calendar fills with qualified consultations, and neither she nor her assistant has to choose between the phone and the person in front of them.",
      ],
      escalationRules: [
        "Level A \u2014 Immediate appointment: Caller describes a current employment dispute, termination, or benefits denial with clear legal need \u2192 assistant books the next available consultation slot",
        "Level B \u2014 Priority callback: Caller has a legal question within scope but no acute crisis \u2192 assistant collects case details and schedules a callback window",
        "Level C \u2014 Information & triage: Caller\u2019s issue is unclear or may fall outside specialization \u2192 assistant gathers information and flags for Kirsten\u2019s review",
        "Level D \u2014 No action: Sales calls, wrong numbers, or matters outside scope \u2192 handled politely, no appointment, no escalation",
      ],
      metrics: [
        { label: "Reachability", before: "~22 hrs/week", after: "24/7" },
        {
          label: "Qualified consults/mo",
          before: "~12",
          after: "22",
        },
        {
          label: "Calls during meetings",
          before: "8\u201310/day",
          after: "0",
        },
        { label: "Time screening calls", before: "~1.5 hrs/day", after: "0" },
      ],
      quote:
        "My assistant and I trained it together. It knows exactly how we work \u2014 who gets an appointment, who gets a callback, who gets a polite goodbye. Before, half our callers got voicemail and never called back. Now someone always listens, even when we can\u2019t.",
      broaderAppeal:
        "Kirsten\u2019s situation is common across Germany: tens of thousands of solo practitioners and small firms have good teams but limited hours. Their clients are often in crisis \u2014 legal, medical, financial \u2014 and a missed call isn\u2019t just lost revenue, it\u2019s someone who needed help and didn\u2019t get it. An AI assistant doesn\u2019t replace the team. It makes sure no one falls through the gaps when life gets in the way.",
    },
  },
};

const de: CaseStudyTranslations = {
  backToHome: "Zur\u00FCck zur Startseite",
  theProblem: "Das Problem",
  theSolution: "Die L\u00F6sung",
  theResults: "Die Ergebnisse",
  customEscalationRules: "Individuelle Eskalationsregeln",
  researchPipeline: "Research-Pipeline",
  verifiedClient: "Verifizierter Kunde",
  readFullCaseStudy: "Zur vollst\u00E4ndigen Fallstudie",
  reviewCta: {
    headline: "Wollen Sie das f\u00FCr Ihr Unternehmen sehen?",
    text: "30 Minuten mit Remington. Keine Folien. Er zeigt Ihnen den Assistenten live.",
  },
  caseStudies: {
    "marcus-engel": {
      slug: "marcus-engel",
      name: "Marcus Engel",
      role: "Selbstst\u00E4ndiger Immobilienmakler",
      location: "Eberswalde, Brandenburg",
      tagline: "Virtueller Empfang f\u00FCr Immobilien",
      initials: "ME",
      headline:
        "Wie ein Immobilienmakler in Eberswalde aufh\u00F6rte, Gesch\u00E4fte durch verpasste Anrufe zu verlieren.",
      problem: [
        "Marcus Engel ist ein selbstst\u00E4ndiger Immobilienmakler in Eberswalde, einer wachsenden Marktstadt nord\u00F6stlich von Berlin. Sein Gesch\u00E4ft lebt von Beziehungen und Erreichbarkeit \u2014 wenn ein potenzieller K\u00E4ufer wegen eines Objekts anruft, gewinnt der Makler, der zuerst abnimmt.",
        "Aber Marcus war 4\u20135 Stunden t\u00E4glich bei Besichtigungen und verpasste bis zu einem Drittel seiner eingehenden Anrufe. Jeder verpasste Anruf war ein potenzieller K\u00E4ufer, der zum Wettbewerber ging. Er versuchte, an ein Callcenter weiterzuleiten, aber die kannten seine Objekte nicht, konnten keine spezifischen Fragen beantworten, und die Leads wurden kalt.",
        "Er versuchte es mit Mailbox \u2014 niemand unter 40 hinterl\u00E4sst noch Sprachnachrichten.",
      ],
      solution: [
        "Marcus\u2019 Assistent fungiert als sein virtueller Empfang. Er kennt jedes aktive Objekt, jeden Preis, jedes Stadtviertel-Detail. Wenn ein Anruf kommt, den Marcus nicht annehmen kann, antwortet der Assistent in seinem professionellen Stil, qualifiziert den Lead \u2014 Budget, Zeitrahmen, Objekttyp \u2014 beantwortet objektspezifische Fragen und bucht Besichtigungen direkt in seinen Kalender.",
        "Nach jeder Interaktion bekommt Marcus eine strukturierte Zusammenfassung. Keine Mailbox, die er entschl\u00FCsseln muss, sondern ein qualifiziertes Lead-Briefing mit bereits vorgeschlagenen n\u00E4chsten Schritten.",
        "Der Assistent \u00FCbernimmt auch die Nachverfolgung. Wenn ein Interessent ein Objekt besichtigt hat, aber seit drei Tagen nicht in Kontakt war, schickt er eine personalisierte R\u00FCckmeldung. Wenn ein neues Objekt zu den Kriterien eines Interessenten passt, benachrichtigt er ihn, bevor es auf den Portalen erscheint.",
      ],
      metrics: [
        { label: "Verpasste Anrufe", before: "34%", after: "2%" },
        { label: "Lead-Antwortzeit", before: "4+ Stunden", after: "< 3 Min." },
        { label: "Besichtigungen/Monat", before: "14", after: "23" },
        { label: "Abschl\u00FCsse/Quartal", before: "4", after: "7" },
      ],
      quote:
        "Ich habe Gesch\u00E4fte an Makler verloren, die einfach schneller ans Telefon gegangen sind. Jetzt nimmt mein Assistent schneller ab als jeder andere \u2014 und er wei\u00DF tats\u00E4chlich, wovon er spricht.",
    },
    "lutz-splettstosser": {
      slug: "lutz-splettstosser",
      name: "Lutz Splettstö\u00DFer",
      role: "Gesellschafter i.R. \u00B7 Vereinsvorstand",
      location: "Deutschland",
      tagline: "Pers\u00F6nlicher E-Mail-SPAM-Blocker-Assistent",
      initials: "LS",
      headline:
        "Wie ein Gesellschafter im Ruhestand sein Postfach zur\u00FCckerobert hat \u2014 und seine Morgenroutine.",
      problem: [
        "Lutz Splettstö\u00DFer ist Gesellschafter im Ruhestand, h\u00E4lt Anteile an mehreren Unternehmen und ist Vorstand in zwei Vereinen. Mit 67 erinnert er sich an die Zeit, als E-Mail ein professionelles Kommunikationswerkzeug war \u2014 keine M\u00FClldeponie.",
        "Jeden Morgen \u00F6ffnet er sein Postfach und findet 40\u201360 E-Mails: Newsletter-Abonnements, die er nie abgeschlossen hat, Werbeangebote von Firmen, bei denen er vor f\u00FCnf Jahren einmal gekauft hat, Phishing-Versuche als Bankmitteilungen getarnt, und die gelegentliche echte Nachricht eines Gesch\u00E4ftspartners, irgendwo im L\u00E4rm begraben.",
        "Er hat Spam-Filter probiert, Regeln, Abmeldelinks, die zu mehr Spam f\u00FChren. Nichts h\u00E4lt. F\u00FCr Unternehmer und Gesellschafter in ihren 60ern ist das keine Kleinigkeit \u2014 es ist ein t\u00E4glicher Angriff auf ihre Zeit und Aufmerksamkeit, der sie ihr eigenes Postfach misstrauen l\u00E4sst.",
      ],
      solution: [
        "Lutz\u2019 Assistent fungiert als sein pers\u00F6nlicher E-Mail-T\u00FCrsteher. In der ersten Woche lernte er die Kommunikationsmuster: mit wem Lutz tats\u00E4chlich korrespondiert, welche Themen wichtig sind \u2014 Gesellschafterberichte, Steuerdokumente, Familie \u2014 und was L\u00E4rm ist.",
        "Jetzt f\u00E4ngt er jede eingehende E-Mail ab, bevor sie das Postfach erreicht. Legitime Nachrichten kommen sofort durch. Spam wird still archiviert mit einer w\u00F6chentlichen \u00DCbersicht, die er pr\u00FCfen kann, wenn er m\u00F6chte. Grenzf\u00E4lle \u2014 ein neuer Kontakt, ein unbekannter, aber m\u00F6glicherweise legitimer Absender \u2014 werden mit einer Einzeiler-Zusammenfassung markiert.",
        "Der Assistent k\u00FCmmert sich auch korrekt um Abmeldungen. Wenn er einen hartn\u00E4ckigen Newsletter identifiziert, bearbeitet er die Abmeldung und \u00FCberwacht die erneute Eintragung. Wenn der Absender die Abmeldung ignoriert, eskaliert er zu einer Blockierungsregel.",
      ],
      metrics: [
        { label: "Spam im Posteingang", before: "47/Tag", after: "0\u20132/Tag" },
        {
          label: "Zeit f\u00FCr E-Mail-Verwaltung",
          before: "45 Min./Tag",
          after: "< 5 Min./Tag",
        },
        {
          label: "Verpasste echte E-Mails",
          before: "\u2014",
          after: "0 (3 Monate)",
        },
        { label: "Phishing blockiert", before: "\u2014", after: "12 im 1. Monat" },
      ],
      quote:
        "Ich vertraue meinem Postfach wieder. Wenn mein Handy wegen einer E-Mail vibriert, wei\u00DF ich, dass es etwas ist, das wirklich wichtig ist. Dieses Gef\u00FChl hatte ich seit zehn Jahren nicht mehr.",
      broaderAppeal:
        "Das ist nicht nur Lutz\u2019 Problem. In ganz Deutschland ertrinken Unternehmer und Gesellschafter in ihren 60ern \u2014 Menschen, die Firmen aufgebaut haben, bevor E-Mail existierte \u2014 in digitalem L\u00E4rm, den sie nie bestellt haben. Sie wollen keine neue Software lernen. Sie wollen, dass das Problem verschwindet. Genau das macht ein Assistent: Er f\u00FCgt keine Komplexit\u00E4t hinzu, er entfernt sie.",
    },
    "franziska-splettstosser": {
      slug: "franziska-splettstosser",
      name: "Franziska Splettstö\u00DFer",
      role: "Apothekerin & Apothekenleitung",
      location: "Deutschland",
      tagline: "Slack-Team-Urlaubsplanung mit eigenen Eskalationsregeln",
      initials: "FS",
      headline:
        "Wie eine Apothekerin Urlaubschaos in einen Slack-Kanal ohne Konflikte verwandelt hat.",
      problem: [
        "Franziska Splettstö\u00DFer leitet eine Apotheke mit einem 17-köpfigen Team. Die Urlaubsplanung war Chaos: WhatsApp-Nachrichten mit \u201EKann ich n\u00E4chsten Donnerstag frei haben?\u201C, ein Papierkalender im Pausenraum, der nie aktuell war, und st\u00E4ndige Terminkonflikte, die erst auffielen, wenn jemand nicht auftauchte.",
        "In der Apotheke ist Unterbesetzung nicht nur \u00E4rgerlich \u2014 es ist ein Compliance-Problem. Deutsche Vorschriften verlangen jederzeit eine Mindestbesetzung mit Apothekern.",
        "Franziska verbrachte mehr als 3 Stunden pro Woche mit der Verwaltung von Urlaubsantr\u00E4gen, dem Abgleich der Besetzung und der Bew\u00E4ltigung unvermeidlicher Konflikte.",
      ],
      solution: [
        "Franziska verband ihren bestehenden Slack-Workspace mit einem dedizierten Urlaubsplanungskanal, der von ihrem Assistenten verwaltet wird. Teammitglieder reichen Urlaubsantr\u00E4ge in nat\u00FCrlicher Sprache ein \u2014 \u201EIch m\u00F6chte vom 18. bis 22. August frei nehmen.\u201C Der Assistent pr\u00FCft den Teamkalender, verifiziert die Mindestbesetzungsanforderungen, die Franziska selbst definiert hat, und genehmigt automatisch oder markiert Konflikte.",
        "Der Assistent f\u00FChrt auch einen Live-Urlaubskalender f\u00FCr das gesamte Team, sendet Erinnerungen vor genehmigten Urlauben und erstellt monatliche Besetzungsberichte.",
      ],
      escalationRules: [
        "Wenn die Besetzung unter 2 Apotheker pro Schicht f\u00E4llt \u2192 automatische Blockierung + Benachrichtigung an Franziska",
        "Wenn zwei Personen der gleichen Rolle \u00FCberlappende Daten beantragen \u2192 beide halten, Team benachrichtigen, Wer-zuerst-best\u00E4tigt gewinnt",
        "Wenn jemand weniger als 2 Wochen im Voraus frei beantragt \u2192 manuelle Genehmigung durch Franziska erforderlich",
        "Ferienzeiten (Weihnachten, Ostern) \u2192 alle Antr\u00E4ge werden gesammelt und von Franziska nach Dienstalter priorisiert genehmigt",
      ],
      metrics: [
        {
          label: "Terminkonflikte",
          before: "W\u00F6chentlich",
          after: "0",
        },
        {
          label: "Koordinationszeit",
          before: "3+ Std./Woche",
          after: "20 Min./Woche",
        },
        {
          label: "Besetzungsverst\u00F6\u00DFe",
          before: "2\u20133/Quartal",
          after: "0",
        },
        {
          label: "Teamzufriedenheit",
          before: "Frustrierend",
          after: "M\u00FChelos",
        },
      ],
      quote:
        "Ich habe meine Regeln einmal definiert und der Assistent setzt sie jedes Mal durch. Mein Team wei\u00DF genau, woran es ist, und ich verbringe meine Sonntage nicht mehr mit Dienstplan-Tetris.",
    },
    "thomas-berger": {
      slug: "thomas-berger",
      name: "Thomas Berger",
      role: "Elektriker-Meister & Betriebsinhaber",
      location: "Potsdam, Brandenburg",
      tagline: "Sprache-zu-Angebot-Assistent f\u00FCr Baudokumentation",
      initials: "TB",
      headline:
        "Wie ein Elektriker-Meister aus Potsdam seine Angebotszeit von 5 Stunden auf 45 Minuten pro Woche reduziert hat.",
      problem: [
        "Thomas Berger f\u00FChrt einen Elektro-Meisterbetrieb mit vier Mitarbeitern in Potsdam. Sein Team macht die Arbeit \u2014 Wohnungen neu verkabeln, Verteiler installieren, Diagnosen erstellen. Die Arbeit selbst ist nicht das Problem. Der Papierkram danach schon.",
        "Jeden Abend, nach einem vollen Tag auf Baustellen, sa\u00DF Thomas noch 2\u20133 Stunden am Schreibtisch: Aufma\u00DFe von Notizzetteln abtippen, Positionen kalkulieren, Materialpreise nachschlagen, PDFs formatieren. F\u00FCnf Angebote pro Woche, jedes brauchte eine Stunde oder mehr. Bis der Kunde das Angebot bekam, waren drei Tage vergangen \u2014 und in der H\u00E4lfte der F\u00E4lle hatte er schon jemand Schnelleren beauftragt.",
        "Er hat Diktier-Apps probiert. Die haben W\u00F6rter transkribiert, aber kein Elektrohandwerk verstanden. Er hat Vorlagen probiert. Die sparten 10 Minuten pro Angebot, mussten aber trotzdem komplett von Hand bef\u00FCllt werden. Der Engpass war nicht die Tippgeschwindigkeit \u2014 sondern die \u00DCbersetzung von dem, was er auf der Baustelle gesehen hat, in ein strukturiertes, kalkuliertes Dokument.",
      ],
      solution: [
        "Thomas\u2019 Assistent fungiert als sein Dokumentationspartner. Auf der Baustelle spricht er eine Sprachnotiz ein: \u201EDrei-Zimmer-Wohnung, komplett neu verkabeln, Bestandsverteiler aus den 70ern, muss auf 63A aufger\u00FCstet werden, circa 120 Meter NYM-J 3x2,5.\u201C Der Assistent macht daraus einen strukturierten Angebotsentwurf \u2014 korrekte Positionen, aktuelle Materialpreise, Arbeitszeitsch\u00E4tzungen auf Basis von Thomas\u2019 eigenen Stundens\u00E4tzen.",
        "Wenn etwas unklar ist \u2014 fehlende Raumzahl, unklare Verteilerspezifikation \u2014 stellt der Assistent eine R\u00FCckfrage per WhatsApp, statt zu raten. Thomas pr\u00FCft den Entwurf, passt bei Bedarf an und schickt ihn raus. Der gesamte Prozess dauert 8\u201310 Minuten statt \u00FCber 60.",
        "Der Assistent verfolgt auch gesendete Angebote und markiert die, auf die nach 48 Stunden keine Antwort gekommen ist, damit Thomas nachfassen kann, solange sich der Kunde noch an das Gespr\u00E4ch erinnert.",
      ],
      metrics: [
        { label: "Angebotszeit/Woche", before: "5+ Std.", after: "45 Min." },
        { label: "Angebote am gleichen Tag", before: "20%", after: "85%" },
        { label: "Angebot-zu-Auftrag-Rate", before: "~30%", after: "52%" },
        {
          label: "Abendliche B\u00FCroarbeit",
          before: "2\u20133 Std./Tag",
          after: "< 20 Min./Tag",
        },
      ],
      quote:
        "Fr\u00FCher habe ich Auftr\u00E4ge an Elektriker verloren, die einfach schneller ein Angebot geschickt haben. Jetzt gehen meine Angebote am selben Tag raus \u2014 und sie sehen professioneller aus als alles, was ich in drei Stunden h\u00E4tte tippen k\u00F6nnen.",
    },
    "kirsten-hoener-march": {
      slug: "kirsten-hoener-march",
      name: "Kirsten H\u00F6ner-March",
      role: "Fachanw\u00E4ltin f\u00FCr Arbeits- & Sozialrecht",
      location: "Eberswalde, Brandenburg",
      tagline: "KI-Empfang mit 4-Stufen-Lead-Klassifizierung",
      initials: "KH",
      headline:
        "Wie eine Fachanw\u00E4ltin in Eberswalde aufgeh\u00F6rt hat, Mandanten an ihre Sprechzeiten zu verlieren.",
      problem: [
        "Kirsten H\u00F6ner-March f\u00FChrt eine Einzelkanzlei in Eberswalde, spezialisiert auf Arbeits- und Sozialrecht. Sie hat eine Assistentin, die w\u00E4hrend der Sprechzeiten ans Telefon geht \u2014 aber Sprechzeiten sind nur etwa 22 Stunden pro Woche. Montag bis Donnerstag vormittags, dazu Dienstag nachmittags. Den Rest der Zeit geht niemand ran.",
        "Ihre Mandanten rufen typischerweise in einer Krise an \u2014 sie wurden gerade gek\u00FCndigt, ihnen wurde Erwerbsminderungsrente verweigert, oder sie haben ein Schreiben bekommen, das sie nicht verstehen. F\u00FCr sie ist der Anruf bei einer Anw\u00E4ltin keine Formalit\u00E4t. Es ist dringend. Aber Krisen richten sich nicht nach Sprechzeiten. Und auch w\u00E4hrend der Sprechzeiten kommt das Leben dazwischen: Die Assistentin ist im Urlaub, krank, in der Mittagspause oder bereits im Gespr\u00E4ch.",
        "Menschen in rechtlicher Not hinterlassen keine Nachrichten \u2014 sie rufen den n\u00E4chsten Namen bei Google an. Jede L\u00FCcke in der Erreichbarkeit ist ein potenzielles Mandat, das verloren geht.",
      ],
      solution: [
        "Kirsten und ihre Assistentin haben gemeinsam einen KI-Assistenten trainiert, der Anrufe genau so behandelt wie sie selbst. Zusammen haben sie den Ton, die Eskalationslogik und ein 4-Stufen-Klassifizierungssystem definiert, das eine K\u00FCndigungsschutzklage von einem Werbeanruf unterscheidet \u2014 etwas, das kein externer Sekretariatsservice leisten konnte.",
        "Jetzt \u00FCbernimmt der Assistent nahtlos, wenn das Leben dazwischenkommt: abends, am Wochenende, an Feiertagen, bei Krankheit, in der Mittagspause oder wenn die Assistentin bereits im Gespr\u00E4ch ist. Er klassifiziert jeden Anrufer, bucht qualifizierte Beratungen direkt in Kirstens Kalender, erfasst Falldetails f\u00FCr priorisierte R\u00FCckrufe und wickelt Werbeanrufe freundlich ab. Wenn er einen Anrufer nicht sicher einordnen kann, eskaliert er direkt an Kirsten, statt zu raten.",
        "Das Ergebnis: Kirstens Kanzlei ist immer erreichbar, ihr Kalender f\u00FCllt sich mit qualifizierten Beratungen, und weder sie noch ihre Assistentin m\u00FCssen sich zwischen dem Telefon und der Person vor ihnen entscheiden.",
      ],
      escalationRules: [
        "Stufe A \u2014 Soforttermin: Anrufer schildert laufenden Arbeitsstreit, K\u00FCndigung oder Leistungsablehnung mit klarem Rechtsbedarf \u2192 Assistent bucht den n\u00E4chsten verf\u00FCgbaren Beratungstermin",
        "Stufe B \u2014 Priorisierter R\u00FCckruf: Anrufer hat eine rechtliche Frage im Fachgebiet, aber keine akute Krise \u2192 Assistent erfasst Falldetails und plant ein R\u00FCckruffenster",
        "Stufe C \u2014 Information & Einsch\u00E4tzung: Anliegen des Anrufers unklar oder m\u00F6glicherweise au\u00DFerhalb der Spezialisierung \u2192 Assistent sammelt Informationen und markiert zur Pr\u00FCfung durch Kirsten",
        "Stufe D \u2014 Keine Aktion: Werbeanrufe, falsche Nummern oder Angelegenheiten au\u00DFerhalb des Fachgebiets \u2192 freundlich abgewickelt, kein Termin, keine Eskalation",
      ],
      metrics: [
        { label: "Erreichbarkeit", before: "~22 Std./Woche", after: "24/7" },
        {
          label: "Qualifizierte Beratungen/Mo.",
          before: "~12",
          after: "22",
        },
        {
          label: "Anrufe w\u00E4hrend Beratungen",
          before: "8\u201310/Tag",
          after: "0",
        },
        { label: "Zeit f\u00FCr Anrufe filtern", before: "~1,5 Std./Tag", after: "0" },
      ],
      quote:
        "Meine Assistentin und ich haben ihn gemeinsam trainiert. Er wei\u00DF genau, wie wir arbeiten \u2014 wer einen Termin bekommt, wer einen R\u00FCckruf, wer ein freundliches Gespr\u00E4chsende. Fr\u00FCher landete die H\u00E4lfte unserer Anrufer auf dem AB und rief nie wieder an. Jetzt h\u00F6rt immer jemand zu, auch wenn wir gerade nicht k\u00F6nnen.",
      broaderAppeal:
        "Kirstens Situation ist typisch f\u00FCr Deutschland: Zehntausende Einzelanw\u00E4lte und kleine Kanzleien haben gute Teams, aber begrenzte Sprechzeiten. Ihre Mandanten befinden sich oft in einer Krise \u2014 rechtlich, gesundheitlich, finanziell \u2014 und ein verpasster Anruf ist nicht nur verlorener Umsatz, sondern jemand, der Hilfe brauchte und keine bekam. Ein KI-Assistent ersetzt nicht das Team. Er sorgt daf\u00FCr, dass niemand durch die L\u00FCcken f\u00E4llt, wenn das Leben dazwischenkommt.",
    },
  },
};

const _deParityCheck: CaseStudyTranslations = de;
void _deParityCheck;

export const caseStudyTranslations = {
  en,
  de,
} as const;

export const CASE_STUDY_SLUGS = [
  "marcus-engel",
  "lutz-splettstosser",
  "franziska-splettstosser",
  "thomas-berger",
  "kirsten-hoener-march",
] as const;

export type CaseStudySlug = (typeof CASE_STUDY_SLUGS)[number];
