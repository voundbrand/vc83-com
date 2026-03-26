"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.colorOrange = colorOrange;
exports.colorOrangeStrong = colorOrangeStrong;
exports.colorGray = colorGray;
exports.colorRed = colorRed;
exports.colorGreen = colorGreen;
const RESET = "\u001b[0m";
const ORANGE = "\u001b[38;5;208m";
const ORANGE_STRONG = "\u001b[38;5;202m";
const GRAY = "\u001b[90m";
const RED = "\u001b[31m";
const GREEN = "\u001b[32m";
function colorOrange(text) {
    return `${ORANGE}${text}${RESET}`;
}
function colorOrangeStrong(text) {
    return `${ORANGE_STRONG}${text}${RESET}`;
}
function colorGray(text) {
    return `${GRAY}${text}${RESET}`;
}
function colorRed(text) {
    return `${RED}${text}${RESET}`;
}
function colorGreen(text) {
    return `${GREEN}${text}${RESET}`;
}
//# sourceMappingURL=colors.js.map