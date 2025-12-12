"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Id } from "../../convex/_generated/dataModel";

/**
 * SHOPPING CART CONTEXT - PLATFORM SERVICES ONLY
 *
 * Cart system for l4yercak3 PLATFORM to sell services to ORGANIZATIONS (our customers).
 *
 * IMPORTANT: This is NOT for organizations to sell to their customers.
 * Organizations use separate checkout flows for their events/products/tickets.
 *
 * Platform services include:
 * - AI subscriptions (standard, privacy-enhanced, private-llm)
 * - Token packs (additional AI tokens)
 * - Platform add-ons (future: analytics, storage, etc.)
 */

export type CartItemType =
  | "ai-subscription"      // Platform AI service subscription
  | "token-pack"           // Additional AI tokens
  | "platform-plan"        // Platform subscription plans (Free, Starter, Pro, Agency, Enterprise)
  | "platform-addon"       // Future: analytics, storage, etc.
  | "platform-service";    // Other platform services

export interface CartItem {
  id: string; // Unique cart item ID
  type: CartItemType;
  name: string;
  description?: string;
  price: number; // In cents
  currency: string;
  quantity: number;
  metadata?: Record<string, string>; // Product-specific data
  imageUrl?: string;
}

interface ShoppingCartContextType {
  items: CartItem[];
  itemCount: number;
  total: number;
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const ShoppingCartContext = createContext<ShoppingCartContextType | undefined>(undefined);

export function ShoppingCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Calculate total items
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Calculate total price
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Add item to cart
  const addItem = useCallback((newItem: Omit<CartItem, "id">) => {
    setItems((prev) => {
      // Check if item already exists (same type and metadata)
      const existingIndex = prev.findIndex(
        (item) =>
          item.type === newItem.type &&
          item.name === newItem.name &&
          JSON.stringify(item.metadata) === JSON.stringify(newItem.metadata)
      );

      if (existingIndex >= 0) {
        // Update quantity of existing item
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + newItem.quantity,
        };
        return updated;
      } else {
        // Add new item
        return [
          ...prev,
          {
            ...newItem,
            id: `${newItem.type}-${Date.now()}-${Math.random()}`,
          },
        ];
      }
    });
  }, []);

  // Remove item from cart
  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Update item quantity
  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  }, [removeItem]);

  // Clear cart
  const clearCart = useCallback(() => {
    setItems([]);
    setIsCartOpen(false);
  }, []);

  // Open/close cart
  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  return (
    <ShoppingCartContext.Provider
      value={{
        items,
        itemCount,
        total,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        isCartOpen,
        openCart,
        closeCart,
      }}
    >
      {children}
    </ShoppingCartContext.Provider>
  );
}

export function useShoppingCart() {
  const context = useContext(ShoppingCartContext);
  if (!context) {
    throw new Error("useShoppingCart must be used within ShoppingCartProvider");
  }
  return context;
}
