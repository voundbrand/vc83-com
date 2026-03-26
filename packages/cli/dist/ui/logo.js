"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderLogo = renderLogo;
const colors_1 = require("../core/colors");
const LOGO_LINES = [
    "███████╗███████╗██╗   ██╗███████╗███╗   ██╗██╗      █████╗ ██╗   ██╗███████╗██████╗ ███████╗",
    "██╔════╝██╔════╝██║   ██║██╔════╝████╗  ██║██║     ██╔══██╗╚██╗ ██╔╝██╔════╝██╔══██╗██╔════╝",
    "███████╗█████╗  ██║   ██║█████╗  ██╔██╗ ██║██║     ███████║ ╚████╔╝ █████╗  ██████╔╝███████╗",
    "╚════██║██╔══╝  ╚██╗ ██╔╝██╔══╝  ██║╚██╗██║██║     ██╔══██║  ╚██╔╝  ██╔══╝  ██╔══██╗╚════██║",
    "███████║███████╗ ╚████╔╝ ███████╗██║ ╚████║███████╗██║  ██║   ██║   ███████╗██║  ██║███████║",
    "╚══════╝╚══════╝  ╚═══╝  ╚══════╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚══════╝"
];
function renderLogo() {
    return [
        "",
        (0, colors_1.colorOrangeStrong)(LOGO_LINES[0]),
        ...LOGO_LINES.slice(1).map((line) => (0, colors_1.colorOrange)(line)),
        (0, colors_1.colorOrange)("            Rebuilt CLI foundation for safe platform integration"),
        ""
    ].join("\n");
}
//# sourceMappingURL=logo.js.map