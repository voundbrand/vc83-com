import {
  type ParsedArgs,
  getOptionBoolean,
  getOptionString
} from "../../core/args";
import { resolveTargetContext } from "../../safety/target-guard";

export interface AgentCommandContext {
  profile: string;
  organizationId: string;
  applicationId: string;
  backendUrl: string;
  json: boolean;
}

export async function resolveAgentCommandContext(
  parsed: ParsedArgs,
  options: { mutating: boolean }
): Promise<AgentCommandContext> {
  const target = await resolveTargetContext(parsed, {
    requireOrgApp: true,
    mutatingCommand: options.mutating
  });

  return {
    profile: target.profileName,
    organizationId: target.orgId ?? "",
    applicationId: target.appId ?? "",
    backendUrl: target.backendUrl,
    json: getOptionBoolean(parsed, "json")
  };
}

export function resolveSessionId(parsed: ParsedArgs): string | undefined {
  const fromFlag = getOptionString(parsed, "session-id");
  if (fromFlag && fromFlag.trim().length > 0) {
    return fromFlag.trim();
  }
  const fromEnv = process.env.SEVENLAYERS_SESSION_ID ?? process.env.L4YERCAK3_SESSION_ID;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }
  return undefined;
}
