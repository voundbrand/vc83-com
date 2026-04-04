import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  createBoatResourceCustomProperties,
  createCheckoutProductCustomProperties,
} from "../../../scripts/seed-segelschule-booking-workflow";

const TEST_COURSE = {
  courseId: "schnupper",
  displayName: "Schnupperkurs",
  priceInCents: 12_900,
  bookingDurationMinutes: 180,
  availableTimes: ["09:00", "13:00"],
  isMultiDay: false,
  catalogContent: {
    title: {
      de: "Schnupperkurs",
      en: "Taster Course",
    },
    description: {
      de: "Erster Einstieg aufs Wasser.",
      en: "A first sailing session on the water.",
    },
    durationLabel: {
      de: "3 Stunden",
      en: "3 hours",
    },
  },
  availabilitySeedProfile: {
    profileId: "test_profile",
    availabilityStructure: "course_session" as const,
    timezone: "Europe/Berlin",
    windows: [],
  },
};

describe("segelschule booking seed course checkout products", () => {
  it("creates boat carrier resources as availability-first vehicle records", () => {
    const props = createBoatResourceCustomProperties({
      boat: {
        boatId: "rose",
        displayName: "Rose",
        seatCount: 4,
        availableFromDate: "2026-04-05",
      },
      synthetic: true,
    });

    expect(props).toMatchObject({
      segelschuleBoatId: "rose",
      bookingSurface: "segelschule-altwarp",
      availabilityEnabled: true,
      availabilityStructure: "boat_charter",
      vehicleType: "boat",
      totalPassengerSeats: 4,
      pricePerUnit: 0,
      priceInCents: null,
      price: null,
      basePrice: null,
      currency: "EUR",
    });
    expect(props.bookableConfig).toMatchObject({
      availabilityStructure: "boat_charter",
      vehicleType: "boat",
      totalPassengerSeats: 4,
      pricePerUnit: 0,
      priceUnit: "flat",
    });
  });

  it("creates a complete commercial checkout-product payload for seeded courses", () => {
    const props = createCheckoutProductCustomProperties({
      course: TEST_COURSE,
      resourceId: "resource_schnupper" as Id<"objects">,
      synthetic: true,
    });

    expect(props).toMatchObject({
      segelschuleCourseId: "schnupper",
      courseId: "schnupper",
      bookingSurface: "segelschule-altwarp",
      bookingType: "class_enrollment",
      fulfillmentType: "ticket",
      availabilityResourceId: "resource_schnupper",
      priceInCents: 12_900,
      price: 12_900,
      basePrice: 12_900,
      currency: "EUR",
      inventory: null,
      sold: 0,
      taxable: true,
      taxBehavior: "inclusive",
      taxInclusive: true,
      taxRate: 19,
      isActive: true,
      description: "Erster Einstieg aufs Wasser.",
      segelschuleCatalogRole: "checkout_product",
      segelschuleCatalogSource: "seed_created_checkout_product",
    });
  });

  it("repairs adopted zero-price checkout products back to the course commercial price", () => {
    const props = createCheckoutProductCustomProperties({
      course: TEST_COURSE,
      resourceId: "resource_schnupper" as Id<"objects">,
      synthetic: false,
      existingProduct: {
        _id: "product_existing" as Id<"objects">,
        name: "Existing Schnupper Ticket",
        description: "Existing product description",
        subtype: "ticket",
        status: "active",
        customProperties: {
          priceInCents: 0,
          price: 0,
          basePrice: 0,
          currency: "EUR",
          sold: 4,
          inventory: 8,
          taxBehavior: "inclusive",
          taxInclusive: true,
          taxRate: 19,
          taxable: true,
          isActive: true,
        },
      },
    });

    expect(props).toMatchObject({
      priceInCents: 12_900,
      price: 12_900,
      basePrice: 12_900,
      currency: "EUR",
      sold: 4,
      inventory: 8,
      taxBehavior: "inclusive",
      taxInclusive: true,
      taxRate: 19,
      description: "Existing product description",
      segelschuleCatalogSource: "adopted_existing_checkout_product",
    });
  });
});
