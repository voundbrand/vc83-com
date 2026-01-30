'use client';

import { useState, useCallback } from 'react';
import { useL4yercak3Client } from '../provider';
import type {
  BenefitClaim,
  BenefitClaimInput,
  BenefitClaimListParams,
  CommissionPayout,
  CommissionPayoutListParams,
  PaginatedResponse,
} from '../../types';

export interface UseBenefitClaimsResult {
  /** Current list of benefit claims */
  claims: BenefitClaim[];
  /** Whether a request is in progress */
  loading: boolean;
  /** Last error that occurred */
  error: Error | null;
  /** Total count of claims (from last fetch) */
  total: number;
  /** Whether there are more claims to load */
  hasMore: boolean;
  /** Fetch claims with optional filters */
  fetchClaims: (params?: BenefitClaimListParams) => Promise<PaginatedResponse<BenefitClaim>>;
  /** Get a single claim by ID */
  getClaim: (id: string) => Promise<BenefitClaim>;
  /** Create a new benefit claim */
  createClaim: (data: BenefitClaimInput) => Promise<BenefitClaim>;
  /** Approve a benefit claim */
  approveClaim: (id: string, notes?: string) => Promise<BenefitClaim>;
  /** Reject a benefit claim */
  rejectClaim: (id: string, reason: string) => Promise<BenefitClaim>;
  /** Reset error state */
  clearError: () => void;
}

/**
 * Hook for managing benefit claims.
 *
 * @example
 * ```tsx
 * function ClaimsList({ memberId }) {
 *   const { claims, loading, fetchClaims } = useBenefitClaims();
 *
 *   useEffect(() => {
 *     fetchClaims({ memberId, status: 'pending' });
 *   }, [memberId]);
 *
 *   return (
 *     <ul>
 *       {claims.map(claim => (
 *         <li key={claim.id}>
 *           {claim.benefitType} - ${(claim.amountInCents / 100).toFixed(2)}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useBenefitClaims(): UseBenefitClaimsResult {
  const client = useL4yercak3Client();
  const [claims, setClaims] = useState<BenefitClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchClaims = useCallback(
    async (params?: BenefitClaimListParams): Promise<PaginatedResponse<BenefitClaim>> => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.benefits.listClaims(params);
        setClaims(result.items);
        setTotal(result.total);
        setHasMore(result.hasMore);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  const getClaim = useCallback(
    async (id: string): Promise<BenefitClaim> => {
      setLoading(true);
      setError(null);
      try {
        return await client.benefits.getClaim(id);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  const createClaim = useCallback(
    async (data: BenefitClaimInput): Promise<BenefitClaim> => {
      setLoading(true);
      setError(null);
      try {
        const claim = await client.benefits.createClaim(data);
        setClaims((prev) => [claim, ...prev]);
        setTotal((prev) => prev + 1);
        return claim;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  const approveClaim = useCallback(
    async (id: string, notes?: string): Promise<BenefitClaim> => {
      setLoading(true);
      setError(null);
      try {
        const updated = await client.benefits.approveClaim(id, notes);
        setClaims((prev) => prev.map((c) => (c.id === id ? updated : c)));
        return updated;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  const rejectClaim = useCallback(
    async (id: string, reason: string): Promise<BenefitClaim> => {
      setLoading(true);
      setError(null);
      try {
        const updated = await client.benefits.rejectClaim(id, reason);
        setClaims((prev) => prev.map((c) => (c.id === id ? updated : c)));
        return updated;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    claims,
    loading,
    error,
    total,
    hasMore,
    fetchClaims,
    getClaim,
    createClaim,
    approveClaim,
    rejectClaim,
    clearError,
  };
}

export interface UseCommissionsResult {
  /** Current list of commission payouts */
  commissions: CommissionPayout[];
  /** Whether a request is in progress */
  loading: boolean;
  /** Last error that occurred */
  error: Error | null;
  /** Total count of commissions (from last fetch) */
  total: number;
  /** Whether there are more commissions to load */
  hasMore: boolean;
  /** Fetch commissions with optional filters */
  fetchCommissions: (params?: CommissionPayoutListParams) => Promise<PaginatedResponse<CommissionPayout>>;
  /** Get a single commission payout by ID */
  getCommission: (id: string) => Promise<CommissionPayout>;
  /** Reset error state */
  clearError: () => void;
}

/**
 * Hook for viewing commission payouts.
 *
 * @example
 * ```tsx
 * function CommissionHistory({ memberId }) {
 *   const { commissions, loading, fetchCommissions } = useCommissions();
 *
 *   useEffect(() => {
 *     fetchCommissions({ memberId, status: 'completed' });
 *   }, [memberId]);
 *
 *   return (
 *     <ul>
 *       {commissions.map(commission => (
 *         <li key={commission.id}>
 *           {commission.commissionType} - ${(commission.amountInCents / 100).toFixed(2)}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useCommissions(): UseCommissionsResult {
  const client = useL4yercak3Client();
  const [commissions, setCommissions] = useState<CommissionPayout[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchCommissions = useCallback(
    async (params?: CommissionPayoutListParams): Promise<PaginatedResponse<CommissionPayout>> => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.benefits.listCommissions(params);
        setCommissions(result.items);
        setTotal(result.total);
        setHasMore(result.hasMore);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  const getCommission = useCallback(
    async (id: string): Promise<CommissionPayout> => {
      setLoading(true);
      setError(null);
      try {
        return await client.benefits.getCommission(id);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    commissions,
    loading,
    error,
    total,
    hasMore,
    fetchCommissions,
    getCommission,
    clearError,
  };
}
