import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildExecutionProfile } from './executionProfile.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverRoot = path.resolve(__dirname, '..');
const appRoot = path.resolve(serverRoot, '..');

function envFloat(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envInt(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envBool(name, fallback = false) {
  const raw = process.env[name];
  if (!raw) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).toLowerCase());
}

function envText(name, fallback = '') {
  const raw = process.env[name];
  if (!raw) return fallback;
  return String(raw).trim();
}

export function loadConfig() {
  const dataDir = process.env.PSNP_DATA_DIR || path.join(serverRoot, 'data');
  const executionProfile = buildExecutionProfile({
    id: envText('PSNP_EXECUTION_PROFILE_ID', 'default_profile'),
    venue: envText('PSNP_EXECUTION_PROFILE_VENUE', 'polymarket'),
    entity: envText('PSNP_EXECUTION_PROFILE_ENTITY', ''),
    kycJurisdiction: envText('PSNP_EXECUTION_PROFILE_KYC_JURISDICTION', ''),
    operatorLocation: envText('PSNP_EXECUTION_PROFILE_OPERATOR_LOCATION', ''),
    bankingJurisdictions: envText('PSNP_EXECUTION_PROFILE_BANKING_JURISDICTIONS', ''),
    status: envText('PSNP_EXECUTION_PROFILE_STATUS', 'SIM_ONLY'),
    allowAgentIntents: envBool('PSNP_EXECUTION_PROFILE_AGENT_INTENTS_ENABLED', false),
  });

  return {
    server: {
      host: process.env.PSNP_SERVER_HOST || '127.0.0.1',
      port: envInt('PSNP_SERVER_PORT', 8787),
    },
    runtime: {
      mode: process.env.PSNP_RUNTIME_MODE || 'paper_sim',
      killSwitchEnvValue: process.env.PSNP_TRADING_KILL_SWITCH || '0',
      killSwitchFlagPath:
        process.env.PSNP_KILL_SWITCH_FLAG_PATH ||
        path.join(appRoot, '.runtime', 'kill-switch.flag'),
    },
    limits: {
      maxTradeNotionalUsd: envFloat('MAX_TRADE_NOTIONAL_USDC', 15),
      maxDailyNotionalUsd: envFloat('MAX_DAILY_NOTIONAL_USDC', 60),
      maxOpenRiskUsd: envFloat('MAX_OPEN_RISK_USDC', 45),
      maxOpenPositions: envInt('MAX_OPEN_POSITIONS', 4),
      minEdgePct: envFloat('MIN_EDGE_PCT', 3),
      minConfidence: envFloat('MIN_CONFIDENCE', 62),
      reserveFloorUsd: envFloat('PSNP_RESERVE_FLOOR_USD', 40),
      prepaidBalanceUsd: envFloat('PSNP_PREPAID_BALANCE_USD', 300),
    },
    storage: {
      dataDir,
      ledgerPath: path.join(dataDir, 'ledger.json'),
      auditPath: path.join(dataDir, 'audit.jsonl'),
    },
    model: {
      target: process.env.PSNP_MODEL_TARGET || 'claude-opus-2.4',
      provider: process.env.PSNP_MODEL_PROVIDER || 'anthropic',
      minModelConfidence: envFloat('PSNP_MODEL_CONFIDENCE_THRESHOLD', 0.62),
    },
    executionProfile,
    agentPolicy: {
      intentsRequireApproval: envBool('PSNP_AGENT_INTENTS_REQUIRE_APPROVAL', true),
      intentsGloballyEnabled: envBool('PSNP_AGENT_INTENTS_GLOBAL_ENABLED', true),
    },
    execution: {
      gammaBaseUrl: process.env.PSNP_POLY_GAMMA_BASE_URL || 'https://gamma-api.polymarket.com',
      clobBaseUrl: process.env.PSNP_POLY_CLOB_BASE_URL || 'https://clob.polymarket.com',
      clobOrderPath: process.env.PSNP_POLY_CLOB_ORDER_PATH || '/order',
      publicGeoPath: process.env.PSNP_POLY_PUBLIC_GEO_PATH || '/closed-only',
      requestTimeoutMs: envInt('PSNP_POLY_REQUEST_TIMEOUT_MS', 6000),
      providerRetryCeiling: Math.max(1, envInt('PSNP_PROVIDER_RETRY_CEILING', 2)),
      enableLiveExecution: envBool('PSNP_ENABLE_LIVE_EXECUTION', false),
      chainId: envInt('PSNP_POLY_CHAIN_ID', 137),
      signatureType: envInt('PSNP_POLY_SIGNATURE_TYPE', 1),
      useServerTime: envBool('PSNP_POLY_USE_SERVER_TIME', true),
      requireGeoOpen: envBool('PSNP_POLY_REQUIRE_OPEN_ONLY', true),
      liveOrderType: process.env.PSNP_POLY_LIVE_ORDER_TYPE || 'FOK',
      liveOrderPostOnly: envBool('PSNP_POLY_LIVE_POST_ONLY', false),
      liveOrderDeferExecution: envBool('PSNP_POLY_LIVE_DEFER_EXECUTION', false),
      auth: {
        privateKey: process.env.PSNP_POLY_WALLET_PRIVATE_KEY || '',
        funderAddress: process.env.PSNP_POLY_FUNDER_ADDRESS || '',
        geoBlockToken: process.env.PSNP_POLY_GEO_BLOCK_TOKEN || '',
        apiKey: process.env.PSNP_POLY_CLOB_API_KEY || '',
        apiSecret: process.env.PSNP_POLY_CLOB_API_SECRET || '',
        apiPassphrase: process.env.PSNP_POLY_CLOB_PASSPHRASE || '',
        deriveApiCreds: envBool('PSNP_POLY_DERIVE_API_CREDS', true),
        bearerToken: process.env.PSNP_POLY_BEARER_TOKEN || '',
      },
    },
  };
}
