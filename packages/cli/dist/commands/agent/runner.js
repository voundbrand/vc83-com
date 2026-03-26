"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runConvexFunction = runConvexFunction;
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
function parseJsonFromOutput(stdout) {
    const trimmed = stdout.trim();
    if (trimmed.length === 0) {
        return null;
    }
    const lines = trimmed
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    for (let index = lines.length - 1; index >= 0; index -= 1) {
        const candidate = lines[index];
        try {
            return JSON.parse(candidate);
        }
        catch {
            continue;
        }
    }
    try {
        return JSON.parse(trimmed);
    }
    catch {
        return null;
    }
}
async function runConvexFunction(input) {
    const argsJson = JSON.stringify(input.args);
    const command = `npx convex run ${input.functionName} --args '${argsJson}'`;
    if (!input.execute) {
        return {
            executed: false,
            command,
            stdout: "",
            stderr: "",
            parsedJson: null
        };
    }
    const { stdout, stderr } = await execFileAsync("npx", [
        "convex",
        "run",
        input.functionName,
        "--args",
        argsJson
    ]);
    return {
        executed: true,
        command,
        stdout,
        stderr,
        parsedJson: parseJsonFromOutput(stdout)
    };
}
//# sourceMappingURL=runner.js.map