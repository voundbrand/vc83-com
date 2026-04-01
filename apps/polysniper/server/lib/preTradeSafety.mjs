const REQUIRED_SAFETY_CHECKS = [
  'killSwitch',
  'maxTradeNotional',
  'maxDailyNotional',
  'maxOpenRisk',
  'maxOpenPositions',
  'reserveFloor',
  'prepaidBalance',
  'executionProfile',
  'venueEligibility',
  'intentPolicy',
];

function unique(values) {
  return [...new Set(values)];
}

export function enforcePreTradeSafety(decision, options = {}) {
  const failedReasons = [];
  const checks = decision?.checks;
  const mode = options.mode || 'paper_sim';
  const profile = options.executionProfile || {};
  const eligibility = options.venueEligibility || {};
  const intentPolicy = options.intentPolicy || null;

  if (!checks || typeof checks !== 'object') {
    return {
      allowOrder: false,
      reason: 'decision_checks_missing',
      enforcedChecks: REQUIRED_SAFETY_CHECKS,
      failedReasons: ['decision_checks_missing'],
    };
  }

  for (const checkName of REQUIRED_SAFETY_CHECKS) {
    if (checkName === 'executionProfile' || checkName === 'venueEligibility' || checkName === 'intentPolicy') {
      continue;
    }
    const check = checks[checkName];
    if (!check || typeof check.pass !== 'boolean') {
      failedReasons.push(`check_missing:${checkName}`);
      continue;
    }
    if (!check.pass) {
      failedReasons.push(check.reason || `check_failed:${checkName}`);
    }
  }

  const executionProfileCheck =
    mode !== 'live_limited'
      ? { pass: true, reason: 'mode_non_live' }
      : profile.status === 'ACTIVE'
        ? { pass: true, reason: 'ok' }
        : { pass: false, reason: `execution_profile_not_active:${profile.status || 'UNKNOWN'}` };
  if (!executionProfileCheck.pass) {
    failedReasons.push(executionProfileCheck.reason);
  }

  const venueEligibilityCheck =
    mode !== 'live_limited'
      ? { pass: true, reason: 'mode_non_live' }
      : eligibility.classification === 'eligible'
        ? { pass: true, reason: 'ok' }
        : {
            pass: false,
            reason: `venue_eligibility_${eligibility.classification || 'unknown'}`,
          };
  if (!venueEligibilityCheck.pass) {
    failedReasons.push(venueEligibilityCheck.reason);
  }

  const intentPolicyCheck =
    !intentPolicy || intentPolicy.allowedAction !== 'DENY'
      ? { pass: true, reason: intentPolicy ? 'ok' : 'intent_policy_not_applicable' }
      : {
          pass: false,
          reason: `intent_policy_deny:${
            Array.isArray(intentPolicy.rejectReasons) && intentPolicy.rejectReasons.length > 0
              ? intentPolicy.rejectReasons.join('|')
              : 'unspecified'
          }`,
        };
  if (!intentPolicyCheck.pass) {
    failedReasons.push(intentPolicyCheck.reason);
  }

  if (decision?.action !== 'PLACE_ORDER') {
    return {
      allowOrder: false,
      reason: 'decision_hold',
      enforcedChecks: REQUIRED_SAFETY_CHECKS,
      contextualChecks: {
        executionProfile: executionProfileCheck,
        venueEligibility: venueEligibilityCheck,
        intentPolicy: intentPolicyCheck,
      },
      failedReasons: unique([
        ...(Array.isArray(decision?.failedReasons) ? decision.failedReasons : []),
        ...failedReasons,
      ]),
    };
  }

  return {
    allowOrder: failedReasons.length === 0,
    reason: failedReasons.length === 0 ? 'ok' : 'safety_checks_failed',
    enforcedChecks: REQUIRED_SAFETY_CHECKS,
    contextualChecks: {
      executionProfile: executionProfileCheck,
      venueEligibility: venueEligibilityCheck,
      intentPolicy: intentPolicyCheck,
    },
    failedReasons: unique(failedReasons),
  };
}
