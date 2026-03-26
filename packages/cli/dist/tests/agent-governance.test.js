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
const catalog_1 = require("../commands/agent/catalog");
const drift_1 = require("../commands/agent/drift");
async function withTempDir(run) {
    const directory = await promises_1.default.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), "sevenlayers-agent-governance-tests-"));
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
(0, node_test_1.default)("agent drift forwards normalized organization scope and emits JSON", async () => {
    await withProfileStore(async () => {
        const parsed = (0, args_1.parseArgv)([
            "agent",
            "drift",
            "--env",
            "staging",
            "--session-id",
            "sess_123",
            "--template-id",
            "template_1",
            "--template-version-id",
            "version_1",
            "--target-org-id",
            "org_b,org_a",
            "--target-org-id",
            "org_a",
            "--json"
        ]);
        const output = await captureOutput(() => (0, drift_1.handleAgentDrift)(parsed, async (input) => {
            strict_1.default.equal(input.execute, true);
            strict_1.default.equal(input.functionName, "agentOntology:getTemplateCloneDriftReport");
            strict_1.default.deepEqual(input.args, {
                sessionId: "sess_123",
                templateId: "template_1",
                templateVersionId: "version_1",
                targetOrganizationIds: ["org_a", "org_b"]
            });
            return {
                executed: true,
                command: "npx convex run agentOntology:getTemplateCloneDriftReport --args '{...}'",
                stdout: '{"targets":[]}',
                stderr: "",
                parsedJson: { targets: [] }
            };
        }));
        strict_1.default.equal(output.exitCode, 0);
        const payload = JSON.parse(output.stdout);
        strict_1.default.equal(payload.success, true);
        strict_1.default.deepEqual(payload.targetOrganizationIds, ["org_a", "org_b"]);
    });
});
(0, node_test_1.default)("agent drift fails when backend output is not parseable JSON", async () => {
    await withProfileStore(async () => {
        const parsed = (0, args_1.parseArgv)([
            "agent",
            "drift",
            "--env",
            "staging",
            "--session-id",
            "sess_123",
            "--template-id",
            "template_1",
            "--json"
        ]);
        const output = await captureOutput(() => (0, drift_1.handleAgentDrift)(parsed, async () => ({
            executed: true,
            command: "npx convex run agentOntology:getTemplateCloneDriftReport --args '{...}'",
            stdout: "not-json",
            stderr: "",
            parsedJson: null
        })));
        strict_1.default.equal(output.exitCode, 1);
        const payload = JSON.parse(output.stdout);
        strict_1.default.equal(payload.success, false);
        const issues = payload.issues;
        strict_1.default.equal(issues.some((issue) => issue.includes("non-JSON drift response")), true);
    });
});
(0, node_test_1.default)("agent catalog defaults to rollout mode", async () => {
    await withProfileStore(async () => {
        const parsed = (0, args_1.parseArgv)([
            "agent",
            "catalog",
            "--env",
            "staging",
            "--session-id",
            "sess_123",
            "--refresh-nonce",
            "42",
            "--json"
        ]);
        const output = await captureOutput(() => (0, catalog_1.handleAgentCatalog)(parsed, async (input) => {
            strict_1.default.equal(input.execute, true);
            strict_1.default.equal(input.functionName, "agentOntology:listTemplateRolloutOptions");
            strict_1.default.deepEqual(input.args, {
                sessionId: "sess_123",
                refreshNonce: 42
            });
            return {
                executed: true,
                command: "npx convex run agentOntology:listTemplateRolloutOptions --args '{...}'",
                stdout: '{"templates":[]}',
                stderr: "",
                parsedJson: { templates: [] }
            };
        }));
        strict_1.default.equal(output.exitCode, 0);
        const payload = JSON.parse(output.stdout);
        strict_1.default.equal(payload.success, true);
        strict_1.default.equal(payload.mode, "rollout");
    });
});
(0, node_test_1.default)("agent catalog lifecycle mode maps to lifecycle function", async () => {
    await withProfileStore(async () => {
        const parsed = (0, args_1.parseArgv)([
            "agent",
            "catalog",
            "lifecycle",
            "--env",
            "staging",
            "--session-id",
            "sess_123",
            "--json"
        ]);
        const output = await captureOutput(() => (0, catalog_1.handleAgentCatalog)(parsed, async (input) => {
            strict_1.default.equal(input.functionName, "agentOntology:listTemplateLifecycleOptions");
            strict_1.default.deepEqual(input.args, {
                sessionId: "sess_123"
            });
            return {
                executed: true,
                command: "npx convex run agentOntology:listTemplateLifecycleOptions --args '{...}'",
                stdout: '{"templates":[]}',
                stderr: "",
                parsedJson: { templates: [] }
            };
        }));
        strict_1.default.equal(output.exitCode, 0);
        const payload = JSON.parse(output.stdout);
        strict_1.default.equal(payload.mode, "lifecycle");
    });
});
(0, node_test_1.default)("agent catalog telemetry mode forwards template and limit filters", async () => {
    await withProfileStore(async () => {
        const parsed = (0, args_1.parseArgv)([
            "agent",
            "catalog",
            "telemetry",
            "--env",
            "staging",
            "--session-id",
            "sess_123",
            "--template-id",
            "template_1",
            "--limit",
            "15",
            "--json"
        ]);
        const output = await captureOutput(() => (0, catalog_1.handleAgentCatalog)(parsed, async (input) => {
            strict_1.default.equal(input.functionName, "agentOntology:listTemplateDistributionTelemetry");
            strict_1.default.deepEqual(input.args, {
                sessionId: "sess_123",
                templateId: "template_1",
                limit: 15
            });
            return {
                executed: true,
                command: "npx convex run agentOntology:listTemplateDistributionTelemetry --args '{...}'",
                stdout: '{"rows":[]}',
                stderr: "",
                parsedJson: { rows: [] }
            };
        }));
        strict_1.default.equal(output.exitCode, 0);
        const payload = JSON.parse(output.stdout);
        strict_1.default.equal(payload.mode, "telemetry");
    });
});
//# sourceMappingURL=agent-governance.test.js.map