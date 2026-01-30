'use client';

import { useState, useCallback } from 'react';
import { useL4yercak3Client } from '../provider';
import type {
  Organization,
  OrganizationCreateInput,
  OrganizationListParams,
  PaginatedResponse,
} from '../../types';

export interface UseOrganizationsResult {
  /** Current list of organizations */
  organizations: Organization[];
  /** Whether a request is in progress */
  loading: boolean;
  /** Last error that occurred */
  error: Error | null;
  /** Total count of organizations (from last fetch) */
  total: number;
  /** Whether there are more organizations to load */
  hasMore: boolean;
  /** Fetch organizations with optional filters */
  fetchOrganizations: (params?: OrganizationListParams) => Promise<PaginatedResponse<Organization>>;
  /** Get a single organization by ID */
  getOrganization: (id: string, options?: { includeContacts?: boolean }) => Promise<Organization>;
  /** Create a new organization */
  createOrganization: (data: OrganizationCreateInput) => Promise<Organization>;
  /** Update an existing organization */
  updateOrganization: (id: string, data: Partial<OrganizationCreateInput>) => Promise<Organization>;
  /** Delete an organization */
  deleteOrganization: (id: string) => Promise<void>;
  /** Reset error state */
  clearError: () => void;
}

/**
 * Hook for managing B2B organizations in your CRM.
 *
 * @example
 * ```tsx
 * function OrganizationList() {
 *   const { organizations, loading, fetchOrganizations } = useOrganizations();
 *
 *   useEffect(() => {
 *     fetchOrganizations({ subtype: 'customer' });
 *   }, []);
 *
 *   return (
 *     <ul>
 *       {organizations.map(org => (
 *         <li key={org.id}>{org.name}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useOrganizations(): UseOrganizationsResult {
  const client = useL4yercak3Client();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchOrganizations = useCallback(
    async (params?: OrganizationListParams): Promise<PaginatedResponse<Organization>> => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.organizations.list(params);
        setOrganizations(result.items);
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

  const getOrganization = useCallback(
    async (id: string, options?: { includeContacts?: boolean }): Promise<Organization> => {
      setLoading(true);
      setError(null);
      try {
        return await client.organizations.get(id, options);
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

  const createOrganization = useCallback(
    async (data: OrganizationCreateInput): Promise<Organization> => {
      setLoading(true);
      setError(null);
      try {
        const org = await client.organizations.create(data);
        setOrganizations((prev) => [...prev, org]);
        setTotal((prev) => prev + 1);
        return org;
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

  const updateOrganization = useCallback(
    async (id: string, data: Partial<OrganizationCreateInput>): Promise<Organization> => {
      setLoading(true);
      setError(null);
      try {
        const updated = await client.organizations.update(id, data);
        setOrganizations((prev) => prev.map((o) => (o.id === id ? updated : o)));
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

  const deleteOrganization = useCallback(
    async (id: string): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        await client.organizations.delete(id);
        setOrganizations((prev) => prev.filter((o) => o.id !== id));
        setTotal((prev) => prev - 1);
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
    organizations,
    loading,
    error,
    total,
    hasMore,
    fetchOrganizations,
    getOrganization,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    clearError,
  };
}
