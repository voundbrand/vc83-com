"use client";

import React, { useState, useEffect } from "react";
import { PageComponentProps } from "@/window-registry";
import { RefreshCw, Clock, ChevronLeft, ChevronRight, Calendar, Video, Users, Globe, Monitor } from "lucide-react";

export function CalendarBookingDirect({}: PageComponentProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [selectedLocation, setSelectedLocation] = useState<string>('Cal Video');
  const [selectedTimezone, setSelectedTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [calLoaded, setCalLoaded] = useState(false);
  
  const today = new Date();
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  // Constants
  const OPEN_END_MEETING_SLUG = "open-end-meeting";
  const CAL_USERNAME = "voundbrand";

  // Load and initialize cal.com embed
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.Cal) {
      const script = document.createElement('script');
      script.src = 'https://app.cal.com/embed/embed.js';
      script.async = true;
      script.onload = () => {
        setCalLoaded(true);
        // Initialize Cal
        if (window.Cal) {
          window.Cal("init", {origin: "https://cal.com"});
          
          // Create inline calendar
          window.Cal("inline", {
            elementOrSelector: "#cal-inline-embed",
            calLink: `${CAL_USERNAME}/${OPEN_END_MEETING_SLUG}`,
            layout: "month_view",
            config: {
              theme: "dark",
              hideEventTypeDetails: false
            }
          });
        }
      };
      document.head.appendChild(script);
    }
  }, []);

  const navigateMonth = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedDate(newDate);
  };

  const openBookingModal = () => {
    if (window.Cal) {
      window.Cal('modal', {
        calLink: `${CAL_USERNAME}/${OPEN_END_MEETING_SLUG}`,
        layout: "month_view",
        config: {
          theme: 'dark',
          styles: { branding: { brandColor: '#e0870b' } }
        }
      });
    }
  };

  // Generate calendar grid
  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(0);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-accent neon-glow">
        Book a Meeting
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cal.com Embed */}
        <div className="lg:col-span-2">
          <div 
            id="cal-inline-embed" 
            style={{ 
              width: '100%', 
              height: '600px',
              overflow: 'auto'
            }}
            className="bg-dark border border-accent"
          />
          
          {!calLoaded && (
            <div className="bg-dark border border-accent p-4 h-[600px] flex items-center justify-center">
              <div className="text-secondary">Loading calendar...</div>
            </div>
          )}
        </div>

        {/* Options Sidebar */}
        <div className="space-y-4">
          {/* Duration Selector */}
          <div className="feature-card p-4">
            <h3 className="font-semibold mb-3 text-primary">Duration</h3>
            <div className="grid grid-cols-2 gap-2">
              {[5, 15, 30, 60, 90, 120].map((duration) => (
                <button
                  key={duration}
                  onClick={() => setSelectedDuration(duration)}
                  className={`
                    px-3 py-2 text-sm border
                    ${selectedDuration === duration
                      ? "bg-accent text-dark border-accent font-medium"
                      : "border-primary hover:bg-secondary"
                    }
                  `}
                >
                  {duration < 60 
                    ? `${duration} min` 
                    : duration === 60 
                      ? '1 hour'
                      : duration === 90
                        ? '1.5 hours'
                        : '2 hours'}
                </button>
              ))}
            </div>
          </div>

          {/* Location Selection */}
          <div className="feature-card p-4">
            <h3 className="font-semibold mb-3 text-primary">Location</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Cal Video', icon: Video },
                { name: 'Google Meet', icon: Globe },
                { name: 'MS Teams', icon: Users },
                { name: 'Zoom', icon: Monitor }
              ].map(({ name, icon: Icon }) => (
                <button
                  key={name}
                  onClick={() => setSelectedLocation(name)}
                  className={`
                    p-3 text-xs border flex items-center gap-2
                    ${selectedLocation === name
                      ? "bg-accent text-dark border-accent font-medium"
                      : "border-primary hover:bg-secondary"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="feature-card p-4">
            <button
              onClick={openBookingModal}
              className="w-full px-4 py-3 bg-accent text-dark hover:bg-primary font-medium flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Open Booking Modal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}