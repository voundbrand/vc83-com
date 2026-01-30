/**
 * Google OAuth Scopes
 *
 * Comprehensive list of all Google API permissions that can be requested.
 * Users can choose which permissions to grant through checkboxes in the UI.
 */

export interface GoogleScope {
  scope: string;
  category: "core" | "calendar" | "drive" | "gmail" | "contacts";
  displayName: string;
  description: string;
  required: boolean;
}

/**
 * All available Google OAuth scopes
 */
export const GOOGLE_SCOPES: GoogleScope[] = [
  // ============================================================================
  // CORE / REQUIRED (Always included)
  // ============================================================================
  {
    scope: "openid",
    category: "core",
    displayName: "Sign you in",
    description: "Required for authentication",
    required: true,
  },
  {
    scope: "profile",
    category: "core",
    displayName: "View your basic profile",
    description: "Access your basic profile information",
    required: true,
  },
  {
    scope: "email",
    category: "core",
    displayName: "View your email address",
    description: "Access your email address",
    required: true,
  },

  // ============================================================================
  // CALENDAR (Events & Scheduling)
  // ============================================================================
  {
    scope: "https://www.googleapis.com/auth/calendar.readonly",
    category: "calendar",
    displayName: "Read your calendars",
    description: "View events on all your calendars",
    required: false,
  },
  {
    scope: "https://www.googleapis.com/auth/calendar.events",
    category: "calendar",
    displayName: "Manage calendar events",
    description: "Create, edit, and delete events on your calendars",
    required: false,
  },
  {
    scope: "https://www.googleapis.com/auth/calendar.events.readonly",
    category: "calendar",
    displayName: "Read calendar events",
    description: "View events on all your calendars",
    required: false,
  },

  // ============================================================================
  // DRIVE (Google Drive - future)
  // ============================================================================
  {
    scope: "https://www.googleapis.com/auth/drive.readonly",
    category: "drive",
    displayName: "View your Drive files",
    description: "See and download all your Google Drive files",
    required: false,
  },
  {
    scope: "https://www.googleapis.com/auth/drive.file",
    category: "drive",
    displayName: "Manage Drive files created by this app",
    description: "View and manage files created by this app",
    required: false,
  },

  // ============================================================================
  // GMAIL (Email - future)
  // ============================================================================
  {
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    category: "gmail",
    displayName: "Read your emails",
    description: "View your email messages and settings",
    required: false,
  },
  {
    scope: "https://www.googleapis.com/auth/gmail.send",
    category: "gmail",
    displayName: "Send emails",
    description: "Send email on your behalf",
    required: false,
  },

  // ============================================================================
  // CONTACTS (People - future)
  // ============================================================================
  {
    scope: "https://www.googleapis.com/auth/contacts.readonly",
    category: "contacts",
    displayName: "Read your contacts",
    description: "See and download your contacts",
    required: false,
  },
  {
    scope: "https://www.googleapis.com/auth/contacts",
    category: "contacts",
    displayName: "Manage your contacts",
    description: "See, edit, download, and permanently delete your contacts",
    required: false,
  },
];

/**
 * Get required scopes (always included)
 */
export function getRequiredScopes(): string[] {
  return GOOGLE_SCOPES
    .filter(s => s.required)
    .map(s => s.scope);
}

/**
 * Get optional scopes by category
 */
export function getScopesByCategory(category: GoogleScope["category"]): GoogleScope[] {
  return GOOGLE_SCOPES.filter(s => s.category === category && !s.required);
}

/**
 * Get all optional scopes
 */
export function getOptionalScopes(): GoogleScope[] {
  return GOOGLE_SCOPES.filter(s => !s.required);
}

/**
 * Get scope display name
 */
export function getScopeDisplayName(scope: string): string {
  const scopeInfo = GOOGLE_SCOPES.find(s => s.scope === scope);
  return scopeInfo?.displayName || scope;
}

/**
 * Get scope description
 */
export function getScopeDescription(scope: string): string {
  const scopeInfo = GOOGLE_SCOPES.find(s => s.scope === scope);
  return scopeInfo?.description || "";
}

/**
 * Build scope string from selected scopes
 */
export function buildScopeString(selectedScopes: string[]): string {
  const required = getRequiredScopes();
  const allScopes = [...new Set([...required, ...selectedScopes])];
  return allScopes.join(" ");
}

/**
 * Recommended scope presets for common use cases
 */
export const GOOGLE_SCOPE_PRESETS = {
  minimal: {
    name: "Minimal (Required Only)",
    description: "Only basic profile and authentication",
    scopes: [],
  },
  calendar: {
    name: "Calendar Integration",
    description: "Read and manage your calendar",
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
  },
  calendarReadOnly: {
    name: "Calendar (Read Only)",
    description: "View your calendar events",
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  },
  drive: {
    name: "Drive Integration",
    description: "Access Google Drive files",
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  },
  full: {
    name: "Full Access",
    description: "Calendar, Drive, and Contacts",
    scopes: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/contacts.readonly",
    ],
  },
};
