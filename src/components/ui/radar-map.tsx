"use client";

import React, { useEffect, useRef } from 'react';
import radar from 'radar-sdk-js';

interface RadarMapProps {
  latitude: number;
  longitude: number;
  title?: string;
  className?: string;
  height?: string;
  zoom?: number;
  showMarker?: boolean;
}

/**
 * Radar Map Component
 *
 * Renders an interactive map using Radar.com's mapping SDK.
 * Radar provides better privacy, performance, and cost compared to Google Maps.
 *
 * Features:
 * - Interactive map with zoom/pan
 * - Custom marker for venue location
 * - Responsive design
 * - Privacy-focused (no Google tracking)
 */
export const RadarMap: React.FC<RadarMapProps> = ({
  latitude,
  longitude,
  title = 'Event Location',
  className = '',
  height = '400px',
  zoom = 15,
  showMarker = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ReturnType<typeof radar.ui.map> | null>(null);

  useEffect(() => {
    // Initialize Radar SDK
    if (process.env.NEXT_PUBLIC_RADAR_PUBLISHABLE_KEY) {
      radar.initialize(process.env.NEXT_PUBLIC_RADAR_PUBLISHABLE_KEY);
    } else {
      console.warn('Radar.com API key not found. Map will not render.');
      return;
    }

    // Create map instance
    if (mapContainerRef.current && !mapRef.current) {
      try {
        // Radar uses Mapbox GL JS under the hood
        const map = radar.ui.map({
          container: mapContainerRef.current,
          style: 'radar-default-v1', // Radar's default map style
          center: [longitude, latitude],
          zoom: zoom,
        });

        // Add marker for venue location
        if (showMarker) {
          radar.ui.marker({
            text: title,
            width: '200px',
          })
            .setLngLat([longitude, latitude])
            .addTo(map);
        }

        mapRef.current = map;
      } catch (error) {
        console.error('Failed to initialize Radar map:', error);
      }
    }

    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [latitude, longitude, title, zoom, showMarker]);

  // Show fallback if no API key
  if (!process.env.NEXT_PUBLIC_RADAR_PUBLISHABLE_KEY) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-gray-100 border-2 border-gray-300 rounded-lg`}
        style={{ height }}
      >
        <div className="text-center px-4">
          <p className="text-gray-600 font-medium mb-2">Map Unavailable</p>
          <p className="text-gray-500 text-sm">
            Configure NEXT_PUBLIC_RADAR_PUBLISHABLE_KEY to enable maps
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      className={`${className} rounded-lg overflow-hidden border border-gray-300`}
      style={{ height }}
      aria-label={`Map showing ${title}`}
    />
  );
};

/**
 * Fallback to Google Maps (for backward compatibility)
 *
 * If RADAR_PUBLISHABLE_KEY is not set but GOOGLE_MAPS_API_KEY is available,
 * render Google Maps iframe instead.
 */
export const GoogleMapFallback: React.FC<{
  latitude: number;
  longitude: number;
  className?: string;
  height?: string;
}> = ({ latitude, longitude, className = '', height = '400px' }) => {
  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-gray-100 border-2 border-gray-300 rounded-lg`}
        style={{ height }}
      >
        <div className="text-center px-4">
          <p className="text-gray-600 font-medium mb-2">Map Unavailable</p>
          <p className="text-gray-500 text-sm">
            Configure NEXT_PUBLIC_RADAR_PUBLISHABLE_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ height, position: 'relative' }}>
      <iframe
        width="100%"
        height="100%"
        style={{ border: 0, borderRadius: '8px' }}
        src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${latitude},${longitude}`}
        allowFullScreen
        title="Event Venue Map"
      />
    </div>
  );
};
