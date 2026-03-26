#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const package_json_1 = __importDefault(require("../../package.json"));
const args_1 = require("../core/args");
const colors_1 = require("../core/colors");
const connect_1 = require("../commands/app/connect");
const init_1 = require("../commands/app/init");
const link_1 = require("../commands/app/link");
const pages_1 = require("../commands/app/pages");
const register_1 = require("../commands/app/register");
const sync_1 = require("../commands/app/sync");
const target_1 = require("../commands/doctor/target");
const list_1 = require("../commands/env/list");
const set_1 = require("../commands/env/set");
const use_1 = require("../commands/env/use");
const connect_2 = require("../commands/legacy/connect");
const pages_2 = require("../commands/legacy/pages");
const spread_1 = require("../commands/legacy/spread");
const sync_2 = require("../commands/legacy/sync");
const registry_1 = require("../commands/cms/registry");
const bind_1 = require("../commands/cms/bind");
const migrate_1 = require("../commands/cms/migrate");
const seed_1 = require("../commands/cms/seed");
const doctor_1 = require("../commands/cms/doctor");
const setup_1 = require("../commands/booking/setup");
const check_1 = require("../commands/booking/check");
const smoke_1 = require("../commands/booking/smoke");
const init_2 = require("../commands/agent/init");
const template_1 = require("../commands/agent/template");
const permissions_1 = require("../commands/agent/permissions");
const drift_1 = require("../commands/agent/drift");
const catalog_1 = require("../commands/agent/catalog");
const logo_1 = require("../ui/logo");
function printHelp() {
    console.log((0, logo_1.renderLogo)());
    console.log((0, colors_1.colorOrange)("Usage: sevenlayers <command> [options]"));
    console.log("");
    console.log("Core commands:");
    console.log("  env list                 List configured target profiles");
    console.log("  env use <profile>        Set active profile");
    console.log("  env set <profile>        Configure profile endpoints/default targets");
    console.log("  doctor target            Validate resolved profile/org/app target context");
    console.log("  app init                 Safe env setup (non-destructive default)");
    console.log("  app connect              Safe env update for app connection");
    console.log("  app register             Register connected application via backend API");
    console.log("  app link                 Update app metadata/deployment wiring");
    console.log("  app sync                 Trigger or report application sync");
    console.log("  app pages sync           Sync page declarations for an application");
    console.log("  cms registry pull        Read app-scoped CMS registry metadata");
    console.log("  cms registry push        Update app-scoped CMS registry metadata");
    console.log("  cms bind                 Update page object bindings for CMS surfaces");
    console.log("  cms migrate legacy       Migrate legacy CMS structures into v1 content schema");
    console.log("  cms seed                 Generate locale-aware CMS content seed plan");
    console.log("  cms doctor               Run locale/field parity diagnostics");
    console.log("  booking setup            Validate prerequisites and seed booking env keys");
    console.log("  booking check            Validate booking endpoint + entity prerequisites");
    console.log("  booking smoke            Run booking smoke payload (dry-run by default)");
    console.log("  agent init               Bootstrap an agent via existing soul generator flow");
    console.log("  agent template apply     Preview/apply agent patch payload");
    console.log("  agent permissions check  Validate scoped agent permissions and access");
    console.log("  agent drift              Query template clone drift for governance checks");
    console.log("  agent catalog            Query template governance catalog datasets");
    console.log("");
    console.log("Compatibility aliases:");
    console.log("  init                     Alias for app init");
    console.log("  spread                   Legacy alias for app init");
    console.log("  connect                  Legacy alias for app connect");
    console.log("  sync                     Legacy alias for app sync");
    console.log("  pages                    Legacy alias for app pages sync");
    console.log("");
    console.log("Flags:");
    console.log("  --help                   Show command help");
    console.log("  --version                Show CLI version");
    console.log("");
    console.log((0, colors_1.colorGray)("Default behavior preserves existing env keys and avoids destructive rewrites."));
}
async function run() {
    const parsed = (0, args_1.parseArgv)(process.argv.slice(2));
    if (parsed.positionals.length === 0 ||
        (0, args_1.getOptionBoolean)(parsed, "help") ||
        parsed.positionals[0] === "help") {
        printHelp();
        return 0;
    }
    if ((0, args_1.getOptionBoolean)(parsed, "version") || parsed.positionals[0] === "version") {
        console.log(package_json_1.default.version);
        return 0;
    }
    const [first, second] = parsed.positionals;
    if (first === "env") {
        if (!second || second === "list") {
            return (0, list_1.handleEnvList)(parsed);
        }
        if (second === "use") {
            return (0, use_1.handleEnvUse)(parsed);
        }
        if (second === "set") {
            return (0, set_1.handleEnvSet)(parsed);
        }
    }
    if (first === "doctor" && second === "target") {
        return (0, target_1.handleDoctorTarget)(parsed);
    }
    if (first === "app" && second === "init") {
        return (0, init_1.handleAppInit)(parsed);
    }
    if (first === "app" && second === "connect") {
        return (0, connect_1.handleAppConnect)(parsed);
    }
    if (first === "app" && second === "register") {
        return (0, register_1.handleAppRegister)(parsed);
    }
    if (first === "app" && second === "link") {
        return (0, link_1.handleAppLink)(parsed);
    }
    if (first === "app" && second === "sync") {
        return (0, sync_1.handleAppSync)(parsed);
    }
    if (first === "app" && second === "pages") {
        return (0, pages_1.handleAppPages)(parsed);
    }
    if (first === "cms" && second === "registry") {
        return (0, registry_1.handleCmsRegistry)(parsed);
    }
    if (first === "cms" && second === "bind") {
        return (0, bind_1.handleCmsBind)(parsed);
    }
    if (first === "cms" && second === "migrate") {
        return (0, migrate_1.handleCmsMigrate)(parsed);
    }
    if (first === "cms" && second === "seed") {
        return (0, seed_1.handleCmsSeed)(parsed);
    }
    if (first === "cms" && second === "doctor") {
        return (0, doctor_1.handleCmsDoctor)(parsed);
    }
    if (first === "booking" && second === "setup") {
        return (0, setup_1.handleBookingSetup)(parsed);
    }
    if (first === "booking" && second === "check") {
        return (0, check_1.handleBookingCheck)(parsed);
    }
    if (first === "booking" && second === "smoke") {
        return (0, smoke_1.handleBookingSmoke)(parsed);
    }
    if (first === "agent" && second === "init") {
        return (0, init_2.handleAgentInit)(parsed);
    }
    if (first === "agent" && second === "template") {
        return (0, template_1.handleAgentTemplate)(parsed);
    }
    if (first === "agent" && second === "permissions") {
        return (0, permissions_1.handleAgentPermissions)(parsed);
    }
    if (first === "agent" && second === "drift") {
        return (0, drift_1.handleAgentDrift)(parsed);
    }
    if (first === "agent" && second === "catalog") {
        return (0, catalog_1.handleAgentCatalog)(parsed);
    }
    if (first === "init") {
        return (0, init_1.handleAppInit)(parsed, { legacySource: "init" });
    }
    if (first === "spread") {
        return (0, spread_1.handleLegacySpread)(parsed);
    }
    if (first === "connect") {
        return (0, connect_2.handleLegacyConnect)(parsed);
    }
    if (first === "sync") {
        return (0, sync_2.handleLegacySync)(parsed);
    }
    if (first === "pages") {
        return (0, pages_2.handleLegacyPages)(parsed);
    }
    console.error((0, colors_1.colorRed)(`Unknown command: ${parsed.positionals.join(" ")}`));
    console.log("");
    printHelp();
    return 1;
}
run()
    .then((exitCode) => {
    process.exit(exitCode);
})
    .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error((0, colors_1.colorRed)(`CLI error: ${message}`));
    process.exit(1);
});
//# sourceMappingURL=sevenlayers.js.map