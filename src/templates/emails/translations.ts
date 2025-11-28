/**
 * GENERIC EMAIL TRANSLATIONS
 *
 * Multi-language support for all generic email templates.
 * Supports: EN (English), DE (German), ES (Spanish), FR (French)
 */

export type SupportedLanguage = "en" | "de" | "es" | "fr";

/**
 * Translation keys for email UI elements
 */
export interface EmailTranslationKeys {
  // Common
  greeting: string; // "Hello"
  regards: string; // "Best regards"
  team: string; // "The {{companyName}} Team"
  copyright: string; // "© {{year}} {{companyName}}. All rights reserved."
  unsubscribe: string; // "Unsubscribe from these emails"

  // Sections
  eventDetails: string; // "Event Details"
  orderSummary: string; // "Order Summary"
  shippingDetails: string; // "Shipping Details"
  accountInfo: string; // "Account Information"
  supportTicket: string; // "Support Ticket"
  attachments: string; // "Attachments"

  // Event fields
  event: string; // "Event"
  date: string; // "Date"
  time: string; // "Time"
  location: string; // "Location"
  guests: string; // "Guests"

  // Order fields
  orderNumber: string; // "Order Number"
  orderDate: string; // "Order Date"
  item: string; // "Item"
  quantity: string; // "Quantity"
  price: string; // "Price"
  subtotal: string; // "Subtotal"
  tax: string; // "Tax"
  shipping: string; // "Shipping"
  total: string; // "Total"
  paymentMethod: string; // "Payment Method"

  // Shipping fields
  trackingNumber: string; // "Tracking Number"
  carrier: string; // "Carrier"
  estimatedDelivery: string; // "Estimated Delivery"
  shippingAddress: string; // "Shipping Address"
  trackShipment: string; // "Track Shipment"

  // Account fields
  username: string; // "Username"
  email: string; // "Email"
  verifyEmail: string; // "Verify Email"
  resetPassword: string; // "Reset Password"
  linkExpires: string; // "Link expires in {{time}}"

  // Support fields
  ticketStatus: string; // "Status"
  assignedTo: string; // "Assigned to"
  nextSteps: string; // "Next Steps"

  // Status messages
  statusProcessing: string; // "Processing"
  statusShipped: string; // "Shipped"
  statusDelivered: string; // "Delivered"
  statusDelayed: string; // "Delayed"
  statusOpen: string; // "Open"
  statusInProgress: string; // "In Progress"
  statusResolved: string; // "Resolved"
  statusClosed: string; // "Closed"

  // Actions
  viewOrder: string; // "View Order"
  downloadReceipt: string; // "Download Receipt"
  contactSupport: string; // "Contact Support"
  learnMore: string; // "Learn More"
  getStarted: string; // "Get Started"

  // Ticket/Event Confirmation Content
  ticketConfirmationTitle: string; // "Reservation Confirmed"
  ticketThankYou: string; // "Thank you for your registration..."
  ticketPdfAttachment: string; // "Event Ticket (PDF)"
  ticketPdfDescription: string; // "Your personalized ticket with QR code..."
  calendarFile: string; // "Calendar File (ICS)"
  calendarFileDescription: string; // "Click the attached .ics file..."
  usefulLinks: string; // "Useful Links"
  getDirections: string; // "Get Directions"
  openEventPage: string; // "Open Event Page"
  importantNote: string; // "Important Note"
  exclusiveEventNote: string; // "This is a curated, exclusive event..."
  lookForward: string; // "We look forward to your visit"
  presentAtEntrance: string; // "Please present this ticket at the entrance"
}

/**
 * English Translations
 */
export const EN_TRANSLATIONS: EmailTranslationKeys = {
  // Common
  greeting: "Hello",
  regards: "Best regards",
  team: "The {{companyName}} Team",
  copyright: "© {{year}} {{companyName}}. All rights reserved.",
  unsubscribe: "Unsubscribe from these emails",

  // Sections
  eventDetails: "Event Details",
  orderSummary: "Order Summary",
  shippingDetails: "Shipping Details",
  accountInfo: "Account Information",
  supportTicket: "Support Ticket",
  attachments: "Attachments",

  // Event fields
  event: "Event",
  date: "Date",
  time: "Time",
  location: "Location",
  guests: "Guests",

  // Order fields
  orderNumber: "Order Number",
  orderDate: "Order Date",
  item: "Item",
  quantity: "Qty",
  price: "Price",
  subtotal: "Subtotal",
  tax: "Tax",
  shipping: "Shipping",
  total: "Total",
  paymentMethod: "Payment Method",

  // Shipping fields
  trackingNumber: "Tracking Number",
  carrier: "Carrier",
  estimatedDelivery: "Estimated Delivery",
  shippingAddress: "Shipping Address",
  trackShipment: "Track Shipment",

  // Account fields
  username: "Username",
  email: "Email",
  verifyEmail: "Verify Email Address",
  resetPassword: "Reset Password",
  linkExpires: "Link expires in {{time}}",

  // Support fields
  ticketStatus: "Status",
  assignedTo: "Assigned to",
  nextSteps: "Next Steps",

  // Status messages
  statusProcessing: "Processing",
  statusShipped: "Shipped",
  statusDelivered: "Delivered",
  statusDelayed: "Delayed",
  statusOpen: "Open",
  statusInProgress: "In Progress",
  statusResolved: "Resolved",
  statusClosed: "Closed",

  // Actions
  viewOrder: "View Order",
  downloadReceipt: "Download Receipt",
  contactSupport: "Contact Support",
  learnMore: "Learn More",
  getStarted: "Get Started",

  // Ticket/Event Confirmation Content
  ticketConfirmationTitle: "Reservation Confirmed",
  ticketThankYou: "Thank you for your registration. Your reservation has been successfully confirmed. We look forward to welcoming you to our exclusive circle.",
  ticketPdfAttachment: "Event Ticket (PDF)",
  ticketPdfDescription: "Your personalized ticket with QR code. Please present it at the entrance.",
  calendarFile: "Calendar File (ICS)",
  calendarFileDescription: "Click the attached .ics file to add the event directly to your calendar.",
  usefulLinks: "Useful Links",
  getDirections: "Get Directions",
  openEventPage: "Open Event Page",
  importantNote: "Important Note",
  exclusiveEventNote: "This is a curated, exclusive event. Please treat the details confidentially. Entry is only possible with a valid ticket.",
  lookForward: "We look forward to your visit",
  presentAtEntrance: "Please present this ticket (digital or printed) at the event entrance",
};

/**
 * German Translations
 */
export const DE_TRANSLATIONS: EmailTranslationKeys = {
  // Common
  greeting: "Hallo",
  regards: "Mit freundlichen Grüßen",
  team: "Das {{companyName}} Team",
  copyright: "© {{year}} {{companyName}}. Alle Rechte vorbehalten.",
  unsubscribe: "Von diesen E-Mails abmelden",

  // Sections
  eventDetails: "Veranstaltungsdetails",
  orderSummary: "Bestellübersicht",
  shippingDetails: "Versanddetails",
  accountInfo: "Kontoinformationen",
  supportTicket: "Support-Ticket",
  attachments: "Anhänge",

  // Event fields
  event: "Veranstaltung",
  date: "Datum",
  time: "Uhrzeit",
  location: "Ort",
  guests: "Gäste",

  // Order fields
  orderNumber: "Bestellnummer",
  orderDate: "Bestelldatum",
  item: "Artikel",
  quantity: "Anz.",
  price: "Preis",
  subtotal: "Zwischensumme",
  tax: "MwSt.",
  shipping: "Versand",
  total: "Gesamt",
  paymentMethod: "Zahlungsmethode",

  // Shipping fields
  trackingNumber: "Sendungsnummer",
  carrier: "Versanddienstleister",
  estimatedDelivery: "Voraussichtliche Lieferung",
  shippingAddress: "Lieferadresse",
  trackShipment: "Sendung verfolgen",

  // Account fields
  username: "Benutzername",
  email: "E-Mail",
  verifyEmail: "E-Mail-Adresse bestätigen",
  resetPassword: "Passwort zurücksetzen",
  linkExpires: "Link läuft ab in {{time}}",

  // Support fields
  ticketStatus: "Status",
  assignedTo: "Zugewiesen an",
  nextSteps: "Nächste Schritte",

  // Status messages
  statusProcessing: "In Bearbeitung",
  statusShipped: "Versendet",
  statusDelivered: "Zugestellt",
  statusDelayed: "Verzögert",
  statusOpen: "Offen",
  statusInProgress: "In Arbeit",
  statusResolved: "Gelöst",
  statusClosed: "Geschlossen",

  // Actions
  viewOrder: "Bestellung ansehen",
  downloadReceipt: "Quittung herunterladen",
  contactSupport: "Support kontaktieren",
  learnMore: "Mehr erfahren",
  getStarted: "Loslegen",

  // Ticket/Event Confirmation Content
  ticketConfirmationTitle: "Reservierung Bestätigt",
  ticketThankYou: "Vielen Dank für deine Anmeldung. Deine Reservierung wurde erfolgreich bestätigt. Wir freuen uns, dich in unserem exklusiven Kreis begrüßen zu dürfen.",
  ticketPdfAttachment: "Event-Ticket (PDF)",
  ticketPdfDescription: "Dein personalisiertes Ticket mit QR-Code. Bitte zeig es am Eingang vor.",
  calendarFile: "Kalenderdatei (ICS)",
  calendarFileDescription: "Klicke auf die angehängte .ics-Datei, um das Event direkt zu deinem Kalender hinzuzufügen.",
  usefulLinks: "Nützliche Links",
  getDirections: "Wegbeschreibung",
  openEventPage: "Event-Seite öffnen",
  importantNote: "Wichtiger Hinweis",
  exclusiveEventNote: "Dies ist eine kuratierte, exklusive Veranstaltung. Bitte behandle die Details vertraulich. Der Zutritt ist nur mit gültigem Ticket möglich.",
  lookForward: "Wir freuen uns auf deinen Besuch",
  presentAtEntrance: "Bitte zeige dieses Ticket (digital oder gedruckt) am Veranstaltungseingang vor",
};

/**
 * Spanish Translations
 */
export const ES_TRANSLATIONS: EmailTranslationKeys = {
  // Common
  greeting: "Hola",
  regards: "Saludos cordiales",
  team: "El equipo de {{companyName}}",
  copyright: "© {{year}} {{companyName}}. Todos los derechos reservados.",
  unsubscribe: "Cancelar suscripción a estos correos",

  // Sections
  eventDetails: "Detalles del evento",
  orderSummary: "Resumen del pedido",
  shippingDetails: "Detalles de envío",
  accountInfo: "Información de la cuenta",
  supportTicket: "Ticket de soporte",
  attachments: "Archivos adjuntos",

  // Event fields
  event: "Evento",
  date: "Fecha",
  time: "Hora",
  location: "Ubicación",
  guests: "Invitados",

  // Order fields
  orderNumber: "Número de pedido",
  orderDate: "Fecha del pedido",
  item: "Artículo",
  quantity: "Cant.",
  price: "Precio",
  subtotal: "Subtotal",
  tax: "Impuestos",
  shipping: "Envío",
  total: "Total",
  paymentMethod: "Método de pago",

  // Shipping fields
  trackingNumber: "Número de seguimiento",
  carrier: "Transportista",
  estimatedDelivery: "Entrega estimada",
  shippingAddress: "Dirección de envío",
  trackShipment: "Rastrear envío",

  // Account fields
  username: "Nombre de usuario",
  email: "Correo electrónico",
  verifyEmail: "Verificar dirección de correo",
  resetPassword: "Restablecer contraseña",
  linkExpires: "El enlace expira en {{time}}",

  // Support fields
  ticketStatus: "Estado",
  assignedTo: "Asignado a",
  nextSteps: "Próximos pasos",

  // Status messages
  statusProcessing: "Procesando",
  statusShipped: "Enviado",
  statusDelivered: "Entregado",
  statusDelayed: "Retrasado",
  statusOpen: "Abierto",
  statusInProgress: "En progreso",
  statusResolved: "Resuelto",
  statusClosed: "Cerrado",

  // Actions
  viewOrder: "Ver pedido",
  downloadReceipt: "Descargar recibo",
  contactSupport: "Contactar soporte",
  learnMore: "Aprender más",
  getStarted: "Comenzar",

  // Ticket/Event Confirmation Content
  ticketConfirmationTitle: "Reserva Confirmada",
  ticketThankYou: "Gracias por tu registro. Tu reserva ha sido confirmada exitosamente. Esperamos darte la bienvenida a nuestro círculo exclusivo.",
  ticketPdfAttachment: "Boleto del Evento (PDF)",
  ticketPdfDescription: "Tu boleto personalizado con código QR. Por favor preséntalo en la entrada.",
  calendarFile: "Archivo de Calendario (ICS)",
  calendarFileDescription: "Haz clic en el archivo .ics adjunto para agregar el evento directamente a tu calendario.",
  usefulLinks: "Enlaces Útiles",
  getDirections: "Obtener Direcciones",
  openEventPage: "Abrir Página del Evento",
  importantNote: "Nota Importante",
  exclusiveEventNote: "Este es un evento curado y exclusivo. Por favor trata los detalles de manera confidencial. La entrada solo es posible con un boleto válido.",
  lookForward: "Esperamos tu visita",
  presentAtEntrance: "Por favor presenta este boleto (digital o impreso) en la entrada del evento",
};

/**
 * French Translations
 */
export const FR_TRANSLATIONS: EmailTranslationKeys = {
  // Common
  greeting: "Bonjour",
  regards: "Cordialement",
  team: "L'équipe {{companyName}}",
  copyright: "© {{year}} {{companyName}}. Tous droits réservés.",
  unsubscribe: "Se désabonner de ces e-mails",

  // Sections
  eventDetails: "Détails de l'événement",
  orderSummary: "Résumé de la commande",
  shippingDetails: "Détails de livraison",
  accountInfo: "Informations du compte",
  supportTicket: "Ticket de support",
  attachments: "Pièces jointes",

  // Event fields
  event: "Événement",
  date: "Date",
  time: "Heure",
  location: "Lieu",
  guests: "Invités",

  // Order fields
  orderNumber: "Numéro de commande",
  orderDate: "Date de commande",
  item: "Article",
  quantity: "Qté",
  price: "Prix",
  subtotal: "Sous-total",
  tax: "Taxe",
  shipping: "Livraison",
  total: "Total",
  paymentMethod: "Méthode de paiement",

  // Shipping fields
  trackingNumber: "Numéro de suivi",
  carrier: "Transporteur",
  estimatedDelivery: "Livraison estimée",
  shippingAddress: "Adresse de livraison",
  trackShipment: "Suivre l'envoi",

  // Account fields
  username: "Nom d'utilisateur",
  email: "E-mail",
  verifyEmail: "Vérifier l'adresse e-mail",
  resetPassword: "Réinitialiser le mot de passe",
  linkExpires: "Le lien expire dans {{time}}",

  // Support fields
  ticketStatus: "Statut",
  assignedTo: "Assigné à",
  nextSteps: "Prochaines étapes",

  // Status messages
  statusProcessing: "En cours de traitement",
  statusShipped: "Expédié",
  statusDelivered: "Livré",
  statusDelayed: "Retardé",
  statusOpen: "Ouvert",
  statusInProgress: "En cours",
  statusResolved: "Résolu",
  statusClosed: "Fermé",

  // Actions
  viewOrder: "Voir la commande",
  downloadReceipt: "Télécharger le reçu",
  contactSupport: "Contacter le support",
  learnMore: "En savoir plus",
  getStarted: "Commencer",

  // Ticket/Event Confirmation Content
  ticketConfirmationTitle: "Réservation Confirmée",
  ticketThankYou: "Merci pour votre inscription. Votre réservation a été confirmée avec succès. Nous sommes impatients de vous accueillir dans notre cercle exclusif.",
  ticketPdfAttachment: "Billet d'Événement (PDF)",
  ticketPdfDescription: "Votre billet personnalisé avec code QR. Veuillez le présenter à l'entrée.",
  calendarFile: "Fichier Calendrier (ICS)",
  calendarFileDescription: "Cliquez sur le fichier .ics joint pour ajouter l'événement directement à votre calendrier.",
  usefulLinks: "Liens Utiles",
  getDirections: "Obtenir l'Itinéraire",
  openEventPage: "Ouvrir la Page de l'Événement",
  importantNote: "Note Importante",
  exclusiveEventNote: "Il s'agit d'un événement exclusif et organisé. Veuillez traiter les détails de manière confidentielle. L'entrée n'est possible qu'avec un billet valide.",
  lookForward: "Nous avons hâte de vous voir",
  presentAtEntrance: "Veuillez présenter ce billet (numérique ou imprimé) à l'entrée de l'événement",
};

/**
 * Get translations for a language
 */
export function getTranslations(language: SupportedLanguage): EmailTranslationKeys {
  const translations = {
    en: EN_TRANSLATIONS,
    de: DE_TRANSLATIONS,
    es: ES_TRANSLATIONS,
    fr: FR_TRANSLATIONS,
  };

  return translations[language] || EN_TRANSLATIONS;
}

/**
 * Replace template variables in a string
 * Example: "The {{companyName}} Team" with {companyName: "Acme"} => "The Acme Team"
 */
export function replaceVariables(str: string, variables: Record<string, string | number>): string {
  let result = str;
  Object.keys(variables).forEach(key => {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(variables[key]));
  });
  return result;
}
