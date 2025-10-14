"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { Plus, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";

/**
 * Checkout Products Tab
 *
 * Shows all checkout products for the current organization.
 * Allows creating new checkout products from existing objects (products, tickets, events).
 */
export function CheckoutProductsTab() {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();

  // Fetch checkout products
  const checkoutProducts = useQuery(
    api.checkoutOntology.getCheckoutProducts,
    sessionId && currentOrg?.id
      ? { organizationId: currentOrg.id as Id<"organizations"> }
      : "skip"
  );

  if (!sessionId || !currentOrg) {
    return (
      <div className="p-4">
        <div className="border-2 border-red-600 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-red-900">Authentication Required</h4>
              <p className="text-xs text-red-800 mt-1">
                Please log in to manage checkout products.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (checkoutProducts === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold">Checkout Products</h3>
          <p className="text-xs text-gray-600 mt-1">
            {checkoutProducts.length} product{checkoutProducts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          className="px-3 py-2 text-xs font-bold border-2 border-purple-600 bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center gap-2"
          onClick={() => alert("Create checkout product coming soon! Use Web Publishing → Create Page → Link to Products.")}
        >
          <Plus size={14} />
          Create Checkout Product
        </button>
      </div>

      {/* Empty State */}
      {checkoutProducts.length === 0 ? (
        <div className="border-2 border-gray-400 bg-gray-50 p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h4 className="font-bold text-sm text-gray-700 mb-2">No Checkout Products Yet</h4>
          <p className="text-xs text-gray-600 mb-4">
            Create checkout products from your existing products, tickets, or events.
          </p>
          <p className="text-xs text-gray-500">
            💡 Tip: Use the Web Publishing app to create a page, then link checkout products to it.
          </p>
        </div>
      ) : (
        /* Product List */
        <div className="space-y-3">
          {checkoutProducts.map((product) => {
            const slug = product.customProperties?.publicSlug as string;
            const price = product.customProperties?.priceInCents as number;
            const currency = (product.customProperties?.currency as string) || "usd";
            const isPublished = product.status === "published";
            const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/checkout/${currentOrg.slug}/${slug}`;

            return (
              <div
                key={product._id}
                className="border-2 border-gray-400 bg-white p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-sm">{product.name}</h4>
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: isPublished ? "#10B981" : "#F59E0B",
                          color: "white"
                        }}
                      >
                        {product.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">
                      {product.description || "No description"}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="font-bold">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: currency.toUpperCase(),
                        }).format(price / 100)}
                      </span>
                      <code className="bg-gray-100 px-1">/{slug}</code>
                    </div>
                  </div>
                  {isPublished && (
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 text-xs font-bold border-2 border-purple-600 bg-white text-purple-600 hover:bg-purple-50 transition-colors flex items-center gap-1"
                    >
                      View Page
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
