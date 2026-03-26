"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleLegacyPages = handleLegacyPages;
const pages_1 = require("../app/pages");
async function handleLegacyPages(parsed) {
    const subcommand = parsed.positionals[1] === "list" || parsed.positionals[1] === "sync"
        ? parsed.positionals[1]
        : "sync";
    return (0, pages_1.handleAppPages)({
        ...parsed,
        positionals: ["app", "pages", subcommand]
    }, {
        legacySource: "pages"
    });
}
//# sourceMappingURL=pages.js.map