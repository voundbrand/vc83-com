"use client";

import { useShoppingCart } from "@/contexts/shopping-cart-context";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useWindowManager } from "@/hooks/use-window-manager";
import { ShoppingCart, Sparkles, Lock, Server, Zap, Code, Check } from "lucide-react";
import { useState } from "react";
import { EnterpriseContactModal } from "@/components/ai-billing/enterprise-contact-modal";

/**
 * PLATFORM STORE WINDOW
 *
 * Browse and purchase l4yercak3 platform services:
 * - AI subscriptions (Standard, Privacy-Enhanced)
 * - Private LLM models (Starter, Professional, Enterprise)
 * - Token packs (one-time purchases)
 * - Custom Frontend Development
 *
 * This is the marketplace for platform services, NOT for org-to-customer sales.
 */
export function StoreWindow() {
  const { addItem } = useShoppingCart();
  const { t } = useNamespaceTranslations("ui.store");
  const { openWindow } = useWindowManager();
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("Enterprise Solutions");

  // Handle adding product to cart
  const handleAddToCart = (product: {
    type: "ai-subscription" | "token-pack";
    name: string;
    description: string;
    price: number;
    tier?: string;
  }) => {
    addItem({
      type: product.type,
      name: product.name,
      description: product.description,
      price: product.price,
      currency: "eur",
      quantity: 1,
      metadata: product.tier ? { tier: product.tier } : undefined,
    });

    // Open platform cart window (not the Checkout App!)
    import("@/components/window-content/platform-cart-window").then(({ PlatformCartWindow }) => {
      const cartX = typeof window !== 'undefined' ? window.innerWidth - 420 : 1000;
      openWindow("platform-cart", "Cart", <PlatformCartWindow />, { x: cartX, y: 100 }, { width: 380, height: 500 });
    });
  };

  const handleEnterpriseClick = (title: string) => {
    setModalTitle(title);
    setShowEnterpriseModal(true);
  };

  const handleCustomFrontendClick = () => {
    setModalTitle("Custom Frontend Development");
    setShowEnterpriseModal(true);
  };

  return (
    <>
      <div className="h-full flex flex-col" style={{ background: 'var(--win95-bg)' }}>
        {/* Header */}
        <div
          className="px-4 py-3 border-b-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg-light)'
          }}
        >
          <h2 className="font-pixel text-sm" style={{ color: 'var(--win95-text)' }}>
            🏪 {t("ui.store.title")}
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--win95-text-secondary)' }}>
            {t("ui.store.subtitle")}
          </p>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-6">

            {/* AI-Agents Section */}
            <section>
              <h3 className="font-pixel text-xs mb-3" style={{ color: 'var(--win95-highlight)' }}>
                🤖 {t("ui.store.section.ai_agents")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                {/* Standard Tier */}
                <ProductCard
                  icon={<Sparkles className="w-6 h-6" style={{ color: 'var(--win95-highlight)' }} />}
                  name={t("ui.store.ai.standard.name")}
                  description={t("ui.store.ai.standard.description")}
                  price={4900} // €49.00
                  features={[
                    t("ui.store.ai.standard.feature1"),
                    t("ui.store.ai.standard.feature2"),
                    t("ui.store.ai.standard.feature3"),
                    t("ui.store.ai.standard.feature4"),
                  ]}
                  onAddToCart={() => handleAddToCart({
                    type: "ai-subscription",
                    name: t("ui.store.ai.standard.cart_name"),
                    description: t("ui.store.ai.standard.cart_description"),
                    price: 4900,
                    tier: "standard"
                  })}
                />

                {/* Privacy-Enhanced Tier */}
                <ProductCard
                  icon={<Lock className="w-6 h-6" style={{ color: 'var(--win95-highlight)' }} />}
                  name={t("ui.store.ai.privacy.name")}
                  description={t("ui.store.ai.privacy.description")}
                  price={4900} // €49.00
                  features={[
                    t("ui.store.ai.privacy.feature1"),
                    t("ui.store.ai.privacy.feature2"),
                    t("ui.store.ai.privacy.feature3"),
                    t("ui.store.ai.privacy.feature4"),
                    t("ui.store.ai.privacy.feature5")
                  ]}
                  popular={true}
                  onAddToCart={() => handleAddToCart({
                    type: "ai-subscription",
                    name: t("ui.store.ai.privacy.cart_name"),
                    description: t("ui.store.ai.privacy.cart_description"),
                    price: 4900,
                    tier: "privacy-enhanced"
                  })}
                />
              </div>
            </section>

            {/* Private Models Section */}
            <section>
              <h3 className="font-pixel text-xs mb-3" style={{ color: 'var(--win95-highlight)' }}>
                🖥️ {t("ui.store.section.private_llm")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                {/* Private LLM Starter */}
                <EnterpriseProductCard
                  icon={<Server className="w-6 h-6" style={{ color: 'var(--win95-highlight)' }} />}
                  name={t("ui.store.private_llm.starter.name")}
                  description={t("ui.store.private_llm.starter.description")}
                  price={250000} // €2,500.00
                  features={[
                    t("ui.store.private_llm.starter.feature1"),
                    t("ui.store.private_llm.starter.feature2"),
                    t("ui.store.private_llm.starter.feature3"),
                    t("ui.store.private_llm.starter.feature4")
                  ]}
                  onContactSales={() => handleEnterpriseClick("Private LLM - Starter")}
                />

                {/* Private LLM Professional */}
                <EnterpriseProductCard
                  icon={<Server className="w-6 h-6" style={{ color: 'var(--win95-highlight)' }} />}
                  name={t("ui.store.private_llm.professional.name")}
                  description={t("ui.store.private_llm.professional.description")}
                  price={600000} // €6,000.00
                  features={[
                    t("ui.store.private_llm.professional.feature1"),
                    t("ui.store.private_llm.professional.feature2"),
                    t("ui.store.private_llm.professional.feature3"),
                    t("ui.store.private_llm.professional.feature4")
                  ]}
                  onContactSales={() => handleEnterpriseClick("Private LLM - Professional")}
                />

                {/* Private LLM Enterprise */}
                <EnterpriseProductCard
                  icon={<Server className="w-6 h-6" style={{ color: 'var(--win95-highlight)' }} />}
                  name={t("ui.store.private_llm.enterprise.name")}
                  description={t("ui.store.private_llm.enterprise.description")}
                  price={1200000} // €12,000.00
                  features={[
                    t("ui.store.private_llm.enterprise.feature1"),
                    t("ui.store.private_llm.enterprise.feature2"),
                    t("ui.store.private_llm.enterprise.feature3"),
                    t("ui.store.private_llm.enterprise.feature4")
                  ]}
                  enterprise={true}
                  onContactSales={() => handleEnterpriseClick("Private LLM - Enterprise")}
                />
              </div>
            </section>

            {/* Token Packs Section */}
            <section>
              <h3 className="font-pixel text-xs mb-3" style={{ color: 'var(--win95-highlight)' }}>
                💎 {t("ui.store.section.token_packs")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">

                {/* Starter Pack */}
                <TokenPackCard
                  name={t("ui.store.tokens.starter.name")}
                  tokens="1M"
                  price={2900} // €29.00
                  perMillion="€29.00"
                  onAddToCart={() => handleAddToCart({
                    type: "token-pack",
                    name: t("ui.store.tokens.starter.cart_name"),
                    description: t("ui.store.tokens.starter.cart_description"),
                    price: 2900
                  })}
                />

                {/* Standard Pack */}
                <TokenPackCard
                  name={t("ui.store.tokens.standard.name")}
                  tokens="5M"
                  price={13900} // €139.00
                  perMillion="€27.80"
                  discount="4%"
                  onAddToCart={() => handleAddToCart({
                    type: "token-pack",
                    name: t("ui.store.tokens.standard.cart_name"),
                    description: t("ui.store.tokens.standard.cart_description"),
                    price: 13900
                  })}
                />

                {/* Professional Pack */}
                <TokenPackCard
                  name={t("ui.store.tokens.professional.name")}
                  tokens="10M"
                  price={24900} // €249.00
                  perMillion="€24.90"
                  discount="14%"
                  popular={true}
                  onAddToCart={() => handleAddToCart({
                    type: "token-pack",
                    name: t("ui.store.tokens.professional.cart_name"),
                    description: t("ui.store.tokens.professional.cart_description"),
                    price: 24900
                  })}
                />

                {/* Enterprise Pack */}
                <TokenPackCard
                  name={t("ui.store.tokens.enterprise.name")}
                  tokens="50M"
                  price={114900} // €1,149.00
                  perMillion="€22.98"
                  discount="21%"
                  onAddToCart={() => handleAddToCart({
                    type: "token-pack",
                    name: t("ui.store.tokens.enterprise.cart_name"),
                    description: t("ui.store.tokens.enterprise.cart_description"),
                    price: 114900
                  })}
                />
              </div>
            </section>

            {/* Custom Frontend Package Section */}
            <section>
              <h3 className="font-pixel text-xs mb-3" style={{ color: 'var(--win95-highlight)' }}>
                💻 {t("ui.store.section.custom_frontend")}
              </h3>
              <div className="grid grid-cols-1">
                <CustomFrontendCard onContactSales={handleCustomFrontendClick} t={t} />
              </div>
            </section>

          </div>
        </div>
      </div>

      {/* Enterprise Contact Modal */}
      <EnterpriseContactModal
        isOpen={showEnterpriseModal}
        onClose={() => setShowEnterpriseModal(false)}
        title={modalTitle}
      />
    </>
  );
}

/**
 * Product Card Component (For Standard Subscriptions)
 */
interface ProductCardProps {
  icon: React.ReactNode;
  name: string;
  description: string;
  price: number;
  features: string[];
  popular?: boolean;
  onAddToCart: () => void;
}

function ProductCard({
  icon,
  name,
  description,
  price,
  features,
  popular,
  onAddToCart
}: ProductCardProps) {
  const { t } = useNamespaceTranslations("ui.store");

  const formatPrice = (cents: number) => {
    return `€${(cents / 100).toFixed(2)}`;
  };

  return (
    <div
      className="retro-window p-4 flex flex-col h-full relative"
      style={{
        background: popular
          ? 'var(--win95-bg-light)'
          : 'var(--win95-bg)'
      }}
    >
      {/* Icon */}
      <div className="mb-3">
        {icon}
      </div>

      {/* Name */}
      <h4 className="font-pixel text-xs mb-2" style={{ color: 'var(--win95-highlight)' }}>
        {name}
      </h4>

      {/* Description */}
      <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--win95-text-secondary)' }}>
        {description}
      </p>

      {/* Features */}
      <ul className="text-[10px] space-y-1 mb-4 flex-1" style={{ color: 'var(--win95-text)' }}>
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-1">
            <Check className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* Price */}
      <div className="mb-3">
        <div className="font-pixel text-lg" style={{ color: 'var(--win95-highlight)' }}>
          {formatPrice(price)}
        </div>
        <div className="text-[10px]" style={{ color: 'var(--win95-text-secondary)' }}>
          {t("ui.store.pricing.per_month")}
        </div>
      </div>

      {/* Add to Cart Button */}
      <button
        onClick={onAddToCart}
        className="retro-button w-full py-2 text-xs font-pixel flex items-center justify-center gap-2"
      >
        <ShoppingCart className="w-3 h-3" />
        {t("ui.store.button.add_to_cart")}
      </button>
    </div>
  );
}

/**
 * Enterprise Product Card (For Private LLM with Contact Sales)
 */
interface EnterpriseProductCardProps {
  icon: React.ReactNode;
  name: string;
  description: string;
  price: number;
  features: string[];
  enterprise?: boolean;
  onContactSales: () => void;
}

function EnterpriseProductCard({
  icon,
  name,
  description,
  price,
  features,
  enterprise,
  onContactSales
}: EnterpriseProductCardProps) {
  const { t } = useNamespaceTranslations("ui.store");

  const formatPrice = (cents: number) => {
    return `€${(cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="retro-window p-4 flex flex-col h-full relative opacity-95">
      {/* Icon */}
      <div className="mb-3">
        {icon}
      </div>

      {/* Name */}
      <h4 className="font-pixel text-xs mb-2" style={{ color: 'var(--win95-highlight)' }}>
        {name}
      </h4>

      {/* Description */}
      <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--win95-text-secondary)' }}>
        {description}
      </p>

      {/* Features */}
      <ul className="text-[10px] space-y-1 mb-4 flex-1" style={{ color: 'var(--win95-text)' }}>
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-1">
            <Check className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* Price */}
      <div className="mb-3">
        <div className="font-pixel text-lg" style={{ color: 'var(--win95-highlight)' }}>
          {formatPrice(price)}
        </div>
        <div className="text-[10px]" style={{ color: 'var(--win95-text-secondary)' }}>
          {t("ui.store.pricing.per_month")}
        </div>
      </div>

      {/* Contact Sales Button */}
      <button
        onClick={onContactSales}
        className="retro-button w-full py-2 text-xs font-pixel"
      >
        {t("ui.store.button.contact_sales")}
      </button>
    </div>
  );
}

/**
 * Token Pack Card Component
 */
interface TokenPackCardProps {
  name: string;
  tokens: string;
  price: number;
  perMillion: string;
  discount?: string;
  popular?: boolean;
  onAddToCart: () => void;
}

function TokenPackCard({
  name,
  tokens,
  price,
  perMillion,
  discount,
  popular,
  onAddToCart
}: TokenPackCardProps) {
  const { t } = useNamespaceTranslations("ui.store");

  const formatPrice = (cents: number) => {
    return `€${(cents / 100).toFixed(2)}`;
  };

  return (
    <div
      className="retro-window p-3 flex flex-col h-full relative"
      style={{
        background: popular
          ? 'var(--win95-bg-light)'
          : 'var(--win95-bg)'
      }}
    >
      {/* Icon */}
      <div className="mb-2">
        <Zap className="w-5 h-5" style={{ color: 'var(--win95-highlight)' }} />
      </div>

      {/* Name & Tokens */}
      <h4 className="font-pixel text-xs mb-1" style={{ color: 'var(--win95-highlight)' }}>
        {name}
      </h4>
      <p className="text-[10px] mb-2 font-bold" style={{ color: 'var(--win95-text)' }}>
        {tokens} {t("ui.store.pricing.tokens")}
      </p>

      {/* Price */}
      <div className="mb-2">
        <div className="font-pixel text-base" style={{ color: 'var(--win95-highlight)' }}>
          {formatPrice(price)}
        </div>
        <div className="text-[9px]" style={{ color: 'var(--win95-text-secondary)' }}>
          {perMillion} {t("ui.store.pricing.per_million")}
        </div>
      </div>

      {/* Buy Now Button */}
      <button
        onClick={onAddToCart}
        className="retro-button w-full py-2 text-xs font-pixel flex items-center justify-center gap-1"
      >
        <ShoppingCart className="w-3 h-3" />
        {t("ui.store.button.buy_now")}
      </button>
    </div>
  );
}

/**
 * Custom Frontend Card Component
 */
interface CustomFrontendCardProps {
  onContactSales: () => void;
  t: (key: string) => string;
}

function CustomFrontendCard({ onContactSales, t }: CustomFrontendCardProps) {
  return (
    <div className="retro-window p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left: Description */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Code className="w-6 h-6" style={{ color: 'var(--win95-highlight)' }} />
          <h4 className="font-pixel text-sm" style={{ color: 'var(--win95-highlight)' }}>
            {t("ui.store.custom.title")}
          </h4>
        </div>

        <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--win95-text)' }}>
          {t("ui.store.custom.description")}
        </p>

        <div className="space-y-3 mb-4">
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
            <div>
              <p className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>{t("ui.store.custom.feature1")}</p>
              <p className="text-[10px]" style={{ color: 'var(--win95-text-secondary)' }}>{t("ui.store.custom.feature1_desc")}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
            <div>
              <p className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>{t("ui.store.custom.feature2")}</p>
              <p className="text-[10px]" style={{ color: 'var(--win95-text-secondary)' }}>{t("ui.store.custom.feature2_desc")}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
            <div>
              <p className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>{t("ui.store.custom.feature3")}</p>
              <p className="text-[10px]" style={{ color: 'var(--win95-text-secondary)' }}>{t("ui.store.custom.feature3_desc")}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
            <div>
              <p className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>{t("ui.store.custom.feature4")}</p>
              <p className="text-[10px]" style={{ color: 'var(--win95-text-secondary)' }}>{t("ui.store.custom.feature4_desc")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Preview & CTA */}
      <div className="flex flex-col justify-center items-center">
        {/* Example Project Preview */}
        <div className="mb-4 w-full">
          <div
            className="border-2 rounded overflow-hidden"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-bg-light)'
            }}
          >
            <div className="w-full h-48 overflow-hidden">
              <iframe
                src="https://v0-co-working-space-detail-page.vercel.app/"
                className="border-0"
                style={{
                  width: '200%',
                  height: '384px',
                  transform: 'scale(0.5)',
                  transformOrigin: 'top left'
                }}
                title="Example Custom Web Project"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </div>
          <p className="text-[9px] text-center mt-1" style={{ color: 'var(--win95-text-secondary)' }}>
            {t("ui.store.custom.example_text")}
          </p>
        </div>

        {/* Contact Sales Button */}
        <button
          onClick={onContactSales}
          className="retro-button w-full py-2 text-xs font-pixel mb-3"
        >
          {t("ui.store.button.contact_sales")}
        </button>

        {/* Pricing */}
        <div className="text-center mb-2">
          <p className="text-xs font-pixel" style={{ color: 'var(--win95-highlight)' }}>
            {t("ui.store.custom.starting_price")}
          </p>
        </div>

        {/* CTA Text */}
        <p className="text-[10px] text-center" style={{ color: 'var(--win95-text-secondary)' }}>
          {t("ui.store.custom.cta")}
        </p>
      </div>
    </div>
  );
}
