import { type ParsedArgs } from "../../core/args";
import { handleAppConnect } from "../app/connect";

export async function handleLegacyConnect(parsed: ParsedArgs): Promise<number> {
  return handleAppConnect(parsed, { legacySource: "connect" });
}
