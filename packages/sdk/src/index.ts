/**
 * @l4yercak3/sdk
 *
 * Official SDK for LayerCake - Backend-as-a-Service for events, CRM, forms, and commerce.
 *
 * @example
 * ```typescript
 * // Using the client directly (server-side or non-React)
 * import { L4yercak3Client, getL4yercak3Client } from '@l4yercak3/sdk';
 *
 * // Use the singleton (configured via env vars)
 * const client = getL4yercak3Client();
 *
 * // Or create a custom instance
 * const client = new L4yercak3Client({
 *   apiKey: 'sk_...',
 *   organizationId: 'org_...',
 * });
 *
 * // Make API calls
 * const contacts = await client.contacts.list({ status: 'active' });
 * const event = await client.events.get('evt_123', { includeProducts: true });
 * ```
 *
 * @example
 * ```tsx
 * // Using React hooks
 * import { L4yercak3Provider, useContacts, useEvents } from '@l4yercak3/sdk/react';
 *
 * // Wrap your app with the provider
 * <L4yercak3Provider>
 *   <App />
 * </L4yercak3Provider>
 *
 * // Use hooks in your components
 * function ContactList() {
 *   const { contacts, loading, fetchContacts } = useContacts();
 *   // ...
 * }
 * ```
 */

// Client
export {
  L4yercak3Client,
  L4yercak3Error,
  getL4yercak3Client,
  createL4yercak3Client,
  type L4yercak3ClientConfig,
} from './client';

// Types - export all types
export * from './types';
