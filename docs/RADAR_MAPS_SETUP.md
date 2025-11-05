# Radar.com Maps Setup Guide

This project uses [Radar.com](https://radar.com) for interactive maps in event landing pages. Radar provides better privacy, performance, and cost compared to Google Maps.

## Why Radar.com?

- **Privacy-focused**: No Google tracking or data collection
- **Better performance**: Faster map loading and rendering
- **Cost-effective**: More generous free tier and lower pricing
- **Modern API**: Built on Mapbox GL JS with a clean, developer-friendly API
- **Beautiful maps**: Professional map styles out of the box

## Setup Instructions

### 1. Create a Radar Account

1. Go to [radar.com](https://radar.com)
2. Sign up for a free account
3. Navigate to the [Radar Dashboard](https://radar.com/dashboard)

### 2. Get Your Publishable Key

1. In the Radar Dashboard, go to **Settings** → **API Keys**
2. Copy your **Publishable Key** (starts with `prj_live_` or `prj_test_`)
3. **Important**: Use the **Publishable** key, not the Secret key

### 3. Add to Environment Variables

Add your Radar publishable key to `.env.local`:

```bash
NEXT_PUBLIC_RADAR_PUBLISHABLE_KEY=prj_live_pk_xxxxxxxxxxxxx
```

### 4. Verify Installation

The `radar-sdk-js` package is already installed in this project. If you need to reinstall:

```bash
npm install radar-sdk-js
```

## Usage in Event Landing Pages

Maps automatically appear on event landing pages when:

1. An event has location data (venue name, address, coordinates)
2. The "Show Map" toggle is enabled in the event form
3. The `NEXT_PUBLIC_RADAR_PUBLISHABLE_KEY` is configured

### Map Features

- **Interactive**: Users can zoom, pan, and explore the area
- **Venue Marker**: Automatically placed at the event coordinates
- **Responsive**: Works on desktop and mobile devices
- **Accessible**: Proper ARIA labels for screen readers

## Fallback to Google Maps

If Radar is not configured, the system automatically falls back to Google Maps (if `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set). However, we recommend using Radar for the benefits listed above.

## Components

### RadarMap Component

Located at: `src/components/ui/radar-map.tsx`

**Props:**
- `latitude: number` - Venue latitude
- `longitude: number` - Venue longitude
- `title?: string` - Marker popup text
- `className?: string` - Additional CSS classes
- `height?: string` - Map container height (default: "400px")
- `zoom?: number` - Initial zoom level (default: 15)
- `showMarker?: boolean` - Show venue marker (default: true)

**Example:**
```tsx
<RadarMap
  latitude={37.7749}
  longitude={-122.4194}
  title="Conference Center"
  height="400px"
  zoom={14}
/>
```

### GoogleMapFallback Component

Fallback component that uses Google Maps iframe when Radar is not available.

## Pricing

Radar offers:
- **Free Tier**: 100,000 monthly active users
- **Pay as you go**: $0.50 per 1,000 MAUs beyond free tier

This is significantly more generous than Google Maps pricing.

## Troubleshooting

### Map Not Showing

1. **Check API Key**: Ensure `NEXT_PUBLIC_RADAR_PUBLISHABLE_KEY` is in `.env.local`
2. **Restart Dev Server**: After adding env vars, restart with `npm run dev`
3. **Check Console**: Look for errors in browser DevTools console
4. **Verify Key**: Ensure you're using the Publishable key, not Secret key

### Map Shows "Map Unavailable"

This fallback appears when:
- No Radar or Google Maps API key is configured
- Check your `.env.local` file and restart the dev server

## Resources

- [Radar Documentation](https://radar.com/documentation)
- [Radar SDK for JavaScript](https://radar.com/documentation/sdk/javascript)
- [Radar Pricing](https://radar.com/pricing)
- [Radar Dashboard](https://radar.com/dashboard)

## Security Note

The Radar **Publishable** key is safe to use in client-side code and can be committed to your repository. It's designed for frontend use and has limited permissions.

**Never** commit your Radar **Secret** key - that's for server-side use only.
