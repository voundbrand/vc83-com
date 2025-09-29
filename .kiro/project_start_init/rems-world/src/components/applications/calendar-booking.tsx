"use client";

import React, { useState, useEffect } from "react";
import { PageComponentProps } from "@/window-registry";
import { RefreshCw, Clock, ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface TimeSlot {
  time: string;
  available: boolean;
}

interface DayAvailability {
  date: string;
  slots: TimeSlot[];
}

export function CalendarBooking({}: PageComponentProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventType, setEventType] = useState<{ id: number; slug: string; length: number } | null>(null);
  
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();
  const today = new Date();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Constants for open-end-meeting
  const OPEN_END_MEETING_SLUG = "open-end-meeting";
  const CAL_USERNAME = "voundbrand";

  // Load cal.com embed script
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.Cal) {
      const script = document.createElement('script');
      script.src = 'https://app.cal.com/embed/embed.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // Fetch event type details for open-end-meeting
  const fetchEventType = async () => {
    try {
      const response = await fetch('/api/cal/event-types');
      if (!response.ok) return;
      const data = await response.json();
      
      // Find the open-end-meeting event type
      const openEndMeeting = data.event_types?.find(
        (et: { slug: string; id: number; length: number }) => et.slug === OPEN_END_MEETING_SLUG
      );
      
      if (openEndMeeting) {
        setEventType(openEndMeeting);
      }
    } catch (err) {
      console.error('Failed to fetch event type:', err);
    }
  };

  // Fetch availability for the selected month
  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
      
      const response = await fetch(
        `/api/cal/availability?` + new URLSearchParams({
          dateFrom: startOfMonth.toISOString(),
          dateTo: endOfMonth.toISOString(),
          eventTypeId: eventType?.id ? String(eventType.id) : '',
          username: CAL_USERNAME
        })
      );
      
      if (!response.ok) return;
      
      const data = await response.json();
      
      // Process availability data
      if (data.busy && data.dateRanges) {
        const processedAvailability: DayAvailability[] = [];
        
        // For each day in the month, check available slots
        for (let day = 1; day <= new Date(currentYear, currentMonth + 1, 0).getDate(); day++) {
          const date = new Date(currentYear, currentMonth, day);
          const dateStr = date.toISOString().split('T')[0];
          
          // Generate time slots (9 AM to 5 PM, 30-minute intervals)
          const slots: TimeSlot[] = [];
          for (let hour = 9; hour < 17; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
              const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
              const slotStart = new Date(date);
              slotStart.setHours(hour, minute, 0, 0);
              
              // Check if this slot is busy
              const isBusy = data.busy.some((busySlot: { start: string; end: string }) => {
                const busyStart = new Date(busySlot.start);
                const busyEnd = new Date(busySlot.end);
                return slotStart >= busyStart && slotStart < busyEnd;
              });
              
              slots.push({
                time: timeStr,
                available: !isBusy && date >= today
              });
            }
          }
          
          processedAvailability.push({ date: dateStr, slots });
        }
        
        setAvailability(processedAvailability);
      }
    } catch (err) {
      console.error('Failed to fetch availability:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventType();
  }, []);

  useEffect(() => {
    if (eventType) {
      fetchAvailability();
    }
  }, [eventType, currentMonth, currentYear]); // eslint-disable-line react-hooks/exhaustive-deps

  const navigateMonth = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedDate(newDate);
    setSelectedTime(null);
  };

  const selectDate = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    setSelectedDate(newDate);
    setSelectedTime(null);
  };

  const openBookingModal = () => {
    if (window.Cal && selectedDate && selectedTime) {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const bookingDate = new Date(selectedDate);
      bookingDate.setHours(hours, minutes, 0, 0);
      
      window.Cal('modal', {
        calLink: `${CAL_USERNAME}/${OPEN_END_MEETING_SLUG}`,
        date: bookingDate.toISOString(),
        config: {
          theme: 'dark',
          styles: { branding: { brandColor: '#10b981' } },
        }
      });
    }
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  // Generate calendar grid
  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  // Get available slots for selected date
  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const selectedDayAvailability = availability.find(a => a.date === selectedDateStr);
  const availableSlots = selectedDayAvailability?.slots.filter(s => s.available) || [];

  return (
    <div className="p-6 max-h-[600px] overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-accent neon-glow mb-2">
          Book a Meeting
        </h1>
        <p className="text-sm text-secondary">
          Open-End Meeting • {eventType?.length || 30} minutes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="bg-dark border border-accent p-4">
            {/* Month Navigation */}
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2 hover:bg-secondary"
                disabled={loading}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <h2 className="text-lg font-semibold">
                {monthNames[currentMonth]} {currentYear}
              </h2>
              
              <button
                onClick={() => navigateMonth(1)}
                className="p-2 hover:bg-secondary"
                disabled={loading}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Week headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-xs font-medium text-accent p-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                if (!day) return <div key={index} />;
                
                const date = new Date(currentYear, currentMonth, day);
                const dateStr = date.toISOString().split('T')[0];
                const dayAvailability = availability.find(a => a.date === dateStr);
                const hasAvailableSlots = dayAvailability?.slots.some(s => s.available);
                const isSelected = selectedDate.getDate() === day &&
                  selectedDate.getMonth() === currentMonth &&
                  selectedDate.getFullYear() === currentYear;
                const isPast = date < today;
                
                return (
                  <button
                    key={index}
                    onClick={() => !isPast && hasAvailableSlots && selectDate(day)}
                    disabled={isPast || !hasAvailableSlots || loading}
                    className={`
                      p-3 text-center border transition-colors
                      ${isSelected 
                        ? 'bg-accent text-dark border-accent font-bold' 
                        : hasAvailableSlots && !isPast
                          ? 'border-primary hover:bg-secondary cursor-pointer'
                          : 'border-gray-700 text-gray-600 cursor-not-allowed'
                      }
                    `}
                  >
                    <div className="text-sm">{day}</div>
                    {hasAvailableSlots && !isPast && (
                      <div className="text-xs mt-1 text-green-400">•</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Time slots */}
        <div>
          <div className="mb-4 flex justify-between items-center">
            <h3 className="font-semibold">
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </h3>
            <button
              onClick={fetchAvailability}
              className="p-2 hover:bg-secondary border border-primary"
              title="Refresh availability"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-secondary">
              Loading availability...
            </div>
          ) : availableSlots.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {availableSlots.map((slot) => (
                <button
                  key={slot.time}
                  onClick={() => setSelectedTime(slot.time)}
                  className={`
                    w-full p-3 text-center border transition-colors
                    ${selectedTime === slot.time
                      ? 'bg-accent text-dark border-accent font-medium'
                      : 'border-primary hover:bg-secondary'
                    }
                  `}
                >
                  <Clock className="w-4 h-4 inline mr-2" />
                  {slot.time}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-secondary">
              No available times for this date
            </div>
          )}

          {selectedTime && (
            <button
              onClick={openBookingModal}
              className="w-full mt-4 px-4 py-3 bg-accent text-dark hover:bg-primary font-medium flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}