import { describe, expect, it } from "vitest";
import de from "../../../apps/one-of-one-landing/content/landing.de.json";
import en from "../../../apps/one-of-one-landing/content/landing.en.json";

function sortedKeys(value: Record<string, string>): string[] {
  return Object.keys(value).sort();
}

describe("one-of-one landing content parity", () => {
  it("keeps EN and DE translation keys aligned", () => {
    expect(sortedKeys(de)).toEqual(sortedKeys(en));
  });

  it("keeps all translation values non-empty", () => {
    for (const [key, value] of Object.entries(en)) {
      expect(typeof value).toBe("string");
      expect(value.trim().length).toBeGreaterThan(0);
      expect(typeof de[key as keyof typeof de]).toBe("string");
      expect((de[key as keyof typeof de] as string).trim().length).toBeGreaterThan(0);
    }
  });
});
