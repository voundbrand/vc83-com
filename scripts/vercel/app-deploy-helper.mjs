#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_FILE = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_FILE);
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");
const SOURCE_DIRS = ["app", "pages", "components", "lib", "hooks", "src"];
const IGNORED_ENV_NAMES = new Set(["NODE_ENV"]);
const NEXT_CONFIG_NAMES = [
  "next.config.ts",
  "next.config.mjs",
  "next.config.js",
  "next.config.cjs",
];

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const analysis = await analyzeApp(options.appPath);

  if (options.writeDoc) {
    const outputPath = path.join(analysis.appRootAbs, "DEPLOYMENT.generated.md");
    await fs.writeFile(outputPath, renderDeploymentDoc(analysis), "utf8");
    analysis.generatedDocPath = path.relative(REPO_ROOT, outputPath);
  }

  if (options.json) {
    process.stdout.write(`${JSON.stringify(analysis, null, 2)}\n`);
    return;
  }

  process.stdout.write(renderConsoleReport(analysis));
}

function parseArgs(argv) {
  let appPath = null;
  let json = false;
  let writeDoc = false;

  for (const arg of argv) {
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "--write-doc") {
      writeDoc = true;
      continue;
    }
    if (arg.startsWith("--")) {
      throw new Error(`Unknown flag: ${arg}`);
    }
    if (appPath) {
      throw new Error("Only one app path may be provided.");
    }
    appPath = arg;
  }

  if (!appPath) {
    throw new Error(
      "Usage: node scripts/vercel/app-deploy-helper.mjs <app-path> [--write-doc] [--json]"
    );
  }

  return { appPath, json, writeDoc };
}

async function analyzeApp(rawAppPath) {
  const appPath = normalizeRepoRelative(rawAppPath);
  const appRootAbs = path.join(REPO_ROOT, appPath);

  if (!(await exists(appRootAbs))) {
    throw new Error(`App path does not exist: ${appPath}`);
  }

  const packageJsonPath = path.join(appRootAbs, "package.json");
  if (!(await exists(packageJsonPath))) {
    throw new Error(`Missing package.json: ${path.relative(REPO_ROOT, packageJsonPath)}`);
  }

  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
  const tsconfig = await readJsonIfPresent(path.join(appRootAbs, "tsconfig.json"));
  const nextConfigName = await findFirstExisting(appRootAbs, NEXT_CONFIG_NAMES);
  const appLocalVercelJsonPresent = await exists(path.join(appRootAbs, "vercel.json"));

  const sourceFiles = await collectSourceFiles(appRootAbs);
  const scriptAnalysis = analyzeScripts(packageJson.scripts ?? {});
  const tsconfigPaths = resolveTsconfigPaths(
    tsconfig?.compilerOptions?.paths ?? {},
    appRootAbs
  );
  const importAnalysis = await analyzeImports(sourceFiles, appRootAbs, tsconfigPaths);
  const envAnalysis = await analyzeEnvVars(sourceFiles, appRootAbs);

  const isNextApp = detectNextApp({
    packageJson,
    nextConfigName,
    scripts: packageJson.scripts ?? {},
    appRootAbs,
  });

  const nextRuntimeDeps = ["next", "react", "react-dom"];
  const directDeps = {
    dependencies: packageJson.dependencies ?? {},
    devDependencies: packageJson.devDependencies ?? {},
  };
  const missingNextRuntimeDeps = nextRuntimeDeps.filter(
    (dep) => !directDeps.dependencies[dep] && !directDeps.devDependencies[dep]
  );

  const needsRootInstall =
    scriptAnalysis.referencesRootNodeModules ||
    importAnalysis.externalRelativeImports.length > 0 ||
    importAnalysis.externalAliasImports.length > 0;

  const relFromAppToRoot = toPosix(path.relative(appRootAbs, REPO_ROOT)) || ".";
  const nodeVersion = packageJson.engines?.node ?? "<set-node-version>";
  const frameworkPreset = isNextApp ? "Next.js" : "Other";
  const buildCommand = packageJson.scripts?.build ?? (isNextApp ? "next build" : "<set-build-command>");
  const outputDirectory = "";
  const installCommand = needsRootInstall
    ? `cd ${relFromAppToRoot} && npm ci --include=dev && npm ci --prefix ${appPath} --include=dev`
    : "npm ci --include=dev";
  const ignoredBuildStep = `bash ${toPosix(
    path.join(relFromAppToRoot, "scripts/ci/vercel-ignored-build.sh")
  )} ${appPath}`;
  const recommendedVercelJson = {
    $schema: "https://openapi.vercel.sh/vercel.json",
    framework: isNextApp ? "nextjs" : undefined,
    installCommand,
    buildCommand,
    ignoreCommand: ignoredBuildStep,
  };

  const warnings = [];
  if (scriptAnalysis.referencesRootNodeModules) {
    warnings.push(
      "package.json scripts resolve binaries from ../../node_modules; the app cannot rely on an app-only install unless those scripts are localized."
    );
  }
  if (importAnalysis.externalRelativeImports.length > 0) {
    warnings.push(
      "source files import code outside the app root via relative paths, so external code will resolve packages from ancestor node_modules."
    );
  }
  if (importAnalysis.externalAliasImports.length > 0) {
    warnings.push(
      "tsconfig path aliases point outside the app root, so app-only installs may miss dependencies required by aliased workspace code."
    );
  }
  if (isNextApp && missingNextRuntimeDeps.length > 0) {
    warnings.push(
      `direct app runtime deps are incomplete for Next detection: missing ${missingNextRuntimeDeps.join(", ")}. Set Framework Preset to Next.js or add those app-local deps.`
    );
  }
  if (!packageJson.engines?.node) {
    warnings.push("package.json does not pin a Node version via engines.node.");
  }
  if (!nextConfigName) {
    warnings.push("Next config file is missing; verify outputFileTracingRoot and framework defaults manually.");
  }
  if (
    isNextApp &&
    !appLocalVercelJsonPresent &&
    (needsRootInstall || missingNextRuntimeDeps.length > 0)
  ) {
    warnings.push(
      "no app-local vercel.json is present, so the framework/install settings still depend on dashboard configuration."
    );
  }

  return {
    appPath,
    appRootAbs,
    packageName: packageJson.name ?? path.basename(appRootAbs),
    frameworkPreset,
    nodeVersion,
    buildCommand,
    outputDirectory,
    installCommand,
    ignoredBuildStep,
    hasNextConfig: Boolean(nextConfigName),
    nextConfigPath: nextConfigName ? toPosix(path.join(appPath, nextConfigName)) : null,
    hasAppLocalVercelJson: appLocalVercelJsonPresent,
    directNextRuntimeDepsMissing: missingNextRuntimeDeps,
    scriptAnalysis,
    importAnalysis,
    envAnalysis,
    warnings,
    commands: buildCommands({ appPath, envNames: envAnalysis.orderedNames }),
    recommendedVercelJson,
    generatedDocPath: null,
  };
}

function analyzeScripts(scripts) {
  const entries = Object.entries(scripts);
  const rootNodeModulesScripts = entries
    .filter(([, command]) => /\.\.\/node_modules\//.test(command))
    .map(([name, command]) => ({ name, command }));

  return {
    build: scripts.build ?? null,
    dev: scripts.dev ?? null,
    typecheck: scripts.typecheck ?? null,
    referencesRootNodeModules: rootNodeModulesScripts.length > 0,
    rootNodeModulesScripts,
  };
}

function resolveTsconfigPaths(pathsConfig, appRootAbs) {
  const entries = [];
  for (const [alias, targets] of Object.entries(pathsConfig)) {
    for (const target of targets) {
      const normalizedTarget = normalizeSlashes(target);
      const resolvedBase = path.resolve(appRootAbs, normalizedTarget.replace(/\*.*$/, ""));
      entries.push({
        alias,
        target,
        resolvedBase,
        isExternal: !isInside(resolvedBase, appRootAbs),
      });
    }
  }
  return entries;
}

async function analyzeImports(sourceFiles, appRootAbs, tsconfigPaths) {
  const externalRelativeImports = [];
  const externalAliasImports = [];
  const aliasMatchers = tsconfigPaths.map(createAliasMatcher);

  for (const file of sourceFiles) {
    const content = await fs.readFile(file, "utf8");
    for (const specifier of extractModuleSpecifiers(content)) {
      if (specifier.startsWith(".")) {
        const resolved = path.resolve(path.dirname(file), specifier);
        if (!isInside(resolved, appRootAbs)) {
          externalRelativeImports.push({
            file: repoRelative(file),
            specifier,
            resolved: repoRelative(resolved),
          });
        }
        continue;
      }

      for (const matcher of aliasMatchers) {
        const matches = matcher(specifier);
        if (!matches.length) {
          continue;
        }
        for (const match of matches) {
          if (!isInside(match.resolvedBase, appRootAbs)) {
            externalAliasImports.push({
              file: repoRelative(file),
              specifier,
              alias: match.alias,
              target: match.target,
              resolvedBase: repoRelative(match.resolvedBase),
            });
          }
        }
      }
    }
  }

  return {
    externalRelativeImports: dedupeObjects(externalRelativeImports),
    externalAliasImports: dedupeObjects(externalAliasImports),
  };
}

async function analyzeEnvVars(sourceFiles, appRootAbs) {
  const usageByVar = new Map();

  for (const file of sourceFiles) {
    const content = await fs.readFile(file, "utf8");
    const fileRequired = detectExplicitRequiredEnvVars(content);
    const fileFallback = detectFallbackEnvVars(content);
    const lines = content.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const matches = [...line.matchAll(/process\.env\.([A-Z0-9_]+)/g)];
      for (const match of matches) {
        const envName = match[1];
        if (IGNORED_ENV_NAMES.has(envName)) {
          continue;
        }
        const entry = usageByVar.get(envName) ?? {
          name: envName,
          files: new Set(),
          snippets: [],
          requiredByGuard: false,
          fallbackOnly: true,
        };

        entry.files.add(repoRelative(file));
        if (entry.snippets.length < 3) {
          entry.snippets.push({
            file: repoRelative(file),
            line: index + 1,
            text: line.trim(),
          });
        }
        if (fileRequired.has(envName)) {
          entry.requiredByGuard = true;
        }
        if (!fileFallback.has(envName)) {
          entry.fallbackOnly = false;
        }
        usageByVar.set(envName, entry);
      }
    }
  }

  const explicitRequired = [];
  const fallbackOrConditional = [];
  const review = [];
  const orderedNames = [...usageByVar.keys()].sort();

  for (const name of orderedNames) {
    const entry = usageByVar.get(name);
    const serialized = {
      name,
      files: [...entry.files].sort(),
      snippets: entry.snippets,
    };
    if (entry.requiredByGuard) {
      explicitRequired.push(serialized);
      continue;
    }
    if (entry.fallbackOnly) {
      fallbackOrConditional.push(serialized);
      continue;
    }
    review.push(serialized);
  }

  return {
    explicitRequired,
    fallbackOrConditional,
    review,
    orderedNames,
  };
}

function detectExplicitRequiredEnvVars(content) {
  const required = new Set();
  for (const match of content.matchAll(
    /process\.env\.([A-Z0-9_]+)[\s\S]{0,240}?throw new Error\((["'`])[\s\S]*?\1\)/g
  )) {
    required.add(match[1]);
  }
  for (const match of content.matchAll(
    /throw new Error\((["'`])([\s\S]*?)\1\)/g
  )) {
    const message = match[2];
    const envMatches = [...message.matchAll(/\b([A-Z0-9_]{3,})\b/g)];
    for (const envMatch of envMatches) {
      if (/not configured|required|missing/i.test(message)) {
        required.add(envMatch[1]);
      }
    }
  }
  return required;
}

function detectFallbackEnvVars(content) {
  const fallback = new Set();
  for (const match of content.matchAll(
    /process\.env\.([A-Z0-9_]+)[^\n]{0,160}(\|\||\?\?)/g
  )) {
    fallback.add(match[1]);
  }
  for (const match of content.matchAll(
    /(\|\||\?\?)[^\n]{0,160}process\.env\.([A-Z0-9_]+)/g
  )) {
    fallback.add(match[2]);
  }
  return fallback;
}

function detectNextApp({ packageJson, nextConfigName, scripts, appRootAbs }) {
  if (nextConfigName) {
    return true;
  }
  if ((packageJson.dependencies ?? {}).next || (packageJson.devDependencies ?? {}).next) {
    return true;
  }
  if (Object.values(scripts).some((command) => /\bnext\b/.test(command))) {
    return true;
  }
  return false;
}

function buildCommands({ appPath, envNames }) {
  const envCommands = envNames.flatMap((envName) => [
    `export ${envName}="<value>"`,
    `printf '%s' "$${envName}" | npx vercel@latest env add ${envName} preview`,
    `printf '%s' "$${envName}" | npx vercel@latest env add ${envName} production`,
  ]);

  return {
    link: [
      `cd ${path.join(REPO_ROOT, appPath)}`,
      "npx vercel@latest link",
    ],
    env: envCommands,
  };
}

function renderConsoleReport(analysis) {
  const lines = [];
  lines.push(`# Vercel App Helper: ${analysis.appPath}`);
  lines.push("");
  lines.push("## Recommended Settings");
  lines.push(`- Framework Preset: ${analysis.frameworkPreset}`);
  lines.push(`- Root Directory: ${analysis.appPath}`);
  lines.push(`- Node.js Version: ${analysis.nodeVersion}`);
  lines.push(`- Install Command: \`${analysis.installCommand}\``);
  lines.push(`- Build Command: \`${analysis.buildCommand}\``);
  lines.push("- Output Directory: leave blank");
  lines.push(`- Ignored Build Step: \`${analysis.ignoredBuildStep}\``);

  if (analysis.warnings.length) {
    lines.push("");
    lines.push("## Warnings");
    for (const warning of analysis.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  if (
    analysis.importAnalysis.externalRelativeImports.length ||
    analysis.importAnalysis.externalAliasImports.length
  ) {
    lines.push("");
    lines.push("## External Dependency Signals");
    for (const item of analysis.importAnalysis.externalRelativeImports.slice(0, 6)) {
      lines.push(
        `- Relative import escapes app root: ${item.file} -> ${item.specifier}`
      );
    }
    for (const item of analysis.importAnalysis.externalAliasImports.slice(0, 6)) {
      lines.push(
        `- Alias resolves outside app root: ${item.file} -> ${item.specifier} (${item.resolvedBase})`
      );
    }
  }

  lines.push("");
  lines.push("## Recommended vercel.json");
  lines.push("```json");
  lines.push(JSON.stringify(withoutUndefined(analysis.recommendedVercelJson), null, 2));
  lines.push("```");

  lines.push("");
  lines.push("## Link Command");
  lines.push("```bash");
  for (const command of analysis.commands.link) {
    lines.push(command);
  }
  lines.push("```");

  if (analysis.envAnalysis.orderedNames.length) {
    lines.push("");
    lines.push("## Env Vars");
    pushEnvSection(lines, "Required by explicit guard", analysis.envAnalysis.explicitRequired);
    pushEnvSection(
      lines,
      "Fallback or conditional",
      analysis.envAnalysis.fallbackOrConditional
    );
    pushEnvSection(lines, "Review manually", analysis.envAnalysis.review);

    lines.push("");
    lines.push("## Env Commands");
    lines.push("```bash");
    for (const command of analysis.commands.env) {
      lines.push(command);
    }
    lines.push("```");
  }

  if (analysis.generatedDocPath) {
    lines.push("");
    lines.push(`Generated doc: ${analysis.generatedDocPath}`);
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

function renderDeploymentDoc(analysis) {
  const lines = [];
  lines.push(`# ${analysis.packageName} Deployment`);
  lines.push("");
  lines.push(
    `Generated by \`scripts/vercel/app-deploy-helper.mjs\` for \`${analysis.appPath}\`.`
  );
  lines.push("");
  lines.push("## Vercel Settings");
  lines.push(`- Framework Preset: \`${analysis.frameworkPreset}\``);
  lines.push(`- Root Directory: \`${analysis.appPath}\``);
  lines.push(`- Node.js Version: \`${analysis.nodeVersion}\``);
  lines.push(`- Install Command: \`${analysis.installCommand}\``);
  lines.push(`- Build Command: \`${analysis.buildCommand}\``);
  lines.push("- Output Directory: leave blank");
  lines.push(`- Ignored Build Step: \`${analysis.ignoredBuildStep}\``);

  if (analysis.warnings.length) {
    lines.push("");
    lines.push("## Notes");
    for (const warning of analysis.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  lines.push("");
  lines.push("## Commands");
  lines.push("```bash");
  for (const command of analysis.commands.link) {
    lines.push(command);
  }
  lines.push("```");

  if (analysis.envAnalysis.orderedNames.length) {
    lines.push("");
    lines.push("## Env Vars");
    pushEnvSection(lines, "Required by explicit guard", analysis.envAnalysis.explicitRequired);
    pushEnvSection(
      lines,
      "Fallback or conditional",
      analysis.envAnalysis.fallbackOrConditional
    );
    pushEnvSection(lines, "Review manually", analysis.envAnalysis.review);
  }

  return `${lines.join("\n")}\n`;
}

function pushEnvSection(lines, title, entries) {
  if (!entries.length) {
    return;
  }
  lines.push(`### ${title}`);
  for (const entry of entries) {
    const firstSnippet = entry.snippets[0];
    const location = firstSnippet ? `${firstSnippet.file}:${firstSnippet.line}` : entry.files[0];
    lines.push(`- \`${entry.name}\` (${location})`);
  }
}

async function collectSourceFiles(appRootAbs) {
  const files = [];
  for (const dir of SOURCE_DIRS) {
    const absDir = path.join(appRootAbs, dir);
    if (!(await exists(absDir))) {
      continue;
    }
    await walk(absDir, files);
  }
  return files.filter((file) => /\.(c|m)?(t|j)sx?$/.test(file));
}

async function walk(dir, files) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next") {
      continue;
    }
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(abs, files);
      continue;
    }
    files.push(abs);
  }
}

function extractModuleSpecifiers(content) {
  const specifiers = new Set();
  const patterns = [
    /(?:import|export)\s+[\s\S]*?\sfrom\s+["']([^"']+)["']/g,
    /import\s+["']([^"']+)["']/g,
    /require\(\s*["']([^"']+)["']\s*\)/g,
    /import\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      specifiers.add(match[1]);
    }
  }

  return [...specifiers];
}

function createAliasMatcher(entry) {
  const aliasPattern = entry.alias.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace("\\*", "(.+)");
  const regex = new RegExp(`^${aliasPattern}$`);

  return (specifier) => {
    const match = specifier.match(regex);
    if (!match) {
      return [];
    }

    const wildcard = match[1] ?? "";
    const resolvedBase = path.resolve(
      entry.resolvedBase,
      wildcard && !entry.target.includes("*") ? wildcard : "."
    );

    return [
      {
        alias: entry.alias,
        target: entry.target,
        resolvedBase,
      },
    ];
  };
}

async function findFirstExisting(root, names) {
  for (const name of names) {
    if (await exists(path.join(root, name))) {
      return name;
    }
  }
  return null;
}

async function readJsonIfPresent(filePath) {
  if (!(await exists(filePath))) {
    return null;
  }
  return JSON.parse(stripJsonComments(await fs.readFile(filePath, "utf8")));
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function stripJsonComments(text) {
  let result = "";
  let inString = false;
  let stringQuote = "";
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
        result += char;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (inString) {
      result += char;
      if (char === "\\") {
        result += next ?? "";
        index += 1;
        continue;
      }
      if (char === stringQuote) {
        inString = false;
        stringQuote = "";
      }
      continue;
    }

    if (char === "/" && next === "/") {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      inBlockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      stringQuote = char;
    }

    result += char;
  }

  return result;
}

function normalizeRepoRelative(inputPath) {
  const normalized = toPosix(path.normalize(inputPath));
  const absolute = path.resolve(REPO_ROOT, normalized);
  if (!isInside(absolute, REPO_ROOT)) {
    throw new Error(`App path escapes repo root: ${inputPath}`);
  }
  return toPosix(path.relative(REPO_ROOT, absolute));
}

function normalizeSlashes(value) {
  return value.split("/").join(path.sep);
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function repoRelative(absPath) {
  return toPosix(path.relative(REPO_ROOT, absPath));
}

function isInside(candidateAbs, rootAbs) {
  const relative = path.relative(rootAbs, candidateAbs);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function dedupeObjects(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.file
      ? `${item.file}|${item.specifier ?? ""}|${item.resolvedBase ?? item.resolved ?? ""}`
      : JSON.stringify(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}


function withoutUndefined(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
