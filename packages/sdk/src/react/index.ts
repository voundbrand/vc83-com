/**
 * @l4yercak3/sdk/react
 *
 * React bindings for the LayerCake SDK.
 * Includes the provider component and all domain hooks.
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
 *
 * // In your components
 * import { useContacts, useEvents, useCheckout } from '@l4yercak3/sdk/react';
 *
 * function MyComponent() {
 *   const { contacts, fetchContacts } = useContacts();
 *   const { events } = useEvents();
 *   const { addToCart, createCheckoutSession } = useCheckout();
 *   // ...
 * }
 * ```
 */

// Provider
export {
  L4yercak3Provider,
  useL4yercak3,
  useL4yercak3Client,
  type L4yercak3ProviderProps,
} from './provider';

// All hooks
export * from './hooks';
