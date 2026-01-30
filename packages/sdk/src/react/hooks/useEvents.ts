'use client';

import { useState, useCallback } from 'react';
import { useL4yercak3Client } from '../provider';
import type {
  Event,
  EventCreateInput,
  EventListParams,
  Attendee,
  AttendeeListParams,
  PaginatedResponse,
} from '../../types';

export interface UseEventsResult {
  /** Current list of events */
  events: Event[];
  /** Whether a request is in progress */
  loading: boolean;
  /** Last error that occurred */
  error: Error | null;
  /** Total count of events (from last fetch) */
  total: number;
  /** Whether there are more events to load */
  hasMore: boolean;
  /** Fetch events with optional filters */
  fetchEvents: (params?: EventListParams) => Promise<PaginatedResponse<Event>>;
  /** Get a single event by ID */
  getEvent: (id: string, options?: { includeProducts?: boolean; includeSponsors?: boolean; includeForms?: boolean }) => Promise<Event>;
  /** Create a new event */
  createEvent: (data: EventCreateInput) => Promise<Event>;
  /** Update an existing event */
  updateEvent: (id: string, data: Partial<EventCreateInput>) => Promise<Event>;
  /** Delete an event */
  deleteEvent: (id: string) => Promise<void>;
  /** Reset error state */
  clearError: () => void;
}

/**
 * Hook for managing events.
 *
 * @example
 * ```tsx
 * function EventList() {
 *   const { events, loading, fetchEvents } = useEvents();
 *
 *   useEffect(() => {
 *     fetchEvents({ status: 'published' });
 *   }, []);
 *
 *   return (
 *     <div>
 *       {events.map(event => (
 *         <EventCard key={event.id} event={event} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useEvents(): UseEventsResult {
  const client = useL4yercak3Client();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchEvents = useCallback(
    async (params?: EventListParams): Promise<PaginatedResponse<Event>> => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.events.list(params);
        setEvents(result.items);
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

  const getEvent = useCallback(
    async (
      id: string,
      options?: { includeProducts?: boolean; includeSponsors?: boolean; includeForms?: boolean }
    ): Promise<Event> => {
      setLoading(true);
      setError(null);
      try {
        return await client.events.get(id, options);
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

  const createEvent = useCallback(
    async (data: EventCreateInput): Promise<Event> => {
      setLoading(true);
      setError(null);
      try {
        const event = await client.events.create(data);
        setEvents((prev) => [...prev, event]);
        setTotal((prev) => prev + 1);
        return event;
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

  const updateEvent = useCallback(
    async (id: string, data: Partial<EventCreateInput>): Promise<Event> => {
      setLoading(true);
      setError(null);
      try {
        const updated = await client.events.update(id, data);
        setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
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

  const deleteEvent = useCallback(
    async (id: string): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        await client.events.delete(id);
        setEvents((prev) => prev.filter((e) => e.id !== id));
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
    events,
    loading,
    error,
    total,
    hasMore,
    fetchEvents,
    getEvent,
    createEvent,
    updateEvent,
    deleteEvent,
    clearError,
  };
}

export interface UseAttendeesResult {
  /** Current list of attendees */
  attendees: Attendee[];
  /** Whether a request is in progress */
  loading: boolean;
  /** Last error that occurred */
  error: Error | null;
  /** Total count of attendees (from last fetch) */
  total: number;
  /** Whether there are more attendees to load */
  hasMore: boolean;
  /** Fetch attendees for an event */
  fetchAttendees: (eventId: string, params?: AttendeeListParams) => Promise<PaginatedResponse<Attendee>>;
  /** Check in an attendee */
  checkIn: (eventId: string, attendeeId: string) => Promise<Attendee>;
  /** Cancel an attendee's registration */
  cancelRegistration: (eventId: string, attendeeId: string) => Promise<Attendee>;
  /** Reset error state */
  clearError: () => void;
}

/**
 * Hook for managing event attendees.
 *
 * @example
 * ```tsx
 * function AttendeeList({ eventId }) {
 *   const { attendees, loading, fetchAttendees, checkIn } = useAttendees();
 *
 *   useEffect(() => {
 *     fetchAttendees(eventId);
 *   }, [eventId]);
 *
 *   const handleCheckIn = async (attendeeId) => {
 *     await checkIn(eventId, attendeeId);
 *   };
 *
 *   return (
 *     <ul>
 *       {attendees.map(attendee => (
 *         <li key={attendee.id}>
 *           {attendee.contact.firstName} - {attendee.status}
 *           {attendee.status !== 'checked_in' && (
 *             <button onClick={() => handleCheckIn(attendee.id)}>Check In</button>
 *           )}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useAttendees(): UseAttendeesResult {
  const client = useL4yercak3Client();
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchAttendees = useCallback(
    async (eventId: string, params?: AttendeeListParams): Promise<PaginatedResponse<Attendee>> => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.events.getAttendees(eventId, params);
        setAttendees(result.items);
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

  const checkIn = useCallback(
    async (eventId: string, attendeeId: string): Promise<Attendee> => {
      setLoading(true);
      setError(null);
      try {
        const updated = await client.events.checkInAttendee(eventId, attendeeId);
        setAttendees((prev) => prev.map((a) => (a.id === attendeeId ? updated : a)));
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

  const cancelRegistration = useCallback(
    async (eventId: string, attendeeId: string): Promise<Attendee> => {
      setLoading(true);
      setError(null);
      try {
        const updated = await client.events.cancelAttendee(eventId, attendeeId);
        setAttendees((prev) => prev.map((a) => (a.id === attendeeId ? updated : a)));
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
    attendees,
    loading,
    error,
    total,
    hasMore,
    fetchAttendees,
    checkIn,
    cancelRegistration,
    clearError,
  };
}
