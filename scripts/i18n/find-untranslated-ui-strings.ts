#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as ts from "typescript";

import {
  I18N_AUDIT_ALLOWLIST,
  type I18nAuditAllowlistEntry,
  type I18nAuditCallName,
  type I18nAuditFindingKind,
  type I18nAuditScope,
} from "./i18n-audit-allowlist";

export interface CliOptions {
  scopes: I18nAuditScope[];
  reportPath?: string;
  baselinePath?: string;
  failOnNew: boolean;
}

export interface AuditFinding {
  scope: I18nAuditScope;
  file: string;
  line: number;
  column: number;
  kind: I18nAuditFindingKind;
  text: string;
  attributeName?: string;
  callName?: I18nAuditCallName;
}

export interface AllowlistedAuditFinding extends AuditFinding {
  allowlistReason: string;
}

export interface AuditReport {
  version: 1;
  scopes: I18nAuditScope[];
  filesScanned: number;
  summary: {
    netFindings: number;
    allowlisted: number;
    byScope: Record<I18nAuditScope, number>;
  };
  findings: AuditFinding[];
  allowlistedFindings: AllowlistedAuditFinding[];
}

interface LiteralCandidate {
  node: ts.Node;
  text: string;
}

export interface AuditRunResult {
  report: AuditReport;
  newFindings: AuditFinding[];
}

const ALL_SCOPES: readonly I18nAuditScope[] = [
  "builder",
  "layers",
  "window-content",
];

const SCOPE_ROOTS: Record<I18nAuditScope, readonly string[]> = {
  builder: ["src/app/builder", "src/components/builder"],
  layers: ["src/app/layers", "src/components/layers"],
  "window-content": ["src/components/window-content"],
};

const SUPPORTED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

const USER_FACING_ATTRIBUTES = new Set([
  "aria-label",
  "aria-description",
  "aria-placeholder",
  "aria-roledescription",
  "alt",
  "caption",
  "description",
  "emptymessage",
  "emptytext",
  "helpertext",
  "label",
  "message",
  "placeholder",
  "title",
]);

const USER_FACING_ATTRIBUTE_SUFFIX =
  /(label|title|placeholder|caption|description|message|text)$/i;

const ALERT_LIKE_CALLS = new Set<I18nAuditCallName>([
  "alert",
  "confirm",
  "prompt",
]);

const TRANSLATION_CALL_NAMES = new Set([
  "t",
  "translate",
  "formatMessage",
  "format_message",
]);

const LETTER_PATTERN = /[A-Za-z]/;
const TRANSLATION_KEY_PATTERN = /^[a-z0-9_.-]+$/;
const CSS_VAR_PATTERN = /^var\(--[a-z0-9-]+\)$/i;

function main(): void {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    const runResult = runAudit(options);

    if (options.reportPath) {
      writeReport(options.reportPath, runResult.report, process.cwd());
    }

    logSummary(runResult.report, options.reportPath);

    if (!options.baselinePath) {
      return;
    }

    console.log(
      `[i18n-audit] baseline=${toPosixPath(options.baselinePath)} newFindings=${runResult.newFindings.length}`,
    );

    if (runResult.newFindings.length > 0) {
      console.log("[i18n-audit] New untranslated findings:");
      for (const finding of runResult.newFindings) {
        console.log(`- ${formatFinding(finding)}`);
      }
    }

    if (options.failOnNew && runResult.newFindings.length > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[i18n-audit] ${message}`);
    process.exitCode = 1;
  }
}

export function runAudit(
  options: CliOptions,
  cwd: string = process.cwd(),
): AuditRunResult {
  validateAllowlistContract();
  const scoped = collectScopedFindings(options.scopes, cwd);

  const report: AuditReport = {
    version: 1,
    scopes: [...options.scopes],
    filesScanned: scoped.filesScanned,
    summary: {
      netFindings: scoped.findings.length,
      allowlisted: scoped.allowlistedFindings.length,
      byScope: countByScope(scoped.findings),
    },
    findings: scoped.findings,
    allowlistedFindings: scoped.allowlistedFindings,
  };

  if (!options.baselinePath) {
    return {
      report,
      newFindings: [],
    };
  }

  const baselineFindings = readBaselineFindings(options.baselinePath, cwd);
  const baselineExactSet = new Set(baselineFindings.map(getFindingFingerprint));
  const baselineStableSet = new Set(
    baselineFindings.map(getStableBaselineFingerprint),
  );
  const newFindings = report.findings.filter(
    (finding) =>
      !baselineExactSet.has(getFindingFingerprint(finding)) &&
      !baselineStableSet.has(getStableBaselineFingerprint(finding)),
  );

  return {
    report,
    newFindings,
  };
}

function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    scopes: [...ALL_SCOPES],
    failOnNew: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") {
      printUsage();
      process.exit(0);
    }

    if (arg === "--scopes") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --scopes");
      }

      options.scopes = parseScopes(value);
      index += 1;
      continue;
    }

    if (arg === "--report") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --report");
      }

      options.reportPath = value;
      index += 1;
      continue;
    }

    if (arg === "--baseline") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --baseline");
      }

      options.baselinePath = value;
      index += 1;
      continue;
    }

    if (arg === "--fail-on-new") {
      options.failOnNew = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (options.failOnNew && !options.baselinePath) {
    throw new Error("--fail-on-new requires --baseline");
  }

  return options;
}

function printUsage(): void {
  console.log("Usage:");
  console.log(
    "  npx tsx scripts/i18n/find-untranslated-ui-strings.ts [--scopes builder,layers,window-content] [--report path] [--baseline path --fail-on-new]",
  );
}

function validateAllowlistContract(): void {
  const seen = new Set<string>();
  const violations: string[] = [];

  for (const [index, entry] of I18N_AUDIT_ALLOWLIST.entries()) {
    const entryLabel = `entry ${index + 1}`;
    const text = entry.text.trim();
    const reason = entry.reason.trim();
    const pattern = entry.filePattern.source;

    if (text.length === 0) {
      violations.push(`${entryLabel}: text must be non-empty.`);
    }

    if (reason.length < 12) {
      violations.push(
        `${entryLabel}: reason must be explicit (minimum 12 characters).`,
      );
    }

    if (!pattern.startsWith("^") || !pattern.endsWith("$")) {
      violations.push(
        `${entryLabel}: filePattern must be anchored with ^ and $ for explicit scope control.`,
      );
    }

    if (entry.kind === "jsx_attribute" && !entry.attributeName) {
      violations.push(
        `${entryLabel}: jsx_attribute exceptions must declare attributeName.`,
      );
    }

    if (entry.callName && entry.kind !== "call_argument") {
      violations.push(
        `${entryLabel}: callName can only be used when kind is call_argument.`,
      );
    }

    const signature = [
      entry.scope,
      pattern,
      entry.kind ?? "",
      entry.attributeName ?? "",
      entry.callName ?? "",
      entry.text,
    ].join("|");

    if (seen.has(signature)) {
      violations.push(
        `${entryLabel}: duplicate exception signature (${signature}).`,
      );
    } else {
      seen.add(signature);
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `Allowlist contract violations detected:\n- ${violations.join("\n- ")}`,
    );
  }
}

function parseScopes(scopesArg: string): I18nAuditScope[] {
  const parsed = scopesArg
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (parsed.length === 0) {
    throw new Error("At least one scope is required.");
  }

  const unique = new Set<I18nAuditScope>();
  for (const scope of parsed) {
    if (!isAuditScope(scope)) {
      throw new Error(
        `Unsupported scope "${scope}". Supported scopes: ${ALL_SCOPES.join(", ")}`,
      );
    }
    unique.add(scope);
  }

  return [...ALL_SCOPES].filter((scope) => unique.has(scope));
}

function isAuditScope(value: string): value is I18nAuditScope {
  return (ALL_SCOPES as readonly string[]).includes(value);
}

function collectScopedFindings(scopes: I18nAuditScope[], cwd: string): {
  filesScanned: number;
  findings: AuditFinding[];
  allowlistedFindings: AllowlistedAuditFinding[];
} {
  const filesByScope = new Map<I18nAuditScope, string[]>();
  for (const scope of scopes) {
    filesByScope.set(scope, collectScopeFiles(scope, cwd));
  }

  const dedupe = new Map<string, AuditFinding>();
  let filesScanned = 0;

  for (const scope of scopes) {
    const files = filesByScope.get(scope) ?? [];
    for (const file of files) {
      filesScanned += 1;
      const fileFindings = scanFile(scope, file, cwd);
      for (const finding of fileFindings) {
        dedupe.set(getFindingFingerprint(finding), finding);
      }
    }
  }

  const findings = [...dedupe.values()].sort(compareFindings);
  return {
    filesScanned,
    ...applyAllowlist(findings),
  };
}

function applyAllowlist(findings: AuditFinding[]): {
  findings: AuditFinding[];
  allowlistedFindings: AllowlistedAuditFinding[];
} {
  const included: AuditFinding[] = [];
  const allowlisted: AllowlistedAuditFinding[] = [];

  for (const finding of findings) {
    const match = findAllowlistMatch(finding);
    if (match) {
      allowlisted.push({
        ...finding,
        allowlistReason: match.reason,
      });
      continue;
    }
    included.push(finding);
  }

  return {
    findings: included.sort(compareFindings),
    allowlistedFindings: allowlisted.sort(compareAllowlistedFindings),
  };
}

function findAllowlistMatch(
  finding: AuditFinding,
): I18nAuditAllowlistEntry | undefined {
  for (const entry of I18N_AUDIT_ALLOWLIST) {
    if (entry.scope !== finding.scope) {
      continue;
    }

    entry.filePattern.lastIndex = 0;
    if (!entry.filePattern.test(finding.file)) {
      continue;
    }

    if (entry.text !== finding.text) {
      continue;
    }

    if (entry.kind && entry.kind !== finding.kind) {
      continue;
    }

    if (entry.attributeName && entry.attributeName !== finding.attributeName) {
      continue;
    }

    if (entry.callName && entry.callName !== finding.callName) {
      continue;
    }

    return entry;
  }

  return undefined;
}

function collectScopeFiles(scope: I18nAuditScope, cwd: string): string[] {
  const files = new Set<string>();
  for (const root of SCOPE_ROOTS[scope]) {
    for (const file of walkFiles(root, cwd)) {
      files.add(file);
    }
  }
  return [...files].sort();
}

function walkFiles(relativeRoot: string, cwd: string): string[] {
  const absoluteRoot = path.resolve(cwd, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) {
    return [];
  }

  const collected: string[] = [];
  walkDirectoryRecursive(absoluteRoot, collected);
  return collected
    .map((absolutePath) =>
      toPosixPath(path.relative(cwd, absolutePath)),
    )
    .filter((relativePath) =>
      SUPPORTED_EXTENSIONS.has(path.extname(relativePath).toLowerCase()),
    )
    .sort();
}

function walkDirectoryRecursive(absoluteDir: string, collected: string[]): void {
  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const absoluteEntryPath = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      walkDirectoryRecursive(absoluteEntryPath, collected);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    collected.push(absoluteEntryPath);
  }
}

function scanFile(scope: I18nAuditScope, file: string, cwd: string): AuditFinding[] {
  const absoluteFilePath = path.resolve(cwd, file);
  const sourceText = fs.readFileSync(absoluteFilePath, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    toScriptKind(file),
  );

  const findings: AuditFinding[] = [];
  const dedupe = new Set<string>();

  function addFinding(
    kind: I18nAuditFindingKind,
    node: ts.Node,
    rawText: string,
    extra?: { attributeName?: string; callName?: I18nAuditCallName },
  ): void {
    const text = normalizeText(rawText);
    if (!shouldIncludeText(text)) {
      return;
    }

    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    const finding: AuditFinding = {
      scope,
      file,
      line: position.line + 1,
      column: position.character + 1,
      kind,
      text,
      attributeName: extra?.attributeName,
      callName: extra?.callName,
    };

    const fingerprint = getFindingFingerprint(finding);
    if (dedupe.has(fingerprint)) {
      return;
    }

    dedupe.add(fingerprint);
    findings.push(finding);
  }

  function visit(node: ts.Node): void {
    if (ts.isJsxText(node)) {
      addFinding("jsx_text", node, node.getText(sourceFile));
    }

    if (ts.isJsxExpression(node)) {
      collectJsxExpressionFindings(node, addFinding);
    }

    if (ts.isJsxAttribute(node)) {
      collectJsxAttributeFindings(node, addFinding);
    }

    if (ts.isCallExpression(node)) {
      collectCallExpressionFindings(node, addFinding);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings.sort(compareFindings);
}

function collectJsxExpressionFindings(
  node: ts.JsxExpression,
  addFinding: (
    kind: I18nAuditFindingKind,
    targetNode: ts.Node,
    rawText: string,
  ) => void,
): void {
  if (!node.expression) {
    return;
  }

  if (ts.isJsxAttribute(node.parent)) {
    return;
  }

  if (!ts.isJsxElement(node.parent) && !ts.isJsxFragment(node.parent)) {
    return;
  }

  const candidates = collectExpressionLiteralCandidates(node.expression);
  for (const candidate of candidates) {
    addFinding("jsx_expression", candidate.node, candidate.text);
  }
}

function collectJsxAttributeFindings(
  node: ts.JsxAttribute,
  addFinding: (
    kind: I18nAuditFindingKind,
    targetNode: ts.Node,
    rawText: string,
    extra?: { attributeName?: string },
  ) => void,
): void {
  const attributeName = node.name.getText();
  if (!isUserFacingAttribute(attributeName)) {
    return;
  }

  if (!node.initializer) {
    return;
  }

  if (ts.isStringLiteral(node.initializer)) {
    addFinding("jsx_attribute", node.initializer, node.initializer.text, {
      attributeName,
    });
    return;
  }

  if (!ts.isJsxExpression(node.initializer) || !node.initializer.expression) {
    return;
  }

  const candidates = collectExpressionLiteralCandidates(node.initializer.expression);
  for (const candidate of candidates) {
    addFinding("jsx_attribute", candidate.node, candidate.text, {
      attributeName,
    });
  }
}

function collectCallExpressionFindings(
  node: ts.CallExpression,
  addFinding: (
    kind: I18nAuditFindingKind,
    targetNode: ts.Node,
    rawText: string,
    extra?: { callName?: I18nAuditCallName },
  ) => void,
): void {
  const callName = resolveAlertLikeCall(node.expression);
  if (!callName || node.arguments.length === 0) {
    return;
  }

  const firstArgument = node.arguments[0];
  if (!ts.isExpression(firstArgument)) {
    return;
  }

  const candidates = collectExpressionLiteralCandidates(firstArgument);
  for (const candidate of candidates) {
    addFinding("call_argument", candidate.node, candidate.text, { callName });
  }
}

function collectExpressionLiteralCandidates(
  expression: ts.Expression,
): LiteralCandidate[] {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return [{ node: expression, text: expression.text }];
  }

  if (ts.isTemplateExpression(expression)) {
    return [{ node: expression, text: stringifyTemplateExpression(expression) }];
  }

  if (ts.isParenthesizedExpression(expression)) {
    return collectExpressionLiteralCandidates(expression.expression);
  }

  if (ts.isAsExpression(expression) || ts.isTypeAssertionExpression(expression)) {
    return collectExpressionLiteralCandidates(expression.expression);
  }

  if (ts.isSatisfiesExpression(expression)) {
    return collectExpressionLiteralCandidates(expression.expression);
  }

  if (ts.isNonNullExpression(expression)) {
    return collectExpressionLiteralCandidates(expression.expression);
  }

  if (ts.isConditionalExpression(expression)) {
    return [
      ...collectExpressionLiteralCandidates(expression.whenTrue),
      ...collectExpressionLiteralCandidates(expression.whenFalse),
    ];
  }

  if (ts.isBinaryExpression(expression)) {
    if (
      expression.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
      expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
      expression.operatorToken.kind === ts.SyntaxKind.PlusToken
    ) {
      return [
        ...collectExpressionLiteralCandidates(expression.left),
        ...collectExpressionLiteralCandidates(expression.right),
      ];
    }
    return [];
  }

  if (ts.isCallExpression(expression) && isTranslationCallExpression(expression)) {
    return [];
  }

  return [];
}

function isTranslationCallExpression(node: ts.CallExpression): boolean {
  const callee = node.expression;
  if (ts.isIdentifier(callee)) {
    return TRANSLATION_CALL_NAMES.has(callee.text);
  }

  if (ts.isPropertyAccessExpression(callee)) {
    return TRANSLATION_CALL_NAMES.has(callee.name.text);
  }

  return false;
}

function stringifyTemplateExpression(expression: ts.TemplateExpression): string {
  let output = expression.head.text;
  for (const span of expression.templateSpans) {
    output += "${...}";
    output += span.literal.text;
  }
  return output;
}

function isUserFacingAttribute(attributeName: string): boolean {
  const lowered = attributeName.toLowerCase();
  return (
    USER_FACING_ATTRIBUTES.has(lowered) ||
    USER_FACING_ATTRIBUTE_SUFFIX.test(attributeName)
  );
}

function resolveAlertLikeCall(
  expression: ts.LeftHandSideExpression,
): I18nAuditCallName | undefined {
  if (ts.isIdentifier(expression) && ALERT_LIKE_CALLS.has(expression.text as I18nAuditCallName)) {
    return expression.text as I18nAuditCallName;
  }

  if (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === "window" &&
    ALERT_LIKE_CALLS.has(expression.name.text as I18nAuditCallName)
  ) {
    return expression.name.text as I18nAuditCallName;
  }

  return undefined;
}

function normalizeText(rawText: string): string {
  return rawText.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function shouldIncludeText(text: string): boolean {
  if (text.length === 0) {
    return false;
  }

  if (!LETTER_PATTERN.test(text)) {
    return false;
  }

  if (TRANSLATION_KEY_PATTERN.test(text) && text.includes(".")) {
    return false;
  }

  if (CSS_VAR_PATTERN.test(text)) {
    return false;
  }

  return true;
}

function toScriptKind(file: string): ts.ScriptKind {
  const extension = path.extname(file).toLowerCase();
  if (extension === ".tsx") {
    return ts.ScriptKind.TSX;
  }
  if (extension === ".jsx") {
    return ts.ScriptKind.JSX;
  }
  if (extension === ".js") {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
}

function countByScope(findings: AuditFinding[]): Record<I18nAuditScope, number> {
  const totals: Record<I18nAuditScope, number> = {
    builder: 0,
    layers: 0,
    "window-content": 0,
  };

  for (const finding of findings) {
    totals[finding.scope] += 1;
  }

  return totals;
}

function readBaselineFindings(baselinePath: string, cwd: string): AuditFinding[] {
  const absolutePath = path.resolve(cwd, baselinePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Baseline file not found at ${toPosixPath(baselinePath)}. Create it before using --fail-on-new.`,
    );
  }

  const raw = fs.readFileSync(absolutePath, "utf8");
  const parsed = JSON.parse(raw) as Partial<AuditReport>;
  if (!Array.isArray(parsed.findings)) {
    throw new Error(
      `Baseline file ${toPosixPath(baselinePath)} is missing a findings array.`,
    );
  }

  return parsed.findings
    .map((finding) => ({
      ...finding,
      file: toPosixPath(String(finding.file ?? "")),
      scope: finding.scope as I18nAuditScope,
      line: Number(finding.line ?? 0),
      column: Number(finding.column ?? 0),
      kind: finding.kind as I18nAuditFindingKind,
      text: String(finding.text ?? ""),
      attributeName:
        finding.attributeName === undefined
          ? undefined
          : String(finding.attributeName),
      callName:
        finding.callName === undefined
          ? undefined
          : (String(finding.callName) as I18nAuditCallName),
    }))
    .filter((finding) => {
      if (!isAuditScope(finding.scope)) {
        return false;
      }
      return finding.line > 0 && finding.column > 0 && finding.text.length > 0;
    })
    .sort(compareFindings);
}

function writeReport(reportPath: string, report: AuditReport, cwd: string): void {
  const absolutePath = path.resolve(cwd, reportPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function logSummary(report: AuditReport, reportPath?: string): void {
  console.log(
    `[i18n-audit] scopes=${report.scopes.join(",")} files=${report.filesScanned} findings=${report.summary.netFindings} allowlisted=${report.summary.allowlisted}`,
  );
  console.log(
    `[i18n-audit] byScope builder=${report.summary.byScope.builder} layers=${report.summary.byScope.layers} window-content=${report.summary.byScope["window-content"]}`,
  );
  if (reportPath) {
    console.log(`[i18n-audit] report=${toPosixPath(reportPath)}`);
  }
}

function getFindingFingerprint(finding: AuditFinding): string {
  return [
    finding.scope,
    finding.file,
    finding.line.toString(),
    finding.column.toString(),
    finding.kind,
    finding.attributeName ?? "",
    finding.callName ?? "",
    finding.text,
  ].join("|");
}

function getStableBaselineFingerprint(finding: AuditFinding): string {
  return [
    finding.scope,
    finding.file,
    finding.kind,
    finding.attributeName ?? "",
    finding.callName ?? "",
    finding.text,
  ].join("|");
}

function compareFindings(left: AuditFinding, right: AuditFinding): number {
  return (
    compareScope(left.scope, right.scope) ||
    left.file.localeCompare(right.file) ||
    left.line - right.line ||
    left.column - right.column ||
    left.kind.localeCompare(right.kind) ||
    (left.attributeName ?? "").localeCompare(right.attributeName ?? "") ||
    (left.callName ?? "").localeCompare(right.callName ?? "") ||
    left.text.localeCompare(right.text)
  );
}

function compareAllowlistedFindings(
  left: AllowlistedAuditFinding,
  right: AllowlistedAuditFinding,
): number {
  return compareFindings(left, right) || left.allowlistReason.localeCompare(right.allowlistReason);
}

function compareScope(left: I18nAuditScope, right: I18nAuditScope): number {
  return ALL_SCOPES.indexOf(left) - ALL_SCOPES.indexOf(right);
}

function formatFinding(finding: AuditFinding): string {
  const location = `${finding.file}:${finding.line}:${finding.column}`;
  const contextParts = [finding.kind];
  if (finding.attributeName) {
    contextParts.push(`attr=${finding.attributeName}`);
  }
  if (finding.callName) {
    contextParts.push(`call=${finding.callName}`);
  }
  return `${location} [${contextParts.join(",")}] "${finding.text}"`;
}

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function isCliEntrypoint(): boolean {
  const argvEntry = process.argv[1];
  if (!argvEntry) {
    return false;
  }

  const resolvedArgvEntry = path.resolve(argvEntry);
  const resolvedCurrentFile = path.resolve(fileURLToPath(import.meta.url));
  return resolvedArgvEntry === resolvedCurrentFile;
}

if (isCliEntrypoint()) {
  main();
}
