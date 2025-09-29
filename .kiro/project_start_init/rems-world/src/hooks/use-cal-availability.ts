import { useState, useEffect, useCallback } from 'react';

interface AvailableSlot {
  time: string;
  date: Date;
}

export function useCalAvailability(
  username: string,
  eventTypeSlug: string,
  selectedDate: Date,
  duration: number = 30,
  timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
) {
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAvailability = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get start of day
      const startTime = new Date(selectedDate);
      startTime.setHours(0, 0, 0, 0);
      
      // Get end of day
      const endTime = new Date(selectedDate);
      endTime.setHours(23, 59, 59, 999);
      
      // Call the cal.com availability endpoint
      const params = new URLSearchParams({
        eventTypeSlug,
        usernameList: username,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        timeZone: timezone,
        duration: String(duration)
      });
      
      const response = await fetch(`/api/cal/slots?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch availability');
      }
      
      const data = await response.json();
      
      // Parse slots
      const availableSlots: AvailableSlot[] = [];
      
      if (data.slots) {
        Object.keys(data.slots).forEach((dateTimeStr) => {
          const slotTime = new Date(dateTimeStr);
          
          // Only include future slots
          if (slotTime > new Date()) {
            availableSlots.push({
              time: slotTime.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              }),
              date: slotTime
            });
          }
        });
      }
      
      // Sort by time
      availableSlots.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      setSlots(availableSlots);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching availability:', err);
    } finally {
      setLoading(false);
    }
  }, [username, eventTypeSlug, selectedDate, duration, timezone]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  return { slots, loading, error, refetch: fetchAvailability };
}