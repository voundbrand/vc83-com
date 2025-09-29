export interface LocationOption {
  type: string;           // Cal.com integration string (e.g., "integrations:google:meet")
  displayName: string;    // User-friendly name (e.g., "Google Meet")
  icon: string;          // Icon identifier
}

// Mapping from Cal.com location types to user-friendly options
export const LOCATION_MAPPING: Record<string, LocationOption> = {
  'integrations:daily': {
    type: 'integrations:daily',
    displayName: 'Cal Video',  // Daily.co IS Cal.com's video solution
    icon: 'video'
  },
  'integrations:google:meet': {
    type: 'integrations:google:meet',
    displayName: 'Google Meet',
    icon: 'globe'
  },
  'integrations:office365_video': {
    type: 'integrations:office365_video', 
    displayName: 'MS Teams',
    icon: 'users'
  },
  'integrations:zoom': {
    type: 'integrations:zoom',
    displayName: 'Zoom',
    icon: 'monitor'
  }
};

// Convert Cal.com event type locations to user-friendly options
export function getLocationOptions(eventTypeLocations: Array<{type: string}>): LocationOption[] {
  return eventTypeLocations
    .map(loc => LOCATION_MAPPING[loc.type])
    .filter(Boolean); // Remove any unmapped location types
}

// Get display name for a Cal.com location type
export function getLocationDisplayName(locationType: string): string {
  return LOCATION_MAPPING[locationType]?.displayName || locationType;
}

// Get Cal.com integration string from display name (for backwards compatibility)
export function getLocationTypeFromDisplayName(displayName: string): string {
  const entry = Object.values(LOCATION_MAPPING).find(loc => loc.displayName === displayName);
  return entry?.type || displayName;
}