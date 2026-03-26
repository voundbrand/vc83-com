import { type ParsedArgs } from "../../core/args";
import { runAppEnvUpdateCommand } from "./shared";

interface InitOptions {
  legacySource?: string;
}

export async function handleAppInit(parsed: ParsedArgs, options: InitOptions = {}): Promise<number> {
  return runAppEnvUpdateCommand({
    parsed,
    commandName: "app init",
    legacySource: options.legacySource
  });
}
