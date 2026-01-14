"use client";

import React from "react";
import { useAvailableApps } from "@/hooks/use-app-availability";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useWindowManager } from "@/hooks/use-window-manager";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { PaymentsWindow } from "@/components/window-content/payments-window";
import { WebPublishingWindow } from "@/components/window-content/web-publishing-window";
import MediaLibraryWindow from "@/components/window-content/media-library-window";
import { ProductsWindow } from "@/components/window-content/products-window";
import { TicketsWindow } from "@/components/window-content/tickets-window";
import { CertificatesWindow } from "@/components/window-content/certificates-window";
import { EventsWindow } from "@/components/window-content/events-window";
import { CheckoutWindow } from "@/components/window-content/checkout-window";
import { FormsWindow } from "@/components/window-content/forms-window";
import { CRMWindow } from "@/components/window-content/crm-window";
import { InvoicingWindow } from "@/components/window-content/invoicing-window";
import { WorkflowsWindow } from "@/components/window-content/workflows-window";
import { ProjectsWindow } from "@/components/window-content/projects-window";
import { BenefitsWindow } from "@/components/window-content/benefits-window";
import { BookingWindow } from "@/components/window-content/booking-window";

/**
 * All Apps Window
 *
 * Displays all installed/available apps for the current organization
 * in a grid layout with icons, similar to a classic "All Programs" view.
 */
export function AllAppsWindow() {
  const { isSignedIn } = useAuth();
  const { availableApps, isLoading, organizationName } = useAvailableApps();
  const { openWindow } = useWindowManager();
  const { t: tStartMenu } = useNamespaceTranslations("ui.start_menu");
  const { t: tApp } = useNamespaceTranslations("ui.app");

  // Helper function to get translated app name
  const getTranslatedAppName = React.useCallback((appCode: string) => {
    // Map app codes to translation keys
    const translationKeyMap: Record<string, string> = {
      'payments': 'ui.app.payments',
      'web-publishing': 'ui.app.web_publishing',
      'media-library': 'ui.app.media_library',
      'products': 'ui.app.products',
      'tickets': 'ui.app.tickets',
      'certificates': 'ui.app.certificates',
      'events': 'ui.app.events',
      'checkout': 'ui.app.checkout',
      'forms': 'ui.app.forms',
      'crm': 'ui.app.crm',
      'app_invoicing': 'ui.app.invoicing',
      'workflows': 'ui.app.workflows',
      'projects': 'ui.app.projects',
      'benefits': 'ui.app.benefits',
      'booking': 'ui.app.booking',
    };

    const translationKey = translationKeyMap[appCode];
    return translationKey ? tApp(translationKey) : appCode;
  }, [tApp]);

  // App click handler - opens the app window (must be defined before any returns)
  const handleAppClick = React.useCallback((appCode: string) => {
    const appName = getTranslatedAppName(appCode);
    // Map app codes to their window components and sizes
    const appWindowMap: Record<string, { component: React.ReactNode; width: number; height: number }> = {
      'payments': {
        component: <PaymentsWindow />,
        width: 900,
        height: 650
      },
      'web-publishing': {
        component: <WebPublishingWindow />,
        width: 1000,
        height: 700
      },
      'media-library': {
        component: <MediaLibraryWindow />,
        width: 900,
        height: 650
      },
      'products': {
        component: <ProductsWindow />,
        width: 950,
        height: 650
      },
      'tickets': {
        component: <TicketsWindow />,
        width: 950,
        height: 650
      },
      'certificates': {
        component: <CertificatesWindow />,
        width: 1100,
        height: 700
      },
      'events': {
        component: <EventsWindow />,
        width: 950,
        height: 650
      },
      'checkout': {
        component: <CheckoutWindow />,
        width: 950,
        height: 650
      },
      'forms': {
        component: <FormsWindow />,
        width: 950,
        height: 650
      },
      'crm': {
        component: <CRMWindow />,
        width: 1100,
        height: 700
      },
      'app_invoicing': {
        component: <InvoicingWindow />,
        width: 950,
        height: 650
      },
      'workflows': {
        component: <WorkflowsWindow />,
        width: 1200,
        height: 750
      },
      'projects': {
        component: <ProjectsWindow />,
        width: 1000,
        height: 700
      },
      'benefits': {
        component: <BenefitsWindow />,
        width: 1100,
        height: 700
      },
      'booking': {
        component: <BookingWindow />,
        width: 1100,
        height: 700
      },
    };

    console.log('[AllAppsWindow] Attempting to open app:', appCode, 'Available in map:', appCode in appWindowMap);

    const appWindow = appWindowMap[appCode];
    if (appWindow) {
      // Open the actual app window
      openWindow(
        appCode,
        appName,
        appWindow.component,
        undefined,
        { width: appWindow.width, height: appWindow.height }
      );
    } else {
      // Fallback for apps without dedicated windows yet
      openWindow(
        `app-${appCode}`,
        appName,
        <div className="flex items-center justify-center h-full" style={{ background: 'var(--win95-bg)' }}>
          <div className="text-center space-y-3">
            <div className="text-5xl">{availableApps?.find(a => a.code === appCode)?.icon || "📦"}</div>
            <h3 className="font-bold" style={{ color: 'var(--win95-text)' }}>{appName}</h3>
            <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
              {tStartMenu("ui.start_menu.app_coming_soon")}
            </p>
          </div>
        </div>,
        undefined,
        { width: 600, height: 400 }
      );
    }
  }, [openWindow, availableApps, tStartMenu, getTranslatedAppName]);

  // Not signed in
  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8" style={{ background: 'var(--win95-bg)' }}>
        <div className="text-center space-y-4">
          <div className="text-4xl">🔒</div>
          <h3 className="font-bold text-lg" style={{ color: 'var(--win95-text)' }}>
            {tStartMenu("ui.start_menu.sign_in_required")}
          </h3>
          <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
            {tStartMenu("ui.start_menu.sign_in_to_view_apps")}
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: 'var(--win95-bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--win95-highlight)' }} />
          <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
            {tStartMenu("ui.start_menu.loading_applications")}
          </p>
        </div>
      </div>
    );
  }

  // No apps available
  if (!availableApps || availableApps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8" style={{ background: 'var(--win95-bg)' }}>
        <div className="text-center space-y-4">
          <div className="text-4xl">📦</div>
          <h3 className="font-bold text-lg" style={{ color: 'var(--win95-text)' }}>
            {tStartMenu("ui.start_menu.no_apps_installed")}
          </h3>
          <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
            {tStartMenu("ui.start_menu.org_no_apps", { orgName: organizationName })}
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--neutral-gray)' }}>
            {tStartMenu("ui.start_menu.contact_admin")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--win95-bg)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
        <h2 className="font-bold text-lg" style={{ color: 'var(--win95-text)' }}>
          {tApp("ui.app.all_applications")}
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
          {tStartMenu("ui.start_menu.apps_installed_for", { count: availableApps.length, orgName: organizationName })}
        </p>
      </div>

      {/* Apps Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {availableApps.map((app) => {
            const translatedName = getTranslatedAppName(app.code);
            return (<button
              key={app._id}
              onClick={() => handleAppClick(app.code)}
              className="flex flex-col items-center gap-2 p-4 rounded border-2 transition-colors group"
              style={{
                background: 'var(--win95-bg-light)',
                borderColor: 'var(--win95-border)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--win95-highlight)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--win95-border)';
              }}
              title={app.description}
            >
              {/* App Icon */}
              <div className="text-4xl group-hover:scale-110 transition-transform">
                {app.icon}
              </div>

              {/* App Name */}
              <div className="text-xs font-semibold text-center break-words w-full" style={{ color: 'var(--win95-text)' }}>
                {translatedName}
              </div>

              {/* App Category Badge */}
              {app.category && (
                <div
                  className="text-[10px] px-2 py-0.5 rounded"
                  style={{
                    background: 'var(--win95-highlight)',
                    color: 'white'
                  }}
                >
                  {app.category}
                </div>
              )}
            </button>);
          })}
        </div>
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2 border-t-2 text-xs"
        style={{
          borderColor: 'var(--win95-border)',
          color: 'var(--neutral-gray)'
        }}
      >
        {tStartMenu("ui.start_menu.click_app_to_open")}
      </div>
    </div>
  );
}
