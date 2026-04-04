/* @vitest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) =>
    React.createElement("a", { href, ...props }, children),
}));

vi.mock("@/hooks/use-namespace-translations", () => ({
  useNamespaceTranslations: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (params) {
        return key.replace(/\{(\w+)\}/g, (_match, token) =>
          token in params ? String(params[token]) : `{${token}}`
        );
      }
      return key;
    },
  }),
}));

import { useQuery } from "convex/react";
import { ProductAvailabilityConnection } from "../../../src/components/window-content/products-window/product-availability-connection";

const useQueryMock = vi.mocked(useQuery as any);

describe("ProductAvailabilityConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as { React?: typeof React }).React = React;
  });

  it("shows a save-first state for new bookable products", () => {
    useQueryMock.mockReturnValue(undefined);

    render(
      React.createElement(ProductAvailabilityConnection, {
        sessionId: "session_products",
        productId: null,
        selectedResourceId: "",
        onSelectedResourceIdChange: () => undefined,
        resourceOptions: [],
      })
    );

    expect(
      screen.getByText(
        "Save this product first, then open Booking to configure weekly windows, overrides, and blackout dates."
      )
    ).toBeTruthy();
  });

  it("renders a connected availability summary and manage link for saved bookable products", () => {
    useQueryMock.mockReturnValue({
      productId: "objects_product_room",
      isBookable: true,
      connectionMode: "linked",
      isConnectionValid: true,
      availabilityResourceId: "objects_resource_marina",
      availabilityResourceName: "Marina Classroom",
      availabilityResourceSubtype: "room",
      availabilityResourceStatus: "active",
      resourceId: "objects_resource_marina",
      hasAvailabilityConfigured: true,
      hasDirectAvailability: true,
      usesScheduleTemplate: true,
      scheduleSource: "mixed",
      directScheduleCount: 1,
      weeklyWindowCount: 5,
      exceptionCount: 2,
      blockCount: 1,
      scheduleTemplateCount: 1,
      scheduleTemplateNames: ["Marina Weekdays"],
    });

    render(
      React.createElement(ProductAvailabilityConnection, {
        sessionId: "session_products",
        productId: "objects_product_room",
        selectedResourceId: "objects_resource_marina",
        onSelectedResourceIdChange: () => undefined,
        resourceOptions: [
          {
            _id: "objects_resource_marina",
            name: "Marina Classroom",
            subtype: "room",
            status: "active",
          },
        ],
      })
    );

    expect(screen.getByText("Availability ready")).toBeTruthy();
    expect(screen.getByText("Uses availability from Marina Classroom")).toBeTruthy();
    expect(screen.getByText("Direct schedule + template")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getAllByText("1")).toHaveLength(2);
    expect(screen.getByText("Marina Weekdays")).toBeTruthy();

    const manageLink = screen.getByRole("link", { name: "Manage Availability" });
    expect(manageLink.getAttribute("href")).toBe("/booking?resourceId=objects_resource_marina");
  });
});
