import { describe, expect, it } from "vitest"

import {
  buildReminderTrackingKey,
  isBookingReminderDue,
  matchesSimpleCronExpression,
} from "../../../src/lib/booking-workflow-utils"

describe("booking workflow utils", () => {
  it("matches scheduled cron expressions with weekday ranges", () => {
    const timestamp = Date.parse("2026-04-01T06:00:00.000Z") // 08:00 Europe/Berlin

    expect(
      matchesSimpleCronExpression({
        timestamp,
        cronExpression: "0 8 * * 1-5",
        timezone: "Europe/Berlin",
      })
    ).toBe(true)

    expect(
      matchesSimpleCronExpression({
        timestamp,
        cronExpression: "30 8 * * 1-5",
        timezone: "Europe/Berlin",
      })
    ).toBe(false)
  })

  it("treats reminders as due on the correct local day", () => {
    const bookingStartAt = Date.parse("2026-04-08T07:00:00.000Z") // 09:00 Europe/Berlin
    const now = Date.parse("2026-04-01T18:30:00.000Z") // same local day in Berlin

    expect(
      isBookingReminderDue({
        bookingStartAt,
        now,
        daysBeforeStart: 7,
        timezone: "Europe/Berlin",
      })
    ).toBe(true)
  })

  it("builds stable reminder tracking keys", () => {
    expect(buildReminderTrackingKey("weather")).toBe("weatherReminder")
    expect(buildReminderTrackingKey("packing_list")).toBe("packingListReminder")
  })
})
