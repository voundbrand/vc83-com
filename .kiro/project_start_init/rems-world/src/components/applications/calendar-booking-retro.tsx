"use client";

import React, { useState, useEffect } from "react";
import { PageComponentProps } from "@/window-registry";
import { RefreshCw, Clock, ChevronLeft, ChevronRight, Calendar, Video, Users, Globe, Monitor } from "lucide-react";
import { BookingForm } from "@/components/BookingForm";
import { BookingConfirmation } from "@/components/BookingConfirmation";
import { LocationOption, getLocationOptions } from "@/lib/location-utils";

interface TimeSlot {
  time: string;
  startTime: Date;
  endTime: Date;
  // Store the original time strings from Cal.com API
  originalStartTime: string;
  originalEndTime?: string;
}

export function CalendarBookingRetro({}: PageComponentProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableLocations, setAvailableLocations] = useState<LocationOption[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('integrations:daily'); // Use Cal.com integration string
  const [locationError, setLocationError] = useState<string>(''); // Track location loading errors
  const [selectedTimezone, setSelectedTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [eventType, setEventType] = useState<{
    id: number;
    slug: string;
    length: number;
    minimumBookingNotice?: number;
    metadata?: {
      apps?: {
        stripe?: {
          price_options?: Array<{ duration: number; price: number }>;
        };
      };
    };
    durations?: number[];
  } | null>(null);
  
  const [scheduleData, setScheduleData] = useState<{
    timeZone: string;
    availability: Array<{
      days: number[];
      startTime: string;
      endTime: string;
    }>;
  } | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [lastBooking, setLastBooking] = useState<{
    uid?: string;
    title?: string;
    startTime?: string;
    endTime?: string;
    start?: string;
    end?: string;
    location?: string;
    meetingUrl?: string;
  } | null>(null);
  
  const today = new Date();
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();
  const currentDate = today.getDate();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  // Constants
  const OPEN_END_MEETING_SLUG = "open-end-meeting";
  const CAL_USERNAME = "voundbrand";

  // Fetch schedule data from Cal.com
  const fetchScheduleData = async () => {
    setScheduleLoading(true);
    try {
      const response = await fetch('/api/cal/schedules');
      if (!response.ok) {
        console.error('Failed to fetch schedules:', response.status);
        setScheduleLoading(false);
        return;
      }
      const data = await response.json();
      
      console.log('Schedules response:', data);
      
      // Get the first/default schedule
      const schedule = data.schedules?.[0];
      if (schedule) {
        setScheduleData({
          timeZone: schedule.timeZone,
          availability: schedule.availability || []
        });
        console.log('✅ Schedule data loaded successfully:', schedule);
      } else {
        console.log('⚠️ No schedule found in API response');
      }
    } catch (err) {
      console.error('Failed to fetch schedule data:', err);
    } finally {
      setScheduleLoading(false);
    }
  };

  // Fetch event type details
  const fetchEventType = async () => {
    try {
      console.log('🔍 Fetching event types from /api/cal/event-types...');
      const response = await fetch('/api/cal/event-types');
      
      if (!response.ok) {
        const errorText = await response.text();
        setLocationError(`Failed to fetch event types: ${response.status} - ${errorText}`);
        console.error('❌ Event types API error:', response.status, errorText);
        return;
      }
      
      const data = await response.json();
      console.log('📦 Event types response:', data);
      
      // Find the open-end-meeting event type
      const openEndMeeting = data.event_types?.find(
        (et: { slug: string }) => et.slug === OPEN_END_MEETING_SLUG
      ) || data.data?.find(
        (et: { slug: string }) => et.slug === OPEN_END_MEETING_SLUG
      );
      
      if (!openEndMeeting) {
        const availableSlugs = data.event_types?.map((et: { slug: string }) => et.slug).join(', ') || 'none';
        setLocationError(`Event type '${OPEN_END_MEETING_SLUG}' not found. Available: ${availableSlugs}`);
        console.error(`❌ Event type '${OPEN_END_MEETING_SLUG}' not found in response. Available slugs:`, availableSlugs);
        return;
      }
      
      console.log('✅ Found event type:', openEndMeeting);
      setEventType(openEndMeeting);
      
      // Set available locations from the event type
      if (!openEndMeeting.locations || openEndMeeting.locations.length === 0) {
        setLocationError('No locations configured for this event type');
        console.error('❌ No locations found in event type:', openEndMeeting);
        return;
      }
      
      console.log('📍 Event type locations:', openEndMeeting.locations);
      const locationOptions = getLocationOptions(openEndMeeting.locations);
      console.log('🗺️ Mapped location options:', locationOptions);
      
      if (locationOptions.length === 0) {
        setLocationError('No supported locations found. Raw locations: ' + JSON.stringify(openEndMeeting.locations));
        console.error('❌ No location options after mapping. Raw locations:', openEndMeeting.locations);
        return;
      }
      
      setAvailableLocations(locationOptions);
      setLocationError(''); // Clear any previous errors
      
      // Set default selected location to first available
      if (locationOptions.length > 0) {
        setSelectedLocation(locationOptions[0].type);
        console.log('📌 Set default location to:', locationOptions[0].type);
      }
      
      // Set available durations from the event type
      if (openEndMeeting.metadata?.apps?.stripe?.price_options) {
        const durations = openEndMeeting.metadata.apps.stripe.price_options.map((opt: { duration: number }) => opt.duration);
        setSelectedDuration(durations[0] || 30);
      } else if (openEndMeeting.durations && openEndMeeting.durations.length > 0) {
        setSelectedDuration(openEndMeeting.durations[0]);
      } else if (openEndMeeting.length) {
        setSelectedDuration(openEndMeeting.length);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setLocationError(`Failed to fetch event types: ${errorMessage}`);
      console.error('❌ Failed to fetch event type:', err);
    }
  };

  // Fetch availability for selected date
  const fetchAvailability = async () => {
    setLoading(true);
    try {
      // Get start and end of selected day
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);
      
      console.log('Fetching availability for:', {
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        eventTypeSlug: OPEN_END_MEETING_SLUG,
        duration: selectedDuration
      });
      
      // Use our authenticated API that handles timezones correctly
      console.log('🚀 Fetching slots with authenticated API for timezone:', selectedTimezone);
      
      const response = await fetch(
        `/api/cal/slots?` + new URLSearchParams({
          eventTypeSlug: OPEN_END_MEETING_SLUG,
          usernameList: CAL_USERNAME,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          timeZone: selectedTimezone,
          duration: String(selectedDuration)
        })
      );
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        console.error('Availability response not ok:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        // If API fails, show no slots
        setAvailableSlots([]);
        return;
      }
      
      const data = await response.json();
      console.log('Slots response:', data);
      
      // Parse availability slots
      const slots: TimeSlot[] = [];
      
      // Get minimum booking notice from API response, fallback to 120 minutes
      const minimumBookingNoticeMinutes = data.minimumBookingNotice || 120;
      const now = new Date();
      const minimumBookingTime = new Date(now.getTime() + (minimumBookingNoticeMinutes * 60 * 1000));
      
      console.log('Frontend filtering with minimum booking notice:', minimumBookingNoticeMinutes, 'minutes');
      console.log('Frontend filtering with minimum booking time:', minimumBookingTime.toISOString());

      if (data.data && Array.isArray(data.data)) {
        // V2 API returns data.data array of slot objects
        data.data.forEach((slot: { time: string }) => {
          const startTime = new Date(slot.time);
          
          // Skip if the slot is before the minimum booking notice time
          if (startTime <= minimumBookingTime) {
            console.log('Frontend filtered out slot:', slot.time, 'before minimum time:', minimumBookingTime.toISOString());
            return;
          }
          
          const endTime = new Date(startTime);
          endTime.setMinutes(endTime.getMinutes() + selectedDuration);
          
          // Calculate the original end time string in the same format as Cal.com
          const originalEndTime = new Date(startTime.getTime() + (selectedDuration * 60 * 1000)).toISOString();
          
          // Cal.com returns timezone-aware strings, but we need to display in selectedTimezone
          const displayTime = new Date(slot.time).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true,
            timeZone: selectedTimezone  // Force display in selected timezone
          });

          console.log('🕐 Time conversion debug:', {
            originalCalTime: slot.time,
            parsedDateUTC: new Date(slot.time).toISOString(),
            displayTime: displayTime,
            selectedTimezone: selectedTimezone,
            browserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          });

          slots.push({
            time: displayTime,
            startTime,
            endTime,
            // Store original Cal.com time strings
            originalStartTime: slot.time,
            originalEndTime: originalEndTime
          });
        });
      } else if (data.slots) {
        // Fallback for V1 format
        Object.entries(data.slots).forEach(([dateTime]) => {
          const startTime = new Date(dateTime);
          
          // Skip if the slot is before the minimum booking notice time
          if (startTime <= minimumBookingTime) {
            console.log('Frontend filtered out V1 slot:', dateTime, 'before minimum time:', minimumBookingTime.toISOString());
            return;
          }
          
          const endTime = new Date(startTime);
          endTime.setMinutes(endTime.getMinutes() + selectedDuration);
          
          // Calculate the original end time string
          const originalEndTime = new Date(startTime.getTime() + (selectedDuration * 60 * 1000)).toISOString();
          
          slots.push({
            time: startTime.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true,
              timeZone: selectedTimezone  // Use selected timezone for display
            }),
            startTime,
            endTime,
            // Store original Cal.com time strings
            originalStartTime: dateTime,
            originalEndTime: originalEndTime
          });
        });
      }
      
      console.log('Final available slots after all filtering:', slots);
      console.log('Total slots found:', slots.length);
      
      // Additional debug and safety check for today specifically
      const isToday = selectedDate.toDateString() === today.toDateString();
      if (isToday) {
        // Double-check: if it's today and we don't have valid slots based on our business logic, force empty
        if (!hasValidSlotsForToday()) {
          console.log('🛡️ SAFETY CHECK: Forcing empty slots for today (past reasonable booking window)');
          slots.length = 0; // Clear the array
        }
        
        if (slots.length === 0) {
          console.log('✅ No slots available for today - this is correct behavior');
        } else {
          console.log('❌ WARNING: Found', slots.length, 'slots for today:', slots.map(s => s.time));
        }
      }
      
      // Set whatever slots we got from the API (even if empty, and after safety check)
      setAvailableSlots(slots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()));
      
    } catch (err) {
      console.error('Failed to fetch availability:', err);
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventType();
    fetchScheduleData();
  }, []);

  // Generate default time slots when API fails
  const generateDefaultSlots = () => {
    const slots: TimeSlot[] = [];
    const workStart = 9; // 9 AM
    const workEnd = 17; // 5 PM
    
    // Create date in selected timezone
    const selectedDateStart = new Date(selectedDate);
    selectedDateStart.setHours(workStart, 0, 0, 0);
    
    const selectedDateEnd = new Date(selectedDate);
    selectedDateEnd.setHours(workEnd, 0, 0, 0);
    
    // Get current time for comparison
    const now = new Date();
    
    // Generate slots for the selected day
    const currentSlot = new Date(selectedDateStart);
    
    while (currentSlot < selectedDateEnd) {
      const slotEnd = new Date(currentSlot);
      slotEnd.setMinutes(slotEnd.getMinutes() + selectedDuration);
      
      // Check if slot end is within working hours
      if (slotEnd.getHours() < workEnd || 
          (slotEnd.getHours() === workEnd && slotEnd.getMinutes() === 0)) {
        
        // Apply 2-hour minimum booking notice
        const minimumBookingTime = new Date(now.getTime() + (120 * 60 * 1000)); // 2 hours
        if (currentSlot > minimumBookingTime) {
          slots.push({
            time: currentSlot.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true,
              timeZone: selectedTimezone  // Use selected timezone for display
            }),
            startTime: new Date(currentSlot),
            endTime: new Date(slotEnd),
            // For generated slots, use ISO string format
            originalStartTime: currentSlot.toISOString(),
            originalEndTime: slotEnd.toISOString()
          });
        }
      }
      
      // Move to next slot
      currentSlot.setMinutes(currentSlot.getMinutes() + selectedDuration);
    }
    
    setAvailableSlots(slots);
  };

  useEffect(() => {
    fetchAvailability();
  }, [selectedDate, selectedDuration, selectedTimezone]); // eslint-disable-line react-hooks/exhaustive-deps

  const navigateMonth = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedDate(newDate);
    setSelectedSlot(null);
  };

  const selectDate = (day: number) => {
    if (!day) return;
    const newDate = new Date(currentYear, currentMonth, day);
    setSelectedDate(newDate);
    setSelectedSlot(null);
  };

  const openBookingForm = () => {
    if (!selectedSlot) {
      alert('Please select a time slot before booking.');
      return;
    }
    
    console.log('Opening custom booking form for slot:', selectedSlot);
    setShowBookingForm(true);
  };

  const handleBookingSuccess = (booking: {
    uid?: string;
    title?: string;
    startTime?: string;
    endTime?: string;
    start?: string;
    end?: string;
    location?: string;
    meetingUrl?: string;
  }) => {
    console.log('✅ Booking API returned:', booking);
    
    // NO FALLBACKS - pass the exact Cal.com response to BookingConfirmation
    // If there are missing fields, BookingConfirmation will throw proper errors
    setLastBooking(booking);
    setShowBookingForm(false);
    setShowConfirmation(true);
    
    // Clear selection after successful booking
    setSelectedSlot(null);
    // Refresh availability to reflect the new booking
    fetchAvailability();
  };

  const closeBookingForm = () => {
    setShowBookingForm(false);
  };

  const closeConfirmation = () => {
    setShowConfirmation(false);
    setLastBooking(null);
  };

  // Generate calendar grid
  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(0);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  // Check if a date has availability (for the accent dot indicator)
  const hasAvailabilityOnDate = (day: number) => {
    if (!day) return false;
    const checkDate = new Date(currentYear, currentMonth, day);
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    
    // Don't show dots on past dates
    if (checkDate < todayStart) return false;
    
    // If schedule data isn't loaded yet, don't show availability
    if (scheduleLoading || !scheduleData) return false;
    
    // For today specifically, check if there are any slots left after minimum booking notice
    const isToday = checkDate.toDateString() === today.toDateString();
    if (isToday) {
      return hasValidSlotsForToday();
    }
    
    // For future dates, check if there's availability on that day of week
    const dayOfWeek = checkDate.getDay();
    return scheduleData.availability.some(avail => avail.days.includes(dayOfWeek));
  };

  // Check if today still has valid bookable slots considering minimum booking notice
  const hasValidSlotsForToday = () => {
    // If schedule data isn't loaded, return false (no availability shown)
    if (!scheduleData) {
      console.log('⚠️ No schedule data - assuming no availability for today');
      return false;
    }

    const now = new Date();
    // Get minimum booking notice from event type (dynamically from Cal.com API)
    const minimumBookingNotice = eventType?.minimumBookingNotice || 120; // Fallback to 2 hours
    const minimumBookingTime = new Date(now.getTime() + (minimumBookingNotice * 60 * 1000));
    
    // Get business end time from Cal.com schedule data
    const todayEnd = getBusinessEndTimeForToday();
    
    console.log('Checking today availability with real Cal.com schedule:', {
      now: now.toISOString(),
      minimumBookingTime: minimumBookingTime.toISOString(),
      todayEnd: todayEnd.toISOString(),
      hasAvailableTime: minimumBookingTime < todayEnd
    });
    
    // If the minimum booking time is after business hours, no slots available
    return minimumBookingTime < todayEnd;
  };

  // Get the business end time for today from Cal.com schedule data
  const getBusinessEndTimeForToday = () => {
    console.log('Getting business end time for today. Schedule data:', scheduleData);
    
    if (!scheduleData) {
      console.log('❌ No schedule data available - no business hours defined');
      // Return start of day if no schedule data (effectively no availability)
      const noAvailability = new Date(today);
      noAvailability.setHours(0, 0, 0, 0);
      return noAvailability;
    }

    // Get current day of week (0 = Sunday, 1 = Monday, etc.)
    const todayDayOfWeek = today.getDay();
    console.log('Today is day of week:', todayDayOfWeek, '(0=Sunday, 1=Monday, 2=Tuesday, etc.)');
    
    // Find availability for today
    const todayAvailability = scheduleData.availability.find(avail => 
      avail.days.includes(todayDayOfWeek)
    );
    
    console.log('Available schedule blocks:', scheduleData.availability);
    console.log('Found availability for today:', todayAvailability);
    
    if (!todayAvailability) {
      // No availability for today (weekend or off day)
      console.log('❌ No availability found for today - setting to start of day');
      const noAvailability = new Date(today);
      noAvailability.setHours(0, 0, 0, 0); // Set to start of day (effectively no availability)
      return noAvailability;
    }
    
    // Parse end time (format: "16:00:00")
    const [hours, minutes] = todayAvailability.endTime.split(':').map(Number);
    const todayEnd = new Date(today);
    todayEnd.setHours(hours, minutes, 0, 0);
    
    console.log('✅ Parsed business end time from Cal.com:', {
      originalEndTime: todayAvailability.endTime,
      parsedHours: hours,
      parsedMinutes: minutes,
      todayEndTime: todayEnd.toISOString(),
      localTimeString: todayEnd.toLocaleString()
    });
    
    // Handle timezone conversion if needed (Cal.com schedule is in Europe/Berlin)
    // For now, assume the times are already in the correct timezone
    
    return todayEnd;
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-accent neon-glow">
        Book a Meeting
      </h1>

      {scheduleLoading && (
        <div className="mb-4 p-3 bg-primary/10 border border-primary/30 text-center">
          <div className="text-sm text-primary">Loading business hours...</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2">
          <div className="bg-dark border border-accent p-4">
            {/* Month Navigation */}
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => navigateMonth(-1)}
                className="px-2 py-1 hover:bg-secondary text-accent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-lg font-semibold text-primary">
                {monthNames[currentMonth]} {currentYear}
              </h2>
              <button
                onClick={() => navigateMonth(1)}
                className="px-2 py-1 hover:bg-secondary text-accent"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Week day headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-xs font-bold text-accent">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, index) => {
                const isToday = day === currentDate && 
                  currentMonth === today.getMonth() && 
                  currentYear === today.getFullYear();
                const isSelected = day === selectedDate.getDate() &&
                  currentMonth === selectedDate.getMonth() &&
                  currentYear === selectedDate.getFullYear();
                // Fix: Compare only dates, not times
                const isPast = day && (() => {
                  const dayDate = new Date(currentYear, currentMonth, day);
                  const todayDate = new Date(today);
                  dayDate.setHours(0, 0, 0, 0);
                  todayDate.setHours(0, 0, 0, 0);
                  return dayDate < todayDate;
                })();
                
                // Check if this date has no available slots (e.g., today after business hours)
                const hasNoSlots = day && !hasAvailabilityOnDate(day);
                const hasAvailability = hasAvailabilityOnDate(day);
                
                return (
                  <div
                    key={index}
                    onClick={() => day > 0 && !isPast && !hasNoSlots && selectDate(day)}
                    className={`
                      min-h-[40px] p-2 text-sm relative
                      ${isSelected ? "bg-accent text-dark font-bold" : ""}
                      ${isToday && !isSelected && !hasNoSlots ? "bg-primary/20" : ""}
                      ${day && !isPast && !isSelected && !hasNoSlots ? "hover:bg-secondary cursor-pointer" : ""}
                      ${!day || day === 0 ? "" : "border border-primary"}
                      ${isPast || hasNoSlots ? "text-gray-600 cursor-not-allowed opacity-50" : ""}
                    `}
                  >
                    {day > 0 && (
                      <>
                        <span>{day}</span>
                        {hasAvailability && !isPast && !hasNoSlots && (
                          <span className="absolute bottom-1 right-1 w-2 h-2 bg-accent rounded-full"></span>
                        )}
                        {hasNoSlots && !isPast && (
                          <span className="absolute bottom-1 right-1 text-xs text-gray-500">✕</span>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Location Selection */}
          <div className="mt-6 feature-card">
            <h3 className="font-semibold mb-3 text-primary">Location</h3>
            
            {/* Error Display */}
            {locationError && (
              <div className="mb-3 p-3 bg-red-900/20 border border-red-500 text-red-400 text-sm rounded">
                <strong>Location Error:</strong> {locationError}
              </div>
            )}
            
            {/* No locations available */}
            {!locationError && availableLocations.length === 0 && (
              <div className="mb-3 p-3 bg-yellow-900/20 border border-yellow-500 text-yellow-400 text-sm rounded">
                <strong>Loading locations...</strong> If this persists, check console for errors.
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2">
              {availableLocations.map((location) => {
                // Map icon types to actual icons
                const getIcon = (iconType: string) => {
                  switch (iconType) {
                    case 'video': return Video;
                    case 'globe': return Globe;
                    case 'users': return Users;
                    case 'monitor': return Monitor;
                    default: return Video;
                  }
                };
                
                const Icon = getIcon(location.icon);
                return (
                  <button
                    key={location.type}
                    onClick={() => setSelectedLocation(location.type)}
                    className={`
                      p-3 text-xs border flex items-center gap-2
                      ${selectedLocation === location.type
                        ? "bg-accent text-dark border-accent font-medium"
                        : "border-primary hover:bg-secondary"
                      }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {location.displayName}
                </button>
                );
              })}
            </div>
          </div>

          {/* Timezone Selection */}
          <div className="mt-4 feature-card">
            <h3 className="font-semibold mb-2 text-primary">Time Zone</h3>
            <select
              value={selectedTimezone}
              onChange={(e) => setSelectedTimezone(e.target.value)}
              className="w-full px-3 py-2 bg-dark border border-primary text-sm"
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
              <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>
                {Intl.DateTimeFormat().resolvedOptions().timeZone} (Local)
              </option>
            </select>
          </div>
        </div>

        {/* Time Slots Sidebar */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-primary">
              {selectedDate.toLocaleDateString('en-US', { 
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </h2>
            <button
              onClick={fetchAvailability}
              className="p-2 hover:bg-secondary border border-primary"
              title="Refresh availability"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Duration Selector - show available durations */}
          <div className="mb-4 space-y-2">
            <label className="text-sm font-medium text-primary">Duration:</label>
            <div className="grid grid-cols-2 gap-2">
              {(eventType?.durations || 
                eventType?.metadata?.apps?.["stripe"]?.price_options?.map(opt => opt.duration) || 
                [15, 30, 60, 90]).map((duration) => (
                <button
                  key={duration}
                  onClick={() => setSelectedDuration(duration)}
                  className={`
                    px-3 py-2 text-sm border
                    ${selectedDuration === duration
                      ? "bg-accent text-dark border-accent font-medium"
                      : "border-primary hover:bg-secondary"
                    }
                  `}
                >
                  {duration < 60 
                    ? `${duration} min` 
                    : duration === 60 
                      ? '1 hour'
                      : duration === 90
                        ? '1.5 hours'
                        : duration === 120
                          ? '2 hours'
                          : `${duration} min`}
                </button>
              ))}
            </div>
          </div>

          {/* Time Slots */}
          {loading ? (
            <div className="text-center py-8 text-secondary">
              Loading availability...
            </div>
          ) : availableSlots.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {availableSlots.map((slot, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedSlot(slot)}
                  className={`
                    w-full p-3 text-sm border flex items-center justify-center gap-2
                    ${selectedSlot?.time === slot.time
                      ? "bg-accent text-dark border-accent font-medium"
                      : "border-primary hover:bg-secondary"
                    }
                  `}
                >
                  <Clock className="w-4 h-4" />
                  {slot.time}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-secondary">
              <p>No available times for this date.</p>
              <p className="text-xs mt-2">Try selecting another date.</p>
            </div>
          )}

          {selectedSlot && (
            <button
              onClick={openBookingForm}
              className="w-full mt-4 px-4 py-3 bg-accent text-dark hover:bg-primary font-medium flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Book {selectedSlot.time}
            </button>
          )}
        </div>
      </div>

      {/* Booking Form Modal */}
      {showBookingForm && selectedSlot && (
        <BookingForm
          selectedSlot={selectedSlot}
          selectedDate={selectedDate}
          selectedDuration={selectedDuration}
          selectedLocation={selectedLocation}
          selectedTimezone={selectedTimezone}
          onClose={closeBookingForm}
          onSuccess={handleBookingSuccess}
        />
      )}

      {/* Booking Confirmation Modal */}
      {showConfirmation && lastBooking && (
        <BookingConfirmation
          booking={lastBooking}
          selectedTimezone={selectedTimezone}
          onClose={closeConfirmation}
        />
      )}
    </div>
  );
}