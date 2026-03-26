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
export declare function loadProfileStore(options?: LoadProfileStoreOptions): Promise<ProfileStore>;
export declare function saveProfileStore(store: ProfileStore, options?: LoadProfileStoreOptions): Promise<void>;
export declare function setActiveProfile(name: string, options?: LoadProfileStoreOptions): Promise<ProfileStore>;
export declare function upsertProfile(profile: Omit<CliProfile, "updatedAt">, options?: LoadProfileStoreOptions): Promise<ProfileStore>;
export declare function getProfile(name: string, options?: LoadProfileStoreOptions): Promise<CliProfile | null>;
export declare function getActiveProfile(options?: LoadProfileStoreOptions): Promise<CliProfile>;
export {};
//# sourceMappingURL=profile-store.d.ts.map