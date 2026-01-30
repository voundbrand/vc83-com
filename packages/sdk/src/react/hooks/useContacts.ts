'use client';

import { useState, useCallback } from 'react';
import { useL4yercak3Client } from '../provider';
import type {
  Contact,
  ContactCreateInput,
  ContactUpdateInput,
  ContactListParams,
  PaginatedResponse,
} from '../../types';

export interface UseContactsResult {
  /** Current list of contacts */
  contacts: Contact[];
  /** Whether a request is in progress */
  loading: boolean;
  /** Last error that occurred */
  error: Error | null;
  /** Total count of contacts (from last fetch) */
  total: number;
  /** Whether there are more contacts to load */
  hasMore: boolean;
  /** Fetch contacts with optional filters */
  fetchContacts: (params?: ContactListParams) => Promise<PaginatedResponse<Contact>>;
  /** Get a single contact by ID */
  getContact: (id: string) => Promise<Contact>;
  /** Create a new contact */
  createContact: (data: ContactCreateInput) => Promise<Contact>;
  /** Update an existing contact */
  updateContact: (id: string, data: ContactUpdateInput) => Promise<Contact>;
  /** Delete a contact */
  deleteContact: (id: string) => Promise<void>;
  /** Add tags to a contact */
  addTags: (id: string, tags: string[]) => Promise<Contact>;
  /** Remove tags from a contact */
  removeTags: (id: string, tags: string[]) => Promise<Contact>;
  /** Reset error state */
  clearError: () => void;
}

/**
 * Hook for managing contacts in your LayerCake CRM.
 *
 * @example
 * ```tsx
 * function ContactList() {
 *   const { contacts, loading, error, fetchContacts } = useContacts();
 *
 *   useEffect(() => {
 *     fetchContacts({ status: 'active' });
 *   }, []);
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <ul>
 *       {contacts.map(contact => (
 *         <li key={contact.id}>{contact.firstName} {contact.lastName}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useContacts(): UseContactsResult {
  const client = useL4yercak3Client();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchContacts = useCallback(
    async (params?: ContactListParams): Promise<PaginatedResponse<Contact>> => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.contacts.list(params);
        setContacts(result.items);
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

  const getContact = useCallback(
    async (id: string): Promise<Contact> => {
      setLoading(true);
      setError(null);
      try {
        return await client.contacts.get(id);
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

  const createContact = useCallback(
    async (data: ContactCreateInput): Promise<Contact> => {
      setLoading(true);
      setError(null);
      try {
        const contact = await client.contacts.create(data);
        setContacts((prev) => [...prev, contact]);
        setTotal((prev) => prev + 1);
        return contact;
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

  const updateContact = useCallback(
    async (id: string, data: ContactUpdateInput): Promise<Contact> => {
      setLoading(true);
      setError(null);
      try {
        const updated = await client.contacts.update(id, data);
        setContacts((prev) => prev.map((c) => (c.id === id ? updated : c)));
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

  const deleteContact = useCallback(
    async (id: string): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        await client.contacts.delete(id);
        setContacts((prev) => prev.filter((c) => c.id !== id));
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

  const addTags = useCallback(
    async (id: string, tags: string[]): Promise<Contact> => {
      setLoading(true);
      setError(null);
      try {
        const updated = await client.contacts.addTags(id, tags);
        setContacts((prev) => prev.map((c) => (c.id === id ? updated : c)));
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

  const removeTags = useCallback(
    async (id: string, tags: string[]): Promise<Contact> => {
      setLoading(true);
      setError(null);
      try {
        const updated = await client.contacts.removeTags(id, tags);
        setContacts((prev) => prev.map((c) => (c.id === id ? updated : c)));
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
    contacts,
    loading,
    error,
    total,
    hasMore,
    fetchContacts,
    getContact,
    createContact,
    updateContact,
    deleteContact,
    addTags,
    removeTags,
    clearError,
  };
}
