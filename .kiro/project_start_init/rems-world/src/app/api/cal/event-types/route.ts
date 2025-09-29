import { NextResponse } from 'next/server';
import { CalAPI } from '@/lib/cal-api';

const calApi = new CalAPI();

export async function GET() {
  try {
    const eventTypes = await calApi.getEventTypes();
    return NextResponse.json(eventTypes);
  } catch (error) {
    console.error('Error fetching event types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event types' },
      { status: 500 }
    );
  }
}