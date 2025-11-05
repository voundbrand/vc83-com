/**
 * Timezone utility functions for consistent date/time handling
 * across the application using the organization's timezone setting
 */

import { format, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { parse } from 'date-fns';

/**
 * Convert a Unix timestamp to a localized date string in the organization's timezone
 * @param timestamp Unix timestamp in milliseconds
 * @param timezone IANA timezone string (e.g., "America/New_York")
 * @returns Formatted date string (YYYY-MM-DD)
 */
export function timestampToLocalDate(timestamp: number, timezone: string): string {
  const date = new Date(timestamp);
  const zonedDate = toZonedTime(date, timezone);
  return format(zonedDate, 'yyyy-MM-dd');
}

/**
 * Convert a Unix timestamp to a localized time string in the organization's timezone
 * @param timestamp Unix timestamp in milliseconds
 * @param timezone IANA timezone string (e.g., "America/New_York")
 * @returns Formatted time string (HH:mm)
 */
export function timestampToLocalTime(timestamp: number, timezone: string): string {
  const date = new Date(timestamp);
  const zonedDate = toZonedTime(date, timezone);
  return format(zonedDate, 'HH:mm');
}

/**
 * Convert date and time strings in organization's timezone to Unix timestamp
 * @param dateString Date string in YYYY-MM-DD format
 * @param timeString Time string in HH:mm format
 * @param timezone IANA timezone string (e.g., "America/New_York")
 * @returns Unix timestamp in milliseconds
 */
export function localDateTimeToTimestamp(
  dateString: string,
  timeString: string,
  timezone: string
): number {
  // Parse the date and time as if they're in the organization's timezone
  const dateTimeString = `${dateString} ${timeString}`;
  const parsedDate = parse(dateTimeString, 'yyyy-MM-dd HH:mm', new Date());

  // Convert from organization's timezone to UTC timestamp
  const utcDate = fromZonedTime(parsedDate, timezone);
  return utcDate.getTime();
}

/**
 * Format a Unix timestamp for display with timezone info
 * @param timestamp Unix timestamp in milliseconds
 * @param timezone IANA timezone string (e.g., "America/New_York")
 * @param formatString Format string (default: 'MMM d, yyyy h:mm a')
 * @returns Formatted date/time string with timezone abbreviation
 */
export function formatTimestampWithTimezone(
  timestamp: number,
  timezone: string,
  formatString: string = 'MMM d, yyyy h:mm a'
): string {
  const date = new Date(timestamp);
  const zonedDate = toZonedTime(date, timezone);
  const formatted = format(zonedDate, formatString, { timeZone: timezone });
  const tzAbbr = format(zonedDate, 'zzz', { timeZone: timezone });
  return `${formatted} ${tzAbbr}`;
}

/**
 * Get the current date/time in the organization's timezone
 * @param timezone IANA timezone string (e.g., "America/New_York")
 * @returns Object with date and time strings in the organization's timezone
 */
export function getCurrentLocalDateTime(timezone: string): { date: string; time: string } {
  const now = new Date();
  return {
    date: timestampToLocalDate(now.getTime(), timezone),
    time: timestampToLocalTime(now.getTime(), timezone)
  };
}

/**
 * Comprehensive list of world timezones organized by region
 */
export const TIMEZONE_OPTIONS = {
  'Americas': [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Phoenix', label: 'Arizona (MST)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Anchorage', label: 'Alaska (AKT)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
    { value: 'America/Toronto', label: 'Toronto (ET)' },
    { value: 'America/Vancouver', label: 'Vancouver (PT)' },
    { value: 'America/Mexico_City', label: 'Mexico City (CST)' },
    { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
    { value: 'America/Buenos_Aires', label: 'Buenos Aires (ART)' },
    { value: 'America/Santiago', label: 'Santiago (CLT)' },
  ],
  'Europe': [
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Dublin', label: 'Dublin (GMT/IST)' },
    { value: 'Europe/Lisbon', label: 'Lisbon (WET/WEST)' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
    { value: 'Europe/Amsterdam', label: 'Amsterdam (CET/CEST)' },
    { value: 'Europe/Brussels', label: 'Brussels (CET/CEST)' },
    { value: 'Europe/Vienna', label: 'Vienna (CET/CEST)' },
    { value: 'Europe/Zurich', label: 'Zurich (CET/CEST)' },
    { value: 'Europe/Rome', label: 'Rome (CET/CEST)' },
    { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)' },
    { value: 'Europe/Stockholm', label: 'Stockholm (CET/CEST)' },
    { value: 'Europe/Copenhagen', label: 'Copenhagen (CET/CEST)' },
    { value: 'Europe/Oslo', label: 'Oslo (CET/CEST)' },
    { value: 'Europe/Helsinki', label: 'Helsinki (EET/EEST)' },
    { value: 'Europe/Athens', label: 'Athens (EET/EEST)' },
    { value: 'Europe/Istanbul', label: 'Istanbul (TRT)' },
    { value: 'Europe/Moscow', label: 'Moscow (MSK)' },
  ],
  'Asia': [
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Asia/Karachi', label: 'Karachi (PKT)' },
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'Asia/Dhaka', label: 'Dhaka (BST)' },
    { value: 'Asia/Bangkok', label: 'Bangkok (ICT)' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Seoul', label: 'Seoul (KST)' },
  ],
  'Pacific': [
    { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
    { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' },
    { value: 'Australia/Brisbane', label: 'Brisbane (AEST)' },
    { value: 'Australia/Perth', label: 'Perth (AWST)' },
    { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
    { value: 'Pacific/Fiji', label: 'Fiji (FJT)' },
  ],
  'Africa': [
    { value: 'Africa/Cairo', label: 'Cairo (EET)' },
    { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST)' },
    { value: 'Africa/Lagos', label: 'Lagos (WAT)' },
    { value: 'Africa/Nairobi', label: 'Nairobi (EAT)' },
  ],
  'Middle East': [
    { value: 'Asia/Jerusalem', label: 'Jerusalem (IST)' },
    { value: 'Asia/Riyadh', label: 'Riyadh (AST)' },
    { value: 'Asia/Tehran', label: 'Tehran (IRST)' },
  ],
};

/**
 * Get a flat array of all timezone options for <select> elements
 */
export function getAllTimezoneOptions(): Array<{ value: string; label: string; region: string }> {
  return Object.entries(TIMEZONE_OPTIONS).flatMap(([region, zones]) =>
    zones.map(zone => ({ ...zone, region }))
  );
}
