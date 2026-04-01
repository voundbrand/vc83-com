import { describe, it, expect } from "vitest";
import { scanForPii } from "../../../server/pii/detector.js";

describe("PII detector", () => {
  it("detects email addresses", () => {
    const result = scanForPii("Contact me at hans.mueller@kanzlei-beispiel.de");
    expect(result.has_pii).toBe(true);
    expect(result.summary.email).toBe(1);
  });

  it("detects German phone numbers", () => {
    const result = scanForPii("Rufen Sie uns an: +49 30 12345678");
    expect(result.has_pii).toBe(true);
    expect(result.summary.phone_de).toBe(1);
  });

  it("detects German IBAN", () => {
    const result = scanForPii("IBAN: DE89 3704 0044 0532 0130 00");
    expect(result.has_pii).toBe(true);
    expect(result.summary.iban_de).toBe(1);
  });

  it("detects IP addresses", () => {
    const result = scanForPii("User logged in from 192.168.1.100");
    expect(result.has_pii).toBe(true);
    expect(result.summary.ip_address).toBe(1);
  });

  it("detects German date of birth format", () => {
    const result = scanForPii("Geburtsdatum: 15.03.1985");
    expect(result.has_pii).toBe(true);
    expect(result.summary.date_of_birth).toBe(1);
  });

  it("returns empty for clean text", () => {
    const result = scanForPii("The weather is nice today.");
    expect(result.has_pii).toBe(false);
    expect(result.matches).toHaveLength(0);
  });

  it("detects multiple PII types in one text", () => {
    const result = scanForPii(
      "Name: Hans Mueller, Email: hans@example.com, IBAN: DE89370400440532013000, IP: 10.0.0.1",
    );
    expect(result.has_pii).toBe(true);
    expect(Object.keys(result.summary).length).toBeGreaterThanOrEqual(2);
  });

  it("redacts matched values", () => {
    const result = scanForPii("Email: hans@example.com");
    const match = result.matches.find((m) => m.type === "email");
    expect(match).toBeDefined();
    // Redacted: first 2 + masked middle + last 2
    expect(match!.value).not.toBe("hans@example.com");
    expect(match!.value).toContain("*");
  });
});
