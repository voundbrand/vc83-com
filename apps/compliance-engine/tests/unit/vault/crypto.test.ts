import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "../../../server/vault/crypto.js";

describe("AES-256-GCM crypto", () => {
  const passphrase = "test-encryption-key-32-chars-ok!";

  it("encrypts and decrypts roundtrip", () => {
    const plaintext = Buffer.from("Hello, compliance world!");
    const encrypted = encrypt(plaintext, passphrase);
    const decrypted = decrypt(encrypted, passphrase);

    expect(decrypted.toString()).toBe("Hello, compliance world!");
  });

  it("encrypted output is different from plaintext", () => {
    const plaintext = Buffer.from("Sensitive PII data");
    const encrypted = encrypt(plaintext, passphrase);

    expect(encrypted.toString()).not.toBe("Sensitive PII data");
    expect(encrypted.length).toBeGreaterThan(plaintext.length);
  });

  it("different encryptions produce different ciphertext (random IV)", () => {
    const plaintext = Buffer.from("Same data");
    const enc1 = encrypt(plaintext, passphrase);
    const enc2 = encrypt(plaintext, passphrase);

    expect(enc1.equals(enc2)).toBe(false);
  });

  it("fails to decrypt with wrong passphrase", () => {
    const plaintext = Buffer.from("Secret data");
    const encrypted = encrypt(plaintext, passphrase);

    expect(() => decrypt(encrypted, "wrong-passphrase")).toThrow();
  });

  it("handles empty buffer", () => {
    const plaintext = Buffer.alloc(0);
    const encrypted = encrypt(plaintext, passphrase);
    const decrypted = decrypt(encrypted, passphrase);

    expect(decrypted.length).toBe(0);
  });

  it("handles large data", () => {
    const plaintext = Buffer.alloc(1024 * 100, "A"); // 100KB
    const encrypted = encrypt(plaintext, passphrase);
    const decrypted = decrypt(encrypted, passphrase);

    expect(decrypted.equals(plaintext)).toBe(true);
  });
});
