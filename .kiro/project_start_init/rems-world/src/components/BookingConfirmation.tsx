"use client";

import React from "react";
import { CheckCircle, Calendar, Clock, MapPin, Mail, X, ExternalLink } from "lucide-react";
import { getLocationDisplayName } from "@/lib/location-utils";

interface BookingData {
  uid?: string;
  id?: string;
  title?: string;
  startTime?: string;
  endTime?: string;
  start?: string;
  end?: string;
  dateFrom?: string;
  dateTo?: string;
  location?: string;
  meetingUrl?: string;
  // Cal.com might return additional fields
  [key: string]: unknown;
}

interface BookingConfirmationProps {
  booking: BookingData;
  selectedTimezone: string;
  onClose: () => void;
}

export function BookingConfirmation({ booking, selectedTimezone, onClose }: BookingConfirmationProps) {
  // Debug: log the booking data structure
  console.log('BookingConfirmation received booking data:', booking);

  const formatDate = (dateStr: string) => {
    if (!dateStr) {
      throw new Error(`BOOKING ERROR: No date string provided. Booking data: ${JSON.stringify(booking)}`);
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error(`BOOKING ERROR: Invalid date string: "${dateStr}". Booking data: ${JSON.stringify(booking)}`);
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: selectedTimezone
    });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) {
      throw new Error(`BOOKING ERROR: No time string provided. Booking data: ${JSON.stringify(booking)}`);
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error(`BOOKING ERROR: Invalid time string: "${dateStr}". Booking data: ${JSON.stringify(booking)}`);
    }
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: selectedTimezone
    });
  };

  const formatTimeRange = (startStr: string, endStr: string) => {
    return `${formatTime(startStr)} - ${formatTime(endStr)}`;
  };

  // Get start and end times - throw errors if not found (NO FALLBACKS)
  const getStartTime = (): string => {
    const possibleFields = [
      { name: 'startTime', value: booking.startTime },
      { name: 'start', value: booking.start },
      { name: 'dateFrom', value: booking.dateFrom },
      { name: 'time', value: booking.time },
      { name: 'datetime', value: booking.datetime },
      { name: 'scheduledDate', value: booking.scheduledDate }
    ];
    
    for (const field of possibleFields) {
      if (field.value && typeof field.value === 'string') {
        console.log('✅ Found start time in field:', field.name, '=', field.value);
        return field.value;
      }
    }
    
    throw new Error(`BOOKING ERROR: No start time found in Cal.com response. Available fields: ${Object.keys(booking).join(', ')}. Full booking data: ${JSON.stringify(booking, null, 2)}`);
  };
  
  const getEndTime = (): string => {
    const possibleFields = [
      { name: 'endTime', value: booking.endTime },
      { name: 'end', value: booking.end },
      { name: 'dateTo', value: booking.dateTo },
      { name: 'endDate', value: booking.endDate },
      { name: 'scheduledEndDate', value: booking.scheduledEndDate }
    ];
    
    for (const field of possibleFields) {
      if (field.value && typeof field.value === 'string') {
        console.log('✅ Found end time in field:', field.name, '=', field.value);
        return field.value;
      }
    }
    
    throw new Error(`BOOKING ERROR: No end time found in Cal.com response. Available fields: ${Object.keys(booking).join(', ')}. Full booking data: ${JSON.stringify(booking, null, 2)}`);
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border-2 border-accent max-w-lg w-full shadow-2xl"
           style={{ backgroundColor: '#1a1a1a' }}>
        {/* Header */}
        <div className="p-6 border-b border-primary">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <div>
                <h2 className="text-xl font-bold text-accent neon-glow">
                  Booking Confirmed!
                </h2>
                <p className="text-sm text-secondary">
                  Your meeting has been successfully scheduled
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-secondary text-accent"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Booking Details */}
        <div className="p-6">
          <div className="space-y-4">
            {/* Meeting Title */}
            {booking.title && (
              <div>
                <h3 className="font-semibold text-primary mb-1">Meeting</h3>
                <p className="text-secondary">{booking.title}</p>
              </div>
            )}

            {/* Date & Time */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-secondary">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(getStartTime())}</span>
              </div>
              <div className="flex items-center gap-2 text-secondary">
                <Clock className="w-4 h-4" />
                <span>{formatTimeRange(getStartTime(), getEndTime())}</span>
              </div>
            </div>

            {/* Location */}
            {booking.location && (
              <div className="flex items-start gap-2 text-secondary">
                <MapPin className="w-4 h-4 mt-0.5" />
                <div>
                  <p>{getLocationDisplayName(booking.location)}</p>
                  {booking.meetingUrl && (
                    <a
                      href={booking.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline text-sm flex items-center gap-1 mt-1"
                    >
                      Join meeting <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Booking Reference */}
            {booking.uid && (
              <div>
                <h4 className="font-medium text-primary mb-1">Booking Reference</h4>
                <p className="text-xs text-secondary font-mono">{booking.uid}</p>
              </div>
            )}

            {/* Email Confirmation */}
            <div className="p-3 bg-primary/10 border border-primary/30">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-accent" />
                <span className="text-primary">
                  A confirmation email has been sent to your email address
                </span>
              </div>
            </div>

            {/* Cal.com Link */}
            {booking.uid && (
              <div className="text-center">
                <a
                  href={`https://cal.com/booking/${booking.uid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline text-sm flex items-center justify-center gap-1"
                >
                  View in Cal.com <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-primary">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-accent text-dark hover:bg-primary font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}