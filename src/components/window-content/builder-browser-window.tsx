"use client"

/**
 * BUILDER WINDOW — Full /builder experience in an iframe.
 *
 * Embeds the real builder page with ?embedded=true so the builder
 * hides its own navigation bar (the window chrome provides that).
 * This gives exact feature parity with zero code duplication.
 */

export interface BuilderBrowserWindowProps {
  /** Opens builder in agent creation wizard mode */
  initialSetupMode?: boolean;
}

export function BuilderBrowserWindow({ initialSetupMode }: BuilderBrowserWindowProps) {
  const src = initialSetupMode
    ? "/builder?embedded=true&setup=true"
    : "/builder?embedded=true"

  return (
    <iframe
      src={src}
      className="w-full h-full border-0"
      allow="clipboard-write"
      title="AI Builder"
    />
  )
}
