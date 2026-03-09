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
    headline: "Ready to build yours?",
    text: "Every agent is built from scratch around one business. Yours.",
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
        "Marcus\u2019s agent acts as his virtual receptionist. It knows every active listing, every price point, every neighborhood detail. When a call comes in that Marcus can\u2019t take, the agent answers in his professional style, qualifies the lead \u2014 budget, timeline, property type \u2014 answers listing-specific questions, and books viewings directly into his calendar.",
        "After each interaction, Marcus gets a structured summary. Not a voicemail he has to decode, but a qualified lead brief with next steps already suggested.",
        "The agent also handles follow-ups. If a prospect viewed a property but hasn\u2019t been in touch for three days, it sends a personalized check-in. If a new listing matches a prospect\u2019s criteria, it notifies them before it hits the portals.",
      ],
      metrics: [
        { label: "Missed calls", before: "34%", after: "2%" },
        { label: "Lead response time", before: "4+ hours", after: "< 3 min" },
        { label: "Viewings booked/mo", before: "14", after: "23" },
        { label: "Deals closed/quarter", before: "4", after: "7" },
      ],
      quote:
        "I was losing deals to agents who simply picked up the phone faster. Now my agent picks up faster than anyone \u2014 and it actually knows what it\u2019s talking about.",
    },
    "lutz-splettstosser": {
      slug: "lutz-splettstosser",
      name: "Lutz Splettstö\u00DFer",
      role: "Retired Pharmacist & Gesellschafter",
      location: "Germany",
      tagline: "Personal Email SPAM Blocker Agent",
      initials: "LS",
      headline:
        "How a retired pharmacist reclaimed his inbox \u2014 and his mornings.",
      problem: [
        "Lutz Splettstö\u00DFer is a retired pharmacist who still holds Gesellschafter positions in several businesses. At 67, he remembers when email was a professional communication tool \u2014 not a garbage dump.",
        "Every morning, he opens his inbox to 40\u201360 emails: newsletter subscriptions he never signed up for, promotional offers from companies he bought from once five years ago, phishing attempts disguised as bank notices, and the occasional actual message from a business partner buried somewhere in the noise.",
        "He\u2019s tried spam filters, rules, unsubscribe links that lead to more spam. Nothing sticks. For business owners and Gesellschafter in their 60s, this isn\u2019t a minor annoyance \u2014 it\u2019s a daily assault on their time and attention that makes them distrust their own inbox.",
      ],
      solution: [
        "Lutz\u2019s agent acts as his personal email gatekeeper. It learned his communication patterns in the first week: who he actually corresponds with, which topics matter \u2014 Gesellschafter reports, tax documents, family \u2014 and what\u2019s noise.",
        "Now it intercepts every incoming email before it hits his inbox. Legitimate messages pass through instantly. Spam gets silently archived with a weekly digest he can review if he wants. Borderline cases \u2014 a new contact, an unfamiliar but potentially legitimate sender \u2014 get flagged with a one-line summary so he can decide in seconds, not minutes.",
        "The agent also handles unsubscription properly. When it identifies a persistent newsletter or marketing sender, it processes the unsubscribe and monitors for re-enrollment. If the sender ignores the unsubscribe, it escalates to a blocking rule.",
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
        "This isn\u2019t just Lutz\u2019s problem. Across Germany, business owners and Gesellschafter in their 60s \u2014 people who built companies before email existed \u2014 are drowning in digital noise they never asked for. They don\u2019t want to learn new software. They want the problem to go away. That\u2019s exactly what an agent does: it doesn\u2019t add complexity, it removes it.",
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
        "Franziska connected her existing Slack workspace to a dedicated vacation planning channel managed by her agent. Team members submit vacation requests in natural language \u2014 \u201CI\u2019d like to take August 18\u201322 off.\u201D The agent checks against the team calendar, verifies minimum coverage requirements that Franziska defined herself, and either approves automatically or flags conflicts.",
        "The agent also maintains a live vacation calendar visible to the entire team, sends reminders before approved vacations, and generates monthly coverage reports.",
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
        "I defined my rules once and the agent enforces them every time. My team knows exactly where they stand, and I don\u2019t spend my Sundays doing schedule Tetris anymore.",
    },
    "dirk-linke": {
      slug: "dirk-linke",
      name: "Dirk Linke",
      role: "Independent Trader & Investor",
      location: "Germany",
      tagline: "Polymarket Prediction Market Trading Agent",
      initials: "DL",
      headline:
        "How a prediction market trader turned 4 hours of daily research into 15-minute decision briefs.",
      problem: [
        "Dirk Linke trades prediction markets on Polymarket \u2014 binary outcome markets on everything from Fed rate decisions to election results. The opportunity is arbitrage: finding markets where the crowd-priced probability diverges significantly from reality.",
        "But finding these opportunities requires monitoring hundreds of markets simultaneously, cross-referencing with real-world data sources, and acting fast before the edge disappears.",
        "Dirk was spending 4+ hours daily on manual research, scrolling through markets, reading analysis, and still missing opportunities because he couldn\u2019t process information fast enough.",
      ],
      solution: [
        "Dirk\u2019s agent runs the full Polymarket research and trading pipeline natively. It continuously discovers markets, scores arbitrage opportunities using a multi-factor model \u2014 edge magnitude, liquidity depth, volume momentum, model confidence \u2014 and builds risk-bounded position plans.",
        "The system operates on a strict governance framework: paper trading is fully autonomous, but live execution requires explicit approval with an auditable approval artifact.",
        "When the agent identifies a position with >350 bps expected edge and sufficient liquidity, it presents Dirk with a one-page brief: market question, recommended side, stake size, expected edge, and confidence score. Dirk approves or passes. The entire decision takes 30 seconds instead of 30 minutes.",
      ],
      researchLoop: [
        {
          title: "Market Discovery",
          description:
            "Scans the full market universe, filters by liquidity, volume, and category",
        },
        {
          title: "Opportunity Scoring",
          description:
            "Compares market-priced probability against model probability, weights by liquidity and volume depth",
        },
        {
          title: "Position Planning",
          description:
            "Allocates risk budget across top opportunities with per-position caps",
        },
        {
          title: "Execution Simulation",
          description:
            "Paper-trades every position plan before Dirk sees it, with full audit trail",
        },
      ],
      metrics: [
        { label: "Markets monitored", before: "~20", after: "200+" },
        { label: "Avg identified edge", before: "\u2014", after: "380 bps" },
        { label: "Research time", before: "4+ hrs/day", after: "15 min/day" },
        {
          label: "Paper portfolio (6mo)",
          before: "\u2014",
          after: "+23.4%",
        },
      ],
      quote:
        "The agent does in seconds what used to take me hours \u2014 scanning hundreds of markets, scoring opportunities, and presenting me with exactly the positions worth taking. I just approve or pass.",
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
    headline: "Bereit, Ihren eigenen zu bauen?",
    text: "Jeder Agent wird von Grund auf f\u00FCr ein Unternehmen gebaut. Ihres.",
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
        "Marcus\u2019 Agent fungiert als sein virtueller Empfang. Er kennt jedes aktive Objekt, jeden Preis, jedes Stadtviertel-Detail. Wenn ein Anruf kommt, den Marcus nicht annehmen kann, antwortet der Agent in seinem professionellen Stil, qualifiziert den Lead \u2014 Budget, Zeitrahmen, Objekttyp \u2014 beantwortet objektspezifische Fragen und bucht Besichtigungen direkt in seinen Kalender.",
        "Nach jeder Interaktion bekommt Marcus eine strukturierte Zusammenfassung. Keine Mailbox, die er entschl\u00FCsseln muss, sondern ein qualifiziertes Lead-Briefing mit bereits vorgeschlagenen n\u00E4chsten Schritten.",
        "Der Agent \u00FCbernimmt auch die Nachverfolgung. Wenn ein Interessent ein Objekt besichtigt hat, aber seit drei Tagen nicht in Kontakt war, schickt er eine personalisierte R\u00FCckmeldung. Wenn ein neues Objekt zu den Kriterien eines Interessenten passt, benachrichtigt er ihn, bevor es auf den Portalen erscheint.",
      ],
      metrics: [
        { label: "Verpasste Anrufe", before: "34%", after: "2%" },
        { label: "Lead-Antwortzeit", before: "4+ Stunden", after: "< 3 Min." },
        { label: "Besichtigungen/Monat", before: "14", after: "23" },
        { label: "Abschl\u00FCsse/Quartal", before: "4", after: "7" },
      ],
      quote:
        "Ich habe Gesch\u00E4fte an Makler verloren, die einfach schneller ans Telefon gegangen sind. Jetzt nimmt mein Agent schneller ab als jeder andere \u2014 und er wei\u00DF tats\u00E4chlich, wovon er spricht.",
    },
    "lutz-splettstosser": {
      slug: "lutz-splettstosser",
      name: "Lutz Splettstö\u00DFer",
      role: "Apotheker i.R. & Gesellschafter",
      location: "Deutschland",
      tagline: "Pers\u00F6nlicher E-Mail-SPAM-Blocker-Agent",
      initials: "LS",
      headline:
        "Wie ein Apotheker im Ruhestand sein Postfach zur\u00FCckerobert hat \u2014 und seine Morgenroutine.",
      problem: [
        "Lutz Splettstö\u00DFer ist ein Apotheker im Ruhestand, der noch Gesellschafteranteile an mehreren Unternehmen h\u00E4lt. Mit 67 erinnert er sich an die Zeit, als E-Mail ein professionelles Kommunikationswerkzeug war \u2014 keine M\u00FClldeponie.",
        "Jeden Morgen \u00F6ffnet er sein Postfach und findet 40\u201360 E-Mails: Newsletter-Abonnements, die er nie abgeschlossen hat, Werbeangebote von Firmen, bei denen er vor f\u00FCnf Jahren einmal gekauft hat, Phishing-Versuche als Bankmitteilungen getarnt, und die gelegentliche echte Nachricht eines Gesch\u00E4ftspartners, irgendwo im L\u00E4rm begraben.",
        "Er hat Spam-Filter probiert, Regeln, Abmeldelinks, die zu mehr Spam f\u00FChren. Nichts h\u00E4lt. F\u00FCr Unternehmer und Gesellschafter in ihren 60ern ist das keine Kleinigkeit \u2014 es ist ein t\u00E4glicher Angriff auf ihre Zeit und Aufmerksamkeit, der sie ihr eigenes Postfach misstrauen l\u00E4sst.",
      ],
      solution: [
        "Lutz\u2019 Agent fungiert als sein pers\u00F6nlicher E-Mail-T\u00FCrsteher. In der ersten Woche lernte er die Kommunikationsmuster: mit wem Lutz tats\u00E4chlich korrespondiert, welche Themen wichtig sind \u2014 Gesellschafterberichte, Steuerdokumente, Familie \u2014 und was L\u00E4rm ist.",
        "Jetzt f\u00E4ngt er jede eingehende E-Mail ab, bevor sie das Postfach erreicht. Legitime Nachrichten kommen sofort durch. Spam wird still archiviert mit einer w\u00F6chentlichen \u00DCbersicht, die er pr\u00FCfen kann, wenn er m\u00F6chte. Grenzf\u00E4lle \u2014 ein neuer Kontakt, ein unbekannter, aber m\u00F6glicherweise legitimer Absender \u2014 werden mit einer Einzeiler-Zusammenfassung markiert.",
        "Der Agent k\u00FCmmert sich auch korrekt um Abmeldungen. Wenn er einen hartn\u00E4ckigen Newsletter identifiziert, bearbeitet er die Abmeldung und \u00FCberwacht die erneute Eintragung. Wenn der Absender die Abmeldung ignoriert, eskaliert er zu einer Blockierungsregel.",
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
        "Das ist nicht nur Lutz\u2019 Problem. In ganz Deutschland ertrinken Unternehmer und Gesellschafter in ihren 60ern \u2014 Menschen, die Firmen aufgebaut haben, bevor E-Mail existierte \u2014 in digitalem L\u00E4rm, den sie nie bestellt haben. Sie wollen keine neue Software lernen. Sie wollen, dass das Problem verschwindet. Genau das macht ein Agent: Er f\u00FCgt keine Komplexit\u00E4t hinzu, er entfernt sie.",
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
        "Franziska verband ihren bestehenden Slack-Workspace mit einem dedizierten Urlaubsplanungskanal, der von ihrem Agenten verwaltet wird. Teammitglieder reichen Urlaubsantr\u00E4ge in nat\u00FCrlicher Sprache ein \u2014 \u201EIch m\u00F6chte vom 18. bis 22. August frei nehmen.\u201C Der Agent pr\u00FCft den Teamkalender, verifiziert die Mindestbesetzungsanforderungen, die Franziska selbst definiert hat, und genehmigt automatisch oder markiert Konflikte.",
        "Der Agent f\u00FChrt auch einen Live-Urlaubskalender f\u00FCr das gesamte Team, sendet Erinnerungen vor genehmigten Urlauben und erstellt monatliche Besetzungsberichte.",
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
        "Ich habe meine Regeln einmal definiert und der Agent setzt sie jedes Mal durch. Mein Team wei\u00DF genau, woran es ist, und ich verbringe meine Sonntage nicht mehr mit Dienstplan-Tetris.",
    },
    "dirk-linke": {
      slug: "dirk-linke",
      name: "Dirk Linke",
      role: "Unabh\u00E4ngiger Trader & Investor",
      location: "Deutschland",
      tagline: "Polymarket Prognosemarkt-Handelsagent",
      initials: "DL",
      headline:
        "Wie ein Prognosemarkt-Trader 4 Stunden t\u00E4gliche Recherche in 15-Minuten-Entscheidungsbriefings verwandelt hat.",
      problem: [
        "Dirk Linke handelt Prognosem\u00E4rkte auf Polymarket \u2014 Bin\u00E4r-Ergebnis-M\u00E4rkte f\u00FCr alles von Fed-Zinsentscheidungen bis zu Wahlergebnissen. Die Chance liegt in der Arbitrage: M\u00E4rkte zu finden, in denen die Crowd-Wahrscheinlichkeit signifikant von der Realit\u00E4t abweicht.",
        "Aber diese Gelegenheiten zu finden erfordert die gleichzeitige \u00DCberwachung von Hunderten von M\u00E4rkten, den Abgleich mit Echtzeit-Datenquellen und schnelles Handeln, bevor der Vorteil verschwindet.",
        "Dirk verbrachte t\u00E4glich 4+ Stunden mit manueller Recherche, scrollte durch M\u00E4rkte, las Analysen und verpasste trotzdem Gelegenheiten, weil er Informationen nicht schnell genug verarbeiten konnte.",
      ],
      solution: [
        "Dirks Agent betreibt die gesamte Polymarket-Research- und Trading-Pipeline nativ. Er entdeckt kontinuierlich M\u00E4rkte, bewertet Arbitrage-Gelegenheiten mit einem Mehrfaktor-Modell \u2014 Edge-Gr\u00F6\u00DFe, Liquidit\u00E4tstiefe, Volumen-Momentum, Modellkonfidenz \u2014 und erstellt risikobegrenzte Positionspl\u00E4ne.",
        "Das System arbeitet mit einem strikten Governance-Rahmen: Paper-Trading ist vollst\u00E4ndig autonom, aber Live-Ausf\u00FChrung erfordert eine explizite Genehmigung mit einem pr\u00FCfbaren Genehmigungsartefakt.",
        "Wenn der Agent eine Position mit >350 bps erwartetem Edge und ausreichender Liquidit\u00E4t identifiziert, pr\u00E4sentiert er Dirk ein einseitiges Briefing: Marktfrage, empfohlene Seite, Einsatzgr\u00F6\u00DFe, erwarteter Edge und Konfidenzwert. Dirk genehmigt oder passt. Die gesamte Entscheidung dauert 30 Sekunden statt 30 Minuten.",
      ],
      researchLoop: [
        {
          title: "Marktentdeckung",
          description:
            "Scannt das gesamte Marktuniversum, filtert nach Liquidit\u00E4t, Volumen und Kategorie",
        },
        {
          title: "Chancenbewertung",
          description:
            "Vergleicht marktbepreiste Wahrscheinlichkeit mit Modellwahrscheinlichkeit, gewichtet nach Liquidit\u00E4ts- und Volumentiefe",
        },
        {
          title: "Positionsplanung",
          description:
            "Verteilt Risikobudget auf die besten Gelegenheiten mit Positions-Obergrenzen",
        },
        {
          title: "Ausf\u00FChrungssimulation",
          description:
            "Paper-tradet jeden Positionsplan, bevor Dirk ihn sieht, mit vollst\u00E4ndigem Audit-Trail",
        },
      ],
      metrics: [
        { label: "\u00DCberwachte M\u00E4rkte", before: "~20", after: "200+" },
        { label: "Durchschn. Edge", before: "\u2014", after: "380 bps" },
        { label: "Recherchezeit", before: "4+ Std./Tag", after: "15 Min./Tag" },
        {
          label: "Paper-Portfolio (6 Mo.)",
          before: "\u2014",
          after: "+23,4%",
        },
      ],
      quote:
        "Der Agent macht in Sekunden, was mich fr\u00FCher Stunden gekostet hat \u2014 Hunderte von M\u00E4rkten scannen, Chancen bewerten und mir genau die Positionen pr\u00E4sentieren, die sich lohnen. Ich genehmige oder passe.",
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
  "dirk-linke",
] as const;

export type CaseStudySlug = (typeof CASE_STUDY_SLUGS)[number];
