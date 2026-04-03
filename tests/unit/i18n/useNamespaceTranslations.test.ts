/* @vitest-environment jsdom */

import React from "react";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

vi.mock("@/contexts/translation-context", () => ({
  useTranslation: vi.fn(),
}));

import { useQuery } from "convex/react";
import { useTranslation } from "@/contexts/translation-context";
import {
  useMultipleNamespaces,
  useNamespaceTranslations,
} from "@/hooks/use-namespace-translations";

const useQueryMock = vi.mocked(useQuery as any);
const useTranslationMock = vi.mocked(useTranslation);

describe("useNamespaceTranslations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).React = React;
    useTranslationMock.mockReturnValue({ locale: "de" } as any);
  });

  it("interpolates fallback strings when a key is missing", () => {
    useQueryMock.mockReturnValue(undefined);

    const { result } = renderHook(() => useNamespaceTranslations("ui.app.booking"));

    expect(
      result.current.tWithFallback(
        "ui.app.booking.availability.resource.settings.summary",
        "Duration: {duration}. Buffer: {buffer}.",
        {
          duration: "90 min (1h 30min)",
          buffer: "15 min",
        }
      )
    ).toBe("Duration: 90 min (1h 30min). Buffer: 15 min.");
  });

  it("interpolates translated namespace values", () => {
    useQueryMock.mockReturnValue({
      "ui.app.booking.list.result_count": "{count} Buchungen",
    });

    const { result } = renderHook(() => useNamespaceTranslations("ui.app.booking"));

    expect(
      result.current.t("ui.app.booking.list.result_count", {
        count: 3,
      })
    ).toBe("3 Buchungen");
  });

  it("interpolates fallback strings for multiple namespaces", () => {
    useQueryMock.mockReturnValue(undefined);

    const { result } = renderHook(() =>
      useMultipleNamespaces(["ui.app.booking", "ui.app.booking.location"])
    );

    expect(
      result.current.tWithFallback(
        "ui.app.booking.list.row_aria_label",
        "{name} at {time}",
        {
          name: "Ada",
          time: "10:00",
        }
      )
    ).toBe("Ada at 10:00");
  });
});
