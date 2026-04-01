const PROFILE_STATUSES = new Set(['SIM_ONLY', 'ACTIVE', 'DISABLED']);

const BLOCKED_JURISDICTIONS = new Set([
  'AUSTRALIA',
  'BELARUS',
  'BELGIUM',
  'BURUNDI',
  'CENTRAL AFRICAN REPUBLIC',
  'CONGO (KINSHASA)',
  'CRIMEA',
  'CUBA',
  'DONETSK',
  'ETHIOPIA',
  'FRANCE',
  'GERMANY',
  'IRAN',
  'IRAQ',
  'ITALY',
  'LEBANON',
  'LIBYA',
  'LUHANSK',
  'MYANMAR',
  'NETHERLANDS',
  'NICARAGUA',
  'NORTH KOREA',
  'ONTARIO',
  'POLAND',
  'RUSSIA',
  'SINGAPORE',
  'SOMALIA',
  'SOUTH SUDAN',
  'SUDAN',
  'SYRIA',
  'TAIWAN',
  'THAILAND',
  'UNITED KINGDOM',
  'UNITED STATES',
  'UNITED STATES MINOR OUTLYING ISLANDS',
  'VENEZUELA',
  'YEMEN',
  'ZIMBABWE',
]);

function normalizeToken(raw) {
  return String(raw || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function parseCsv(raw = '') {
  return String(raw)
    .split(',')
    .map((item) => normalizeToken(item))
    .filter(Boolean);
}

function normalizeStatus(raw) {
  const value = normalizeToken(raw);
  if (PROFILE_STATUSES.has(value)) return value;
  return 'SIM_ONLY';
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function reasonsForProfile(profile) {
  const reasons = [];

  if (profile.status !== 'ACTIVE') {
    reasons.push(`profile_status_not_active:${profile.status}`);
  }

  if (!profile.id) {
    reasons.push('profile_id_missing');
  }

  if (profile.venue !== 'polymarket') {
    reasons.push(`venue_not_supported:${profile.venue || 'unknown'}`);
  }

  if (!profile.operatorLocation) {
    reasons.push('operator_location_missing');
  } else if (BLOCKED_JURISDICTIONS.has(profile.operatorLocation)) {
    reasons.push(`operator_location_blocked:${profile.operatorLocation}`);
  }

  if (!profile.kycJurisdiction) {
    reasons.push('kyc_jurisdiction_missing');
  } else if (BLOCKED_JURISDICTIONS.has(profile.kycJurisdiction)) {
    reasons.push(`kyc_jurisdiction_blocked:${profile.kycJurisdiction}`);
  }

  return reasons;
}

export function buildExecutionProfile(input = {}) {
  const profile = {
    id: String(input.id || '').trim() || 'default_profile',
    venue: String(input.venue || 'polymarket').trim().toLowerCase(),
    entity: String(input.entity || '').trim() || null,
    kycJurisdiction: normalizeToken(input.kycJurisdiction || ''),
    operatorLocation: normalizeToken(input.operatorLocation || ''),
    bankingJurisdictions: uniqueSorted(parseCsv(input.bankingJurisdictions || '')),
    status: normalizeStatus(input.status || ''),
    allowAgentIntents: Boolean(input.allowAgentIntents),
  };

  const policyReasons = reasonsForProfile(profile);
  const activeEligible = policyReasons.length === 0;

  return {
    ...profile,
    policyReasons,
    activeEligible,
  };
}

export function summarizeExecutionProfile(profile) {
  const normalized = buildExecutionProfile(profile);
  return {
    id: normalized.id,
    venue: normalized.venue,
    entity: normalized.entity,
    status: normalized.status,
    kycJurisdiction: normalized.kycJurisdiction || null,
    operatorLocation: normalized.operatorLocation || null,
    bankingJurisdictions: normalized.bankingJurisdictions,
    allowAgentIntents: normalized.allowAgentIntents,
    activeEligible: normalized.activeEligible,
    policyReasons: normalized.policyReasons,
  };
}

