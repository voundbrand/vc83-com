import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnvFile } from "dotenv";
import { LANDING_APP_ROOT, REPO_ROOT } from "./catalog";

let hasLoadedEnv = false;

export function loadLandingDemoEnv(): void {
  if (hasLoadedEnv) {
    return;
  }

  const candidatePaths = [
    resolve(REPO_ROOT, ".env"),
    resolve(REPO_ROOT, ".env.local"),
    resolve(LANDING_APP_ROOT, ".env"),
    resolve(LANDING_APP_ROOT, ".env.local"),
  ];

  for (const envPath of candidatePaths) {
    if (existsSync(envPath)) {
      loadEnvFile({ path: envPath, override: true, quiet: true });
    }
  }

  hasLoadedEnv = true;
}

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
