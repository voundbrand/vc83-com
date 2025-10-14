/**
 * SERVICE CHECKOUT TEMPLATE
 *
 * Specialized checkout template for service bookings.
 * Handles service packages, scheduling, and add-ons.
 */

import React from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import { Theme } from "@/templates/types";
import { CheckoutCore, useCheckout } from "../core/checkout-core";
import { CheckoutItem, CheckoutCallbacks } from "../core/types";
import { PriceDisplay } from "../components/PriceDisplay";
import { CheckoutSummary } from "../components/CheckoutSummary";

export interface ServiceCheckoutProps {
  // Service information
  services: CheckoutItem[];
  addOns?: CheckoutItem[];

  // Configuration
  organizationId: Id<"organizations">;
  theme: Theme;
  callbacks?: CheckoutCallbacks;

  // Optional features
  showDuration?: boolean;
  showScheduling?: boolean;
  requireScheduling?: boolean;
}

/**
 * Service checkout content component.
 */
function ServiceCheckoutContent({
  showDuration = true,
  showScheduling = false,
}: Pick<ServiceCheckoutProps, "showDuration" | "showScheduling">) {
  const {
    items,
    selectedItem,
    selectedItemIndex,
    priceCalculation,
    theme,
    isProcessing,
    handleItemSelect,
    handleCheckout,
  } = useCheckout();

  const containerStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 400px",
    gap: theme.spacing.xl,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.body,
  };

  const serviceListStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing.md,
  };

  const serviceCardStyle = (isSelected: boolean): React.CSSProperties => ({
    padding: theme.spacing.lg,
    backgroundColor: isSelected ? theme.colors.primary + "10" : theme.colors.surface,
    border: `2px solid ${isSelected ? theme.colors.primary : theme.colors.border}`,
    borderRadius: theme.borderRadius.md,
    cursor: "pointer",
    transition: "all 0.2s ease",
  });

  const sidebarStyle: React.CSSProperties = {
    position: "sticky",
    top: theme.spacing.xl,
    height: "fit-content",
  };

  const buttonStyle: React.CSSProperties = {
    width: "100%",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    color: theme.colors.background,
    border: "none",
    borderRadius: theme.borderRadius.md,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    cursor: isProcessing ? "not-allowed" : "pointer",
    opacity: isProcessing ? 0.6 : 1,
    marginTop: theme.spacing.lg,
  };

  return (
    <div style={containerStyle}>
      {/* Main Content - Service Selection */}
      <div>
        <h2 style={{
          fontSize: theme.typography.fontSize.h2,
          fontWeight: theme.typography.fontWeight.bold,
          marginBottom: theme.spacing.lg,
        }}>
          Choose Your Service Package
        </h2>

        <div style={serviceListStyle}>
          {items.map((service, index) => (
            <div
              key={service.id}
              style={serviceCardStyle(index === selectedItemIndex)}
              onClick={() => handleItemSelect(index)}
            >
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontSize: theme.typography.fontSize.xl,
                    fontWeight: theme.typography.fontWeight.semibold,
                    marginBottom: theme.spacing.xs,
                  }}>
                    {service.name}
                  </h3>

                  {showDuration && service.customProperties?.duration && (
                    <div style={{
                      color: theme.colors.textLight,
                      fontSize: theme.typography.fontSize.sm,
                      marginBottom: theme.spacing.sm,
                    }}>
                      ⏱️ {service.customProperties.duration}
                    </div>
                  )}

                  {service.description && (
                    <p style={{
                      color: theme.colors.textLight,
                      fontSize: theme.typography.fontSize.base,
                      lineHeight: theme.typography.lineHeight.relaxed,
                      marginBottom: theme.spacing.md,
                    }}>
                      {service.description}
                    </p>
                  )}

                  {/* Service Features/Includes */}
                  {service.features && service.features.length > 0 && (
                    <div style={{
                      marginTop: theme.spacing.md,
                    }}>
                      <h4 style={{
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: theme.typography.fontWeight.semibold,
                        marginBottom: theme.spacing.xs,
                        color: theme.colors.textLight,
                      }}>
                        What&apos;s Included:
                      </h4>
                      <ul style={{
                        listStyle: "none",
                        padding: 0,
                        margin: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: theme.spacing.xs,
                      }}>
                        {service.features.map((feature, i) => (
                          <li key={i} style={{
                            fontSize: theme.typography.fontSize.sm,
                            color: theme.colors.textLight,
                          }}>
                            ✓ {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div style={{ marginLeft: theme.spacing.lg }}>
                  <PriceDisplay
                    price={service.price}
                    originalPrice={service.originalPrice}
                    currency={service.currency}
                    theme={theme}
                    size="large"
                  />
                  {service.customProperties?.priceUnit && (
                    <div style={{
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.textLight,
                      textAlign: "right",
                      marginTop: theme.spacing.xs,
                    }}>
                      {service.customProperties.priceUnit}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Scheduling Section */}
        {showScheduling && (
          <div style={{
            marginTop: theme.spacing.xl,
            padding: theme.spacing.lg,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
          }}>
            <h3 style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.semibold,
              marginBottom: theme.spacing.md,
            }}>
              Schedule Your Service
            </h3>

            <p style={{
              color: theme.colors.textLight,
              fontSize: theme.typography.fontSize.base,
              marginBottom: theme.spacing.md,
            }}>
              After payment, you&apos;ll receive a link to schedule your service at a time that works for you.
            </p>

            <div style={{
              padding: theme.spacing.md,
              backgroundColor: theme.colors.info + "10",
              borderLeft: `4px solid ${theme.colors.info}`,
              borderRadius: theme.borderRadius.sm,
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textLight,
            }}>
              ℹ️ Available time slots: Monday-Friday, 9AM-5PM EST
            </div>
          </div>
        )}
      </div>

      {/* Sidebar - Order Summary */}
      <div style={sidebarStyle}>
        {priceCalculation && (
          <>
            <CheckoutSummary
              calculation={priceCalculation}
              theme={theme}
            />

            <button
              style={buttonStyle}
              onClick={handleCheckout}
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Book Service"}
            </button>
          </>
        )}

        {/* Service Information */}
        <div style={{
          marginTop: theme.spacing.lg,
          padding: theme.spacing.md,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.md,
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textLight,
        }}>
          <h4 style={{
            fontWeight: theme.typography.fontWeight.semibold,
            marginBottom: theme.spacing.sm,
            color: theme.colors.text,
          }}>
            What to Expect
          </h4>

          <ul style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.sm,
          }}>
            <li>✓ Instant booking confirmation</li>
            <li>✓ Flexible scheduling options</li>
            <li>✓ Professional service providers</li>
            <li>✓ Satisfaction guaranteed</li>
          </ul>
        </div>

        {/* Cancellation Policy */}
        <div style={{
          marginTop: theme.spacing.md,
          padding: theme.spacing.md,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.md,
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.textLight,
        }}>
          <strong>Cancellation Policy:</strong> Free cancellation up to 24 hours before your scheduled service.
        </div>
      </div>
    </div>
  );
}

/**
 * Main service checkout template component.
 */
export function ServiceCheckoutTemplate(props: ServiceCheckoutProps) {
  const {
    services,
    organizationId,
    theme,
    callbacks,
    ...contentProps
  } = props;

  return (
    <CheckoutCore
      items={services}
      organizationId={organizationId}
      theme={theme}
      callbacks={callbacks}
      config={{
        showImages: false,
        showDescriptions: true,
        showFeatures: true,
        allowQuantity: false, // Services typically don't have quantities
        layout: "sidebar",
      }}
    >
      <ServiceCheckoutContent {...contentProps} />
    </CheckoutCore>
  );
}
