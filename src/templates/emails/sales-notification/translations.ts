/**
 * SALES NOTIFICATION EMAIL TRANSLATIONS
 *
 * Internal notification sent to sales team when tickets are created.
 * Languages: DE, EN, ES, FR
 */

export interface SalesNotificationTranslations {
  title: string;
  newReservation: string;
  guestInformation: string;
  eventDetails: string;
  quickActions: string;
  contactGuest: string;
  call: string;
  noteTicketAttached: string;
  reservationTime: string;
  reservationId: string;
  automaticNotification: string;

  // Fields
  name: string;
  phone: string;
  email: string;
  guestCount: string;
  event: string;
  date: string;
  time: string;
  location: string;

  // Guest count helpers
  mainGuestOnly: string;
  personSingular: string;
  personPlural: string;
  mainGuestPlus: string;
}

export const salesNotificationTranslations: Record<string, SalesNotificationTranslations> = {
  de: {
    title: "Neue Event-Reservierung",
    newReservation: "✓ Neue Reservierung",
    guestInformation: "👤 Gast Informationen",
    eventDetails: "📅 Event Details",
    quickActions: "⚡ Schnelle Aktionen",
    contactGuest: "📧 Gast kontaktieren",
    call: "📞 Anrufen",
    noteTicketAttached: "Hinweis: Ticket-PDF ist als Anhang beigefügt",
    reservationTime: "Anmeldezeitpunkt:",
    reservationId: "Reservierungs-ID:",
    automaticNotification: "Automatische Benachrichtigung",

    name: "Name:",
    phone: "Telefon:",
    email: "E-Mail:",
    guestCount: "Gästezahl:",
    event: "Event:",
    date: "Datum:",
    time: "Zeit:",
    location: "Ort:",

    mainGuestOnly: "1 Person (nur Hauptgast)",
    personSingular: "Person",
    personPlural: "Personen",
    mainGuestPlus: "Hauptgast +",
  },

  en: {
    title: "New Event Reservation",
    newReservation: "✓ New Reservation",
    guestInformation: "👤 Guest Information",
    eventDetails: "📅 Event Details",
    quickActions: "⚡ Quick Actions",
    contactGuest: "📧 Contact Guest",
    call: "📞 Call",
    noteTicketAttached: "Note: Ticket PDF is attached",
    reservationTime: "Registration Time:",
    reservationId: "Reservation ID:",
    automaticNotification: "Automatic Notification",

    name: "Name:",
    phone: "Phone:",
    email: "Email:",
    guestCount: "Guest Count:",
    event: "Event:",
    date: "Date:",
    time: "Time:",
    location: "Location:",

    mainGuestOnly: "1 person (main guest only)",
    personSingular: "person",
    personPlural: "people",
    mainGuestPlus: "Main guest +",
  },

  es: {
    title: "Nueva Reserva de Evento",
    newReservation: "✓ Nueva Reserva",
    guestInformation: "👤 Información del Invitado",
    eventDetails: "📅 Detalles del Evento",
    quickActions: "⚡ Acciones Rápidas",
    contactGuest: "📧 Contactar Invitado",
    call: "📞 Llamar",
    noteTicketAttached: "Nota: PDF del boleto adjunto",
    reservationTime: "Hora de Registro:",
    reservationId: "ID de Reserva:",
    automaticNotification: "Notificación Automática",

    name: "Nombre:",
    phone: "Teléfono:",
    email: "Correo:",
    guestCount: "Número de Invitados:",
    event: "Evento:",
    date: "Fecha:",
    time: "Hora:",
    location: "Ubicación:",

    mainGuestOnly: "1 persona (solo invitado principal)",
    personSingular: "persona",
    personPlural: "personas",
    mainGuestPlus: "Invitado principal +",
  },

  fr: {
    title: "Nouvelle Réservation d'Événement",
    newReservation: "✓ Nouvelle Réservation",
    guestInformation: "👤 Informations sur l'Invité",
    eventDetails: "📅 Détails de l'Événement",
    quickActions: "⚡ Actions Rapides",
    contactGuest: "📧 Contacter l'Invité",
    call: "📞 Appeler",
    noteTicketAttached: "Note : PDF du billet joint",
    reservationTime: "Heure d'Inscription :",
    reservationId: "ID de Réservation :",
    automaticNotification: "Notification Automatique",

    name: "Nom :",
    phone: "Téléphone :",
    email: "E-mail :",
    guestCount: "Nombre d'Invités :",
    event: "Événement :",
    date: "Date :",
    time: "Heure :",
    location: "Lieu :",

    mainGuestOnly: "1 personne (invité principal uniquement)",
    personSingular: "personne",
    personPlural: "personnes",
    mainGuestPlus: "Invité principal +",
  },
};
