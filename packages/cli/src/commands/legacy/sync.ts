import { type ParsedArgs } from "../../core/args";
import { handleAppSync } from "../app/sync";

export async function handleLegacySync(parsed: ParsedArgs): Promise<number> {
  return handleAppSync(parsed, { legacySource: "sync" });
}
