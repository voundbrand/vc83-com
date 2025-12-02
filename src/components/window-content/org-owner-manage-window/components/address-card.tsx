"use client";

import { MapPin, Star, Edit2, Trash2 } from "lucide-react";
import { Doc } from "../../../../../convex/_generated/dataModel";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

// Address is now stored as an object with type="address"
interface AddressCardProps {
  address: Doc<"objects">;
  onEdit?: (address: Doc<"objects">) => void;
  onDelete?: (address: Doc<"objects">) => void;
  onSetPrimary?: (address: Doc<"objects">) => void;
  canEdit?: boolean;
}

const ADDRESS_TYPE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  billing: { bg: 'var(--win95-bg-light)', text: 'var(--win95-highlight)', border: 'var(--win95-border)' },
  shipping: { bg: 'var(--win95-bg-light)', text: 'var(--info)', border: 'var(--win95-border)' },
  mailing: { bg: 'var(--win95-bg-light)', text: 'var(--success)', border: 'var(--win95-border)' },
  physical: { bg: 'var(--win95-bg-light)', text: 'var(--warning)', border: 'var(--win95-border)' },
  other: { bg: 'var(--win95-bg)', text: 'var(--win95-text)', border: 'var(--win95-border)' },
};

export function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetPrimary,
  canEdit = false,
}: AddressCardProps) {
  const { t } = useNamespaceTranslations("ui.manage");

  // Address data is now in customProperties
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props = address.customProperties as any;

  const formatAddress = () => {
    const parts = [
      props?.addressLine1,
      props?.addressLine2,
      props?.city,
      props?.state,
      props?.postalCode,
      props?.country,
    ].filter(Boolean);

    return parts;
  };

  const addressParts = formatAddress();
  // Subtype replaces the old "type" field (billing, shipping, etc.)
  const addressType = address.subtype || "other";
  const typeStyle = ADDRESS_TYPE_STYLES[addressType] || ADDRESS_TYPE_STYLES.other;

  // Translate address type labels dynamically
  const getTypeLabel = (type: string) => {
    const key = `ui.manage.address.type.${type}`;
    return t(key);
  };
  const typeLabel = getTypeLabel(addressType);

  return (
    <div
      className="border-2 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
      style={{
        borderColor: 'var(--win95-border)',
        background: 'var(--win95-bg-light)'
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" style={{ color: 'var(--neutral-gray)' }} />
          <div>
            <div className="flex items-center gap-2">
              {props?.isPrimary && (
                <Star className="w-4 h-4" style={{ color: 'var(--warning)', fill: 'var(--warning)' }} />
              )}
              <span className="font-bold text-sm" style={{ color: 'var(--win95-text)' }}>
                {props?.label || address.name || typeLabel}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-xs px-2 py-0.5 border font-bold"
                style={{
                  backgroundColor: typeStyle.bg,
                  color: typeStyle.text,
                  borderColor: typeStyle.border
                }}
              >
                {typeLabel.toUpperCase()}
              </span>
              {props?.isDefault && (
                <span
                  className="text-xs px-2 py-0.5 border font-bold"
                  style={{
                    backgroundColor: 'var(--win95-bg-light)',
                    color: 'var(--success)',
                    borderColor: 'var(--success)'
                  }}
                >
                  {t("ui.manage.address.default_badge")}
                </span>
              )}
              {props?.isTaxOrigin && (
                <span
                  className="text-xs px-2 py-0.5 border font-bold"
                  style={{
                    backgroundColor: 'var(--win95-bg-light)',
                    color: 'var(--warning)',
                    borderColor: 'var(--warning)'
                  }}
                  title="Tax origin address for tax nexus calculation"
                >
                  TAX ORIGIN
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {canEdit && (
          <div className="flex gap-1">
            {!props?.isPrimary && onSetPrimary && (
              <button
                onClick={() => onSetPrimary(address)}
                className="retro-button-small p-1.5"
                title={t("ui.manage.address.set_primary")}
              >
                <Star className="w-3.5 h-3.5" />
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(address)}
                className="retro-button-small p-1.5"
                title={t("ui.manage.address.edit")}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && !props?.isPrimary && (
              <button
                onClick={() => onDelete(address)}
                className="retro-button-small p-1.5"
                style={{
                  color: 'var(--error)'
                }}
                title={t("ui.manage.address.delete")}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Address Lines */}
      <div className="space-y-1 text-sm" style={{ color: 'var(--win95-text)' }}>
        {addressParts.map((part, idx) => (
          <div key={idx}>{part}</div>
        ))}
      </div>

      {/* Region */}
      {props?.region && (
        <div
          className="mt-2 pt-2 border-t"
          style={{ borderColor: 'var(--win95-border)' }}
        >
          <span className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
            {t("ui.manage.address.region_label")} {props.region}
          </span>
        </div>
      )}
    </div>
  );
}
