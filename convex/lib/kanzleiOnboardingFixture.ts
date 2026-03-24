export interface KanzleiOnboardingFixture {
  businessName: string;
  description: string;
  industry: string;
  contactEmail: string;
  contactPhone: string;
  timezone: string;
  language: string;
  dateFormat: string;
  ownerFirstName: string;
  ownerLastName: string;
  defaultMeetingTitle: string;
  intakeLabel: string;
  primaryResourceLabel: string;
  preferredCloneName: string;
}

const BASE_KANZLEI_FIXTURE: KanzleiOnboardingFixture = {
  businessName: "Kanzlei Test & Partner",
  description:
    "Phone-first small-firm Kanzlei fixture for intake, callback coordination, and Erstberatung booking tests.",
  industry: "law_firm",
  contactEmail: "kontakt@example.com",
  contactPhone: "+49 30 5550123",
  timezone: "Europe/Berlin",
  language: "de",
  dateFormat: "DD.MM.YYYY",
  ownerFirstName: "Lea",
  ownerLastName: "Falkenberg",
  defaultMeetingTitle: "Erstberatung",
  intakeLabel: "Erstberatung",
  primaryResourceLabel: "Arbeitsrecht Erstberatung",
  preferredCloneName: "Kanzlei Assistenz",
};

function normalizeFixtureSuffix(value: string | undefined): string {
  if (!value) {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildTestKanzleiFixture(args?: {
  suffix?: string;
}): KanzleiOnboardingFixture {
  const suffix = normalizeFixtureSuffix(args?.suffix);
  if (!suffix) {
    return { ...BASE_KANZLEI_FIXTURE };
  }

  return {
    ...BASE_KANZLEI_FIXTURE,
    businessName: `${BASE_KANZLEI_FIXTURE.businessName} ${suffix}`,
    contactEmail: `kontakt+${suffix}@example.com`,
  };
}
