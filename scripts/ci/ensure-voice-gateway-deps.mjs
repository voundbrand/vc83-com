#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const requireFromScript = createRequire(import.meta.url);
const repoRoot = process.cwd();
const gatewayRoot = path.resolve(repoRoot, "apps/voice-ws-gateway");
const gatewayPackageJsonPath = path.join(gatewayRoot, "package.json");
const requiredPackages = ["fastify", "@fastify/websocket"];

function isPackageResolvable(packageName) {
  try {
    requireFromScript.resolve(`${packageName}/package.json`, {
      paths: [gatewayRoot],
    });
    return true;
  } catch {
    return false;
  }
}

function findMissingPackages() {
  return requiredPackages.filter((packageName) => !isPackageResolvable(packageName));
}

if (!fs.existsSync(gatewayPackageJsonPath)) {
  console.error("VOICE_GATEWAY_DEPS|status=FAIL|reason=missing_gateway_package_json");
  process.exit(1);
}

const missingPackages = findMissingPackages();
if (missingPackages.length === 0) {
  console.log("VOICE_GATEWAY_DEPS|status=PASS|mode=already_installed");
  process.exit(0);
}

console.log(`VOICE_GATEWAY_DEPS|status=INSTALL|missing=${missingPackages.join(",")}`);
const install = spawnSync(
  "npm",
  ["--prefix", "apps/voice-ws-gateway", "ci", "--no-audit", "--no-fund"],
  {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  },
);

if (install.status !== 0) {
  console.error(`VOICE_GATEWAY_DEPS|status=FAIL|reason=npm_ci_failed|exit=${install.status ?? "unknown"}`);
  process.exit(install.status ?? 1);
}

const missingPackagesAfterInstall = findMissingPackages();
if (missingPackagesAfterInstall.length > 0) {
  console.error(`VOICE_GATEWAY_DEPS|status=FAIL|reason=packages_still_missing|missing=${missingPackagesAfterInstall.join(",")}`);
  process.exit(1);
}

console.log("VOICE_GATEWAY_DEPS|status=PASS|mode=installed_via_npm_ci");
