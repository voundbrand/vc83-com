/**
 * Microsoft Graph API Scopes
 *
 * Comprehensive list of all Microsoft Graph permissions that can be requested.
 * Users can choose which permissions to grant through checkboxes in the UI.
 */

export interface MicrosoftScope {
  scope: string;
  category: "core" | "mail" | "calendar" | "contacts" | "files" | "teams" | "sites" | "tasks" | "notes";
  displayName: string;
  description: string;
  required: boolean; // If true, always included (like openid, profile)
  adminConsentRequired?: boolean;
}

/**
 * All available Microsoft Graph scopes
 */
export const MICROSOFT_SCOPES: MicrosoftScope[] = [
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
  {
    scope: "offline_access",
    category: "core",
    displayName: "Maintain access to data",
    description: "Keep access even when you're not using the app",
    required: true,
  },
  {
    scope: "User.Read",
    category: "core",
    displayName: "View your user profile",
    description: "Read your user profile information",
    required: true,
  },

  // ============================================================================
  // MAIL (Email & Messages)
  // ============================================================================
  {
    scope: "Mail.Read",
    category: "mail",
    displayName: "Read your mail",
    description: "Read email in your mailbox",
    required: false,
  },
  {
    scope: "Mail.ReadWrite",
    category: "mail",
    displayName: "Read and write access to your mail",
    description: "Read, update, create and delete email in your mailbox",
    required: false,
  },
  {
    scope: "Mail.Send",
    category: "mail",
    displayName: "Send mail as you",
    description: "Send email from your mailbox",
    required: false,
  },
  {
    scope: "Mail.ReadBasic",
    category: "mail",
    displayName: "Read basic mail",
    description: "Read basic properties of messages in your mailbox",
    required: false,
  },
  {
    scope: "MailboxSettings.Read",
    category: "mail",
    displayName: "Read your mailbox settings",
    description: "Read your mailbox settings",
    required: false,
  },
  {
    scope: "MailboxSettings.ReadWrite",
    category: "mail",
    displayName: "Read and write your mailbox settings",
    description: "Update your mailbox settings",
    required: false,
  },

  // ============================================================================
  // CALENDAR (Events & Scheduling)
  // ============================================================================
  {
    scope: "Calendars.Read",
    category: "calendar",
    displayName: "Read your calendars",
    description: "Read events in your calendars",
    required: false,
  },
  {
    scope: "Calendars.ReadWrite",
    category: "calendar",
    displayName: "Have full access to your calendars",
    description: "Read, update, create and delete events in your calendars",
    required: false,
  },
  {
    scope: "Calendars.Read.Shared",
    category: "calendar",
    displayName: "Read calendars you can access",
    description: "Read events in shared calendars",
    required: false,
  },
  {
    scope: "Calendars.ReadWrite.Shared",
    category: "calendar",
    displayName: "Read and write calendars you can access",
    description: "Read and write events in shared calendars",
    required: false,
  },

  // ============================================================================
  // CONTACTS (People & Organizations)
  // ============================================================================
  {
    scope: "Contacts.Read",
    category: "contacts",
    displayName: "Read your contacts",
    description: "Read contacts in your contact folders",
    required: false,
  },
  {
    scope: "Contacts.ReadWrite",
    category: "contacts",
    displayName: "Have full access to your contacts",
    description: "Read, update, create and delete contacts",
    required: false,
  },
  {
    scope: "Contacts.Read.Shared",
    category: "contacts",
    displayName: "Read contacts you can access",
    description: "Read contacts in shared contact folders",
    required: false,
  },
  {
    scope: "Contacts.ReadWrite.Shared",
    category: "contacts",
    displayName: "Read and write contacts you can access",
    description: "Read and write contacts in shared folders",
    required: false,
  },

  // ============================================================================
  // FILES (OneDrive & SharePoint)
  // ============================================================================
  {
    scope: "Files.Read",
    category: "files",
    displayName: "Read your files",
    description: "Read files you have access to",
    required: false,
  },
  {
    scope: "Files.ReadWrite",
    category: "files",
    displayName: "Have full access to your files",
    description: "Read, update, create and delete your files",
    required: false,
  },
  {
    scope: "Files.Read.All",
    category: "files",
    displayName: "Read all files you can access",
    description: "Read all files you have access to",
    required: false,
  },
  {
    scope: "Files.ReadWrite.All",
    category: "files",
    displayName: "Have full access to all files you can access",
    description: "Read, update, create and delete all files you can access",
    required: false,
  },
  {
    scope: "Files.Read.Selected",
    category: "files",
    displayName: "Read files you select",
    description: "Read files that you select",
    required: false,
  },
  {
    scope: "Files.ReadWrite.Selected",
    category: "files",
    displayName: "Read and write files you select",
    description: "Read and write files that you select",
    required: false,
  },

  // ============================================================================
  // TEAMS (Chat & Channels)
  // ============================================================================
  {
    scope: "Chat.Read",
    category: "teams",
    displayName: "Read your chat messages",
    description: "Read your 1-on-1 or group chat messages",
    required: false,
  },
  {
    scope: "Chat.ReadWrite",
    category: "teams",
    displayName: "Read and write your chat messages",
    description: "Read and send chat messages on your behalf",
    required: false,
  },
  {
    scope: "ChatMessage.Send",
    category: "teams",
    displayName: "Send chat messages",
    description: "Send chat messages as you",
    required: false,
  },
  {
    scope: "Team.ReadBasic.All",
    category: "teams",
    displayName: "Read the names and descriptions of teams",
    description: "Read the names and descriptions of teams",
    required: false,
    adminConsentRequired: true,
  },
  {
    scope: "Channel.ReadBasic.All",
    category: "teams",
    displayName: "Read the names and descriptions of channels",
    description: "Read channel names and descriptions",
    required: false,
    adminConsentRequired: true,
  },

  // ============================================================================
  // SITES (SharePoint Sites)
  // ============================================================================
  {
    scope: "Sites.Read.All",
    category: "sites",
    displayName: "Read items in all site collections",
    description: "Read documents and list items in all sites",
    required: false,
  },
  {
    scope: "Sites.ReadWrite.All",
    category: "sites",
    displayName: "Edit or delete items in all site collections",
    description: "Create, edit, and delete documents and list items in all sites",
    required: false,
  },
  {
    scope: "Sites.Manage.All",
    category: "sites",
    displayName: "Manage all site collections",
    description: "Create, edit, and delete items and lists in all site collections",
    required: false,
    adminConsentRequired: true,
  },
  {
    scope: "Sites.FullControl.All",
    category: "sites",
    displayName: "Have full control of all site collections",
    description: "Full control of all sites",
    required: false,
    adminConsentRequired: true,
  },

  // ============================================================================
  // TASKS (To-Do & Planner)
  // ============================================================================
  {
    scope: "Tasks.Read",
    category: "tasks",
    displayName: "Read your tasks",
    description: "Read your tasks",
    required: false,
  },
  {
    scope: "Tasks.ReadWrite",
    category: "tasks",
    displayName: "Create, read, update and delete your tasks",
    description: "Manage your tasks",
    required: false,
  },
  {
    scope: "Tasks.Read.Shared",
    category: "tasks",
    displayName: "Read tasks you can access",
    description: "Read shared tasks",
    required: false,
  },
  {
    scope: "Tasks.ReadWrite.Shared",
    category: "tasks",
    displayName: "Read and write tasks you can access",
    description: "Read and write shared tasks",
    required: false,
  },

  // ============================================================================
  // NOTES (OneNote)
  // ============================================================================
  {
    scope: "Notes.Read",
    category: "notes",
    displayName: "Read your notebooks",
    description: "Read your OneNote notebooks",
    required: false,
  },
  {
    scope: "Notes.Create",
    category: "notes",
    displayName: "Create pages in your notebooks",
    description: "Create new OneNote pages",
    required: false,
  },
  {
    scope: "Notes.ReadWrite",
    category: "notes",
    displayName: "Read and write your notebooks",
    description: "Read and write your OneNote notebooks",
    required: false,
  },
  {
    scope: "Notes.Read.All",
    category: "notes",
    displayName: "Read all notebooks you can access",
    description: "Read all OneNote notebooks you have access to",
    required: false,
  },
  {
    scope: "Notes.ReadWrite.All",
    category: "notes",
    displayName: "Read and write all notebooks you can access",
    description: "Read and write all OneNote notebooks you have access to",
    required: false,
  },
];

/**
 * Get required scopes (always included)
 */
export function getRequiredScopes(): string[] {
  return MICROSOFT_SCOPES
    .filter(s => s.required)
    .map(s => s.scope);
}

/**
 * Get optional scopes by category
 */
export function getScopesByCategory(category: MicrosoftScope["category"]): MicrosoftScope[] {
  return MICROSOFT_SCOPES.filter(s => s.category === category && !s.required);
}

/**
 * Get all optional scopes
 */
export function getOptionalScopes(): MicrosoftScope[] {
  return MICROSOFT_SCOPES.filter(s => !s.required);
}

/**
 * Get scope display name
 */
export function getScopeDisplayName(scope: string): string {
  const scopeInfo = MICROSOFT_SCOPES.find(s => s.scope === scope);
  return scopeInfo?.displayName || scope;
}

/**
 * Get scope description
 */
export function getScopeDescription(scope: string): string {
  const scopeInfo = MICROSOFT_SCOPES.find(s => s.scope === scope);
  return scopeInfo?.description || "";
}

/**
 * Check if scope requires admin consent
 */
export function requiresAdminConsent(scope: string): boolean {
  const scopeInfo = MICROSOFT_SCOPES.find(s => s.scope === scope);
  return scopeInfo?.adminConsentRequired || false;
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
export const SCOPE_PRESETS = {
  minimal: {
    name: "Minimal (Required Only)",
    description: "Only basic profile and authentication",
    scopes: [],
  },
  email: {
    name: "Email Integration",
    description: "Read and send emails",
    scopes: ["Mail.Read", "Mail.Send"],
  },
  emailFull: {
    name: "Full Email Access",
    description: "Complete email management",
    scopes: ["Mail.ReadWrite", "Mail.Send", "MailboxSettings.ReadWrite"],
  },
  calendar: {
    name: "Calendar Integration",
    description: "Read and manage your calendar",
    scopes: ["Calendars.ReadWrite", "Calendars.ReadWrite.Shared"],
  },
  contacts: {
    name: "Contact Sync",
    description: "Sync your contacts to CRM",
    scopes: ["Contacts.ReadWrite", "Contacts.ReadWrite.Shared"],
  },
  crm: {
    name: "CRM Suite",
    description: "Email, calendar, and contacts",
    scopes: [
      "Mail.ReadWrite",
      "Mail.Send",
      "Calendars.ReadWrite",
      "Contacts.ReadWrite",
    ],
  },
  productivity: {
    name: "Productivity Suite",
    description: "Email, calendar, contacts, tasks, and files",
    scopes: [
      "Mail.ReadWrite",
      "Mail.Send",
      "Calendars.ReadWrite",
      "Contacts.ReadWrite",
      "Tasks.ReadWrite",
      "Files.ReadWrite",
    ],
  },
  everything: {
    name: "Full Access",
    description: "All available permissions (use with caution)",
    scopes: getOptionalScopes().map(s => s.scope),
  },
};
