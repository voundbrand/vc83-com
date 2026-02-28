"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import { OperatorChat } from "@/components/operator-chat"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSwitcher, type Language } from "@/components/language-switcher"
import { Button } from "@/components/ui/button"
import {
  Apple,
  Monitor,
  Globe,
  MessageCircle,
  ArrowRight,
  TrendingUp,
  Clock,
  Target,
  Percent,
  MessageSquare,
  Mail,
  Phone,
  Cloud,
  Server,
  Cpu,
  Lock,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react"

// Translations
const translations = {
  en: {
    // Header
    ctaButton: "Get Started",
    // Hook
    headline: "Private AI. You can Trust.",
    subheadline: "One operator. Yours alone. Built on everything you know.",
    action: "Talk to it. Right now. On this page.",
    // Problem
    problem1: "You spent 45 minutes this Monday figuring out your cash position. You'll do it again next Monday. That's 39 hours a year of the most expensive person in the company doing a calculator's job.",
    problem2: "You've hired VAs. You've tried ChatGPT. You've bought software that promised to change everything and added one more login to manage. The problem isn't the tools. The problem is that nothing you've tried can hold what you carry in your head — the context, the instincts, the relationship memory that makes your business",
    problem2emphasis: "yours.",
    problem3: "Every tool you own holds one slice. None of them see the full picture. You do. And that's why you're still the bottleneck.",
    // Shift
    shift1: "We didn't build another tool. We built an operator — a single AI system that learns your business the way you know your business. Not as isolated functions. As one connected thing where sales affects operations affects cash flow affects your Tuesday decisions.",
    shift2: "It starts by listening. Within a week, it starts suggesting. Within a month, it operates in your voice. Within six months, it catches patterns you haven't noticed yet. One operator. Yours. Built on you.",
    // Chat
    chatHeadline: "Don't take our word for it. Talk to it.",
    chatSubheadline: "Private AI that learns your business in seven minutes. Tell it who you are. It will find the highest-leverage workflow you should automate first. It's yours whether you work with us or not.",
    // Proof
    proofHeadline: "The numbers speak",
    hoursWeek: "Hours/week",
    closeRate: "Close rate",
    websiteConversion: "Website conversion",
    roas: "ROAS",
    cartRecovery: "Cart recovery",
    recoveredMo: "Recovered/mo",
    // Paths
    pathsHeadline: "Three paths forward",
    startFree: "Start Free",
    startFreeDesc: "Download the app. Your operator begins learning you today. Free tier includes core interactions. Upgrade when you're ready.",
    doneWithYou: "Done With You",
    doneWithYouPrice: "€2,500 to start",
    doneWithYouDesc: "I personally build your operator around the workflow we identified in your audit. Live in 7 days. We build out from there.",
    fullBuild: "Full Build",
    fullBuildPrice: "Projects from €5,000",
    fullBuildDesc: "Custom operator deployment across your entire operation. Calendar, CRM, finance, client comms — all connected through one operator.",
    startConversation: "Start a conversation",
    // Personal note
    personalNote: "\"I'm not an AI consultant. I'm a technologist who builds private AI. The difference is I use mine every day to run a real business. Not a deck. The thing.\"",
    // Why sections
    whyNotCall: "Why not a discovery call?",
    whyNotCallText: "You've sat through enough discovery calls to know how they work. Fifteen minutes of \"tell me about your business,\" then thirty minutes of pitch. We don't do that. The operator you just talked to is the discovery. It asked you five questions and delivered a specific workflow. That's more value than most consultants provide in a paid engagement. If you want to work together, start a conversation. If you don't, keep the workflow. It's yours.",
    whyOneOperator: "Why one operator instead of many tools?",
    whyOneOperatorText: "Every tool you add is another thing that doesn't know what the other things know. You end up being the integration layer — the human middleware between twelve systems that can't talk to each other. One operator sees the full picture. Sales, operations, finance, client relationships — all as one connected understanding.",
    // Your operator everywhere
    operatorEverywhereHeadline: "Your operator, everywhere",
    iphoneDesc: "Your operator in your pocket. Voice-first. Ask it anything about your business on the go.",
    macosDesc: "Full desktop experience. Deep work. Document review. Strategy sessions with your operator.",
    webAppDesc: "Access from anywhere. No download required. Full capability.",
    operatorEverywhereTagline: "Private AI. Same operator. Same memory. Same context. Every platform.",
    // Integrations
    integrationsHeadline: "Connect everything you use",
    integrationsSubheadline: "Your operator speaks to your tools. Not the other way around.",
    communicationChannels: "Communication",
    workspaceTools: "Workspace",
    automationPlatforms: "Automation",
    aiModels: "AI Models",
    comingSoon: "Coming Soon",
    andMore: "and more",
    // Privacy
    privacyHeadline: "Your data. Your hardware. Your rules.",
    privacySubheadline: "Class 1 privacy means your data never leaves your control. Choose how private you want to be.",
    cloudOption: "Cloud",
    cloudOptionDesc: "Encrypted, isolated instances on our infrastructure. Your data is never used to train models. Delete anytime.",
    localOption: "Local Hardware",
    localOptionDesc: "Run your operator on your own hardware. Mac Mini, Mac Studio, or any Apple Silicon device. Complete air-gap possible.",
    enterpriseOption: "Enterprise GPU",
    enterpriseOptionDesc: "NVIDIA RTX, A100, H100 — run frontier-class models entirely on-premise. No data leaves your building.",
    bringYourOwn: "Bring Your Own Model",
    bringYourOwnDesc: "Connect any model through OpenRouter. Use open-source. Use custom fine-tunes. Use whatever you trust.",
    privacyTagline: "Fully supported by a technologist who understands why privacy matters. Not a sales team. A builder.",
    // Footer
    footerTagline: "One operator. Built on you.",
    footerCopyright: "sevenlayers. All rights reserved.",
  },
  de: {
    // Header
    ctaButton: "Jetzt starten",
    // Hook
    headline: "Private KI. Der Sie vertrauen können.",
    subheadline: "Ein Operator. Nur für Sie. Aufgebaut auf allem, was Sie wissen.",
    action: "Sprechen Sie jetzt damit. Hier auf dieser Seite.",
    // Problem
    problem1: "Sie haben diesen Montag 45 Minuten damit verbracht, Ihre Liquidität zu ermitteln. Nächsten Montag werden Sie es wieder tun. Das sind 39 Stunden pro Jahr, in denen die teuerste Person im Unternehmen die Arbeit eines Taschenrechners erledigt.",
    problem2: "Sie haben VAs eingestellt. Sie haben ChatGPT ausprobiert. Sie haben Software gekauft, die alles verändern sollte und nur einen weiteren Login hinzugefügt hat. Das Problem sind nicht die Tools. Das Problem ist, dass nichts, was Sie ausprobiert haben, das halten kann, was Sie im Kopf haben — den Kontext, die Instinkte, das Beziehungsgedächtnis, das Ihr Unternehmen zu",
    problem2emphasis: "Ihrem macht.",
    problem3: "Jedes Tool, das Sie besitzen, hält nur einen Teil. Keines sieht das vollständige Bild. Sie schon. Und deshalb sind Sie immer noch der Engpass.",
    // Shift
    shift1: "Wir haben kein weiteres Tool gebaut. Wir haben einen Operator gebaut — ein einzelnes KI-System, das Ihr Unternehmen so lernt, wie Sie es kennen. Nicht als isolierte Funktionen. Als eine verbundene Sache, bei der Vertrieb die Abläufe beeinflusst, die den Cashflow beeinflussen, der Ihre Dienstagsentscheidungen beeinflusst.",
    shift2: "Es beginnt mit Zuhören. Innerhalb einer Woche beginnt es, Vorschläge zu machen. Innerhalb eines Monats arbeitet es mit Ihrer Stimme. Innerhalb von sechs Monaten erkennt es Muster, die Sie noch nicht bemerkt haben. Ein Operator. Ihrer. Auf Sie aufgebaut.",
    // Chat
    chatHeadline: "Glauben Sie uns nicht. Sprechen Sie damit.",
    chatSubheadline: "Private KI, die Ihr Unternehmen in sieben Minuten lernt. Erzählen Sie, wer Sie sind. Sie wird den Workflow mit dem höchsten Hebel finden, den Sie zuerst automatisieren sollten. Er gehört Ihnen, ob Sie mit uns arbeiten oder nicht.",
    // Proof
    proofHeadline: "Die Zahlen sprechen",
    hoursWeek: "Stunden/Woche",
    closeRate: "Abschlussquote",
    websiteConversion: "Website-Conversion",
    roas: "ROAS",
    cartRecovery: "Warenkorbrettung",
    recoveredMo: "Gerettet/Monat",
    // Paths
    pathsHeadline: "Drei Wege nach vorn",
    startFree: "Kostenlos starten",
    startFreeDesc: "Laden Sie die App herunter. Ihr Operator beginnt heute, Sie kennenzulernen. Der kostenlose Tarif umfasst Kerninteraktionen. Upgraden Sie, wenn Sie bereit sind.",
    doneWithYou: "Gemeinsam umgesetzt",
    doneWithYouPrice: "Ab €2.500",
    doneWithYouDesc: "Ich baue persönlich Ihren Operator um den Workflow, den wir in Ihrem Audit identifiziert haben. In 7 Tagen live. Von dort aus bauen wir weiter.",
    fullBuild: "Vollständiger Aufbau",
    fullBuildPrice: "Projekte ab €5.000",
    fullBuildDesc: "Individuelle Operator-Bereitstellung für Ihren gesamten Betrieb. Kalender, CRM, Finanzen, Kundenkommunikation — alles verbunden durch einen Operator.",
    startConversation: "Gespräch beginnen",
    // Personal note
    personalNote: "\"Ich bin kein KI-Berater. Ich bin ein Technologe, der private KI baut. Der Unterschied ist, dass ich meine jeden Tag nutze, um ein echtes Unternehmen zu führen. Kein Pitch-Deck. Das echte Ding.\"",
    // Why sections
    whyNotCall: "Warum kein Erstgespräch?",
    whyNotCallText: "Sie haben genug Erstgespräche mitgemacht, um zu wissen, wie sie ablaufen. Fünfzehn Minuten \"erzählen Sie von Ihrem Unternehmen\", dann dreißig Minuten Pitch. Das machen wir nicht. Der Operator, mit dem Sie gerade gesprochen haben, ist das Erstgespräch. Er hat Ihnen fünf Fragen gestellt und einen konkreten Workflow geliefert. Das ist mehr Wert als die meisten Berater in einem bezahlten Auftrag liefern. Wenn Sie zusammenarbeiten möchten, beginnen Sie ein Gespräch. Wenn nicht, behalten Sie den Workflow. Er gehört Ihnen.",
    whyOneOperator: "Warum ein Operator statt vieler Tools?",
    whyOneOperatorText: "Jedes Tool, das Sie hinzufügen, ist eine weitere Sache, die nicht weiß, was die anderen Dinge wissen. Sie werden zur Integrationsschicht — die menschliche Middleware zwischen zwölf Systemen, die nicht miteinander kommunizieren können. Ein Operator sieht das vollständige Bild. Vertrieb, Abläufe, Finanzen, Kundenbeziehungen — alles als ein verbundenes Verständnis.",
    // Your operator everywhere
    operatorEverywhereHeadline: "Ihr Operator, überall",
    iphoneDesc: "Ihr Operator in der Tasche. Sprachgesteuert. Fragen Sie unterwegs alles über Ihr Unternehmen.",
    macosDesc: "Volle Desktop-Erfahrung. Konzentrierte Arbeit. Dokumentenprüfung. Strategiesitzungen mit Ihrem Operator.",
    webAppDesc: "Zugriff von überall. Kein Download erforderlich. Volle Funktionalität.",
    operatorEverywhereTagline: "Private KI. Derselbe Operator. Dasselbe Gedächtnis. Derselbe Kontext. Jede Plattform.",
    // Integrations
    integrationsHeadline: "Verbinden Sie alles, was Sie nutzen",
    integrationsSubheadline: "Ihr Operator spricht mit Ihren Tools. Nicht umgekehrt.",
    communicationChannels: "Kommunikation",
    workspaceTools: "Arbeitsbereich",
    automationPlatforms: "Automatisierung",
    aiModels: "KI-Modelle",
    comingSoon: "Demnächst",
    andMore: "und mehr",
    // Privacy
    privacyHeadline: "Ihre Daten. Ihre Hardware. Ihre Regeln.",
    privacySubheadline: "Klasse-1-Datenschutz bedeutet, dass Ihre Daten niemals Ihre Kontrolle verlassen. Wählen Sie, wie privat Sie sein möchten.",
    cloudOption: "Cloud",
    cloudOptionDesc: "Verschlüsselte, isolierte Instanzen auf unserer Infrastruktur. Ihre Daten werden nie zum Training von Modellen verwendet. Jederzeit löschbar.",
    localOption: "Lokale Hardware",
    localOptionDesc: "Betreiben Sie Ihren Operator auf Ihrer eigenen Hardware. Mac Mini, Mac Studio oder jedes Apple-Silicon-Gerät. Vollständige Luftschleuse möglich.",
    enterpriseOption: "Enterprise GPU",
    enterpriseOptionDesc: "NVIDIA RTX, A100, H100 — betreiben Sie Frontier-Modelle vollständig vor Ort. Keine Daten verlassen Ihr Gebäude.",
    bringYourOwn: "Eigenes Modell mitbringen",
    bringYourOwnDesc: "Verbinden Sie jedes Modell über OpenRouter. Nutzen Sie Open-Source. Nutzen Sie eigene Fine-Tunes. Nutzen Sie, was Sie vertrauen.",
    privacyTagline: "Vollständig unterstützt von einem Technologen, der versteht, warum Datenschutz wichtig ist. Kein Vertriebsteam. Ein Entwickler.",
    // Footer
    footerTagline: "Ein Operator. Auf Sie aufgebaut.",
    footerCopyright: "sevenlayers. Alle Rechte vorbehalten.",
  },
}

export default function LandingPage() {
  const [language, setLanguage] = useState<Language>("en")
  const t = translations[language]

  const handleLanguageChange = useCallback((lang: Language) => {
    setLanguage(lang)
  }, [])

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      {/* Header / Taskbar */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          backgroundColor: "var(--titlebar-bg)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image
              src="/images/sevenlayers-logo.png"
              alt="sevenlayers"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <div
              className="logo-text leading-[1.1]"
              style={{ color: "var(--color-text)" }}
            >
              <div className="text-[19px] tracking-[0.45em] logo-text-seven">SEVEN</div>
              <div className="text-[14px] tracking-[0.7em] logo-text-layers">LAYERS</div>
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher onChange={handleLanguageChange} />
            <ThemeToggle />
            <Button className="btn-accent text-xs h-8 px-4 hidden sm:inline-flex">
              {t.ctaButton}
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Section 1: The Hook */}
        <section className="py-20 md:py-32 px-4 md:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance leading-tight"
              style={{ color: "var(--color-text)" }}
            >
              {t.headline}
            </h1>
            <p
              className="mt-6 text-lg md:text-xl leading-relaxed text-pretty max-w-2xl mx-auto"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t.subheadline}
            </p>
            <p
              className="mt-4 text-base md:text-lg font-medium"
              style={{ color: "var(--color-accent)" }}
            >
              {t.action}
            </p>
          </div>
        </section>

        {/* Section 2: The Problem */}
        <section
          className="py-16 md:py-24 px-4 md:px-8"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="max-w-3xl mx-auto space-y-8">
            <p
              className="text-base md:text-lg leading-relaxed"
              style={{ color: "var(--color-text)" }}
            >
              {t.problem1}
            </p>
            <p
              className="text-base md:text-lg leading-relaxed"
              style={{ color: "var(--color-text)" }}
            >
              {t.problem2}{" "}
              <em>{t.problem2emphasis}</em>
            </p>
            <p
              className="text-base md:text-lg leading-relaxed"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t.problem3}
            </p>
          </div>
        </section>

        {/* Section 3: The Shift */}
        <section className="py-16 md:py-24 px-4 md:px-8">
          <div className="max-w-3xl mx-auto space-y-8">
            <p
              className="text-base md:text-lg leading-relaxed"
              style={{ color: "var(--color-text)" }}
            >
              {t.shift1}
            </p>
            <p
              className="text-base md:text-lg leading-relaxed"
              style={{ color: "var(--color-text)" }}
            >
              {t.shift2}
            </p>
          </div>
        </section>

        {/* Section 4: The Embedded Chat */}
        <section
          className="py-16 md:py-24 px-4 md:px-8"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2
                className="text-2xl md:text-3xl font-semibold text-balance"
                style={{ color: "var(--color-text)" }}
              >
                {t.chatHeadline}
              </h2>
              <p
                className="mt-4 text-base md:text-lg max-w-xl mx-auto"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {t.chatSubheadline}
              </p>
            </div>
            <OperatorChat />
          </div>
        </section>

        {/* Section 5: The Proof */}
        <section className="py-16 md:py-24 px-4 md:px-8">
          <div className="max-w-5xl mx-auto">
            <h2
              className="text-2xl md:text-3xl font-semibold text-center mb-12"
              style={{ color: "var(--color-text)" }}
            >
              {t.proofHeadline}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Marcus */}
              <div className="proof-block">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p
                      className="font-semibold"
                      style={{ color: "var(--color-text)" }}
                    >
                      Marcus
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      Painting · Stuttgart · €2.4M
                    </p>
                  </div>
                  <Clock
                    className="w-5 h-5"
                    style={{ color: "var(--color-accent)" }}
                  />
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <p
                      className="text-xs uppercase tracking-wide"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      {t.hoursWeek}
                    </p>
                    <p style={{ color: "var(--color-text)" }}>
                      <span
                        className="line-through"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        78
                      </span>{" "}
                      <span className="font-semibold">→ 44</span>
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-xs uppercase tracking-wide"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      {t.closeRate}
                    </p>
                    <p style={{ color: "var(--color-text)" }}>
                      <span
                        className="line-through"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        22%
                      </span>{" "}
                      <span className="font-semibold">→ 41%</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Rachel */}
              <div className="proof-block">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p
                      className="font-semibold"
                      style={{ color: "var(--color-text)" }}
                    >
                      Rachel
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      Consulting · Dublin · €1.8M
                    </p>
                  </div>
                  <TrendingUp
                    className="w-5 h-5"
                    style={{ color: "var(--color-accent)" }}
                  />
                </div>
                <div>
                  <p
                    className="text-xs uppercase tracking-wide"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    {t.websiteConversion}
                  </p>
                  <p style={{ color: "var(--color-text)" }}>
                    <span
                      className="line-through"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      1.2%
                    </span>{" "}
                    <span className="font-semibold">→ 3.8%</span>
                  </p>
                </div>
              </div>

              {/* Jess */}
              <div className="proof-block">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p
                      className="font-semibold"
                      style={{ color: "var(--color-text)" }}
                    >
                      Jess
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      Skincare · Amsterdam · €3.1M
                    </p>
                  </div>
                  <Target
                    className="w-5 h-5"
                    style={{ color: "var(--color-accent)" }}
                  />
                </div>
                <div>
                  <p
                    className="text-xs uppercase tracking-wide"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    {t.roas}
                  </p>
                  <p style={{ color: "var(--color-text)" }}>
                    <span
                      className="line-through"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      1.12x
                    </span>{" "}
                    <span className="font-semibold">→ 4.46x</span>
                  </p>
                </div>
              </div>

              {/* Lena */}
              <div className="proof-block">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p
                      className="font-semibold"
                      style={{ color: "var(--color-text)" }}
                    >
                      Lena
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      E-commerce · Berlin · €4.7M
                    </p>
                  </div>
                  <Percent
                    className="w-5 h-5"
                    style={{ color: "var(--color-accent)" }}
                  />
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <p
                      className="text-xs uppercase tracking-wide"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      {t.cartRecovery}
                    </p>
                    <p style={{ color: "var(--color-text)" }}>
                      <span
                        className="line-through"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        4.2%
                      </span>{" "}
                      <span className="font-semibold">→ 11.8%</span>
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-xs uppercase tracking-wide"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      {t.recoveredMo}
                    </p>
                    <p
                      className="font-semibold"
                      style={{ color: "var(--color-text)" }}
                    >
                      €14.2K
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: The Paths */}
        <section
          className="py-16 md:py-24 px-4 md:px-8"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="max-w-5xl mx-auto">
            <h2
              className="text-2xl md:text-3xl font-semibold text-center mb-12"
              style={{ color: "var(--color-text)" }}
            >
              {t.pathsHeadline}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Start Free */}
              <div className="path-card flex flex-col">
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ color: "var(--color-text)" }}
                >
                  {t.startFree}
                </h3>
                <p
                  className="text-sm mb-6 flex-1"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {t.startFreeDesc}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button className="btn-secondary text-xs h-8 px-3 gap-1.5">
                    <Apple className="w-3.5 h-3.5" />
                    iPhone
                  </Button>
                  <Button className="btn-secondary text-xs h-8 px-3 gap-1.5">
                    <Monitor className="w-3.5 h-3.5" />
                    macOS
                  </Button>
                  <Button className="btn-secondary text-xs h-8 px-3 gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    Web
                  </Button>
                </div>
              </div>

              {/* Done With You */}
              <div className="path-card flex flex-col">
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ color: "var(--color-text)" }}
                >
                  {t.doneWithYou}
                </h3>
                <p
                  className="text-xs font-medium mb-2"
                  style={{ color: "var(--color-accent)" }}
                >
                  {t.doneWithYouPrice}
                </p>
                <p
                  className="text-sm mb-6 flex-1"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {t.doneWithYouDesc}
                </p>
                <Button className="btn-primary text-sm h-9 gap-2">
                  <MessageCircle className="w-4 h-4" />
                  {t.startConversation}
                </Button>
              </div>

              {/* Full Build */}
              <div className="path-card flex flex-col">
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ color: "var(--color-text)" }}
                >
                  {t.fullBuild}
                </h3>
                <p
                  className="text-xs font-medium mb-2"
                  style={{ color: "var(--color-accent)" }}
                >
                  {t.fullBuildPrice}
                </p>
                <p
                  className="text-sm mb-6 flex-1"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {t.fullBuildDesc}
                </p>
                <Button className="btn-accent text-sm h-9 gap-2">
                  <MessageCircle className="w-4 h-4" />
                  {t.startConversation}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Personal note */}
            <p
              className="mt-12 text-center text-sm max-w-2xl mx-auto"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t.personalNote} —{" "}
              <span style={{ color: "var(--color-text)" }}>Remington</span>
            </p>
          </div>
        </section>

        {/* Why Not a Discovery Call */}
        <section className="py-16 md:py-24 px-4 md:px-8">
          <div className="max-w-3xl mx-auto space-y-12">
            <div>
              <h3
                className="text-lg font-semibold mb-4"
                style={{ color: "var(--color-text)" }}
              >
                {t.whyNotCall}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {t.whyNotCallText}
              </p>
            </div>

            <div>
              <h3
                className="text-lg font-semibold mb-4"
                style={{ color: "var(--color-text)" }}
              >
                {t.whyOneOperator}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {t.whyOneOperatorText}
              </p>
            </div>
          </div>
        </section>

        {/* The Apps */}
        <section
          className="py-16 md:py-24 px-4 md:px-8"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="max-w-4xl mx-auto">
            <h2
              className="text-2xl md:text-3xl font-semibold text-center mb-12"
              style={{ color: "var(--color-text)" }}
            >
              {t.operatorEverywhereHeadline}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div
                  className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center"
                  style={{
                    backgroundColor: "var(--color-accent-subtle)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <Apple
                    className="w-7 h-7"
                    style={{ color: "var(--color-accent)" }}
                  />
                </div>
                <h4
                  className="font-semibold mb-2"
                  style={{ color: "var(--color-text)" }}
                >
                  iPhone
                </h4>
                <p
                  className="text-sm"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {t.iphoneDesc}
                </p>
              </div>

              <div className="text-center">
                <div
                  className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center"
                  style={{
                    backgroundColor: "var(--color-accent-subtle)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <Monitor
                    className="w-7 h-7"
                    style={{ color: "var(--color-accent)" }}
                  />
                </div>
                <h4
                  className="font-semibold mb-2"
                  style={{ color: "var(--color-text)" }}
                >
                  macOS
                </h4>
                <p
                  className="text-sm"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {t.macosDesc}
                </p>
              </div>

              <div className="text-center">
                <div
                  className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center"
                  style={{
                    backgroundColor: "var(--color-accent-subtle)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <Globe
                    className="w-7 h-7"
                    style={{ color: "var(--color-accent)" }}
                  />
                </div>
                <h4
                  className="font-semibold mb-2"
                  style={{ color: "var(--color-text)" }}
                >
                  Web App
                </h4>
                <p
                  className="text-sm"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {t.webAppDesc}
                </p>
              </div>
            </div>

            <p
              className="mt-10 text-center text-sm"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {t.operatorEverywhereTagline}
            </p>
          </div>
        </section>

        {/* Integrations Section */}
        <section className="py-16 md:py-24 px-4 md:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2
                className="text-2xl md:text-3xl font-semibold text-balance"
                style={{ color: "var(--color-text)" }}
              >
                {t.integrationsHeadline}
              </h2>
              <p
                className="mt-4 text-base md:text-lg max-w-xl mx-auto"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {t.integrationsSubheadline}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Communication */}
              <div
                className="p-5 rounded-lg"
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare
                    className="w-4 h-4"
                    style={{ color: "var(--color-accent)" }}
                  />
                  <h4
                    className="text-sm font-semibold uppercase tracking-wide"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {t.communicationChannels}
                  </h4>
                </div>
                <div className="space-y-2">
                  {["WhatsApp", "Slack", "Telegram", "SMS"].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 text-sm"
                      style={{ color: "var(--color-text)" }}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: "var(--color-accent)" }}
                      />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Workspace */}
              <div
                className="p-5 rounded-lg"
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Mail
                    className="w-4 h-4"
                    style={{ color: "var(--color-accent)" }}
                  />
                  <h4
                    className="text-sm font-semibold uppercase tracking-wide"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {t.workspaceTools}
                  </h4>
                </div>
                <div className="space-y-2">
                  {["Microsoft 365", "Google Workspace", "GitHub", "Vercel"].map(
                    (item) => (
                      <div
                        key={item}
                        className="flex items-center gap-2 text-sm"
                        style={{ color: "var(--color-text)" }}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: "var(--color-accent)" }}
                        />
                        {item}
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Automation */}
              <div
                className="p-5 rounded-lg"
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Zap
                    className="w-4 h-4"
                    style={{ color: "var(--color-accent)" }}
                  />
                  <h4
                    className="text-sm font-semibold uppercase tracking-wide"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {t.automationPlatforms}
                  </h4>
                </div>
                <div className="space-y-2">
                  {[
                    { name: "Zapier", soon: false },
                    { name: "Make", soon: true },
                    { name: "n8n", soon: true },
                    { name: "ActiveCampaign", soon: false },
                  ].map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center gap-2 text-sm"
                      style={{ color: "var(--color-text)" }}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor: item.soon
                            ? "var(--color-text-tertiary)"
                            : "var(--color-accent)",
                        }}
                      />
                      <span style={{ opacity: item.soon ? 0.6 : 1 }}>
                        {item.name}
                      </span>
                      {item.soon && (
                        <span
                          className="text-[10px] uppercase"
                          style={{ color: "var(--color-text-tertiary)" }}
                        >
                          {t.comingSoon}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Models */}
              <div
                className="p-5 rounded-lg"
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles
                    className="w-4 h-4"
                    style={{ color: "var(--color-accent)" }}
                  />
                  <h4
                    className="text-sm font-semibold uppercase tracking-wide"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {t.aiModels}
                  </h4>
                </div>
                <div className="space-y-2">
                  {[
                    "OpenAI",
                    "Anthropic",
                    "OpenRouter",
                    "ElevenLabs",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 text-sm"
                      style={{ color: "var(--color-text)" }}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: "var(--color-accent)" }}
                      />
                      {item}
                    </div>
                  ))}
                  <div
                    className="text-xs pt-1"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    + {t.andMore}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section
          className="py-16 md:py-24 px-4 md:px-8"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Shield
                  className="w-6 h-6"
                  style={{ color: "var(--color-accent)" }}
                />
                <span
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "var(--color-accent)" }}
                >
                  Class 1 Privacy
                </span>
              </div>
              <h2
                className="text-2xl md:text-3xl font-semibold text-balance"
                style={{ color: "var(--color-text)" }}
              >
                {t.privacyHeadline}
              </h2>
              <p
                className="mt-4 text-base md:text-lg max-w-2xl mx-auto"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {t.privacySubheadline}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cloud Option */}
              <div
                className="p-6 rounded-lg"
                style={{
                  backgroundColor: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: "var(--color-accent-subtle)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <Cloud
                      className="w-5 h-5"
                      style={{ color: "var(--color-accent)" }}
                    />
                  </div>
                  <div>
                    <h4
                      className="font-semibold mb-2"
                      style={{ color: "var(--color-text)" }}
                    >
                      {t.cloudOption}
                    </h4>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {t.cloudOptionDesc}
                    </p>
                  </div>
                </div>
              </div>

              {/* Local Hardware Option */}
              <div
                className="p-6 rounded-lg"
                style={{
                  backgroundColor: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: "var(--color-accent-subtle)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <Server
                      className="w-5 h-5"
                      style={{ color: "var(--color-accent)" }}
                    />
                  </div>
                  <div>
                    <h4
                      className="font-semibold mb-2"
                      style={{ color: "var(--color-text)" }}
                    >
                      {t.localOption}
                    </h4>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {t.localOptionDesc}
                    </p>
                  </div>
                </div>
              </div>

              {/* Enterprise GPU Option */}
              <div
                className="p-6 rounded-lg"
                style={{
                  backgroundColor: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: "var(--color-accent-subtle)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <Cpu
                      className="w-5 h-5"
                      style={{ color: "var(--color-accent)" }}
                    />
                  </div>
                  <div>
                    <h4
                      className="font-semibold mb-2"
                      style={{ color: "var(--color-text)" }}
                    >
                      {t.enterpriseOption}
                    </h4>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {t.enterpriseOptionDesc}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bring Your Own Model */}
              <div
                className="p-6 rounded-lg"
                style={{
                  backgroundColor: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: "var(--color-accent-subtle)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <Lock
                      className="w-5 h-5"
                      style={{ color: "var(--color-accent)" }}
                    />
                  </div>
                  <div>
                    <h4
                      className="font-semibold mb-2"
                      style={{ color: "var(--color-text)" }}
                    >
                      {t.bringYourOwn}
                    </h4>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {t.bringYourOwnDesc}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p
              className="mt-10 text-center text-sm max-w-xl mx-auto"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {t.privacyTagline}
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        className="border-t py-8 px-4 md:px-8"
        style={{
          backgroundColor: "var(--color-bg)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image
              src="/images/sevenlayers-logo.png"
              alt="sevenlayers"
              width={24}
              height={24}
              className="w-6 h-6"
            />
            <div
              className="logo-text leading-[1.1]"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <div className="text-[14px] tracking-[0.45em] logo-text-seven">SEVEN</div>
              <div className="text-[11px] tracking-[0.7em] logo-text-layers">LAYERS</div>
            </div>
          </div>
          <p
            className="text-xs"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            {t.footerTagline}
          </p>
        </div>
      </footer>
    </div>
  )
}
