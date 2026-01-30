'use client';

import { useState, useCallback } from 'react';
import { useL4yercak3Client } from '../provider';
import type { Certificate, PaginatedResponse } from '../../types';

export interface UseCertificatesResult {
  /** Current list of certificates */
  certificates: Certificate[];
  /** Whether a request is in progress */
  loading: boolean;
  /** Last error that occurred */
  error: Error | null;
  /** Total count of certificates (from last fetch) */
  total: number;
  /** Whether there are more certificates to load */
  hasMore: boolean;
  /** Fetch certificates with optional filters */
  fetchCertificates: (params?: { recipientId?: string; eventId?: string; limit?: number }) => Promise<PaginatedResponse<Certificate>>;
  /** Get a single certificate by ID */
  getCertificate: (id: string) => Promise<Certificate>;
  /** Verify a certificate by certificate number */
  verifyCertificate: (certificateNumber: string) => Promise<Certificate>;
  /** Reset error state */
  clearError: () => void;
}

/**
 * Hook for managing certificates.
 *
 * @example
 * ```tsx
 * function CertificateList({ recipientId }) {
 *   const { certificates, loading, fetchCertificates } = useCertificates();
 *
 *   useEffect(() => {
 *     fetchCertificates({ recipientId });
 *   }, [recipientId]);
 *
 *   return (
 *     <div className="grid gap-4">
 *       {certificates.map(cert => (
 *         <CertificateCard key={cert.id} certificate={cert} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCertificates(): UseCertificatesResult {
  const client = useL4yercak3Client();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchCertificates = useCallback(
    async (params?: { recipientId?: string; eventId?: string; limit?: number }): Promise<PaginatedResponse<Certificate>> => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.certificates.list(params);
        setCertificates(result.items);
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

  const getCertificate = useCallback(
    async (id: string): Promise<Certificate> => {
      setLoading(true);
      setError(null);
      try {
        return await client.certificates.get(id);
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

  const verifyCertificate = useCallback(
    async (certificateNumber: string): Promise<Certificate> => {
      setLoading(true);
      setError(null);
      try {
        return await client.certificates.verify(certificateNumber);
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
    certificates,
    loading,
    error,
    total,
    hasMore,
    fetchCertificates,
    getCertificate,
    verifyCertificate,
    clearError,
  };
}
