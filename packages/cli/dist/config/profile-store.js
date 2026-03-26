"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadProfileStore = loadProfileStore;
exports.saveProfileStore = saveProfileStore;
exports.setActiveProfile = setActiveProfile;
exports.upsertProfile = upsertProfile;
exports.getProfile = getProfile;
exports.getActiveProfile = getActiveProfile;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const DEFAULT_LOCAL_BACKEND = "http://127.0.0.1:3210";
const DEFAULT_LOCAL_APP = "http://127.0.0.1:3000";
function now() {
    return Date.now();
}
function defaultProfileStore() {
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
function resolveStorePath(filePath) {
    if (filePath) {
        return node_path_1.default.resolve(filePath);
    }
    const override = process.env.SEVENLAYERS_PROFILE_STORE_PATH;
    if (override && override.trim().length > 0) {
        return node_path_1.default.resolve(override);
    }
    return node_path_1.default.join(node_os_1.default.homedir(), ".sevenlayers", "profiles.json");
}
function fallbackStorePath() {
    return node_path_1.default.join(node_os_1.default.tmpdir(), "sevenlayers-profiles.json");
}
function isPermissionError(error) {
    const ioError = error;
    return ioError.code === "EPERM" || ioError.code === "EACCES";
}
async function writeStoreFile(filePath, store) {
    await promises_1.default.mkdir(node_path_1.default.dirname(filePath), { recursive: true });
    await promises_1.default.writeFile(filePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}
async function writeWithFallback(filePath, store, explicitPath) {
    try {
        await writeStoreFile(filePath, store);
    }
    catch (error) {
        if (explicitPath || !isPermissionError(error)) {
            throw error;
        }
        const fallback = fallbackStorePath();
        await writeStoreFile(fallback, store);
        process.env.SEVENLAYERS_PROFILE_STORE_PATH = fallback;
    }
}
async function loadProfileStore(options = {}) {
    const filePath = resolveStorePath(options.filePath);
    try {
        const raw = await promises_1.default.readFile(filePath, "utf8");
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || !parsed.activeProfile || !parsed.profiles) {
            throw new Error("Invalid profile store shape");
        }
        return parsed;
    }
    catch (error) {
        const readError = error;
        if (readError.code !== "ENOENT") {
            throw readError;
        }
        const defaults = defaultProfileStore();
        await writeWithFallback(filePath, defaults, Boolean(options.filePath));
        return defaults;
    }
}
async function saveProfileStore(store, options = {}) {
    const filePath = resolveStorePath(options.filePath);
    await writeWithFallback(filePath, store, Boolean(options.filePath));
}
async function setActiveProfile(name, options = {}) {
    const store = await loadProfileStore(options);
    if (!store.profiles[name]) {
        throw new Error(`Profile '${name}' does not exist.`);
    }
    store.activeProfile = name;
    await saveProfileStore(store, options);
    return store;
}
async function upsertProfile(profile, options = {}) {
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
async function getProfile(name, options = {}) {
    const store = await loadProfileStore(options);
    return store.profiles[name] ?? null;
}
async function getActiveProfile(options = {}) {
    const store = await loadProfileStore(options);
    const profile = store.profiles[store.activeProfile];
    if (!profile) {
        throw new Error(`Active profile '${store.activeProfile}' is missing from store.`);
    }
    return profile;
}
//# sourceMappingURL=profile-store.js.map