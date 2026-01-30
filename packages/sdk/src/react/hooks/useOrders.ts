'use client';

import { useState, useCallback } from 'react';
import { useL4yercak3Client } from '../provider';
import type { Order, OrderListParams, PaginatedResponse } from '../../types';

export interface UseOrdersResult {
  /** Current list of orders */
  orders: Order[];
  /** Whether a request is in progress */
  loading: boolean;
  /** Last error that occurred */
  error: Error | null;
  /** Total count of orders (from last fetch) */
  total: number;
  /** Whether there are more orders to load */
  hasMore: boolean;
  /** Fetch orders with optional filters */
  fetchOrders: (params?: OrderListParams) => Promise<PaginatedResponse<Order>>;
  /** Get a single order by ID */
  getOrder: (id: string) => Promise<Order>;
  /** Get an order by order number */
  getOrderByNumber: (orderNumber: string) => Promise<Order>;
  /** Reset error state */
  clearError: () => void;
}

/**
 * Hook for managing orders.
 *
 * @example
 * ```tsx
 * function OrderHistory({ contactId }) {
 *   const { orders, loading, fetchOrders } = useOrders();
 *
 *   useEffect(() => {
 *     fetchOrders({ contactId, status: 'paid' });
 *   }, [contactId]);
 *
 *   return (
 *     <div>
 *       {orders.map(order => (
 *         <OrderCard key={order.id} order={order} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useOrders(): UseOrdersResult {
  const client = useL4yercak3Client();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchOrders = useCallback(
    async (params?: OrderListParams): Promise<PaginatedResponse<Order>> => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.orders.list(params);
        setOrders(result.items);
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

  const getOrder = useCallback(
    async (id: string): Promise<Order> => {
      setLoading(true);
      setError(null);
      try {
        return await client.orders.get(id);
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

  const getOrderByNumber = useCallback(
    async (orderNumber: string): Promise<Order> => {
      setLoading(true);
      setError(null);
      try {
        return await client.orders.getByOrderNumber(orderNumber);
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
    orders,
    loading,
    error,
    total,
    hasMore,
    fetchOrders,
    getOrder,
    getOrderByNumber,
    clearError,
  };
}
