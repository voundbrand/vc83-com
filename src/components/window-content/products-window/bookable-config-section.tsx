"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, DollarSign, Users, Calendar, Settings, Ship, Armchair, BedDouble } from "lucide-react";

/**
 * Bookable Resource Configuration
 *
 * Configuration options for products that can be booked.
 * Supports 4 availability models:
 * - time_slot: Appointments, consultations, classes (existing)
 * - date_range_inventory: Hotel rooms, vacation rentals, equipment by day
 * - event_bound_seating: Venues with a fixed number of seats per event
 * - departure_bound: Vehicles (boats, planes, buses) with seats per departure
 */

export type AvailabilityModel =
  | "time_slot"
  | "date_range_inventory"
  | "event_bound_seating"
  | "departure_bound";

export interface BookableConfig {
  // Availability Model
  availabilityModel: AvailabilityModel;

  // --- Time-Slot fields ---
  bookingMode: "calendar" | "date-range" | "both";
  minDuration: number;
  maxDuration: number;
  durationUnit: "minutes" | "hours" | "days" | "nights";
  slotIncrement: number;
  bufferBefore: number;
  bufferAfter: number;

  // --- Shared fields ---
  capacity: number;
  confirmationRequired: boolean;
  pricePerUnit: number;
  priceUnit: "hour" | "day" | "night" | "session" | "flat" | "seat" | "per_person";

  // Deposit
  depositRequired: boolean;
  depositAmountCents: number;
  depositPercent: number;

  // --- Date-Range Inventory fields ---
  inventoryCount?: number;        // number of units (rooms, items)
  minimumStayNights?: number;
  maximumStayNights?: number;
  checkInTime?: string;           // "15:00"
  checkOutTime?: string;          // "11:00"
  baseNightlyRateCents?: number;

  // --- Event-Bound Seating fields ---
  totalSeats?: number;            // seats in the venue/room
  maxSeatsPerBooking?: number;    // max seats one booking can claim

  // --- Departure-Bound fields ---
  totalPassengerSeats?: number;   // seats on the vehicle
  vehicleType?: string;           // ferry, bus, train, aircraft
  boardingMinutesBefore?: number; // boarding opens N min before departure

  // Additional
  maxOccupancy?: number;
  amenities?: string[];
  specialties?: string[];
}

export const DEFAULT_BOOKABLE_CONFIG: BookableConfig = {
  availabilityModel: "time_slot",
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
    availabilityModel: "time_slot",
    bookingMode: "both",
    durationUnit: "hours",
    capacity: 1,
    priceUnit: "hour",
  },
  staff: {
    availabilityModel: "time_slot",
    bookingMode: "calendar",
    durationUnit: "minutes",
    slotIncrement: 15,
    capacity: 1,
    priceUnit: "session",
  },
  equipment: {
    availabilityModel: "time_slot",
    bookingMode: "both",
    durationUnit: "hours",
    capacity: 1,
    priceUnit: "day",
  },
  space: {
    availabilityModel: "time_slot",
    bookingMode: "both",
    durationUnit: "hours",
    capacity: 1,
    priceUnit: "hour",
  },
  appointment: {
    availabilityModel: "time_slot",
    bookingMode: "calendar",
    durationUnit: "minutes",
    slotIncrement: 15,
    capacity: 1,
    priceUnit: "session",
    bufferAfter: 15,
  },
  class: {
    availabilityModel: "time_slot",
    bookingMode: "calendar",
    durationUnit: "minutes",
    capacity: 10,
    priceUnit: "session",
    confirmationRequired: false,
  },
  treatment: {
    availabilityModel: "time_slot",
    bookingMode: "calendar",
    durationUnit: "minutes",
    slotIncrement: 15,
    capacity: 1,
    priceUnit: "session",
    bufferBefore: 5,
    bufferAfter: 15,
  },
  accommodation: {
    availabilityModel: "date_range_inventory",
    bookingMode: "date-range",
    durationUnit: "nights",
    minDuration: 1,
    maxDuration: 30,
    capacity: 1,
    priceUnit: "night",
    confirmationRequired: true,
    depositRequired: true,
    depositPercent: 20,
    inventoryCount: 1,
    minimumStayNights: 1,
    maximumStayNights: 30,
    checkInTime: "15:00",
    checkOutTime: "11:00",
    baseNightlyRateCents: 0,
  },
  vehicle: {
    availabilityModel: "departure_bound",
    bookingMode: "both",
    durationUnit: "hours",
    minDuration: 60,
    maxDuration: 1440,
    capacity: 1,
    priceUnit: "per_person",
    depositRequired: true,
    depositPercent: 25,
    totalPassengerSeats: 50,
    vehicleType: "ferry",
    boardingMinutesBefore: 30,
  },
};

const AVAILABILITY_MODEL_OPTIONS: Array<{
  value: AvailabilityModel;
  label: string;
  description: string;
}> = [
  {
    value: "time_slot",
    label: "Time Slot",
    description: "Appointments, consultations, classes with specific time windows",
  },
  {
    value: "date_range_inventory",
    label: "Date-Range Inventory",
    description: "Hotel rooms, rentals — units available across date ranges",
  },
  {
    value: "event_bound_seating",
    label: "Event Seating",
    description: "Venues with a fixed number of seats per event/showing",
  },
  {
    value: "departure_bound",
    label: "Departure / Transport",
    description: "Vehicles (boats, planes, buses) with seats per departure",
  },
];

interface BookableConfigSectionProps {
  config: BookableConfig;
  onChange: (config: BookableConfig) => void;
  subtype: string;
}

// Shared input styling
const inputStyle = {
  borderColor: "var(--win95-border)",
  background: "var(--win95-input-bg)",
  color: "var(--win95-input-text)",
};

const inputClass = "w-full px-2 py-1 text-sm border-2";
const labelClass = "block text-xs font-semibold mb-1";

/**
 * Hook for currency inputs that store cents internally but display dollars.
 * Uses local string state so the cursor doesn't jump on every keystroke.
 * Commits to parent on blur.
 */
function useCentsInput(cents: number, onCommit: (cents: number) => void) {
  const [localValue, setLocalValue] = useState(() => (cents / 100).toFixed(2));

  // Sync from parent when the cents value changes externally
  useEffect(() => {
    setLocalValue((prev) => {
      const prevCents = Math.round(parseFloat(prev || "0") * 100);
      if (prevCents !== cents) {
        return (cents / 100).toFixed(2);
      }
      return prev;
    });
  }, [cents]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  }, []);

  const handleBlur = useCallback(() => {
    const parsed = parseFloat(localValue || "0");
    const newCents = Math.round(parsed * 100);
    onCommit(newCents);
    // Normalize display on blur
    setLocalValue((newCents / 100).toFixed(2));
  }, [localValue, onCommit]);

  return { value: localValue, onChange: handleChange, onBlur: handleBlur };
}

export function BookableConfigSection({
  config,
  onChange,
  subtype,
}: BookableConfigSectionProps) {
  const updateConfig = useCallback((updates: Partial<BookableConfig>) => {
    onChange({ ...config, ...updates });
  }, [config, onChange]);

  const model = config.availabilityModel || "time_slot";

  // Currency inputs use local string state to prevent cursor jumping
  const nightlyRate = useCentsInput(config.baseNightlyRateCents ?? 0, useCallback(
    (cents: number) => updateConfig({ baseNightlyRateCents: cents }), [updateConfig]
  ));
  const seatPrice = useCentsInput(config.pricePerUnit, useCallback(
    (cents: number) => updateConfig({ pricePerUnit: cents, priceUnit: "seat" as BookableConfig["priceUnit"] }), [updateConfig]
  ));
  const passengerPrice = useCentsInput(config.pricePerUnit, useCallback(
    (cents: number) => updateConfig({ pricePerUnit: cents, priceUnit: "per_person" as BookableConfig["priceUnit"] }), [updateConfig]
  ));
  const timeSlotPrice = useCentsInput(config.pricePerUnit, useCallback(
    (cents: number) => updateConfig({ pricePerUnit: cents }), [updateConfig]
  ));
  const depositAmount = useCentsInput(config.depositAmountCents, useCallback(
    (cents: number) => updateConfig({ depositAmountCents: cents, depositPercent: 0 }), [updateConfig]
  ));

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

      {/* Availability Model Selector */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
          <Calendar size={14} className="inline mr-1" />
          Availability Model
        </label>
        <select
          value={model}
          onChange={(e) => updateConfig({ availabilityModel: e.target.value as AvailabilityModel })}
          className="w-full px-3 py-2 text-sm border-2"
          style={inputStyle}
        >
          {AVAILABILITY_MODEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
          {AVAILABILITY_MODEL_OPTIONS.find((o) => o.value === model)?.description}
        </p>
      </div>

      {/* ====== TIME-SLOT CONFIG ====== */}
      {model === "time_slot" && (
        <>
          {/* Booking Mode */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
              Booking Mode
            </label>
            <select
              value={config.bookingMode}
              onChange={(e) => updateConfig({ bookingMode: e.target.value as BookableConfig["bookingMode"] })}
              className="w-full px-3 py-2 text-sm border-2"
              style={inputStyle}
            >
              <option value="calendar">Calendar - Pick specific time slots</option>
              <option value="date-range">Date Range - Pick check-in/check-out dates</option>
              <option value="both">Both - Support both modes</option>
            </select>
          </div>

          {/* Duration Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={{ color: "var(--win95-text)" }}>
                <Clock size={12} className="inline mr-1" />
                Duration Unit
              </label>
              <select
                value={config.durationUnit}
                onChange={(e) => updateConfig({ durationUnit: e.target.value as BookableConfig["durationUnit"] })}
                className={inputClass}
                style={inputStyle}
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="nights">Nights</option>
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ color: "var(--win95-text)" }}>
                Slot Increment
              </label>
              <select
                value={config.slotIncrement}
                onChange={(e) => updateConfig({ slotIncrement: parseInt(e.target.value) })}
                className={inputClass}
                style={inputStyle}
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
              <label className={labelClass} style={{ color: "var(--win95-text)" }}>
                Min Duration ({config.durationUnit})
              </label>
              <input
                type="number"
                min={1}
                value={config.minDuration}
                onChange={(e) => updateConfig({ minDuration: parseInt(e.target.value) || 1 })}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: "var(--win95-text)" }}>
                Max Duration ({config.durationUnit})
              </label>
              <input
                type="number"
                min={1}
                value={config.maxDuration}
                onChange={(e) => updateConfig({ maxDuration: parseInt(e.target.value) || 1 })}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Buffer Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={{ color: "var(--win95-text)" }}>
                Buffer Before (min)
              </label>
              <input
                type="number"
                min={0}
                value={config.bufferBefore}
                onChange={(e) => updateConfig({ bufferBefore: parseInt(e.target.value) || 0 })}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: "var(--win95-text)" }}>
                Buffer After (min)
              </label>
              <input
                type="number"
                min={0}
                value={config.bufferAfter}
                onChange={(e) => updateConfig({ bufferAfter: parseInt(e.target.value) || 0 })}
                className={inputClass}
                style={inputStyle}
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
              style={inputStyle}
            />
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              {subtype === "class"
                ? "Maximum participants per session"
                : subtype === "room" || subtype === "accommodation"
                ? "Maximum occupancy"
                : "Concurrent bookings allowed (usually 1)"}
            </p>
          </div>
        </>
      )}

      {/* ====== DATE-RANGE INVENTORY CONFIG ====== */}
      {model === "date_range_inventory" && (
        <div
          className="space-y-3 p-3 border-2 rounded"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)" }}
        >
          <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
            <BedDouble size={14} />
            Inventory Settings
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={{ color: "var(--win95-text)" }}>
                Number of Units
              </label>
              <input
                type="number"
                min={1}
                value={config.inventoryCount ?? 1}
                onChange={(e) => updateConfig({ inventoryCount: parseInt(e.target.value) || 1 })}
                className={inputClass}
                style={inputStyle}
              />
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                How many of this item exist (rooms, rental units)
              </p>
            </div>
            <div>
              <label className={labelClass} style={{ color: "var(--win95-text)" }}>
                Max Occupancy per Unit
              </label>
              <input
                type="number"
                min={1}
                value={config.capacity}
                onChange={(e) => updateConfig({ capacity: parseInt(e.target.value) || 1 })}
                className={inputClass}
                style={inputStyle}
              />
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                Guests per unit
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={{ color: "var(--win95-text)" }}>
                Minimum Stay (nights)
              </label>
              <input
                type="number"
                min={1}
                value={config.minimumStayNights ?? 1}
                onChange={(e) => updateConfig({ minimumStayNights: parseInt(e.target.value) || 1 })}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: "var(--win95-text)" }}>
                Maximum Stay (nights)
              </label>
              <input
                type="number"
                min={1}
                value={config.maximumStayNights ?? 30}
                onChange={(e) => updateConfig({ maximumStayNights: parseInt(e.target.value) || 30 })}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={{ color: "var(--win95-text)" }}>
                Check-in Time
              </label>
              <input
                type="time"
                value={config.checkInTime ?? "15:00"}
                onChange={(e) => updateConfig({ checkInTime: e.target.value })}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: "var(--win95-text)" }}>
                Check-out Time
              </label>
              <input
                type="time"
                value={config.checkOutTime ?? "11:00"}
                onChange={(e) => updateConfig({ checkOutTime: e.target.value })}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ color: "var(--win95-text)" }}>
              Base Nightly Rate
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={nightlyRate.value}
              onChange={nightlyRate.onChange}
              onBlur={nightlyRate.onBlur}
              className={inputClass}
              style={inputStyle}
            />
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              Default rate per night. Can be overridden with seasonal pricing rules.
            </p>
          </div>
        </div>
      )}

      {/* ====== EVENT-BOUND SEATING CONFIG ====== */}
      {model === "event_bound_seating" && (
        <div
          className="space-y-3 p-3 border-2 rounded"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)" }}
        >
          <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
            <Armchair size={14} />
            Seating Configuration
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={{ color: "var(--win95-text)" }}>
                Total Seats
              </label>
              <input
                type="number"
                min={1}
                value={config.totalSeats ?? 100}
                onChange={(e) => updateConfig({ totalSeats: parseInt(e.target.value) || 1 })}
                className={inputClass}
                style={inputStyle}
              />
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                Total available seats in the venue
              </p>
            </div>
            <div>
              <label className={labelClass} style={{ color: "var(--win95-text)" }}>
                Max Seats per Booking
              </label>
              <input
                type="number"
                min={1}
                value={config.maxSeatsPerBooking ?? 10}
                onChange={(e) => updateConfig({ maxSeatsPerBooking: parseInt(e.target.value) || 1 })}
                className={inputClass}
                style={inputStyle}
              />
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                Maximum seats one person can book at once
              </p>
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ color: "var(--win95-text)" }}>
              Price per Seat
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={seatPrice.value}
              onChange={seatPrice.onChange}
              onBlur={seatPrice.onBlur}
              className={inputClass}
              style={inputStyle}
            />
          </div>
        </div>
      )}

      {/* ====== DEPARTURE-BOUND CONFIG ====== */}
      {model === "departure_bound" && (
        <div
          className="space-y-3 p-3 border-2 rounded"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)" }}
        >
          <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
            <Ship size={14} />
            Vehicle / Transport Settings
          </h4>

          <div>
            <label className={labelClass} style={{ color: "var(--win95-text)" }}>
              Vehicle Type
            </label>
            <select
              value={config.vehicleType ?? "ferry"}
              onChange={(e) => updateConfig({ vehicleType: e.target.value })}
              className={inputClass}
              style={inputStyle}
            >
              <option value="ferry">Ferry / Boat</option>
              <option value="bus">Bus / Coach</option>
              <option value="train">Train</option>
              <option value="aircraft">Aircraft</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={{ color: "var(--win95-text)" }}>
                Total Passenger Seats
              </label>
              <input
                type="number"
                min={1}
                value={config.totalPassengerSeats ?? 50}
                onChange={(e) => updateConfig({ totalPassengerSeats: parseInt(e.target.value) || 1 })}
                className={inputClass}
                style={inputStyle}
              />
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                Total seats available on this vehicle
              </p>
            </div>
            <div>
              <label className={labelClass} style={{ color: "var(--win95-text)" }}>
                Boarding Opens (min before)
              </label>
              <input
                type="number"
                min={0}
                value={config.boardingMinutesBefore ?? 30}
                onChange={(e) => updateConfig({ boardingMinutesBefore: parseInt(e.target.value) || 0 })}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ color: "var(--win95-text)" }}>
              Price per Passenger
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={passengerPrice.value}
              onChange={passengerPrice.onChange}
              onBlur={passengerPrice.onBlur}
              className={inputClass}
              style={inputStyle}
            />
          </div>
        </div>
      )}

      {/* ====== SHARED: Confirmation Required ====== */}
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
            Admin must approve bookings before they are confirmed
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

      {/* ====== SHARED: Pricing (only for time_slot — others have inline pricing) ====== */}
      {model === "time_slot" && (
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
              <label className={labelClass} style={{ color: "var(--win95-text)" }}>
                Price
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={timeSlotPrice.value}
                onChange={timeSlotPrice.onChange}
                onBlur={timeSlotPrice.onBlur}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: "var(--win95-text)" }}>
                Per
              </label>
              <select
                value={config.priceUnit}
                onChange={(e) => updateConfig({ priceUnit: e.target.value as BookableConfig["priceUnit"] })}
                className={inputClass}
                style={inputStyle}
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
      )}

      {/* ====== SHARED: Deposit Settings ====== */}
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
              <label className={labelClass} style={{ color: "var(--win95-text)" }}>
                Fixed Amount
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={depositAmount.value}
                onChange={depositAmount.onChange}
                onBlur={depositAmount.onBlur}
                className={inputClass}
                style={inputStyle}
                placeholder="$0.00"
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: "var(--win95-text)" }}>
                Or Percentage %
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={config.depositPercent}
                onChange={(e) => updateConfig({
                  depositPercent: parseInt(e.target.value) || 0,
                  depositAmountCents: 0,
                })}
                className={inputClass}
                style={inputStyle}
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
