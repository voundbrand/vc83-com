import {
  Chain as ClobChain,
  ClobClient,
  OrderType as ClobOrderType,
  Side as ClobSide,
  SignatureType as ClobSignatureType,
} from '@polymarket/clob-client';
import { Wallet } from '@ethersproject/wallet';

const RETRYABLE_STATUS_CODES = new Set([0, 408, 409, 425, 429, 500, 502, 503, 504]);
const GEO_BLOCK_HINT_PATTERN =
  /(geo|restricted|country|region|closed[_\s-]?only|not available in your region)/i;
const BLOCKED_HINT_PATTERN =
  /(blocked|prohibited|not available|restricted|sanction|forbidden|denied)/i;

function safeNumber(input, fallback = 0) {
  const value = Number(input);
  return Number.isFinite(value) ? value : fallback;
}

function cleanBaseUrl(url) {
  return String(url || '').replace(/\/+$/, '');
}

function truncate(value, max = 280) {
  const raw = String(value ?? '');
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max)}…`;
}

function parseJsonMaybe(raw) {
  if (typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function retrySummary(retry, fallbackCeiling) {
  const ceiling = safeNumber(retry?.ceiling, fallbackCeiling);
  const attempts = safeNumber(retry?.attempts, 0);
  return {
    attempts,
    ceiling,
    exhausted: Boolean(retry?.exhausted),
  };
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeBooleanMaybe(value) {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1') return true;
  if (value === 0 || value === '0') return false;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'yes', 'on', 'open', 'eligible', 'allow', 'allowed'].includes(normalized)) {
      return true;
    }
    if (
      ['false', 'no', 'off', 'closed', 'blocked', 'restricted', 'deny', 'denied'].includes(
        normalized,
      )
    ) {
      return false;
    }
  }
  return null;
}

function normalizeGeoStateFromPayload(payload, fallbackText = '') {
  const body = isObject(payload) ? payload : {};
  const statusText = truncate(
    `${body.status || ''} ${body.reason || ''} ${body.message || ''} ${fallbackText || ''}`,
  );
  const blockedFlag =
    normalizeBooleanMaybe(body.blocked) ??
    normalizeBooleanMaybe(body.is_blocked) ??
    normalizeBooleanMaybe(body.geo_blocked) ??
    normalizeBooleanMaybe(body.restricted);
  const closedOnlyFlag =
    normalizeBooleanMaybe(body.closed_only) ??
    normalizeBooleanMaybe(body.closedOnly) ??
    normalizeBooleanMaybe(body.close_only) ??
    normalizeBooleanMaybe(body.closeOnly);
  const allowedFlag = normalizeBooleanMaybe(body.allowed) ?? normalizeBooleanMaybe(body.open);

  if (blockedFlag === true || BLOCKED_HINT_PATTERN.test(statusText)) {
    return 'blocked';
  }
  if (closedOnlyFlag === true) {
    return 'close_only';
  }
  if (closedOnlyFlag === false || allowedFlag === true) {
    return 'open';
  }
  if (allowedFlag === false) {
    return 'blocked';
  }
  return 'unknown';
}

function mergeEligibilityClassification(publicState, authenticatedState) {
  if (publicState === 'blocked' || authenticatedState === 'blocked') {
    return { classification: 'blocked', reason: 'geo_blocked' };
  }
  if (publicState === 'close_only' || authenticatedState === 'close_only') {
    return { classification: 'close_only', reason: 'geo_close_only' };
  }
  if (publicState === 'open' && authenticatedState === 'open') {
    return { classification: 'eligible', reason: 'geo_open' };
  }
  return { classification: 'unknown', reason: 'geo_status_unknown' };
}

function pickTokenId(signal, gammaMarket) {
  if (signal?.clobTokenId) return String(signal.clobTokenId);
  if (signal?.tokenId) return String(signal.tokenId);

  const fromGamma = gammaMarket?.clobTokenIds ?? gammaMarket?.clob_token_ids ?? null;
  if (Array.isArray(fromGamma) && fromGamma.length > 0) {
    return String(fromGamma[0]);
  }
  if (typeof fromGamma === 'string') {
    const parsed = parseJsonMaybe(fromGamma);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return String(parsed[0]);
    }
    return fromGamma.length > 0 ? fromGamma : null;
  }

  return null;
}

function summarizeMarket(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    id: raw.id ?? raw.marketId ?? null,
    question: raw.question ?? raw.title ?? null,
    active: raw.active ?? null,
    closed: raw.closed ?? null,
    archived: raw.archived ?? null,
    endDate: raw.endDate ?? raw.end_date_iso ?? raw.end_date ?? null,
    clobTokenIds: raw.clobTokenIds ?? raw.clob_token_ids ?? null,
  };
}

function parseBest(levels, side) {
  if (!Array.isArray(levels) || levels.length === 0) return null;
  const normalized = levels
    .map((entry) => {
      if (Array.isArray(entry)) {
        return { price: safeNumber(entry[0], NaN), size: safeNumber(entry[1], NaN) };
      }
      if (entry && typeof entry === 'object') {
        return {
          price: safeNumber(entry.price ?? entry.p, NaN),
          size: safeNumber(entry.size ?? entry.s, NaN),
        };
      }
      return { price: NaN, size: NaN };
    })
    .filter((entry) => Number.isFinite(entry.price) && Number.isFinite(entry.size));

  if (normalized.length === 0) return null;

  const sorted = normalized.sort((a, b) => (side === 'bid' ? b.price - a.price : a.price - b.price));
  return sorted[0];
}

function classifyDecisionHold(failedReasons = []) {
  const reasons = Array.isArray(failedReasons) ? failedReasons.map((value) => String(value)) : [];
  if (reasons.includes('provider_unhealthy')) return 'provider_unhealthy';
  if (reasons.some((reason) => reason.startsWith('model_confidence_below_threshold:'))) {
    return 'model_confidence_below_threshold';
  }
  if (reasons.some((reason) => reason.startsWith('confidence_below_minimum:'))) {
    return 'confidence_below_minimum';
  }
  if (reasons.some((reason) => reason.includes('max_trade') || reason.includes('daily_cap'))) {
    return 'risk_limit_exceeded';
  }
  if (reasons.some((reason) => reason.includes('kill_switch'))) {
    return 'kill_switch_active';
  }
  return 'risk_hold';
}

function hasValue(input) {
  return typeof input === 'string' && input.trim().length > 0;
}

function resolveChainId(input) {
  const value = safeNumber(input, NaN);
  if (value === ClobChain.POLYGON || value === ClobChain.AMOY) {
    return value;
  }
  return null;
}

function resolveSignatureType(input) {
  const value = safeNumber(input, NaN);
  if (
    value === ClobSignatureType.EOA ||
    value === ClobSignatureType.POLY_PROXY ||
    value === ClobSignatureType.POLY_GNOSIS_SAFE
  ) {
    return value;
  }
  return null;
}

function resolveOrderType(input) {
  const normalized = String(input || 'FOK').toUpperCase();
  if (normalized === ClobOrderType.GTC) return ClobOrderType.GTC;
  if (normalized === ClobOrderType.GTD) return ClobOrderType.GTD;
  if (normalized === ClobOrderType.FAK) return ClobOrderType.FAK;
  if (normalized === ClobOrderType.FOK) return ClobOrderType.FOK;
  return null;
}

function normalizePrivateKey(raw) {
  if (!hasValue(raw)) return null;
  const value = String(raw).trim();
  return value.startsWith('0x') ? value : `0x${value}`;
}

function asUnitPrice(input) {
  const value = safeNumber(input, NaN);
  if (!Number.isFinite(value) || value <= 0 || value >= 1) {
    return null;
  }
  return value;
}

function pricePrecision(price) {
  const normalized = String(price);
  const dot = normalized.indexOf('.');
  if (dot < 0) return 0;
  return normalized.length - dot - 1;
}

function roundToTick(price, tickSize) {
  const tick = safeNumber(tickSize, NaN);
  if (!Number.isFinite(tick) || tick <= 0) {
    return price;
  }
  const floor = tick;
  const ceil = 1 - tick;
  const rounded = Math.round(price / tick) * tick;
  const bounded = Math.min(ceil, Math.max(floor, rounded));
  return Number(bounded.toFixed(pricePrecision(tickSize)));
}

function extractErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return truncate(error.message);
  }
  if (error && typeof error === 'object' && hasValue(error.error)) {
    return truncate(error.error);
  }
  return truncate(JSON.stringify(error));
}

function extractStatusCode(error) {
  const fromApiError = safeNumber(error?.status, 0);
  if (fromApiError > 0) return fromApiError;
  const fromResponse = safeNumber(error?.response?.status, 0);
  if (fromResponse > 0) return fromResponse;
  const fromData = safeNumber(error?.data?.status, 0);
  if (fromData > 0) return fromData;
  const fromBody = safeNumber(error?.statusCode, 0);
  return fromBody > 0 ? fromBody : null;
}

function classifyClobError(statusCode, message, fallback) {
  if (statusCode === 451) return 'geo_blocked';
  if (GEO_BLOCK_HINT_PATTERN.test(message)) return 'geo_blocked';
  if (statusCode === 401) return 'clob_auth_failed';
  if (statusCode === 403 && !GEO_BLOCK_HINT_PATTERN.test(message)) return 'clob_auth_failed';
  if (statusCode === 429) return 'clob_rate_limited';
  if (statusCode && statusCode >= 500) return 'clob_unavailable';
  if (/timeout|socket|network|econn|enet|eai_again|transport|failed to fetch/i.test(message)) {
    return 'clob_unavailable';
  }
  return fallback;
}

function toFailureFromError(error, reasonBase, fallbackClassification) {
  const message = extractErrorMessage(error);
  const statusCode = extractStatusCode(error);
  const reason = statusCode ? `${reasonBase}_http_${statusCode}` : reasonBase;
  return {
    reason,
    classification: classifyClobError(statusCode, message, fallbackClassification),
    responseCode: statusCode,
    result: { error: message },
  };
}

export class PolymarketExecutionEngine {
  constructor(config, options = {}) {
    this.config = config;
    this.fetchImpl = options.fetchImpl || globalThis.fetch;
    this.liveClobRuntime = null;
    this.lastEligibilitySnapshot = null;
    if (typeof this.fetchImpl !== 'function') {
      throw new Error('fetch_unavailable');
    }
  }

  getLastEligibilitySnapshot() {
    return this.lastEligibilitySnapshot;
  }

  async probeVenueEligibility(options = {}) {
    const checkedAt = new Date().toISOString();
    const runtimeHint = options.runtime || null;
    const publicProbe = await this.#probePublicGeoStatus();
    const authenticatedProbe = await this.#probeAuthenticatedGeoStatus(runtimeHint);
    const merged = mergeEligibilityClassification(publicProbe.state, authenticatedProbe.state);
    const snapshot = {
      checkedAt,
      classification: merged.classification,
      reason: merged.reason,
      failClosed: merged.classification !== 'eligible',
      checks: {
        publicGeo: publicProbe.state,
        authenticatedGeo: authenticatedProbe.state,
      },
      sources: {
        publicGeo: publicProbe,
        authenticatedGeo: authenticatedProbe,
      },
    };
    this.lastEligibilitySnapshot = snapshot;
    return snapshot;
  }

  async execute(signal, decision, mode, options = {}) {
    const now = new Date().toISOString();
    const retryCeiling = this.#retryCeiling();
    const eligibilitySnapshot = options.eligibilitySnapshot || null;
    const orderIntent = {
      marketId: signal?.marketId || null,
      side: signal?.side || 'YES',
      requestedNotionalUsd: safeNumber(signal?.requestedNotionalUsd, 0),
      approvedNotionalUsd: safeNumber(decision?.approvedNotionalUsd, 0),
      strategy: signal?.strategy || 'unspecified',
      tokenId: signal?.clobTokenId || signal?.tokenId || null,
      executionProfileId: options.executionProfile?.id || null,
    };

    if (!decision || decision.action !== 'PLACE_ORDER') {
      return {
        status: 'not_executed',
        reason: 'decision_hold',
        mode,
        executionAt: now,
        adapters: { gamma: { status: 'skipped' }, clob: { status: 'skipped' } },
        failSafe: {
          action: 'HOLD',
          classification: classifyDecisionHold(decision?.failedReasons || []),
          retry: { attempts: 0, ceiling: retryCeiling, exhausted: false },
        },
        eligibilitySnapshot,
        orderIntent,
      };
    }

    if (mode === 'paper_sim') {
      return {
        status: 'paper_simulated',
        reason: 'paper_mode',
        mode,
        executionAt: now,
        adapters: { gamma: { status: 'skipped' }, clob: { status: 'skipped' } },
        failSafe: {
          action: 'HOLD',
          classification: 'paper_mode',
          retry: { attempts: 0, ceiling: retryCeiling, exhausted: false },
        },
        eligibilitySnapshot,
        orderIntent,
      };
    }

    const gamma = await this.#fetchGammaMarket(signal);
    const tokenId = pickTokenId(signal, gamma.market);
    orderIntent.tokenId = tokenId;

    if (!tokenId) {
      return {
        status: 'not_executed',
        reason: 'token_id_missing',
        mode,
        executionAt: now,
        adapters: {
          gamma,
          clob: { status: 'skipped', reason: 'token_id_missing' },
        },
        failSafe: {
          action: 'HOLD',
          classification: 'token_id_missing',
          retry: retrySummary(gamma.retry, retryCeiling),
        },
        eligibilitySnapshot,
        orderIntent,
      };
    }

    const orderbook = await this.#fetchClobOrderbook(tokenId);

    if (mode === 'staging_synth') {
      return {
        status: 'staging_synth_simulated',
        reason: 'staging_mode_no_live_order',
        mode,
        executionAt: now,
        adapters: {
          gamma,
          clob: {
            status: orderbook.status,
            reason: orderbook.reason || null,
            classification: orderbook.classification || null,
            snapshot: orderbook.snapshot || null,
            retry: orderbook.retry || null,
          },
        },
        failSafe:
          orderbook.status === 'ok' && gamma.status !== 'failed'
            ? null
            : {
                action: 'HOLD',
                classification: orderbook.classification || gamma.classification || 'market_data_unavailable',
                retry: retrySummary(orderbook.retry || gamma.retry, retryCeiling),
              },
        eligibilitySnapshot,
        orderIntent,
      };
    }

    if (mode !== 'live_limited') {
      return {
        status: 'not_executed',
        reason: `unsupported_mode:${mode}`,
        mode,
        executionAt: now,
        adapters: { gamma, clob: { status: 'skipped', reason: 'unsupported_mode' } },
        failSafe: {
          action: 'HOLD',
          classification: 'unsupported_mode',
          retry: { attempts: 0, ceiling: retryCeiling, exhausted: false },
        },
        eligibilitySnapshot,
        orderIntent,
      };
    }

    if (gamma.status !== 'ok') {
      return {
        status: 'not_executed',
        reason: gamma.reason || 'gamma_lookup_failed',
        mode,
        executionAt: now,
        adapters: {
          gamma,
          clob: { status: 'skipped', reason: 'gamma_lookup_failed' },
        },
        failSafe: {
          action: 'HOLD',
          classification: gamma.classification || 'gamma_lookup_failed',
          retry: retrySummary(gamma.retry, retryCeiling),
        },
        eligibilitySnapshot,
        orderIntent,
      };
    }

    if (orderbook.status !== 'ok') {
      return {
        status: 'not_executed',
        reason: orderbook.reason || 'clob_market_data_unavailable',
        mode,
        executionAt: now,
        adapters: {
          gamma,
          clob: {
            status: orderbook.status,
            reason: orderbook.reason || null,
            classification: orderbook.classification || null,
            snapshot: orderbook.snapshot || null,
            retry: orderbook.retry || null,
          },
        },
        failSafe: {
          action: 'HOLD',
          classification: orderbook.classification || 'clob_market_data_unavailable',
          retry: retrySummary(orderbook.retry, retryCeiling),
        },
        eligibilitySnapshot,
        orderIntent,
      };
    }

    if (!this.config.execution.enableLiveExecution) {
      return {
        status: 'not_executed',
        reason: 'live_execution_disabled',
        mode,
        executionAt: now,
        adapters: {
          gamma,
          clob: {
            status: orderbook.status,
            reason: 'live_execution_disabled',
            classification: null,
            snapshot: orderbook.snapshot || null,
            retry: orderbook.retry || null,
          },
        },
        failSafe: {
          action: 'HOLD',
          classification: 'live_execution_disabled',
          retry: { attempts: 0, ceiling: retryCeiling, exhausted: false },
        },
        eligibilitySnapshot,
        orderIntent,
      };
    }

    const submission = await this.#submitLiveOrder({
      tokenId,
      side: String(orderIntent.side || 'YES').toUpperCase(),
      notionalUsd: orderIntent.approvedNotionalUsd,
      strategy: orderIntent.strategy,
      marketId: orderIntent.marketId,
      requestedNotionalUsd: orderIntent.requestedNotionalUsd,
    }, orderbook.snapshot || null);

    if (submission.status !== 'live_submitted') {
      return {
        status: submission.status,
        reason: submission.reason || null,
        mode,
        executionAt: now,
        adapters: {
          gamma,
          clob: {
            status: submission.status,
            reason: submission.reason || null,
            classification: submission.classification || null,
            snapshot: orderbook.snapshot || null,
            responseCode: submission.responseCode ?? null,
            retry: submission.retry || null,
          },
        },
        failSafe: {
          action: 'HOLD',
          classification: submission.classification || 'clob_order_submit_failed',
          retry: retrySummary(submission.retry, retryCeiling),
        },
        eligibilitySnapshot: submission.result?.eligibilitySnapshot || eligibilitySnapshot,
        liveResult: submission.result || null,
        orderIntent,
      };
    }

    return {
      status: submission.status,
      reason: submission.reason || null,
      mode,
      executionAt: now,
      adapters: {
        gamma,
        clob: {
          status: submission.status,
          reason: submission.reason || null,
          classification: null,
          snapshot: orderbook.snapshot || null,
          responseCode: submission.responseCode ?? null,
          retry: submission.retry || null,
        },
      },
      failSafe: null,
      eligibilitySnapshot: submission.result?.eligibilitySnapshot || eligibilitySnapshot,
      liveResult: submission.result || null,
      orderIntent,
    };
  }

  async #fetchGammaMarket(signal) {
    const base = cleanBaseUrl(this.config.execution.gammaBaseUrl);
    const marketId = signal?.marketId ? String(signal.marketId) : '';
    const tokenId = signal?.clobTokenId
      ? String(signal.clobTokenId)
      : signal?.tokenId
        ? String(signal.tokenId)
        : '';
    const query = tokenId
      ? `/markets?clob_token_ids=${encodeURIComponent(tokenId)}&limit=1`
      : marketId
        ? `/markets?id=${encodeURIComponent(marketId)}&limit=1`
        : '';

    if (!query) {
      return {
        status: 'skipped',
        reason: 'market_lookup_input_missing',
        classification: 'market_lookup_input_missing',
        retry: { attempts: 0, ceiling: this.#retryCeiling(), exhausted: false },
        market: null,
      };
    }

    const res = await this.#requestJsonWithRetry(`${base}${query}`);
    if (!res.ok) {
      return {
        status: 'failed',
        reason: `gamma_http_${res.statusCode || 'transport'}`,
        classification: 'gamma_unavailable',
        retry: res.retry,
        market: null,
      };
    }

    const payload = res.body;
    const marketRaw = Array.isArray(payload) ? payload[0] : Array.isArray(payload?.data) ? payload.data[0] : payload;
    return {
      status: marketRaw ? 'ok' : 'empty',
      reason: marketRaw ? null : 'gamma_empty',
      classification: marketRaw ? null : 'gamma_empty',
      retry: res.retry,
      market: summarizeMarket(marketRaw),
    };
  }

  async #fetchClobOrderbook(tokenId) {
    const base = cleanBaseUrl(this.config.execution.clobBaseUrl);
    const bookRes = await this.#requestJsonWithRetry(
      `${base}/book?token_id=${encodeURIComponent(tokenId)}`,
    );
    const midRes = await this.#requestJsonWithRetry(
      `${base}/midpoint?token_id=${encodeURIComponent(tokenId)}`,
    );

    if (!bookRes.ok && !midRes.ok) {
      return {
        status: 'failed',
        reason: `clob_http_${bookRes.statusCode || midRes.statusCode || 'transport'}`,
        classification: 'clob_market_data_unavailable',
        retry: {
          attempts: Math.max(bookRes.retry.attempts, midRes.retry.attempts),
          ceiling: Math.max(bookRes.retry.ceiling, midRes.retry.ceiling),
          exhausted: Boolean(bookRes.retry.exhausted || midRes.retry.exhausted),
        },
        snapshot: null,
      };
    }

    const bids = bookRes.body?.bids ?? [];
    const asks = bookRes.body?.asks ?? [];
    const bestBid = parseBest(bids, 'bid');
    const bestAsk = parseBest(asks, 'ask');
    const midpoint = safeNumber(midRes.body?.mid ?? midRes.body?.midpoint ?? midRes.body?.price, NaN);

    return {
      status: 'ok',
      reason: null,
      classification: null,
      retry: {
        attempts: Math.max(bookRes.retry.attempts, midRes.retry.attempts),
        ceiling: Math.max(bookRes.retry.ceiling, midRes.retry.ceiling),
        exhausted: false,
      },
      snapshot: {
        tokenId,
        bestBid: bestBid ? { price: bestBid.price, size: bestBid.size } : null,
        bestAsk: bestAsk ? { price: bestAsk.price, size: bestAsk.size } : null,
        midpoint: Number.isFinite(midpoint) ? midpoint : null,
      },
    };
  }

  async #submitLiveOrder(orderPayload, orderbookSnapshot = null) {
    const runtime = await this.#getLiveClobRuntime();
    if (runtime.status !== 'ok') {
      return {
        status: 'live_submit_failed',
        reason: runtime.reason,
        classification: runtime.classification,
        responseCode: runtime.responseCode ?? null,
        retry: { attempts: 1, ceiling: this.#retryCeiling(), exhausted: false },
        result: runtime.result || null,
      };
    }

    const eligibilitySnapshot = await this.probeVenueEligibility({ runtime });
    if (this.config.execution.requireGeoOpen && eligibilitySnapshot.classification !== 'eligible') {
      return {
        status: 'not_executed',
        reason: `venue_eligibility_${eligibilitySnapshot.classification}`,
        classification:
          eligibilitySnapshot.classification === 'blocked'
            ? 'geo_blocked'
            : eligibilitySnapshot.classification === 'close_only'
              ? 'geo_close_only'
              : 'geo_block_check_failed',
        responseCode: null,
        retry: { attempts: 1, ceiling: this.#retryCeiling(), exhausted: false },
        result: { eligibilitySnapshot },
      };
    }

    const orderDraft = this.#buildLiveOrderDraft(orderPayload, orderbookSnapshot);
    if (!orderDraft.ok) {
      return {
        status: 'not_executed',
        reason: orderDraft.reason,
        classification: orderDraft.classification,
        responseCode: null,
        retry: { attempts: 1, ceiling: this.#retryCeiling(), exhausted: false },
        result: { error: orderDraft.message },
      };
    }

    let adjustedPrice = orderDraft.userOrder.price;
    try {
      const tickSize = await runtime.client.getTickSize(orderDraft.userOrder.tokenID);
      adjustedPrice = roundToTick(orderDraft.userOrder.price, tickSize);
    } catch (error) {
      const failure = toFailureFromError(error, 'clob_tick_size_lookup_failed', 'clob_market_data_unavailable');
      return {
        status: 'not_executed',
        reason: failure.reason,
        classification: failure.classification,
        responseCode: failure.responseCode,
        retry: { attempts: 1, ceiling: this.#retryCeiling(), exhausted: false },
        result: failure.result,
      };
    }

    try {
      const signedOrder = await runtime.client.createOrder({
        ...orderDraft.userOrder,
        price: adjustedPrice,
      });

      const response = await runtime.client.postOrder(
        signedOrder,
        orderDraft.orderType,
        Boolean(this.config.execution.liveOrderDeferExecution),
        Boolean(this.config.execution.liveOrderPostOnly),
      );

      if (response && typeof response === 'object' && Object.hasOwn(response, 'error')) {
        const errorLike = {
          status: response.status ?? null,
          error: typeof response.error === 'string' ? response.error : JSON.stringify(response.error),
        };
        const failure = toFailureFromError(errorLike, 'clob_order_submit_failed', 'clob_order_submit_failed');
        return {
          status: 'live_submit_failed',
          reason: failure.reason,
          classification: failure.classification,
          responseCode: failure.responseCode,
          retry: { attempts: 1, ceiling: this.#retryCeiling(), exhausted: false },
          result: failure.result,
        };
      }

      if (response && typeof response === 'object' && response.success === false) {
        const errorLike = {
          status: null,
          error: response.errorMsg || 'clob_order_rejected',
        };
        const failure = toFailureFromError(errorLike, 'clob_order_rejected', 'clob_order_submit_failed');
        return {
          status: 'live_submit_failed',
          reason: failure.reason,
          classification: failure.classification,
          responseCode: failure.responseCode,
          retry: { attempts: 1, ceiling: this.#retryCeiling(), exhausted: false },
          result: failure.result,
        };
      }

      return {
        status: 'live_submitted',
        reason: null,
        classification: null,
        responseCode: null,
        retry: { attempts: 1, ceiling: this.#retryCeiling(), exhausted: false },
        result: {
          ...(response && typeof response === 'object' ? response : { response }),
          adapter: 'clob_sdk',
          geoGate: eligibilitySnapshot.classification,
          eligibilitySnapshot,
          credsSource: runtime.credsSource,
          signerAddress: runtime.signerAddress,
          orderRequest: {
            tokenId: orderDraft.userOrder.tokenID,
            side: orderDraft.userOrder.side,
            orderType: orderDraft.orderType,
            notionalUsd: orderDraft.notionalUsd,
            size: orderDraft.userOrder.size,
            requestedPrice: orderDraft.userOrder.price,
            adjustedPrice,
          },
        },
      };
    } catch (error) {
      const failure = toFailureFromError(error, 'clob_order_submit_failed', 'clob_order_submit_failed');
      return {
        status: 'live_submit_failed',
        reason: failure.reason,
        classification: failure.classification,
        responseCode: failure.responseCode,
        retry: { attempts: 1, ceiling: this.#retryCeiling(), exhausted: false },
        result: failure.result,
      };
    }
  }

  #buildLiveOrderDraft(orderPayload, orderbookSnapshot) {
    const tokenId = hasValue(orderPayload?.tokenId) ? String(orderPayload.tokenId).trim() : '';
    if (!tokenId) {
      return {
        ok: false,
        reason: 'token_id_missing',
        classification: 'token_id_missing',
        message: 'token_id_missing',
      };
    }

    const orderType = resolveOrderType(this.config.execution.liveOrderType);
    if (!orderType) {
      return {
        ok: false,
        reason: 'clob_order_type_invalid',
        classification: 'clob_auth_config_missing',
        message: 'PSNP_POLY_LIVE_ORDER_TYPE_invalid',
      };
    }

    const sideInput = String(orderPayload?.side || 'YES').toUpperCase();
    const side = sideInput === 'NO' || sideInput === 'SELL' ? ClobSide.SELL : ClobSide.BUY;
    const notionalUsd = safeNumber(orderPayload?.notionalUsd, 0);

    if (!(notionalUsd > 0)) {
      return {
        ok: false,
        reason: 'approved_notional_invalid',
        classification: 'risk_hold',
        message: 'approved_notional_invalid',
      };
    }

    const price = this.#chooseLivePrice(side, orderbookSnapshot);
    if (!Number.isFinite(price)) {
      return {
        ok: false,
        reason: 'clob_price_unavailable',
        classification: 'clob_market_data_unavailable',
        message: 'clob_price_unavailable',
      };
    }

    const size = Number((notionalUsd / price).toFixed(6));
    if (!(size > 0)) {
      return {
        ok: false,
        reason: 'clob_size_invalid',
        classification: 'clob_order_submit_failed',
        message: 'clob_size_invalid',
      };
    }

    return {
      ok: true,
      orderType,
      notionalUsd,
      userOrder: {
        tokenID: tokenId,
        side,
        price: Number(price.toFixed(4)),
        size,
      },
    };
  }

  #chooseLivePrice(side, snapshot) {
    const bestBid = asUnitPrice(snapshot?.bestBid?.price);
    const bestAsk = asUnitPrice(snapshot?.bestAsk?.price);
    const midpoint = asUnitPrice(snapshot?.midpoint);

    if (side === ClobSide.BUY) {
      return bestAsk ?? midpoint ?? bestBid ?? NaN;
    }
    return bestBid ?? midpoint ?? bestAsk ?? NaN;
  }

  async #getLiveClobRuntime() {
    if (this.liveClobRuntime && this.liveClobRuntime.status === 'ok') {
      return this.liveClobRuntime;
    }
    const runtime = await this.#buildLiveClobRuntime();
    if (runtime.status === 'ok') {
      this.liveClobRuntime = runtime;
    }
    return runtime;
  }

  async #buildLiveClobRuntime() {
    const auth = this.config.execution.auth || {};
    const chainId = resolveChainId(this.config.execution.chainId);
    const signatureType = resolveSignatureType(this.config.execution.signatureType);
    const baseUrl = cleanBaseUrl(this.config.execution.clobBaseUrl);

    if (!chainId) {
      return {
        status: 'failed',
        reason: 'clob_chain_id_invalid',
        classification: 'clob_auth_config_missing',
        responseCode: null,
        result: { error: 'PSNP_POLY_CHAIN_ID_invalid' },
      };
    }

    if (signatureType === null) {
      return {
        status: 'failed',
        reason: 'clob_signature_type_invalid',
        classification: 'clob_auth_config_missing',
        responseCode: null,
        result: { error: 'PSNP_POLY_SIGNATURE_TYPE_invalid' },
      };
    }

    if (!hasValue(auth.funderAddress)) {
      return {
        status: 'failed',
        reason: 'clob_funder_missing',
        classification: 'clob_auth_config_missing',
        responseCode: null,
        result: { error: 'PSNP_POLY_FUNDER_ADDRESS_missing' },
      };
    }

    const privateKey = normalizePrivateKey(auth.privateKey);
    if (!privateKey) {
      return {
        status: 'failed',
        reason: 'clob_signer_missing',
        classification: 'clob_auth_config_missing',
        responseCode: null,
        result: { error: 'PSNP_POLY_WALLET_PRIVATE_KEY_missing' },
      };
    }

    let signer;
    try {
      signer = new Wallet(privateKey);
    } catch (error) {
      const failure = toFailureFromError(error, 'clob_signer_invalid', 'clob_auth_config_missing');
      return { status: 'failed', ...failure };
    }

    const makeClient = (creds) =>
      new ClobClient(
        baseUrl,
        chainId,
        signer,
        creds,
        signatureType,
        String(auth.funderAddress).trim(),
        hasValue(auth.geoBlockToken) ? String(auth.geoBlockToken).trim() : undefined,
        Boolean(this.config.execution.useServerTime),
        undefined,
        undefined,
        true,
        undefined,
        true,
      );

    let credsSource = 'env';
    let creds = null;
    const envCredsAvailable =
      hasValue(auth.apiKey) && hasValue(auth.apiSecret) && hasValue(auth.apiPassphrase);

    if (envCredsAvailable) {
      creds = {
        key: String(auth.apiKey).trim(),
        secret: String(auth.apiSecret).trim(),
        passphrase: String(auth.apiPassphrase).trim(),
      };
    } else if (Boolean(auth.deriveApiCreds)) {
      try {
        creds = await makeClient(undefined).createOrDeriveApiKey();
        credsSource = 'derived';
      } catch (error) {
        const failure = toFailureFromError(error, 'clob_api_creds_derive_failed', 'clob_auth_failed');
        return { status: 'failed', ...failure };
      }
    } else {
      return {
        status: 'failed',
        reason: 'clob_api_creds_missing',
        classification: 'clob_auth_config_missing',
        responseCode: null,
        result: {
          error:
            'PSNP_POLY_CLOB_API_KEY/SECRET/PASSPHRASE_missing_and_PSNP_POLY_DERIVE_API_CREDS_disabled',
        },
      };
    }

    if (!creds?.key || !creds?.secret || !creds?.passphrase) {
      return {
        status: 'failed',
        reason: 'clob_api_creds_invalid',
        classification: 'clob_auth_failed',
        responseCode: null,
        result: { error: 'clob_api_creds_invalid' },
      };
    }

    const signerAddress = await signer.getAddress();
    return {
      status: 'ok',
      client: makeClient(creds),
      signerAddress,
      credsSource,
    };
  }

  async #probePublicGeoStatus() {
    const base = cleanBaseUrl(this.config.execution.clobBaseUrl);
    const path = String(this.config.execution.publicGeoPath || '/closed-only').trim();
    const headers = {};

    if (hasValue(this.config.execution.auth?.bearerToken)) {
      headers.Authorization = `Bearer ${String(this.config.execution.auth.bearerToken).trim()}`;
    }

    const res = await this.#requestJsonWithRetry(`${base}${path.startsWith('/') ? path : `/${path}`}`, {
      headers,
    });

    if (!res.ok) {
      return {
        state: 'unknown',
        reason: `public_geo_http_${res.statusCode || 'transport'}`,
        classification: 'geo_block_check_failed',
        responseCode: res.statusCode || null,
        retry: res.retry,
        payload: {},
      };
    }

    const state = normalizeGeoStateFromPayload(res.body, res.rawText);
    return {
      state,
      reason: state === 'open' ? null : `public_geo_${state}`,
      classification:
        state === 'blocked' ? 'geo_blocked' : state === 'close_only' ? 'geo_close_only' : null,
      responseCode: res.statusCode || null,
      retry: res.retry,
      payload: res.body || {},
    };
  }

  async #probeAuthenticatedGeoStatus(runtimeHint = null) {
    const runtime = runtimeHint || (await this.#getLiveClobRuntime());
    if (!runtime || runtime.status !== 'ok') {
      return {
        state: 'unknown',
        reason: runtime?.reason || 'auth_runtime_unavailable',
        classification: runtime?.classification || 'clob_auth_config_missing',
        responseCode: runtime?.responseCode ?? null,
        retry: { attempts: 1, ceiling: this.#retryCeiling(), exhausted: false },
        payload: runtime?.result || {},
      };
    }

    try {
      const status = await runtime.client.getClosedOnlyMode();
      const state = normalizeGeoStateFromPayload(status || {}, '');
      return {
        state,
        reason: state === 'open' ? null : `authenticated_geo_${state}`,
        classification:
          state === 'blocked' ? 'geo_blocked' : state === 'close_only' ? 'geo_close_only' : null,
        responseCode: 200,
        retry: { attempts: 1, ceiling: this.#retryCeiling(), exhausted: false },
        payload: status || {},
      };
    } catch (error) {
      const failure = toFailureFromError(error, 'authenticated_geo_check_failed', 'geo_block_check_failed');
      return {
        state: 'unknown',
        reason: failure.reason,
        classification: failure.classification,
        responseCode: failure.responseCode,
        retry: { attempts: 1, ceiling: this.#retryCeiling(), exhausted: false },
        payload: failure.result || {},
      };
    }
  }

  #retryCeiling() {
    return Math.max(1, safeNumber(this.config.execution.providerRetryCeiling, 2));
  }

  async #requestJsonWithRetry(url, options = {}) {
    const ceiling = this.#retryCeiling();
    let attempts = 0;
    let last = null;

    while (attempts < ceiling) {
      attempts += 1;
      const res = await this.#requestJson(url, options);
      last = res;
      const retryable = !res.ok && RETRYABLE_STATUS_CODES.has(res.statusCode);
      if (res.ok || !retryable || attempts >= ceiling) {
        return {
          ...res,
          retry: {
            attempts,
            ceiling,
            exhausted: Boolean(!res.ok && retryable && attempts >= ceiling),
          },
        };
      }
    }

    return {
      ...(last || { ok: false, statusCode: 0, body: {}, rawText: 'retry_loop_uninitialized' }),
      retry: {
        attempts,
        ceiling,
        exhausted: true,
      },
    };
  }

  async #requestJson(url, options = {}) {
    const timeoutMs = this.config.execution.requestTimeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await this.fetchImpl(url, {
        ...options,
        signal: controller.signal,
      });
      const rawText = await response.text();
      const body = parseJsonMaybe(rawText) || {};
      return {
        ok: response.ok,
        statusCode: response.status,
        body,
        rawText,
      };
    } catch (error) {
      return {
        ok: false,
        statusCode: 0,
        body: {},
        rawText: truncate(error instanceof Error ? error.message : String(error)),
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
