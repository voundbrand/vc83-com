"use client";

/**
 * CREATE CHECKOUT PAGE
 *
 * Desktop UI for creating public checkout pages
 */

import { useState } from "react";
// import { useMutation, useQuery } from "convex/react";
// import { api } from "@/convex/_generated/api";
import { useCurrentOrganization } from "@/hooks/use-auth";

export function CreateCheckoutPage() {
  const organization = useCurrentOrganization();
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [slug, setSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // TODO: Add mutation to create checkout product
  // const createProduct = useMutation(api.checkoutOntology.createCheckoutProduct);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (!organization) {
        throw new Error("No organization selected");
      }

      // Validate inputs
      if (!productName || !price || !slug) {
        throw new Error("Please fill in all required fields");
      }

      const priceInCents = Math.round(parseFloat(price) * 100);

      if (isNaN(priceInCents) || priceInCents <= 0) {
        throw new Error("Invalid price");
      }

      // TODO: Create the checkout product
      // await createProduct({
      //   organizationId: organization._id,
      //   name: productName,
      //   description,
      //   priceInCents,
      //   currency: "usd",
      //   publicSlug: slug,
      //   isPublished: true,
      // });

      setSuccess(true);
      setProductName("");
      setDescription("");
      setPrice("");
      setSlug("");

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create checkout page");
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateSlug = () => {
    const slug = productName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setSlug(slug);
  };

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-bold mb-4" style={{ color: "var(--win95-text)" }}>
        Create Checkout Page
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Name */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--win95-text)" }}>
            Product Name *
          </label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="w-full retro-input"
            placeholder="VIP Ticket"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--win95-text)" }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full retro-input"
            rows={3}
            placeholder="Access to exclusive VIP area..."
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--win95-text)" }}>
            Price (USD) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--win95-text)" }}>
              $
            </span>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full retro-input pl-8"
              placeholder="49.00"
              required
            />
          </div>
        </div>

        {/* URL Slug */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--win95-text)" }}>
            URL Slug *
          </label>
          <div className="space-y-2">
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full retro-input font-mono text-sm"
              placeholder="vip-ticket"
              required
            />
            <button
              type="button"
              onClick={generateSlug}
              className="retro-button text-sm"
              disabled={!productName}
            >
              Generate from name
            </button>
          </div>
          {slug && organization && (
            <p className="text-xs mt-2 font-mono" style={{ color: "var(--win95-text-secondary)" }}>
              URL: {window.location.origin}/checkout/{organization.slug}/{slug}
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 retro-border bg-red-50">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="p-3 retro-border bg-green-50">
            <p className="text-sm text-green-600">✓ Checkout page created successfully!</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="retro-button-primary px-6 py-2"
          >
            {isSubmitting ? "Creating..." : "Create Checkout Page"}
          </button>
        </div>
      </form>

      {/* Info */}
      <div className="mt-6 p-4 retro-border bg-purple-50">
        <h3 className="font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
          How it works
        </h3>
        <ul className="text-sm space-y-1" style={{ color: "var(--win95-text-secondary)" }}>
          <li>• Public checkout page will be created at the URL above</li>
          <li>• Share this link with your customers</li>
          <li>• Payments go directly to your Stripe Connect account</li>
          <li>• You can edit or unpublish the page anytime</li>
        </ul>
      </div>
    </div>
  );
}
