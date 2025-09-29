import { NextRequest, NextResponse } from 'next/server';

// Use environment variable or default API key
const CAL_API_KEY = process.env.CAL_API_KEY || 'cal_live_dd8a141b7b4d308171a9876f4c2de6bf';
const CAL_API_URL = 'https://api.cal.com/v1';

// Known event type ID for open-end-meeting
const OPEN_END_MEETING_ID = 2883643;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract parameters
    const eventTypeSlug = searchParams.get('eventTypeSlug') || 'open-end-meeting';
    const username = searchParams.get('usernameList') || searchParams.get('username') || 'voundbrand';
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    const timeZone = searchParams.get('timeZone') || 'America/Chicago';
    const duration = searchParams.get('duration') || '30';
    
    console.log('Slots API called with params:', {
      eventTypeSlug,
      username,
      startTime,
      endTime,
      timeZone,
      duration
    });
    
    // Validate required parameters
    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required parameters: startTime, endTime' },
        { status: 400 }
      );
    }

    // First, get the event type details to get minimumBookingNotice
    let minimumBookingNotice = 120; // Default 2 hours in minutes
    try {
      const eventTypesUrl = `${CAL_API_URL}/event-types?apiKey=${CAL_API_KEY}`;
      const eventTypesResponse = await fetch(eventTypesUrl);
      
      if (eventTypesResponse.ok) {
        const eventTypesData = await eventTypesResponse.json();
        console.log('Event types API response:', JSON.stringify(eventTypesData, null, 2));
        
        const eventType = eventTypesData.event_types?.find(
          (et: { id: number; slug: string }) => et.id === OPEN_END_MEETING_ID
        );
        
        console.log('Found event type:', eventType);
        
        // Check multiple possible field names for minimum booking notice
        if (eventType?.minimumBookingNotice) {
          minimumBookingNotice = eventType.minimumBookingNotice;
          console.log('Found minimumBookingNotice:', minimumBookingNotice, 'minutes');
        } else if (eventType?.minimum_booking_notice) {
          minimumBookingNotice = eventType.minimum_booking_notice;
          console.log('Found minimum_booking_notice:', minimumBookingNotice, 'minutes');
        } else if (eventType?.bookingLimits?.minimumBookingNotice) {
          minimumBookingNotice = eventType.bookingLimits.minimumBookingNotice;
          console.log('Found bookingLimits.minimumBookingNotice:', minimumBookingNotice, 'minutes');
        } else {
          console.log('No minimum booking notice found in event type, using default:', minimumBookingNotice, 'minutes');
        }
      }
    } catch (eventTypeError) {
      console.warn('Failed to fetch event type details, using default minimum notice:', eventTypeError);
    }

    // Get schedule data to enforce business hours
    let scheduleData: {
      timeZone: string;
      availability: Array<{
        days: number[];
        startTime: string;
        endTime: string;
      }>;
    } | null = null;
    
    try {
      const schedulesUrl = `${CAL_API_URL}/schedules?apiKey=${CAL_API_KEY}`;
      const schedulesResponse = await fetch(schedulesUrl);
      
      if (schedulesResponse.ok) {
        const schedulesResponseData = await schedulesResponse.json();
        console.log('Schedules API response:', JSON.stringify(schedulesResponseData, null, 2));
        
        // Get the first/default schedule
        const schedule = schedulesResponseData.schedules?.[0];
        if (schedule) {
          scheduleData = {
            timeZone: schedule.timeZone,
            availability: schedule.availability || []
          };
          console.log('✅ Schedule data loaded for slot filtering:', scheduleData);
        }
      }
    } catch (scheduleError) {
      console.warn('Failed to fetch schedule data, business hours filtering disabled:', scheduleError);
    }
    
    try {
      // Use the v1 /slots endpoint which returns real availability
      const slotsUrl = new URL(`${CAL_API_URL}/slots`);
      slotsUrl.searchParams.append('apiKey', CAL_API_KEY);
      slotsUrl.searchParams.append('username', username);
      slotsUrl.searchParams.append('eventTypeId', OPEN_END_MEETING_ID.toString());
      slotsUrl.searchParams.append('startTime', startTime);
      slotsUrl.searchParams.append('endTime', endTime);
      slotsUrl.searchParams.append('timeZone', timeZone);
      slotsUrl.searchParams.append('duration', duration);
      
      console.log('Fetching slots from:', slotsUrl.href);
      
      const response = await fetch(slotsUrl.href);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cal.com API error:', response.status, errorText);
        return NextResponse.json(
          { 
            error: 'Failed to fetch slots from Cal.com',
            details: errorText,
            status: response.status
          },
          { status: response.status }
        );
      }
      
      const slotsData = await response.json();
      console.log('Cal.com slots response:', JSON.stringify(slotsData, null, 2));
      
      // Transform the response to our expected format
      // The v1 API returns slots grouped by date
      const transformedSlots: { time: string }[] = [];
      
      // Calculate the minimum booking time (current time + minimum notice)
      // Use UTC consistently for both current time and minimum booking time
      const now = new Date();
      const minimumBookingTime = new Date(now.getTime() + (minimumBookingNotice * 60 * 1000));
      
      console.log('Filtering slots with minimum booking notice:', {
        currentTime: now.toISOString(),
        minimumBookingNotice: minimumBookingNotice + ' minutes',
        minimumBookingTime: minimumBookingTime.toISOString()
      });
      
      if (slotsData.slots) {
        Object.entries(slotsData.slots).forEach(([, daySlots]) => {
          if (Array.isArray(daySlots)) {
            daySlots.forEach((slot: { time: string }) => {
              // Parse slot time properly handling timezone offsets
              const slotTime = new Date(slot.time);
              
              // Convert both times to UTC milliseconds for accurate comparison
              const slotTimeUTC = slotTime.getTime();
              const minimumBookingTimeUTC = minimumBookingTime.getTime();
              
              console.log('Checking slot:', {
                slotTime: slot.time,
                slotTimeUTC: new Date(slotTimeUTC).toISOString(),
                minimumBookingTimeUTC: minimumBookingTime.toISOString(),
                isAfterMinimum: slotTimeUTC > minimumBookingTimeUTC,
                timeDiffMinutes: (slotTimeUTC - minimumBookingTimeUTC) / (1000 * 60)
              });
              
              // First check: minimum booking notice
              if (slotTimeUTC <= minimumBookingTimeUTC) {
                console.log('❌ Filtered out slot due to minimum notice:', slot.time, 
                  'at', new Date(slotTimeUTC).toISOString(), 
                  'needs to be after', minimumBookingTime.toISOString());
                return;
              }

              // Second check: business hours from Cal.com schedule
              if (scheduleData) {
                const dayOfWeek = slotTime.getDay(); // 0=Sunday, 1=Monday, etc.
                const todayAvailability = scheduleData.availability.find(avail => 
                  avail.days.includes(dayOfWeek)
                );

                if (!todayAvailability) {
                  console.log('❌ Filtered out slot - no business hours for day:', dayOfWeek, '(slot:', slot.time, ')');
                  return;
                }

                // Parse business end time for this day
                const [endHours, endMinutes] = todayAvailability.endTime.split(':').map(Number);
                const businessEndTime = new Date(slotTime);
                businessEndTime.setHours(endHours, endMinutes, 0, 0);

                // Check if slot + duration would extend past business hours
                const slotEndTime = new Date(slotTime.getTime() + (parseInt(duration) * 60 * 1000));

                console.log('Business hours check:', {
                  slotTime: slot.time,
                  slotEndTime: slotEndTime.toISOString(),
                  businessEndTime: businessEndTime.toISOString(),
                  businessHours: `${todayAvailability.startTime}-${todayAvailability.endTime}`,
                  isWithinBusinessHours: slotEndTime <= businessEndTime
                });

                if (slotEndTime > businessEndTime) {
                  console.log('❌ Filtered out slot - extends past business hours:', slot.time, 
                    'ends at', slotEndTime.toISOString(), 
                    'but business ends at', businessEndTime.toISOString());
                  return;
                }
              }

              // Slot passed all filters - include it
              console.log('✅ Slot passed all filters:', slot.time);
              transformedSlots.push({ time: slot.time });
            });
          }
        });
      }
      
      return NextResponse.json({
        data: transformedSlots,
        status: 'success',
        source: 'cal-api-v1',
        minimumBookingNotice: minimumBookingNotice,
        minimumBookingTime: minimumBookingTime.toISOString(),
        scheduleDataLoaded: !!scheduleData,
        totalSlotsBeforeFilter: Object.values(slotsData.slots || {}).flat().length,
        slotsAfterFilter: transformedSlots.length,
        filtersApplied: [
          'minimum_booking_notice',
          ...(scheduleData ? ['business_hours'] : [])
        ]
      });
      
    } catch (apiError) {
      console.error('Error calling Cal.com API:', apiError);
      
      // If the API fails, return error (NO FALLBACK TO GENERATED SLOTS)
      return NextResponse.json(
        { 
          error: 'Cal.com API error',
          details: apiError instanceof Error ? apiError.message : String(apiError),
          suggestion: 'Check Cal.com API status and credentials'
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error in slots route:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}