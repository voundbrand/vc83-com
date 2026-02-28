import type {
  MobileAvSourceClass,
  MobileAvSourceRegistry,
  MobileAvSourceScope,
} from './source-registry';

type NodeCommandRoute = {
  allowedSourceClasses?: Set<MobileAvSourceClass>;
  requiredCapability?: 'camera' | 'microphone';
};

export type NodeCommandGatePolicy = {
  allowlist: Set<string>;
  blockedPatterns: RegExp[];
  commandRoutes: Map<string, NodeCommandRoute>;
};

export type NodeCommandGateDecision = {
  allowed: boolean;
  reason: string;
  command: string;
  sourceId: string;
  sourceClass?: MobileAvSourceClass;
  policy: 'allowlist';
};

const ALL_SOURCE_CLASSES: ReadonlyArray<MobileAvSourceClass> = [
  'iphone_camera',
  'iphone_microphone',
  'meta_glasses',
  'uploaded_media',
];

const DEFAULT_NODE_COMMAND_ROUTE_CONFIG: Record<
  string,
  {
    allowedSourceClasses: ReadonlyArray<MobileAvSourceClass>;
    requiredCapability?: 'camera' | 'microphone';
  }
> = {
  capture_frame: {
    allowedSourceClasses: ['iphone_camera', 'meta_glasses', 'uploaded_media'],
    requiredCapability: 'camera',
  },
  capture_audio: {
    allowedSourceClasses: ['iphone_microphone', 'meta_glasses'],
    requiredCapability: 'microphone',
  },
  transcribe_audio: {
    allowedSourceClasses: ['iphone_microphone', 'meta_glasses'],
    requiredCapability: 'microphone',
  },
  extract_entities: {
    allowedSourceClasses: ALL_SOURCE_CLASSES,
  },
  assemble_concierge_payload: {
    allowedSourceClasses: ALL_SOURCE_CLASSES,
  },
  preview_meeting_concierge: {
    allowedSourceClasses: ALL_SOURCE_CLASSES,
  },
  execute_meeting_concierge: {
    allowedSourceClasses: ALL_SOURCE_CLASSES,
  },
};

export function createNodeCommandGatePolicy(args: {
  allowlistCsv: string;
  blockedPatternsCsv: string;
}): NodeCommandGatePolicy {
  const allowlist = new Set(
    args.allowlistCsv
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  );
  const commandRoutes = new Map<string, NodeCommandRoute>();
  for (const command of allowlist) {
    const routeConfig = DEFAULT_NODE_COMMAND_ROUTE_CONFIG[command];
    if (!routeConfig) {
      continue;
    }
    commandRoutes.set(command, {
      allowedSourceClasses: new Set(routeConfig.allowedSourceClasses),
      requiredCapability: routeConfig.requiredCapability,
    });
  }

  const blockedPatterns = args.blockedPatternsCsv
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => new RegExp(entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));

  return {
    allowlist,
    blockedPatterns,
    commandRoutes,
  };
}

function normalizeCommand(command: string): string {
  return command.trim().toLowerCase();
}

function normalizeScopeToken(value?: string): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function scopeMatches(args: {
  expectedScope?: MobileAvSourceScope;
  sourceScope?: MobileAvSourceScope;
}): boolean {
  if (!args.expectedScope) {
    return true;
  }
  const keys: Array<keyof MobileAvSourceScope> = ['organizationId', 'tenantId', 'liveSessionId'];
  for (const key of keys) {
    const expected = normalizeScopeToken(args.expectedScope[key]);
    if (!expected) {
      continue;
    }
    const actual = normalizeScopeToken(args.sourceScope?.[key]);
    if (!actual || actual !== expected) {
      return false;
    }
  }
  return true;
}

export function evaluateNodeCommandGate(args: {
  command: string;
  sourceId?: string;
  expectedScope?: MobileAvSourceScope;
  sourceRegistry: MobileAvSourceRegistry;
  policy: NodeCommandGatePolicy;
}): NodeCommandGateDecision {
  const command = normalizeCommand(args.command);
  const sourceId = typeof args.sourceId === 'string' ? args.sourceId.trim() : '';

  if (!command) {
    return {
      allowed: false,
      reason: 'empty_command',
      command,
      sourceId,
      policy: 'allowlist',
    };
  }

  if (!sourceId) {
    return {
      allowed: false,
      reason: 'source_id_required',
      command,
      sourceId,
      policy: 'allowlist',
    };
  }

  const source = args.sourceRegistry.getSource(sourceId);
  if (!source) {
    return {
      allowed: false,
      reason: 'source_not_registered',
      command,
      sourceId,
      policy: 'allowlist',
    };
  }

  if (!scopeMatches({ expectedScope: args.expectedScope, sourceScope: source.scope })) {
    return {
      allowed: false,
      reason: 'source_scope_mismatch',
      command,
      sourceId,
      sourceClass: source.sourceClass,
      policy: 'allowlist',
    };
  }

  for (const pattern of args.policy.blockedPatterns) {
    if (pattern.test(command)) {
      return {
        allowed: false,
        reason: `unsafe_command_pattern:${pattern.source}`,
        command,
        sourceId,
        sourceClass: source.sourceClass,
        policy: 'allowlist',
      };
    }
  }

  if (!args.policy.allowlist.has(command)) {
    return {
      allowed: false,
      reason: 'command_not_allowlisted',
      command,
      sourceId,
      sourceClass: source.sourceClass,
      policy: 'allowlist',
    };
  }

  const commandRoute = args.policy.commandRoutes.get(command);
  if (!commandRoute) {
    return {
      allowed: false,
      reason: 'command_route_missing',
      command,
      sourceId,
      sourceClass: source.sourceClass,
      policy: 'allowlist',
    };
  }

  if (
    commandRoute.allowedSourceClasses
    && !commandRoute.allowedSourceClasses.has(source.sourceClass)
  ) {
    return {
      allowed: false,
      reason: `source_class_not_allowed:${source.sourceClass}`,
      command,
      sourceId,
      sourceClass: source.sourceClass,
      policy: 'allowlist',
    };
  }

  if (commandRoute.requiredCapability === 'camera' && source.capabilities.camera !== true) {
    return {
      allowed: false,
      reason: 'source_missing_camera_capability',
      command,
      sourceId,
      sourceClass: source.sourceClass,
      policy: 'allowlist',
    };
  }
  if (commandRoute.requiredCapability === 'microphone' && source.capabilities.microphone !== true) {
    return {
      allowed: false,
      reason: 'source_missing_microphone_capability',
      command,
      sourceId,
      sourceClass: source.sourceClass,
      policy: 'allowlist',
    };
  }

  return {
    allowed: true,
    reason: 'allowed',
    command,
    sourceId,
    sourceClass: source.sourceClass,
    policy: 'allowlist',
  };
}
