"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAppInit = handleAppInit;
const shared_1 = require("./shared");
async function handleAppInit(parsed, options = {}) {
    return (0, shared_1.runAppEnvUpdateCommand)({
        parsed,
        commandName: "app init",
        legacySource: options.legacySource
    });
}
//# sourceMappingURL=init.js.map