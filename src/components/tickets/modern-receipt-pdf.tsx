"use client";

/**
 * MODERN RECEIPT PDF GENERATOR
 *
 * Beautiful, professional receipt design that can be downloaded as PDF.
 */

import { useRef, useState } from "react";
import { Download, FileText, CheckCircle } from "lucide-react";

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
}

export function ModernReceiptPDF({ receiptData }: { receiptData: ReceiptData }) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadAsPDF = async () => {
    if (!receiptRef.current) return;

    setIsDownloading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;

      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`receipt-${receiptData.receiptNumber}.pdf`);
    } catch (error) {
      console.error("Failed to download PDF:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Download Button */}
      <div className="flex justify-center">
        <button
          onClick={downloadAsPDF}
          disabled={isDownloading}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5" />
          {isDownloading ? "Generating PDF..." : "Download Receipt PDF"}
        </button>
      </div>

      {/* Modern Receipt Design */}
      <div
        ref={receiptRef}
        className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200"
      >
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">{receiptData.organizationName}</h2>
              <p className="text-violet-100 mt-1">{receiptData.organizationAddress}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
              <FileText className="w-8 h-8" />
            </div>
          </div>
        </div>

        {/* Receipt Content */}
        <div className="px-8 py-6 space-y-6">
          {/* Success Badge */}
          <div className="flex items-center justify-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-800">Payment Successful</span>
          </div>

          {/* Receipt Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Receipt Number
              </div>
              <div className="font-mono font-bold text-gray-900">
                #{receiptData.receiptNumber}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Date</div>
              <div className="font-semibold text-gray-900">
                {new Date(receiptData.purchaseDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
              Bill To
            </div>
            <div className="font-semibold text-gray-900">{receiptData.customerName}</div>
            <div className="text-gray-600">{receiptData.customerEmail}</div>
          </div>

          {/* Items Table */}
          <div className="pt-4 border-t border-gray-200">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 text-xs text-gray-500 uppercase tracking-wide font-semibold">
                    Item
                  </th>
                  <th className="text-center py-3 text-xs text-gray-500 uppercase tracking-wide font-semibold">
                    Qty
                  </th>
                  <th className="text-right py-3 text-xs text-gray-500 uppercase tracking-wide font-semibold">
                    Price
                  </th>
                  <th className="text-right py-3 text-xs text-gray-500 uppercase tracking-wide font-semibold">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {receiptData.items.map((item, index) => (
                  <tr key={index}>
                    <td className="py-3 font-medium text-gray-900">{item.productName}</td>
                    <td className="py-3 text-center text-gray-600">{item.quantity}</td>
                    <td className="py-3 text-right text-gray-600">
                      {(item.pricePerUnit / 100).toFixed(2)} {receiptData.currency}
                    </td>
                    <td className="py-3 text-right font-semibold text-gray-900">
                      {(item.totalPrice / 100).toFixed(2)} {receiptData.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="pt-4 border-t border-gray-200 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold text-gray-900">
                {(receiptData.subtotal / 100).toFixed(2)} {receiptData.currency}
              </span>
            </div>
            {receiptData.taxAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span className="font-semibold text-gray-900">
                  {(receiptData.taxAmount / 100).toFixed(2)} {receiptData.currency}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t-2 border-gray-300">
              <span className="text-lg font-bold text-gray-900">Total Paid</span>
              <span className="text-2xl font-bold text-violet-600">
                {(receiptData.total / 100).toFixed(2)} {receiptData.currency}
              </span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Payment Method</span>
              <span className="font-semibold text-gray-900">
                {receiptData.paymentMethod}
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-500 font-mono">
              Payment ID: {receiptData.paymentIntentId}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Thank you for your purchase! For questions, contact support@l4yercak3.com
          </p>
        </div>
      </div>
    </div>
  );
}
