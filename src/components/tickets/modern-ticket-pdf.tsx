"use client";

/**
 * MODERN TICKET PDF GENERATOR
 *
 * Beautiful, modern ticket design that can be downloaded as PDF.
 * Uses jsPDF for client-side PDF generation.
 */

import { useRef, useState } from "react";
import Image from "next/image";
import { Download, QrCode, Calendar, MapPin, Ticket } from "lucide-react";

interface TicketData {
  ticketNumber: string;
  holderName: string;
  holderEmail: string;
  eventName: string;
  eventDescription?: string;
  eventDate?: number;
  eventLocation?: string;
  ticketType: string;
  purchaseDate: number;
  qrCodeDataUrl: string;
  organizationName: string;
  pricePerUnit: number;
  currency: string;
}

export function ModernTicketPDF({ ticketData }: { ticketData: TicketData }) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadAsPDF = async () => {
    if (!ticketRef.current) return;

    setIsDownloading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;

      // Capture the ticket as an image
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2, // High quality
        backgroundColor: "#ffffff",
        logging: false,
      });

      // Create PDF
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 297; // A4 landscape width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`ticket-${ticketData.ticketNumber}.pdf`);
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
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5" />
          {isDownloading ? "Generating PDF..." : "Download Ticket PDF"}
        </button>
      </div>

      {/* Modern Ticket Design */}
      <div
        ref={ticketRef}
        className="relative w-full max-w-4xl mx-auto bg-white rounded-3xl overflow-hidden shadow-2xl"
        style={{ aspectRatio: "16/9" }}
      >
        {/* Purple Gradient Header */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-900" />

        {/* Animated Background Pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Content Grid */}
        <div className="relative h-full grid grid-cols-3 gap-8 p-12">
          {/* Left Section - Event Info */}
          <div className="col-span-2 flex flex-col justify-between text-white">
            {/* Organization */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                <Ticket className="w-4 h-4" />
                {ticketData.organizationName}
              </div>
            </div>

            {/* Event Name */}
            <div className="space-y-6">
              <div>
                <h1 className="text-6xl font-black leading-tight mb-2">
                  {ticketData.eventName}
                </h1>
                {ticketData.eventDescription && (
                  <p className="text-purple-100 text-xl font-medium">
                    {ticketData.eventDescription}
                  </p>
                )}
              </div>

              {/* Event Details */}
              <div className="grid grid-cols-2 gap-4">
                {ticketData.eventDate && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-white/10 backdrop-blur-sm rounded-xl">
                    <Calendar className="w-6 h-6 text-purple-200" />
                    <div>
                      <div className="text-xs text-purple-200 uppercase tracking-wide">
                        Date & Time
                      </div>
                      <div className="font-bold">
                        {new Date(ticketData.eventDate).toLocaleDateString()}
                      </div>
                      <div className="text-sm">
                        {new Date(ticketData.eventDate).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {ticketData.eventLocation && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-white/10 backdrop-blur-sm rounded-xl">
                    <MapPin className="w-6 h-6 text-purple-200" />
                    <div>
                      <div className="text-xs text-purple-200 uppercase tracking-wide">
                        Location
                      </div>
                      <div className="font-bold text-sm">{ticketData.eventLocation}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Ticket Holder */}
            <div className="space-y-1">
              <div className="text-purple-200 text-sm uppercase tracking-wide">
                Ticket Holder
              </div>
              <div className="text-2xl font-bold">{ticketData.holderName}</div>
              <div className="text-purple-100">{ticketData.holderEmail}</div>
            </div>
          </div>

          {/* Right Section - QR Code */}
          <div className="flex flex-col items-center justify-center space-y-6 bg-white/10 backdrop-blur-md rounded-2xl p-6">
            {/* QR Code */}
            <div className="bg-white p-4 rounded-2xl shadow-2xl">
              <Image
                src={ticketData.qrCodeDataUrl}
                alt="Ticket QR Code"
                width={192}
                height={192}
                className="w-48 h-48"
              />
            </div>

            {/* Ticket Info */}
            <div className="text-center space-y-2">
              <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full">
                <div className="text-xs text-purple-200 uppercase tracking-wide">
                  Ticket Type
                </div>
                <div className="font-bold text-white text-sm uppercase">
                  {ticketData.ticketType}
                </div>
              </div>

              <div className="text-sm text-purple-100 font-mono">
                #{ticketData.ticketNumber}
              </div>
            </div>

            {/* Scan Instruction */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-purple-200">
                <QrCode className="w-4 h-4" />
                <span className="text-xs font-medium">Scan at entrance</span>
              </div>
            </div>
          </div>
        </div>

        {/* Perforated Edge Effect */}
        <div
          className="absolute right-0 top-0 bottom-0 w-1"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, white 0px, white 10px, transparent 10px, transparent 20px)",
          }}
        />
      </div>

      {/* Purchase Info */}
      <div className="text-center text-sm text-gray-500 space-y-1">
        <p>
          Purchased on {new Date(ticketData.purchaseDate).toLocaleDateString()} •{" "}
          {(ticketData.pricePerUnit / 100).toFixed(2)} {ticketData.currency}
        </p>
        <p className="text-xs">
          This ticket is registered to {ticketData.holderEmail} and is non-transferable
        </p>
      </div>
    </div>
  );
}
