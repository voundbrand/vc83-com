import { useState, useCallback } from 'react';

interface UseCalOptions {
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

export function useCal(options?: UseCalOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<unknown>(null);

  const callApi = useCallback(async (
    endpoint: string,
    requestOptions?: RequestInit
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/cal${endpoint}`, {
        ...requestOptions,
        headers: {
          'Content-Type': 'application/json',
          ...requestOptions?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      options?.onError?.(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [options]);

  // Convenience methods
  const getBookings = useCallback((params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return callApi(`/bookings${query}`);
  }, [callApi]);

  const createBooking = useCallback((bookingData: unknown) => {
    return callApi('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }, [callApi]);

  const getAvailability = useCallback((params: {
    dateFrom: string;
    dateTo: string;
    eventTypeId?: number;
    userId?: number;
    timeZone?: string;
  }) => {
    const queryParams: Record<string, string> = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams[key] = String(value);
      }
    });
    const query = '?' + new URLSearchParams(queryParams).toString();
    return callApi(`/availability${query}`);
  }, [callApi]);

  const getEventTypes = useCallback(() => {
    return callApi('/event-types');
  }, [callApi]);

  // Cal.com embed helper
  const openCalModal = useCallback((calLink: string, config?: Record<string, unknown>) => {
    if (typeof window !== 'undefined' && window.Cal) {
      window.Cal('ui', {
        theme: 'dark',
        styles: { branding: { brandColor: '#10b981' } },
        hideEventTypeDetails: false,
        ...config,
      });
      
      window.Cal('modal', {
        calLink,
        ...config,
      });
    } else {
      console.error('Cal.com embed not loaded');
    }
  }, []);

  return {
    loading,
    error,
    data,
    getBookings,
    createBooking,
    getAvailability,
    getEventTypes,
    openCalModal,
    callApi,
  };
}