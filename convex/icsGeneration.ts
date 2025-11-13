/**
 * ICS CALENDAR FILE GENERATION
 *
 * Generates .ics (iCalendar) files for events
 * Supports standard calendar applications (Google, Apple, Outlook)
 */

/**
 * Generate ICS calendar file content
 *
 * @param event Event details
 * @returns ICS file content as string
 */
export function generateICSFile(params: {
  eventName: string;
  eventDescription: string;
  eventLocation: string;
  startDate: string; // YYYY-MM-DD format
  startTime: string; // HH:MM format
  durationHours: number;
  organizerEmail: string;
  attendeeEmail: string;
  attendeeName: string;
  url?: string;
}): string {
  const {
    eventName,
    eventDescription,
    eventLocation,
    startDate,
    startTime,
    durationHours,
    organizerEmail,
    attendeeEmail,
    attendeeName,
    url,
  } = params;

  // Validate inputs
  if (typeof startDate !== 'string' || typeof startTime !== 'string') {
    throw new Error(`Invalid date/time format: startDate=${typeof startDate}, startTime=${typeof startTime}`);
  }

  // Parse start date and time
  const [year, month, day] = startDate.split('-').map(Number);
  const [hour, minute] = startTime.split(':').map(Number);

  // Create Date objects
  const startDateTime = new Date(year, month - 1, day, hour, minute);
  const endDateTime = new Date(startDateTime.getTime() + durationHours * 60 * 60 * 1000);

  // Format dates for ICS (YYYYMMDDTHHMMSS format)
  const formatICSDate = (date: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  };

  const dtStart = formatICSDate(startDateTime);
  const dtEnd = formatICSDate(endDateTime);
  const dtStamp = formatICSDate(new Date());

  // Generate unique ID for event
  const uid = `${dtStamp}-${attendeeEmail.replace('@', '-at-')}@pluseins.gg`;

  // Build ICS content (line breaks must be \r\n for ICS standard)
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Geschlossene Gesellschaft//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${eventName}`,
    `DESCRIPTION:${eventDescription.replace(/\n/g, '\\n')}`,
    `LOCATION:${eventLocation}`,
    `ORGANIZER;CN=${eventName}:mailto:${organizerEmail}`,
    `ATTENDEE;CN=${attendeeName};RSVP=TRUE:mailto:${attendeeEmail}`,
    `STATUS:CONFIRMED`,
    `SEQUENCE:0`,
    ...(url ? [`URL:${url}`] : []),
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: ${eventName} starts in 24 hours`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return icsLines.join('\r\n');
}

/**
 * Convert ICS content to base64 for email attachment
 * Uses browser-compatible btoa since Buffer is not available in Convex runtime
 */
export function icsToBase64(icsContent: string): string {
  // In Convex runtime, we need to use browser-compatible encoding
  // Convert string to UTF-8 bytes, then to base64
  const encoder = new TextEncoder();
  const bytes = encoder.encode(icsContent);

  // Convert bytes to base64 using browser-compatible method
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  // Use btoa which is available in Convex runtime
  return btoa(binary);
}
