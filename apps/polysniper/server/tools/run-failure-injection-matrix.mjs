import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildExecutionProfile } from '../lib/executionProfile.mjs';
import { validateTradeIntent, compileTradeIntentPolicy } from '../lib/tradeIntentPolicy.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
const evidenceRoot = path.join(
  repoRoot,
  'apps',
  'polysniper',
  'docs',
  'nemoclaw_polysniper_plan',
  'evidence',
  'local_docker',
);

function writeJson(filepath, payload) {
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function runCase(name, setup) {
  const profile = buildExecutionProfile(setup.profile);
  const intentValidation = validateTradeIntent(setup.intent);
  const policy = compileTradeIntentPolicy({
    intentValidation,
    executionProfile: profile,
    venueEligibility: setup.venueEligibility,
    runtime: setup.runtime,
    operatorApproval: setup.operatorApproval,
  });
  const denied = policy.allowedAction === 'DENY';
  return {
    name,
    denied,
    expectedDenied: true,
    pass: denied,
    policyDecisionId: policy.policyDecisionId,
    rejectReasons: policy.rejectReasons,
    context: policy.context,
    intentValid: intentValidation.ok,
  };
}

const now = new Date();
const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const runId = `FIM-${stamp}-v1`;
const runDir = path.join(evidenceRoot, runId);

const baseIntent = {
  intentId: 'intent-fi-base',
  source: 'openclaw_agent',
  action: 'OPEN_POSITION',
  marketId: 'mkt-fi-1',
  side: 'YES',
  requestedNotionalUsd: 8,
  executionProfileId: 'eligible_profile',
  strategy: 'fi',
};

const cases = [
  runCase('blocked_jurisdiction', {
    profile: {
      id: 'eligible_profile',
      status: 'ACTIVE',
      allowAgentIntents: true,
      venue: 'polymarket',
      operatorLocation: 'GERMANY',
      kycJurisdiction: 'GERMANY',
    },
    intent: baseIntent,
    venueEligibility: { classification: 'blocked' },
    runtime: { mode: 'live_limited', killSwitchActive: false },
    operatorApproval: { required: true, granted: true, globallyEnabled: true },
  }),
  runCase('close_only', {
    profile: {
      id: 'eligible_profile',
      status: 'ACTIVE',
      allowAgentIntents: true,
      venue: 'polymarket',
      operatorLocation: 'CANADA',
      kycJurisdiction: 'CANADA',
    },
    intent: baseIntent,
    venueEligibility: { classification: 'close_only' },
    runtime: { mode: 'live_limited', killSwitchActive: false },
    operatorApproval: { required: true, granted: true, globallyEnabled: true },
  }),
  runCase('unknown_geoblock', {
    profile: {
      id: 'eligible_profile',
      status: 'ACTIVE',
      allowAgentIntents: true,
      venue: 'polymarket',
      operatorLocation: 'CANADA',
      kycJurisdiction: 'CANADA',
    },
    intent: baseIntent,
    venueEligibility: { classification: 'unknown' },
    runtime: { mode: 'live_limited', killSwitchActive: false },
    operatorApproval: { required: true, granted: true, globallyEnabled: true },
  }),
  runCase('missing_approval', {
    profile: {
      id: 'eligible_profile',
      status: 'ACTIVE',
      allowAgentIntents: true,
      venue: 'polymarket',
      operatorLocation: 'CANADA',
      kycJurisdiction: 'CANADA',
    },
    intent: baseIntent,
    venueEligibility: { classification: 'eligible' },
    runtime: { mode: 'live_limited', killSwitchActive: false },
    operatorApproval: { required: true, granted: false, globallyEnabled: true },
  }),
  runCase('kill_switch_active', {
    profile: {
      id: 'eligible_profile',
      status: 'ACTIVE',
      allowAgentIntents: true,
      venue: 'polymarket',
      operatorLocation: 'CANADA',
      kycJurisdiction: 'CANADA',
    },
    intent: baseIntent,
    venueEligibility: { classification: 'eligible' },
    runtime: { mode: 'live_limited', killSwitchActive: true },
    operatorApproval: { required: true, granted: true, globallyEnabled: true },
  }),
];

const summary = {
  runId,
  generatedAt: now.toISOString(),
  totalCases: cases.length,
  passedCases: cases.filter((item) => item.pass).length,
  failedCases: cases.filter((item) => !item.pass).length,
  allPass: cases.every((item) => item.pass),
};

writeJson(path.join(runDir, 'RUN_METADATA.json'), {
  runId,
  generatedAt: now.toISOString(),
  script: 'apps/polysniper/server/tools/run-failure-injection-matrix.mjs',
  caseNames: cases.map((item) => item.name),
});
writeJson(path.join(runDir, 'FAILURE_INJECTION_RESULTS.json'), {
  summary,
  cases,
});

const summaryMd = `# Failure Injection Matrix\n\n- Run ID: \`${runId}\`\n- Generated at: \`${now.toISOString()}\`\n- Total cases: \`${summary.totalCases}\`\n- Passed cases: \`${summary.passedCases}\`\n- Failed cases: \`${summary.failedCases}\`\n- All pass: \`${summary.allPass}\`\n`;
fs.writeFileSync(path.join(runDir, 'SUMMARY.md'), summaryMd, 'utf8');

if (!summary.allPass) {
  console.error(`FIM_FAIL ${runId}`);
  process.exit(1);
}

console.log(`FIM_OK ${runId}`);
