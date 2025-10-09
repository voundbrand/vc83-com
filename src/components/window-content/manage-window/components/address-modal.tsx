"use client";

import { X } from "lucide-react";
import { Doc } from "../../../../../convex/_generated/dataModel";
import { AddressForm } from "./address-form";

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  address?: Doc<"objects">; // Changed from organizationAddresses
  onSubmit: (data: {
    type: "billing" | "shipping" | "mailing" | "physical" | "other";
    label?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
    region?: string;
    isDefault?: boolean;
    isPrimary?: boolean;
  }) => void | Promise<void>;
  isSubmitting?: boolean;
}

export function AddressModal({
  isOpen,
  onClose,
  address,
  onSubmit,
  isSubmitting = false,
}: AddressModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
        <div className="bg-gray-100 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-purple-600 px-4 py-2 flex items-center justify-between border-b-4 border-black">
            <h2 className="text-white font-bold text-lg">
              {address ? "Edit Address" : "Add New Address"}
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-purple-700 p-1"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            <AddressForm
              initialData={address}
              onSubmit={onSubmit}
              onCancel={onClose}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      </div>
    </>
  );
}
