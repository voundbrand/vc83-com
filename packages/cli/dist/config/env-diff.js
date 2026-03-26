"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatEnvChanges = formatEnvChanges;
function formatEnvChanges(changes) {
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
//# sourceMappingURL=env-diff.js.map