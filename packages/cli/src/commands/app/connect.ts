import { type ParsedArgs } from "../../core/args";
import { runAppEnvUpdateCommand } from "./shared";

interface ConnectOptions {
  legacySource?: string;
}

export async function handleAppConnect(
  parsed: ParsedArgs,
  options: ConnectOptions = {}
): Promise<number> {
  return runAppEnvUpdateCommand({
    parsed,
    commandName: "app connect",
    legacySource: options.legacySource
  });
}
