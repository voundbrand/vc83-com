export const HIDDEN_ORDINARY_ORGANIZATION_LIFECYCLE_STATES = new Set([
  "provisional_onboarding",
  "live_unclaimed_workspace",
]);

export function isVisibleInOrdinaryOrganizationListings(
  organization: { onboardingLifecycleState?: string | null }
): boolean {
  return !HIDDEN_ORDINARY_ORGANIZATION_LIFECYCLE_STATES.has(
    organization.onboardingLifecycleState || ""
  );
}

export function filterVisibleOrdinaryOrganizations<
  T extends { onboardingLifecycleState?: string | null },
>(organizations: readonly T[]): T[] {
  return organizations.filter(isVisibleInOrdinaryOrganizationListings);
}

export type OrdinaryOrganizationListingPage<T> = {
  page: T[];
  continueCursor: string;
  isDone: boolean;
};

export async function collectVisibleOrdinaryOrganizationPage<
  T extends { onboardingLifecycleState?: string | null },
>(args: {
  fetchPage: (
    cursor: string | null,
    numItems: number
  ) => Promise<OrdinaryOrganizationListingPage<T>>;
  cursor?: string | null;
  pageSize: number;
}): Promise<OrdinaryOrganizationListingPage<T>> {
  const visibleOrganizations: T[] = [];
  let cursor = args.cursor ?? null;
  let continueCursor = cursor ?? "";
  let isDone = false;

  while (visibleOrganizations.length < args.pageSize && !isDone) {
    const page = await args.fetchPage(cursor, args.pageSize);
    const remainingSlots = args.pageSize - visibleOrganizations.length;
    visibleOrganizations.push(
      ...filterVisibleOrdinaryOrganizations(page.page).slice(0, remainingSlots)
    );

    continueCursor = page.continueCursor;
    isDone = page.isDone;
    cursor = page.continueCursor;

    if (page.page.length === 0) {
      break;
    }
  }

  return {
    page: visibleOrganizations,
    continueCursor,
    isDone,
  };
}
