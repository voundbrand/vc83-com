import {
  DEFAULT_PORT,
  DEFAULT_HOST,
  DEFAULT_DB_PATH,
  DEFAULT_VAULT_PATH,
  DEFAULT_FRAMEWORKS,
  DEFAULT_LOG_LEVEL,
} from "./lib/constants.js";

export interface Config {
  host: string;
  port: number;
  dbPath: string;
  vaultPath: string;
  encryptionKey: string | undefined;
  frameworks: string[];
  logLevel: string;
}

export function loadConfig(): Config {
  const frameworks = (
    process.env.COMPLIANCE_FRAMEWORKS ?? DEFAULT_FRAMEWORKS
  )
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);

  return {
    host: process.env.HOST ?? DEFAULT_HOST,
    port: Number(process.env.PORT) || DEFAULT_PORT,
    dbPath: process.env.COMPLIANCE_DB_PATH ?? DEFAULT_DB_PATH,
    vaultPath: process.env.COMPLIANCE_VAULT_PATH ?? DEFAULT_VAULT_PATH,
    encryptionKey: process.env.COMPLIANCE_ENCRYPTION_KEY || undefined,
    frameworks,
    logLevel: process.env.LOG_LEVEL ?? DEFAULT_LOG_LEVEL,
  };
}
