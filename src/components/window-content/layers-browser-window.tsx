"use client"

/**
 * LAYERS WINDOW — Full /layers experience in an iframe.
 *
 * Embeds the real layers page with ?embedded=true so the layers page
 * hides its own navigation bar (the window chrome provides that).
 * This gives exact feature parity with zero code duplication.
 */

export function LayersBrowserWindow() {
  return (
    <iframe
      src="/layers?embedded=true"
      className="w-full h-full border-0"
      allow="clipboard-write"
      title="Layers"
    />
  )
}
