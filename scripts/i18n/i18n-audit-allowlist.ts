export type I18nAuditScope = "builder" | "layers" | "window-content";

export type I18nAuditFindingKind =
  | "jsx_text"
  | "jsx_expression"
  | "jsx_attribute"
  | "call_argument";

export type I18nAuditCallName = "alert" | "confirm" | "prompt";

export interface I18nAuditAllowlistEntry {
  scope: I18nAuditScope;
  filePattern: RegExp;
  text: string;
  reason: string;
  kind?: I18nAuditFindingKind;
  attributeName?: string;
  callName?: I18nAuditCallName;
}

export const I18N_AUDIT_ALLOWLIST: readonly I18nAuditAllowlistEntry[] = [
  // External product branding; keep vendor mark unchanged.
  {
    scope: "builder",
    filePattern: /^src\/components\/builder\/builder-chat-panel\.tsx$/,
    kind: "jsx_text",
    text: "v0",
    reason: "Third-party product brand (v0.dev) should remain unchanged.",
  },
  // Data format token; translating this would reduce technical clarity.
  {
    scope: "builder",
    filePattern: /^src\/components\/builder\/builder-chat-panel\.tsx$/,
    kind: "jsx_text",
    text: "JSON",
    reason: "Canonical technical token.",
  },
  // URL example token; keep protocol/domain sample literal.
  {
    scope: "builder",
    filePattern: /^src\/(app|components)\/builder\/.*\.tsx$/,
    kind: "jsx_attribute",
    attributeName: "placeholder",
    text: "https://example.com",
    reason: "Standard URL example placeholder.",
  },
  // External payment provider name; proper noun remains untranslated.
  {
    scope: "window-content",
    filePattern: /^src\/components\/window-content\/payments-window\/.*\.tsx$/,
    text: "Stripe",
    reason: "External provider brand name.",
  },
  // Source-control provider name; proper noun remains untranslated.
  {
    scope: "builder",
    filePattern: /^src\/components\/builder\/.*\.tsx$/,
    text: "GitHub",
    reason: "External provider brand name.",
  },
];
