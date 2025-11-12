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
 */
export function icsToBase64(icsContent: string): string {
  return Buffer.from(icsContent, 'utf-8').toString('base64');
}
