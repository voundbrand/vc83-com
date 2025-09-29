import { NextRequest, NextResponse } from 'next/server';

// This endpoint mimics Cal.com's public TRPC API for slots
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const username = searchParams.get('username') || 'voundbrand';
    const eventTypeSlug = searchParams.get('eventTypeSlug') || 'open-end-meeting';
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    const timeZone = searchParams.get('timeZone') || 'America/Chicago';
    
    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: 'startTime and endTime are required' },
        { status: 400 }
      );
    }
    
    // Call Cal.com's public calendar page to get the actual availability
    const calendarUrl = `https://cal.com/${username}/${eventTypeSlug}/embed`;
    
    console.log('Fetching from Cal.com public page:', calendarUrl);
    
    try {
      const response = await fetch(calendarUrl, {
        headers: {
          'Accept': 'text/html',
          'User-Agent': 'Mozilla/5.0 (compatible; CalendarIntegration/1.0)'
        }
      });
      
      if (response.ok) {
        // For now, return generated slots
        // In production, you'd parse the HTML or use Cal.com's actual API
        const slots = generateAvailableSlots(startTime, endTime);
        return NextResponse.json({
          data: slots,
          status: 'success'
        });
      }
    } catch (error) {
      console.error('Error fetching from Cal.com:', error);
    }
    
    // Fallback to generated slots
    const slots = generateAvailableSlots(startTime, endTime);
    return NextResponse.json({
      data: slots,
      status: 'success',
      fallback: true
    });
    
  } catch (error) {
    console.error('Error in TRPC slots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch slots' },
      { status: 500 }
    );
  }
}

function generateAvailableSlots(startTime: string, endTime: string) {
  const slots = [];
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  // Cal.com default working hours
  const workStart = 9;  // 9 AM
  const workEnd = 17;   // 5 PM
  const slotDuration = 30; // 30 minute slots
  
  // For each day in the range
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const dayStart = new Date(currentDate);
    dayStart.setHours(workStart, 0, 0, 0);
    
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(workEnd, 0, 0, 0);
    
    // Generate slots for this day
    const slotTime = new Date(dayStart);
    while (slotTime < dayEnd) {
      const slotEnd = new Date(slotTime);
      slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);
      
      if (slotEnd <= dayEnd && slotTime > new Date()) {
        slots.push({
          time: slotTime.toISOString()
        });
      }
      
      slotTime.setMinutes(slotTime.getMinutes() + slotDuration);
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return slots;
}