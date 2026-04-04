"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Clock3, ExternalLink, Link2, Loader2 } from "lucide-react";
// Dynamic require avoids TS2589 deep type instantiation from generated API type expansion.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };
import type { Id } from "../../../../convex/_generated/dataModel";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

type AvailabilitySummary = {
  productId: Id<"objects">;
  isBookable: boolean;
  connectionMode: "none" | "self" | "linked";
  isConnectionValid: boolean;
  availabilityResourceId: Id<"objects"> | null;
  availabilityResourceName: string | null;
  availabilityResourceSubtype: string | null;
  availabilityResourceStatus: string | null;
  resourceId: Id<"objects">;
  hasAvailabilityConfigured: boolean;
  hasDirectAvailability: boolean;
  usesScheduleTemplate: boolean;
  scheduleSource: "none" | "direct" | "template" | "mixed";
  directScheduleCount: number;
  weeklyWindowCount: number;
  exceptionCount: number;
  blockCount: number;
  scheduleTemplateCount: number;
  scheduleTemplateNames: string[];
};

interface ResourceOption {
  _id: Id<"objects">;
  name?: string | null;
  subtype?: string | null;
  status?: string | null;
}

interface ProductAvailabilityConnectionProps {
  sessionId: string;
  productId: Id<"objects"> | null;
  selectedResourceId: string;
  onSelectedResourceIdChange: (value: string) => void;
  resourceOptions: ResourceOption[];
}

export function ProductAvailabilityConnection({
  sessionId,
  productId,
  selectedResourceId,
  onSelectedResourceIdChange,
  resourceOptions,
}: ProductAvailabilityConnectionProps) {
  const { t } = useNamespaceTranslations("ui.products");
  const interpolate = (
    value: string,
    params?: Record<string, string | number>
  ): string => {
    if (!params) {
      return value;
    }
    return value.replace(/\{(\w+)\}/g, (_match, token) =>
      token in params ? String(params[token]) : `{${token}}`
    );
  };
  const tx = (
    key: string,
    fallback: string,
    params?: Record<string, string | number>
  ): string => {
    const translated = t(key, params);
    return translated === key ? interpolate(fallback, params) : translated;
  };
  const availabilitySummary = useQuery(
    api.availabilityOntology.getProductAvailabilitySummary,
    productId ? { sessionId, productId } : "skip"
  ) as AvailabilitySummary | undefined;

  const selectableResources = resourceOptions.filter(
    (candidate) => candidate._id !== productId
  );
  const selectedResourceOption =
    selectableResources.find((candidate) => candidate._id === selectedResourceId) || null;
  const savedSelectionValue =
    availabilitySummary?.connectionMode === "linked" &&
    availabilitySummary.availabilityResourceId
      ? availabilitySummary.availabilityResourceId
      : "";
  const pendingResourceSelection = productId
    ? selectedResourceId !== savedSelectionValue
    : Boolean(selectedResourceId);

  const badgeStyle = availabilitySummary?.hasAvailabilityConfigured
    ? { background: "var(--success)", color: "white" }
    : { background: "var(--warning)", color: "white" };

  const connectionLabel = (() => {
    if (!availabilitySummary) {
      return tx(
        "ui.products.form.availability.connection.pending",
        "Connection will be saved with this product"
      );
    }

    if (
      availabilitySummary.connectionMode === "linked" &&
      !availabilitySummary.isConnectionValid
    ) {
      return tx(
        "ui.products.form.availability.connection.mode.invalid",
        "Connected resource is missing or invalid"
      );
    }

    if (availabilitySummary.connectionMode === "linked") {
      return tx(
        "ui.products.form.availability.connection.mode.linked",
        "Uses availability from {resource}",
        {
          resource:
            availabilitySummary.availabilityResourceName ||
            tx(
              "ui.products.form.availability.connection.mode.unnamed_resource",
              "linked resource"
            ),
        }
      );
    }

    if (availabilitySummary.connectionMode === "self") {
      return tx(
        "ui.products.form.availability.connection.mode.self",
        "This product manages its own availability"
      );
    }

    return tx(
      "ui.products.form.availability.connection.mode.none",
      "No availability resource connected"
    );
  })();

  const sourceLabel = (() => {
    switch (availabilitySummary?.scheduleSource) {
      case "direct":
        return tx(
          "ui.products.form.availability.connection.source.direct",
          "Direct resource schedule"
        );
      case "template":
        return tx(
          "ui.products.form.availability.connection.source.template",
          "Linked schedule template"
        );
      case "mixed":
        return tx(
          "ui.products.form.availability.connection.source.mixed",
          "Direct schedule + template"
        );
      default:
        return tx(
          "ui.products.form.availability.connection.source.none",
          "No schedule connected"
        );
    }
  })();

  return (
    <div
      className="space-y-4 rounded border-2 p-4"
      style={{
        borderColor: "var(--shell-border)",
        background: "var(--shell-surface-elevated)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold" style={{ color: "var(--shell-text)" }}>
            {tx("ui.products.form.availability.connection.title", "Availability Connection")}
          </h3>
          <p className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
            {tx(
              "ui.products.form.availability.connection.description",
              "Keep the commercial product separate from the calendar or seat pool that actually carries availability."
            )}
          </p>
        </div>
        <Clock3 size={16} style={{ color: "var(--shell-accent)" }} />
      </div>

      <div
        className="rounded border-2 p-3"
        style={{
          borderColor: "var(--shell-border)",
          background: "var(--shell-input-surface)",
        }}
      >
        <label
          className="block text-xs font-semibold"
          style={{ color: "var(--shell-text)" }}
        >
          {tx(
            "ui.products.form.availability.connection.resource_label",
            "Availability resource"
          )}
        </label>
        <select
          value={selectedResourceId}
          onChange={(event) => onSelectedResourceIdChange(event.target.value)}
          className="mt-2 w-full border-2 px-3 py-2 text-sm"
          style={{
            borderColor: "var(--shell-border)",
            background: "var(--shell-surface-elevated)",
            color: "var(--shell-input-text)",
          }}
        >
          <option value="">
            {tx(
              "ui.products.form.availability.connection.resource_self",
              "This product manages its own availability"
            )}
          </option>
          {selectableResources.map((resource) => (
            <option key={resource._id} value={resource._id}>
              {resource.name || tx("ui.products.form.availability.connection.unnamed", "Untitled resource")}
              {resource.subtype ? ` (${resource.subtype})` : ""}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
          {tx(
            "ui.products.form.availability.connection.resource_help",
            "Use a separate resource when multiple products should share one schedule, room, therapist, boat, or seat pool."
          )}
        </p>
        {!productId && selectedResourceOption ? (
          <p className="mt-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
            {tx(
              "ui.products.form.availability.connection.create_note",
              "After you save this product, it will use availability from {resource}.",
              { resource: selectedResourceOption.name || "the selected resource" }
            )}
          </p>
        ) : null}
        {productId && pendingResourceSelection ? (
          <p className="mt-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
            {tx(
              "ui.products.form.availability.connection.pending_save",
              "Save this product to apply the changed availability connection."
            )}
          </p>
        ) : null}
      </div>

      {!productId ? (
        <div
          className="rounded border-2 p-3 text-xs"
          style={{
            borderColor: "var(--shell-border)",
            background: "var(--shell-input-surface)",
            color: "var(--neutral-gray)",
          }}
        >
          {tx(
            "ui.products.form.availability.connection.save_first",
            "Save this product first, then open Booking to configure weekly windows, overrides, and blackout dates."
          )}
        </div>
      ) : availabilitySummary === undefined ? (
        <div
          className="flex items-center gap-2 rounded border-2 p-3 text-xs"
          style={{
            borderColor: "var(--shell-border)",
            background: "var(--shell-input-surface)",
            color: "var(--neutral-gray)",
          }}
        >
          <Loader2 size={14} className="animate-spin" />
          <span>
            {tx(
              "ui.products.form.availability.connection.loading",
              "Loading availability connection..."
            )}
          </span>
        </div>
      ) : (
        <>
          <div
            className="rounded border-2 p-3"
            style={{
              borderColor: "var(--shell-border)",
              background: "var(--shell-input-surface)",
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="rounded px-2 py-0.5 text-xs font-bold"
                    style={badgeStyle}
                  >
                    {availabilitySummary.hasAvailabilityConfigured
                      ? tx(
                          "ui.products.form.availability.connection.status.ready",
                          "Availability ready"
                        )
                      : tx(
                          "ui.products.form.availability.connection.status.missing",
                          "Availability not configured"
                        )}
                  </span>
                  <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    <Link2 size={12} className="mr-1 inline" />
                    {connectionLabel}
                  </span>
                </div>
                <p className="mt-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {availabilitySummary.hasAvailabilityConfigured
                    ? tx(
                        "ui.products.form.availability.connection.ready_help",
                        "This product already resolves to booking-side availability data."
                      )
                    : tx(
                        "ui.products.form.availability.connection.missing_help",
                        "This product will not surface live booking slots until the connected availability is configured."
                      )}
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {sourceLabel}
                </p>
              </div>

              {availabilitySummary.isConnectionValid &&
              availabilitySummary.availabilityResourceId ? (
                <Link
                  href={`/booking?resourceId=${availabilitySummary.availabilityResourceId}`}
                  className="inline-flex items-center gap-1 border-2 px-3 py-1.5 text-xs font-bold transition-colors hover:brightness-95"
                  style={{
                    borderColor: "var(--shell-border)",
                    background: "var(--shell-button-surface)",
                    color: "var(--shell-text)",
                  }}
                >
                  <ExternalLink size={12} />
                  {tx(
                    "ui.products.form.availability.connection.manage",
                    "Manage Availability"
                  )}
                </Link>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: tx(
                  "ui.products.form.availability.connection.weekly_windows",
                  "Weekly windows"
                ),
                value: availabilitySummary.weeklyWindowCount,
              },
              {
                label: tx(
                  "ui.products.form.availability.connection.overrides",
                  "Overrides"
                ),
                value: availabilitySummary.exceptionCount,
              },
              {
                label: tx(
                  "ui.products.form.availability.connection.blackouts",
                  "Blackouts"
                ),
                value: availabilitySummary.blockCount,
              },
              {
                label: tx(
                  "ui.products.form.availability.connection.templates",
                  "Schedule templates"
                ),
                value: availabilitySummary.scheduleTemplateCount,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded border-2 p-3"
                style={{
                  borderColor: "var(--shell-border)",
                  background: "var(--shell-input-surface)",
                }}
              >
                <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--neutral-gray)" }}>
                  {item.label}
                </p>
                <p className="mt-1 text-lg font-bold" style={{ color: "var(--shell-text)" }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {availabilitySummary.scheduleTemplateNames.length > 0 ? (
            <div
              className="rounded border-2 p-3 text-xs"
              style={{
                borderColor: "var(--shell-border)",
                background: "var(--shell-input-surface)",
                color: "var(--neutral-gray)",
              }}
            >
              <span className="font-semibold" style={{ color: "var(--shell-text)" }}>
                {tx(
                  "ui.products.form.availability.connection.template_names",
                  "Connected templates:"
                )}{" "}
              </span>
              {availabilitySummary.scheduleTemplateNames.join(", ")}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
