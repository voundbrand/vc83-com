function toArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
}

function pickString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function pickFromText(line, key) {
  const patterns = [
    new RegExp(`${key}[:=]\\s*['\"]?([^,'\"\\s}]+)`),
    new RegExp(`${key}\\s*['\"]?[:=]\\s*['\"]([^'\"]+)['\"]`),
  ];
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return undefined;
}

function parseInlineArray(line, key) {
  const match = line.match(new RegExp(`${key}[:=]\\s*\\[([^\\]]*)\\]`));
  if (!match || !match[1]) {
    return [];
  }
  return match[1]
    .split(',')
    .map((entry) => entry.replace(/['\"]/g, '').trim())
    .filter((entry) => entry.length > 0);
}

function parseJsonFromLine(line) {
  const start = line.indexOf('{');
  const end = line.lastIndexOf('}');
  if (start < 0 || end <= start) {
    return null;
  }
  const candidate = line.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

export function parseQaLogLine(line) {
  const parsed = parseJsonFromLine(line);
  const payload = parsed && typeof parsed === 'object' ? parsed : {};
  const acPayload = payload.payload && typeof payload.payload === 'object' ? payload.payload : {};
  const eventName = pickString(
    payload.event,
    payload.eventName,
    payload.type,
    pickFromText(line, 'event'),
    pickFromText(line, 'eventName'),
  );

  const sessionId = pickString(
    payload.sessionId,
    payload.session_id,
    payload.session,
    pickFromText(line, 'sessionId'),
    pickFromText(line, 'session_id'),
  );
  const turnId = pickString(
    payload.turnId,
    payload.turn_id,
    pickFromText(line, 'turnId'),
    pickFromText(line, 'turn_id'),
  );
  const agentId = pickString(
    payload.agentId,
    payload.agent_id,
    pickFromText(line, 'agentId'),
    pickFromText(line, 'agent_id'),
  );
  const qaRunId = pickString(
    payload.qaRunId,
    payload.qa_run_id,
    payload.runId,
    payload.run_id,
    pickFromText(line, 'qaRunId'),
    pickFromText(line, 'qa_run_id'),
    pickFromText(line, 'runId'),
    pickFromText(line, 'run_id'),
  );

  const reasonCode = pickString(
    acPayload.reasonCode,
    payload.reasonCode,
    payload.reason_code,
    pickFromText(line, 'reasonCode'),
    pickFromText(line, 'reason_code'),
  );
  const preflightReasonCode = pickString(
    acPayload.preflightReasonCode,
    payload.preflightReasonCode,
    payload.preflight_reason_code,
    pickFromText(line, 'preflightReasonCode'),
    pickFromText(line, 'preflight_reason_code'),
  );

  const requiredTools = [
    ...toArray(acPayload.requiredTools),
    ...toArray(payload.requiredTools),
    ...parseInlineArray(line, 'requiredTools'),
  ];
  const availableTools = [
    ...toArray(acPayload.availableTools),
    ...toArray(payload.availableTools),
    ...parseInlineArray(line, 'availableTools'),
  ];
  const missingRequiredFields = [
    ...toArray(acPayload.preflightMissingRequiredFields),
    ...toArray(payload.preflightMissingRequiredFields),
    ...parseInlineArray(line, 'missing_required_fields'),
    ...parseInlineArray(line, 'preflightMissingRequiredFields'),
  ];

  const actionDecision = pickString(
    payload.enforcementMode,
    payload.actionCompletionEnforcementMode,
    payload.actionCompletionOutcome,
    pickFromText(line, 'enforcementMode'),
    pickFromText(line, 'actionCompletionEnforcementMode'),
  );
  const blockedReason = pickString(
    payload.blockedReason,
    pickFromText(line, 'blockedReason'),
  );
  const dispatchDecision = pickString(
    payload.dispatchDecision,
    pickFromText(line, 'dispatchDecision'),
  );

  const hasDiagnosticSignals =
    Boolean(reasonCode)
    || Boolean(preflightReasonCode)
    || requiredTools.length > 0
    || availableTools.length > 0
    || missingRequiredFields.length > 0
    || eventName === 'super_admin_agent_qa_turn';
  if (!hasDiagnosticSignals) {
    return null;
  }

  return {
    eventName,
    qaRunId,
    sessionId,
    turnId,
    agentId,
    reasonCode,
    preflightReasonCode,
    requiredTools: Array.from(new Set(requiredTools)).sort(),
    availableTools: Array.from(new Set(availableTools)).sort(),
    missingRequiredFields: Array.from(new Set(missingRequiredFields)).sort(),
    actionDecision,
    dispatchDecision,
    blockedReason,
    raw: line,
  };
}

export function qaLogMatchesFilters(event, filters) {
  if (filters.run && event.qaRunId !== filters.run) return false;
  if (filters.session && event.sessionId !== filters.session) return false;
  if (filters.turn && event.turnId !== filters.turn) return false;
  if (filters.agent && event.agentId !== filters.agent) return false;
  return true;
}

export function formatQaLogEvent(event) {
  const segments = [];
  if (event.eventName) segments.push(`event=${event.eventName}`);
  if (event.qaRunId) segments.push(`run=${event.qaRunId}`);
  if (event.sessionId) segments.push(`session=${event.sessionId}`);
  if (event.turnId) segments.push(`turn=${event.turnId}`);
  if (event.agentId) segments.push(`agent=${event.agentId}`);
  if (event.preflightReasonCode) segments.push(`preflightReasonCode=${event.preflightReasonCode}`);
  if (event.reasonCode) segments.push(`reasonCode=${event.reasonCode}`);
  segments.push(`requiredTools=[${event.requiredTools.join(',')}]`);
  segments.push(`availableTools=[${event.availableTools.join(',')}]`);
  segments.push(`missingRequiredFields=[${event.missingRequiredFields.join(',')}]`);
  if (event.actionDecision) segments.push(`actionDecision=${event.actionDecision}`);
  if (event.dispatchDecision) segments.push(`dispatchDecision=${event.dispatchDecision}`);
  if (event.blockedReason) segments.push(`blockedReason=${event.blockedReason}`);
  return segments.join(' | ');
}
