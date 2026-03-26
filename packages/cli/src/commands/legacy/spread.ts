import { type ParsedArgs } from "../../core/args";
import { handleAppInit } from "../app/init";

export async function handleLegacySpread(parsed: ParsedArgs): Promise<number> {
  return handleAppInit(parsed, { legacySource: "spread" });
}
