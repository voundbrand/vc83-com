"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleLegacySpread = handleLegacySpread;
const init_1 = require("../app/init");
async function handleLegacySpread(parsed) {
    return (0, init_1.handleAppInit)(parsed, { legacySource: "spread" });
}
//# sourceMappingURL=spread.js.map