"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleLegacyConnect = handleLegacyConnect;
const connect_1 = require("../app/connect");
async function handleLegacyConnect(parsed) {
    return (0, connect_1.handleAppConnect)(parsed, { legacySource: "connect" });
}
//# sourceMappingURL=connect.js.map