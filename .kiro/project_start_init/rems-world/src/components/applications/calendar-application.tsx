"use client";

import React from "react";
import { PageComponentProps } from "@/window-registry";

export function CalendarApplication({}: PageComponentProps) {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentDate = today.getDate();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Generate calendar grid
  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-accent neon-glow">
        {monthNames[currentMonth]} {currentYear}
      </h1>

      <div className="bg-dark border border-accent p-4">
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
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`
                h-8 flex items-center justify-center text-sm
                ${day === currentDate ? "bg-accent text-dark font-bold" : ""}
                ${day && day !== currentDate ? "hover:bg-secondary cursor-pointer" : ""}
                ${!day ? "" : "border border-primary"}
              `}
            >
              {day}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-2 text-xs text-secondary">
        <p>Today: {today.toLocaleDateString()}</p>
        <p>Time: {today.toLocaleTimeString()}</p>
        <p>Week {Math.ceil((currentDate + firstDayOfMonth) / 7)} of {currentYear}</p>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-3 text-primary">Upcoming Events</h2>
        <div className="space-y-2">
          <div className="feature-card">
            <div className="text-sm font-medium">System Maintenance</div>
            <div className="text-xs text-secondary">Tomorrow at 2:00 AM</div>
          </div>
          <div className="feature-card">
            <div className="text-sm font-medium">Retro Computing Meetup</div>
            <div className="text-xs text-secondary">Next Friday at 7:00 PM</div>
          </div>
        </div>
      </div>
    </div>
  );
}