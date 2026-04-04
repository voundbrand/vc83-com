import { describe, expect, it } from "vitest"

import {
  buildBookingConfirmationHtml,
  buildBookingReminderCustomerHtml,
  buildBookingReminderOperatorHtml,
} from "../../../src/lib/booking-email-templates"

describe("booking email templates", () => {
  it("renders the customer confirmation with ticket CTA and invoice attachment note", () => {
    const html = buildBookingConfirmationHtml({
      customerName: "Ada Lovelace",
      customerEmail: "ada@example.com",
      customerPhone: "+49 170 000000",
      courseName: "Schnupperkurs",
      coursePrice: "EUR 129",
      date: "2026-04-10",
      time: "09:00",
      seats: [{ boatName: "Fraukje", seatNumbers: [1, 2] }],
      totalSeats: 2,
      totalAmount: 258,
      bookingId: "booking_local_1",
      language: "de",
      paymentMethod: "invoice",
      ticketCode: "SA-ABC1234",
      ticketLookupUrl: "https://segelschule.example/ticket?code=SA-ABC1234",
      invoiceAttachmentIncluded: true,
    })

    expect(html).toContain("Vielen Dank fuer Ihre Buchung, Ada Lovelace!")
    expect(html).toContain("SA-ABC1234")
    expect(html).toContain("Ticket ansehen")
    expect(html).toContain("Ihre Rechnung finden Sie als PDF im Anhang dieser E-Mail.")
    expect(html).toContain("Ca. 1 Woche vor Kursbeginn senden wir Wetter-Info und Packliste.")
    expect(html).toContain("Rechnung (Zahlung vor Ort)")
  })

  it("renders the weather reminder customer email with stored weather info", () => {
    const html = buildBookingReminderCustomerHtml({
      reminderKind: "weather",
      bookingId: "booking_local_2",
      customerName: "Ada Lovelace",
      customerEmail: "ada@example.com",
      courseName: "Grundkurs",
      date: "2026-04-10",
      time: "09:00",
      language: "de",
      ticketLookupUrl: "https://segelschule.example/ticket?code=SA-DEF5678",
      weatherInfo: "Leichter Wind aus Nordwest, bitte Jacke mitbringen.",
    })

    expect(html).toContain("Wetter-Info fuer Ihren Kurs")
    expect(html).toContain("Leichter Wind aus Nordwest, bitte Jacke mitbringen.")
    expect(html).toContain("Buchung ansehen")
  })

  it("renders the packing reminder operator email with workflow context", () => {
    const html = buildBookingReminderOperatorHtml({
      reminderKind: "packing_list",
      bookingId: "booking_local_3",
      customerName: "Ada Lovelace",
      customerEmail: "ada@example.com",
      courseName: "Intensivkurs",
      date: "2026-04-12",
      time: "10:00",
      language: "en",
      packingListItems: ["Bring water", "Wear non-slip shoes"],
      operatorLabel: "A seeded Layers reminder workflow sent this message.",
    })

    expect(html).toContain("Packing list reminder dispatched")
    expect(html).toContain("A seeded Layers reminder workflow sent this message.")
    expect(html).toContain("Bring water, Wear non-slip shoes")
  })
})
