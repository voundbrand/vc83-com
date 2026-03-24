const TRUE_ENV_VALUES = new Set(["1", "true", "yes", "on"]);

export function isCmsEditorEnabled(): boolean {
  const rawValue = process.env.NEXT_PUBLIC_CMS_EDITOR_ENABLED;
  if (!rawValue) {
    return false;
  }
  return TRUE_ENV_VALUES.has(rawValue.trim().toLowerCase());
}
