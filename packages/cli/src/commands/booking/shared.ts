import fs from "node:fs/promises";
import path from "node:path";
import {
  type ParsedArgs,
  getOptionString
} from "../../core/args";
import { normalizeEnvValue, parseEnvText } from "../../config/env-parser";
import { resolveRemoteCommand } from "../app/remote";

export interface BookingCommandContext {
  profile: string;
  organizationId: string;
  applicationId: string;
  backendUrl: string;
  json: boolean;
  api: Awaited<ReturnType<typeof resolveRemoteCommand>>["api"];
}

export interface BookingIdentifiers {
  eventId?: string;
  productId?: string;
  source: string;
}

async function readEnvFileValues(envFilePath: string): Promise<Record<string, string>> {
  try {
    const content = await fs.readFile(envFilePath, "utf8");
    const parsed = parseEnvText(content);
    const values: Record<string, string> = {};
    for (const line of parsed.lines) {
      if (line.kind === "entry") {
        values[line.key] = normalizeEnvValue(line.value);
      }
    }
    return values;
  } catch (error) {
    const ioError = error as NodeJS.ErrnoException;
    if (ioError.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

export async function resolveBookingIdentifiers(
  parsed: ParsedArgs,
  envFilePath: string
): Promise<BookingIdentifiers> {
  const envValues = await readEnvFileValues(envFilePath);
  return {
    eventId:
      getOptionString(parsed, "event-id") ??
      envValues.L4YERCAK3_BOOKING_EVENT_ID ??
      envValues.BOOKING_EVENT_ID,
    productId:
      getOptionString(parsed, "product-id") ??
      envValues.L4YERCAK3_BOOKING_PRODUCT_ID ??
      envValues.BOOKING_PRODUCT_ID,
    source: getOptionString(parsed, "booking-source") ?? envValues.L4YERCAK3_BOOKING_SOURCE ?? "web"
  };
}

export async function resolveBookingCommandContext(
  parsed: ParsedArgs,
  options: { mutating: boolean }
): Promise<BookingCommandContext> {
  const command = await resolveRemoteCommand(parsed, {
    requireOrgApp: true,
    mutatingCommand: options.mutating
  });
  return {
    profile: command.target.profileName,
    organizationId: command.target.orgId ?? "",
    applicationId: command.target.appId ?? "",
    backendUrl: command.target.backendUrl,
    json: command.json,
    api: command.api
  };
}

export function resolveEnvFilePath(parsed: ParsedArgs): string {
  const envFileArg = getOptionString(parsed, "env-file") ?? ".env.local";
  return path.resolve(process.cwd(), envFileArg);
}

export async function runBookingReachabilityChecks(
  api: BookingCommandContext["api"]
): Promise<{ issues: string[] }> {
  const issues: string[] = [];

  try {
    await api.listEvents(1);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    issues.push(`events endpoint unreachable: ${message}`);
  }

  try {
    await api.listProducts(1);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    issues.push(`products endpoint unreachable: ${message}`);
  }

  return { issues };
}

export async function runBookingEntityChecks(args: {
  api: BookingCommandContext["api"];
  eventId?: string;
  productId?: string;
}): Promise<{ issues: string[] }> {
  const issues: string[] = [];

  if (!args.eventId) {
    issues.push("event-id is not resolved");
  } else {
    try {
      await args.api.getEvent(args.eventId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      issues.push(`event lookup failed (${args.eventId}): ${message}`);
    }
  }

  if (!args.productId) {
    issues.push("product-id is not resolved");
  } else {
    try {
      await args.api.getProduct(args.productId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      issues.push(`product lookup failed (${args.productId}): ${message}`);
    }
  }

  return { issues };
}
