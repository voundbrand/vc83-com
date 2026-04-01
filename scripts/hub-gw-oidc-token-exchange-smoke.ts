import { chromium } from "@playwright/test";
import * as dotenv from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

type CliOptions = {
  appUrl: string;
  providerId: string;
  convexBaseUrl: string;
  requestHost: string;
  redirectUri: string;
  scope: string;
  organizationId?: string;
  timeoutMs: number;
  headless: boolean;
  username?: string;
  password?: string;
};

type StartResponse = {
  success?: boolean;
  authorizationUrl?: string;
  state?: string;
  provider?: { id?: string; name?: string; issuer?: string };
  error?: string;
};

type CapturedCallback = {
  url: string;
  code: string | null;
  state: string | null;
  error: string | null;
  errorDescription: string | null;
  errorUri: string | null;
};

function parseCallbackFromUrl(
  rawUrl: string,
  expectedRedirectUri: string
): CapturedCallback | null {
  let parsed: URL;
  let expected: URL;
  try {
    parsed = new URL(rawUrl);
    expected = new URL(expectedRedirectUri);
  } catch {
    return null;
  }

  if (
    parsed.origin !== expected.origin ||
    parsed.pathname.replace(/\/+$/, "") !== expected.pathname.replace(/\/+$/, "")
  ) {
    return null;
  }

  return {
    url: rawUrl,
    code: normalizeOptionalString(parsed.searchParams.get("code")),
    state: normalizeOptionalString(parsed.searchParams.get("state")),
    error: normalizeOptionalString(parsed.searchParams.get("error")),
    errorDescription: normalizeOptionalString(parsed.searchParams.get("error_description")),
    errorUri: normalizeOptionalString(parsed.searchParams.get("error_uri")),
  };
}

function printHelp(): void {
  console.log(
    [
      "Hub-GW OIDC token-exchange smoke test",
      "",
      "Usage:",
      "  npx tsx scripts/hub-gw-oidc-token-exchange-smoke.ts [options]",
      "",
      "Options:",
      "  --app-url <url>            Public Hub-GW URL (default: env or http://localhost:3003)",
      "  --provider-id <id>         OIDC provider slug in callback path (default: gruendungswerft)",
      "  --convex-base-url <url>    Convex base URL (default: env NEXT_PUBLIC_API_ENDPOINT_URL/NEXT_PUBLIC_CONVEX_URL)",
      "  --request-host <host>      Host used for org scope resolution (default: host from --app-url)",
      "  --redirect-uri <url>       Redirect URI registered at provider",
      "  --scope <scope>            OIDC scope for start request (default: openid)",
      "  --organization-id <id>     Optional explicit org id for start request",
      "  --timeout-ms <ms>          Max wait for callback capture (default: 180000)",
      "  --headless                 Run browser headless (default: false)",
      "  --username <value>         Optional login username/email for auto-login",
      "  --password <value>         Optional login password for auto-login",
      "  --help                     Show this help",
      "",
      "Environment fallbacks:",
      "  HUB_GW_APP_URL, NEXTAUTH_URL, NEXT_PUBLIC_APP_URL",
      "  CONVEX_BASE_URL, NEXT_PUBLIC_API_ENDPOINT_URL, NEXT_PUBLIC_CONVEX_URL",
      "  HUB_GW_OIDC_TEST_USER, HUB_GW_OIDC_TEST_PASSWORD",
    ].join("\n")
  );
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function redact(value: string | null, keep = 8): string {
  if (!value) {
    return "null";
  }
  if (value.length <= keep) {
    return `${"*".repeat(value.length)}(${value.length})`;
  }
  return `${value.slice(0, keep)}...(${value.length})`;
}

function normalizeConvexBaseUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl);
  if (parsed.hostname.endsWith(".convex.cloud")) {
    parsed.hostname = parsed.hostname.replace(/\.convex\.cloud$/, ".convex.site");
  }
  return stripTrailingSlash(parsed.toString());
}

function parsePositiveInteger(raw: string | null, fallback: number): number {
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function loadEnvFiles(): void {
  const candidatePaths = [
    resolve(process.cwd(), "apps/hub-gw/.env.local"),
    resolve(process.cwd(), ".env.local"),
  ];
  for (const envPath of candidatePaths) {
    if (existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false });
    }
  }
}

function parseCliArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }
    if (token === "--help" || token === "--headless") {
      args[token.slice(2)] = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${token}`);
    }
    args[token.slice(2)] = value;
    index += 1;
  }
  return args;
}

function resolveOptions(rawArgs: Record<string, string | boolean>): CliOptions {
  const providerId =
    normalizeOptionalString(rawArgs["provider-id"]) ||
    normalizeOptionalString(process.env.HUB_GW_OIDC_PROVIDER_ID) ||
    "gruendungswerft";

  const appUrlRaw =
    normalizeOptionalString(rawArgs["app-url"]) ||
    normalizeOptionalString(process.env.HUB_GW_APP_URL) ||
    normalizeOptionalString(process.env.NEXTAUTH_URL) ||
    normalizeOptionalString(process.env.NEXT_PUBLIC_APP_URL) ||
    "http://localhost:3003";
  const appUrl = stripTrailingSlash(new URL(appUrlRaw).toString());

  const convexBaseUrlRaw =
    normalizeOptionalString(rawArgs["convex-base-url"]) ||
    normalizeOptionalString(process.env.CONVEX_BASE_URL) ||
    normalizeOptionalString(process.env.NEXT_PUBLIC_API_ENDPOINT_URL) ||
    normalizeOptionalString(process.env.NEXT_PUBLIC_CONVEX_URL);

  if (!convexBaseUrlRaw) {
    throw new Error(
      "Missing Convex base URL. Set --convex-base-url or env NEXT_PUBLIC_API_ENDPOINT_URL/NEXT_PUBLIC_CONVEX_URL."
    );
  }

  const convexBaseUrl = normalizeConvexBaseUrl(convexBaseUrlRaw);
  const parsedAppUrl = new URL(appUrl);
  const requestHost =
    normalizeOptionalString(rawArgs["request-host"]) || parsedAppUrl.hostname;
  const redirectUri =
    normalizeOptionalString(rawArgs["redirect-uri"]) ||
    `${appUrl}/api/auth/callback/${providerId}`;
  const scope = normalizeOptionalString(rawArgs.scope) || "openid";
  const organizationId = normalizeOptionalString(rawArgs["organization-id"]) || undefined;
  const timeoutMs = parsePositiveInteger(
    normalizeOptionalString(rawArgs["timeout-ms"]),
    180_000
  );
  const headless = rawArgs.headless === true;
  const username =
    normalizeOptionalString(rawArgs.username) ||
    normalizeOptionalString(process.env.HUB_GW_OIDC_TEST_USER) ||
    undefined;
  const password =
    normalizeOptionalString(rawArgs.password) ||
    normalizeOptionalString(process.env.HUB_GW_OIDC_TEST_PASSWORD) ||
    undefined;

  return {
    appUrl,
    providerId,
    convexBaseUrl,
    requestHost,
    redirectUri,
    scope,
    organizationId,
    timeoutMs,
    headless,
    username,
    password,
  };
}

async function fillFirstVisible(
  page: import("@playwright/test").Page,
  selectors: string[],
  value: string
): Promise<boolean> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    const count = await locator.count();
    if (count < 1) {
      continue;
    }
    if (!(await locator.isVisible().catch(() => false))) {
      continue;
    }
    await locator.fill(value);
    return true;
  }
  return false;
}

async function clickFirstVisible(
  page: import("@playwright/test").Page,
  selectors: string[]
): Promise<boolean> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    const count = await locator.count();
    if (count < 1) {
      continue;
    }
    if (!(await locator.isVisible().catch(() => false))) {
      continue;
    }
    await locator.click();
    return true;
  }
  return false;
}

async function maybeAutoLogin(
  page: import("@playwright/test").Page,
  options: CliOptions
): Promise<void> {
  if (!options.username || !options.password) {
    return;
  }

  // Give provider page a short settle window before trying selectors.
  await page.waitForTimeout(800);

  const emailFilled = await fillFirstVisible(
    page,
    [
      'input[type="email"]',
      'input[name="email"]',
      'input[name="username"]',
      'input[id="email"]',
      'input[id="username"]',
      'input[autocomplete="username"]',
    ],
    options.username
  );

  const passwordFilled = await fillFirstVisible(
    page,
    [
      'input[type="password"]',
      'input[name="password"]',
      'input[id="password"]',
      'input[autocomplete="current-password"]',
    ],
    options.password
  );

  if (!emailFilled || !passwordFilled) {
    console.log(
      "[oidc-smoke] auto-login enabled but required input fields were not found; waiting for manual login"
    );
    return;
  }

  const clicked = await clickFirstVisible(page, [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:has-text("Anmelden")',
    'button:has-text("Login")',
    'button:has-text("Sign in")',
    'button:has-text("Log in")',
  ]);

  if (!clicked) {
    // If no obvious submit button is available, press Enter on password field.
    await page.keyboard.press("Enter");
  }

  console.log("[oidc-smoke] auto-login submitted");
  await page.waitForTimeout(1200);
  const errorLocator = page.locator(".error").first();
  if ((await errorLocator.count()) > 0 && (await errorLocator.isVisible().catch(() => false))) {
    const errorText = normalizeOptionalString(await errorLocator.textContent());
    if (errorText) {
      console.log(`[oidc-smoke] provider login error: ${errorText}`);
    }
  }
}

function buildStartUrl(options: CliOptions): string {
  const startUrl = new URL(`${options.convexBaseUrl}/api/v1/frontend-oidc/start`);
  startUrl.searchParams.set("responseMode", "json");
  startUrl.searchParams.set("requestHost", options.requestHost);
  startUrl.searchParams.set("redirectUri", options.redirectUri);
  startUrl.searchParams.set("scope", options.scope);
  if (options.organizationId) {
    startUrl.searchParams.set("organizationId", options.organizationId);
  }
  return startUrl.toString();
}

async function run(): Promise<number> {
  loadEnvFiles();
  const rawArgs = parseCliArgs(process.argv.slice(2));
  if (rawArgs.help === true) {
    printHelp();
    return 0;
  }

  const options = resolveOptions(rawArgs);
  const startEndpoint = buildStartUrl(options);
  const callbackEndpoint = `${options.convexBaseUrl}/api/v1/frontend-oidc/callback`;

  console.log("[oidc-smoke] configuration");
  console.log(`  appUrl: ${options.appUrl}`);
  console.log(`  providerId: ${options.providerId}`);
  console.log(`  convexBaseUrl: ${options.convexBaseUrl}`);
  console.log(`  requestHost: ${options.requestHost}`);
  console.log(`  redirectUri: ${options.redirectUri}`);
  console.log(`  scope: ${options.scope}`);
  console.log(`  timeoutMs: ${options.timeoutMs}`);
  console.log(`  headless: ${options.headless}`);
  console.log(`  autoLogin: ${Boolean(options.username && options.password)}`);

  console.log("[oidc-smoke] starting frontend OIDC transaction");
  const startResponse = await fetch(startEndpoint, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const startText = await startResponse.text();
  let startPayload: StartResponse | null = null;
  try {
    startPayload = JSON.parse(startText) as StartResponse;
  } catch {
    startPayload = null;
  }

  if (!startResponse.ok || !startPayload?.success || !startPayload.authorizationUrl) {
    console.error("[oidc-smoke] start request failed");
    console.error(`  status: ${startResponse.status}`);
    console.error(`  body: ${startText}`);
    return 2;
  }

  console.log("[oidc-smoke] start success");
  console.log(`  provider: ${startPayload.provider?.id || "unknown"}`);
  console.log(`  state (start): ${redact(startPayload.state || null, 14)}`);

  const redirect = new URL(options.redirectUri);
  const callbackRequestRegex = new RegExp(
    `^${escapeRegex(`${redirect.origin}${redirect.pathname}`)}(?:\\?|$)`
  );

  const browser = await chromium.launch({ headless: options.headless });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  let captureResolved = false;

  let resolveCapture: (value: CapturedCallback) => void = () => {};
  let rejectCapture: (error: Error) => void = () => {};
  const capturePromise = new Promise<CapturedCallback>((resolve, reject) => {
    resolveCapture = resolve;
    rejectCapture = reject;
  });

  const timeoutHandle = setTimeout(() => {
    if (captureResolved) {
      return;
    }
    const pageUrl = page.url();
    rejectCapture(
      new Error(
        `Timed out waiting for callback capture after ${options.timeoutMs}ms. Current page URL: ${pageUrl}`
      )
    );
  }, options.timeoutMs);

  await context.route(callbackRequestRegex, async (route) => {
    const requestUrl = route.request().url();
    const captured = parseCallbackFromUrl(requestUrl, options.redirectUri);
    if (!captured) {
      await route.continue();
      return;
    }

    captureResolved = true;
    clearTimeout(timeoutHandle);
    resolveCapture(captured);
    await route.abort("blockedbyclient");
  });

  page.on("framenavigated", (frame) => {
    if (captureResolved || frame !== page.mainFrame()) {
      return;
    }
    const captured = parseCallbackFromUrl(frame.url(), options.redirectUri);
    if (!captured) {
      return;
    }
    captureResolved = true;
    clearTimeout(timeoutHandle);
    resolveCapture(captured);
  });

  console.log("[oidc-smoke] opening provider authorization URL in browser");
  console.log("  Complete login in the opened browser window.");
  await page.goto(startPayload.authorizationUrl, {
    waitUntil: "domcontentloaded",
    timeout: options.timeoutMs,
  });
  console.log(`[oidc-smoke] browser current URL after initial navigation: ${page.url()}`);
  await maybeAutoLogin(page, options);
  await page.waitForTimeout(1000);
  console.log(`[oidc-smoke] browser current URL after auto-login attempt: ${page.url()}`);
  if (!captureResolved) {
    const currentUrlCapture = parseCallbackFromUrl(page.url(), options.redirectUri);
    if (currentUrlCapture) {
      captureResolved = true;
      clearTimeout(timeoutHandle);
      resolveCapture(currentUrlCapture);
    }
  }

  let capturedCallback: CapturedCallback;
  try {
    capturedCallback = await capturePromise;
  } catch (error) {
    await browser.close();
    console.error(
      `[oidc-smoke] callback capture failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return 3;
  }

  await browser.close();

  console.log("[oidc-smoke] captured callback request");
  console.log(`  hasCode: ${Boolean(capturedCallback.code)}`);
  console.log(`  hasState: ${Boolean(capturedCallback.state)}`);
  console.log(`  code: ${redact(capturedCallback.code)}`);
  console.log(`  state: ${redact(capturedCallback.state, 14)}`);
  console.log(`  error: ${capturedCallback.error || "null"}`);

  if (!capturedCallback.state) {
    console.error("[oidc-smoke] captured callback is missing state");
    console.error(`  callbackUrl: ${capturedCallback.url}`);
    return 4;
  }

  const callbackBody: Record<string, string> = {
    state: capturedCallback.state,
  };
  if (capturedCallback.code) {
    callbackBody.code = capturedCallback.code;
  }
  if (capturedCallback.error) {
    callbackBody.error = capturedCallback.error;
  }
  if (capturedCallback.errorDescription) {
    callbackBody.errorDescription = capturedCallback.errorDescription;
  }
  if (capturedCallback.errorUri) {
    callbackBody.errorUri = capturedCallback.errorUri;
  }

  console.log("[oidc-smoke] exchanging callback through Convex bridge");
  const callbackResponse = await fetch(callbackEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(callbackBody),
    cache: "no-store",
  });

  const callbackText = await callbackResponse.text();
  let callbackPayload: Record<string, unknown> | null = null;
  try {
    callbackPayload = JSON.parse(callbackText) as Record<string, unknown>;
  } catch {
    callbackPayload = null;
  }

  console.log("[oidc-smoke] callback response");
  console.log(`  status: ${callbackResponse.status}`);
  if (callbackPayload) {
    console.log(`  body: ${JSON.stringify(callbackPayload, null, 2)}`);
  } else {
    console.log(`  body: ${callbackText}`);
  }

  const success = callbackPayload?.success === true;
  if (success) {
    console.log("[oidc-smoke] PASS: token exchange succeeded");
    return 0;
  }

  console.log("[oidc-smoke] FAIL: callback/token exchange did not succeed");
  return 5;
}

run()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(
      `[oidc-smoke] fatal error: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 1;
  });
