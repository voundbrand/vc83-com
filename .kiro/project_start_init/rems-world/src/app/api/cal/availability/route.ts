import { NextRequest, NextResponse } from 'next/server';
import { CalAPI } from '@/lib/cal-api';

const calApi = new CalAPI();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    
    console.log('Availability API called with params:', params);
    
    if (!params.dateFrom || !params.dateTo) {
      return NextResponse.json(
        { error: 'dateFrom and dateTo are required' },
        { status: 400 }
      );
    }
    
    const availability = await calApi.getAvailability({
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      eventTypeId: params.eventTypeId ? parseInt(params.eventTypeId) : undefined,
      userId: params.userId ? parseInt(params.userId) : undefined,
      username: params.username,
      timeZone: params.timeZone,
    });
    
    console.log('Cal.com availability response:', JSON.stringify(availability, null, 2));
    
    return NextResponse.json(availability);
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}