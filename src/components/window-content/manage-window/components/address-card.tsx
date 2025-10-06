"use client";

import { MapPin, Star, Edit2, Trash2 } from "lucide-react";
import { Doc } from "../../../../../convex/_generated/dataModel";

interface AddressCardProps {
  address: Doc<"organizationAddresses">;
  onEdit?: (address: Doc<"organizationAddresses">) => void;
  onDelete?: (address: Doc<"organizationAddresses">) => void;
  onSetPrimary?: (address: Doc<"organizationAddresses">) => void;
  canEdit?: boolean;
}

const ADDRESS_TYPE_LABELS: Record<string, string> = {
  billing: "Billing",
  shipping: "Shipping",
  mailing: "Mailing",
  physical: "Physical Location",
  other: "Other",
};

const ADDRESS_TYPE_COLORS: Record<string, string> = {
  billing: "bg-purple-100 text-purple-700 border-purple-300",
  shipping: "bg-blue-100 text-blue-700 border-blue-300",
  mailing: "bg-green-100 text-green-700 border-green-300",
  physical: "bg-orange-100 text-orange-700 border-orange-300",
  other: "bg-gray-100 text-gray-700 border-gray-300",
};

export function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetPrimary,
  canEdit = false,
}: AddressCardProps) {
  const formatAddress = () => {
    const parts = [
      address.addressLine1,
      address.addressLine2,
      address.city,
      address.state,
      address.postalCode,
      address.country,
    ].filter(Boolean);

    return parts;
  };

  const addressParts = formatAddress();
  const typeColor = ADDRESS_TYPE_COLORS[address.type] || ADDRESS_TYPE_COLORS.other;
  const typeLabel = ADDRESS_TYPE_LABELS[address.type] || "Address";

  return (
    <div className="border-2 border-gray-300 bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-600" />
          <div>
            <div className="flex items-center gap-2">
              {address.isPrimary && (
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-600" />
              )}
              <span className="font-bold text-sm">
                {address.label || typeLabel}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-xs px-2 py-0.5 border ${typeColor} font-bold`}
              >
                {typeLabel.toUpperCase()}
              </span>
              {address.isDefault && (
                <span className="text-xs px-2 py-0.5 border bg-green-100 text-green-700 border-green-300 font-bold">
                  DEFAULT
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {canEdit && (
          <div className="flex gap-1">
            {!address.isPrimary && onSetPrimary && (
              <button
                onClick={() => onSetPrimary(address)}
                className="p-1.5 hover:bg-gray-100 border-2 border-gray-300 bg-white text-xs font-bold"
                title="Set as primary address"
              >
                <Star className="w-3.5 h-3.5" />
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(address)}
                className="p-1.5 hover:bg-gray-100 border-2 border-gray-300 bg-white text-xs font-bold"
                title="Edit address"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && !address.isPrimary && (
              <button
                onClick={() => onDelete(address)}
                className="p-1.5 hover:bg-red-50 border-2 border-red-300 bg-white text-red-600 text-xs font-bold"
                title="Delete address"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Address Lines */}
      <div className="space-y-1 text-sm text-gray-700">
        {addressParts.map((part, idx) => (
          <div key={idx}>{part}</div>
        ))}
      </div>

      {/* Region */}
      {address.region && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <span className="text-xs text-gray-500">Region: {address.region}</span>
        </div>
      )}
    </div>
  );
}
