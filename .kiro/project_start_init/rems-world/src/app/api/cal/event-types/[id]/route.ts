import { NextRequest, NextResponse } from 'next/server';

const CAL_API_KEY = process.env.CAL_API_KEY || 'cal_live_dd8a141b7b4d308171a9876f4c2de6bf';
const CAL_API_URL = 'https://api.cal.com/v1';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventTypeId } = await params;
    
    // Fetch specific event type from Cal.com
    const response = await fetch(
      `${CAL_API_URL}/event-types/${eventTypeId}?apiKey=${CAL_API_KEY}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      console.error('Cal.com event type API error:', response.status, await response.text());
      return NextResponse.json(
        { error: 'Failed to fetch event type from Cal.com' },
        { status: response.status }
      );
    }
    
    const eventType = await response.json();
    
    return NextResponse.json({
      eventType: eventType.event_type,
      locations: eventType.event_type?.locations || []
    });
    
  } catch (error) {
    console.error('Error fetching event type:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch event type',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}