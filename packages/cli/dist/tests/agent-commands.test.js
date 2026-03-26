"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const promises_1 = __importDefault(require("node:fs/promises"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const args_1 = require("../core/args");
const profile_store_1 = require("../config/profile-store");
const init_1 = require("../commands/agent/init");
const permissions_1 = require("../commands/agent/permissions");
const template_1 = require("../commands/agent/template");
async function withTempDir(run) {
    const directory = await promises_1.default.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), "sevenlayers-agent-tests-"));
    try {
        await run(directory);
    }
    finally {
        await promises_1.default.rm(directory, { recursive: true, force: true });
    }
}
async function withProfileStore(run) {
    await withTempDir(async (directory) => {
        const storePath = node_path_1.default.join(directory, "profiles.json");
        await (0, profile_store_1.upsertProfile)({
            name: "staging",
            backendUrl: "https://example.convex.site",
            appUrl: "",
            defaultOrgId: "org_staging",
            defaultAppId: "app_123",
            requiresConfirmation: false
        }, { filePath: storePath });
        const previous = process.env.SEVENLAYERS_PROFILE_STORE_PATH;
        process.env.SEVENLAYERS_PROFILE_STORE_PATH = storePath;
        try {
            await run();
        }
        finally {
            if (previous === undefined) {
                delete process.env.SEVENLAYERS_PROFILE_STORE_PATH;
            }
            else {
                process.env.SEVENLAYERS_PROFILE_STORE_PATH = previous;
            }
        }
    });
}
async function captureOutput(run) {
    const lines = [];
    const originalLog = console.log;
    console.log = (...args) => {
        lines.push(args.map((arg) => String(arg)).join(" "));
    };
    try {
        const exitCode = await run();
        return { exitCode, stdout: lines.join("\n") };
    }
    finally {
        console.log = originalLog;
    }
}
(0, node_test_1.default)("agent init defaults to dry-run and emits deterministic JSON", async () => {
    await withProfileStore(async () => {
        let invoked = false;
        const parsed = (0, args_1.parseArgv)([
            "agent",
            "init",
            "--env",
            "staging",
            "--name",
            "Ops Agent",
            "--json"
        ]);
        const output = await captureOutput(() => (0, init_1.handleAgentInit)(parsed, async (input) => {
            invoked = true;
            strict_1.default.equal(input.execute, false);
            strict_1.default.equal(input.functionName, "ai/soulGenerator:bootstrapAgent");
            return {
                executed: false,
                command: "npx convex run ai/soulGenerator:bootstrapAgent --args '{...}'",
                stdout: "",
                stderr: "",
                parsedJson: null
            };
        }));
        strict_1.default.equal(output.exitCode, 0);
        strict_1.default.equal(invoked, true);
        const payload = JSON.parse(output.stdout);
        strict_1.default.equal(payload.executed, false);
    });
});
(0, node_test_1.default)("agent template apply uses preview mutation in dry-run mode", async () => {
    await withProfileStore(async () => {
        await withTempDir(async (directory) => {
            const patchFile = node_path_1.default.join(directory, "patch.json");
            await promises_1.default.writeFile(patchFile, JSON.stringify({ displayName: "Updated Agent" }, null, 2), "utf8");
            const parsed = (0, args_1.parseArgv)([
                "agent",
                "template",
                "apply",
                "--env",
                "staging",
                "--session-id",
                "sess_123",
                "--agent-id",
                "agent_1",
                "--patch-file",
                patchFile,
                "--json"
            ]);
            const output = await captureOutput(() => (0, template_1.handleAgentTemplate)(parsed, async (input) => {
                strict_1.default.equal(input.execute, false);
                strict_1.default.equal(input.functionName, "agentOntology:previewAgentFieldPatch");
                return {
                    executed: false,
                    command: "npx convex run agentOntology:previewAgentFieldPatch --args '{...}'",
                    stdout: "",
                    stderr: "",
                    parsedJson: null
                };
            }));
            strict_1.default.equal(output.exitCode, 0);
            const payload = JSON.parse(output.stdout);
            strict_1.default.equal(payload.executed, false);
        });
    });
});
(0, node_test_1.default)("agent permissions check reports missing session in dry-run", async () => {
    await withProfileStore(async () => {
        const parsed = (0, args_1.parseArgv)([
            "agent",
            "permissions",
            "check",
            "--env",
            "staging",
            "--agent-id",
            "agent_1",
            "--dry-run",
            "--json"
        ]);
        const output = await captureOutput(() => (0, permissions_1.handleAgentPermissions)(parsed));
        strict_1.default.equal(output.exitCode, 1);
        const payload = JSON.parse(output.stdout);
        strict_1.default.equal(payload.success, false);
    });
});
(0, node_test_1.default)("agent permissions check executes backend probe when dry-run is disabled", async () => {
    await withProfileStore(async () => {
        const parsed = (0, args_1.parseArgv)([
            "agent",
            "permissions",
            "check",
            "--env",
            "staging",
            "--session-id",
            "sess_123",
            "--agent-id",
            "agent_1",
            "--json"
        ]);
        const output = await captureOutput(() => (0, permissions_1.handleAgentPermissions)(parsed, async (input) => {
            strict_1.default.equal(input.execute, true);
            strict_1.default.equal(input.functionName, "agentOntology:getAgent");
            return {
                executed: true,
                command: "npx convex run agentOntology:getAgent --args '{...}'",
                stdout: '{"organizationId":"org_staging"}',
                stderr: "",
                parsedJson: { organizationId: "org_staging" }
            };
        }));
        strict_1.default.equal(output.exitCode, 0);
        const payload = JSON.parse(output.stdout);
        strict_1.default.equal(payload.success, true);
    });
});
//# sourceMappingURL=agent-commands.test.js.map