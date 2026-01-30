"use client"

import { useLayoutMode } from "../layout-mode-context"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { MessageSquare, LayoutGrid, Sparkles, Layers } from "lucide-react"
import { useShoppingCart } from "@/contexts/shopping-cart-context"
import { useWindowManager } from "@/hooks/use-window-manager"
import Link from "next/link"

export function ChatHeader() {
  const { mode, switchToThreePane, switchToSinglePane } = useLayoutMode()
  const { t } = useNamespaceTranslations("ui.ai_assistant")
  const { addItem } = useShoppingCart()
  const { openWindow } = useWindowManager()

  // Handle adding AI subscription to cart
  const handleSubscribe = () => {
    // Add standard AI subscription to cart (€49/month)
    addItem({
      type: "ai-subscription",
      name: "AI Assistant Subscription",
      description: "Standard AI Assistant with Claude integration",
      price: 4900, // €49.00 in cents
      currency: "eur",
      quantity: 1,
      metadata: {
        tier: "standard",
        billingPeriod: "monthly",
      },
    })

    // Open platform cart window immediately
    // Import PlatformCartWindow component dynamically to avoid circular dependency
    import("@/components/window-content/platform-cart-window").then(({ PlatformCartWindow }) => {
      const cartX = typeof window !== 'undefined' ? window.innerWidth - 420 : 1000;
      openWindow(
        "platform-cart",
        "Cart",
        <PlatformCartWindow />,
        { x: cartX, y: 100 },
        { width: 380, height: 500 }
      )
    })
  }

  return (
    <div
      className="flex items-center justify-between px-4 py-2 border-b-2 transition-all duration-300"
      style={{
        borderColor: 'var(--win95-border)',
        background: 'var(--win95-bg-light)'
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">🤖</span>
        <span className="font-pixel text-xs" style={{ color: 'var(--win95-text)' }}>
          {t("ui.ai_assistant.header.title")}
        </span>
        <span
          className="ml-2 w-2 h-2 rounded-full animate-pulse"
          style={{ background: 'var(--success)' }}
          title={t("ui.ai_assistant.header.online")}
        />
      </div>

      <div className="flex items-center gap-2">
        {/* l4yercak3 Builder Link */}
        <Link
          href="/builder"
          className="px-2 py-0.5 text-xs font-pixel flex items-center gap-1 hover:scale-105 transition-transform rounded"
          style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
            color: 'white',
          }}
          title="Open l4yercak3 Builder"
        >
          <Layers className="w-3 h-3" />
          Builder
        </Link>

        {/* Subscribe to AI Button */}
        <button
          className="retro-button-primary px-2 py-0.5 text-xs font-pixel flex items-center gap-1 hover:scale-105 transition-transform"
          onClick={handleSubscribe}
          title="Subscribe to AI Assistant"
        >
          <Sparkles className="w-3 h-3" />
          Subscribe
        </button>

        {/* Mode Switcher Buttons */}
        {mode === "single" && (
          <button
            className="retro-button px-2 py-0.5 text-xs font-pixel flex items-center gap-1 hover:scale-105 transition-transform"
            onClick={switchToThreePane}
            title="Switch to workflow mode"
          >
            <LayoutGrid className="w-3 h-3" />
            {t("ui.ai_assistant.header.workflow_button")}
          </button>
        )}
        {mode === "three-pane" && (
          <button
            className="retro-button px-2 py-0.5 text-xs font-pixel flex items-center gap-1 hover:scale-105 transition-transform"
            onClick={switchToSinglePane}
            title="Switch to simple mode"
          >
            <MessageSquare className="w-3 h-3" />
            Simple
          </button>
        )}
      </div>
    </div>
  )
}
