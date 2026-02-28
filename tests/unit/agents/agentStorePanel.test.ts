/* @vitest-environment jsdom */

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useAction: vi.fn(),
}));

vi.mock("@/hooks/use-namespace-translations", () => ({
  useNamespaceTranslations: () => ({
    t: (key: string) => key,
  }),
}));

import { useAction, useQuery } from "convex/react";
import { AgentStorePanel } from "../../../src/components/window-content/agents/agent-store-panel";

const useQueryMock = vi.mocked(useQuery as any);
const useActionMock = vi.mocked(useAction as any);

const LIST_RESPONSE = {
  cards: [
    {
      cardId: "agent:1",
      catalogAgentNumber: 1,
      displayName: "Appointment Booking Specialist",
      verticalCategory: "core",
      tier: "foundation",
      abilityTags: ["calendaring", "slot_confirmation"],
      toolTags: [
        { key: "calendar_write", status: "available_now", requirementLevel: "required" },
      ],
      frameworkTags: ["profile_booking", "access_mode_invisible"],
      integrationTags: [{ key: "google", status: "available_now" }],
      strengthTags: ["coordination"],
      weaknessTags: ["depends_on_calendar_quality"],
      supportedAccessModes: ["invisible", "direct"],
      channelAffinity: ["webchat"],
      autonomyDefault: "supervised",
      runtimeAvailability: "available_now",
      capabilitySnapshotPreview: {
        availableNowCount: 3,
        blockedCount: 0,
      },
      templateAvailability: {
        hasTemplate: true,
        templateAgentId: "objects_template_1" as any,
      },
    },
    {
      cardId: "agent:2",
      catalogAgentNumber: 2,
      displayName: "Provider Outreach Specialist",
      verticalCategory: "agency",
      tier: "dream_team",
      abilityTags: ["outreach_sequences", "calendaring"],
      toolTags: [
        { key: "message_routing", status: "planned", requirementLevel: "recommended" },
      ],
      frameworkTags: ["profile_support", "access_mode_direct"],
      integrationTags: [{ key: "activecampaign", status: "blocked" }],
      strengthTags: ["followup_consistency"],
      weaknessTags: ["integration_sensitive"],
      supportedAccessModes: ["direct"],
      channelAffinity: ["telegram"],
      autonomyDefault: "supervised",
      runtimeAvailability: "available_now",
      capabilitySnapshotPreview: {
        availableNowCount: 1,
        blockedCount: 2,
      },
      templateAvailability: {
        hasTemplate: true,
        templateAgentId: "objects_template_2" as any,
      },
    },
  ],
  noFitEscalation: {
    minimum: "€5,000 minimum",
    deposit: "€2,500 deposit",
    onboarding: "includes 90-minute onboarding with engineer",
  },
};

const COMPARE_RESPONSE = {
  cards: LIST_RESPONSE.cards,
  comparison: {
    sharedAbilityTags: ["calendaring"],
    sharedToolTags: [],
    sharedFrameworkTags: [],
    missingIntegrationsByCard: [
      { catalogAgentNumber: 1, missingIntegrations: [] },
      { catalogAgentNumber: 2, missingIntegrations: ["activecampaign"] },
    ],
  },
};

const PREFLIGHT_RESPONSE = {
  card: LIST_RESPONSE.cards[1],
  capabilitySnapshot: {
    availableNow: [{ capabilityId: "book_appointment", label: "Appointment booking" }],
    blocked: [
      {
        capabilityId: "multi_channel_outreach",
        label: "Multi-channel outreach",
        blockerType: "integration_missing" as const,
        blockerKey: "activecampaign",
      },
    ],
  },
  allowClone: false,
  noFitEscalation: LIST_RESPONSE.noFitEscalation,
};

describe("AgentStorePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).React = React;
    useActionMock.mockReturnValue(vi.fn().mockResolvedValue({
      status: "success",
      cloneAgentId: "objects_clone_1",
      cloneAgentName: "Appointment Booking Specialist - Clone",
      reused: false,
      created: true,
      isPrimary: true,
      useCase: "Appointment Booking Specialist",
      useCaseKey: "appointment_booking_specialist",
      allowClone: true,
    }));
    useQueryMock.mockImplementation((_queryRef, args) => {
      if (args === "skip") {
        return undefined;
      }
      if (args && typeof args === "object" && "catalogAgentNumbers" in args) {
        return COMPARE_RESPONSE;
      }
      if (args && typeof args === "object" && "catalogAgentNumber" in args) {
        return PREFLIGHT_RESPONSE;
      }
      return LIST_RESPONSE;
    });
  });

  it("renders catalog cards with capability preview and concierge terms", () => {
    render(
      React.createElement(AgentStorePanel, {
        sessionId: "sessions_test",
        organizationId: "org_123" as any,
        onBack: vi.fn(),
        onStartCloneHandoff: vi.fn(),
        onRequestCustomOrder: vi.fn(),
      })
    );

    expect(screen.getByText("Agent Store")).toBeTruthy();
    expect(screen.getByText("Appointment Booking Specialist")).toBeTruthy();
    expect(screen.getByText("Provider Outreach Specialist")).toBeTruthy();
    expect(screen.getByText(/Clone-first catalog birthing only/i)).toBeTruthy();
    expect(screen.getAllByText(/Capability limits:/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Can't find the right mix\?/i)).toBeTruthy();
    expect(screen.getByText(/Custom-agent concierge is purchase-only/i)).toBeTruthy();
  });

  it("supports card comparison with shared ability and missing integration visibility", () => {
    render(
      React.createElement(AgentStorePanel, {
        sessionId: "sessions_test",
        organizationId: "org_123" as any,
        onBack: vi.fn(),
        onStartCloneHandoff: vi.fn(),
        onRequestCustomOrder: vi.fn(),
      })
    );

    const compareCheckboxes = screen.getAllByRole("checkbox", { name: /Compare/i });
    fireEvent.click(compareCheckboxes[0]);
    fireEvent.click(compareCheckboxes[1]);

    expect(screen.getByText("Card comparison")).toBeTruthy();
    expect(screen.getByText(/Shared abilities:/)).toBeTruthy();
    expect(screen.getAllByText(/Calendaring/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Missing integrations by card:/)).toBeTruthy();
    expect(screen.getByText(/#2 Provider Outreach Specialist: Activecampaign/)).toBeTruthy();
  });

  it("shows explicit available-now vs blocked capability limits from preflight", async () => {
    render(
      React.createElement(AgentStorePanel, {
        sessionId: "sessions_test",
        organizationId: "org_123" as any,
        onBack: vi.fn(),
        onStartCloneHandoff: vi.fn(),
        onRequestCustomOrder: vi.fn(),
      })
    );

    const preflightButtons = screen.getAllByRole("button", { name: "View capability limits" });
    fireEvent.click(preflightButtons[1]);

    expect(await screen.findByText("Capability limits")).toBeTruthy();
    expect((await screen.findAllByText(/Appointment booking/i)).length).toBeGreaterThan(0);
    expect(
      await screen.findByText(/Multi.?channel outreach · Integration missing \(Activecampaign\)/i)
    ).toBeTruthy();
  });
});
