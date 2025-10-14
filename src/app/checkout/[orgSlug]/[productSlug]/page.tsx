/**
 * PUBLIC CHECKOUT PAGE
 *
 * Phase 3: Hosted checkout pages
 * URL: /checkout/{org-slug}/{product-slug}
 *
 * This is a public-facing page where customers can purchase products.
 * It's separate from the retro desktop UI.
 */

import { Metadata } from "next";
import { CheckoutPageClient } from "./checkout-page-client";

type Props = {
  params: Promise<{
    orgSlug: string;
    productSlug: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, productSlug } = await params;

  // TODO: Fetch product details for proper SEO
  return {
    title: `Checkout - ${productSlug}`,
    description: `Purchase ${productSlug} from ${orgSlug}`,
  };
}

export default async function CheckoutPage({ params }: Props) {
  const { orgSlug, productSlug } = await params;

  return (
    <CheckoutPageClient
      orgSlug={orgSlug}
      productSlug={productSlug}
    />
  );
}
