import { describe, expect, it } from "vitest";
import {
  collectVisibleOrdinaryOrganizationPage,
  filterVisibleOrdinaryOrganizations,
  isVisibleInOrdinaryOrganizationListings,
} from "../../../convex/lib/organizationLifecycle";

type TestOrganization = {
  _id: string;
  name: string;
  onboardingLifecycleState?: string | null;
};

describe("ordinary organization listing visibility", () => {
  it("hides provisional and live-unclaimed onboarding workspaces from ordinary listings", () => {
    const organizations: TestOrganization[] = [
      { _id: "org_visible_claimed", name: "Claimed", onboardingLifecycleState: "claimed_workspace" },
      { _id: "org_hidden_provisional", name: "Provisional", onboardingLifecycleState: "provisional_onboarding" },
      { _id: "org_hidden_live", name: "Live", onboardingLifecycleState: "live_unclaimed_workspace" },
      { _id: "org_visible_legacy", name: "Legacy", onboardingLifecycleState: null },
    ];

    expect(filterVisibleOrdinaryOrganizations(organizations).map((org) => org._id)).toEqual([
      "org_visible_claimed",
      "org_visible_legacy",
    ]);
    expect(
      isVisibleInOrdinaryOrganizationListings({
        onboardingLifecycleState: "provisional_onboarding",
      })
    ).toBe(false);
    expect(
      isVisibleInOrdinaryOrganizationListings({
        onboardingLifecycleState: "live_unclaimed_workspace",
      })
    ).toBe(false);
    expect(
      isVisibleInOrdinaryOrganizationListings({
        onboardingLifecycleState: "claimed_workspace",
      })
    ).toBe(true);
  });

  it("continues pagination until a visible page is filled or the scan is exhausted", async () => {
    const pages = [
      {
        page: [
          {
            _id: "org_hidden_provisional",
            name: "Provisional",
            onboardingLifecycleState: "provisional_onboarding",
          },
        ],
        continueCursor: "cursor_after_hidden",
        isDone: false,
      },
      {
        page: [
          {
            _id: "org_visible_one",
            name: "Visible One",
            onboardingLifecycleState: "claimed_workspace",
          },
          {
            _id: "org_hidden_live",
            name: "Live",
            onboardingLifecycleState: "live_unclaimed_workspace",
          },
        ],
        continueCursor: "cursor_after_mixed",
        isDone: false,
      },
      {
        page: [
          {
            _id: "org_visible_two",
            name: "Visible Two",
            onboardingLifecycleState: null,
          },
        ],
        continueCursor: "cursor_done",
        isDone: true,
      },
    ];

    let callCount = 0;
    const result = await collectVisibleOrdinaryOrganizationPage({
      pageSize: 2,
      fetchPage: async () => pages[callCount++]!,
    });

    expect(result.page.map((org) => org._id)).toEqual([
      "org_visible_one",
      "org_visible_two",
    ]);
    expect(result.continueCursor).toBe("cursor_done");
    expect(result.isDone).toBe(true);
    expect(callCount).toBe(3);
  });
});
