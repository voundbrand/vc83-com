'use client';

import { useState, useCallback } from 'react';
import { useL4yercak3Client } from '../provider';
import type {
  Product,
  ProductListParams,
  CheckoutSession,
  CheckoutSessionCreateInput,
  PaginatedResponse,
} from '../../types';

export interface UseProductsResult {
  /** Current list of products */
  products: Product[];
  /** Whether a request is in progress */
  loading: boolean;
  /** Last error that occurred */
  error: Error | null;
  /** Total count of products (from last fetch) */
  total: number;
  /** Whether there are more products to load */
  hasMore: boolean;
  /** Fetch products with optional filters */
  fetchProducts: (params?: ProductListParams) => Promise<PaginatedResponse<Product>>;
  /** Get a single product by ID */
  getProduct: (id: string) => Promise<Product>;
  /** Reset error state */
  clearError: () => void;
}

/**
 * Hook for fetching products.
 *
 * @example
 * ```tsx
 * function ProductCatalog({ eventId }) {
 *   const { products, loading, fetchProducts } = useProducts();
 *
 *   useEffect(() => {
 *     fetchProducts({ eventId, status: 'active' });
 *   }, [eventId]);
 *
 *   return (
 *     <div className="grid grid-cols-3 gap-4">
 *       {products.map(product => (
 *         <ProductCard key={product.id} product={product} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useProducts(): UseProductsResult {
  const client = useL4yercak3Client();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchProducts = useCallback(
    async (params?: ProductListParams): Promise<PaginatedResponse<Product>> => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.products.list(params);
        setProducts(result.items);
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

  const getProduct = useCallback(
    async (id: string): Promise<Product> => {
      setLoading(true);
      setError(null);
      try {
        return await client.products.get(id);
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
    products,
    loading,
    error,
    total,
    hasMore,
    fetchProducts,
    getProduct,
    clearError,
  };
}

export interface CartItem {
  productId: string;
  quantity: number;
  product?: Product;
}

export interface UseCheckoutResult {
  /** Current cart items */
  cart: CartItem[];
  /** Whether a checkout is being created */
  isCreatingCheckout: boolean;
  /** Last error that occurred */
  error: Error | null;
  /** Current checkout session (if created) */
  checkoutSession: CheckoutSession | null;
  /** Add an item to the cart */
  addToCart: (productId: string, quantity?: number) => void;
  /** Remove an item from the cart */
  removeFromCart: (productId: string) => void;
  /** Update quantity of an item */
  updateQuantity: (productId: string, quantity: number) => void;
  /** Clear the cart */
  clearCart: () => void;
  /** Create a checkout session and redirect to payment */
  createCheckoutSession: (options: Omit<CheckoutSessionCreateInput, 'items'>) => Promise<CheckoutSession>;
  /** Get an existing checkout session by ID */
  getCheckoutSession: (sessionId: string) => Promise<CheckoutSession>;
  /** Reset error state */
  clearError: () => void;
}

/**
 * Hook for managing shopping cart and checkout.
 *
 * @example
 * ```tsx
 * function ProductCard({ product }) {
 *   const { addToCart } = useCheckout();
 *
 *   return (
 *     <div>
 *       <h3>{product.name}</h3>
 *       <p>${(product.priceInCents / 100).toFixed(2)}</p>
 *       <button onClick={() => addToCart(product.id)}>
 *         Add to Cart
 *       </button>
 *     </div>
 *   );
 * }
 *
 * function CartSummary() {
 *   const { cart, createCheckoutSession, isCreatingCheckout } = useCheckout();
 *
 *   const handleCheckout = async () => {
 *     const session = await createCheckoutSession({
 *       successUrl: '/checkout/success',
 *       cancelUrl: '/checkout/cancelled',
 *     });
 *     // Redirect to Stripe checkout
 *     window.location.href = session.checkoutUrl;
 *   };
 *
 *   return (
 *     <div>
 *       <p>{cart.length} items in cart</p>
 *       <button onClick={handleCheckout} disabled={isCreatingCheckout || cart.length === 0}>
 *         {isCreatingCheckout ? 'Creating checkout...' : 'Proceed to Checkout'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useCheckout(): UseCheckoutResult {
  const client = useL4yercak3Client();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [checkoutSession, setCheckoutSession] = useState<CheckoutSession | null>(null);

  const addToCart = useCallback((productId: string, quantity: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { productId, quantity }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.productId !== productId));
    } else {
      setCart((prev) =>
        prev.map((item) =>
          item.productId === productId ? { ...item, quantity } : item
        )
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const createCheckoutSession = useCallback(
    async (options: Omit<CheckoutSessionCreateInput, 'items'>): Promise<CheckoutSession> => {
      if (cart.length === 0) {
        throw new Error('Cart is empty');
      }

      setIsCreatingCheckout(true);
      setError(null);
      try {
        const session = await client.checkout.createSession({
          ...options,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        });
        setCheckoutSession(session);
        return session;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setIsCreatingCheckout(false);
      }
    },
    [client, cart]
  );

  const getCheckoutSession = useCallback(
    async (sessionId: string): Promise<CheckoutSession> => {
      setError(null);
      try {
        const session = await client.checkout.getSession(sessionId);
        setCheckoutSession(session);
        return session;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      }
    },
    [client]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    cart,
    isCreatingCheckout,
    error,
    checkoutSession,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    createCheckoutSession,
    getCheckoutSession,
    clearError,
  };
}
