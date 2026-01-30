'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { L4yercak3Client, type L4yercak3ClientConfig } from '../client';

interface L4yercak3ContextValue {
  client: L4yercak3Client;
  organizationId?: string;
}

const L4yercak3Context = createContext<L4yercak3ContextValue | null>(null);

export interface L4yercak3ProviderProps {
  children: ReactNode;
  /** API key for authentication. If not provided, uses NEXT_PUBLIC_L4YERCAK3_API_KEY */
  apiKey?: string;
  /** Organization ID to scope requests. If not provided, uses L4YERCAK3_ORG_ID */
  organizationId?: string;
  /** Base URL for the API. If not provided, uses NEXT_PUBLIC_L4YERCAK3_URL */
  baseUrl?: string;
  /** Pre-configured client instance (optional, overrides other props) */
  client?: L4yercak3Client;
}

/**
 * Provider component for LayerCake SDK.
 * Wrap your app with this provider to use the SDK hooks.
 *
 * @example
 * ```tsx
 * // In your app/layout.tsx
 * import { L4yercak3Provider } from '@l4yercak3/sdk/react';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <L4yercak3Provider>
 *           {children}
 *         </L4yercak3Provider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function L4yercak3Provider({
  children,
  apiKey,
  organizationId,
  baseUrl,
  client: providedClient,
}: L4yercak3ProviderProps) {
  const client = useMemo(() => {
    if (providedClient) {
      return providedClient;
    }

    const config: L4yercak3ClientConfig = {};
    if (apiKey) config.apiKey = apiKey;
    if (organizationId) config.organizationId = organizationId;
    if (baseUrl) config.baseUrl = baseUrl;

    return new L4yercak3Client(config);
  }, [providedClient, apiKey, organizationId, baseUrl]);

  const value = useMemo(
    () => ({
      client,
      organizationId,
    }),
    [client, organizationId]
  );

  return (
    <L4yercak3Context.Provider value={value}>
      {children}
    </L4yercak3Context.Provider>
  );
}

/**
 * Hook to access the LayerCake client and context.
 * Must be used within a L4yercak3Provider.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { client } = useL4yercak3();
 *   // Use client.contacts, client.events, etc.
 * }
 * ```
 */
export function useL4yercak3(): L4yercak3ContextValue {
  const context = useContext(L4yercak3Context);
  if (!context) {
    throw new Error('useL4yercak3 must be used within a L4yercak3Provider');
  }
  return context;
}

/**
 * Hook to get just the client instance.
 * Convenience wrapper around useL4yercak3().
 */
export function useL4yercak3Client(): L4yercak3Client {
  const { client } = useL4yercak3();
  return client;
}
