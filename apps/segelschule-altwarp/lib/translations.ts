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
      title: "Segeln lernen – in Ruhe, Schritt für Schritt",
      subtitle: "Nur zweieinhalb Stunden von Berlin entfernt liegt ein Ort, an dem du wieder Vertrauen auf dem Wasser gewinnen kannst.",
      cta: "Kurse entdecken",
    },
    about: {
      title: "Ein Revier, das Raum zum Lernen lässt",
      text: "Das Stettiner Haff ist weit, ruhig und überraschend ursprünglich. Keine überfüllten Wasserstraßen, kein hektischer Bootsverkehr. Stattdessen: weite Horizonte, viel Raum zum Üben und eine Landschaft, die zur Ruhe kommen lässt. Gerade für Menschen aus großen Städten ist diese Ruhe oft der erste Schritt zurück zu einem anderen Rhythmus – langsamer, klarer, näher an der Natur.",
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
        duration: "3 Stunden",
        price: "€79",
        description: "Perfekt zum Reinschnuppern – erlebe die Ostsee vom Wasser aus",
        features: ["3 Stunden auf dem Wasser", "Keine Vorkenntnisse nötig", "Alle Materialien inklusive", "Max. 4 Teilnehmer"],
        id: "schnupper",
        isMultiDay: false,
      },
      grund: {
        title: "Wochenendkurs",
        duration: "Sa + So",
        price: "€199",
        description: "Intensiver Einstieg ins Segeln an einem Wochenende",
        features: ["2 volle Tage", "Theorie & Praxis", "Inkl. Kursunterlagen", "Inkl. T-Shirt"],
        id: "wochenende",
        isMultiDay: true,
      },
      sbf: {
        title: "10er-Karte",
        duration: "Flexibel",
        price: "€350",
        description: "10 Fahrtenstunden flexibel einlösbar – ideal für Wiederkehrer",
        features: ["10 Stunden gültig 1 Jahr", "Flexibel buchbar", "Übertragbar auf Freunde", "Perfekt zum Üben"],
        id: "zehnerkarte",
        isMultiDay: false,
      },
      advanced: {
        title: "5-Tage Wochenkurs",
        duration: "Mo – Fr",
        price: "€449",
        description: "Die komplette Segelausbildung in einer Woche",
        features: ["5 intensive Tage", "Vorbereitung auf Segelschein", "Inkl. Lehrmaterial & T-Shirt", "Prüfung optional"],
        id: "wochenkurs",
        isMultiDay: true,
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
      title: "Die Menschen hinter diesem Ort",
      subtitle: "Mit Erfahrung, Ruhe und Leidenschaft begleiten wir dich auf dem Wasser",
      members: [
        {
          name: "Gerrit",
          role: "Gründer & Kapitän",
          bio: "Gerrit ist der Gründer der Segelschule. Segeln begleitet ihn seit vielen Jahren. Mit der Segelschule erfüllt sich für ihn ein lang gehegter Wunsch: einen Ort zu schaffen, an dem Menschen wieder Vertrauen auf dem Wasser gewinnen können – ruhig, ohne Druck und mit viel Raum zum Lernen.",
        },
        {
          name: "Axinja",
          role: "Kapitänshaus & Naturführerin",
          bio: "Axinja ist die Lebenspartnerin von Gerrit. Gemeinsam betreiben sie den Zukunftsort Kapitänshaus in Altwarp. Sie begleitet Gäste auf Spaziergängen durch die umliegenden Wälder und zeigt, wie viel Ruhe und Kraft in der Natur liegen kann.",
        },
        {
          name: "Isabella",
          role: "Psychologin & Segellehrerin",
          bio: "Isabella hat das Institut für mentale Gesundheit Meerleben gegründet. Sie ist Psychologin, Hochseeskipperin und erfahrene Segellehrerin. Mit mehr als 5.000 Seemeilen Erfahrung verbindet sie Coaching, Psychologie und Segeln auf besondere Weise.",
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
      title: "Eine kleine Auszeit kann viel verändern",
      description:
        "Segeln ist mehr als eine Technik. Es ist eine Erfahrung. Wind, Wasser, Zeit. Viele unserer Teilnehmer gehen nach einem Kurs nicht nur mit mehr Segelkompetenz nach Hause – sondern auch mit einem neuen Gefühl von Ruhe und Klarheit. Wenn du spürst, dass es Zeit ist, wieder aufs Wasser zu gehen, bist du hier genau richtig.",
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
      title: "Learn to Sail – Calmly, Step by Step",
      subtitle: "Just two and a half hours from Berlin lies a place where you can regain confidence on the water.",
      cta: "Discover Courses",
    },
    about: {
      title: "A Region That Gives Space to Learn",
      text: "The Szczecin Lagoon is wide, calm, and surprisingly pristine. No crowded waterways, no hectic boat traffic. Instead: wide horizons, plenty of room to practice, and a landscape that invites tranquility. For people from big cities, this calm is often the first step back to a different rhythm – slower, clearer, closer to nature.",
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
        duration: "3 Hours",
        price: "€79",
        description: "Perfect for trying out – experience the Baltic Sea from the water",
        features: ["3 hours on the water", "No prior experience needed", "All materials included", "Max. 4 participants"],
        id: "schnupper",
        isMultiDay: false,
      },
      grund: {
        title: "Weekend Course",
        duration: "Sat + Sun",
        price: "€199",
        description: "Intensive introduction to sailing over a weekend",
        features: ["2 full days", "Theory & Practice", "Incl. course materials", "Incl. T-Shirt"],
        id: "wochenende",
        isMultiDay: true,
      },
      sbf: {
        title: "10-Ride Pass",
        duration: "Flexible",
        price: "€350",
        description: "10 sailing hours, flexibly redeemable – ideal for returning sailors",
        features: ["10 hours valid 1 year", "Book flexibly", "Transferable to friends", "Perfect for practice"],
        id: "zehnerkarte",
        isMultiDay: false,
      },
      advanced: {
        title: "5-Day Week Course",
        duration: "Mon – Fri",
        price: "€449",
        description: "Complete sailing training in one week",
        features: ["5 intensive days", "Sailing license preparation", "Incl. materials & T-Shirt", "Exam optional"],
        id: "wochenkurs",
        isMultiDay: true,
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
      title: "The People Behind This Place",
      subtitle: "With experience, calm, and passion, we accompany you on the water",
      members: [
        {
          name: "Gerrit",
          role: "Founder & Captain",
          bio: "Gerrit is the founder of the sailing school. Sailing has been part of his life for many years. With the sailing school, he fulfills a long-held wish: to create a place where people can regain confidence on the water – calmly, without pressure, and with plenty of room to learn.",
        },
        {
          name: "Axinja",
          role: "Captain's House & Nature Guide",
          bio: "Axinja is Gerrit's partner. Together they run the Kapitänshaus retreat in Altwarp. She accompanies guests on walks through the surrounding forests, showing how much calm and strength can be found in nature.",
        },
        {
          name: "Isabella",
          role: "Psychologist & Sailing Instructor",
          bio: "Isabella founded the Meerleben institute for mental health. She is a psychologist, offshore skipper, and experienced sailing instructor. With over 5,000 nautical miles of experience, she uniquely combines coaching, psychology, and sailing.",
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
      title: "A Short Break Can Change a Lot",
      description:
        "Sailing is more than a technique. It is an experience. Wind, water, time. Many of our participants go home after a course not only with more sailing competence – but also with a new sense of calm and clarity. If you feel it's time to get back on the water, you're exactly in the right place.",
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
      title: "Leer zeilen – rustig, stap voor stap",
      subtitle: "Op slechts tweeënhalf uur van Berlijn ligt een plek waar je weer vertrouwen op het water kunt opbouwen.",
      cta: "Ontdek cursussen",
    },
    about: {
      title: "Een revier dat ruimte geeft om te leren",
      text: "Het Stettiner Haff is breed, rustig en verrassend oorspronkelijk. Geen overvolle waterwegen, geen hectisch bootverkeer. In plaats daarvan: wijde horizonten, veel ruimte om te oefenen en een landschap dat tot rust laat komen. Juist voor mensen uit grote steden is deze rust vaak de eerste stap terug naar een ander ritme – langzamer, helderder, dichter bij de natuur.",
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
        duration: "3 Uur",
        price: "€79",
        description: "Perfect om te proberen – ervaar de Oostzee vanaf het water",
        features: ["3 uur op het water", "Geen voorkennis nodig", "Alle materialen inbegrepen", "Max. 4 deelnemers"],
        id: "schnupper",
        isMultiDay: false,
      },
      grund: {
        title: "Weekendcursus",
        duration: "Za + Zo",
        price: "€199",
        description: "Intensieve introductie tot zeilen in een weekend",
        features: ["2 volle dagen", "Theorie & Praktijk", "Incl. cursusmateriaal", "Incl. T-Shirt"],
        id: "wochenende",
        isMultiDay: true,
      },
      sbf: {
        title: "10-Rittenkaart",
        duration: "Flexibel",
        price: "€350",
        description: "10 zeiluren flexibel inwisselbaar – ideaal voor terugkeerders",
        features: ["10 uur geldig 1 jaar", "Flexibel te boeken", "Overdraagbaar aan vrienden", "Perfect om te oefenen"],
        id: "zehnerkarte",
        isMultiDay: false,
      },
      advanced: {
        title: "5-Daagse Weekcursus",
        duration: "Ma – Vr",
        price: "€449",
        description: "Complete zeilopleiding in één week",
        features: ["5 intensieve dagen", "Vaarbewijs voorbereiding", "Incl. materiaal & T-Shirt", "Examen optioneel"],
        id: "wochenkurs",
        isMultiDay: true,
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
      title: "De mensen achter deze plek",
      subtitle: "Met ervaring, rust en passie begeleiden wij je op het water",
      members: [
        {
          name: "Gerrit",
          role: "Oprichter & Kapitein",
          bio: "Gerrit is de oprichter van de zeilschool. Zeilen maakt al vele jaren deel uit van zijn leven. Met de zeilschool vervult hij een langgekoesterde wens: een plek creëren waar mensen weer vertrouwen kunnen opbouwen op het water – rustig, zonder druk en met veel ruimte om te leren.",
        },
        {
          name: "Axinja",
          role: "Kapiteinshuis & Natuurgids",
          bio: "Axinja is de partner van Gerrit. Samen runnen zij het Kapitänshaus in Altwarp. Zij begeleidt gasten op wandelingen door de omliggende bossen en laat zien hoeveel rust en kracht de natuur kan bieden.",
        },
        {
          name: "Isabella",
          role: "Psycholoog & Zeilinstructeur",
          bio: "Isabella richtte het Meerleben instituut voor mentale gezondheid op. Zij is psycholoog, offshore schipper en ervaren zeilinstructeur. Met meer dan 5.000 zeemijlen ervaring combineert zij coaching, psychologie en zeilen op unieke wijze.",
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
      title: "Een korte pauze kan veel veranderen",
      description:
        "Zeilen is meer dan een techniek. Het is een ervaring. Wind, water, tijd. Veel van onze deelnemers gaan na een cursus niet alleen met meer zeilcompetentie naar huis – maar ook met een nieuw gevoel van rust en helderheid. Als je voelt dat het tijd is om weer het water op te gaan, ben je hier precies op de juiste plek.",
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
      title: "Segle lerne – i Rueh, Schritt für Schritt",
      subtitle: "Nur zwöiehalb Stund vo Berlin äwägg ligt en Ort, wo du wieder Vertraue ufem Wasser gwinnsch.",
      cta: "Kurs entdecke",
    },
    about: {
      title: "Es Revier, wo Platz zum Lerne git",
      text: "S Stettiner Haff isch wiit, ruehig und überraschend ursprünglich. Kei überfüllte Wasserstrosse, kein hektische Bootverkehr. Stattdesse: wiiti Horizont, viel Platz zum Üebe und e Landschaft, wo zur Rueh cho lat. Grad für Lüüt us grosse Städt isch die Rueh oft de erscht Schritt zrugg zu nem andere Rhythmus – langsamer, klarer, nächer a de Natur.",
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
        duration: "3 Stund",
        price: "€79",
        description: "Perfekt zum Riischnuppere – erleb d Ostsee vom Wasser us",
        features: ["3 Stund ufem Wasser", "Kei Vorkenntniss nötig", "Alli Materiale inklusive", "Max. 4 Teilnehmer"],
        id: "schnupper",
        isMultiDay: false,
      },
      grund: {
        title: "Wuchenändkurs",
        duration: "Sa + So",
        price: "€199",
        description: "Intensive Iistig is Segle a eim Wuchenänd",
        features: ["2 ganzi Täg", "Theorie & Praxis", "Inkl. Kursunterläge", "Inkl. T-Shirt"],
        id: "wochenende",
        isMultiDay: true,
      },
      sbf: {
        title: "10er-Charte",
        duration: "Flexibel",
        price: "€350",
        description: "10 Fahrtestunde flexibel iilösbar – ideal für Wiederkehrer",
        features: ["10 Stund gültig 1 Jahr", "Flexibel buechbar", "Übertragbar uf Fründe", "Perfekt zum Üebe"],
        id: "zehnerkarte",
        isMultiDay: false,
      },
      advanced: {
        title: "5-Täg Wuchekurs",
        duration: "Mo – Fr",
        price: "€449",
        description: "Di kompletti Segelusbildig i ere Wuche",
        features: ["5 intensivi Täg", "Vorbereitung uf Segelschiin", "Inkl. Lehrmaterial & T-Shirt", "Prüefig optional"],
        id: "wochenkurs",
        isMultiDay: true,
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
      title: "D Mensche hinter dem Ort",
      subtitle: "Mit Erfahrig, Rueh und Leidenschaft begleite mir dich ufem Wasser",
      members: [
        {
          name: "Gerrit",
          role: "Gründer & Kapitän",
          bio: "De Gerrit isch de Gründer vo de Segelschuel. S Segle begleitet ihn sit viele Jahr. Mit de Segelschuel erfüllt sich für ihn en lang ghegter Wunsch: en Ort schaffe, wo Mensche wieder Vertraue ufem Wasser gwünne chöi – ruehig, ohni Druck und mit viel Platz zum Lerne.",
        },
        {
          name: "Axinja",
          role: "Kapitänshuus & Naturfüehrerin",
          bio: "D Axinja isch d Lebenspartnerin vom Gerrit. Zäme betriebe si de Zukunftsort Kapitänshuus z Altwarp. Si begleitet Gäst uf Spaziergäng dür d umliggende Wälder und zeigt, wieviel Rueh und Chraft i de Natur cha liege.",
        },
        {
          name: "Isabella",
          role: "Psychologin & Segellehrerin",
          bio: "D Isabella het s Institut für mentali Gsundheit Meerlebe gründet. Si isch Psychologin, Hochseeskipperin und erfahreni Segellehrerin. Mit meh als 5.000 Seemiile Erfahrig verbindet si Coaching, Psychologie und Segle uf bsunderi Art.",
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
      title: "E chliini Usziit cha viel verändere",
      description:
        "Segle isch meh als e Technik. Es isch e Erfahrig. Wind, Wasser, Ziit. Vieli vo üsne Teilnehmer gönd nach emne Kurs nöd nur mit meh Segelkompetänz hei – sondern au mit emne neue Gfüehl vo Rueh und Klarheit. Wenn du spürsch, dass es Ziit isch, wieder ufs Wasser z goh, bisch du da genau richtig.",
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
