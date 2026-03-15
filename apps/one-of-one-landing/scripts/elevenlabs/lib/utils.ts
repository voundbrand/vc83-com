import { relative } from "node:path";
import { REPO_ROOT } from "./catalog";

export function stableSerialize(value: unknown): string {
  return JSON.stringify(sortKeysRecursively(value));
}

export function relativeToRepo(filePath: string): string {
  return relative(REPO_ROOT, filePath);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function sortKeysRecursively(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortKeysRecursively(item));
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = sortKeysRecursively((value as Record<string, unknown>)[key]);
        return accumulator;
      }, {});
  }

  return value;
}
