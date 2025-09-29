import { NextRequest, NextResponse } from 'next/server';

// Use environment variable or default API key
const CAL_API_KEY = process.env.CAL_API_KEY || 'cal_live_dd8a141b7b4d308171a9876f4c2de6bf';
const CAL_API_URL = 'https://api.cal.com/v1';

// Known event type ID for open-end-meeting
const OPEN_END_MEETING_ID = 2883643;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      start,
      end,
      name,
      email,
      timeZone = 'America/Chicago',
      language = 'en',
      location = 'Google Meet',
      duration = 30
    } = body;
    
    console.log('Create booking request:', {
      start,
      end,
      name,
      email,
      timeZone,
      language,
      location,
      duration
    });
    
    // Validate required parameters
    if (!start || !name || !email) {
      return NextResponse.json(
        { error: 'Missing required parameters: start, name, email' },
        { status: 400 }
      );
    }
    
    // Calculate end time if not provided
    let endTime = end;
    if (!endTime && duration) {
      const startDate = new Date(start);
      const endDate = new Date(startDate.getTime() + (duration * 60 * 1000));
      endTime = endDate.toISOString();
    }
    
    try {
      // Use the v1 /bookings endpoint
      const bookingUrl = `${CAL_API_URL}/bookings?apiKey=${CAL_API_KEY}`;
      
      // Cal.com location string mapping
      // The location parameter should already be the Cal.com integration string
      // from the frontend (e.g., "integrations:google:meet")
      const locationString = location;

      const bookingData = {
        eventTypeId: OPEN_END_MEETING_ID,
        start: start,
        end: endTime,
        timeZone: timeZone,
        language: language,
        metadata: {},
        // Use ONLY responses format (modern Cal.com API)
        // Legacy 'location' field conflicts with 'responses'
        responses: {
          name: name,
          email: email,
          // CRITICAL: Location must be an OBJECT with value and optionValue
          location: {
            value: locationString,
            optionValue: locationString
          }
        }
      };
      
      console.log('📤 BOOKING REQUEST DEBUG - Sending to Cal.com:', JSON.stringify(bookingData, null, 2));
      console.log('📤 BOOKING REQUEST DEBUG - URL:', bookingUrl);
      console.log('📤 BOOKING REQUEST DEBUG - Event Type ID:', OPEN_END_MEETING_ID);
      console.log('📤 BOOKING REQUEST DEBUG - Location string:', locationString);
      
      const response = await fetch(bookingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });
      
      // Handle both JSON and text responses
      let responseData;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        try {
          responseData = await response.json();
        } catch (jsonError) {
          console.error('Failed to parse JSON response:', jsonError);
          const textResponse = await response.text();
          console.error('Raw response text:', textResponse);
          return NextResponse.json(
            { 
              error: 'Cal.com API returned invalid JSON',
              details: textResponse,
              status: response.status
            },
            { status: response.status || 500 }
          );
        }
      } else {
        // Handle plain text response (usually error messages)
        responseData = await response.text();
        console.error('Cal.com returned text response:', responseData);
      }
      
      if (!response.ok) {
        console.error('Cal.com booking API error:', response.status, responseData);
        return NextResponse.json(
          { 
            error: 'Failed to create booking',
            details: typeof responseData === 'string' ? responseData : (responseData.message || 'Unknown error'),
            status: response.status,
            fullResponse: responseData
          },
          { status: response.status }
        );
      }
      
      // Ensure we have proper JSON data for successful responses
      if (typeof responseData === 'string') {
        console.error('Unexpected text response for successful booking:', responseData);
        return NextResponse.json(
          { 
            error: 'Cal.com API returned unexpected response format',
            details: responseData,
            status: response.status
          },
          { status: 500 }
        );
      }
      
      console.log('Booking created successfully:', responseData);
      console.log('📧 EMAIL DEBUG - Full Cal.com response structure:', JSON.stringify(responseData, null, 2));
      
      // Extract the actual booking data from Cal.com response
      const actualBooking = responseData.booking || responseData;
      console.log('📧 EMAIL DEBUG - Actual booking data:', JSON.stringify(actualBooking, null, 2));
      console.log('📧 EMAIL DEBUG - Location in booking:', actualBooking.location);
      console.log('📧 EMAIL DEBUG - References array:', JSON.stringify(actualBooking.references, null, 2));
      
      // Generate meeting URL based on location type
      let meetingUrl = '';
      console.log('📧 EMAIL DEBUG - Generating meeting URL for location:', actualBooking.location);
      console.log('📧 EMAIL DEBUG - Original location sent:', locationString);
      
      // Handle Cal.com location types
      if (locationString === 'integrations:daily' || actualBooking.location === 'integrations:daily') {
        // Cal Video (powered by Daily.co)
        meetingUrl = `https://app.cal.com/video/${actualBooking.uid}`;
        console.log('📧 EMAIL DEBUG - Generated Cal Video URL:', meetingUrl);
      }
      
      // For all location types, try to find meeting URL in references
      if (actualBooking.references && actualBooking.references.length > 0) {
        console.log('📧 EMAIL DEBUG - Searching references for meeting URL...');
        const videoRef = actualBooking.references.find((ref: unknown) => {
          const reference = ref as { type?: string; meetingUrl?: string; meetingPassword?: string };
          console.log('📧 EMAIL DEBUG - Checking reference:', reference);
          return reference.type === 'google_meet' || 
                 reference.type === 'google_calendar' || 
                 reference.type === 'daily' ||
                 reference.type === 'zoom' ||
                 reference.type === 'office365_video' ||
                 reference.meetingUrl;
        });
        if (videoRef) {
          const reference = videoRef as { meetingUrl?: string };
          if (reference.meetingUrl) {
            meetingUrl = reference.meetingUrl;
            console.log('📧 EMAIL DEBUG - Found meeting URL in references:', meetingUrl);
          }
        }
      }
      
      // Fallback: Generate Cal.com video URL for any location type if no specific URL found
      // This handles Daily.co and other integrations that use Cal.com's video infrastructure
      if (!meetingUrl && actualBooking.uid) {
        meetingUrl = `https://app.cal.com/video/${actualBooking.uid}`;
        console.log('📧 EMAIL DEBUG - Fallback: Generated Cal.com video URL for location type:', actualBooking.location);
      }
      
      console.log('📧 EMAIL DEBUG - Final meetingUrl being returned:', meetingUrl);
      
      // Cal.com returns meetingUrl directly in some cases
      const finalMeetingUrl = meetingUrl || actualBooking.meetingUrl || actualBooking.videoCallUrl;
      
      console.log('📧 EMAIL DEBUG - Meeting URL options:', {
        generatedUrl: meetingUrl,
        bookingMeetingUrl: actualBooking.meetingUrl,
        bookingVideoCallUrl: actualBooking.videoCallUrl,
        finalUrl: finalMeetingUrl
      });
      
      // Return the flat booking structure that BookingConfirmation expects
      return NextResponse.json({
        ...actualBooking,
        meetingUrl: finalMeetingUrl, // Use the best available meeting URL
        success: true,
        message: responseData.message || 'Booking created successfully'
      });
      
    } catch (apiError) {
      console.error('Error calling Cal.com booking API:', apiError);
      return NextResponse.json(
        { 
          error: 'Cal.com API error',
          details: apiError instanceof Error ? apiError.message : String(apiError)
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error in booking route:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('id');
    
    if (!bookingId) {
      return NextResponse.json(
        { error: 'Missing booking ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json().catch(() => ({ reason: 'Cancelled by user' }));
    const { reason = 'Cancelled by user' } = body;
    
    try {
      const cancelUrl = `${CAL_API_URL}/bookings/${bookingId}?apiKey=${CAL_API_KEY}`;
      
      const response = await fetch(cancelUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('Cal.com cancel API error:', response.status, responseData);
        return NextResponse.json(
          { 
            error: 'Failed to cancel booking',
            details: responseData.message || 'Unknown error',
            status: response.status
          },
          { status: response.status }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'Booking cancelled successfully',
        data: responseData
      });
      
    } catch (apiError) {
      console.error('Error calling Cal.com cancel API:', apiError);
      return NextResponse.json(
        { 
          error: 'Cal.com API error',
          details: apiError instanceof Error ? apiError.message : String(apiError)
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error in cancel booking route:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}