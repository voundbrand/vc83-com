import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { encrypt, decrypt } from "./crypto.js";

export interface VaultEntry {
  id: string;
  filePath: string;
  fileHash: string;
  sizeBytes: number;
  encrypted: boolean;
}

/**
 * Encrypted local file store for compliance evidence artifacts.
 *
 * Files are stored as: {vaultPath}/{id}.bin
 * When encryptionKey is provided, files are AES-256-GCM encrypted.
 * When not provided, files are stored as plaintext (dev mode).
 */
export class Vault {
  constructor(
    private vaultPath: string,
    private encryptionKey: string | undefined,
  ) {
    mkdirSync(vaultPath, { recursive: true });
  }

  /**
   * Store data in the vault. Returns metadata about the stored file.
   */
  store(data: Buffer): VaultEntry {
    const id = randomUUID();
    const filePath = join(this.vaultPath, `${id}.bin`);
    const fileHash = createHash("sha256").update(data).digest("hex");

    if (this.encryptionKey) {
      const encrypted = encrypt(data, this.encryptionKey);
      writeFileSync(filePath, encrypted);
    } else {
      writeFileSync(filePath, data);
    }

    return {
      id,
      filePath,
      fileHash,
      sizeBytes: data.length,
      encrypted: !!this.encryptionKey,
    };
  }

  /**
   * Retrieve data from the vault by ID.
   */
  retrieve(id: string): Buffer | null {
    const filePath = join(this.vaultPath, `${id}.bin`);
    if (!existsSync(filePath)) return null;

    const raw = readFileSync(filePath);

    if (this.encryptionKey) {
      return decrypt(raw, this.encryptionKey);
    }

    return raw;
  }

  /**
   * Delete a file from the vault.
   */
  delete(id: string): boolean {
    const filePath = join(this.vaultPath, `${id}.bin`);
    if (!existsSync(filePath)) return false;

    unlinkSync(filePath);
    return true;
  }

  /**
   * Check if a vault entry exists.
   */
  exists(id: string): boolean {
    return existsSync(join(this.vaultPath, `${id}.bin`));
  }
}
