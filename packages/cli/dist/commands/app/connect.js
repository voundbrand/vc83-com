"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAppConnect = handleAppConnect;
const shared_1 = require("./shared");
async function handleAppConnect(parsed, options = {}) {
    return (0, shared_1.runAppEnvUpdateCommand)({
        parsed,
        commandName: "app connect",
        legacySource: options.legacySource
    });
}
//# sourceMappingURL=connect.js.map