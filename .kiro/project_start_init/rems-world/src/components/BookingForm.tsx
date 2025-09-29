"use client";

import React, { useState } from "react";
import { X, Clock, Calendar, MapPin, User, Mail, Phone, MessageSquare, Check, AlertCircle } from "lucide-react";

interface TimeSlot {
  time: string;
  startTime: Date;
  endTime: Date;
  // Store the original time strings from Cal.com API
  originalStartTime: string;
  originalEndTime?: string;
}

interface BookingResponse {
  uid?: string;
  title?: string;
  startTime?: string;
  endTime?: string;
  start?: string;
  end?: string;
  location?: string;
  meetingUrl?: string;
}

interface BookingFormProps {
  selectedSlot: TimeSlot;
  selectedDate: Date;
  selectedDuration: number;
  selectedLocation: string;
  selectedTimezone: string;
  onClose: () => void;
  onSuccess: (booking: BookingResponse) => void;
}

interface BookingData {
  name: string;
  email: string;
  phone: string;
  notes: string;
  responses: { [key: string]: string };
}

export function BookingForm({ 
  selectedSlot, 
  selectedDate, 
  selectedDuration, 
  selectedLocation, 
  selectedTimezone, 
  onClose, 
  onSuccess 
}: BookingFormProps) {
  const [formData, setFormData] = useState<BookingData>({
    name: '',
    email: '',
    phone: '',
    notes: '',
    responses: {}
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTimeRange = (startTime: Date, duration: number) => {
    const endTime = new Date(startTime.getTime() + (duration * 60 * 1000));
    const options: Intl.DateTimeFormatOptions = { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    };
    return `${startTime.toLocaleTimeString('en-US', options)} - ${endTime.toLocaleTimeString('en-US', options)}`;
  };

  const handleInputChange = (field: keyof BookingData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Valid email address is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      // Debug the slot time conversion issue
      console.log('🔍 Slot time debugging:', {
        selectedSlotObject: selectedSlot,
        originalSlotTime: selectedSlot.startTime,
        convertedToISO: selectedSlot.startTime.toISOString(),
        selectedTimezone: selectedTimezone
      });

      const bookingPayload = {
        // Required top-level fields - use ORIGINAL Cal.com time strings
        start: selectedSlot.originalStartTime,
        end: selectedSlot.originalEndTime || selectedSlot.endTime.toISOString(),
        name: formData.name,
        email: formData.email,
        
        // Optional fields
        timeZone: selectedTimezone,
        language: "en",
        location: selectedLocation,
        duration: selectedDuration,
        
        // Additional data for booking context
        phone: formData.phone,
        notes: formData.notes
      };

      console.log('🎯 Submitting booking to /api/cal/bookings:', {
        payload: bookingPayload,
        payloadJSON: JSON.stringify(bookingPayload, null, 2),
        url: '/api/cal/bookings',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await fetch('/api/cal/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('🚨 Booking API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData
        });
        
        // Show detailed error information
        const errorMessage = errorData.error || errorData.message || errorData.details || `HTTP ${response.status}: ${response.statusText}`;
        const fullError = `Booking failed: ${errorMessage}\n\nFull error details: ${JSON.stringify(errorData, null, 2)}`;
        
        throw new Error(fullError);
      }

      const responseData = await response.json();
      console.log('🚀 Cal.com booking API response:', responseData);
      
      // NO FALLBACKS - pass the exact response to see what Cal.com actually returns
      // If the structure is wrong, the BookingConfirmation will throw a clear error
      onSuccess(responseData);
    } catch (err) {
      console.error('Booking error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border-2 border-accent max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
           style={{ backgroundColor: '#1a1a1a' }}>
        {/* Header */}
        <div className="p-6 border-b border-primary">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-accent neon-glow mb-2">
                Book your meeting
              </h2>
              <div className="space-y-1 text-sm text-secondary">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formatDate(selectedDate)}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {formatTimeRange(selectedSlot.startTime, selectedDuration)}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {selectedLocation}
                </div>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Full Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 bg-dark border border-primary text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:bg-dark focus:outline-none"
                style={{
                  WebkitBoxShadow: '0 0 0 1000px #151517 inset',
                  WebkitTextFillColor: '#e4e4e7',
                  transition: 'background-color 5000s ease-in-out 0s'
                }}
                placeholder="Enter your full name"
                required
              />
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-3 py-2 bg-dark border border-primary text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:bg-dark focus:outline-none"
                style={{
                  WebkitBoxShadow: '0 0 0 1000px #151517 inset',
                  WebkitTextFillColor: '#e4e4e7',
                  transition: 'background-color 5000s ease-in-out 0s'
                }}
                placeholder="Enter your email address"
                required
              />
            </div>

            {/* Phone Field (Optional) */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                <Phone className="w-4 h-4 inline mr-1" />
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-3 py-2 bg-dark border border-primary text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:bg-dark focus:outline-none"
                style={{
                  WebkitBoxShadow: '0 0 0 1000px #151517 inset',
                  WebkitTextFillColor: '#e4e4e7',
                  transition: 'background-color 5000s ease-in-out 0s'
                }}
                placeholder="Enter your phone number (optional)"
              />
            </div>

            {/* Notes Field */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                <MessageSquare className="w-4 h-4 inline mr-1" />
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full px-3 py-2 bg-dark border border-primary text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:bg-dark focus:outline-none resize-none"
                style={{
                  WebkitBoxShadow: '0 0 0 1000px #151517 inset',
                  WebkitTextFillColor: '#e4e4e7',
                  transition: 'background-color 5000s ease-in-out 0s'
                }}
                rows={4}
                placeholder="Any additional information or questions..."
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-500 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-primary text-primary hover:bg-secondary font-medium"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-accent text-dark hover:bg-primary font-medium flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-dark/20 border-t-dark animate-spin rounded-full"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Confirm Booking
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}