"use client";

/**
 * ENHANCED CONFIRMATION STEP
 *
 * Modern success page with:
 * - Downloadable tickets with QR codes
 * - Downloadable receipt
 * - Email confirmation notice
 * - Beautiful modern design
 */

import { useState, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { CheckCircle, Mail, Sparkles } from "lucide-react";
import { CheckoutStepData } from "../multi-step-checkout";
import { CheckoutProduct } from "@/templates/checkout/types";
import { ModernTicketPDF } from "@/components/tickets/modern-ticket-pdf";
import { ModernReceiptPDF } from "@/components/tickets/modern-receipt-pdf";
import { Id } from "../../../../convex/_generated/dataModel";

interface ConfirmationStepProps {
  checkoutData: CheckoutStepData;
  linkedProducts: CheckoutProduct[];
}

interface TicketData {
  ticketNumber: string;
  holderName: string;
  holderEmail: string;
  eventName: string;
  eventSponsors?: Array<{ name: string; level?: string }>; // NEW: Multiple event sponsors
  eventDescription?: string;
  eventDate?: number;
  eventLocation?: string;
  ticketType: string;
  purchaseDate: number;
  qrCodeDataUrl: string;
  organizationName: string;
  pricePerUnit: number;
  currency: string;
  [key: string]: unknown;
}

interface ReceiptData {
  receiptNumber: string;
  purchaseDate: number;
  customerName: string;
  customerEmail: string;
  items: Array<{
    productName: string;
    quantity: number;
    pricePerUnit: number;
    totalPrice: number;
  }>;
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  paymentMethod: string;
  organizationName: string;
  organizationAddress: string;
  paymentIntentId: string;
  [key: string]: unknown;
}

interface PaymentResultWithTickets {
  ticketIds?: Id<"objects">[];
  checkoutSessionId?: Id<"objects">;
  transactionId?: string;
  [key: string]: unknown;
}

export function ConfirmationStepEnhanced({
  checkoutData,
  linkedProducts,
}: ConfirmationStepProps) {
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);

  const generateTicketPDF = useAction(api.ticketGeneration.generateTicketPDFData);
  const generateReceiptPDF = useAction(api.ticketGeneration.generateReceiptPDFData);

  useEffect(() => {
    async function loadData() {
      if (!checkoutData.paymentResult) return;

      try {
        setLoading(true);

        // Get ticket IDs from payment result
        const paymentResult = checkoutData.paymentResult as PaymentResultWithTickets;
        const ticketIds = paymentResult.ticketIds;
        const checkoutSessionId = paymentResult.checkoutSessionId;

        // Load ticket data (use first ticket for display)
        if (ticketIds && ticketIds.length > 0 && checkoutSessionId) {
          const ticket = await generateTicketPDF({
            ticketId: ticketIds[0],
            checkoutSessionId,
          });
          setTicketData(ticket);
        }

        // Load receipt data
        if (checkoutSessionId) {
          const receipt = await generateReceiptPDF({
            checkoutSessionId,
          });
          setReceiptData(receipt);
        }
      } catch (error) {
        console.error("Failed to load ticket/receipt data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [checkoutData.paymentResult, generateTicketPDF, generateReceiptPDF]);

  const formatPrice = (amount: number) => {
    const currency = linkedProducts[0]?.currency || "EUR";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const totalAmount =
    (checkoutData.totalPrice || 0) +
    (checkoutData.formResponses?.reduce((sum, fr) => sum + (fr.addedCosts || 0), 0) || 0);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
        </div>
        <p className="text-center text-gray-600">Generating your tickets...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">
      {/* Success Header with Animation */}
      <div className="text-center space-y-4 animate-fade-in">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full shadow-lg animate-scale-in">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>
        <div>
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Payment Successful!
          </h1>
          <p className="text-xl text-gray-600 mt-2">
            Your tickets are ready to download
          </p>
        </div>
      </div>

      {/* Email Confirmation Banner */}
      <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border-2 border-violet-200 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
        <div className="flex-shrink-0 w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg">
          <Mail className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg text-gray-900 mb-1">
            Check Your Email
          </h3>
          <p className="text-gray-700">
            We&apos;ve sent your tickets and receipt to{" "}
            <span className="font-semibold text-violet-600">
              {checkoutData.customerInfo?.email}
            </span>
          </p>
          <p className="text-sm text-gray-600 mt-2">
            You can also download them below for safekeeping
          </p>
        </div>
      </div>

      {/* Ticket Section */}
      {ticketData && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-300 to-transparent"></div>
            <div className="flex items-center gap-2 px-4 py-2 bg-violet-100 rounded-full">
              <Sparkles className="w-5 h-5 text-violet-600" />
              <span className="font-bold text-violet-900">Your Ticket</span>
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-300 to-transparent"></div>
          </div>

          <ModernTicketPDF ticketData={ticketData} />
        </div>
      )}

      {/* Receipt Section */}
      {receiptData && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
              <CheckCircle className="w-5 h-5 text-gray-600" />
              <span className="font-bold text-gray-900">Receipt</span>
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
          </div>

          <ModernReceiptPDF receiptData={receiptData} />
        </div>
      )}

      {/* Order Summary */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 shadow-sm">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Order Summary</h3>

        <div className="space-y-4">
          {/* Items */}
          {checkoutData.selectedProducts?.map((sp, idx) => {
            const product = linkedProducts.find((p) => p._id === sp.productId);
            return (
              <div
                key={idx}
                className="flex items-center justify-between py-3 border-b border-gray-100"
              >
                <div>
                  <div className="font-semibold text-gray-900">
                    {product?.name || "Product"}
                  </div>
                  <div className="text-sm text-gray-500">Quantity: {sp.quantity}</div>
                </div>
                <div className="font-bold text-gray-900">
                  {formatPrice(sp.price * sp.quantity)}
                </div>
              </div>
            );
          })}

          {/* Total */}
          <div className="flex items-center justify-between pt-4 border-t-2 border-gray-300">
            <span className="text-xl font-bold text-gray-900">Total Paid</span>
            <span className="text-3xl font-black bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              {formatPrice(totalAmount)}
            </span>
          </div>

          {/* Transaction ID */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Transaction ID</span>
              <span className="font-mono text-gray-900">
                {checkoutData.paymentResult?.transactionId || "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Support */}
      <div className="text-center text-gray-600">
        <p>
          Need help? Contact us at{" "}
          <a
            href="mailto:support@l4yercak3.com"
            className="text-violet-600 hover:text-violet-700 font-semibold underline"
          >
            support@l4yercak3.com
          </a>
        </p>
      </div>
    </div>
  );
}
