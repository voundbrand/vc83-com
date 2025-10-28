/**
 * PRODUCT ADDON SYSTEM
 *
 * Defines the structure for product addons that can be activated
 * through form field selections during checkout.
 *
 * Example Use Cases:
 * - Event boat trip (€30 per person)
 * - Workshop upgrade (€50 per ticket)
 * - Meal options (€20 vegetarian, €25 premium)
 * - Merchandise bundles (€15 t-shirt)
 */

/**
 * Product Addon Configuration
 * Stored in product.customProperties.addons[]
 */
export interface ProductAddon {
  // Unique identifier for this addon
  id: string; // e.g., "ucra-evening-event"

  // Display information
  name: string; // e.g., "UCRA Evening Event"
  description?: string; // e.g., "Pommernkogge boat evening event"

  // Pricing
  pricePerUnit: number; // in cents (e.g., 3000 = €30.00)
  currency: string; // e.g., "EUR", "USD"

  // Tax configuration
  taxable: boolean; // Should this addon be taxed?
  taxCode?: string; // Stripe tax code (if different from product)
  taxBehavior?: "exclusive" | "inclusive"; // Default to product's tax behavior

  // Form field mapping
  formFieldId?: string; // DEPRECATED: Use formFieldIds instead (kept for backward compatibility)
  formFieldIds?: string[]; // Form fields that activate this addon (supports multiple fields)
  formFieldMapping: Record<string, number>; // Maps field values to quantity
  // Example: { "0": 0, "1": 1, "2": 2 } - radio button values to addon quantity
  // Example: { "yes": 1, "no": 0 } - checkbox/radio to single addon

  // Inventory (optional)
  maxQuantity?: number; // Maximum units available across all orders
  maxPerOrder?: number; // Maximum units per single order

  // Display options
  displayInCart?: boolean; // Show as separate line item? (default: true)
  icon?: string; // Optional emoji or icon
}

/**
 * Calculated addon instance (what customer selected)
 */
export interface CalculatedAddon {
  addonId: string; // Reference to ProductAddon.id
  name: string;
  description?: string;
  quantity: number; // How many units
  pricePerUnit: number;
  totalPrice: number; // quantity * pricePerUnit
  currency: string;
  taxable: boolean;
  taxCode?: string;
  taxBehavior?: "exclusive" | "inclusive";
  formFieldId: string; // Which field triggered this
  formFieldValue: string | number; // What value was selected
  icon?: string; // Optional emoji icon
}

/**
 * Helper: Calculate addons from form responses
 * Now supports multiple field IDs per addon (formFieldIds array)
 */
export function calculateAddonsFromResponses(
  productAddons: ProductAddon[] | undefined,
  formResponses: Record<string, unknown>
): CalculatedAddon[] {
  if (!productAddons || productAddons.length === 0) {
    return [];
  }

  const calculatedAddons: CalculatedAddon[] = [];

  for (const addon of productAddons) {
    // Support both new formFieldIds array and legacy formFieldId
    const fieldIds = addon.formFieldIds || (addon.formFieldId ? [addon.formFieldId] : []);

    if (fieldIds.length === 0) {
      console.warn(`Addon ${addon.id} has no formFieldId or formFieldIds configured`);
      continue;
    }

    // Check each field ID to see if any match
    let matchedFieldId: string | null = null;
    let fieldValue: unknown = undefined;

    for (const fieldId of fieldIds) {
      if (formResponses[fieldId] !== undefined && formResponses[fieldId] !== null) {
        matchedFieldId = fieldId;
        fieldValue = formResponses[fieldId];
        break; // Use first matching field
      }
    }

    if (!matchedFieldId || fieldValue === undefined || fieldValue === null) {
      continue; // No matching field found or field not answered
    }

    // Convert field value to string for mapping lookup
    const fieldValueStr = String(fieldValue);
    const quantity = addon.formFieldMapping[fieldValueStr];

    if (quantity === undefined || quantity === 0) {
      continue; // No addon for this value
    }

    // Check max per order
    if (addon.maxPerOrder && quantity > addon.maxPerOrder) {
      console.warn(
        `Addon ${addon.id} quantity ${quantity} exceeds maxPerOrder ${addon.maxPerOrder}`
      );
      continue;
    }

    calculatedAddons.push({
      addonId: addon.id,
      name: addon.name,
      description: addon.description,
      quantity,
      pricePerUnit: addon.pricePerUnit,
      totalPrice: quantity * addon.pricePerUnit,
      currency: addon.currency,
      taxable: addon.taxable,
      taxCode: addon.taxCode,
      taxBehavior: addon.taxBehavior,
      formFieldId: matchedFieldId, // Store which field actually matched
      formFieldValue: typeof fieldValue === "string" || typeof fieldValue === "number" ? fieldValue : String(fieldValue),
      icon: addon.icon,
    });
  }

  return calculatedAddons;
}

/**
 * Helper: Calculate total addon cost
 */
export function calculateTotalAddonCost(addons: CalculatedAddon[]): number {
  return addons.reduce((sum, addon) => sum + addon.totalPrice, 0);
}

/**
 * Helper: Get addon by field ID
 * Now checks both formFieldIds array and legacy formFieldId
 */
export function getAddonByFieldId(
  productAddons: ProductAddon[] | undefined,
  formFieldId: string
): ProductAddon | undefined {
  return productAddons?.find((addon) => {
    // Check new formFieldIds array
    if (addon.formFieldIds?.includes(formFieldId)) {
      return true;
    }
    // Check legacy formFieldId
    if (addon.formFieldId === formFieldId) {
      return true;
    }
    return false;
  });
}

/**
 * Example addon configurations for reference
 */
export const EXAMPLE_ADDONS = {
  // HaffSymposium UCRA boat trip
  ucraBoatTrip: {
    id: "ucra-evening-event",
    name: "UCRA Evening Event",
    description: "Pommernkogge boat evening on the 31.05.2024",
    pricePerUnit: 3000, // €30
    currency: "EUR",
    taxable: true,
    formFieldId: "ucra_participants_external", // or _ameos, _haffnet, etc.
    formFieldMapping: {
      "0": 0, // No participation
      "1": 1, // 1 person
      "2": 2, // 2 people (attendee + companion)
    },
    displayInCart: true,
    icon: "⛵",
  } as ProductAddon,

  // Workshop upgrade example
  workshopUpgrade: {
    id: "premium-workshop",
    name: "Premium Workshop Access",
    description: "Upgrade to premium workshop with hands-on sessions",
    pricePerUnit: 5000, // €50
    currency: "EUR",
    taxable: true,
    formFieldId: "workshop_upgrade",
    formFieldMapping: {
      yes: 1,
      no: 0,
    },
    maxQuantity: 50, // Only 50 spots available
    displayInCart: true,
    icon: "🎓",
  } as ProductAddon,

  // Meal selection example
  dinnerOption: {
    id: "conference-dinner",
    name: "Conference Dinner",
    description: "Saturday evening gala dinner",
    pricePerUnit: 7500, // €75
    currency: "EUR",
    taxable: true,
    taxCode: "txcd_20030000", // Restaurant meals tax code
    formFieldId: "dinner_attendance",
    formFieldMapping: {
      attending: 1,
      not_attending: 0,
    },
    displayInCart: true,
    icon: "🍽️",
  } as ProductAddon,
};
