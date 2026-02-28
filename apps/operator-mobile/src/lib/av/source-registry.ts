export const MOBILE_AV_SOURCE_CLASSES = [
  'iphone_camera',
  'iphone_microphone',
  'meta_glasses',
  'uploaded_media',
] as const;

export type MobileAvSourceClass = (typeof MOBILE_AV_SOURCE_CLASSES)[number];

export type MobileAvSourceScope = {
  organizationId?: string;
  tenantId?: string;
  liveSessionId?: string;
};

export type MobileAvSourceRegistration = {
  sourceId: string;
  sourceClass: MobileAvSourceClass;
  providerId: string;
  deviceLabel?: string;
  transport?: string;
  scope?: MobileAvSourceScope;
  capabilities: {
    camera?: boolean;
    microphone?: boolean;
  };
  registeredAt: number;
  metadata?: Record<string, unknown>;
};

export type MobileAvSourceRegistry = {
  registerSource: (source: Omit<MobileAvSourceRegistration, 'sourceId' | 'registeredAt'> & { sourceId?: string }) => MobileAvSourceRegistration;
  getSource: (sourceId: string) => MobileAvSourceRegistration | null;
  requireSource: (sourceId: string) => MobileAvSourceRegistration;
  listSources: () => MobileAvSourceRegistration[];
};

function normalizeSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'unknown';
}

function normalizeSourceId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .split(':')
    .map((segment) => normalizeSegment(segment))
    .filter((segment) => segment.length > 0)
    .join(':') || 'unknown';
}

function normalizeOptionalScopeToken(value?: string): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeSourceScope(scope?: MobileAvSourceScope): MobileAvSourceScope | undefined {
  if (!scope) {
    return undefined;
  }
  const normalized: MobileAvSourceScope = {
    organizationId: normalizeOptionalScopeToken(scope.organizationId),
    tenantId: normalizeOptionalScopeToken(scope.tenantId),
    liveSessionId: normalizeOptionalScopeToken(scope.liveSessionId),
  };
  if (!normalized.organizationId && !normalized.tenantId && !normalized.liveSessionId) {
    return undefined;
  }
  return normalized;
}

function resolveSourceId(input: {
  sourceClass: MobileAvSourceClass;
  providerId: string;
  deviceLabel?: string;
  sourceId?: string;
}): string {
  if (input.sourceId && input.sourceId.trim().length > 0) {
    return normalizeSourceId(input.sourceId);
  }
  const providerToken = normalizeSegment(input.providerId);
  const deviceToken = normalizeSegment(input.deviceLabel || 'primary');
  return `${input.sourceClass}:${providerToken}:${deviceToken}`;
}

export function createMobileAvSourceRegistry(args?: { now?: () => number }): MobileAvSourceRegistry {
  const now = args?.now || Date.now;
  const sources = new Map<string, MobileAvSourceRegistration>();

  return {
    registerSource: (sourceInput) => {
      const sourceId = resolveSourceId({
        sourceClass: sourceInput.sourceClass,
        providerId: sourceInput.providerId,
        deviceLabel: sourceInput.deviceLabel,
        sourceId: sourceInput.sourceId,
      });
      const normalized: MobileAvSourceRegistration = {
        ...sourceInput,
        sourceId,
        providerId: normalizeSegment(sourceInput.providerId),
        deviceLabel: sourceInput.deviceLabel?.trim(),
        transport: sourceInput.transport?.trim(),
        scope: normalizeSourceScope(sourceInput.scope),
        registeredAt: now(),
      };
      sources.set(sourceId, normalized);
      return normalized;
    },
    getSource: (sourceId) => {
      const source = sources.get(normalizeSourceId(sourceId));
      return source || null;
    },
    requireSource: (sourceId) => {
      const source = sources.get(normalizeSourceId(sourceId));
      if (!source) {
        throw new Error(`AV source "${sourceId}" is not registered.`);
      }
      return source;
    },
    listSources: () => Array.from(sources.values()),
  };
}
