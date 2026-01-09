"use client";

import { Clock, DollarSign, Users, Calendar, Settings } from "lucide-react";

/**
 * Bookable Resource Configuration
 *
 * Configuration options for products that can be booked:
 * - Resources: room, staff, equipment, space
 * - Services: appointment, class, treatment
 */

export interface BookableConfig {
  // Booking Mode
  bookingMode: "calendar" | "date-range" | "both";

  // Duration settings
  minDuration: number;
  maxDuration: number;
  durationUnit: "minutes" | "hours" | "days" | "nights";
  slotIncrement: number; // 15, 30, 60 minutes

  // Buffer time
  bufferBefore: number; // minutes
  bufferAfter: number; // minutes

  // Capacity
  capacity: number; // 1 for staff/room, more for classes

  // Confirmation
  confirmationRequired: boolean;

  // Pricing
  pricePerUnit: number; // cents
  priceUnit: "hour" | "day" | "night" | "session" | "flat";

  // Deposit
  depositRequired: boolean;
  depositAmountCents: number;
  depositPercent: number;

  // Additional
  maxOccupancy?: number; // for rooms
  amenities?: string[];
  specialties?: string[]; // for staff
}

export const DEFAULT_BOOKABLE_CONFIG: BookableConfig = {
  bookingMode: "calendar",
  minDuration: 60,
  maxDuration: 480,
  durationUnit: "minutes",
  slotIncrement: 30,
  bufferBefore: 0,
  bufferAfter: 15,
  capacity: 1,
  confirmationRequired: false,
  pricePerUnit: 0,
  priceUnit: "hour",
  depositRequired: false,
  depositAmountCents: 0,
  depositPercent: 0,
};

// Preset configurations for different bookable types
export const BOOKABLE_PRESETS: Record<string, Partial<BookableConfig>> = {
  room: {
    bookingMode: "both",
    durationUnit: "hours",
    capacity: 1,
    priceUnit: "hour",
  },
  staff: {
    bookingMode: "calendar",
    durationUnit: "minutes",
    slotIncrement: 15,
    capacity: 1,
    priceUnit: "session",
  },
  equipment: {
    bookingMode: "both",
    durationUnit: "hours",
    capacity: 1,
    priceUnit: "day",
  },
  space: {
    bookingMode: "both",
    durationUnit: "hours",
    capacity: 1,
    priceUnit: "hour",
  },
  appointment: {
    bookingMode: "calendar",
    durationUnit: "minutes",
    slotIncrement: 15,
    capacity: 1,
    priceUnit: "session",
    bufferAfter: 15,
  },
  class: {
    bookingMode: "calendar",
    durationUnit: "minutes",
    capacity: 10,
    priceUnit: "session",
    confirmationRequired: false,
  },
  treatment: {
    bookingMode: "calendar",
    durationUnit: "minutes",
    slotIncrement: 15,
    capacity: 1,
    priceUnit: "session",
    bufferBefore: 5,
    bufferAfter: 15,
  },
  accommodation: {
    bookingMode: "date-range",
    durationUnit: "nights",
    minDuration: 1,
    maxDuration: 30,
    capacity: 1,
    priceUnit: "night",
    confirmationRequired: true,
    depositRequired: true,
    depositPercent: 20,
  },
  vehicle: {
    bookingMode: "both",
    durationUnit: "hours",
    minDuration: 60,
    maxDuration: 1440, // 24 hours
    capacity: 1,
    priceUnit: "day",
    depositRequired: true,
    depositPercent: 25,
  },
};

interface BookableConfigSectionProps {
  config: BookableConfig;
  onChange: (config: BookableConfig) => void;
  subtype: string;
}

export function BookableConfigSection({
  config,
  onChange,
  subtype,
}: BookableConfigSectionProps) {
  const updateConfig = (updates: Partial<BookableConfig>) => {
    onChange({ ...config, ...updates });
  };

  // Get subtype label for display
  const subtypeLabels: Record<string, string> = {
    room: "Room / Meeting Space",
    staff: "Staff / Service Provider",
    equipment: "Equipment",
    space: "Workspace / Desk",
    appointment: "Appointment Service",
    class: "Class / Group Session",
    treatment: "Treatment / Spa Service",
    accommodation: "Hotel / Accommodation",
    vehicle: "Vehicle / Transportation",
  };

  return (
    <div
      className="space-y-4 p-4 border-2 rounded"
      style={{
        borderColor: "var(--win95-border)",
        background: "var(--win95-bg-light)",
      }}
    >
      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
        <Settings size={16} />
        Booking Configuration
      </h3>
      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
        Configure how this {subtypeLabels[subtype] || "resource"} can be booked.
      </p>

      {/* Booking Mode */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
          <Calendar size={14} className="inline mr-1" />
          Booking Mode
        </label>
        <select
          value={config.bookingMode}
          onChange={(e) => updateConfig({ bookingMode: e.target.value as BookableConfig["bookingMode"] })}
          className="w-full px-3 py-2 text-sm border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-input-bg)",
            color: "var(--win95-input-text)",
          }}
        >
          <option value="calendar">📅 Calendar - Pick specific time slots</option>
          <option value="date-range">📆 Date Range - Pick check-in/check-out dates</option>
          <option value="both">🔄 Both - Support both modes</option>
        </select>
        <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
          Calendar mode for appointments, date-range for hotels/rentals
        </p>
      </div>

      {/* Duration Settings */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
            <Clock size={12} className="inline mr-1" />
            Duration Unit
          </label>
          <select
            value={config.durationUnit}
            onChange={(e) => updateConfig({ durationUnit: e.target.value as BookableConfig["durationUnit"] })}
            className="w-full px-2 py-1 text-sm border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-input-bg)",
              color: "var(--win95-input-text)",
            }}
          >
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
            <option value="nights">Nights</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
            Slot Increment
          </label>
          <select
            value={config.slotIncrement}
            onChange={(e) => updateConfig({ slotIncrement: parseInt(e.target.value) })}
            className="w-full px-2 py-1 text-sm border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-input-bg)",
              color: "var(--win95-input-text)",
            }}
          >
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">60 minutes</option>
            <option value="120">2 hours</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
            Min Duration ({config.durationUnit})
          </label>
          <input
            type="number"
            min={1}
            value={config.minDuration}
            onChange={(e) => updateConfig({ minDuration: parseInt(e.target.value) || 1 })}
            className="w-full px-2 py-1 text-sm border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-input-bg)",
              color: "var(--win95-input-text)",
            }}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
            Max Duration ({config.durationUnit})
          </label>
          <input
            type="number"
            min={1}
            value={config.maxDuration}
            onChange={(e) => updateConfig({ maxDuration: parseInt(e.target.value) || 1 })}
            className="w-full px-2 py-1 text-sm border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-input-bg)",
              color: "var(--win95-input-text)",
            }}
          />
        </div>
      </div>

      {/* Buffer Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
            Buffer Before (min)
          </label>
          <input
            type="number"
            min={0}
            value={config.bufferBefore}
            onChange={(e) => updateConfig({ bufferBefore: parseInt(e.target.value) || 0 })}
            className="w-full px-2 py-1 text-sm border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-input-bg)",
              color: "var(--win95-input-text)",
            }}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
            Buffer After (min)
          </label>
          <input
            type="number"
            min={0}
            value={config.bufferAfter}
            onChange={(e) => updateConfig({ bufferAfter: parseInt(e.target.value) || 0 })}
            className="w-full px-2 py-1 text-sm border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-input-bg)",
              color: "var(--win95-input-text)",
            }}
          />
        </div>
      </div>
      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
        Buffer time prevents back-to-back bookings (prep/cleanup time)
      </p>

      {/* Capacity */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
          <Users size={14} className="inline mr-1" />
          Capacity
        </label>
        <input
          type="number"
          min={1}
          value={config.capacity}
          onChange={(e) => updateConfig({ capacity: parseInt(e.target.value) || 1 })}
          className="w-full px-3 py-2 text-sm border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-input-bg)",
            color: "var(--win95-input-text)",
          }}
        />
        <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
          {subtype === "class"
            ? "Maximum participants per session"
            : subtype === "room" || subtype === "accommodation"
            ? "Maximum occupancy"
            : "Concurrent bookings allowed (usually 1)"}
        </p>
      </div>

      {/* Confirmation Required */}
      <div
        className="flex items-center justify-between p-3 border-2 rounded"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-input-bg)",
        }}
      >
        <div className="flex-1">
          <label className="block text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
            Require Confirmation
          </label>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            Admin must approve bookings before they're confirmed
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.confirmationRequired}
            onChange={(e) => updateConfig({ confirmationRequired: e.target.checked })}
            className="w-5 h-5"
          />
          <span
            className="text-sm font-bold"
            style={{ color: config.confirmationRequired ? "var(--success)" : "var(--neutral-gray)" }}
          >
            {config.confirmationRequired ? "Yes" : "No"}
          </span>
        </label>
      </div>

      {/* Pricing */}
      <div
        className="space-y-3 p-3 border-2 rounded"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-input-bg)",
        }}
      >
        <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
          <DollarSign size={14} />
          Pricing
        </h4>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
              Price
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={(config.pricePerUnit / 100).toFixed(2)}
              onChange={(e) => updateConfig({ pricePerUnit: Math.round(parseFloat(e.target.value || "0") * 100) })}
              className="w-full px-2 py-1 text-sm border-2"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-input-bg)",
                color: "var(--win95-input-text)",
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
              Per
            </label>
            <select
              value={config.priceUnit}
              onChange={(e) => updateConfig({ priceUnit: e.target.value as BookableConfig["priceUnit"] })}
              className="w-full px-2 py-1 text-sm border-2"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-input-bg)",
                color: "var(--win95-input-text)",
              }}
            >
              <option value="hour">Hour</option>
              <option value="day">Day</option>
              <option value="night">Night</option>
              <option value="session">Session</option>
              <option value="flat">Flat Rate</option>
            </select>
          </div>
        </div>
      </div>

      {/* Deposit Settings */}
      <div
        className="space-y-3 p-3 border-2 rounded"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-input-bg)",
        }}
      >
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
            Deposit Required
          </h4>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.depositRequired}
              onChange={(e) => updateConfig({ depositRequired: e.target.checked })}
              className="w-4 h-4"
            />
            <span
              className="text-sm font-bold"
              style={{ color: config.depositRequired ? "var(--success)" : "var(--neutral-gray)" }}
            >
              {config.depositRequired ? "Yes" : "No"}
            </span>
          </label>
        </div>

        {config.depositRequired && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
                Fixed Amount
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={(config.depositAmountCents / 100).toFixed(2)}
                onChange={(e) => updateConfig({
                  depositAmountCents: Math.round(parseFloat(e.target.value || "0") * 100),
                  depositPercent: 0 // Clear percent when fixed amount is set
                })}
                className="w-full px-2 py-1 text-sm border-2"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-input-bg)",
                  color: "var(--win95-input-text)",
                }}
                placeholder="$0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
                Or Percentage %
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={config.depositPercent}
                onChange={(e) => updateConfig({
                  depositPercent: parseInt(e.target.value) || 0,
                  depositAmountCents: 0 // Clear fixed amount when percent is set
                })}
                className="w-full px-2 py-1 text-sm border-2"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-input-bg)",
                  color: "var(--win95-input-text)",
                }}
                placeholder="20"
              />
            </div>
          </div>
        )}
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          Require a deposit at booking time, with remainder due later
        </p>
      </div>
    </div>
  );
}
