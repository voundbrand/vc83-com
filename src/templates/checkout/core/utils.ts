/**
 * CHECKOUT CORE UTILITIES
 *
 * Shared utility functions for checkout templates.
 */

import { CheckoutItem, PriceCalculation } from "./types";

/**
 * Format currency amount.
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Calculate checkout totals.
 */
export function calculatePrice(
  items: CheckoutItem[],
  quantities: number[],
  options?: {
    discountPercent?: number;
    discountAmount?: number;
    taxRate?: number;
    shippingCost?: number;
  }
): PriceCalculation {
  // Calculate subtotal
  const subtotal = items.reduce(
    (sum, item, index) => sum + item.price * (quantities[index] || 1),
    0
  );

  // Apply discounts
  let discount = 0;
  if (options?.discountPercent) {
    discount = subtotal * (options.discountPercent / 100);
  } else if (options?.discountAmount) {
    discount = Math.min(options.discountAmount, subtotal);
  }

  // Calculate tax on discounted amount
  const taxableAmount = subtotal - discount;
  const tax = options?.taxRate ? taxableAmount * (options.taxRate / 100) : 0;

  // Add shipping
  const shipping = options?.shippingCost || 0;

  // Final total
  const total = taxableAmount + tax + shipping;

  return {
    subtotal,
    discount,
    tax,
    shipping,
    total,
    currency: items[0]?.currency || "USD",
    formattedTotal: formatCurrency(total, items[0]?.currency),
  };
}

/**
 * Calculate savings from original price.
 */
export function calculateSavings(
  items: CheckoutItem[],
  quantities: number[]
): number {
  return items.reduce((sum, item, index) => {
    if (!item.originalPrice || item.originalPrice <= item.price) {
      return sum;
    }
    const saving = (item.originalPrice - item.price) * (quantities[index] || 1);
    return sum + saving;
  }, 0);
}

/**
 * Validate checkout items.
 */
export function validateCheckoutItems(items: CheckoutItem[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (items.length === 0) {
    errors.push("No items in checkout");
  }

  items.forEach((item, index) => {
    if (!item.id) {
      errors.push(`Item ${index + 1}: Missing ID`);
    }
    if (!item.name) {
      errors.push(`Item ${index + 1}: Missing name`);
    }
    if (item.price < 0) {
      errors.push(`Item ${index + 1}: Invalid price`);
    }
    if (!item.stripePriceId) {
      errors.push(`Item ${index + 1}: Missing payment provider price ID`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Group items by a property.
 */
export function groupItemsByProperty<K extends keyof CheckoutItem>(
  items: CheckoutItem[],
  property: K
): Map<CheckoutItem[K], CheckoutItem[]> {
  const groups = new Map<CheckoutItem[K], CheckoutItem[]>();

  items.forEach((item) => {
    const key = item[property];
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  });

  return groups;
}

/**
 * Get item tier label for ticket-type products.
 */
export function getTicketTierLabel(item: CheckoutItem): string {
  const tier = item.customProperties?.ticketTier;

  const tierLabels: Record<string, string> = {
    vip: "VIP",
    general: "General Admission",
    student: "Student",
    earlybird: "Early Bird",
  };

  return tierLabels[tier as string] || item.name;
}

/**
 * Check if early bird pricing applies.
 */
export function isEarlyBirdAvailable(
  item: CheckoutItem,
  currentDate: Date = new Date()
): boolean {
  const earlyBirdEndDate = item.customProperties?.earlyBirdEndDate;

  if (!earlyBirdEndDate || typeof earlyBirdEndDate !== 'string' && typeof earlyBirdEndDate !== 'number') {
    return false;
  }

  const endDate = new Date(earlyBirdEndDate);
  return currentDate < endDate;
}

/**
 * Get display price for an item.
 */
export function getDisplayPrice(item: CheckoutItem): {
  current: number;
  original?: number;
  label?: string;
} {
  const isEarlyBird = isEarlyBirdAvailable(item);
  const earlyBirdPrice = item.customProperties?.earlyBirdPrice;

  if (isEarlyBird && typeof earlyBirdPrice === 'number') {
    return {
      current: earlyBirdPrice,
      original: item.price,
      label: "Early Bird Price",
    };
  }

  if (item.originalPrice && item.originalPrice > item.price) {
    return {
      current: item.price,
      original: item.originalPrice,
      label: "Sale Price",
    };
  }

  return {
    current: item.price,
  };
}