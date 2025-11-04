/**
 * CHECKOUT CORE COMPONENT
 *
 * Base checkout component that handles common functionality.
 * Extended by specific template variants (ticket, product, service).
 */

import React, { useState, useMemo, ReactNode } from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import { Theme } from "@/templates/types";
import {
  CheckoutItem,
  CheckoutConfig,
  CheckoutCallbacks,
  CheckoutError,
  CheckoutErrorType,
} from "./types";
import { calculatePrice, calculateSavings, validateCheckoutItems } from "./utils";

export interface CheckoutCoreProps {
  // Required props
  items: CheckoutItem[];
  organizationId: Id<"organizations">;
  theme: Theme;

  // Optional props
  config?: Partial<CheckoutConfig>;
  callbacks?: CheckoutCallbacks;
  initialQuantity?: number;
  children?: ReactNode;

  // Layout components (for customization)
  headerComponent?: ReactNode;
  footerComponent?: ReactNode;
  errorComponent?: (error: CheckoutError) => ReactNode;
  loadingComponent?: ReactNode;
}

export interface CheckoutCoreState {
  selectedItemIndex: number;
  quantities: number[];
  isProcessing: boolean;
  error: CheckoutError | null;
}

/**
 * Core checkout component with shared logic.
 */
export function CheckoutCore({
  items,
  theme,
  config = {},
  callbacks = {},
  initialQuantity = 1,
  children,
  headerComponent,
  footerComponent,
  errorComponent,
  loadingComponent,
}: CheckoutCoreProps) {
  // Merge with default config
  const checkoutConfig: CheckoutConfig = {
    showImages: true,
    showDescriptions: true,
    showFeatures: true,
    allowQuantity: true,
    maxQuantity: 99,
    minQuantity: 1,
    layout: "sidebar",
    ...config,
  };

  // State
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [quantities, setQuantities] = useState<number[]>(
    items.map(() => initialQuantity)
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<CheckoutError | null>(null);

  // Computed values
  const selectedItem = items[selectedItemIndex];

  const priceCalculation = useMemo(() => {
    if (!items.length) return null;
    return calculatePrice(items, quantities);
  }, [items, quantities]);

  const savings = useMemo(() => {
    return calculateSavings(items, quantities);
  }, [items, quantities]);

  const validation = useMemo(() => {
    return validateCheckoutItems(items);
  }, [items]);

  // Handlers
  const handleItemSelect = React.useCallback((index: number) => {
    setSelectedItemIndex(index);
    callbacks.onItemSelect?.(items[index]);
  }, [items, callbacks]);

  const handleQuantityChange = React.useCallback((itemIndex: number, newQuantity: number) => {
    const clampedQuantity = Math.max(
      checkoutConfig.minQuantity || 1,
      Math.min(checkoutConfig.maxQuantity || 99, newQuantity)
    );

    setQuantities((prevQuantities) => {
      const newQuantities = [...prevQuantities];
      newQuantities[itemIndex] = clampedQuantity;
      return newQuantities;
    });

    callbacks.onQuantityChange?.(clampedQuantity);
  }, [checkoutConfig.minQuantity, checkoutConfig.maxQuantity, callbacks]);

  const handleCheckout = React.useCallback(async () => {
    // Validate items
    if (!validation.valid) {
      setError({
        type: CheckoutErrorType.INVALID_PRODUCT,
        message: "Invalid items in checkout",
        details: validation.errors,
        retryable: false,
      });
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      await callbacks.onCheckoutStart?.(items, quantities[selectedItemIndex]);
      // Actual checkout logic would go here
      // This is handled by the specific template implementation
    } catch (err) {
      const checkoutError: CheckoutError = {
        type: CheckoutErrorType.PAYMENT_FAILED,
        message: err instanceof Error ? err.message : "Checkout failed",
        details: err,
        retryable: true,
      };
      setError(checkoutError);
      callbacks.onCheckoutError?.(new Error(checkoutError.message));
    } finally {
      setIsProcessing(false);
    }
  }, [validation.valid, validation.errors, quantities, selectedItemIndex, items, callbacks]);

  // Apply theme styles
  const containerStyle: React.CSSProperties = {
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.body,
  };

  // Error state
  if (error && errorComponent) {
    return <>{errorComponent(error)}</>;
  }

  // Loading state
  if (isProcessing && loadingComponent) {
    return <>{loadingComponent}</>;
  }

  // No items state
  if (items.length === 0) {
    return (
      <div style={containerStyle}>
        <p>No items available for checkout.</p>
      </div>
    );
  }

  // Render
  return (
    <div style={containerStyle}>
      {headerComponent}

      {/* Shared checkout state accessible to children via context */}
      <CheckoutContext.Provider
        value={{
          items,
          selectedItem,
          selectedItemIndex,
          quantities,
          priceCalculation,
          savings,
          checkoutConfig,
          theme,
          isProcessing,
          error,
          handleItemSelect,
          handleQuantityChange,
          handleCheckout,
        }}
      >
        {/* Main content - children render INSIDE provider */}
        {children}
      </CheckoutContext.Provider>

      {footerComponent}
    </div>
  );
}

/**
 * Context for sharing checkout state with child components.
 */
export interface CheckoutContextValue {
  items: CheckoutItem[];
  selectedItem: CheckoutItem | undefined;
  selectedItemIndex: number;
  quantities: number[];
  priceCalculation: ReturnType<typeof calculatePrice> | null;
  savings: number;
  checkoutConfig: CheckoutConfig;
  theme: Theme;
  isProcessing: boolean;
  error: CheckoutError | null;
  handleItemSelect: (index: number) => void;
  handleQuantityChange: (itemIndex: number, quantity: number) => void;
  handleCheckout: () => Promise<void>;
}

export const CheckoutContext = React.createContext<CheckoutContextValue | undefined>(
  undefined
);

/**
 * Hook to access checkout context.
 */
export function useCheckout() {
  const context = React.useContext(CheckoutContext);
  if (!context) {
    throw new Error("useCheckout must be used within a CheckoutCore component");
  }
  return context;
}