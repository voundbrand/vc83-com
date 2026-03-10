const DEFAULT_APP_BASE_URL = "https://app.l4yercak3.com";

export type LoginAuthMode = "check" | "signin" | "setup" | "signup";

type BuildPrefilledPlatformLoginUrlArgs = {
  appBaseUrl?: string | null;
  openLoginSource?: string | null;
  prefillToken?: string | null;
  authMode?: LoginAuthMode | null;
  autoCheck?: boolean;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  organizationName?: string | null;
  betaCode?: string | null;
};

function normalizeOptionalString(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeBaseUrl(candidate: string): string {
  if (/^https?:\/\//i.test(candidate)) {
    return candidate;
  }
  return `https://${candidate}`;
}

export function buildPrefilledPlatformLoginUrl(
  args: BuildPrefilledPlatformLoginUrlArgs
): string {
  const resolvedBase = normalizeOptionalString(args.appBaseUrl) || DEFAULT_APP_BASE_URL;
  const normalizedBase = normalizeBaseUrl(resolvedBase);

  let url: URL;
  try {
    url = new URL(normalizedBase);
  } catch {
    url = new URL(DEFAULT_APP_BASE_URL);
  }

  if (!url.pathname || url.pathname === "") {
    url.pathname = "/";
  }

  const openLoginSource = normalizeOptionalString(args.openLoginSource) || "email";
  url.searchParams.set("openLogin", openLoginSource);

  const prefillToken = normalizeOptionalString(args.prefillToken);
  if (prefillToken) {
    url.searchParams.set("prefill", prefillToken);
  } else {
    const authMode = normalizeOptionalString(args.authMode || undefined);
    if (authMode) {
      url.searchParams.set("authMode", authMode);
    }

    if (args.autoCheck) {
      url.searchParams.set("autoCheck", "1");
    }

    const email = normalizeOptionalString(args.email);
    if (email) {
      url.searchParams.set("email", email);
    }

    const firstName = normalizeOptionalString(args.firstName);
    if (firstName) {
      url.searchParams.set("firstName", firstName);
    }

    const lastName = normalizeOptionalString(args.lastName);
    if (lastName) {
      url.searchParams.set("lastName", lastName);
    }

    const organizationName = normalizeOptionalString(args.organizationName);
    if (organizationName) {
      url.searchParams.set("organizationName", organizationName);
    }

    const betaCode = normalizeOptionalString(args.betaCode);
    if (betaCode) {
      url.searchParams.set("betaCode", betaCode);
    }
  }

  return url.toString();
}
