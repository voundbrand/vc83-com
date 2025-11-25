/**
 * CONFERENCE FEEDBACK SURVEY SCHEMA
 *
 * Post-event feedback survey for HaffNet conferences.
 * Collects satisfaction ratings, content feedback, and improvement suggestions.
 *
 * Source: Based on Netigate survey format
 */

import type { FormSchema } from "../types";

export const conferenceFeedbackSurveySchema: FormSchema = {
  version: "1.0.0",

  sections: [
    {
      id: "overall_satisfaction",
      title: "Gesamtzufriedenheit",
      description: "Ihre allgemeine Bewertung der Veranstaltung",
      fields: [
        {
          id: "overall_satisfaction",
          type: "rating",
          label: "Wie zufrieden waren Sie insgesamt mit der Veranstaltung?",
          required: true,
          validation: {
            min: 1,
            max: 5,
          },
          metadata: {
            ratingLabels: {
              1: "Sehr unzufrieden",
              2: "Unzufrieden",
              3: "Neutral",
              4: "Zufrieden",
              5: "Sehr zufrieden",
            },
          },
        },
        {
          id: "nps_score",
          type: "rating",
          label: "Würden Sie diese Veranstaltung weiterempfehlen? (0-10)",
          helpText: "0 = Überhaupt nicht wahrscheinlich, 10 = Äußerst wahrscheinlich",
          required: true,
          validation: {
            min: 0,
            max: 10,
          },
          metadata: {
            type: "nps",
          },
        },
      ],
    },
    {
      id: "content_feedback",
      title: "Inhalte und Programm",
      description: "Bewertung der Programmpunkte und Vorträge",
      fields: [
        {
          id: "content_presentations",
          type: "rating",
          label: "Qualität der Vorträge",
          required: true,
          validation: {
            min: 1,
            max: 5,
          },
          metadata: {
            ratingLabels: {
              1: "Sehr schlecht",
              2: "Schlecht",
              3: "Befriedigend",
              4: "Gut",
              5: "Sehr gut",
            },
          },
        },
        {
          id: "content_relevance",
          type: "rating",
          label: "Relevanz der Themen",
          required: true,
          validation: {
            min: 1,
            max: 5,
          },
          metadata: {
            ratingLabels: {
              1: "Sehr schlecht",
              2: "Schlecht",
              3: "Befriedigend",
              4: "Gut",
              5: "Sehr gut",
            },
          },
        },
        {
          id: "content_speakers",
          type: "rating",
          label: "Kompetenz der Referenten",
          required: true,
          validation: {
            min: 1,
            max: 5,
          },
          metadata: {
            ratingLabels: {
              1: "Sehr schlecht",
              2: "Schlecht",
              3: "Befriedigend",
              4: "Gut",
              5: "Sehr gut",
            },
          },
        },
        {
          id: "content_timing",
          type: "rating",
          label: "Zeitplanung/Takt",
          required: true,
          validation: {
            min: 1,
            max: 5,
          },
          metadata: {
            ratingLabels: {
              1: "Sehr schlecht",
              2: "Schlecht",
              3: "Befriedigend",
              4: "Gut",
              5: "Sehr gut",
            },
          },
        },
        {
          id: "content_highlights",
          type: "textarea",
          label: "Welche Programmpunkte fanden Sie besonders gut?",
          placeholder: "Ihre Meinung...",
          required: false,
        },
        {
          id: "content_improvements",
          type: "textarea",
          label: "Was könnte am Programm verbessert werden?",
          placeholder: "Ihre Verbesserungsvorschläge...",
          required: false,
        },
      ],
    },
    {
      id: "organization_feedback",
      title: "Organisation und Logistik",
      description: "Bewertung der organisatorischen Aspekte",
      fields: [
        {
          id: "org_registration",
          type: "rating",
          label: "Anmeldeprozess",
          required: true,
          validation: {
            min: 1,
            max: 5,
          },
          metadata: {
            ratingLabels: {
              1: "Sehr schlecht",
              2: "Schlecht",
              3: "Befriedigend",
              4: "Gut",
              5: "Sehr gut",
            },
          },
        },
        {
          id: "org_communication",
          type: "rating",
          label: "Kommunikation im Vorfeld",
          required: true,
          validation: {
            min: 1,
            max: 5,
          },
          metadata: {
            ratingLabels: {
              1: "Sehr schlecht",
              2: "Schlecht",
              3: "Befriedigend",
              4: "Gut",
              5: "Sehr gut",
            },
          },
        },
        {
          id: "org_checkin",
          type: "rating",
          label: "Check-in vor Ort",
          required: true,
          validation: {
            min: 1,
            max: 5,
          },
          metadata: {
            ratingLabels: {
              1: "Sehr schlecht",
              2: "Schlecht",
              3: "Befriedigend",
              4: "Gut",
              5: "Sehr gut",
            },
          },
        },
        {
          id: "org_staff",
          type: "rating",
          label: "Betreuung durch das Orga-Team",
          required: true,
          validation: {
            min: 1,
            max: 5,
          },
          metadata: {
            ratingLabels: {
              1: "Sehr schlecht",
              2: "Schlecht",
              3: "Befriedigend",
              4: "Gut",
              5: "Sehr gut",
            },
          },
        },
      ],
    },
    {
      id: "venue_feedback",
      title: "Veranstaltungsort und Verpflegung",
      description: "Bewertung von Location und Catering",
      fields: [
        {
          id: "venue_location",
          type: "rating",
          label: "Veranstaltungsort/Location",
          required: true,
          validation: {
            min: 1,
            max: 5,
          },
          metadata: {
            ratingLabels: {
              1: "Sehr schlecht",
              2: "Schlecht",
              3: "Befriedigend",
              4: "Gut",
              5: "Sehr gut",
            },
          },
        },
        {
          id: "venue_facilities",
          type: "rating",
          label: "Räumlichkeiten/Ausstattung",
          required: true,
          validation: {
            min: 1,
            max: 5,
          },
          metadata: {
            ratingLabels: {
              1: "Sehr schlecht",
              2: "Schlecht",
              3: "Befriedigend",
              4: "Gut",
              5: "Sehr gut",
            },
          },
        },
        {
          id: "venue_catering",
          type: "rating",
          label: "Catering/Verpflegung",
          required: true,
          validation: {
            min: 1,
            max: 5,
          },
          metadata: {
            ratingLabels: {
              1: "Sehr schlecht",
              2: "Schlecht",
              3: "Befriedigend",
              4: "Gut",
              5: "Sehr gut",
            },
          },
        },
        {
          id: "venue_networking",
          type: "rating",
          label: "Networking-Möglichkeiten",
          required: true,
          validation: {
            min: 1,
            max: 5,
          },
          metadata: {
            ratingLabels: {
              1: "Sehr schlecht",
              2: "Schlecht",
              3: "Befriedigend",
              4: "Gut",
              5: "Sehr gut",
            },
          },
        },
        {
          id: "venue_comments",
          type: "textarea",
          label: "Weitere Anmerkungen zu Veranstaltungsort oder Verpflegung",
          placeholder: "Ihre Anmerkungen...",
          required: false,
        },
      ],
    },
    {
      id: "future_topics",
      title: "Zukünftige Veranstaltungen",
      description: "Ihre Wünsche und Anregungen für kommende Events",
      fields: [
        {
          id: "future_topics",
          type: "checkbox",
          label: "Welche Themen würden Sie sich für zukünftige Veranstaltungen wünschen?",
          required: false,
          options: [
            { value: "sportmedizin", label: "Sportmedizin und Leistungsdiagnostik" },
            { value: "rehabilitation", label: "Rehabilitation und Prävention" },
            { value: "digitalisierung", label: "Digitalisierung im Gesundheitswesen" },
            { value: "networking", label: "Networking und Erfahrungsaustausch" },
            { value: "workshops", label: "Praktische Workshops" },
            { value: "forschung", label: "Aktuelle Forschungsergebnisse" },
          ],
        },
        {
          id: "future_suggestions",
          type: "textarea",
          label: "Weitere Themenvorschläge oder Ideen",
          placeholder: "Ihre Vorschläge...",
          required: false,
        },
        {
          id: "would_return",
          type: "radio",
          label: "Würden Sie wieder an einer HaffNet-Veranstaltung teilnehmen?",
          required: true,
          options: [
            { value: "yes", label: "Ja, auf jeden Fall" },
            { value: "maybe", label: "Vielleicht, je nach Thema" },
            { value: "no", label: "Eher nicht" },
          ],
        },
      ],
    },
    {
      id: "additional_feedback",
      title: "Abschließende Anmerkungen",
      description: "Ihr freies Feedback",
      fields: [
        {
          id: "additional_comments",
          type: "textarea",
          label: "Haben Sie noch weitere Anmerkungen, Lob oder Kritik?",
          placeholder: "Ihr Feedback ist uns wichtig...",
          required: false,
        },
      ],
    },
    {
      id: "contact_optional",
      title: "Kontaktdaten (Optional)",
      description: "Wenn Sie möchten, dass wir auf Ihr Feedback persönlich eingehen, können Sie hier Ihre Kontaktdaten hinterlassen.",
      fields: [
        {
          id: "contact_name",
          type: "text",
          label: "Name",
          placeholder: "Vor- und Nachname",
          required: false,
        },
        {
          id: "contact_email",
          type: "email",
          label: "E-Mail",
          placeholder: "ihre.email@beispiel.de",
          required: false,
        },
        {
          id: "contact_organization",
          type: "text",
          label: "Organisation/Praxis",
          placeholder: "Ihre Organisation",
          required: false,
        },
      ],
    },
  ],

  settings: {
    allowMultipleSubmissions: false,
    showProgressBar: true,
    submitButtonText: "Feedback absenden",
    successMessage: "Vielen Dank für Ihr Feedback! Ihre Antworten helfen uns, zukünftige Veranstaltungen noch besser zu gestalten.",
    requireAuth: false,
    saveProgress: true,
  },

  styling: {
    layout: "single-column",
    sectionBorders: true,
    compactMode: false,
  },
};
