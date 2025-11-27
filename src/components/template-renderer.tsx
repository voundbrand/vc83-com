/**
 * UNIFIED TEMPLATE RENDERER
 *
 * Renders email and PDF templates from JSON schemas (not hardcoded components).
 * Similar to how forms render from schemas - but for templates.
 *
 * Usage:
 * ```tsx
 * <TemplateRenderer
 *   schema={ticketProfessionalV1Schema}
 *   data={mockTicketData}
 *   mode="preview"
 *   scale={0.15} // For thumbnails
 * />
 * ```
 */

"use client";

import { useMemo } from "react";
import type {
  TemplateSchema,
  TemplateSection,
  TemplatePreviewData,
  TemplateRenderOptions,
  HeaderSection,
  FooterSection,
  TextBlockSection,
  QRCodeSection,
  ButtonSection,
  DataTableSection,
  HeroImageSection,
  TicketDetailsSection,
  EventDetailsSection,
  SpacerSection,
  DividerSection,
} from "@/templates/template-schema";
import type {
  EmailSection,
  HeroSection as EmailHeroSection,
  BodySection,
  CtaSection,
  EventDetailsSection as EmailEventDetailsSection,
  OrderDetailsSection,
  AccountDetailsSection,
  AttachmentInfoSection,
  ShippingInfoSection,
  LeadMagnetInfoSection,
  SupportInfoSection,
  InvoiceDetailsSection,
} from "@/templates/emails/generic-types";
import { Loader2 } from "lucide-react";

interface TemplateRendererProps extends Omit<TemplateRenderOptions, "data"> {
  schema: TemplateSchema;
  data: TemplatePreviewData;
  className?: string;
}

/**
 * Template Renderer Component
 */
export function TemplateRenderer({
  schema,
  data,
  mode: _mode = "preview",
  scale = 1,
  interactive = false,
  className = "",
}: TemplateRendererProps) {
  // Replace template variables with actual data
  const resolveVariable = (template: string): string => {
    if (!template) return "";

    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const keys = path.trim().split(".");
      let value: unknown = data;

      for (const key of keys) {
        if (value && typeof value === "object" && key in value) {
          value = (value as Record<string, unknown>)[key];
        } else {
          return match; // Return original if path doesn't exist
        }
      }

      return String(value ?? "");
    });
  };

  // Evaluate condition (simple truthiness check for now)
  const evaluateCondition = (condition?: string): boolean => {
    if (!condition) return true;
    const resolved = resolveVariable(condition);
    return Boolean(resolved && resolved !== "undefined" && resolved !== "null");
  };

  // Detect schema type and get sections
  const isEmailSchema = "defaultSections" in schema && Array.isArray((schema as unknown as { defaultSections: unknown[] }).defaultSections);
  const isPdfSchema = schema.layout && "sections" in schema.layout && Array.isArray(schema.layout.sections);

  // Sort sections by order (PDF schemas) or use as-is (email schemas)
  const sortedSections = useMemo(() => {
    if (isPdfSchema && schema.layout?.sections) {
      return [...schema.layout.sections].sort((a, b) => a.order - b.order);
    } else if (isEmailSchema) {
      const emailSchema = schema as unknown as { defaultSections: TemplateSection[] };
      return emailSchema.defaultSections;
    }
    return [];
  }, [schema, isEmailSchema, isPdfSchema]);

  // Container styles - handle both email and PDF schemas
  const containerStyle: React.CSSProperties = {
    maxWidth: schema.styling?.maxWidth || "600px",
    margin: "0 auto",
    backgroundColor: schema.styling?.colors?.background || "#FFFFFF",
    fontFamily: schema.styling?.fonts?.body || "Arial, sans-serif",
    fontSize: scale !== 1 ? `${scale * 16}px` : "16px",
    transform: scale !== 1 ? `scale(${scale})` : undefined,
    transformOrigin: "top left",
    width: scale !== 1 ? `${100 / scale}%` : "100%",
  };

  return (
    <div className={`template-renderer ${className}`} style={containerStyle}>
      {sortedSections.length === 0 ? (
        <div style={{ padding: "24px", textAlign: "center", color: "#6B7280" }}>
          No sections to display
        </div>
      ) : (
        sortedSections.map((section, idx) => {
          // Email schemas may not have visible/condition properties
          const shouldRender = isPdfSchema
            ? section.visible !== false && evaluateCondition(section.condition)
            : true;

          if (!shouldRender) {
            return null;
          }

          return (
            <div
              key={section.id || `section-${idx}`}
              style={{
                marginTop: section.spacing?.marginTop,
                marginBottom: section.spacing?.marginBottom,
                paddingTop: section.spacing?.paddingTop,
                paddingBottom: section.spacing?.paddingBottom,
                backgroundColor: section.backgroundColor,
                border: section.border
                  ? `${section.border.width || "1px"} ${section.border.style || "solid"} ${
                      section.border.color || "#E5E7EB"
                    }`
                  : undefined,
                borderRadius: section.border?.radius,
              }}
            >
              {renderSection(section, resolveVariable, schema, interactive)}
            </div>
          );
        })
      )}
    </div>
  );
}

/**
 * Render individual section based on type
 */
function renderSection(
  section: TemplateSection | EmailSection,
  resolveVariable: (template: string) => string,
  schema: TemplateSchema,
  interactive: boolean
): React.ReactNode {
  const sectionType = section.type;

  // PDF template section types
  switch (sectionType) {
    case "header":
      return renderHeader(section as HeaderSection, resolveVariable);

    case "footer":
      return renderFooter(section as FooterSection, resolveVariable);

    case "hero-image":
      return renderHeroImage(section as HeroImageSection, resolveVariable);

    case "text-block":
      return renderTextBlock(section as TextBlockSection, resolveVariable, schema);

    case "qr-code":
      return renderQRCode(section as QRCodeSection, resolveVariable, schema);

    case "button":
      return renderButton(section as ButtonSection, resolveVariable, schema, interactive);

    case "data-table":
      return renderDataTable(section as DataTableSection, resolveVariable, schema);

    case "ticket-details":
      return renderTicketDetails(section as TicketDetailsSection, schema);

    case "event-details":
      return renderEventDetails(section as EventDetailsSection, schema);

    case "spacer":
      return renderSpacer(section as SpacerSection);

    case "divider":
      return renderDivider(section as DividerSection, resolveVariable);

    // Email template section types
    case "hero":
      return renderEmailHero(section as EmailHeroSection, resolveVariable);

    case "body":
      return renderEmailBody(section as BodySection, resolveVariable);

    case "cta":
      return renderEmailCta(section as CtaSection, resolveVariable, interactive);

    case "eventDetails":
      return renderEmailEventDetails(section as EmailEventDetailsSection, resolveVariable);

    case "orderDetails":
      return renderEmailOrderDetails(section as OrderDetailsSection, resolveVariable);

    case "accountDetails":
      return renderEmailAccountDetails(section as AccountDetailsSection, resolveVariable);

    case "attachmentInfo":
      return renderEmailAttachmentInfo(section as AttachmentInfoSection);

    case "shippingInfo":
      return renderEmailShippingInfo(section as ShippingInfoSection, resolveVariable);

    case "leadMagnetInfo":
      return renderEmailLeadMagnetInfo(section as LeadMagnetInfoSection, resolveVariable);

    case "supportInfo":
      return renderEmailSupportInfo(section as SupportInfoSection, resolveVariable);

    case "invoiceDetails":
      return renderEmailInvoiceDetails(section as InvoiceDetailsSection, resolveVariable);

    default:
      return (
        <div style={{ padding: "16px", color: "#6B7280", textAlign: "center" }}>
          Section type "{sectionType}" not yet implemented
        </div>
      );
  }
}

/**
 * Render Header Section
 */
function renderHeader(section: HeaderSection, resolveVariable: (template: string) => string) {
  const { content } = section;
  const logoUrl = content.logo ? resolveVariable(content.logo) : "";
  const text = content.text ? resolveVariable(content.text) : "";

  return (
    <div
      style={{
        height: content.height,
        display: "flex",
        alignItems: "center",
        justifyContent: content.alignment || "center",
        gap: "16px",
        padding: "0 24px",
        borderBottom: content.showBorder ? "1px solid #E5E7EB" : undefined,
      }}
    >
      {logoUrl && (
        <img
          src={logoUrl}
          alt="Logo"
          style={{ height: "48px", width: "auto", objectFit: "contain" }}
        />
      )}
      {text && (
        <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1F2937" }}>{text}</div>
      )}
    </div>
  );
}

/**
 * Render Footer Section
 */
function renderFooter(section: FooterSection, resolveVariable: (template: string) => string) {
  const { content } = section;
  const text = content.text ? resolveVariable(content.text) : "";

  return (
    <div
      style={{
        padding: "24px",
        textAlign: content.alignment || "center",
        fontSize: "14px",
        color: "#6B7280",
      }}
    >
      {text && <div style={{ marginBottom: "8px" }}>{text}</div>}
      {content.copyright && <div style={{ fontSize: "12px" }}>{resolveVariable(content.copyright)}</div>}
    </div>
  );
}

/**
 * Render Hero Image Section
 */
function renderHeroImage(section: HeroImageSection, resolveVariable: (template: string) => string) {
  const { content } = section;
  const imageUrl = resolveVariable(content.imageUrl);
  const altText = content.altText ? resolveVariable(content.altText) : "";

  if (!imageUrl) return null;

  return (
    <div style={{ position: "relative", height: content.height, overflow: "hidden" }}>
      <img
        src={imageUrl}
        alt={altText}
        style={{
          width: "100%",
          height: "100%",
          objectFit: content.fit || "cover",
        }}
      />
      {content.overlay && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: content.overlay.color || "rgba(0,0,0,0.3)",
            opacity: content.overlay.opacity || 0.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {content.overlay.text && (
            <div
              style={{
                color: content.overlay.textColor || "#FFFFFF",
                fontSize: "32px",
                fontWeight: "bold",
                textAlign: "center",
                padding: "24px",
              }}
            >
              {resolveVariable(content.overlay.text)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Render Text Block Section
 */
function renderTextBlock(
  section: TextBlockSection,
  resolveVariable: (template: string) => string,
  schema: TemplateSchema
) {
  const { content } = section;
  const title = content.title ? resolveVariable(content.title) : "";
  const subtitle = content.subtitle ? resolveVariable(content.subtitle) : "";
  const body = resolveVariable(content.body);

  return (
    <div
      style={{
        padding: "0 24px",
        textAlign: content.alignment || "left",
      }}
    >
      {title && (
        <h2
          style={{
            fontSize: content.fontSize?.title || "24px",
            fontWeight: content.fontWeight?.title === "bold" ? "bold" : "normal",
            color: content.color?.title || schema.styling.colors.text,
            margin: "0 0 8px 0",
            fontFamily: schema.styling.fonts.heading,
          }}
        >
          {title}
        </h2>
      )}
      {subtitle && (
        <h3
          style={{
            fontSize: content.fontSize?.subtitle || "18px",
            color: schema.styling.colors.textLight,
            margin: "0 0 16px 0",
          }}
        >
          {subtitle}
        </h3>
      )}
      {body && (
        <div
          style={{
            fontSize: content.fontSize?.body || "16px",
            fontWeight: content.fontWeight?.body === "bold" ? "bold" : "normal",
            color: content.color?.body || schema.styling.colors.text,
            lineHeight: "1.6",
            whiteSpace: "pre-wrap",
          }}
        >
          {body}
        </div>
      )}
    </div>
  );
}

/**
 * Render QR Code Section
 */
function renderQRCode(
  section: QRCodeSection,
  resolveVariable: (template: string) => string,
  schema: TemplateSchema
) {
  const { content } = section;
  const data = resolveVariable(content.data);
  const label = content.label ? resolveVariable(content.label) : "";

  // For preview, show placeholder since we can't generate real QR codes client-side easily
  return (
    <div
      style={{
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        alignItems: content.alignment || "center",
        gap: "16px",
      }}
    >
      <div
        style={{
          width: content.size || 200,
          height: content.size || 200,
          backgroundColor: content.backgroundColor || "#FFFFFF",
          border: "2px solid #E5E7EB",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "14px",
          color: "#6B7280",
          textAlign: "center",
          padding: "16px",
        }}
      >
        QR Code
        <br />
        {data ? `(${data.substring(0, 20)}...)` : "(No data)"}
      </div>
      {label && (
        <div style={{ fontSize: "14px", color: schema.styling.colors.textLight }}>{label}</div>
      )}
    </div>
  );
}

/**
 * Render Button Section
 */
function renderButton(
  section: ButtonSection,
  resolveVariable: (template: string) => string,
  schema: TemplateSchema,
  interactive: boolean
) {
  const { content } = section;
  const text = resolveVariable(content.text);
  const url = resolveVariable(content.url);

  const sizes = {
    small: { padding: "8px 16px", fontSize: "14px" },
    medium: { padding: "12px 24px", fontSize: "16px" },
    large: { padding: "16px 32px", fontSize: "18px" },
  };

  const size = sizes[content.size || "medium"];

  const styles = {
    primary: {
      backgroundColor: schema.styling.colors.primary,
      color: "#FFFFFF",
      border: "none",
    },
    secondary: {
      backgroundColor: schema.styling.colors.secondary,
      color: "#FFFFFF",
      border: "none",
    },
    outline: {
      backgroundColor: "transparent",
      color: schema.styling.colors.primary,
      border: `2px solid ${schema.styling.colors.primary}`,
    },
  };

  const style = styles[content.style || "primary"];

  return (
    <div
      style={{
        padding: "0 24px",
        textAlign: content.alignment || "center",
      }}
    >
      <a
        href={interactive ? url : undefined}
        onClick={(e) => !interactive && e.preventDefault()}
        style={{
          display: content.fullWidth ? "block" : "inline-block",
          ...size,
          ...style,
          borderRadius: schema.styling.borderRadius || "8px",
          textDecoration: "none",
          fontWeight: "bold",
          cursor: interactive ? "pointer" : "default",
          transition: "opacity 0.2s",
        }}
        onMouseEnter={(e) => interactive && (e.currentTarget.style.opacity = "0.8")}
        onMouseLeave={(e) => interactive && (e.currentTarget.style.opacity = "1")}
      >
        {text}
      </a>
    </div>
  );
}

/**
 * Render Data Table Section
 * (Simplified for now)
 */
function renderDataTable(
  section: DataTableSection,
  resolveVariable: (template: string) => string,
  schema: TemplateSchema
) {
  const { content } = section;

  return (
    <div style={{ padding: "0 24px" }}>
      {content.title && (
        <h3
          style={{
            fontSize: "18px",
            fontWeight: "bold",
            color: schema.styling.colors.text,
            marginBottom: "16px",
          }}
        >
          {resolveVariable(content.title)}
        </h3>
      )}
      <div
        style={{
          border: "1px solid #E5E7EB",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "16px", fontSize: "14px", color: "#6B7280", textAlign: "center" }}>
          Data table placeholder
          <br />
          (Source: {content.dataSource})
        </div>
      </div>
    </div>
  );
}

/**
 * Render Ticket Details Section
 * (Pre-configured section for ticket info)
 */
function renderTicketDetails(_section: TicketDetailsSection, _schema: TemplateSchema) {
  return (
    <div style={{ padding: "24px" }}>
      <div style={{ fontSize: "14px", color: "#6B7280", textAlign: "center" }}>
        Ticket details section placeholder
      </div>
    </div>
  );
}

/**
 * Render Event Details Section
 * (Pre-configured section for event info)
 */
function renderEventDetails(_section: EventDetailsSection, _schema: TemplateSchema) {
  return (
    <div style={{ padding: "24px" }}>
      <div style={{ fontSize: "14px", color: "#6B7280", textAlign: "center" }}>
        Event details section placeholder
      </div>
    </div>
  );
}

/**
 * Render Spacer Section
 */
function renderSpacer(section: SpacerSection) {
  return <div style={{ height: section.content.height }} />;
}

/**
 * Render Divider Section
 */
function renderDivider(section: DividerSection, _resolveVariable: (template: string) => string) {
  const { content } = section;

  return (
    <div style={{ padding: "0 24px" }}>
      <hr
        style={{
          width: content.width || "100%",
          height: content.thickness || "1px",
          border: "none",
          backgroundColor: content.color || "#E5E7EB",
          borderStyle: content.style || "solid",
          margin: 0,
        }}
      />
    </div>
  );
}

/**
 * ===========================
 * EMAIL TEMPLATE SECTION RENDERERS
 * ===========================
 */

/**
 * Render Email Hero Section
 */
function renderEmailHero(section: EmailHeroSection, resolveVariable: (template: string) => string) {
  const title = resolveVariable(section.title);
  const subtitle = section.subtitle ? resolveVariable(section.subtitle) : "";
  const image = section.image ? resolveVariable(section.image) : "";

  return (
    <div style={{ padding: "32px 24px", textAlign: "center", backgroundColor: "#F9FAFB" }}>
      {image && (
        <img
          src={image}
          alt={title}
          style={{
            width: "100%",
            maxWidth: "600px",
            height: "auto",
            marginBottom: "24px",
            borderRadius: "8px",
          }}
        />
      )}
      <h1
        style={{
          fontSize: "28px",
          fontWeight: "bold",
          color: "#1F2937",
          margin: "0 0 8px 0",
          lineHeight: "1.2",
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          style={{
            fontSize: "18px",
            color: "#6B7280",
            margin: 0,
            lineHeight: "1.5",
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

/**
 * Render Email Body Section
 */
function renderEmailBody(section: BodySection, resolveVariable: (template: string) => string) {
  return (
    <div style={{ padding: "24px" }}>
      {section.paragraphs && (
        <div>
          {section.paragraphs.map((para, idx) => {
            const text = resolveVariable(para);
            // Empty paragraphs create spacing
            if (!text.trim()) {
              return <div key={idx} style={{ height: "12px" }} />;
            }
            return (
              <p
                key={idx}
                style={{
                  fontSize: "16px",
                  color: "#374151",
                  lineHeight: "1.6",
                  margin: "0 0 12px 0",
                }}
              >
                {text}
              </p>
            );
          })}
        </div>
      )}
      {section.sections && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {section.sections.map((subsection, idx) => (
            <div
              key={idx}
              style={{
                padding: "16px",
                backgroundColor: "#F9FAFB",
                borderRadius: "8px",
                border: "1px solid #E5E7EB",
              }}
            >
              {subsection.title && (
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: "bold",
                    color: "#1F2937",
                    margin: "0 0 8px 0",
                  }}
                >
                  {subsection.icon && <span style={{ marginRight: "8px" }}>{subsection.icon}</span>}
                  {resolveVariable(subsection.title)}
                </h3>
              )}
              <p style={{ fontSize: "14px", color: "#4B5563", margin: 0, lineHeight: "1.5" }}>
                {resolveVariable(subsection.content)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Render Email CTA Section
 */
function renderEmailCta(
  section: CtaSection,
  resolveVariable: (template: string) => string,
  interactive: boolean
) {
  const text = resolveVariable(section.text);
  const url = resolveVariable(section.url);
  const style = section.style || "primary";

  const styles = {
    primary: {
      backgroundColor: "#6B46C1",
      color: "#FFFFFF",
      border: "none",
    },
    secondary: {
      backgroundColor: "#9F7AEA",
      color: "#FFFFFF",
      border: "none",
    },
    outline: {
      backgroundColor: "transparent",
      color: "#6B46C1",
      border: "2px solid #6B46C1",
    },
  };

  return (
    <div style={{ padding: "24px", textAlign: "center" }}>
      <a
        href={interactive ? url : undefined}
        onClick={(e) => !interactive && e.preventDefault()}
        style={{
          display: "inline-block",
          padding: "14px 32px",
          fontSize: "16px",
          fontWeight: "bold",
          borderRadius: "8px",
          textDecoration: "none",
          cursor: interactive ? "pointer" : "default",
          transition: "opacity 0.2s",
          ...styles[style],
        }}
        onMouseEnter={(e) => interactive && (e.currentTarget.style.opacity = "0.8")}
        onMouseLeave={(e) => interactive && (e.currentTarget.style.opacity = "1")}
      >
        {text}
      </a>
    </div>
  );
}

/**
 * Render Email Event Details Section
 */
function renderEmailEventDetails(
  section: EmailEventDetailsSection,
  resolveVariable: (template: string) => string
) {
  return (
    <div
      style={{
        padding: "24px",
        backgroundColor: "#F9FAFB",
        borderRadius: "8px",
        margin: "24px",
        border: "1px solid #E5E7EB",
      }}
    >
      <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#1F2937", margin: "0 0 16px 0" }}>
        Event Details
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: "600", color: "#4B5563" }}>Event:</span>
          <span style={{ color: "#1F2937" }}>{resolveVariable(section.eventName)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: "600", color: "#4B5563" }}>Date:</span>
          <span style={{ color: "#1F2937" }}>{resolveVariable(section.date)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: "600", color: "#4B5563" }}>Time:</span>
          <span style={{ color: "#1F2937" }}>{resolveVariable(section.time)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: "600", color: "#4B5563" }}>Location:</span>
          <span style={{ color: "#1F2937" }}>{resolveVariable(section.location)}</span>
        </div>
        {section.guestCount && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: "600", color: "#4B5563" }}>Guests:</span>
            <span style={{ color: "#1F2937" }}>{section.guestCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Render Email Order Details Section
 */
function renderEmailOrderDetails(
  section: OrderDetailsSection,
  resolveVariable: (template: string) => string
) {
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div style={{ padding: "24px" }}>
      <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#1F2937", margin: "0 0 16px 0" }}>
        Order Details
      </h3>
      <div style={{ marginBottom: "8px", fontSize: "14px", color: "#6B7280" }}>
        <strong>Order #:</strong> {resolveVariable(section.orderNumber)}
        <br />
        <strong>Date:</strong> {resolveVariable(section.orderDate)}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
        <thead>
          <tr style={{ backgroundColor: "#F9FAFB", borderBottom: "2px solid #E5E7EB" }}>
            <th style={{ padding: "8px", textAlign: "left", fontSize: "14px", fontWeight: "600" }}>Item</th>
            <th style={{ padding: "8px", textAlign: "center", fontSize: "14px", fontWeight: "600" }}>Qty</th>
            <th style={{ padding: "8px", textAlign: "right", fontSize: "14px", fontWeight: "600" }}>Price</th>
          </tr>
        </thead>
        <tbody>
          {section.items.map((item, idx) => (
            <tr key={idx} style={{ borderBottom: "1px solid #E5E7EB" }}>
              <td style={{ padding: "8px", fontSize: "14px" }}>{resolveVariable(item.name)}</td>
              <td style={{ padding: "8px", textAlign: "center", fontSize: "14px" }}>{item.quantity}</td>
              <td style={{ padding: "8px", textAlign: "right", fontSize: "14px" }}>{formatPrice(item.price)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2} style={{ padding: "8px", textAlign: "right", fontWeight: "600" }}>Subtotal:</td>
            <td style={{ padding: "8px", textAlign: "right" }}>{formatPrice(section.subtotal)}</td>
          </tr>
          {section.tax !== undefined && (
            <tr>
              <td colSpan={2} style={{ padding: "8px", textAlign: "right", fontWeight: "600" }}>Tax:</td>
              <td style={{ padding: "8px", textAlign: "right" }}>{formatPrice(section.tax)}</td>
            </tr>
          )}
          {section.shipping !== undefined && (
            <tr>
              <td colSpan={2} style={{ padding: "8px", textAlign: "right", fontWeight: "600" }}>Shipping:</td>
              <td style={{ padding: "8px", textAlign: "right" }}>{formatPrice(section.shipping)}</td>
            </tr>
          )}
          <tr style={{ borderTop: "2px solid #E5E7EB", fontWeight: "bold" }}>
            <td colSpan={2} style={{ padding: "8px", textAlign: "right", fontSize: "16px" }}>Total:</td>
            <td style={{ padding: "8px", textAlign: "right", fontSize: "16px" }}>{formatPrice(section.total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/**
 * Render Email Account Details Section
 */
function renderEmailAccountDetails(
  section: AccountDetailsSection,
  resolveVariable: (template: string) => string
) {
  return (
    <div
      style={{
        padding: "24px",
        backgroundColor: "#F9FAFB",
        borderRadius: "8px",
        margin: "24px",
        border: "1px solid #E5E7EB",
      }}
    >
      <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#1F2937", margin: "0 0 16px 0" }}>
        Account Information
      </h3>
      {section.username && (
        <p style={{ margin: "8px 0" }}>
          <strong>Username:</strong> {resolveVariable(section.username)}
        </p>
      )}
      {section.email && (
        <p style={{ margin: "8px 0" }}>
          <strong>Email:</strong> {resolveVariable(section.email)}
        </p>
      )}
      {section.verificationLink && (
        <div style={{ marginTop: "16px" }}>
          <a
            href={resolveVariable(section.verificationLink)}
            style={{
              display: "inline-block",
              padding: "10px 20px",
              backgroundColor: "#6B46C1",
              color: "#FFFFFF",
              textDecoration: "none",
              borderRadius: "6px",
              fontWeight: "600",
            }}
          >
            Verify Account
          </a>
        </div>
      )}
      {section.resetLink && (
        <div style={{ marginTop: "16px" }}>
          <a
            href={resolveVariable(section.resetLink)}
            style={{
              display: "inline-block",
              padding: "10px 20px",
              backgroundColor: "#6B46C1",
              color: "#FFFFFF",
              textDecoration: "none",
              borderRadius: "6px",
              fontWeight: "600",
            }}
          >
            Reset Password
          </a>
        </div>
      )}
      {section.expiresIn && (
        <p style={{ margin: "16px 0 0 0", fontSize: "12px", color: "#6B7280" }}>
          Link expires in {resolveVariable(section.expiresIn)}
        </p>
      )}
    </div>
  );
}

/**
 * Render Email Attachment Info Section
 */
function renderEmailAttachmentInfo(section: AttachmentInfoSection) {
  return (
    <div style={{ padding: "24px" }}>
      <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#1F2937", margin: "0 0 16px 0" }}>
        Attachments
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {section.attachments.map((attachment, idx) => (
          <div
            key={idx}
            style={{
              padding: "12px",
              backgroundColor: "#F9FAFB",
              borderRadius: "6px",
              border: "1px solid #E5E7EB",
            }}
          >
            <div style={{ fontWeight: "600", color: "#1F2937", marginBottom: "4px" }}>
              {attachment.icon && <span style={{ marginRight: "8px" }}>{attachment.icon}</span>}
              {attachment.name}
            </div>
            <div style={{ fontSize: "14px", color: "#6B7280" }}>{attachment.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Render Email Shipping Info Section
 */
function renderEmailShippingInfo(
  section: ShippingInfoSection,
  resolveVariable: (template: string) => string
) {
  const statusColors = {
    processing: "#F59E0B",
    shipped: "#3B82F6",
    delivered: "#10B981",
    delayed: "#EF4444",
  };

  return (
    <div style={{ padding: "24px" }}>
      <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#1F2937", margin: "0 0 16px 0" }}>
        Shipping Information
      </h3>
      <div
        style={{
          padding: "12px",
          backgroundColor: "#F9FAFB",
          borderRadius: "6px",
          border: "1px solid #E5E7EB",
          marginBottom: "16px",
        }}
      >
        <div style={{ marginBottom: "8px" }}>
          <strong>Status:</strong>{" "}
          <span style={{ color: statusColors[section.status], fontWeight: "600" }}>
            {section.status.toUpperCase()}
          </span>
        </div>
        {section.trackingNumber && (
          <div style={{ marginBottom: "8px" }}>
            <strong>Tracking #:</strong> {resolveVariable(section.trackingNumber)}
          </div>
        )}
        {section.carrier && (
          <div style={{ marginBottom: "8px" }}>
            <strong>Carrier:</strong> {resolveVariable(section.carrier)}
          </div>
        )}
        {section.estimatedDelivery && (
          <div>
            <strong>Estimated Delivery:</strong> {resolveVariable(section.estimatedDelivery)}
          </div>
        )}
      </div>
      <div>
        <strong>Shipping Address:</strong>
        <div style={{ marginTop: "8px", fontSize: "14px", color: "#4B5563" }}>
          {resolveVariable(section.shippingAddress.name)}
          <br />
          {resolveVariable(section.shippingAddress.street)}
          <br />
          {resolveVariable(section.shippingAddress.city)}, {resolveVariable(section.shippingAddress.state)}{" "}
          {resolveVariable(section.shippingAddress.zipCode)}
          {section.shippingAddress.country && (
            <>
              <br />
              {resolveVariable(section.shippingAddress.country)}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Render Email Lead Magnet Info Section
 */
function renderEmailLeadMagnetInfo(
  section: LeadMagnetInfoSection,
  resolveVariable: (template: string) => string
) {
  return (
    <div
      style={{
        padding: "24px",
        backgroundColor: "#F9FAFB",
        borderRadius: "8px",
        margin: "24px",
        border: "1px solid #E5E7EB",
      }}
    >
      <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#1F2937", margin: "0 0 16px 0" }}>
        {resolveVariable(section.title)}
      </h3>
      <p style={{ fontSize: "14px", color: "#4B5563", marginBottom: "12px" }}>
        {resolveVariable(section.description)}
      </p>
      <div style={{ fontSize: "14px", color: "#6B7280", marginBottom: "16px" }}>
        <strong>Format:</strong> {resolveVariable(section.fileType)}
        {section.pages && (
          <>
            <br />
            <strong>Pages:</strong> {section.pages}
          </>
        )}
      </div>
      {section.downloadUrl && (
        <a
          href={resolveVariable(section.downloadUrl)}
          style={{
            display: "inline-block",
            padding: "12px 24px",
            backgroundColor: "#6B46C1",
            color: "#FFFFFF",
            textDecoration: "none",
            borderRadius: "6px",
            fontWeight: "600",
          }}
        >
          Download Now
        </a>
      )}
    </div>
  );
}

/**
 * Render Email Support Info Section
 */
function renderEmailSupportInfo(
  section: SupportInfoSection,
  resolveVariable: (template: string) => string
) {
  const statusColors = {
    open: "#3B82F6",
    in_progress: "#F59E0B",
    resolved: "#10B981",
    closed: "#6B7280",
  };

  return (
    <div style={{ padding: "24px" }}>
      <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#1F2937", margin: "0 0 16px 0" }}>
        Support Ticket
      </h3>
      <div
        style={{
          padding: "16px",
          backgroundColor: "#F9FAFB",
          borderRadius: "6px",
          border: "1px solid #E5E7EB",
          marginBottom: "16px",
        }}
      >
        <div style={{ marginBottom: "8px" }}>
          <strong>Ticket #:</strong> {resolveVariable(section.ticketNumber)}
        </div>
        <div style={{ marginBottom: "8px" }}>
          <strong>Status:</strong>{" "}
          <span style={{ color: statusColors[section.status], fontWeight: "600" }}>
            {section.status.replace("_", " ").toUpperCase()}
          </span>
        </div>
        {section.assignedTo && (
          <div>
            <strong>Assigned to:</strong> {resolveVariable(section.assignedTo)}
          </div>
        )}
      </div>
      <div style={{ marginBottom: "16px" }}>
        <strong>Message:</strong>
        <p style={{ marginTop: "8px", fontSize: "14px", color: "#4B5563" }}>
          {resolveVariable(section.message)}
        </p>
      </div>
      {section.nextSteps && (
        <div>
          <strong>Next Steps:</strong>
          <p style={{ marginTop: "8px", fontSize: "14px", color: "#4B5563" }}>
            {resolveVariable(section.nextSteps)}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Render Email Invoice Details Section
 */
function renderEmailInvoiceDetails(
  section: InvoiceDetailsSection,
  resolveVariable: (template: string) => string
) {
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const statusColors = {
    draft: "#6B7280",
    sent: "#3B82F6",
    paid: "#10B981",
    overdue: "#EF4444",
    cancelled: "#9CA3AF",
  };

  return (
    <div style={{ padding: "24px" }}>
      <h3 style={{ fontSize: "20px", fontWeight: "bold", color: "#1F2937", margin: "0 0 16px 0" }}>
        Invoice {resolveVariable(section.invoiceNumber)}
      </h3>
      <div
        style={{
          padding: "16px",
          backgroundColor: "#F9FAFB",
          borderRadius: "6px",
          border: "1px solid #E5E7EB",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span>
            <strong>Date:</strong> {resolveVariable(section.invoiceDate)}
          </span>
          <span>
            <strong>Due:</strong> {resolveVariable(section.dueDate)}
          </span>
        </div>
        <div>
          <strong>Status:</strong>{" "}
          <span style={{ color: statusColors[section.status], fontWeight: "600" }}>
            {section.status.toUpperCase()}
          </span>
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
        <thead>
          <tr style={{ backgroundColor: "#F9FAFB", borderBottom: "2px solid #E5E7EB" }}>
            <th style={{ padding: "8px", textAlign: "left", fontSize: "14px", fontWeight: "600" }}>
              Description
            </th>
            <th style={{ padding: "8px", textAlign: "center", fontSize: "14px", fontWeight: "600" }}>
              Qty
            </th>
            <th style={{ padding: "8px", textAlign: "right", fontSize: "14px", fontWeight: "600" }}>
              Price
            </th>
            <th style={{ padding: "8px", textAlign: "right", fontSize: "14px", fontWeight: "600" }}>
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {section.lineItems.map((item, idx) => (
            <tr key={idx} style={{ borderBottom: "1px solid #E5E7EB" }}>
              <td style={{ padding: "8px", fontSize: "14px" }}>{resolveVariable(item.description)}</td>
              <td style={{ padding: "8px", textAlign: "center", fontSize: "14px" }}>{item.quantity}</td>
              <td style={{ padding: "8px", textAlign: "right", fontSize: "14px" }}>
                {formatPrice(item.unitPrice)}
              </td>
              <td style={{ padding: "8px", textAlign: "right", fontSize: "14px" }}>
                {formatPrice(item.total)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} style={{ padding: "8px", textAlign: "right", fontWeight: "600" }}>
              Subtotal:
            </td>
            <td style={{ padding: "8px", textAlign: "right" }}>{formatPrice(section.subtotal)}</td>
          </tr>
          <tr>
            <td colSpan={3} style={{ padding: "8px", textAlign: "right", fontWeight: "600" }}>
              Tax:
            </td>
            <td style={{ padding: "8px", textAlign: "right" }}>{formatPrice(section.taxTotal)}</td>
          </tr>
          <tr style={{ borderTop: "2px solid #E5E7EB", fontWeight: "bold" }}>
            <td colSpan={3} style={{ padding: "8px", textAlign: "right", fontSize: "16px" }}>
              Total:
            </td>
            <td style={{ padding: "8px", textAlign: "right", fontSize: "16px" }}>
              {formatPrice(section.total)}
            </td>
          </tr>
          {section.amountPaid !== undefined && (
            <tr>
              <td colSpan={3} style={{ padding: "8px", textAlign: "right", fontWeight: "600" }}>
                Amount Paid:
              </td>
              <td style={{ padding: "8px", textAlign: "right" }}>{formatPrice(section.amountPaid)}</td>
            </tr>
          )}
          <tr style={{ borderTop: "1px solid #E5E7EB", fontWeight: "bold" }}>
            <td colSpan={3} style={{ padding: "8px", textAlign: "right", fontSize: "16px", color: "#EF4444" }}>
              Amount Due:
            </td>
            <td style={{ padding: "8px", textAlign: "right", fontSize: "16px", color: "#EF4444" }}>
              {formatPrice(section.amountDue)}
            </td>
          </tr>
        </tfoot>
      </table>
      {section.notes && (
        <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "#F9FAFB", borderRadius: "6px" }}>
          <strong>Notes:</strong>
          <p style={{ marginTop: "8px", fontSize: "14px", color: "#4B5563" }}>
            {resolveVariable(section.notes)}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Loading State Component
 */
export function TemplateRendererLoading() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px",
        color: "#6B7280",
      }}
    >
      <Loader2 className="animate-spin mr-2" size={20} />
      Loading template...
    </div>
  );
}
