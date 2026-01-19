export type Language = "de" | "en" | "nl" | "ch"

export const languageNames: Record<Language, Record<Language, string>> = {
  de: {
    de: "Deutsch",
    en: "Englisch",
    nl: "Niederländisch",
    ch: "Schweizerdeutsch",
  },
  en: {
    de: "German",
    en: "English",
    nl: "Dutch",
    ch: "Swiss German",
  },
  nl: {
    de: "Duits",
    en: "Engels",
    nl: "Nederlands",
    ch: "Zwitserduits",
  },
  ch: {
    de: "Deutsch",
    en: "Englisch",
    nl: "Niederländisch",
    ch: "Schweizerdeutsch",
  },
}

export const translations = {
  de: {
    nav: {
      about: "Über uns",
      courses: "Kurse",
      team: "Team",
      gallery: "Galerie",
      contact: "Kontakt",
      booking: "Buchen",
      pricing: "Preise",
    },
    hero: {
      title: "Segeln lernen an der Ostsee",
      subtitle: "Erlebe die Faszination des Segelns mit professionellen Instruktoren in Altwarp",
      cta: "Kurse entdecken",
    },
    about: {
      title: "Willkommen bei Segelschule Altwarp",
      text: "Unsere Segelschule liegt direkt an der malerischen Ostseeküste in Altwarp, Deutschland. Seit über 15 Jahren vermitteln wir die Kunst des Segelns mit Leidenschaft und Expertise. Egal ob Anfänger oder Fortgeschrittener – bei uns findest du den passenden Kurs in einer inspirierenden Umgebung mit modernen Booten und erfahrenen Instruktoren.",
    },
    process: {
      title: "So einfach geht's",
      subtitle: "Dein Weg zum Segelerfolg in nur drei Schritten",
      steps: [
        {
          icon: "calendar" as const,
          title: "Kurs buchen",
          description:
            "Wähle deinen passenden Kurs und sichere dir deinen Wunschtermin. Einfach online oder per Telefon.",
        },
        {
          icon: "ship" as const,
          title: "Segeln lernen",
          description:
            "Erlebe praxisnahen Unterricht mit erfahrenen Instruktoren auf modernen Booten in kleinen Gruppen.",
        },
        {
          icon: "award" as const,
          title: "Zertifikat erhalten",
          description: "Erhalte dein offizielles Segelzertifikat und starte deine eigenen Abenteuer auf dem Wasser.",
        },
      ],
    },
    courses: {
      title: "Unsere Kurse",
      subtitle: "Vom ersten Kontakt bis zum Profi – wir begleiten dich auf deinem Segelweg",
      schnupper: {
        title: "Schnupperkurs",
        duration: "1 Tag",
        price: "€89",
        description: "Erste Erfahrungen auf dem Wasser sammeln",
        features: ["4 Stunden Praxis", "Kleine Gruppen (max. 4)", "Alle Materialien inklusive", "Keine Vorkenntnisse"],
        id: "trial",
      },
      grund: {
        title: "Grundkurs",
        duration: "Wochenende",
        price: "€279",
        description: "Solide Grundlagen für selbstständiges Segeln",
        features: ["2-3 Tage intensiv", "Theorie & Praxis", "Manöver & Navigation", "Inkl. Lehrmaterial"],
        id: "basic",
      },
      sbf: {
        title: "SBF-Lizenz",
        duration: "2 Wochen",
        price: "€449",
        description: "Offizieller Sportbootführerschein See",
        features: [
          "Vollständige Ausbildung",
          "Prüfungsvorbereitung",
          "Prüfungsgebühren exklusive",
          "Alle Materialien & Bücher",
        ],
        id: "license",
      },
      advanced: {
        title: "Fortgeschrittene",
        duration: "3 Tage",
        price: "€329",
        description: "Perfektioniere deine Segeltechnik",
        features: ["18 Stunden Training", "Erweiterte Manöver", "Navigation & Wetter", "Regatta-Grundlagen"],
        id: "advanced",
      },
      button: "Buchen",
    },
    testimonials: {
      title: "Das sagen unsere Teilnehmer",
      reviews: [
        {
          name: "Sophie Müller",
          text: "Fantastische Erfahrung! Die Instruktoren sind super geduldig und erklären alles sehr verständlich. Nach einer Woche konnte ich bereits selbstständig segeln.",
          rating: 5,
        },
        {
          name: "Jan de Vries",
          text: "Mooie locatie en professionele begeleiding. Ik heb veel geleerd in korte tijd. Zeer aan te bevelen!",
          rating: 5,
        },
        {
          name: "Thomas Weber",
          text: "Die perfekte Mischung aus Theorie und Praxis. Moderne Boote, tolle Atmosphäre und ein großartiges Team. Ich komme definitiv wieder!",
          rating: 5,
        },
      ],
    },
    gallery: {
      title: "Impressionen",
      subtitle: "Entdecke das Segeln auf der Ostsee",
    },
    team: {
      title: "Unser Team",
      subtitle: "Erfahrene Instruktoren mit Leidenschaft für das Segeln",
      members: [
        {
          name: "Kapitän Gerrit van Doorn",
          role: "Hauptinstruktor & Gründer",
          bio: "Mit über 30 Jahren Segelerfahrung und internationalen Regattateilnahmen bringt Gerrit seine Expertise und Begeisterung in jeden Kurs ein.",
        },
        {
          name: "Lisa Bergmann",
          role: "Segelinstruktorin",
          bio: "Olympia-Teilnehmerin und zertifizierte Ausbilderin. Lisa spezialisiert sich auf Anfängerkurse und vermittelt Segeln mit Freude und Geduld.",
        },
      ],
    },
    faq: {
      title: "Häufig gestellte Fragen",
      subtitle: "Alles, was du über unsere Segelkurse wissen musst",
      items: [
        {
          question: "Benötige ich Vorkenntnisse?",
          answer:
            "Nein, für unseren Schnupper- und Grundkurs sind keine Vorkenntnisse erforderlich. Wir starten bei null und bringen dir Schritt für Schritt alles bei, was du wissen musst.",
        },
        {
          question: "Was muss ich mitbringen?",
          answer:
            "Bequeme, wetterfeste Kleidung, Sonnenschutz und gute Laune! Alle Sicherheitsausrüstung und Segelausrüstung stellen wir zur Verfügung.",
        },
        {
          question: "Wie groß sind die Kursgruppen?",
          answer:
            "Wir halten unsere Gruppen klein – maximal 4-6 Teilnehmer pro Kurs. So können wir jedem die individuelle Aufmerksamkeit geben, die für effektives Lernen nötig ist.",
        },
        {
          question: "Was passiert bei schlechtem Wetter?",
          answer:
            "Sicherheit geht vor! Bei zu starkem Wind oder Unwetter verschieben wir den Kurs kostenlos oder bieten Theorieunterricht an. Du kannst flexibel einen neuen Termin wählen.",
        },
        {
          question: "Erhalte ich ein Zertifikat?",
          answer:
            "Ja, nach erfolgreichem Abschluss des Grund- oder Fortgeschrittenenkurses erhältst du ein offizielles Zertifikat, das international anerkannt ist.",
        },
      ],
    },
    cta: {
      title: "Bereit für dein Segelabenteuer?",
      description:
        "Starte jetzt deine Reise und entdecke die Freiheit des Segelns. Unsere erfahrenen Instruktoren freuen sich darauf, dich auf dem Wasser zu begrüßen und dir die Welt des Segelns näherzubringen.",
      button: "Jetzt Kurs buchen",
    },
    contact: {
      title: "Kontakt",
      subtitle: "Wir freuen uns auf Ihre Nachricht",
      form: {
        name: "Name",
        email: "E-Mail",
        subject: "Betreff",
        message: "Nachricht",
        submit: "Nachricht senden",
      },
      info: {
        address: "Hafenstraße 12",
        city: "17375 Altwarp, Deutschland",
        phone: "+49 (0) 39778 123456",
        email: "info@segelschule-altwarp.de",
        directions: "Anfahrt",
      },
    },
    footer: {
      location: "Segelschule Altwarp",
      address: "Hafenstraße 12, 17375 Altwarp, Deutschland",
      phone: "Tel: +49 (0) 39778 123456",
      email: "info@segelschule-altwarp.de",
      social: "Folge uns",
      copyright: "© 2026 Segelschule Altwarp. Alle Rechte vorbehalten.",
    },
  },
  en: {
    nav: {
      about: "About",
      courses: "Courses",
      team: "Team",
      gallery: "Gallery",
      contact: "Contact",
      booking: "Book",
      pricing: "Pricing",
    },
    hero: {
      title: "Learn to Sail on the Baltic Sea",
      subtitle: "Experience the fascination of sailing with professional instructors in Altwarp",
      cta: "Discover Courses",
    },
    about: {
      title: "Welcome to Segelschule Altwarp",
      text: "Our sailing school is located directly on the picturesque Baltic Sea coast in Altwarp, Germany. For over 15 years, we have been teaching the art of sailing with passion and expertise. Whether beginner or advanced – you will find the right course with us in an inspiring environment with modern boats and experienced instructors.",
    },
    process: {
      title: "How It Works",
      subtitle: "Your path to sailing success in just three steps",
      steps: [
        {
          icon: "calendar" as const,
          title: "Book Your Course",
          description: "Choose your perfect course and secure your preferred date. Simple online or by phone.",
        },
        {
          icon: "ship" as const,
          title: "Learn to Sail",
          description: "Experience hands-on instruction with experienced instructors on modern boats in small groups.",
        },
        {
          icon: "award" as const,
          title: "Get Certified",
          description: "Receive your official sailing certificate and start your own adventures on the water.",
        },
      ],
    },
    courses: {
      title: "Our Courses",
      subtitle: "From first contact to professional – we accompany you on your sailing journey",
      schnupper: {
        title: "Taster Course",
        duration: "1 Day",
        price: "€89",
        description: "First experience on the water",
        features: ["4 hours practical", "Small groups (max. 4)", "All materials included", "No prior experience"],
        id: "trial",
      },
      grund: {
        title: "Basic Course",
        duration: "Weekend",
        price: "€279",
        description: "Solid foundation for independent sailing",
        features: ["2-3 days intensive", "Theory & Practice", "Maneuvers & Navigation", "Incl. teaching materials"],
        id: "basic",
      },
      sbf: {
        title: "SBF License",
        duration: "2 Weeks",
        price: "€449",
        description: "Official Powerboat License Sea",
        features: ["Complete training", "Exam preparation", "Exam fees excluded", "All materials & books"],
        id: "license",
      },
      advanced: {
        title: "Advanced",
        duration: "3 Days",
        price: "€329",
        description: "Perfect your sailing technique",
        features: ["18 hours training", "Advanced maneuvers", "Navigation & Weather", "Regatta basics"],
        id: "advanced",
      },
      button: "Book",
    },
    testimonials: {
      title: "What Our Participants Say",
      reviews: [
        {
          name: "Sophie Müller",
          text: "Fantastic experience! The instructors are super patient and explain everything very clearly. After one week I could already sail independently.",
          rating: 5,
        },
        {
          name: "Jan de Vries",
          text: "Beautiful location and professional guidance. I learned a lot in a short time. Highly recommended!",
          rating: 5,
        },
        {
          name: "Thomas Weber",
          text: "The perfect mix of theory and practice. Modern boats, great atmosphere and a fantastic team. I will definitely come back!",
          rating: 5,
        },
      ],
    },
    gallery: {
      title: "Impressions",
      subtitle: "Discover sailing on the Baltic Sea",
    },
    team: {
      title: "Our Team",
      subtitle: "Experienced instructors with passion for sailing",
      members: [
        {
          name: "Captain Gerrit van Doorn",
          role: "Head Instructor & Founder",
          bio: "With over 30 years of sailing experience and international regatta participation, Gerrit brings his expertise and enthusiasm to every course.",
        },
        {
          name: "Lisa Bergmann",
          role: "Sailing Instructor",
          bio: "Olympic participant and certified trainer. Lisa specializes in beginner courses and teaches sailing with joy and patience.",
        },
      ],
    },
    faq: {
      title: "Frequently Asked Questions",
      subtitle: "Everything you need to know about our sailing courses",
      items: [
        {
          question: "Do I need prior experience?",
          answer:
            "No, our taster and basic courses require no prior experience. We start from scratch and teach you everything you need to know step by step.",
        },
        {
          question: "What should I bring?",
          answer:
            "Comfortable, weather-appropriate clothing, sun protection, and a good attitude! We provide all safety and sailing equipment.",
        },
        {
          question: "How large are the course groups?",
          answer:
            "We keep our groups small – maximum 4-6 participants per course. This allows us to give everyone the individual attention needed for effective learning.",
        },
        {
          question: "What happens in bad weather?",
          answer:
            "Safety first! In case of strong winds or storms, we reschedule the course free of charge or offer theory lessons. You can flexibly choose a new date.",
        },
        {
          question: "Will I receive a certificate?",
          answer:
            "Yes, after successfully completing the basic or advanced course, you'll receive an official internationally recognized certificate.",
        },
      ],
    },
    cta: {
      title: "Ready for Your Sailing Adventure?",
      description:
        "Start your journey now and discover the freedom of sailing. Our experienced instructors look forward to welcoming you on the water and introducing you to the world of sailing.",
      button: "Book Your Course Now",
    },
    contact: {
      title: "Contact",
      subtitle: "We look forward to hearing from you",
      form: {
        name: "Name",
        email: "Email",
        subject: "Subject",
        message: "Message",
        submit: "Send Message",
      },
      info: {
        address: "Hafenstraße 12",
        city: "17375 Altwarp, Germany",
        phone: "+49 (0) 39778 123456",
        email: "info@segelschule-altwarp.de",
        directions: "Get Directions",
      },
    },
    footer: {
      location: "Segelschule Altwarp",
      address: "Hafenstraße 12, 17375 Altwarp, Germany",
      phone: "Phone: +49 (0) 39778 123456",
      email: "info@segelschule-altwarp.de",
      social: "Follow us",
      copyright: "© 2026 Segelschule Altwarp. All rights reserved.",
    },
  },
  nl: {
    nav: {
      about: "Over ons",
      courses: "Cursussen",
      team: "Team",
      gallery: "Galerij",
      contact: "Contact",
      booking: "Boeken",
      pricing: "Prijzen",
    },
    hero: {
      title: "Leer zeilen op de Oostzee",
      subtitle: "Ervaar de fascinatie van zeilen met professionele instructeurs in Altwarp",
      cta: "Ontdek cursussen",
    },
    about: {
      title: "Welkom bij Segelschule Altwarp",
      text: "Onze zeilschool ligt direct aan de schilderachtige Oostzeekust in Altwarp, Duitsland. Al meer dan 15 jaar onderwijzen wij de kunst van het zeilen met passie en expertise. Of je nu beginner of gevorderde bent – bij ons vind je de juiste cursus in een inspirerende omgeving met moderne boten en ervaren instructeurs.",
    },
    process: {
      title: "Zo werkt het",
      subtitle: "Jouw pad naar zeilerserfolg in slechts drie stappen",
      steps: [
        {
          icon: "calendar" as const,
          title: "Boek je cursus",
          description: "Kies je perfecte cursus en reserveer je gewenste datum. Eenvoudig online of telefonisch.",
        },
        {
          icon: "ship" as const,
          title: "Leer zeilen",
          description:
            "Ervaar praktijkgerichte instructie met ervaren instructeurs op moderne boten in kleine groepen.",
        },
        {
          icon: "award" as const,
          title: "Ontvang certificaat",
          description: "Krijg je officiële zeilcertificaat en start je eigen avonturen op het water.",
        },
      ],
    },
    courses: {
      title: "Onze Cursussen",
      subtitle: "Van eerste contact tot professional – wij begeleiden je op je zeilreis",
      schnupper: {
        title: "Proefcursus",
        duration: "1 Dag",
        price: "€89",
        description: "Eerste ervaring op het water",
        features: ["4 uur praktijk", "Kleine groepen (max. 4)", "Alle materialen inbegrepen", "Geen voorkennis nodig"],
        id: "trial",
      },
      grund: {
        title: "Basiscursus",
        duration: "Weekend",
        price: "€279",
        description: "Solide basis voor zelfstandig zeilen",
        features: ["2-3 dagen intensief", "Theorie & Praktijk", "Manoeuvres & Navigatie", "Incl. lesmateriaal"],
        id: "basic",
      },
      sbf: {
        title: "SBF-Licentie",
        duration: "2 Weken",
        price: "€449",
        description: "Officieel sportbootvaarbewijs zee",
        features: ["Volledige opleiding", "Examenvoorbereiding", "Examenkosten exclusief", "Alle materialen & boeken"],
        id: "license",
      },
      advanced: {
        title: "Gevorderden",
        duration: "3 Dagen",
        price: "€329",
        description: "Perfectioneer je zeiltechniek",
        features: ["18 uur training", "Geavanceerde manoeuvres", "Navigatie & Weer", "Regatta-basis"],
        id: "advanced",
      },
      button: "Boeken",
    },
    testimonials: {
      title: "Wat onze deelnemers zeggen",
      reviews: [
        {
          name: "Sophie Müller",
          text: "Fantastische ervaring! De instructeurs zijn super geduldig en leggen alles heel duidelijk uit. Na een week kon ik al zelfstandig zeilen.",
          rating: 5,
        },
        {
          name: "Jan de Vries",
          text: "Mooie locatie en professionele begeleiding. Ik heb veel geleerd in korte tijd. Zeer aan te bevelen!",
          rating: 5,
        },
        {
          name: "Thomas Weber",
          text: "De perfecte mix van theorie en praktijk. Moderne boten, geweldige sfeer en een fantastisch team. Ik kom zeker terug!",
          rating: 5,
        },
      ],
    },
    gallery: {
      title: "Impressies",
      subtitle: "Ontdek zeilen op de Oostzee",
    },
    team: {
      title: "Ons Team",
      subtitle: "Ervaren instructeurs met passie voor zeilen",
      members: [
        {
          name: "Kapitein Gerrit van Doorn",
          role: "Hoofdinstructeur & Oprichter",
          bio: "Met meer dan 30 jaar zeilervaring en internationale regattadeelname brengt Gerrit zijn expertise en enthousiasme in elke cursus.",
        },
        {
          name: "Lisa Bergmann",
          role: "Zeilinstructeur",
          bio: "Olympische deelnemer en gecertificeerde trainer. Lisa is gespecialiseerd in beginnerscursussen en onderwijst zeilen met plezier en geduld.",
        },
      ],
    },
    faq: {
      title: "Veelgestelde vragen",
      subtitle: "Alles wat je moet weten over onze zeilcursussen",
      items: [
        {
          question: "Heb ik voorkennis nodig?",
          answer:
            "Nee, onze proef- en basiscursussen vereisen geen voorkennis. We beginnen vanaf het begin en leren je stap voor stap alles wat je moet weten.",
        },
        {
          question: "Wat moet ik meenemen?",
          answer:
            "Comfortabele, weerbestendige kleding, zonnebescherming en een goed humeur! Alle veiligheids- en zeiluitrusting leveren wij.",
        },
        {
          question: "Hoe groot zijn de cursusgroepen?",
          answer:
            "We houden onze groepen klein – maximaal 4-6 deelnemers per cursus. Zo kunnen we iedereen de individuele aandacht geven die nodig is voor effectief leren.",
        },
        {
          question: "Wat gebeurt er bij slecht weer?",
          answer:
            "Veiligheid eerst! Bij te sterke wind of onweer verplaatsen we de cursus gratis of bieden we theorielessen aan. Je kunt flexibel een nieuwe datum kiezen.",
        },
        {
          question: "Krijg ik een certificaat?",
          answer:
            "Ja, na succesvol afronden van de basis- of gevorderdencursus ontvang je een officieel internationaal erkend certificaat.",
        },
      ],
    },
    cta: {
      title: "Klaar voor je zeilavontuur?",
      description:
        "Start nu je reis en ontdek de vrijheid van zeilen. Onze ervaren instructeurs kijken ernaar uit om je op het water te verwelkomen en je kennis te laten maken met de wereld van het zeilen.",
      button: "Boek nu je cursus",
    },
    contact: {
      title: "Contact",
      subtitle: "We horen graag van je",
      form: {
        name: "Naam",
        email: "E-mail",
        subject: "Onderwerp",
        message: "Bericht",
        submit: "Bericht verzenden",
      },
      info: {
        address: "Hafenstraße 12",
        city: "17375 Altwarp, Duitsland",
        phone: "+49 (0) 39778 123456",
        email: "info@segelschule-altwarp.de",
        directions: "Routebeschrijving",
      },
    },
    footer: {
      location: "Segelschule Altwarp",
      address: "Hafenstraße 12, 17375 Altwarp, Duitsland",
      phone: "Tel: +49 (0) 39778 123456",
      email: "info@segelschule-altwarp.de",
      social: "Volg ons",
      copyright: "© 2026 Segelschule Altwarp. Alle rechten voorbehouden.",
    },
  },
  ch: {
    nav: {
      about: "Über üs",
      courses: "Kurs",
      team: "Team",
      gallery: "Galerie",
      contact: "Kontakt",
      booking: "Buche",
      pricing: "Priis",
    },
    hero: {
      title: "Segle lerne a de Ostsee",
      subtitle: "Erleb d Faszination vom Segle mit professionelle Instruktore z Altwarp",
      cta: "Kurs entdecke",
    },
    about: {
      title: "Willkomme bi de Segelschuel Altwarp",
      text: "Üsi Segelschuel ligt direkt a de malerische Ostseechüste z Altwarp, Dütschland. Sit über 15 Jahr vermittle mir d Kunst vom Segle mit Leidenschaft und Expertise. Egal ob Aafänger oder Fortgschrittene – bi üs findsch de passend Kurs i nere inspirierend Umgäbig mit moderne Böötli und erfahrene Instruktore.",
    },
    process: {
      title: "So eifach gaht's",
      subtitle: "Dii Wäg zum Segelerfolg i nur drü Schritt",
      steps: [
        {
          icon: "calendar" as const,
          title: "Kurs buche",
          description: "Wähl dii passende Kurs und sichere dir dii Wunschtermin. Eifach online oder per Telefon.",
        },
        {
          icon: "ship" as const,
          title: "Segle lerne",
          description: "Erleb praxisnahe Underricht mit erfahrene Instruktore uf moderne Böötli i chliine Gruppe.",
        },
        {
          icon: "award" as const,
          title: "Zertifikat erhalte",
          description: "Bechum dis offiziells Segelzertifikat und start dini eigene Abentüür ufem Wasser.",
        },
      ],
    },
    courses: {
      title: "Üsi Kurs",
      subtitle: "Vom erste Kontakt bis zum Profi – mir begleite dich uf dim Segelwäg",
      schnupper: {
        title: "Schnupperkurs",
        duration: "1 Tag",
        price: "€89",
        description: "Ersti Erfahrige ufem Wasser sammle",
        features: ["4 Stunde Praxis", "Chliini Gruppe (max. 4)", "Alli Materiale inklusive", "Kei Vorkenntniss"],
        id: "trial",
      },
      grund: {
        title: "Grundkurs",
        duration: "Wuchenänd",
        price: "€279",
        description: "Solidi Grundlage für selbständigs Segle",
        features: ["2-3 Täg intensiv", "Theorie & Praxis", "Manöver & Navigation", "Inkl. Lehrmaterial"],
        id: "basic",
      },
      sbf: {
        title: "SBF-Lizänz",
        duration: "2 Wuche",
        price: "€449",
        description: "Offiziells Sportbootfüehrerschiin See",
        features: [
          "Vollständigi Uusbildig",
          "Prüefigsvorbereitung",
          "Prüefigsgebüehre exklusiv",
          "Alli Materiale & Büecher",
        ],
        id: "license",
      },
      advanced: {
        title: "Fortgschritteni",
        duration: "3 Täg",
        price: "€329",
        description: "Perfektionier dini Segeltechnik",
        features: ["18 Stunde Training", "Erwiterti Manöver", "Navigation & Wätter", "Regatta-Grundlage"],
        id: "advanced",
      },
      button: "Buche",
    },
    testimonials: {
      title: "Das säge üsi Teilnehmer",
      reviews: [
        {
          name: "Sophie Müller",
          text: "Fantastischi Erfahrig! D Instruktore sind super geduldig und erkläre alles sehr verständlich. Nach ere Wuche hani scho chönne selbständig segle.",
          rating: 5,
        },
        {
          name: "Jan de Vries",
          text: "Schöni Location und professionelli Begleitig. Ich ha viel glernt i churzer Zit. Sehr z empfehle!",
          rating: 5,
        },
        {
          name: "Thomas Weber",
          text: "Di perfekt Mischig us Theorie und Praxis. Moderni Böötli, tolli Atmosphäre und es grossartigs Team. Ich chumm sicher wieder!",
          rating: 5,
        },
      ],
    },
    gallery: {
      title: "Impressione",
      subtitle: "Entdeck s Segle uf de Ostsee",
    },
    team: {
      title: "Üses Team",
      subtitle: "Erfahreni Instruktore mit Leidenschaft fürs Segle",
      members: [
        {
          name: "Kapitän Gerrit van Doorn",
          role: "Hauptinstruktor & Gründer",
          bio: "Mit über 30 Jahr Segelerfahrig und internationale Regattateilnahme bringt de Gerrit sini Expertise und Begeisterig i jede Kurs ii.",
        },
        {
          name: "Lisa Bergmann",
          role: "Segelinstruktorin",
          bio: "Olympia-Teilnehmerin und zertifizierti Usbildnerin. D Lisa spezialisiert sich uf Aafängerkurs und vermittlet s Segle mit Freud und Geduld.",
        },
      ],
    },
    faq: {
      title: "Hüfig gstellti Frage",
      subtitle: "Alles, wo du über üsi Segelkurs müessch wüsse",
      items: [
        {
          question: "Bruchi Vorkenntnis?",
          answer:
            "Nei, für üse Schnupper- und Grundkurs sind kei Vorkenntnis erforderlich. Mir starte bi null und bringe dir Schritt für Schritt alles bi, wo du müessch wüsse.",
        },
        {
          question: "Was muss ich mitbringe?",
          answer:
            "Bequemi, wetterfesti Chleider, Sunneschutz und gueti Lune! Alli Sicherheitsusrüstig und Segelusrüstig stelle mir zur Verfüegig.",
        },
        {
          question: "Wie gross sind d Kursgruppe?",
          answer:
            "Mir halte üsi Gruppe chlii – maximal 4-6 Teilnehmer pro Kurs. So chöi mir jedem di individuelli Ufmerksamkeit gä, wo für effektivs Lerne nötig isch.",
        },
        {
          question: "Was passiert bi schlechtem Wetter?",
          answer:
            "Sicherheit gaht vor! Bi z starkem Wind oder Unwetter verschiebe mir de Kurs kostenlos oder biete Theorieunterricht aa. Du chasch flexibel en neue Termin wähle.",
        },
        {
          question: "Bechumi es Zertifikat?",
          answer:
            "Ja, nach erfolgrichem Abschluss vom Grund- oder Fortgschrittenekurs bechusch es offiziells Zertifikat, wo international anerkennt isch.",
        },
      ],
    },
    cta: {
      title: "Bereit für dis Segelabenteuer?",
      description:
        "Start jetzt dini Reis und entdeck d Freiheit vom Segle. Üsi erfahrene Instruktore freue sich druf, dich ufem Wasser z begrüesse und dir d Welt vom Segle nöcher z bringe.",
      button: "Jetzt Kurs buche",
    },
    contact: {
      title: "Kontakt",
      subtitle: "Mir freue üs uf dini Nachricht",
      form: {
        name: "Name",
        email: "E-Mail",
        subject: "Betreff",
        message: "Nachricht",
        submit: "Nachricht schicke",
      },
      info: {
        address: "Hafenstraße 12",
        city: "17375 Altwarp, Dütschland",
        phone: "+49 (0) 39778 123456",
        email: "info@segelschule-altwarp.de",
        directions: "Afahrt",
      },
    },
    footer: {
      location: "Segelschule Altwarp",
      address: "Hafenstraße 12, 17375 Altwarp, Dütschland",
      phone: "Tel: +49 (0) 39778 123456",
      email: "info@segelschule-altwarp.de",
      social: "Folg üs",
      copyright: "© 2026 Segelschule Altwarp. Alli Rächt vorbehalte.",
    },
  },
}
