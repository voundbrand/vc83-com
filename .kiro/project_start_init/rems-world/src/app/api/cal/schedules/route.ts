import { NextResponse } from 'next/server';

// Use environment variable or default API key
const CAL_API_KEY = process.env.CAL_API_KEY || 'cal_live_dd8a141b7b4d308171a9876f4c2de6bf';
const CAL_API_URL = 'https://api.cal.com/v1';

export async function GET() {
  try {
    const schedulesUrl = `${CAL_API_URL}/schedules?apiKey=${CAL_API_KEY}`;
    
    console.log('Fetching schedules from:', schedulesUrl);
    
    const response = await fetch(schedulesUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cal.com schedules API error:', response.status, errorText);
      return NextResponse.json(
        { 
          error: 'Failed to fetch schedules from Cal.com',
          details: errorText,
          status: response.status
        },
        { status: response.status }
      );
    }
    
    const schedulesData = await response.json();
    console.log('Cal.com schedules response:', JSON.stringify(schedulesData, null, 2));
    
    return NextResponse.json(schedulesData);
    
  } catch (error) {
    console.error('Error in schedules route:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}