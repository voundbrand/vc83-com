/**
 * CHECKOUT TEMPLATE LOADER
 *
 * Dynamic loader for checkout templates.
 * Provides a unified interface for loading any checkout template type.
 */

import React from "react";
import { Id } from "../../../convex/_generated/dataModel";
import { Theme } from "@/templates/types";
import { CheckoutItem, CheckoutCallbacks } from "./core/types";
import {
  CheckoutTemplateType,
  getCheckoutTemplate,
  isValidCheckoutType
} from "./registry";

/**
 * Base props that all checkout templates accept.
 */
interface BaseCheckoutLoaderProps {
  type: CheckoutTemplateType | string;
  items: CheckoutItem[];
  organizationId: Id<"organizations">;
  theme: Theme;
  callbacks?: CheckoutCallbacks;
}

/**
 * Extended props for ticket checkout.
 */
interface TicketCheckoutLoaderProps extends BaseCheckoutLoaderProps {
  type: "ticket";
  eventId: Id<"objects">;
  eventName: string;
  eventDate: Date;
  venue?: string;
  showEventInfo?: boolean;
  showVenueDetails?: boolean;
  maxTicketsPerOrder?: number;
}

/**
 * Extended props for product checkout.
 */
interface ProductCheckoutLoaderProps extends BaseCheckoutLoaderProps {
  type: "product";
  showImages?: boolean;
  showRecommended?: boolean;
  allowMultipleProducts?: boolean;
  shippingRequired?: boolean;
}

/**
 * Extended props for service checkout.
 */
interface ServiceCheckoutLoaderProps extends BaseCheckoutLoaderProps {
  type: "service";
  addOns?: CheckoutItem[];
  showDuration?: boolean;
  showScheduling?: boolean;
  requireScheduling?: boolean;
}

/**
 * Union type of all possible loader props.
 */
export type CheckoutLoaderProps =
  | TicketCheckoutLoaderProps
  | ProductCheckoutLoaderProps
  | ServiceCheckoutLoaderProps
  | BaseCheckoutLoaderProps;

/**
 * Dynamic checkout template loader.
 *
 * @example
 * ```tsx
 * <CheckoutTemplateLoader
 *   type="ticket"
 *   items={tickets}
 *   organizationId={orgId}
 *   theme={theme}
 *   eventId={eventId}
 *   eventName="Tech Conference 2025"
 *   eventDate={new Date("2025-06-15")}
 * />
 * ```
 */
export function CheckoutTemplateLoader(props: CheckoutLoaderProps) {
  const { type, ...restProps } = props;

  // Validate template type
  if (!isValidCheckoutType(type)) {
    return (
      <div style={{
        padding: "2rem",
        textAlign: "center",
        color: "#EF4444",
      }}>
        <h2>Invalid Checkout Template</h2>
        <p>Template type &quot;{type}&quot; is not recognized.</p>
        <p>Available types: ticket, product, service</p>
      </div>
    );
  }

  // Get the appropriate template component
  const TemplateComponent = getCheckoutTemplate(type);

  // Render with type-specific props
  // TypeScript will ensure the correct props are passed based on the type
  return <TemplateComponent {...(restProps as Parameters<typeof TemplateComponent>[0])} />;
}

/**
 * Helper to create a loader for a specific template type.
 * Useful for type-safe template usage.
 *
 * @example
 * ```tsx
 * const TicketLoader = createCheckoutLoader("ticket");
 *
 * <TicketLoader
 *   items={tickets}
 *   organizationId={orgId}
 *   theme={theme}
 *   eventId={eventId}
 *   eventName="Tech Conference"
 *   eventDate={date}
 * />
 * ```
 */
export function createCheckoutLoader<T extends CheckoutTemplateType>(
  templateType: T
) {
  const LoaderComponent = (props: Omit<Extract<CheckoutLoaderProps, { type: T }>, "type">) => {
    return <CheckoutTemplateLoader type={templateType} {...(props as Omit<CheckoutLoaderProps, "type">)} />;
  };
  LoaderComponent.displayName = `CheckoutLoader(${templateType})`;
  return LoaderComponent;
}
