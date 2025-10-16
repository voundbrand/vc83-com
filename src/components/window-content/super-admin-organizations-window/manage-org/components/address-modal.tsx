"use client";

import { X } from "lucide-react";
import { Doc } from "../../../../../../convex/_generated/dataModel";
import { AddressForm } from "./address-form";
import { useTranslation } from "@/contexts/translation-context";

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
    isTaxOrigin?: boolean;
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
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998]"
        style={{ backgroundColor: "var(--modal-overlay-bg)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
        <div
          className="border-4 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          style={{
            backgroundColor: "var(--win95-bg)",
            borderColor: "var(--win95-border)",
            boxShadow: "var(--win95-shadow)",
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-2 flex items-center justify-between border-b-4"
            style={{
              background: "var(--win95-titlebar)",
              borderColor: "var(--win95-border)",
            }}
          >
            <h2
              className="font-bold text-lg"
              style={{ color: "var(--win95-titlebar-text)" }}
            >
              {address ? t("ui.manage.address.modal.edit_title") : t("ui.manage.address.modal.add_title")}
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:opacity-80"
              disabled={isSubmitting}
              style={{
                color: "var(--win95-titlebar-text)",
              }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div
            className="p-6 overflow-y-auto flex-1"
            style={{ backgroundColor: "var(--win95-bg)" }}
          >
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
