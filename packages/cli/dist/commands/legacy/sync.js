"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleLegacySync = handleLegacySync;
const sync_1 = require("../app/sync");
async function handleLegacySync(parsed) {
    return (0, sync_1.handleAppSync)(parsed, { legacySource: "sync" });
}
//# sourceMappingURL=sync.js.map