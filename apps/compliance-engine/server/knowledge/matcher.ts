import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { ProviderKnowledge } from "./types.js";

/**
 * Load all provider knowledge records from the knowledge directory.
 */
export function loadProviderKnowledge(
  knowledgeDir: string,
): ProviderKnowledge[] {
  const providersDir = join(knowledgeDir, "providers");

  if (!existsSync(providersDir)) {
    return [];
  }

  const records: ProviderKnowledge[] = [];

  for (const file of readdirSync(providersDir)) {
    if (!file.endsWith(".yaml") && !file.endsWith(".yml")) continue;

    const filePath = resolve(providersDir, file);
    const raw = readFileSync(filePath, "utf-8");
    const parsed = parseYaml(raw) as ProviderKnowledge;

    if (parsed?.id && parsed?.name) {
      records.push({
        ...parsed,
        known_certifications: parsed.known_certifications ?? [],
      });
    }
  }

  return records;
}

/**
 * Match a provider name/query against the knowledge base.
 *
 * Supports exact ID match, exact name match, and fuzzy partial match.
 */
export function matchProvider(
  knowledge: ProviderKnowledge[],
  query: string,
): ProviderKnowledge | null {
  const normalized = query.toLowerCase().trim();

  // Exact ID match
  const byId = knowledge.find((k) => k.id === normalized);
  if (byId) return byId;

  // Exact name match (case-insensitive)
  const byName = knowledge.find(
    (k) => k.name.toLowerCase() === normalized,
  );
  if (byName) return byName;

  // Partial match: query appears in ID or name
  const partial = knowledge.find(
    (k) =>
      k.id.includes(normalized) ||
      k.name.toLowerCase().includes(normalized),
  );
  if (partial) return partial;

  return null;
}

/**
 * Get all known providers, optionally filtered by type.
 */
export function listKnownProviders(
  knowledge: ProviderKnowledge[],
  providerType?: string,
): ProviderKnowledge[] {
  if (!providerType) return knowledge;
  return knowledge.filter((k) => k.provider_type === providerType);
}
