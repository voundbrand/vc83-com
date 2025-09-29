import { NextRequest, NextResponse } from 'next/server';

// Public endpoint to get available slots without authentication
// This uses Cal.com's public availability API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const username = searchParams.get('username') || 'voundbrand';
    const eventTypeSlug = searchParams.get('eventTypeSlug') || 'open-end-meeting';
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    const timeZone = searchParams.get('timeZone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const duration = searchParams.get('duration');
    
    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: 'startTime and endTime are required' },
        { status: 400 }
      );
    }
    
    // Use Cal.com's public availability API
    // This doesn't require authentication
    const calcomUrl = `https://cal.com/api/availability/${username}/${eventTypeSlug}`;
    const params = new URLSearchParams({
      dateFrom: startTime,
      dateTo: endTime,
      timeZone,
      duration: duration || '30'
    });
    
    console.log('Fetching public availability from:', `${calcomUrl}?${params}`);
    
    const response = await fetch(`${calcomUrl}?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cal.com public API error:', response.status, errorText);
      
      // Return generated slots as fallback
      return NextResponse.json({
        data: generateDefaultSlots(startTime, endTime, parseInt(duration || '30')),
        fallback: true,
        message: 'Using generated slots'
      });
    }
    
    const data = await response.json();
    console.log('Cal.com public availability:', data);
    
    // Transform the response to our expected format
    const slots = {
      data: data.slots || data.data || [],
      status: 'success'
    };
    
    return NextResponse.json(slots);
    
  } catch (error) {
    console.error('Error fetching public slots:', error);
    
    // Return generated slots as fallback
    const startTime = new URL(request.url).searchParams.get('startTime')!;
    const endTime = new URL(request.url).searchParams.get('endTime')!;
    const duration = parseInt(new URL(request.url).searchParams.get('duration') || '30');
    
    return NextResponse.json({
      data: generateDefaultSlots(startTime, endTime, duration),
      fallback: true,
      error: error instanceof Error ? error.message : 'Failed to fetch slots'
    });
  }
}

function generateDefaultSlots(startTime: string, endTime: string, duration: number) {
  const slots = [];
  const start = new Date(startTime);
  const end = new Date(endTime);
  const now = new Date();
  
  // Set working hours (9 AM to 5 PM)
  const workStart = 9;
  const workEnd = 17;
  
  // Start at the beginning of the start date
  const currentDate = new Date(start);
  currentDate.setHours(0, 0, 0, 0);
  
  // Generate slots for each day in the range
  while (currentDate <= end) {
    // Create working hours for this day
    const dayStart = new Date(currentDate);
    dayStart.setHours(workStart, 0, 0, 0);
    
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(workEnd, 0, 0, 0);
    
    // Generate slots for this day
    let slotTime = new Date(dayStart);
    
    while (slotTime < dayEnd) {
      const slotEnd = new Date(slotTime);
      slotEnd.setMinutes(slotEnd.getMinutes() + duration);
      
      // Only include slots that:
      // 1. End within working hours
      // 2. Are in the future
      if (slotEnd <= dayEnd && slotTime > now) {
        slots.push({
          time: slotTime.toISOString()
        });
      }
      
      // Move to next slot
      slotTime = new Date(slotTime);
      slotTime.setMinutes(slotTime.getMinutes() + duration);
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return slots;
}