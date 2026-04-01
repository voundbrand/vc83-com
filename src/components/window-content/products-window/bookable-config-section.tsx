"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, DollarSign, Users, Calendar, Settings, Ship, Armchair, BedDouble } from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import {
  buildAvailabilityStructureDrivenConfig,
  getAvailabilityStructureDefinition,
  getDefaultAvailabilityStructureForSubtype,
  listAvailabilityStructureDefinitions,
  type AvailabilityInventoryMode,
  type AvailabilityLocationBehavior,
  type AvailabilityPriceUnit,
  type AvailabilityStructureDrivenConfig,
  type AvailabilityStructureKey,
} from "../../../../convex/lib/availabilityStructures";
import { formatResourceTopologyProfile } from "../../../../convex/lib/resourceTopology";
import type {
  AvailabilityContextKey,
  AvailabilityModel,
} from "../../../../convex/lib/availabilityModels";

/**
 * Bookable Resource Configuration
 *
 * Configuration options for products that can be booked.
 * Operators choose a business-level availability structure and the base
 * availability model is derived from that semantic layer.
 */

export interface BookableConfig {
  // Structure-driven metadata
  availabilityStructure: AvailabilityStructureKey;
  availabilityModel: AvailabilityModel;
  availabilityContextKey: AvailabilityContextKey;
  inventoryMode: AvailabilityInventoryMode;
  requiresBookingAddress: boolean;
  locationBehavior: AvailabilityLocationBehavior;
  resourceTopologyProfile: AvailabilityStructureDrivenConfig["resourceTopologyProfile"];

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
  priceUnit: AvailabilityPriceUnit;

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
  vehicleType?: string;           // boat, ferry, bus, train, aircraft
  boardingMinutesBefore?: number; // boarding opens N min before departure

  // Additional
  maxOccupancy?: number;
  amenities?: string[];
  specialties?: string[];
}

type BookableSubtype =
  | "room"
  | "staff"
  | "equipment"
  | "space"
  | "vehicle"
  | "accommodation"
  | "appointment"
  | "class"
  | "treatment";

const SUBTYPE_BOOKABLE_OVERRIDES: Record<BookableSubtype, Partial<BookableConfig>> = {
  room: {
    bookingMode: "both",
    durationUnit: "hours",
    priceUnit: "hour",
  },
  staff: {
    bookingMode: "calendar",
    durationUnit: "minutes",
    slotIncrement: 15,
    priceUnit: "session",
  },
  equipment: {
    bookingMode: "both",
    durationUnit: "hours",
    priceUnit: "day",
  },
  space: {
    bookingMode: "both",
    durationUnit: "hours",
    priceUnit: "hour",
  },
  vehicle: {
    bookingMode: "calendar",
    durationUnit: "minutes",
    minDuration: 180,
    maxDuration: 1440,
    slotIncrement: 60,
    priceUnit: "flat",
    depositRequired: true,
    depositPercent: 25,
    vehicleType: "boat",
    boardingMinutesBefore: 30,
  },
  accommodation: {
    bookingMode: "date-range",
    durationUnit: "nights",
    priceUnit: "night",
    confirmationRequired: true,
    depositRequired: true,
    depositPercent: 25,
  },
  appointment: {
    bookingMode: "calendar",
    durationUnit: "minutes",
    slotIncrement: 15,
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
    priceUnit: "session",
    bufferBefore: 5,
    bufferAfter: 15,
  },
};

function isBookableSubtype(value: string): value is BookableSubtype {
  return value in SUBTYPE_BOOKABLE_OVERRIDES;
}

export function buildBookableConfigForSubtype(
  subtype: string,
  current?: Partial<BookableConfig>
): BookableConfig {
  const normalizedSubtype = isBookableSubtype(subtype) ? subtype : "space";
  const structureKey =
    current?.availabilityStructure
    || getDefaultAvailabilityStructureForSubtype(normalizedSubtype);

  return buildAvailabilityStructureDrivenConfig(structureKey, {
    ...SUBTYPE_BOOKABLE_OVERRIDES[normalizedSubtype],
    ...(current || {}),
  }) as BookableConfig;
}

export function buildBookableShadowProperties(
  config: BookableConfig
): Record<string, unknown> {
  return {
    availabilityStructure: config.availabilityStructure,
    availabilityModel: config.availabilityModel,
    availabilityContextKey: config.availabilityContextKey,
    inventoryMode: config.inventoryMode,
    requiresBookingAddress: config.requiresBookingAddress,
    locationBehavior: config.locationBehavior,
    resourceTopologyProfile: config.resourceTopologyProfile,
    bookingMode: config.bookingMode,
    minDuration: config.minDuration,
    maxDuration: config.maxDuration,
    durationUnit: config.durationUnit,
    slotIncrement: config.slotIncrement,
    bufferBefore: config.bufferBefore,
    bufferAfter: config.bufferAfter,
    capacity: config.capacity,
    confirmationRequired: config.confirmationRequired,
    pricePerUnit: config.pricePerUnit,
    priceUnit: config.priceUnit,
    depositRequired: config.depositRequired,
    depositAmountCents: config.depositAmountCents,
    depositPercent: config.depositPercent,
    inventoryCount: config.availabilityModel === "date_range_inventory"
      ? (config.inventoryCount ?? null)
      : null,
    minimumStayNights: config.availabilityModel === "date_range_inventory"
      ? (config.minimumStayNights ?? null)
      : null,
    maximumStayNights: config.availabilityModel === "date_range_inventory"
      ? (config.maximumStayNights ?? null)
      : null,
    checkInTime: config.availabilityModel === "date_range_inventory"
      ? (config.checkInTime ?? null)
      : null,
    checkOutTime: config.availabilityModel === "date_range_inventory"
      ? (config.checkOutTime ?? null)
      : null,
    baseNightlyRateCents: config.availabilityModel === "date_range_inventory"
      ? (config.baseNightlyRateCents ?? null)
      : null,
    totalSeats: config.availabilityModel === "event_bound_seating"
      ? (config.totalSeats ?? null)
      : null,
    maxSeatsPerBooking: config.availabilityModel === "event_bound_seating"
      ? (config.maxSeatsPerBooking ?? null)
      : null,
    totalPassengerSeats: config.availabilityModel === "departure_bound"
      ? (config.totalPassengerSeats ?? null)
      : null,
    vehicleType: config.availabilityModel === "departure_bound"
      ? (config.vehicleType ?? null)
      : null,
    boardingMinutesBefore: config.availabilityModel === "departure_bound"
      ? (config.boardingMinutesBefore ?? null)
      : null,
  };
}

export const DEFAULT_BOOKABLE_CONFIG = buildBookableConfigForSubtype("space");

export const BOOKABLE_PRESETS: Record<string, BookableConfig> = {
  room: buildBookableConfigForSubtype("room"),
  staff: buildBookableConfigForSubtype("staff"),
  equipment: buildBookableConfigForSubtype("equipment"),
  space: buildBookableConfigForSubtype("space"),
  vehicle: buildBookableConfigForSubtype("vehicle"),
  accommodation: buildBookableConfigForSubtype("accommodation"),
  appointment: buildBookableConfigForSubtype("appointment"),
  class: buildBookableConfigForSubtype("class"),
  treatment: buildBookableConfigForSubtype("treatment"),
};

interface BookableConfigSectionProps {
  config: BookableConfig;
  onChange: (config: BookableConfig) => void;
  subtype: string;
  onSuggestedSubtypeChange?: (subtype: string) => void;
}

// Shared input styling
const inputStyle = {
  borderColor: "var(--shell-border)",
  background: "var(--shell-input-surface)",
  color: "var(--shell-input-text)",
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
  onSuggestedSubtypeChange,
}: BookableConfigSectionProps) {
  const { t } = useNamespaceTranslations("ui.products.bookable_config");
  const tx = (
    key: string,
    fallback: string,
    params?: Record<string, string | number>
  ): string => {
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  };
  const updateConfig = useCallback((updates: Partial<BookableConfig>) => {
    onChange({
      ...config,
      ...updates,
    });
  }, [config, onChange]);
  const applyStructure = useCallback((structureKey: AvailabilityStructureKey) => {
    const structure = getAvailabilityStructureDefinition(structureKey);
    const nextConfig = buildAvailabilityStructureDrivenConfig(structureKey, {
      ...config,
    }) as BookableConfig;
    onChange(nextConfig);
    if (
      onSuggestedSubtypeChange
      && structure.defaultResourceSubtype !== subtype
    ) {
      onSuggestedSubtypeChange(structure.defaultResourceSubtype);
    }
  }, [config, onChange, onSuggestedSubtypeChange, subtype]);

  const structureDefinitions = listAvailabilityStructureDefinitions();
  const structureKey = config.availabilityStructure
    || getDefaultAvailabilityStructureForSubtype(subtype);
  const structureDefinition = getAvailabilityStructureDefinition(structureKey);
  const model = structureDefinition.model;
  const companionContextLabel = structureDefinition.contextKey || "none";
  const locationBehaviorLabelMap: Record<AvailabilityLocationBehavior, string> = {
    none: "No location required",
    location_optional: "Location optional",
    location_required: "Location required",
    property_address_required: "Property address required",
    departure_origin_required: "Departure origin required",
  };

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
        borderColor: "var(--shell-border)",
        background: "var(--shell-surface-elevated)",
      }}
    >
      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--shell-text)" }}>
        <Settings size={16} />
        {tx("title", "Booking Configuration")}
      </h3>
      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
        {tx("description", "Configure how this {{resource}} can be booked.", {
          resource: subtypeLabels[subtype] || tx("resource_fallback", "resource"),
        })}
      </p>

      {/* Availability Structure Selector */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--shell-text)" }}>
          <Calendar size={14} className="inline mr-1" />
          {tx("availability_structure.label", "Availability Structure")}
        </label>
        <select
          value={structureKey}
          onChange={(e) => applyStructure(e.target.value as AvailabilityStructureKey)}
          className="w-full px-3 py-2 text-sm border-2"
          style={inputStyle}
        >
          {structureDefinitions.map((definition) => (
            <option key={definition.key} value={definition.key}>
              {definition.label}
            </option>
          ))}
        </select>
        <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
          {structureDefinition.description}
        </p>
      </div>

      <div
        className="grid gap-3 md:grid-cols-2"
      >
        <div
          className="space-y-2 rounded border p-3"
          style={{
            borderColor: "var(--shell-border)",
            background: "var(--shell-input-surface)",
          }}
        >
          <div className="text-xs font-semibold" style={{ color: "var(--shell-text)" }}>
            {tx("availability_structure.derived_title", "Derived Semantics")}
          </div>
          <div className="text-xs" style={{ color: "var(--shell-text)" }}>
            {tx("availability_structure.base_model", "Base model")}: {model}
          </div>
          <div className="text-xs" style={{ color: "var(--shell-text)" }}>
            {tx("availability_structure.context", "Companion context")}: {companionContextLabel}
          </div>
          <div className="text-xs" style={{ color: "var(--shell-text)" }}>
            {tx("availability_structure.inventory_mode", "Inventory mode")}: {structureDefinition.inventoryMode}
          </div>
          <div className="text-xs" style={{ color: "var(--shell-text)" }}>
            {tx("availability_structure.recommended_subtype", "Recommended subtype")}: {structureDefinition.defaultResourceSubtype}
          </div>
          <div className="text-xs" style={{ color: "var(--shell-text)" }}>
            {tx("availability_structure.location_behavior", "Location behavior")}: {locationBehaviorLabelMap[structureDefinition.locationBehavior]}
          </div>
          <div className="text-xs" style={{ color: "var(--shell-text)" }}>
            {tx("availability_structure.booking_address", "Booking address")}: {structureDefinition.requiresBookingAddress ? "required" : "not required"}
          </div>
          <div className="text-xs" style={{ color: "var(--shell-text)" }}>
            {tx("availability_structure.topology", "Topology")}: {formatResourceTopologyProfile(structureDefinition.topologyProfile)}
          </div>
        </div>
        <div
          className="space-y-2 rounded border p-3"
          style={{
            borderColor: "var(--shell-border)",
            background: "var(--shell-input-surface)",
          }}
        >
          <div className="text-xs font-semibold" style={{ color: "var(--shell-text)" }}>
            {tx("availability_structure.hints_title", "Setup Hints")}
          </div>
          {structureDefinition.configHints.map((hint) => (
            <p
              key={hint}
              className="text-xs"
              style={{ color: "var(--neutral-gray)" }}
            >
              {hint}
            </p>
          ))}
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            {tx(
              "availability_structure.supported_subtypes",
              "Works best with: {{subtypes}}",
              {
                subtypes: structureDefinition.supportedResourceSubtypes.join(", "),
              }
            )}
          </p>
        </div>
      </div>

      {/* ====== TIME-SLOT CONFIG ====== */}
      {model === "time_slot" && (
        <>
          {/* Booking Mode */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "var(--shell-text)" }}>
              {tx("time_slot.booking_mode", "Booking Mode")}
            </label>
            <select
              value={config.bookingMode}
              onChange={(e) => updateConfig({ bookingMode: e.target.value as BookableConfig["bookingMode"] })}
              className="w-full px-3 py-2 text-sm border-2"
              style={inputStyle}
            >
              <option value="calendar">{tx("time_slot.booking_mode_calendar", "Calendar - Pick specific time slots")}</option>
              <option value="date-range">{tx("time_slot.booking_mode_date_range", "Date Range - Pick check-in/check-out dates")}</option>
              <option value="both">{tx("time_slot.booking_mode_both", "Both - Support both modes")}</option>
            </select>
          </div>

          {/* Duration Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={{ color: "var(--shell-text)" }}>
                <Clock size={12} className="inline mr-1" />
                {tx("time_slot.duration_unit", "Duration Unit")}
              </label>
              <select
                value={config.durationUnit}
                onChange={(e) => updateConfig({ durationUnit: e.target.value as BookableConfig["durationUnit"] })}
                className={inputClass}
                style={inputStyle}
              >
                <option value="minutes">{tx("time_slot.duration_unit_minutes", "Minutes")}</option>
                <option value="hours">{tx("time_slot.duration_unit_hours", "Hours")}</option>
                <option value="days">{tx("time_slot.duration_unit_days", "Days")}</option>
                <option value="nights">{tx("time_slot.duration_unit_nights", "Nights")}</option>
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ color: "var(--shell-text)" }}>
                {tx("time_slot.slot_increment", "Slot Increment")}
              </label>
              <select
                value={config.slotIncrement}
                onChange={(e) => updateConfig({ slotIncrement: parseInt(e.target.value) })}
                className={inputClass}
                style={inputStyle}
              >
                <option value="15">{tx("time_slot.slot_increment_15", "15 minutes")}</option>
                <option value="30">{tx("time_slot.slot_increment_30", "30 minutes")}</option>
                <option value="60">{tx("time_slot.slot_increment_60", "60 minutes")}</option>
                <option value="120">{tx("time_slot.slot_increment_120", "2 hours")}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={{ color: "var(--shell-text)" }}>
                {tx("time_slot.min_duration", "Min Duration ({{unit}})", { unit: config.durationUnit })}
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
              <label className={labelClass} style={{ color: "var(--shell-text)" }}>
                {tx("time_slot.max_duration", "Max Duration ({{unit}})", { unit: config.durationUnit })}
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
              <label className={labelClass} style={{ color: "var(--shell-text)" }}>
                {tx("time_slot.buffer_before", "Buffer Before (min)")}
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
              <label className={labelClass} style={{ color: "var(--shell-text)" }}>
                {tx("time_slot.buffer_after", "Buffer After (min)")}
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
            {tx("time_slot.buffer_help", "Buffer time prevents back-to-back bookings (prep/cleanup time)")}
          </p>

          {/* Capacity */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "var(--shell-text)" }}>
              <Users size={14} className="inline mr-1" />
              {tx("time_slot.capacity", "Capacity")}
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
                ? tx("time_slot.capacity_class", "Maximum participants per session")
                : subtype === "room" || subtype === "accommodation"
                ? tx("time_slot.capacity_room", "Maximum occupancy")
                : tx("time_slot.capacity_default", "Concurrent bookings allowed (usually 1)")}
            </p>
          </div>
        </>
      )}

      {/* ====== DATE-RANGE INVENTORY CONFIG ====== */}
      {model === "date_range_inventory" && (
        <div
          className="space-y-3 p-3 border-2 rounded"
          style={{ borderColor: "var(--shell-border)", background: "var(--shell-input-surface)" }}
        >
          <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--shell-text)" }}>
            <BedDouble size={14} />
            {tx("date_range.inventory_settings", "Inventory Settings")}
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={{ color: "var(--shell-text)" }}>
                {tx("date_range.number_of_units", "Number of Units")}
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
                {tx("date_range.number_of_units_help", "How many of this item exist (rooms, rental units)")}
              </p>
            </div>
            <div>
              <label className={labelClass} style={{ color: "var(--shell-text)" }}>
                {tx("date_range.max_occupancy_per_unit", "Max Occupancy per Unit")}
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
                {tx("date_range.guests_per_unit", "Guests per unit")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={{ color: "var(--shell-text)" }}>
                {tx("date_range.minimum_stay_nights", "Minimum Stay (nights)")}
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
              <label className={labelClass} style={{ color: "var(--shell-text)" }}>
                {tx("date_range.maximum_stay_nights", "Maximum Stay (nights)")}
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
              <label className={labelClass} style={{ color: "var(--shell-text)" }}>
                {tx("date_range.check_in_time", "Check-in Time")}
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
              <label className={labelClass} style={{ color: "var(--shell-text)" }}>
                {tx("date_range.check_out_time", "Check-out Time")}
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
            <label className={labelClass} style={{ color: "var(--shell-text)" }}>
              {tx("date_range.base_nightly_rate", "Base Nightly Rate")}
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
              {tx(
                "date_range.base_nightly_rate_help",
                "Default rate per night. Can be overridden with seasonal pricing rules.",
              )}
            </p>
          </div>
        </div>
      )}

      {/* ====== EVENT-BOUND SEATING CONFIG ====== */}
      {model === "event_bound_seating" && (
        <div
          className="space-y-3 p-3 border-2 rounded"
          style={{ borderColor: "var(--shell-border)", background: "var(--shell-input-surface)" }}
        >
          <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--shell-text)" }}>
            <Armchair size={14} />
            {tx("event_seating.title", "Seating Configuration")}
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={{ color: "var(--shell-text)" }}>
                {tx("event_seating.total_seats", "Total Seats")}
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
                {tx("event_seating.total_seats_help", "Total available seats in the venue")}
              </p>
            </div>
            <div>
              <label className={labelClass} style={{ color: "var(--shell-text)" }}>
                {tx("event_seating.max_seats_per_booking", "Max Seats per Booking")}
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
                {tx("event_seating.max_seats_per_booking_help", "Maximum seats one person can book at once")}
              </p>
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ color: "var(--shell-text)" }}>
              {tx("event_seating.price_per_seat", "Price per Seat")}
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
          style={{ borderColor: "var(--shell-border)", background: "var(--shell-input-surface)" }}
        >
          <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--shell-text)" }}>
            <Ship size={14} />
            {tx("transport.title", "Vehicle / Transport Settings")}
          </h4>

          <div>
            <label className={labelClass} style={{ color: "var(--shell-text)" }}>
              {tx("transport.vehicle_type", "Vehicle Type")}
            </label>
            <select
              value={config.vehicleType ?? "boat"}
              onChange={(e) => updateConfig({ vehicleType: e.target.value })}
              className={inputClass}
              style={inputStyle}
            >
              <option value="boat">{tx("transport.vehicle_type_boat", "Boat")}</option>
              <option value="ferry">{tx("transport.vehicle_type_ferry", "Ferry / Boat")}</option>
              <option value="bus">{tx("transport.vehicle_type_bus", "Bus / Coach")}</option>
              <option value="train">{tx("transport.vehicle_type_train", "Train")}</option>
              <option value="aircraft">{tx("transport.vehicle_type_aircraft", "Aircraft")}</option>
              <option value="other">{tx("transport.vehicle_type_other", "Other")}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={{ color: "var(--shell-text)" }}>
                {tx("transport.total_passenger_seats", "Total Passenger Seats")}
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
                {tx("transport.total_passenger_seats_help", "Total seats available on this vehicle")}
              </p>
            </div>
            <div>
              <label className={labelClass} style={{ color: "var(--shell-text)" }}>
                {tx("transport.boarding_opens", "Boarding Opens (min before)")}
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
            <label className={labelClass} style={{ color: "var(--shell-text)" }}>
              {tx("transport.price_per_passenger", "Price per Passenger")}
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
          borderColor: "var(--shell-border)",
          background: "var(--shell-input-surface)",
        }}
      >
        <div className="flex-1">
          <label className="block text-sm font-semibold" style={{ color: "var(--shell-text)" }}>
            {tx("shared.require_confirmation", "Require Confirmation")}
          </label>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            {tx("shared.require_confirmation_help", "Admin must approve bookings before they are confirmed")}
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
            {config.confirmationRequired
              ? tx("shared.yes", "Yes")
              : tx("shared.no", "No")}
          </span>
        </label>
      </div>

      {/* ====== SHARED: Pricing (only for time_slot — others have inline pricing) ====== */}
      {model === "time_slot" && (
        <div
          className="space-y-3 p-3 border-2 rounded"
          style={{
            borderColor: "var(--shell-border)",
            background: "var(--shell-input-surface)",
          }}
        >
          <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--shell-text)" }}>
            <DollarSign size={14} />
            {tx("pricing.title", "Pricing")}
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={{ color: "var(--shell-text)" }}>
                {tx("pricing.price", "Price")}
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
              <label className={labelClass} style={{ color: "var(--shell-text)" }}>
                {tx("pricing.per", "Per")}
              </label>
              <select
                value={config.priceUnit}
                onChange={(e) => updateConfig({ priceUnit: e.target.value as BookableConfig["priceUnit"] })}
                className={inputClass}
                style={inputStyle}
              >
                <option value="hour">{tx("pricing.per_hour", "Hour")}</option>
                <option value="day">{tx("pricing.per_day", "Day")}</option>
                <option value="night">{tx("pricing.per_night", "Night")}</option>
                <option value="session">{tx("pricing.per_session", "Session")}</option>
                <option value="flat">{tx("pricing.per_flat", "Flat Rate")}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ====== SHARED: Deposit Settings ====== */}
      <div
        className="space-y-3 p-3 border-2 rounded"
        style={{
          borderColor: "var(--shell-border)",
          background: "var(--shell-input-surface)",
        }}
      >
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold" style={{ color: "var(--shell-text)" }}>
            {tx("deposit.title", "Deposit Required")}
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
              {config.depositRequired
                ? tx("shared.yes", "Yes")
                : tx("shared.no", "No")}
            </span>
          </label>
        </div>

        {config.depositRequired && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={{ color: "var(--shell-text)" }}>
                {tx("deposit.fixed_amount", "Fixed Amount")}
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
              <label className={labelClass} style={{ color: "var(--shell-text)" }}>
                {tx("deposit.or_percentage", "Or Percentage %")}
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
          {tx("deposit.help", "Require a deposit at booking time, with remainder due later")}
        </p>
      </div>
    </div>
  );
}
