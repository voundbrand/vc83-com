/**
 * Window Registry
 *
 * Maps window IDs to their component factories, enabling window restoration
 * from sessionStorage after page refresh.
 */

import { lazy, type ReactNode } from "react";
import { getVoiceAssistantWindowContract } from "@/components/window-content/ai-chat-window/voice-assistant-contract";

export interface WindowConfig {
  id: string;
  title: string;
  titleKey?: string;
  icon?: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  props?: Record<string, unknown>;
}

export interface WindowFactory {
  createComponent: (props?: Record<string, unknown>) => ReactNode;
  defaultConfig: Omit<WindowConfig, 'id' | 'props'>;
}

/**
 * Canonical desktop-shell deep-link grammar (Lane I freeze).
 * Legacy aliases remain read-compatible in the shell parser.
 */
export const SHELL_URL_STATE_KEYS = Object.freeze({
  app: "app",
  panel: "panel",
  entity: "entity",
  context: "context",
});

export const LEGACY_SHELL_URL_STATE_KEYS = Object.freeze({
  openWindow: "openWindow",
  window: "window",
  tab: "tab",
});

// Lazy load window components
const AIAssistantWindow = lazy(() =>
  import("@/components/window-content/ai-chat-window").then(m => ({ default: m.AIChatWindow }))
);

const BrainWindow = lazy(() =>
  import("@/components/window-content/brain-window").then(m => ({ default: m.BrainWindow }))
);

const ManageWindow = lazy(() =>
  import("@/components/window-content/org-owner-manage-window").then(m => ({ default: m.ManageWindow }))
);

const ControlPanelWindow = lazy(() =>
  import("@/components/window-content/control-panel-window").then(m => ({ default: m.ControlPanelWindow }))
);

const OrganizationsWindow = lazy(() =>
  import("@/components/window-content/super-admin-organizations-window").then(m => ({ default: m.OrganizationsWindow }))
);

const SettingsWindow = lazy(() =>
  import("@/components/window-content/settings-window").then(m => ({ default: m.SettingsWindow }))
);

const CRMWindow = lazy(() =>
  import("@/components/window-content/crm-window").then(m => ({ default: m.CRMWindow }))
);

const StoreWindow = lazy(() =>
  import("@/components/window-content/store-window").then(m => ({ default: m.StoreWindow }))
);

const ComplianceWindow = lazy(() =>
  import("@/components/window-content/compliance-window").then(m => ({ default: m.ComplianceWindow }))
);

const TranslationsWindow = lazy(() =>
  import("@/components/window-content/translations-window").then(m => ({ default: m.TranslationsWindow }))
);

const AboutWindow = lazy(() =>
  import("@/components/window-content/about-window").then(m => ({ default: m.AboutWindow }))
);

const WelcomeWindow = lazy(() =>
  import("@/components/window-content/welcome-window").then(m => ({ default: m.WelcomeWindow }))
);

const AllAppsWindow = lazy(() =>
  import("@/components/window-content/all-apps-window").then(m => ({ default: m.AllAppsWindow }))
);

const PlatformCartWindow = lazy(() =>
  import("@/components/window-content/platform-cart-window").then(m => ({ default: m.PlatformCartWindow }))
);

const MediaLibraryWindow = lazy(() =>
  import("@/components/window-content/media-library-window").then(m => ({ default: m.MediaLibraryWindow }))
);

const PaymentsWindow = lazy(() =>
  import("@/components/window-content/payments-window").then(m => ({ default: m.PaymentsWindow }))
);

const ProductsWindow = lazy(() =>
  import("@/components/window-content/products-window").then(m => ({ default: m.ProductsWindow }))
);

const TicketsWindow = lazy(() =>
  import("@/components/window-content/tickets-window").then(m => ({ default: m.TicketsWindow }))
);

const CertificatesWindow = lazy(() =>
  import("@/components/window-content/certificates-window").then(m => ({ default: m.CertificatesWindow }))
);

const EventsWindow = lazy(() =>
  import("@/components/window-content/events-window").then(m => ({ default: m.EventsWindow }))
);

const CheckoutWindow = lazy(() =>
  import("@/components/window-content/checkout-window").then(m => ({ default: m.CheckoutWindow }))
);

const FormsWindow = lazy(() =>
  import("@/components/window-content/forms-window").then(m => ({ default: m.FormsWindow }))
);

const WebPublishingWindow = lazy(() =>
  import("@/components/window-content/web-publishing-window").then(m => ({ default: m.WebPublishingWindow }))
);

const InvoicingWindow = lazy(() =>
  import("@/components/window-content/invoicing-window").then(m => ({ default: m.InvoicingWindow }))
);

const WorkflowsWindow = lazy(() =>
  import("@/components/window-content/workflows-window").then(m => ({ default: m.WorkflowsWindow }))
);

const TemplatesWindow = lazy(() =>
  import("@/components/window-content/templates-window").then(m => ({ default: m.TemplatesWindow }))
);

const IntegrationsWindow = lazy(() =>
  import("@/components/window-content/integrations-window").then(m => ({ default: m.IntegrationsWindow }))
);

const OAuthTutorialWindow = lazy(() =>
  import("@/components/window-content/oauth-tutorial-window").then(m => ({ default: m.OAuthTutorialWindow }))
);

const TutorialsDocsWindow = lazy(() =>
  import("@/components/window-content/tutorials-docs-window").then(m => ({ default: m.TutorialsDocsWindow }))
);

const TutorialWindow = lazy(() =>
  import("@/components/window-content/tutorial-window").then(m => ({ default: m.TutorialWindow }))
);

const LoginWindow = lazy(() =>
  import("@/components/window-content/login-window").then(m => ({ default: m.LoginWindow }))
);

const ProjectsWindow = lazy(() =>
  import("@/components/window-content/projects-window").then(m => ({ default: m.ProjectsWindow }))
);

const CheckoutSuccessWindow = lazy(() =>
  import("@/components/window-content/checkout-success-window").then(m => ({ default: m.CheckoutSuccessWindow }))
);

const CheckoutFailedWindow = lazy(() =>
  import("@/components/window-content/checkout-failed-window").then(m => ({ default: m.CheckoutFailedWindow }))
);

const PurchaseResultWindow = lazy(() =>
  import("@/components/window-content/purchase-result-window").then(m => ({ default: m.PurchaseResultWindow }))
);

const QuickStartICPSelector = lazy(() =>
  import("@/components/quick-start").then(m => ({ default: m.QuickStartICPSelector }))
);

const BenefitsWindow = lazy(() =>
  import("@/components/window-content/benefits-window").then(m => ({ default: m.BenefitsWindow }))
);

const BookingWindow = lazy(() =>
  import("@/components/window-content/booking-window").then(m => ({ default: m.BookingWindow }))
);

const AiSystemWindow = lazy(() =>
  import("@/components/window-content/ai-system-window").then(m => ({ default: m.AiSystemWindow }))
);

const BuilderBrowserWindow = lazy(() =>
  import("@/components/window-content/builder-browser-window").then(m => ({ default: m.BuilderBrowserWindow }))
);

const AgentsWindow = lazy(() =>
  import("@/components/window-content/agents-window").then(m => ({ default: m.AgentsWindow }))
);

const LayersBrowserWindow = lazy(() =>
  import("@/components/window-content/layers-browser-window").then(m => ({ default: m.LayersBrowserWindow }))
);

const FinderWindow = lazy(() =>
  import("@/components/window-content/finder-window").then(m => ({ default: m.FinderWindow }))
);

const TextEditorWindow = lazy(() =>
  import("@/components/window-content/text-editor-window").then(m => ({ default: m.TextEditorWindow }))
);

const TerminalWindow = lazy(() =>
  import("@/components/window-content/terminal-window").then(m => ({ default: m.TerminalWindow }))
);

const FeedbackWindow = lazy(() =>
  import("@/components/window-content/feedback-window").then(m => ({ default: m.FeedbackWindow }))
);

const aiAssistantWindowContract = getVoiceAssistantWindowContract("ai-assistant");
const brainVoiceWindowContract = getVoiceAssistantWindowContract("brain-voice");


/**
 * Registry of all available windows
 */
export const WINDOW_REGISTRY: Record<string, WindowFactory> = {
  "ai-assistant": {
    createComponent: (props) => <AIAssistantWindow {...(props || {})} />,
    defaultConfig: {
      title: aiAssistantWindowContract.title,
      titleKey: aiAssistantWindowContract.titleKey,
      icon: aiAssistantWindowContract.iconId,
      position: aiAssistantWindowContract.position,
      size: aiAssistantWindowContract.size
    }
  },

  "brain-voice": {
    createComponent: () => <BrainWindow initialMode="learn" />,
    defaultConfig: {
      title: brainVoiceWindowContract.title,
      titleKey: brainVoiceWindowContract.titleKey,
      icon: brainVoiceWindowContract.iconId,
      position: brainVoiceWindowContract.position,
      size: brainVoiceWindowContract.size
    }
  },

  "manage": {
    createComponent: (props) => {
      const typedProps = (props || {}) as Record<string, unknown>
      const deepLinkNonce = typeof typedProps.deepLinkNonce === "string" ? typedProps.deepLinkNonce : "default"
      return <ManageWindow key={`manage-${deepLinkNonce}`} {...typedProps} />
    },
    defaultConfig: {
      title: "Manage",
      titleKey: "ui.windows.manage.title",
      icon: "⚙️",
      position: { x: 200, y: 50 },
      size: { width: 1200, height: 700 }
    }
  },

  "control-panel": {
    createComponent: () => <ControlPanelWindow />,
    defaultConfig: {
      title: "Control Panel",
      titleKey: "ui.windows.control_panel.title",
      icon: "🎛️",
      position: { x: 150, y: 100 },
      size: { width: 900, height: 600 }
    }
  },

  "organizations": {
    createComponent: () => <OrganizationsWindow />,
    defaultConfig: {
      title: "Organizations",
      titleKey: "ui.windows.organizations.title",
      icon: "🏢",
      position: { x: 150, y: 100 },
      size: { width: 1200, height: 700 }
    }
  },

  "settings": {
    createComponent: () => <SettingsWindow />,
    defaultConfig: {
      title: "Settings",
      titleKey: "ui.windows.settings.title",
      icon: "🔧",
      position: { x: 200, y: 150 },
      size: { width: 900, height: 600 }
    }
  },

  "crm": {
    createComponent: () => <CRMWindow />,
    defaultConfig: {
      title: "CRM",
      titleKey: "ui.windows.crm.title",
      icon: "👥",
      position: { x: 150, y: 100 },
      size: { width: 1200, height: 700 }
    }
  },

  "store": {
    createComponent: (props) => {
      const typedProps = (props || {}) as {
        initialSection?: "plans" | "limits" | "addons" | "billing" | "trial" | "credits" | "calculator" | "faq";
        deepLinkNonce?: string;
      }
      const deepLinkNonce = typeof typedProps.deepLinkNonce === "string" ? typedProps.deepLinkNonce : "default"
      return <StoreWindow key={`store-${deepLinkNonce}`} initialSection={typedProps.initialSection} />
    },
    defaultConfig: {
      title: "Store",
      titleKey: "ui.windows.store.title",
      icon: "🏪",
      position: { x: 150, y: 100 },
      size: { width: 1200, height: 700 }
    }
  },

  "compliance": {
    createComponent: () => <ComplianceWindow />,
    defaultConfig: {
      title: "Compliance",
      titleKey: "ui.windows.compliance.title",
      icon: "⚖️",
      position: { x: 150, y: 100 },
      size: { width: 900, height: 600 }
    }
  },

  "translations": {
    createComponent: () => <TranslationsWindow />,
    defaultConfig: {
      title: "Translations",
      titleKey: "ui.windows.translations.title",
      icon: "🌍",
      position: { x: 150, y: 100 },
      size: { width: 1100, height: 700 }
    }
  },

  "about": {
    createComponent: () => <AboutWindow />,
    defaultConfig: {
      title: "About",
      titleKey: "ui.windows.about.title",
      icon: "ℹ️",
      position: { x: 200, y: 150 },
      size: { width: 600, height: 500 }
    }
  },

  "welcome": {
    createComponent: () => <WelcomeWindow />,
    defaultConfig: {
      title: "Welcome",
      titleKey: "ui.windows.welcome.title",
      icon: "👋",
      position: { x: 200, y: 150 },
      size: { width: 700, height: 500 }
    }
  },

  "all-apps": {
    createComponent: () => <AllAppsWindow />,
    defaultConfig: {
      title: "All Apps",
      titleKey: "ui.windows.all_apps.title",
      icon: "📱",
      position: { x: 90, y: 50 },
      size: { width: 1320, height: 780 }
    }
  },

  "cart": {
    createComponent: () => <PlatformCartWindow />,
    defaultConfig: {
      title: "Cart",
      titleKey: "ui.windows.cart.title",
      icon: "🛒",
      position: { x: 200, y: 150 },
      size: { width: 800, height: 600 }
    }
  },

  "media-library": {
    createComponent: () => <MediaLibraryWindow />,
    defaultConfig: {
      title: "Media Library",
      titleKey: "ui.windows.media_library.title",
      icon: "🖼️",
      position: { x: 150, y: 100 },
      size: { width: 1200, height: 700 }
    }
  },

  "payments": {
    createComponent: () => <PaymentsWindow />,
    defaultConfig: {
      title: "Payments",
      titleKey: "ui.windows.payments.title",
      icon: "💳",
      position: { x: 150, y: 100 },
      size: { width: 1100, height: 700 }
    }
  },

  "products": {
    createComponent: () => <ProductsWindow />,
    defaultConfig: {
      title: "Products",
      titleKey: "ui.windows.products.title",
      icon: "📦",
      position: { x: 150, y: 100 },
      size: { width: 1200, height: 700 }
    }
  },

  "tickets": {
    createComponent: (props) => <TicketsWindow {...(props as Record<string, unknown>)} />,
    defaultConfig: {
      title: "Tickets",
      titleKey: "ui.windows.tickets.title",
      icon: "🎫",
      position: { x: 150, y: 100 },
      size: { width: 1000, height: 700 }
    }
  },

  "certificates": {
    createComponent: () => <CertificatesWindow />,
    defaultConfig: {
      title: "Certificates",
      titleKey: "ui.windows.certificates.title",
      icon: "🎓",
      position: { x: 150, y: 100 },
      size: { width: 900, height: 600 }
    }
  },

  "events": {
    createComponent: () => <EventsWindow />,
    defaultConfig: {
      title: "Events",
      titleKey: "ui.windows.events.title",
      icon: "📅",
      position: { x: 150, y: 100 },
      size: { width: 1200, height: 700 }
    }
  },

  "checkout": {
    createComponent: () => <CheckoutWindow />,
    defaultConfig: {
      title: "Checkout",
      titleKey: "ui.windows.checkout.title",
      icon: "🛍️",
      position: { x: 200, y: 150 },
      size: { width: 800, height: 600 }
    }
  },

  "forms": {
    createComponent: () => <FormsWindow />,
    defaultConfig: {
      title: "Forms",
      titleKey: "ui.windows.forms.title",
      icon: "📝",
      position: { x: 150, y: 100 },
      size: { width: 1100, height: 700 }
    }
  },

  "web-publishing": {
    createComponent: (props) => <WebPublishingWindow {...(props as { fullScreen?: boolean; initialTab?: string; initialPanel?: string })} />,
    defaultConfig: {
      title: "Web Publishing",
      titleKey: "ui.windows.web_publishing.title",
      icon: "🌐",
      position: { x: 150, y: 100 },
      size: { width: 1100, height: 700 }
    }
  },

  "webchat-deployment": {
    createComponent: (props) => (
      <WebPublishingWindow
        {...(props as { fullScreen?: boolean; initialTab?: string; initialPanel?: string })}
        initialTab={
          (props as { initialTab?: string; initialPanel?: string } | undefined)?.initialTab ||
          (props as { initialPanel?: string } | undefined)?.initialPanel ||
          "webchat-deployment"
        }
      />
    ),
    defaultConfig: {
      title: "Webchat Deployment",
      icon: "💬",
      position: { x: 170, y: 90 },
      size: { width: 1120, height: 720 }
    }
  },

  "invoicing": {
    createComponent: () => <InvoicingWindow />,
    defaultConfig: {
      title: "Invoicing",
      titleKey: "ui.windows.invoicing.title",
      icon: "🧾",
      position: { x: 150, y: 100 },
      size: { width: 1100, height: 700 }
    }
  },

  "workflows": {
    createComponent: () => <WorkflowsWindow />,
    defaultConfig: {
      title: "Workflows",
      titleKey: "ui.windows.workflows.title",
      icon: "⚡",
      position: { x: 150, y: 100 },
      size: { width: 1000, height: 700 }
    }
  },

  "templates": {
    createComponent: () => <TemplatesWindow />,
    defaultConfig: {
      title: "Templates",
      titleKey: "ui.windows.templates.title",
      icon: "📑",
      position: { x: 150, y: 100 },
      size: { width: 1100, height: 700 }
    }
  },

  "integrations": {
    createComponent: (props) => <IntegrationsWindow {...(props as { initialPanel?: "api-keys" | "microsoft" | null })} />,
    defaultConfig: {
      title: "Integrations & API",
      titleKey: "ui.windows.integrations.title",
      icon: "🔗",
      position: { x: 150, y: 100 },
      size: { width: 900, height: 650 }
    }
  },

  "oauth-tutorial": {
    // OAuthTutorialWindow requires specific props - see OAuthTutorialWindowProps interface
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createComponent: (props) => <OAuthTutorialWindow {...(props as any)} />,
    defaultConfig: {
      title: "OAuth Setup Tutorial",
      titleKey: "ui.windows.oauth_tutorial.title",
      icon: "🔐",
      position: { x: 200, y: 100 },
      size: { width: 700, height: 600 }
    }
  },

  "tutorials-docs": {
    createComponent: () => <TutorialsDocsWindow />,
    defaultConfig: {
      title: "Tutorials & Docs",
      titleKey: "ui.windows.tutorials_docs.title",
      icon: "📚",
      position: { x: 150, y: 80 },
      size: { width: 1000, height: 700 }
    }
  },

  "login": {
    createComponent: () => <LoginWindow />,
    defaultConfig: {
      title: "User Account",
      titleKey: "ui.app.user_account",
      icon: "👤",
      position: { x: 250, y: 60 },
      size: { width: 450, height: 720 }
    }
  },

  "projects": {
    createComponent: () => <ProjectsWindow />,
    defaultConfig: {
      title: "Projects",
      titleKey: "ui.app.projects",
      icon: "💼",
      position: { x: 240, y: 75 },
      size: { width: 1000, height: 700 }
    }
  },

  "checkout-app": {
    createComponent: () => <CheckoutWindow />,
    defaultConfig: {
      title: "Checkout Manager",
      titleKey: "ui.app.checkout",
      icon: "🛍️",
      position: { x: 200, y: 50 },
      size: { width: 900, height: 650 }
    }
  },

  "platform-cart": {
    createComponent: () => <PlatformCartWindow />,
    defaultConfig: {
      title: "Cart",
      icon: "🛒",
      position: { x: 1000, y: 100 },
      size: { width: 380, height: 500 }
    }
  },

  "checkout-success": {
    createComponent: () => <CheckoutSuccessWindow />,
    defaultConfig: {
      title: "Order Complete",
      titleKey: "ui.app.checkout",
      icon: "✅",
      position: { x: 400, y: 100 },
      size: { width: 600, height: 650 }
    }
  },

  "checkout-failed": {
    createComponent: (props) => <CheckoutFailedWindow {...(props as Record<string, unknown>)} />,
    defaultConfig: {
      title: "Checkout Failed",
      icon: "❌",
      position: { x: 400, y: 100 },
      size: { width: 600, height: 600 }
    }
  },

  "purchase-result": {
    createComponent: (props) => <PurchaseResultWindow {...(props as unknown as import("@/components/window-content/purchase-result-window").PurchaseResultWindowProps)} />,
    defaultConfig: {
      title: "Purchase Result",
      icon: "🏷️",
      position: { x: 400, y: 100 },
      size: { width: 600, height: 650 }
    }
  },

  "tutorial-welcome": {
    createComponent: (props) => {
      // Note: onAction and onClose callbacks cannot be serialized in sessionStorage
      // They will be lost on page refresh. Tutorial should be re-triggered on refresh.
      const typedProps = props as { onAction?: () => void; onClose?: () => void } | undefined;
      const onAction = typedProps?.onAction;
      const onClose = typedProps?.onClose || (() => { });
      return <TutorialWindow tutorialId="welcome" onClose={onClose} onAction={onAction} />;
    },
    defaultConfig: {
      title: "Tutorial",
      icon: "🎂",
      position: { x: 250, y: 80 },
      size: { width: 800, height: 650 }
    }
  },

  "quick-start": {
    createComponent: () => (
      <div className="p-6">
        <QuickStartICPSelector
          onComplete={(icpId) => {
            console.log("Quick Start completed:", icpId);
          }}
        />
      </div>
    ),
    defaultConfig: {
      title: "Quick Start",
      icon: "🚀",
      position: { x: 200, y: 100 },
      size: { width: 900, height: 700 }
    }
  },

  "benefits": {
    createComponent: () => <BenefitsWindow />,
    defaultConfig: {
      title: "Benefits",
      titleKey: "ui.windows.benefits.title",
      icon: "🎁",
      position: { x: 150, y: 100 },
      size: { width: 1100, height: 700 }
    }
  },

  "booking": {
    createComponent: (props) => <BookingWindow initialTab={props?.initialTab as "bookings" | "locations" | "availability" | "settings" | undefined} />,
    defaultConfig: {
      title: "Booking",
      titleKey: "ui.windows.booking.title",
      icon: "📆",
      position: { x: 150, y: 100 },
      size: { width: 1100, height: 700 }
    }
  },

  "ai-system": {
    createComponent: () => <AiSystemWindow />,
    defaultConfig: {
      title: "AI System",
      titleKey: "ui.windows.ai_system.title",
      icon: "🧬",
      position: { x: 150, y: 100 },
      size: { width: 1100, height: 700 }
    }
  },

  "builder": {
    createComponent: (props) => <BuilderBrowserWindow initialSetupMode={props?.initialSetupMode as boolean | undefined} />,
    defaultConfig: {
      title: "Builder",
      icon: "🏗️",
      position: { x: 80, y: 40 },
      size: { width: 1100, height: 750 }
    }
  },

  "agents-browser": {
    createComponent: () => <AgentsWindow />,
    defaultConfig: {
      title: "AI Agents",
      icon: "🕵️",
      position: { x: 100, y: 50 },
      size: { width: 1100, height: 750 }
    }
  },

  "layers": {
    createComponent: () => <LayersBrowserWindow />,
    defaultConfig: {
      title: "Layers",
      icon: "🔀",
      position: { x: 120, y: 60 },
      size: { width: 1100, height: 750 }
    }
  },

  // Legacy aliases kept for deep-link/session backward compatibility.
  "builder-browser": {
    createComponent: (props) => <BuilderBrowserWindow initialSetupMode={props?.initialSetupMode as boolean | undefined} />,
    defaultConfig: {
      title: "Builder",
      icon: "🏗️",
      position: { x: 80, y: 40 },
      size: { width: 1100, height: 750 }
    }
  },

  "layers-browser": {
    createComponent: () => <LayersBrowserWindow />,
    defaultConfig: {
      title: "Layers",
      icon: "🔀",
      position: { x: 120, y: 60 },
      size: { width: 1100, height: 750 }
    }
  },

  "finder": {
    createComponent: () => <FinderWindow />,
    defaultConfig: {
      title: "Finder",
      titleKey: "ui.windows.finder.title",
      icon: "🔍",
      position: { x: 100, y: 60 },
      size: { width: 1200, height: 800 }
    }
  },

  "text-editor": {
    createComponent: () => <TextEditorWindow />,
    defaultConfig: {
      title: "Text Editor",
      icon: "🖊️",
      position: { x: 130, y: 70 },
      size: { width: 1100, height: 740 }
    }
  },

  "terminal": {
    createComponent: () => <TerminalWindow />,
    defaultConfig: {
      title: "Terminal",
      icon: "💻",
      position: { x: 120, y: 80 },
      size: { width: 900, height: 550 }
    }
  },

  "feedback": {
    createComponent: () => <FeedbackWindow />,
    defaultConfig: {
      title: "Feedback",
      icon: "💬",
      position: { x: 250, y: 100 },
      size: { width: 500, height: 550 }
    }
  }
};

/**
 * Check if a window ID is registered
 */
export function isWindowRegistered(id: string): boolean {
  return id in WINDOW_REGISTRY;
}

/**
 * Get window factory by ID
 */
export function getWindowFactory(id: string): WindowFactory | undefined {
  return WINDOW_REGISTRY[id];
}
