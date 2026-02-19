/**
 * Shared connection-type support rules.
 *
 * Keeps safe-failure behavior consistent between connection tools and
 * orchestration playbooks.
 */

export const AUTO_CREATE_UNSUPPORTED_TYPES = new Set([
  "booking",
  "checkout",
  "ticket",
  "conversation",
  "agent",
]);

export const EVENT_PLAYBOOK_SUPPORTED_CONNECTION_TYPES = new Set([
  "event",
  "product",
  "form",
]);

export function getAutoCreateUnsupportedReason(type: string): string | null {
  if (!AUTO_CREATE_UNSUPPORTED_TYPES.has(type)) {
    return null;
  }

  return (
    `Cannot auto-create ${type} records from agent tools yet. ` +
    `Please create this ${type} manually in the platform.`
  );
}

export function getEventPlaybookUnsupportedReason(type: string): string | null {
  if (EVENT_PLAYBOOK_SUPPORTED_CONNECTION_TYPES.has(type)) {
    return null;
  }

  const autoCreateReason = getAutoCreateUnsupportedReason(type);
  if (autoCreateReason) {
    return autoCreateReason;
  }

  return (
    `Event playbook v1 does not auto-orchestrate ${type} items yet. ` +
    "Keep this item in a manual follow-up step."
  );
}
