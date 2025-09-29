# Cal.com Integration Guide

## Overview

This project includes a complete cal.com API integration that allows you to:
- Display calendar events and bookings
- Create new bookings
- Check availability
- Manage event types
- Embed cal.com booking widgets

## Setup

1. **Add your cal.com API key to `.env.local`:**
   ```env
   CAL_API_KEY=your_cal_api_key_here
   CAL_API_URL=https://api.cal.com/v1
   ```

2. **Access the enhanced calendar app:**
   - The basic calendar is available at the "Calendar" (📅) icon
   - The cal.com integrated calendar is available at the "Calendar Pro" (📆) icon

## Usage Examples

### Using the CalAPI Client Directly

```typescript
import { calApi } from '@/lib/cal-api';

// Get all bookings
const bookings = await calApi.getBookings({
  status: 'upcoming',
  startTime: new Date().toISOString()
});

// Get event types
const eventTypes = await calApi.getEventTypes();

// Check availability
const availability = await calApi.getAvailability({
  dateFrom: '2024-01-01',
  dateTo: '2024-01-31',
  eventTypeId: 123
});

// Create a booking
const newBooking = await calApi.createBooking({
  eventTypeId: 123,
  start: '2024-01-15T10:00:00Z',
  end: '2024-01-15T10:30:00Z',
  name: 'John Doe',
  email: 'john@example.com',
  timeZone: 'America/New_York'
});
```

### Using the useCal Hook in React Components

```tsx
import { useCal } from '@/hooks/use-cal';

function MyCalendarComponent() {
  const {
    loading,
    error,
    data,
    getBookings,
    getEventTypes,
    openCalModal
  } = useCal({
    onSuccess: (data) => console.log('Success:', data),
    onError: (error) => console.error('Error:', error)
  });

  // Fetch bookings
  const handleFetchBookings = async () => {
    await getBookings({ status: 'upcoming' });
  };

  // Open cal.com booking modal
  const handleBookMeeting = () => {
    openCalModal('voundbrand/30min', {
      theme: 'dark',
      layout: 'month_view'
    });
  };

  return (
    <div>
      <button onClick={handleFetchBookings}>
        Load Bookings
      </button>
      <button onClick={handleBookMeeting}>
        Book Meeting
      </button>
      
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error.message}</div>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
```

## API Endpoints

The following API routes are available:

- `GET /api/cal/bookings` - Get bookings (with optional filters)
- `POST /api/cal/bookings` - Create a new booking
- `GET /api/cal/availability` - Check availability
- `GET /api/cal/event-types` - Get all event types

## Features

### Calendar Pro Application

The enhanced calendar application includes:
- Monthly calendar view with event indicators
- Upcoming bookings list
- Quick booking buttons for different event types
- Integration with cal.com booking modal
- Real-time refresh of bookings
- Calendar navigation (previous/next month)
- Today button to return to current date

### Cal.com Embed

The cal.com embed is automatically loaded and can be triggered:
- Through quick book buttons
- By clicking on calendar dates
- Via the "New Booking" button

### Error Handling

All API calls include proper error handling:
- Network errors are caught and displayed
- API errors show appropriate messages
- Loading states are shown during requests
- Graceful fallbacks for missing data

## Customization

### Theme Configuration

Customize the cal.com embed theme:

```javascript
window.Cal('ui', {
  theme: 'dark', // or 'light'
  styles: {
    branding: {
      brandColor: '#10b981'
    }
  },
  hideEventTypeDetails: false,
  layout: 'month_view'
});
```

### Event Type Configuration

Configure different booking links for different event types:
- Update the `calLink` parameter in `openCalModal`
- Replace `voundbrand` with your cal.com username
- Use your specific event type slugs

## Security Notes

- Never expose your API key in client-side code
- All API calls go through Next.js API routes
- Environment variables are properly secured
- Rate limiting should be implemented for production use

## Troubleshooting

### Common Issues

1. **"Failed to fetch bookings" error**
   - Check that your API key is correctly set in `.env.local`
   - Verify the API key has the necessary permissions

2. **Cal.com embed not loading**
   - Ensure the embed script is loaded (check browser console)
   - Verify you're using the correct cal.com username

3. **No bookings showing**
   - Check the date range in your API calls
   - Verify the booking status filter (upcoming/past/cancelled)

### Debug Mode

Enable debug logging by adding to your component:

```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('Cal API Response:', data);
  console.log('Cal API Error:', error);
}
```

## Future Enhancements

- Add webhook support for real-time updates
- Implement recurring events
- Add team calendar support
- Create custom booking forms
- Add calendar sync (Google, Outlook)
- Implement buffer time management
- Add availability schedule management