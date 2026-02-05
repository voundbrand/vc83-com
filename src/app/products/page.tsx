"use client";

/**
 * PRODUCTS PAGE - Full-screen product management
 *
 * Renders the ProductsWindow component in full-screen mode.
 * Same component is used in the desktop window manager.
 */

import { ProductsWindow } from "@/components/window-content/products-window";

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <ProductsWindow fullScreen />
    </div>
  );
}
