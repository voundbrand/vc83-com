"use client";

import { useAvailableApps } from "@/hooks/use-app-availability";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useWindowManager } from "@/hooks/use-window-manager";
import { PaymentsWindow } from "@/components/window-content/payments-window";
import { WebPublishingWindow } from "@/components/window-content/web-publishing-window";
import MediaLibraryWindow from "@/components/window-content/media-library-window";
import { ProductsWindow } from "@/components/window-content/products-window";
import { TicketsWindow } from "@/components/window-content/tickets-window";
import { EventsWindow } from "@/components/window-content/events-window";
import { CheckoutWindow } from "@/components/window-content/checkout-window";

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

  // Not signed in
  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8" style={{ background: 'var(--win95-bg)' }}>
        <div className="text-center space-y-4">
          <div className="text-4xl">🔒</div>
          <h3 className="font-bold text-lg" style={{ color: 'var(--win95-text)' }}>
            Sign In Required
          </h3>
          <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
            Please sign in to view your installed applications.
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
            Loading applications...
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
            No Apps Installed
          </h3>
          <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
            {organizationName} has no applications installed yet.
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--neutral-gray)' }}>
            Contact your administrator to install apps for your organization.
          </p>
        </div>
      </div>
    );
  }

  // App click handler - opens the app window
  const handleAppClick = (appCode: string, appName: string) => {
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
    };

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
            <div className="text-5xl">{availableApps.find(a => a.code === appCode)?.icon || "📦"}</div>
            <h3 className="font-bold" style={{ color: 'var(--win95-text)' }}>{appName}</h3>
            <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
              This application is coming soon!
            </p>
          </div>
        </div>,
        undefined,
        { width: 600, height: 400 }
      );
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--win95-bg)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
        <h2 className="font-bold text-lg" style={{ color: 'var(--win95-text)' }}>
          All Applications
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
          {availableApps.length} app{availableApps.length !== 1 ? 's' : ''} installed for {organizationName}
        </p>
      </div>

      {/* Apps Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {availableApps.map((app) => (
            <button
              key={app._id}
              onClick={() => handleAppClick(app.code, app.name)}
              className="flex flex-col items-center gap-2 p-4 rounded border-2 hover:border-purple-600 transition-colors group"
              style={{
                background: 'var(--win95-bg-light)',
                borderColor: 'var(--win95-border)',
              }}
              title={app.description}
            >
              {/* App Icon */}
              <div className="text-4xl group-hover:scale-110 transition-transform">
                {app.icon}
              </div>

              {/* App Name */}
              <div className="text-xs font-semibold text-center break-words w-full" style={{ color: 'var(--win95-text)' }}>
                {app.name}
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
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t-2 text-xs" style={{
        borderColor: 'var(--win95-border)',
        color: 'var(--neutral-gray)'
      }}>
        Click an app to open it
      </div>
    </div>
  );
}
