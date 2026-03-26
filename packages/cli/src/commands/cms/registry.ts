import fs from "node:fs/promises";
import path from "node:path";
import {
  type ParsedArgs,
  getOptionBoolean,
  getOptionString
} from "../../core/args";
import { colorGray, colorGreen, colorOrange } from "../../core/colors";
import {
  mergeCmsRegistryFeature,
  resolveCmsCommandContext,
  resolveCmsRegistrySelection
} from "./shared";

interface CmsRegistryDocument {
  schemaVersion: "sevenlayers.cms.registry.v1";
  fetchedAt: string;
  profile: string;
  organizationId: string;
  applicationId: string;
  applicationName: string;
  registryId: string;
  source: "override" | "feature" | "inferred";
}

function printUsage(): void {
  console.log(colorOrange("Usage: sevenlayers cms registry <pull|push> [options]"));
  console.log("");
  console.log("Shared options:");
  console.log("  --env <profile>             Target profile (local|staging|prod)");
  console.log("  --org-id <id>               Target organization id");
  console.log("  --app-id <id>               Target application id");
  console.log("  --registry-id <id>          Override CMS registry id");
  console.log("  --token <value>             API token (or use env vars)");
  console.log("  --yes --confirm-prod PROD   Required on confirm-gated targets for push");
  console.log("  --json                      Output deterministic JSON");
  console.log("  --help                      Show this help");
  console.log("");
  console.log("Pull options:");
  console.log("  --out <path>                Output file (default: .sevenlayers/cms-registry.json)");
  console.log("  --dry-run                   Print document without writing");
  console.log("");
  console.log("Push options:");
  console.log("  --in <path>                 Input file (default: .sevenlayers/cms-registry.json)");
  console.log("  --dry-run                   Preview feature update without writing");
}

function defaultRegistryPath(): string {
  return path.resolve(process.cwd(), ".sevenlayers/cms-registry.json");
}

async function loadRegistryFile(filePath: string): Promise<CmsRegistryDocument> {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const raw = await fs.readFile(absolutePath, "utf8");
  const parsed = JSON.parse(raw) as Record<string, unknown>;

  if (parsed.schemaVersion !== "sevenlayers.cms.registry.v1") {
    throw new Error(`Unsupported registry file schema in '${filePath}'.`);
  }

  const registryId =
    typeof parsed.registryId === "string" && parsed.registryId.trim().length > 0
      ? parsed.registryId
      : null;

  if (!registryId) {
    throw new Error(`Registry file '${filePath}' is missing registryId.`);
  }

  return {
    schemaVersion: "sevenlayers.cms.registry.v1",
    fetchedAt: typeof parsed.fetchedAt === "string" ? parsed.fetchedAt : new Date().toISOString(),
    profile: typeof parsed.profile === "string" ? parsed.profile : "unknown",
    organizationId: typeof parsed.organizationId === "string" ? parsed.organizationId : "",
    applicationId: typeof parsed.applicationId === "string" ? parsed.applicationId : "",
    applicationName: typeof parsed.applicationName === "string" ? parsed.applicationName : "",
    registryId,
    source:
      parsed.source === "feature" || parsed.source === "override" || parsed.source === "inferred"
        ? parsed.source
        : "inferred"
  };
}

async function handleRegistryPull(parsed: ParsedArgs): Promise<number> {
  const command = await resolveCmsCommandContext(parsed, { mutating: false });
  const application = await command.api.getApplication(command.applicationId);
  const registry = resolveCmsRegistrySelection(parsed, application.application);

  const document: CmsRegistryDocument = {
    schemaVersion: "sevenlayers.cms.registry.v1",
    fetchedAt: new Date().toISOString(),
    profile: command.profile,
    organizationId: command.organizationId,
    applicationId: command.applicationId,
    applicationName: application.application.name,
    registryId: registry.registryId,
    source: registry.source
  };

  const outputPath = getOptionString(parsed, "out") ?? defaultRegistryPath();
  const dryRun = getOptionBoolean(parsed, "dry-run");

  if (!dryRun) {
    const absolutePath = path.resolve(process.cwd(), outputPath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  }

  if (command.json) {
    console.log(
      JSON.stringify(
        {
          success: true,
          action: "pull",
          dryRun,
          file: path.resolve(process.cwd(), outputPath),
          document
        },
        null,
        2
      )
    );
    return 0;
  }

  console.log(colorGreen("CMS registry pull completed."));
  console.log(colorGray(`Application: ${command.applicationId}`));
  console.log(colorGray(`Registry: ${document.registryId}`));
  console.log(colorGray(`Source: ${document.source}`));
  if (dryRun) {
    console.log(colorGray("Dry-run: no file written."));
  } else {
    console.log(colorGray(`Wrote: ${path.resolve(process.cwd(), outputPath)}`));
  }
  return 0;
}

async function handleRegistryPush(parsed: ParsedArgs): Promise<number> {
  const command = await resolveCmsCommandContext(parsed, { mutating: true });
  const application = await command.api.getApplication(command.applicationId);
  const inputPath = getOptionString(parsed, "in") ?? defaultRegistryPath();
  const fileDocument = await loadRegistryFile(inputPath);
  const selected = resolveCmsRegistrySelection(parsed, application.application);
  const registryId = selected.source === "override" ? selected.registryId : fileDocument.registryId;

  const currentFeatures = (application.application.connection as Record<string, unknown> | undefined)
    ?.features;
  const nextFeatures = mergeCmsRegistryFeature(currentFeatures, registryId);
  const dryRun = getOptionBoolean(parsed, "dry-run");

  if (!dryRun) {
    await command.api.updateApplication(command.applicationId, {
      connection: {
        features: nextFeatures
      }
    });
  }

  if (command.json) {
    console.log(
      JSON.stringify(
        {
          success: true,
          action: "push",
          dryRun,
          profile: command.profile,
          organizationId: command.organizationId,
          applicationId: command.applicationId,
          registryId,
          features: nextFeatures
        },
        null,
        2
      )
    );
    return 0;
  }

  console.log(colorGreen("CMS registry push completed."));
  console.log(colorGray(`Application: ${command.applicationId}`));
  console.log(colorGray(`Registry: ${registryId}`));
  if (dryRun) {
    console.log(colorGray("Dry-run: no backend update applied."));
  } else {
    console.log(colorGray("Connected application feature metadata updated."));
  }
  return 0;
}

export async function handleCmsRegistry(parsed: ParsedArgs): Promise<number> {
  if (getOptionBoolean(parsed, "help")) {
    printUsage();
    return 0;
  }

  const subcommand = parsed.positionals[2];
  if (subcommand === "pull") {
    return handleRegistryPull(parsed);
  }
  if (subcommand === "push") {
    return handleRegistryPush(parsed);
  }

  throw new Error("Usage: sevenlayers cms registry <pull|push> [options]");
}
