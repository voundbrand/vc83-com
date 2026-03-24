const BETA_GATED_ALLOWED_WINDOWS = new Set(["ai-assistant", "login", "welcome"]);

export function isWindowAllowedWhenBetaRestricted(windowId: string): boolean {
  return BETA_GATED_ALLOWED_WINDOWS.has(windowId);
}

export function isSignedInTransition(args: {
  previousSignedIn: boolean;
  isSignedIn: boolean;
}): boolean {
  return !args.previousSignedIn && args.isSignedIn;
}

export function shouldAutoOpenChatForSignedInUser(args: {
  isSignedIn: boolean;
  hasOrganization: boolean;
  tutorialProgressLoaded: boolean;
}): boolean {
  return args.isSignedIn && args.hasOrganization && args.tutorialProgressLoaded;
}

export function shouldAutoOpenLeadMagnetChatForGuest(args: {
  isSignedIn: boolean;
  openLoginRequested: boolean;
  requestedApp?: string | null;
}): boolean {
  if (args.isSignedIn) {
    return false;
  }
  if (args.openLoginRequested) {
    return false;
  }
  return args.requestedApp !== "login";
}
