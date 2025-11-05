/**
 * Event utility functions for map links and calendar file generation
 */

/**
 * Generate a universal map link that works on both mobile and desktop
 * Uses Google Maps URL which automatically opens the native map app on mobile
 * (Apple Maps on iOS, Google Maps on Android) when clicked
 *
 * @param address - The event address
 * @param latitude - Optional latitude for more accurate location
 * @param longitude - Optional longitude for more accurate location
 * @returns A universal map URL
 */
export function generateMapLink(
  address: string,
  latitude?: number,
  longitude?: number
): string {
  // Google Maps URL works best across all platforms and automatically
  // opens native map apps on mobile devices

  if (latitude && longitude) {
    // Use coordinates with address label for most accurate results
    // Format: https://maps.google.com/maps?q=lat,lng+(Address)
    return `https://maps.google.com/maps?q=${latitude},${longitude}+(${encodeURIComponent(address)})`;
  }

  // Fallback to address search if no coordinates
  // Format: https://maps.google.com/maps?q=Address
  return `https://maps.google.com/maps?q=${encodeURIComponent(address)}`;
}

/**
 * Generate an iCalendar (.ics) file content for the event
 * This format works with Google Calendar, Apple Calendar, Outlook, etc.
 *
 * @param event Event details
 * @returns iCalendar file content string
 */
export function generateCalendarEvent(event: {
  title: string;
  description?: string;
  location: string;
  startDate: number; // Unix timestamp in milliseconds
  endDate: number; // Unix timestamp in milliseconds
  url?: string;
  organizer?: string;
  timezone?: string;
}): string {
  // Helper to format date as iCalendar format (YYYYMMDDTHHMMSSZ for UTC)
  const formatICalDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  };

  // Current timestamp for DTSTAMP
  const now = formatICalDate(Date.now());
  const start = formatICalDate(event.startDate);
  const end = formatICalDate(event.endDate);

  // Clean and escape text for iCalendar format
  const cleanText = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')  // Escape backslashes
      .replace(/;/g, '\\;')    // Escape semicolons
      .replace(/,/g, '\\,')    // Escape commas
      .replace(/\n/g, '\\n');  // Escape newlines
  };

  // Build iCalendar content
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `DTSTAMP:${now}`,
    `SUMMARY:${cleanText(event.title)}`,
    `LOCATION:${cleanText(event.location)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${cleanText(event.description)}`);
  }

  if (event.url) {
    lines.push(`URL:${event.url}`);
  }

  if (event.organizer) {
    lines.push(`ORGANIZER:CN=${cleanText(event.organizer)}`);
  }

  // Generate a UID (unique identifier)
  const uid = `${event.startDate}-${event.title.replace(/[^a-zA-Z0-9]/g, '-')}@event`;
  lines.push(`UID:${uid}`);

  lines.push('STATUS:CONFIRMED');
  lines.push('SEQUENCE:0');
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Download a calendar file (.ics)
 * Creates a blob and triggers download in the browser
 *
 * @param calendarContent - iCalendar file content
 * @param filename - Name for the downloaded file (default: event.ics)
 */
export function downloadCalendarFile(
  calendarContent: string,
  filename: string = 'event.ics'
): void {
  // Create a blob with the calendar content
  const blob = new Blob([calendarContent], { type: 'text/calendar;charset=utf-8' });

  // Create a temporary download link
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Generate a calendar link for the event and trigger download
 * Combines generateCalendarEvent and downloadCalendarFile
 *
 * @param event Event details
 */
export function addToCalendar(event: {
  title: string;
  description?: string;
  location: string;
  startDate: number;
  endDate: number;
  url?: string;
  organizer?: string;
}): void {
  const calendarContent = generateCalendarEvent(event);
  const filename = `${event.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.ics`;
  downloadCalendarFile(calendarContent, filename);
}
