export type EnvChangeType = "add" | "update" | "skip-existing" | "noop";

export interface EnvChange {
  type: EnvChangeType;
  key: string;
  before?: string;
  after?: string;
  reason?: string;
}

export function formatEnvChanges(changes: EnvChange[]): string {
  if (changes.length === 0) {
    return "No environment changes requested.";
  }

  return changes
    .map((change) => {
      switch (change.type) {
        case "add":
          return `+ add ${change.key}=${change.after ?? ""}`;
        case "update":
          return `~ update ${change.key}: ${change.before ?? ""} -> ${change.after ?? ""}`;
        case "skip-existing":
          return `! skip ${change.key}: ${change.reason ?? "existing value preserved"}`;
        case "noop":
        default:
          return `= keep ${change.key}`;
      }
    })
    .join("\n");
}
