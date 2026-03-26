import fs from "node:fs/promises";
import path from "node:path";
import {
  type ParsedArgs,
  getOptionBoolean,
  getOptionString,
  getOptionStringArray
} from "../../core/args";
import { colorGray, colorGreen, colorOrange } from "../../core/colors";
import { resolveRemoteCommand } from "./remote";

export interface PageSyncInput {
  path: string;
  name: string;
  pageType?: string;
  detectionMethod?: string;
}

interface PagesOptions {
  legacySource?: string;
  defaultSubcommand?: "sync" | "list";
}

function printUsage(): void {
  console.log(colorOrange("Usage: sevenlayers app pages <sync|list> [options]"));
  console.log("");
  console.log("Sync options:");
  console.log("  --page <path:name[:type[:method]]>   Add page declaration (repeatable)");
  console.log("  --pages-file <path>                   JSON file with page declarations");
  console.log("  --dry-run                             Show payload without API write");
  console.log("");
  console.log("List options:");
  console.log("  --status <status>                     Filter registered pages by status");
  console.log("");
  console.log("Shared options:");
  console.log("  --env <profile>                       Target profile (local|staging|prod)");
  console.log("  --org-id <id>                         Target organization id");
  console.log("  --app-id <id>                         Target application id");
  console.log("  --token <value>                       API token (or use env vars)");
  console.log("  --yes --confirm-prod PROD             Required on confirm-gated targets");
  console.log("  --json                                Output deterministic JSON");
  console.log("  --help                                Show this help");
}

export function parsePageSpec(spec: string): PageSyncInput {
  const [pagePath, pageName, pageType, detectionMethod] = spec.split(":");
  if (!pagePath || !pageName) {
    throw new Error(
      `Invalid --page value '${spec}'. Expected format: <path>:<name>[:<pageType>[:<detectionMethod>]]`
    );
  }

  return {
    path: pagePath.trim(),
    name: pageName.trim(),
    pageType: pageType?.trim() || undefined,
    detectionMethod: detectionMethod?.trim() || undefined
  };
}

async function loadPagesFromFile(filePath: string): Promise<PageSyncInput[]> {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const raw = await fs.readFile(absolutePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`Pages file '${filePath}' must contain an array.`);
  }

  return parsed.map((entry) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`Pages file '${filePath}' contains invalid entries.`);
    }
    const record = entry as Record<string, unknown>;
    const pagePath = typeof record.path === "string" ? record.path.trim() : "";
    const pageName = typeof record.name === "string" ? record.name.trim() : "";
    if (!pagePath || !pageName) {
      throw new Error(`Pages file '${filePath}' contains entry missing path or name.`);
    }
    return {
      path: pagePath,
      name: pageName,
      pageType: typeof record.pageType === "string" ? record.pageType.trim() || undefined : undefined,
      detectionMethod:
        typeof record.detectionMethod === "string" ? record.detectionMethod.trim() || undefined : undefined
    };
  });
}

async function resolvePageInputs(parsed: ParsedArgs): Promise<PageSyncInput[]> {
  const inlinePages = getOptionStringArray(parsed, "page").map(parsePageSpec);
  const filePath = getOptionString(parsed, "pages-file");
  if (!filePath) {
    return inlinePages;
  }

  const filePages = await loadPagesFromFile(filePath);
  return [...filePages, ...inlinePages];
}

async function handlePagesSync(parsed: ParsedArgs, options: PagesOptions): Promise<number> {
  const command = await resolveRemoteCommand(parsed, {
    requireOrgApp: true,
    mutatingCommand: true
  });

  const pages = await resolvePageInputs(parsed);
  if (pages.length === 0) {
    throw new Error("No pages provided. Use --page or --pages-file for app pages sync.");
  }

  const payload = pages.map((page) => ({
    path: page.path,
    name: page.name,
    pageType: page.pageType,
    detectionMethod: page.detectionMethod ?? "cli_manual"
  }));

  const dryRun = getOptionBoolean(parsed, "dry-run");

  if (dryRun) {
    if (command.json) {
      console.log(
        JSON.stringify(
          {
            success: true,
            dryRun: true,
            profile: command.target.profileName,
            organizationId: command.target.orgId,
            applicationId: command.target.appId,
            pages: payload
          },
          null,
          2
        )
      );
      return 0;
    }

    if (options.legacySource) {
      console.log(
        colorGray(`Legacy command '${options.legacySource}' mapped to 'sevenlayers app pages sync'.`)
      );
    }
    console.log(colorOrange("Dry-run page sync payload"));
    console.log(colorGray(`Application: ${command.target.appId}`));
    console.log(colorGray(`Page count: ${payload.length}`));
    return 0;
  }

  const result = await command.api.bulkRegisterPages(command.target.appId!, payload);

  if (command.json) {
    console.log(
      JSON.stringify(
        {
          success: true,
          profile: command.target.profileName,
          organizationId: command.target.orgId,
          applicationId: command.target.appId,
          total: result.total,
          created: result.created,
          updated: result.updated
        },
        null,
        2
      )
    );
    return 0;
  }

  if (options.legacySource) {
    console.log(
      colorGray(`Legacy command '${options.legacySource}' mapped to 'sevenlayers app pages sync'.`)
    );
  }
  console.log(colorGreen("Page sync completed."));
  console.log(colorGray(`Application: ${command.target.appId}`));
  console.log(colorGray(`Total: ${result.total}`));
  console.log(colorGray(`Created: ${result.created}`));
  console.log(colorGray(`Updated: ${result.updated}`));
  return 0;
}

async function handlePagesList(parsed: ParsedArgs, options: PagesOptions): Promise<number> {
  const command = await resolveRemoteCommand(parsed, {
    requireOrgApp: true,
    mutatingCommand: false
  });
  const status = getOptionString(parsed, "status");
  const result = await command.api.getApplicationPages(command.target.appId!, status);

  if (command.json) {
    console.log(
      JSON.stringify(
        {
          success: true,
          profile: command.target.profileName,
          organizationId: command.target.orgId,
          applicationId: command.target.appId,
          total: result.total,
          pages: result.pages
        },
        null,
        2
      )
    );
    return 0;
  }

  if (options.legacySource) {
    console.log(
      colorGray(`Legacy command '${options.legacySource}' mapped to 'sevenlayers app pages list'.`)
    );
  }
  console.log(colorGreen(`Registered pages: ${result.total}`));
  for (const page of result.pages) {
    const type = page.pageType ?? "unknown";
    console.log(colorGray(`  ${page.path} -> ${page.name} (${type})`));
  }
  return 0;
}

export async function handleAppPages(parsed: ParsedArgs, options: PagesOptions = {}): Promise<number> {
  if (getOptionBoolean(parsed, "help")) {
    printUsage();
    return 0;
  }

  const subcommand = parsed.positionals[2] ?? options.defaultSubcommand ?? "sync";
  if (subcommand === "sync") {
    return handlePagesSync(parsed, options);
  }
  if (subcommand === "list") {
    return handlePagesList(parsed, options);
  }

  throw new Error(`Unknown app pages subcommand '${subcommand}'. Expected 'sync' or 'list'.`);
}
