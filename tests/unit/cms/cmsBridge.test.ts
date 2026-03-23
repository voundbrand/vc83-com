import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildCmsContentName,
  parseBooleanFlag,
  parseJsonObject,
  serializeCmsContentInput,
  toCmsBridgeRecord,
} from "../../../apps/segelschule-altwarp/lib/cms-bridge";

describe("cms bridge helpers", () => {
  it("trims the content name parts and parses boolean flags", () => {
    expect(buildCmsContentName(" home ", " about ", " title ")).toBe(
      "home_about_title"
    );
    expect(parseBooleanFlag("true")).toBe(true);
    expect(parseBooleanFlag("1")).toBe(true);
    expect(parseBooleanFlag("false")).toBe(false);
    expect(parseBooleanFlag(null)).toBe(false);
  });

  it("serializes text-with-links input into the bridge contract", () => {
    expect(
      serializeCmsContentInput({
        subtype: "text_with_links",
        value: {
          text: "Book now",
          links: [
            {
              id: "cta-primary",
              title: "Jetzt buchen",
              url: "/booking",
              icon: "external",
            },
            {
              id: "",
              title: "Broken link",
              url: "",
            },
          ],
        },
        customProperties: {
          tone: "warm",
        },
      })
    ).toEqual({
      value: "Book now",
      customProperties: {
        tone: "warm",
        contentSchema: "cms_text_with_links_v1",
        links: [
          {
            id: "cta-primary",
            title: "Jetzt buchen",
            url: "/booking",
            icon: "external",
          },
        ],
      },
    });
  });

  it("round-trips structured bridge records and validates json object parsing", () => {
    expect(
      toCmsBridgeRecord(
        {
          _id: "record-123",
          name: "home_about_actions",
          subtype: "text_with_links",
          locale: "en",
          value: "See more",
          customProperties: {
            links: [
              {
                id: "cta-secondary",
                title: "Details",
                url: "/details",
              },
            ],
          },
        },
        {
          resolvedLocale: "en",
        }
      )
    ).toEqual({
      recordId: "record-123",
      name: "home_about_actions",
      subtype: "text_with_links",
      locale: "en",
      resolvedLocale: "en",
      value: {
        text: "See more",
        links: [
          {
            id: "cta-secondary",
            title: "Details",
            url: "/details",
          },
        ],
      },
      description: undefined,
      status: undefined,
      customProperties: {
        links: [
          {
            id: "cta-secondary",
            title: "Details",
            url: "/details",
          },
        ],
      },
      fileUrl: null,
      imageMetadata: null,
    });

    expect(
      parseJsonObject('{"alt":"Panorama","width":1200}', "customProperties")
    ).toEqual({
      alt: "Panorama",
      width: 1200,
    });

    expect(() => parseJsonObject("{bad", "customProperties")).toThrowError(
      /customProperties must be valid JSON/
    );
  });
});
