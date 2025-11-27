/**
 * PUBLIC CHECKOUT PAGE
 *
 * URL: /checkout/{org-slug}/{checkout-slug}
 *
 * This is a public-facing page where customers can purchase products through
 * a checkout instance. The checkout instance defines which products are available
 * and uses a specific template for rendering.
 *
 * This route handles both:
 * - Product checkouts: /checkout/{org}/{product-slug} (legacy)
 * - Checkout instances: /checkout/{org}/{checkout-slug} (new)
 */

// Force dynamic rendering for dynamic routes
export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { CheckoutPageClient } from "./checkout-page-client";

type Props = {
  params: Promise<{
    orgSlug: string;
    productSlug: string; // Can be either product slug OR checkout instance publicSlug
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, productSlug } = await params;

  // TODO: Fetch checkout instance details for proper SEO
  return {
    title: `Checkout - ${productSlug}`,
    description: `Secure checkout for ${orgSlug}`,
  };
}

export default async function CheckoutPage({ params }: Props) {
  const { orgSlug, productSlug } = await params;

  return (
    <CheckoutPageClient
      orgSlug={orgSlug}
      slug={productSlug} // This can be checkout publicSlug or product slug
    />
  );
}
