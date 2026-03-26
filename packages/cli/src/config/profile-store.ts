import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export interface CliProfile {
  name: string;
  backendUrl: string;
  appUrl?: string;
  defaultOrgId?: string;
  defaultAppId?: string;
  requiresConfirmation: boolean;
  updatedAt: number;
}

export interface ProfileStore {
  activeProfile: string;
  profiles: Record<string, CliProfile>;
}

interface LoadProfileStoreOptions {
  filePath?: string;
}

const DEFAULT_LOCAL_BACKEND = "http://127.0.0.1:3210";
const DEFAULT_LOCAL_APP = "http://127.0.0.1:3000";

function now(): number {
  return Date.now();
}

function defaultProfileStore(): ProfileStore {
  const createdAt = now();

  return {
    activeProfile: "local",
    profiles: {
      local: {
        name: "local",
        backendUrl: DEFAULT_LOCAL_BACKEND,
        appUrl: DEFAULT_LOCAL_APP,
        requiresConfirmation: false,
        updatedAt: createdAt
      },
      staging: {
        name: "staging",
        backendUrl: "",
        appUrl: "",
        requiresConfirmation: false,
        updatedAt: createdAt
      },
      prod: {
        name: "prod",
        backendUrl: "",
        appUrl: "",
        requiresConfirmation: true,
        updatedAt: createdAt
      }
    }
  };
}

function resolveStorePath(filePath?: string): string {
  if (filePath) {
    return path.resolve(filePath);
  }

  const override = process.env.SEVENLAYERS_PROFILE_STORE_PATH;
  if (override && override.trim().length > 0) {
    return path.resolve(override);
  }

  return path.join(os.homedir(), ".sevenlayers", "profiles.json");
}

function fallbackStorePath(): string {
  return path.join(os.tmpdir(), "sevenlayers-profiles.json");
}

function isPermissionError(error: unknown): boolean {
  const ioError = error as NodeJS.ErrnoException;
  return ioError.code === "EPERM" || ioError.code === "EACCES";
}

async function writeStoreFile(filePath: string, store: ProfileStore): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

async function writeWithFallback(
  filePath: string,
  store: ProfileStore,
  explicitPath: boolean
): Promise<void> {
  try {
    await writeStoreFile(filePath, store);
  } catch (error) {
    if (explicitPath || !isPermissionError(error)) {
      throw error;
    }

    const fallback = fallbackStorePath();
    await writeStoreFile(fallback, store);
    process.env.SEVENLAYERS_PROFILE_STORE_PATH = fallback;
  }
}

export async function loadProfileStore(options: LoadProfileStoreOptions = {}): Promise<ProfileStore> {
  const filePath = resolveStorePath(options.filePath);

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as ProfileStore;

    if (!parsed || typeof parsed !== "object" || !parsed.activeProfile || !parsed.profiles) {
      throw new Error("Invalid profile store shape");
    }

    return parsed;
  } catch (error) {
    const readError = error as NodeJS.ErrnoException;
    if (readError.code !== "ENOENT") {
      throw readError;
    }

    const defaults = defaultProfileStore();
    await writeWithFallback(filePath, defaults, Boolean(options.filePath));
    return defaults;
  }
}

export async function saveProfileStore(
  store: ProfileStore,
  options: LoadProfileStoreOptions = {}
): Promise<void> {
  const filePath = resolveStorePath(options.filePath);
  await writeWithFallback(filePath, store, Boolean(options.filePath));
}

export async function setActiveProfile(
  name: string,
  options: LoadProfileStoreOptions = {}
): Promise<ProfileStore> {
  const store = await loadProfileStore(options);
  if (!store.profiles[name]) {
    throw new Error(`Profile '${name}' does not exist.`);
  }

  store.activeProfile = name;
  await saveProfileStore(store, options);
  return store;
}

export async function upsertProfile(
  profile: Omit<CliProfile, "updatedAt">,
  options: LoadProfileStoreOptions = {}
): Promise<ProfileStore> {
  const store = await loadProfileStore(options);
  store.profiles[profile.name] = {
    ...profile,
    updatedAt: now()
  };

  if (!store.activeProfile) {
    store.activeProfile = profile.name;
  }

  await saveProfileStore(store, options);
  return store;
}

export async function getProfile(
  name: string,
  options: LoadProfileStoreOptions = {}
): Promise<CliProfile | null> {
  const store = await loadProfileStore(options);
  return store.profiles[name] ?? null;
}

export async function getActiveProfile(
  options: LoadProfileStoreOptions = {}
): Promise<CliProfile> {
  const store = await loadProfileStore(options);
  const profile = store.profiles[store.activeProfile];

  if (!profile) {
    throw new Error(`Active profile '${store.activeProfile}' is missing from store.`);
  }

  return profile;
}
