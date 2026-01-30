'use client';

import { useState, useCallback } from 'react';
import { useL4yercak3Client } from '../provider';
import type { Invoice, InvoiceCreateInput, InvoiceListParams, PaginatedResponse } from '../../types';

export interface UseInvoicesResult {
  /** Current list of invoices */
  invoices: Invoice[];
  /** Whether a request is in progress */
  loading: boolean;
  /** Last error that occurred */
  error: Error | null;
  /** Total count of invoices (from last fetch) */
  total: number;
  /** Whether there are more invoices to load */
  hasMore: boolean;
  /** Fetch invoices with optional filters */
  fetchInvoices: (params?: InvoiceListParams) => Promise<PaginatedResponse<Invoice>>;
  /** Get a single invoice by ID */
  getInvoice: (id: string) => Promise<Invoice>;
  /** Create a new invoice */
  createInvoice: (data: InvoiceCreateInput) => Promise<Invoice>;
  /** Send an invoice */
  sendInvoice: (id: string, options?: { emailTo?: string; message?: string }) => Promise<void>;
  /** Mark an invoice as paid */
  markPaid: (id: string, data?: { paidAt?: string; paymentMethod?: string; paymentReference?: string }) => Promise<Invoice>;
  /** Get the PDF URL for an invoice */
  getPdf: (id: string) => Promise<{ pdfUrl: string }>;
  /** Void an invoice */
  voidInvoice: (id: string) => Promise<Invoice>;
  /** Reset error state */
  clearError: () => void;
}

/**
 * Hook for managing invoices.
 *
 * @example
 * ```tsx
 * function InvoiceList({ organizationId }) {
 *   const { invoices, loading, fetchInvoices, sendInvoice } = useInvoices();
 *
 *   useEffect(() => {
 *     fetchInvoices({ organizationId, status: 'sent' });
 *   }, [organizationId]);
 *
 *   return (
 *     <table>
 *       <tbody>
 *         {invoices.map(invoice => (
 *           <tr key={invoice.id}>
 *             <td>{invoice.number}</td>
 *             <td>${(invoice.totalInCents / 100).toFixed(2)}</td>
 *             <td>{invoice.status}</td>
 *           </tr>
 *         ))}
 *       </tbody>
 *     </table>
 *   );
 * }
 * ```
 */
export function useInvoices(): UseInvoicesResult {
  const client = useL4yercak3Client();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchInvoices = useCallback(
    async (params?: InvoiceListParams): Promise<PaginatedResponse<Invoice>> => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.invoices.list(params);
        setInvoices(result.items);
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

  const getInvoice = useCallback(
    async (id: string): Promise<Invoice> => {
      setLoading(true);
      setError(null);
      try {
        return await client.invoices.get(id);
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

  const createInvoice = useCallback(
    async (data: InvoiceCreateInput): Promise<Invoice> => {
      setLoading(true);
      setError(null);
      try {
        const invoice = await client.invoices.create(data);
        setInvoices((prev) => [...prev, invoice]);
        setTotal((prev) => prev + 1);
        return invoice;
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

  const sendInvoice = useCallback(
    async (id: string, options?: { emailTo?: string; message?: string }): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        await client.invoices.send(id, options);
        setInvoices((prev) =>
          prev.map((inv) => (inv.id === id ? { ...inv, status: 'sent' as const } : inv))
        );
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

  const markPaid = useCallback(
    async (
      id: string,
      data?: { paidAt?: string; paymentMethod?: string; paymentReference?: string }
    ): Promise<Invoice> => {
      setLoading(true);
      setError(null);
      try {
        const updated = await client.invoices.markPaid(id, data);
        setInvoices((prev) => prev.map((inv) => (inv.id === id ? updated : inv)));
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

  const getPdf = useCallback(
    async (id: string): Promise<{ pdfUrl: string }> => {
      setError(null);
      try {
        return await client.invoices.getPdf(id);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      }
    },
    [client]
  );

  const voidInvoice = useCallback(
    async (id: string): Promise<Invoice> => {
      setLoading(true);
      setError(null);
      try {
        const updated = await client.invoices.void(id);
        setInvoices((prev) => prev.map((inv) => (inv.id === id ? updated : inv)));
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
    invoices,
    loading,
    error,
    total,
    hasMore,
    fetchInvoices,
    getInvoice,
    createInvoice,
    sendInvoice,
    markPaid,
    getPdf,
    voidInvoice,
    clearError,
  };
}
