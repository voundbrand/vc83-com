/* @vitest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
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
    t: (key: string) => {
      const translations: Record<string, string> = {
        "ui.products.list.label.price": "Price",
        "ui.products.list.label.inventory": "Inventory",
        "ui.products.list.label.available": "available",
        "ui.products.list.label.sold": "Sold",
        "ui.products.list.button.manageAvailability": "Manage Availability",
        "ui.products.list.button.edit": "Edit",
        "ui.products.list.button.publish": "Publish",
        "ui.products.list.status.active": "Active",
        "ui.products.list.status.draft": "Draft",
        "ui.products.list.status.soldOut": "Sold out",
        "ui.products.list.status.archived": "Archived",
      };
      return translations[key] || key;
    },
  }),
}));

import { useMutation, useQuery } from "convex/react";
import { ProductsList } from "../../../src/components/window-content/products-window/products-list";

const useQueryMock = vi.mocked(useQuery as any);
const useMutationMock = vi.mocked(useMutation as any);

describe("ProductsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as { React?: typeof React }).React = React;

    useQueryMock.mockReturnValue([
      {
        _id: "objects_digital_product",
        name: "Brand Guide Download",
        description: "A digital product with linked availability.",
        subtype: "digital",
        status: "active",
        customProperties: {
          price: 0,
          currency: "EUR",
          sold: 0,
          availabilityResourceId: "objects_shared_resource",
        },
      },
    ]);

    useMutationMock.mockReturnValue(async () => undefined);
  });

  it("shows the availability action without subtype gating and keeps the linked resource target", () => {
    render(
      React.createElement(ProductsList, {
        sessionId: "session_products_list",
        organizationId: "organizations_products_list",
        onEdit: () => undefined,
      })
    );

    const manageLink = screen.getByTitle("Manage Availability");
    expect(manageLink.getAttribute("href")).toBe("/booking?resourceId=objects_shared_resource");
  });
});
