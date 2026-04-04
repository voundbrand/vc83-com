import fs from "node:fs"
import path from "node:path"

import { config as loadEnv } from "dotenv"

function uniquePaths(paths: string[]): string[] {
  const seen = new Set<string>()
  const unique: string[] = []

  for (const candidate of paths) {
    const resolved = path.resolve(process.cwd(), candidate)
    if (seen.has(resolved)) {
      continue
    }
    seen.add(resolved)
    unique.push(resolved)
  }

  return unique
}

export function loadWorkspaceEnvCascade(primaryEnvPath: string): {
  resolvedEnvPath: string
  loadedEnvPaths: string[]
} {
  const resolvedEnvPath = path.resolve(process.cwd(), primaryEnvPath)
  const candidatePaths = uniquePaths([
    resolvedEnvPath,
    path.join(path.dirname(resolvedEnvPath), ".env"),
    ".env.local",
    ".env",
  ])

  const loadedEnvPaths: string[] = []

  for (const candidatePath of candidatePaths) {
    if (!fs.existsSync(candidatePath)) {
      continue
    }

    loadEnv({ path: candidatePath, override: false, quiet: true })
    loadedEnvPaths.push(candidatePath)
  }

  return {
    resolvedEnvPath,
    loadedEnvPaths,
  }
}
