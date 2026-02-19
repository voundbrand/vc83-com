/**
 * TEMPLATE THUMBNAIL RENDERER
 *
 * Renders live preview thumbnails for all template types.
 * Scales down actual templates for use in list views.
 * Leverages existing template infrastructure.
 */

"use client";

import { useState, useEffect, Suspense } from "react";
import { FileText, Mail, Globe, ShoppingCart, FileStack, Loader2 } from "lucide-react";
import { getCheckoutComponent } from "@/templates/checkout/registry";
import { getEmailTemplate } from "@/templates/emails/registry";
import type { CheckoutProduct } from "@/templates/checkout/types";
import type { Theme } from "@/templates/types";
import type { Id } from "../../convex/_generated/dataModel";

interface TemplateThumbnailProps {
  templateType: "email" | "pdf" | "web" | "checkout" | "form";
  templateCode: string;
  organizationId?: Id<"organizations">;
  scale?: number; // Default: 0.15 (15% size for thumbnails)
  width?: number; // Container width in px (default: 200)
  height?: number; // Container height in px (default: 150)
  theme?: Theme;
}

/**
 * Default theme for previews
 */
const defaultTheme: Theme = {
  code: "retro-purple",
  name: "Retro Purple",
  colors: {
    primary: "#6B46C1",
    secondary: "#9F7AEA",
    accent: "#F59E0B",
    background: "#FFFFFF",
    surface: "#F9FAFB",
    text: "#2A2A2A",
    textLight: "#6B7280",
    textDark: "#111827",
    border: "#D1D5DB",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#3B82F6",
  },
  typography: {
    fontFamily: {
      heading: "Press Start 2P, monospace",
      body: "system-ui, -apple-system, sans-serif",
      mono: "monospace",
    },
    fontSize: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      h1: "2.5rem",
      h2: "2rem",
      h3: "1.75rem",
      h4: "1.5rem",
      h5: "1.25rem",
      h6: "1rem",
      body: "1rem",
      small: "0.875rem",
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
    "3xl": "4rem",
    "4xl": "6rem",
  },
  borderRadius: {
    none: "0",
    sm: "0.125rem",
    md: "0.375rem",
    lg: "0.5rem",
    xl: "0.75rem",
    full: "9999px",
  },
  shadows: {
    none: "none",
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
    "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  },
  layout: {
    maxWidth: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    breakpoints: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
  },
};

/**
 * Mock data for template previews
 */
const mockCheckoutProduct: CheckoutProduct = {
  _id: "mock-product",
  name: "Sample Event Ticket",
  description: "Experience an unforgettable evening",
  price: 9900, // in cents
  currency: "USD",
  subtype: "ticket",
};

const mockEmailData: import("@/templates/emails/types").EmailTemplateProps = {
  ticket: {
    _id: "mock-ticket" as Id<"objects">,
    name: "Sample Ticket",
    ticketNumber: "TK-2024-001",
    status: "confirmed",
    customProperties: {
      attendeeFirstName: "John",
      attendeeLastName: "Doe",
      attendeeEmail: "john@example.com",
      pricePaid: 9900,
      purchaseDate: Date.now(),
      guestCount: 1,
    },
  },
  event: {
    _id: "mock-event" as Id<"objects">,
    name: "Sample Conference 2024",
    customProperties: {
      startDate: "2024-12-15",
      startTime: "18:00",
      location: "Grand Convention Center, 123 Main St",
      description: "An amazing event experience",
      durationHours: 3,
    },
  },
  attendee: {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    guestCount: 1,
  },
  domain: {
    domainName: "example.com",
    siteUrl: "https://example.com",
    mapsUrl: "https://maps.google.com",
  },
  branding: {
    primaryColor: "#6B46C1",
    secondaryColor: "#9F7AEA",
    accentColor: "#9F7AEA",
    logoUrl: "/logo.png",
  },
  language: "en" as const,
};

/**
 * Template Thumbnail Renderer
 */
export function TemplateThumbnail({
  templateType,
  templateCode,
  organizationId,
  scale = 0.15,
  width = 200,
  height = 150,
  theme = defaultTheme,
}: TemplateThumbnailProps) {
  const [previewContent, setPreviewContent] = useState<React.ReactNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateType, templateCode]);

  const loadPreview = async () => {
    setIsLoading(true);
    setError(null);

    try {
      switch (templateType) {
        case "checkout":
          renderCheckoutThumbnail();
          break;
        case "web":
          renderWebThumbnail();
          break;
        case "email":
          renderEmailThumbnail();
          break;
        case "pdf":
          renderPdfThumbnail();
          break;
        case "form":
          renderFormThumbnail();
          break;
        default:
          setError("Unknown template type");
      }
    } catch (err) {
      console.error("Error loading template preview:", err);
      setError("Failed to load preview");
      setIsLoading(false);
    }
  };

  const renderCheckoutThumbnail = () => {
    try {
      const CheckoutComponent = getCheckoutComponent(templateCode);

      if (!CheckoutComponent || !organizationId) {
        setPreviewContent(<PlaceholderIcon type="checkout" />);
        setIsLoading(false);
        return;
      }

      setPreviewContent(
        <CheckoutComponent
          organizationId={organizationId}
          configuration={{}}
          linkedProducts={[mockCheckoutProduct]}
          theme={theme}
          onCheckout={async () => {}}
        />
      );
      setIsLoading(false);
    } catch (err) {
      console.error("Checkout render error:", err);
      setPreviewContent(<PlaceholderIcon type="checkout" />);
      setIsLoading(false);
    }
  };

  const renderWebThumbnail = () => {
    try {
      // For web templates, show placeholder for now
      // Web templates require full TemplateProps with page/data/organization
      // which is complex to mock. Better to show placeholder in thumbnails.
      setPreviewContent(<PlaceholderIcon type="web" />);
      setIsLoading(false);
    } catch (err) {
      console.error("Web render error:", err);
      setPreviewContent(<PlaceholderIcon type="web" />);
      setIsLoading(false);
    }
  };

  const renderEmailThumbnail = () => {
    try {
      const emailTemplate = getEmailTemplate(templateCode);

      if (!emailTemplate) {
        setPreviewContent(<PlaceholderIcon type="email" />);
        setIsLoading(false);
        return;
      }

      const result = emailTemplate(mockEmailData);

      // Use iframe for proper HTML document rendering
      setPreviewContent(
        <iframe
          srcDoc={result.html}
          title="Email preview"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            backgroundColor: "white",
          }}
          sandbox="allow-same-origin"
        />
      );
      setIsLoading(false);
    } catch (err) {
      console.error("Email render error:", err);
      setPreviewContent(<PlaceholderIcon type="email" />);
      setIsLoading(false);
    }
  };

  const renderPdfThumbnail = async () => {
    try {
      // Dynamically import PDF template registry
      const { getTemplateByCode } = await import("../../convex/pdfTemplateRegistry");
      const { renderTemplate, createMockInvoiceData } = await import("@/lib/template-renderer");

      const template = getTemplateByCode(templateCode);

      if (!template) {
        setPreviewContent(<PlaceholderIcon type="pdf" />);
        setIsLoading(false);
        return;
      }

      // Get mock data for this template type
      const mockData = createMockInvoiceData(templateCode);

      // Render HTML and CSS with mock data
      const renderedHtml = renderTemplate(template.template.html, mockData);
      const renderedCss = renderTemplate(template.template.css, mockData);

      // Combine into full HTML document
      const fullHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>${renderedCss}</style>
          </head>
          <body>${renderedHtml}</body>
        </html>
      `;

      // Render in iframe (like email templates)
      setPreviewContent(
        <iframe
          srcDoc={fullHtml}
          title="PDF Invoice preview"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            backgroundColor: "white",
          }}
          sandbox="allow-same-origin"
        />
      );
      setIsLoading(false);
    } catch (err) {
      console.error("PDF render error:", err);
      setPreviewContent(<PlaceholderIcon type="pdf" />);
      setIsLoading(false);
    }
  };

  const renderFormThumbnail = () => {
    // For forms, show a placeholder for now
    // TODO: Could render form preview
    setPreviewContent(<PlaceholderIcon type="form" />);
    setIsLoading(false);
  };

  // Container style for thumbnail scaling
  const containerStyle: React.CSSProperties = {
    width: `${width}px`,
    height: `${height}px`,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#f9fafb",
    border: "2px solid var(--shell-border)",
    borderRadius: "4px",
  };

  // Scale wrapper style
  const scaleWrapperStyle: React.CSSProperties = {
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    width: `${width / scale}px`,
    height: `${height / scale}px`,
    position: "absolute",
    top: 0,
    left: 0,
  };

  if (isLoading) {
    return (
      <div style={containerStyle} className="flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle} className="flex flex-col items-center justify-center p-2">
        <PlaceholderIcon type={templateType} />
        <p className="text-[8px] text-gray-400 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={scaleWrapperStyle}>
        <Suspense fallback={<Loader2 size={24} className="animate-spin" />}>
          {previewContent}
        </Suspense>
      </div>
    </div>
  );
}

/**
 * Placeholder icon for templates that can't be rendered
 */
function PlaceholderIcon({ type }: { type: string }) {
  const getIcon = () => {
    switch (type) {
      case "email":
        return <Mail size={32} />;
      case "pdf":
        return <FileText size={32} />;
      case "web":
        return <Globe size={32} />;
      case "checkout":
        return <ShoppingCart size={32} />;
      case "form":
        return <FileStack size={32} />;
      default:
        return <FileText size={32} />;
    }
  };

  return (
    <div className="flex items-center justify-center h-full text-gray-300">
      {getIcon()}
    </div>
  );
}
