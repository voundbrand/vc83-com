import { describe, expect, it } from "vitest";
import {
  normalizeCalcomApiBaseUrl,
  normalizePositiveInteger,
  normalizeUrl,
} from "../../../convex/integrations/calcomShared";

describe("calcomShared", () => {
  it("normalizes valid URLs and rejects invalid ones", () => {
    expect(normalizeUrl(" https://api.cal.com/v2 ")).toBe(
      "https://api.cal.com/v2",
    );
    expect(normalizeUrl("ftp://api.cal.com/v2")).toBeNull();
    expect(normalizeUrl("not-a-url")).toBeNull();
  });

  it("strips trailing slashes from the api base url", () => {
    expect(normalizeCalcomApiBaseUrl("https://api.cal.com/v2/")).toBe(
      "https://api.cal.com/v2",
    );
  });

  it("accepts only positive integer event type ids", () => {
    expect(normalizePositiveInteger(42)).toBe(42);
    expect(normalizePositiveInteger("17")).toBe(17);
    expect(normalizePositiveInteger(0)).toBeNull();
    expect(normalizePositiveInteger("-3")).toBeNull();
  });
});
