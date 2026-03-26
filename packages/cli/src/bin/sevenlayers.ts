#!/usr/bin/env node

import pkg from "../../package.json";
import { getOptionBoolean, parseArgv } from "../core/args";
import { colorGray, colorOrange, colorRed } from "../core/colors";
import { handleAppConnect } from "../commands/app/connect";
import { handleAppInit } from "../commands/app/init";
import { handleAppLink } from "../commands/app/link";
import { handleAppPages } from "../commands/app/pages";
import { handleAppRegister } from "../commands/app/register";
import { handleAppSync } from "../commands/app/sync";
import { handleDoctorTarget } from "../commands/doctor/target";
import { handleEnvList } from "../commands/env/list";
import { handleEnvSet } from "../commands/env/set";
import { handleEnvUse } from "../commands/env/use";
import { handleLegacyConnect } from "../commands/legacy/connect";
import { handleLegacyPages } from "../commands/legacy/pages";
import { handleLegacySpread } from "../commands/legacy/spread";
import { handleLegacySync } from "../commands/legacy/sync";
import { handleCmsRegistry } from "../commands/cms/registry";
import { handleCmsBind } from "../commands/cms/bind";
import { handleCmsMigrate } from "../commands/cms/migrate";
import { handleCmsSeed } from "../commands/cms/seed";
import { handleCmsDoctor } from "../commands/cms/doctor";
import { handleBookingSetup } from "../commands/booking/setup";
import { handleBookingCheck } from "../commands/booking/check";
import { handleBookingSmoke } from "../commands/booking/smoke";
import { handleAgentInit } from "../commands/agent/init";
import { handleAgentTemplate } from "../commands/agent/template";
import { handleAgentPermissions } from "../commands/agent/permissions";
import { handleAgentDrift } from "../commands/agent/drift";
import { handleAgentCatalog } from "../commands/agent/catalog";
import { renderLogo } from "../ui/logo";

function printHelp(): void {
  console.log(renderLogo());
  console.log(colorOrange("Usage: sevenlayers <command> [options]"));
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
  console.log(
    colorGray("Default behavior preserves existing env keys and avoids destructive rewrites.")
  );
}

async function run(): Promise<number> {
  const parsed = parseArgv(process.argv.slice(2));

  if (
    parsed.positionals.length === 0 ||
    getOptionBoolean(parsed, "help") ||
    parsed.positionals[0] === "help"
  ) {
    printHelp();
    return 0;
  }

  if (getOptionBoolean(parsed, "version") || parsed.positionals[0] === "version") {
    console.log(pkg.version);
    return 0;
  }

  const [first, second] = parsed.positionals;

  if (first === "env") {
    if (!second || second === "list") {
      return handleEnvList(parsed);
    }

    if (second === "use") {
      return handleEnvUse(parsed);
    }

    if (second === "set") {
      return handleEnvSet(parsed);
    }
  }

  if (first === "doctor" && second === "target") {
    return handleDoctorTarget(parsed);
  }

  if (first === "app" && second === "init") {
    return handleAppInit(parsed);
  }

  if (first === "app" && second === "connect") {
    return handleAppConnect(parsed);
  }

  if (first === "app" && second === "register") {
    return handleAppRegister(parsed);
  }

  if (first === "app" && second === "link") {
    return handleAppLink(parsed);
  }

  if (first === "app" && second === "sync") {
    return handleAppSync(parsed);
  }

  if (first === "app" && second === "pages") {
    return handleAppPages(parsed);
  }

  if (first === "cms" && second === "registry") {
    return handleCmsRegistry(parsed);
  }

  if (first === "cms" && second === "bind") {
    return handleCmsBind(parsed);
  }

  if (first === "cms" && second === "migrate") {
    return handleCmsMigrate(parsed);
  }

  if (first === "cms" && second === "seed") {
    return handleCmsSeed(parsed);
  }

  if (first === "cms" && second === "doctor") {
    return handleCmsDoctor(parsed);
  }

  if (first === "booking" && second === "setup") {
    return handleBookingSetup(parsed);
  }

  if (first === "booking" && second === "check") {
    return handleBookingCheck(parsed);
  }

  if (first === "booking" && second === "smoke") {
    return handleBookingSmoke(parsed);
  }

  if (first === "agent" && second === "init") {
    return handleAgentInit(parsed);
  }

  if (first === "agent" && second === "template") {
    return handleAgentTemplate(parsed);
  }

  if (first === "agent" && second === "permissions") {
    return handleAgentPermissions(parsed);
  }

  if (first === "agent" && second === "drift") {
    return handleAgentDrift(parsed);
  }

  if (first === "agent" && second === "catalog") {
    return handleAgentCatalog(parsed);
  }

  if (first === "init") {
    return handleAppInit(parsed, { legacySource: "init" });
  }

  if (first === "spread") {
    return handleLegacySpread(parsed);
  }

  if (first === "connect") {
    return handleLegacyConnect(parsed);
  }

  if (first === "sync") {
    return handleLegacySync(parsed);
  }

  if (first === "pages") {
    return handleLegacyPages(parsed);
  }

  console.error(colorRed(`Unknown command: ${parsed.positionals.join(" ")}`));
  console.log("");
  printHelp();
  return 1;
}

run()
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(colorRed(`CLI error: ${message}`));
    process.exit(1);
  });
