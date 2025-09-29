"use client";

import React, { useState, useEffect } from "react";
import { PageComponentProps } from "@/window-registry";
import { RefreshCw, Plus, Clock, MapPin, User, Check } from "lucide-react";

interface Booking {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  attendees: { name: string; email: string }[];
  location?: { type: string; value: string };
  status: string;
}

interface EventType {
  id: number;
  title: string;
  slug: string;
  length: number;
  description?: string;
}

export function CalendarApplicationEnhanced({}: PageComponentProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const today = new Date();
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();
  const currentDate = today.getDate();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Load cal.com embed script
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.Cal) {
      const script = document.createElement('script');
      script.src = 'https://app.cal.com/embed/embed.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // Fetch bookings
  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/cal/bookings?status=upcoming');
      if (!response.ok) throw new Error('Failed to fetch bookings');
      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (err) {
      setError('Failed to load bookings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch event types
  const fetchEventTypes = async () => {
    try {
      const response = await fetch('/api/cal/event-types');
      if (!response.ok) throw new Error('Failed to fetch event types');
      const data = await response.json();
      setEventTypes(data.event_types || []);
    } catch (err) {
      console.error('Failed to load event types:', err);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchEventTypes();
  }, []);

  // Generate calendar grid
  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  // Get bookings for a specific day
  const getBookingsForDay = (day: number) => {
    if (!day) return [];
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return bookings.filter(booking => 
      booking.startTime.startsWith(dateStr)
    );
  };

  // Open cal.com booking modal
  const openBookingModal = (eventTypeSlug?: string) => {
    if (window.Cal) {
      window.Cal('ui', {
        theme: 'dark',
        styles: { branding: { brandColor: '#10b981' } },
        hideEventTypeDetails: false,
        layout: 'month_view'
      });
      
      if (eventTypeSlug) {
        window.Cal('modal', {
          calLink: `voundbrand/${eventTypeSlug}`,
        });
      } else {
        window.Cal('modal', {
          calLink: 'voundbrand/open-end-meeting',
        });
      }
    }
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedDate(newDate);
  };

  return (
    <div className="p-6 max-h-[600px] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-accent neon-glow">
          Calendar - {monthNames[currentMonth]} {currentYear}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => fetchBookings()}
            className="p-2 hover:bg-secondary border border-primary"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => openBookingModal()}
            className="px-3 py-2 bg-accent text-dark hover:bg-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Booking
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 border border-red-500 bg-red-500/10 text-red-500">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2">
          <div className="bg-dark border border-accent p-4">
            {/* Month Navigation */}
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => navigateMonth(-1)}
                className="px-2 py-1 hover:bg-secondary"
              >
                ←
              </button>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="px-3 py-1 hover:bg-secondary text-sm"
              >
                Today
              </button>
              <button
                onClick={() => navigateMonth(1)}
                className="px-2 py-1 hover:bg-secondary"
              >
                →
              </button>
            </div>

            {/* Week day headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-xs font-bold text-accent">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, index) => {
                const dayBookings = day ? getBookingsForDay(day) : [];
                const isToday = day === currentDate && 
                  currentMonth === today.getMonth() && 
                  currentYear === today.getFullYear();
                
                return (
                  <div
                    key={index}
                    className={`
                      min-h-[60px] p-1 text-sm
                      ${isToday ? "bg-accent text-dark font-bold" : ""}
                      ${day && !isToday ? "hover:bg-secondary cursor-pointer" : ""}
                      ${!day ? "" : "border border-primary"}
                    `}
                  >
                    {day && (
                      <>
                        <div className="mb-1">{day}</div>
                        {dayBookings.length > 0 && (
                          <div className="space-y-1">
                            {dayBookings.slice(0, 2).map((booking, i) => (
                              <div
                                key={i}
                                className="text-xs p-1 bg-primary/20 truncate"
                                title={booking.title}
                              >
                                {new Date(booking.startTime).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </div>
                            ))}
                            {dayBookings.length > 2 && (
                              <div className="text-xs text-secondary">
                                +{dayBookings.length - 2} more
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Event Types */}
          {eventTypes.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-primary">Quick Book</h2>
              <div className="space-y-2">
                {eventTypes.map((eventType) => (
                  <button
                    key={eventType.id}
                    onClick={() => openBookingModal(eventType.slug)}
                    className="w-full p-3 bg-dark border border-primary hover:bg-secondary text-left"
                  >
                    <div className="font-medium">{eventType.title}</div>
                    <div className="text-xs text-secondary">{eventType.length} minutes</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Bookings */}
          <div>
            <h2 className="text-lg font-semibold mb-3 text-primary">
              Upcoming Events
            </h2>
            {loading ? (
              <div className="text-secondary">Loading...</div>
            ) : bookings.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {bookings.slice(0, 5).map((booking) => (
                  <div
                    key={booking.id}
                    className="feature-card p-3"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-sm">{booking.title}</div>
                      {booking.status === 'confirmed' ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                    <div className="space-y-1 text-xs text-secondary">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {new Date(booking.startTime).toLocaleString()} - 
                        {new Date(booking.endTime).toLocaleTimeString()}
                      </div>
                      {booking.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3" />
                          {booking.location.value}
                        </div>
                      )}
                      {booking.attendees.length > 0 && (
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3" />
                          {booking.attendees[0].name || booking.attendees[0].email}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-secondary text-sm">No upcoming bookings</div>
            )}
          </div>

          {/* Calendar Stats */}
          <div className="feature-card p-3">
            <h3 className="font-medium mb-2">Calendar Stats</h3>
            <div className="space-y-1 text-xs text-secondary">
              <p>Today: {today.toLocaleDateString()}</p>
              <p>Time: {today.toLocaleTimeString()}</p>
              <p>Week {Math.ceil((currentDate + firstDayOfMonth) / 7)} of {currentYear}</p>
              <p>Total Bookings: {bookings.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}