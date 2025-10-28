/**
 * HAFFSYMPOSIUM REGISTRATION FORM SCHEMA
 *
 * Defines the field structure for the HaffSymposium event registration form.
 * This schema is used when creating forms from this template.
 *
 * Based on: 8. HaffSymposium der Sportmedizin (31 Mai - 1 Juni 2024)
 */

import type { FormSchema } from "../types";

export const haffSymposiumFormSchema: FormSchema = {
  version: "1.0.0",

  sections: [
    {
      id: "category_selection",
      title: "Anmeldekategorie",
      description: "Bitte helfen Sie uns, Ihre Anmeldung besser zuzuordnen",
      fields: [
        {
          id: "attendee_category",
          type: "radio",
          label: "Teilnahmekategorie",
          required: true,
          options: [
            { value: "external", label: "Ich bin ein externer Teilnehmer." },
            { value: "ameos", label: "Ich bin ein Mitarbeiter der AMEOS Einrichtungen in Vorpommern." },
            { value: "haffnet", label: "Ich bin ein HaffNet-Mitglied/-Partner." },
            { value: "speaker", label: "Ich bin ein Referent der Veranstaltung." },
            { value: "sponsor", label: "Ich bin ein Sponsoring-Partner." },
            { value: "orga", label: "Ich gehöre zum Orga-Team." },
          ],
        },
        {
          id: "other_info",
          type: "textarea",
          label: "Sonstiges",
          placeholder: "Weitere Informationen...",
          required: false,
        },
      ],
    },
    {
      id: "personal_info",
      title: "Zusätzliche Angaben",
      description: "Name, E-Mail, Telefon und Firma wurden bereits im vorherigen Schritt erfasst.",
      fields: [
        {
          id: "salutation",
          type: "select",
          label: "Anrede",
          required: true,
          options: [
            { value: "Herr", label: "Herr" },
            { value: "Frau", label: "Frau" },
          ],
        },
        {
          id: "title",
          type: "select",
          label: "Titel",
          required: false,
          options: [
            { value: "", label: "Kein Titel" },
            { value: "Dr.", label: "Dr." },
            { value: "Prof.", label: "Prof." },
            { value: "Prof. Dr.", label: "Prof. Dr." },
          ],
        },
        {
          id: "profession",
          type: "text",
          label: "Fachrichtung",
          placeholder: "z.B. Fachärztin für Allgemeinmedizin oder Physiotherapeut",
          required: false,
        },
      ],
    },
    {
      id: "external_section",
      title: "Anmeldung zu der Veranstaltung am 31.05.2024 sowie am 01.06.2024",
      description: "Für externe Teilnehmer",
      fields: [
        {
          id: "arrival_time_external",
          type: "time",
          label: "Bitte teilen Sie uns Ihre geplante Anreisezeit im Bürgersaal am 31.05.2024 mit",
          required: false,
        },
        {
          id: "ucra_participants_external",
          type: "radio",
          label: "Mit wie viel Personen möchten Sie an der individuellen Abendveranstaltung auf der Pommernkogge \"UCRA\" teilnehmen?",
          helpText: "Pro Person entstehen Ihnen zusätzliche Kosten von 30,00 EUR",
          required: false,
          options: [
            { value: "0", label: "0 = gar nicht" },
            { value: "1", label: "1 = 1 Person" },
            { value: "2", label: "2 = Sie und Ihre Begleitung" },
          ],
        },
        {
          id: "accommodation_external",
          type: "textarea",
          label: "Informationen rund um Ihre Übernachtung",
          placeholder: "Benötigen Sie eine Übernachtung? Besondere Wünsche?",
          required: false,
        },
        {
          id: "activity_external",
          type: "select",
          label: "Ich möchte an folgender Aktivität am 01.06.2024 teilnehmen",
          required: false,
          options: [
            { value: "workshop_a", label: "Workshop A" },
            { value: "workshop_b", label: "Workshop B" },
            { value: "exkursion", label: "Exkursion" },
            { value: "andere", label: "Andere Aktivität" },
          ],
        },
        {
          id: "bbq_external",
          type: "radio",
          label: "Dürfen wir Sie im Anschluss an Ihre Aktivität zum Grillen & Chillen bei Uwe's Bootsverleih im Standhafen Ueckermünde begrüßen?",
          required: false,
          options: [
            { value: "yes", label: "Ja" },
            { value: "no", label: "Nein" },
          ],
        },
        {
          id: "special_requests_external",
          type: "textarea",
          label: "Möchten Sie uns etwas Bestimmtes mitteilen?",
          placeholder: "z.B. eine Lebensmittelunverträglichkeit, Informationen zu einer Begleitperson oder Ähnliches",
          required: false,
        },
      ],
      conditional: {
        show: "all",
        rules: [
          {
            fieldId: "attendee_category",
            operator: "equals",
            value: "external",
          },
        ],
      },
    },
    {
      id: "ameos_section",
      title: "Ihre Anmeldung als AMEOS Mitarbeiter für die Veranstaltung am 31.05.2024 sowie am 01.06.2024",
      fields: [
        {
          id: "arrival_time_ameos",
          type: "time",
          label: "Bitte teilen Sie uns Ihre geplante Anreisezeit im Bürgersaal am 31.05.2024 mit",
          required: false,
        },
        {
          id: "ucra_participants_ameos",
          type: "radio",
          label: "Mit wie viel Personen möchten Sie an der individuellen Abendveranstaltung auf der Pommernkogge \"UCRA\" teilnehmen?",
          helpText: "Pro Person entstehen Ihnen zusätzliche Kosten von 30,00 EUR",
          required: false,
          options: [
            { value: "0", label: "0 = gar nicht" },
            { value: "1", label: "1 = 1 Person" },
            { value: "2", label: "2 = Sie und Ihre Begleitung" },
          ],
        },
        {
          id: "accommodation_ameos",
          type: "textarea",
          label: "Informationen rund um Ihre Übernachtung",
          placeholder: "Benötigen Sie eine Übernachtung? Besondere Wünsche?",
          required: false,
        },
        {
          id: "activity_ameos",
          type: "select",
          label: "Ich möchte an folgender Aktivität am 01.06.2024 teilnehmen",
          required: false,
          options: [
            { value: "workshop_a", label: "Workshop A" },
            { value: "workshop_b", label: "Workshop B" },
            { value: "exkursion", label: "Exkursion" },
            { value: "andere", label: "Andere Aktivität" },
          ],
        },
        {
          id: "bbq_ameos",
          type: "radio",
          label: "Dürfen wir Sie im Anschluss an Ihre Aktivität zum Grillen & Chillen bei Uwe's Bootsverleih im Standhafen Ueckermünde begrüßen?",
          required: false,
          options: [
            { value: "yes", label: "Ja" },
            { value: "no", label: "Nein" },
          ],
        },
        {
          id: "special_requests_ameos",
          type: "textarea",
          label: "Möchten Sie uns etwas Bestimmtes mitteilen?",
          placeholder: "z.B. eine Lebensmittelunverträglichkeit, Informationen zu einer Begleitperson oder Ähnliches",
          required: false,
        },
      ],
      conditional: {
        show: "all",
        rules: [
          {
            fieldId: "attendee_category",
            operator: "equals",
            value: "ameos",
          },
        ],
      },
    },
    {
      id: "haffnet_section",
      title: "Ihre Anmeldung als HaffNet-Mitglied/-Partner für die Veranstaltung am 31.05.2024 sowie am 01.06.2024",
      fields: [
        {
          id: "arrival_time_haffnet",
          type: "time",
          label: "Bitte teilen Sie uns Ihre geplante Anreisezeit im Bürgersaal am 31.05.2024 mit",
          required: false,
        },
        {
          id: "ucra_participants_haffnet",
          type: "radio",
          label: "Mit wie viel Personen möchten Sie an der individuellen Abendveranstaltung auf der Pommernkogge \"UCRA\" teilnehmen?",
          helpText: "Pro Person entstehen Ihnen zusätzliche Kosten von 30,00 EUR",
          required: false,
          options: [
            { value: "0", label: "0 = gar nicht" },
            { value: "1", label: "1 = 1 Person" },
            { value: "2", label: "2 = Sie und Ihre Begleitung" },
          ],
        },
        {
          id: "accommodation_haffnet",
          type: "textarea",
          label: "Informationen rund um Ihre Übernachtung",
          placeholder: "Benötigen Sie eine Übernachtung? Besondere Wünsche?",
          required: false,
        },
        {
          id: "activity_haffnet",
          type: "select",
          label: "Ich möchte an folgender Aktivität am 01.06.2024 teilnehmen",
          required: false,
          options: [
            { value: "workshop_a", label: "Workshop A" },
            { value: "workshop_b", label: "Workshop B" },
            { value: "exkursion", label: "Exkursion" },
            { value: "andere", label: "Andere Aktivität" },
          ],
        },
        {
          id: "bbq_haffnet",
          type: "radio",
          label: "Dürfen wir Sie im Anschluss an Ihre Aktivität zum Grillen & Chillen bei Uwe's Bootsverleih im Standhafen Ueckermünde begrüßen?",
          required: false,
          options: [
            { value: "yes", label: "Ja" },
            { value: "no", label: "Nein" },
          ],
        },
        {
          id: "special_requests_haffnet",
          type: "textarea",
          label: "Möchten Sie uns etwas Bestimmtes mitteilen?",
          placeholder: "z.B. eine Lebensmittelunverträglichkeit, Informationen zu einer Begleitperson oder Ähnliches",
          required: false,
        },
      ],
      conditional: {
        show: "all",
        rules: [
          {
            fieldId: "attendee_category",
            operator: "equals",
            value: "haffnet",
          },
        ],
      },
    },
    {
      id: "speaker_section",
      title: "Angaben zu Ihrer Teilnahme als Referent am 31.05.2024 sowie am 01.06.2024",
      fields: [
        {
          id: "arrival_time_speaker",
          type: "time",
          label: "Bitte teilen Sie uns Ihre geplante Anreisezeit im Bürgersaal am 31.05.2024 mit",
          required: false,
        },
        {
          id: "ucra_participants_speaker",
          type: "radio",
          label: "Mit wie viel Personen möchten Sie an der individuellen Abendveranstaltung auf der Pommernkogge \"UCRA\" teilnehmen?",
          required: false,
          options: [
            { value: "0", label: "0 = gar nicht" },
            { value: "1", label: "1 = 1 Person" },
            { value: "2", label: "2 = Sie und Ihre Begleitung" },
          ],
        },
        {
          id: "accommodation_speaker",
          type: "textarea",
          label: "Informationen rund um Ihre Übernachtung",
          placeholder: "Benötigen Sie eine Übernachtung? Besondere Wünsche?",
          required: false,
        },
        {
          id: "activity_speaker",
          type: "select",
          label: "Ich möchte an folgender Aktivität am 01.06.2024 teilnehmen",
          required: false,
          options: [
            { value: "workshop_a", label: "Workshop A" },
            { value: "workshop_b", label: "Workshop B" },
            { value: "exkursion", label: "Exkursion" },
            { value: "andere", label: "Andere Aktivität" },
          ],
        },
        {
          id: "bbq_speaker",
          type: "radio",
          label: "Dürfen wir Sie im Anschluss an Ihre Aktivität zum Grillen & Chillen bei Uwe's Bootsverleih im Standhafen Ueckermünde begrüßen?",
          required: false,
          options: [
            { value: "yes", label: "Ja" },
            { value: "no", label: "Nein" },
          ],
        },
        {
          id: "special_requests_speaker",
          type: "textarea",
          label: "Möchten Sie uns etwas Bestimmtes mitteilen?",
          placeholder: "z.B. eine Lebensmittelunverträglichkeit, Informationen zu einer Begleitperson oder Ähnliches",
          required: false,
        },
      ],
      conditional: {
        show: "all",
        rules: [
          {
            fieldId: "attendee_category",
            operator: "equals",
            value: "speaker",
          },
        ],
      },
    },
    {
      id: "sponsor_section",
      title: "Detaillierte Angaben zu Ihrer Teilnahme als Sponsoring-Partner am 31.05.2024 sowie am 01.06.2024",
      fields: [
        {
          id: "arrival_time_sponsor",
          type: "time",
          label: "Bitte teilen Sie uns Ihre geplante Ankunftzeit im Bürgersaal am 31.05.2024 mit",
          required: false,
        },
        {
          id: "sponsor_comment",
          type: "textarea",
          label: "Platz für Ihr Kommentar",
          placeholder: "Ihre Anmerkungen oder Wünsche als Sponsoring-Partner",
          required: false,
        },
        {
          id: "ucra_participants_sponsor",
          type: "radio",
          label: "Mit wie viel Personen möchten Sie an der individuellen Abendveranstaltung auf der Pommernkogge \"UCRA\" teilnehmen?",
          required: false,
          options: [
            { value: "0", label: "0 = gar nicht" },
            { value: "1", label: "1 = 1 Person" },
            { value: "2", label: "2 = Sie und Ihre Begleitung" },
          ],
        },
        {
          id: "accommodation_sponsor",
          type: "textarea",
          label: "Informationen rund um Ihre Übernachtung",
          placeholder: "Benötigen Sie eine Übernachtung? Besondere Wünsche?",
          required: false,
        },
        {
          id: "activity_sponsor",
          type: "select",
          label: "Ich möchte an folgender Aktivität am 01.06.2024 teilnehmen",
          required: false,
          options: [
            { value: "workshop_a", label: "Workshop A" },
            { value: "workshop_b", label: "Workshop B" },
            { value: "exkursion", label: "Exkursion" },
            { value: "andere", label: "Andere Aktivität" },
          ],
        },
        {
          id: "bbq_sponsor",
          type: "radio",
          label: "Dürfen wir Sie im Anschluss an Ihre Aktivität zum Grillen & Chillen bei Uwe's Bootsverleih im Standhafen Ueckermünde begrüßen?",
          required: false,
          options: [
            { value: "yes", label: "Ja" },
            { value: "no", label: "Nein" },
          ],
        },
        {
          id: "sponsor_additional",
          type: "textarea",
          label: "Sonstiges",
          placeholder: "Weitere Informationen oder Wünsche",
          required: false,
        },
        {
          id: "special_requests_sponsor",
          type: "textarea",
          label: "Möchten Sie uns etwas Bestimmtes mitteilen?",
          placeholder: "z.B. eine Lebensmittelunverträglichkeit, Informationen zu einer Begleitperson oder Ähnliches",
          required: false,
        },
      ],
      conditional: {
        show: "all",
        rules: [
          {
            fieldId: "attendee_category",
            operator: "equals",
            value: "sponsor",
          },
        ],
      },
    },
    {
      id: "orga_section",
      title: "Registrierung als Orga-Mitglied für das 8. Haff-Symposium",
      fields: [
        {
          id: "arrival_time_orga",
          type: "time",
          label: "Bitte teilen Sie uns Ihre geplante Anreisezeit im Bürgersaal am 31.05.2024 mit",
          required: false,
        },
        {
          id: "support_activities",
          type: "checkbox",
          label: "Ich unterstütze folgende Aktivitäten am 01.06.2024",
          required: false,
          options: [
            { value: "setup", label: "Aufbau und Vorbereitung" },
            { value: "registration", label: "Registrierung und Check-in" },
            { value: "catering", label: "Catering-Betreuung" },
            { value: "technical", label: "Technische Unterstützung" },
            { value: "workshops", label: "Workshop-Betreuung" },
            { value: "activities_coordination", label: "Aktivitäten-Koordination" },
            { value: "cleanup", label: "Abbau und Nachbereitung" },
          ],
        },
        {
          id: "bbq_orga",
          type: "radio",
          label: "Dürfen wir Sie im Anschluss an Ihre Aktivität zum Grillen & Chillen bei Uwe's Bootsverleih im Standhafen Ueckermünde einplanen?",
          required: false,
          options: [
            { value: "yes", label: "Ja" },
            { value: "no", label: "Nein" },
          ],
        },
        {
          id: "special_requests_orga",
          type: "textarea",
          label: "Möchten Sie uns etwas Bestimmtes mitteilen?",
          placeholder: "z.B. eine Lebensmittelunverträglichkeit, Informationen zu einer Begleitperson oder Ähnliches",
          required: false,
        },
      ],
      conditional: {
        show: "all",
        rules: [
          {
            fieldId: "attendee_category",
            operator: "equals",
            value: "orga",
          },
        ],
      },
    },
  ],

  settings: {
    allowMultipleSubmissions: false,
    showProgressBar: true,
    submitButtonText: "Anmeldung abschicken",
    successMessage: "Vielen Dank für Ihre Anmeldung! Sie erhalten in Kürze eine Bestätigungsmail.",
    requireAuth: false,
    saveProgress: true,
  },

  styling: {
    layout: "single-column",
    sectionBorders: true,
    compactMode: false,
  },
};
