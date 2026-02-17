"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { useAvailableApps } from "@/hooks/use-app-availability";
import { useAuth } from "@/hooks/use-auth";
import { useWindowManager } from "@/hooks/use-window-manager";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { getWindowIconById, ShellLoginIcon, ShellPackageIcon } from "@/components/icons/shell-icons";
import {
  InteriorHeader,
  InteriorHelperText,
  InteriorRoot,
  InteriorSubtitle,
  InteriorTileButton,
  InteriorTitle,
} from "@/components/window-content/shared/interior-primitives";
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
import { BuilderBrowserWindow } from "@/components/window-content/builder-browser-window";
import { LayersBrowserWindow } from "@/components/window-content/layers-browser-window";

const APP_TRANSLATION_KEY_MAP: Record<string, string> = {
  payments: "ui.app.payments",
  "web-publishing": "ui.app.web_publishing",
  "media-library": "ui.app.media_library",
  products: "ui.app.products",
  tickets: "ui.app.tickets",
  certificates: "ui.app.certificates",
  events: "ui.app.events",
  checkout: "ui.app.checkout",
  forms: "ui.app.forms",
  crm: "ui.app.crm",
  app_invoicing: "ui.app.invoicing",
  workflows: "ui.app.workflows",
  projects: "ui.app.projects",
  benefits: "ui.app.benefits",
  booking: "ui.app.booking",
};

const SYSTEM_TOOLS = [
  {
    code: "builder-browser",
    name: "AI Builder",
    description: "Visual website builder powered by AI",
  },
  {
    code: "layers-browser",
    name: "Layers",
    description: "Visual automation canvas",
  },
] as const;

/**
 * All Apps Window
 *
 * Displays all installed/available apps for the current organization
 * in a grid layout with icons.
 */
export function AllAppsWindow() {
  const { isSignedIn } = useAuth();
  const { availableApps, isLoading, organizationName } = useAvailableApps();
  const { openWindow } = useWindowManager();
  const { t: tStartMenu } = useNamespaceTranslations("ui.start_menu");
  const { t: tApp } = useNamespaceTranslations("ui.app");

  const getTranslatedAppName = React.useCallback(
    (appCode: string) => {
      const translationKey = APP_TRANSLATION_KEY_MAP[appCode];
      return translationKey ? tApp(translationKey) : appCode;
    },
    [tApp],
  );

  const handleAppClick = React.useCallback(
    (appCode: string) => {
      const appName = getTranslatedAppName(appCode);

      const appWindowMap: Record<string, { component: React.ReactNode; width: number; height: number }> = {
        payments: {
          component: <PaymentsWindow />,
          width: 900,
          height: 650,
        },
        "web-publishing": {
          component: <WebPublishingWindow />,
          width: 1000,
          height: 700,
        },
        "media-library": {
          component: <MediaLibraryWindow />,
          width: 900,
          height: 650,
        },
        products: {
          component: <ProductsWindow />,
          width: 950,
          height: 650,
        },
        tickets: {
          component: <TicketsWindow />,
          width: 950,
          height: 650,
        },
        certificates: {
          component: <CertificatesWindow />,
          width: 1100,
          height: 700,
        },
        events: {
          component: <EventsWindow />,
          width: 950,
          height: 650,
        },
        checkout: {
          component: <CheckoutWindow />,
          width: 950,
          height: 650,
        },
        forms: {
          component: <FormsWindow />,
          width: 950,
          height: 650,
        },
        crm: {
          component: <CRMWindow />,
          width: 1100,
          height: 700,
        },
        app_invoicing: {
          component: <InvoicingWindow />,
          width: 950,
          height: 650,
        },
        workflows: {
          component: <WorkflowsWindow />,
          width: 1200,
          height: 750,
        },
        projects: {
          component: <ProjectsWindow />,
          width: 1000,
          height: 700,
        },
        benefits: {
          component: <BenefitsWindow />,
          width: 1100,
          height: 700,
        },
        booking: {
          component: <BookingWindow />,
          width: 1100,
          height: 700,
        },
        "builder-browser": {
          component: <BuilderBrowserWindow />,
          width: 1100,
          height: 750,
        },
        "layers-browser": {
          component: <LayersBrowserWindow />,
          width: 1100,
          height: 750,
        },
      };

      const appWindow = appWindowMap[appCode];
      if (appWindow) {
        const titleKey = APP_TRANSLATION_KEY_MAP[appCode];
        openWindow(
          appCode,
          appName,
          appWindow.component,
          undefined,
          { width: appWindow.width, height: appWindow.height },
          titleKey,
        );
        return;
      }

      openWindow(
        `app-${appCode}`,
        appName,
        <InteriorRoot className="flex h-full items-center justify-center">
          <div className="space-y-3 text-center">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border"
              style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
            >
              {getWindowIconById(appCode, availableApps?.find((app) => app.code === appCode)?.icon, 20)}
            </div>
            <h3 className="text-base font-semibold" style={{ color: "var(--window-document-text)" }}>
              {appName}
            </h3>
            <InteriorHelperText>{tStartMenu("ui.start_menu.app_coming_soon")}</InteriorHelperText>
          </div>
        </InteriorRoot>,
        undefined,
        { width: 600, height: 400 },
      );
    },
    [availableApps, getTranslatedAppName, openWindow, tStartMenu],
  );

  if (!isSignedIn) {
    return (
      <InteriorRoot className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-md border" style={{ borderColor: "var(--window-document-border)" }}>
          <ShellLoginIcon size={20} />
        </div>
        <h3 className="text-lg font-semibold" style={{ color: "var(--window-document-text)" }}>
          {tStartMenu("ui.start_menu.sign_in_required")}
        </h3>
        <InteriorHelperText className="mt-2">{tStartMenu("ui.start_menu.sign_in_to_view_apps")}</InteriorHelperText>
      </InteriorRoot>
    );
  }

  if (isLoading) {
    return (
      <InteriorRoot className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={30} className="animate-spin" style={{ color: "var(--tone-accent-strong)" }} />
          <InteriorHelperText>{tStartMenu("ui.start_menu.loading_applications")}</InteriorHelperText>
        </div>
      </InteriorRoot>
    );
  }

  if (!availableApps || availableApps.length === 0) {
    return (
      <InteriorRoot className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-md border" style={{ borderColor: "var(--window-document-border)" }}>
          <ShellPackageIcon size={20} />
        </div>
        <h3 className="text-lg font-semibold" style={{ color: "var(--window-document-text)" }}>
          {tStartMenu("ui.start_menu.no_apps_installed")}
        </h3>
        <InteriorHelperText className="mt-2">
          {tStartMenu("ui.start_menu.org_no_apps", { orgName: organizationName })}
        </InteriorHelperText>
        <InteriorHelperText className="mt-1">{tStartMenu("ui.start_menu.contact_admin")}</InteriorHelperText>
      </InteriorRoot>
    );
  }

  return (
    <InteriorRoot className="flex h-full flex-col">
      <InteriorHeader className="px-4 py-3">
        <InteriorTitle className="text-lg">{tApp("ui.app.all_applications")}</InteriorTitle>
        <InteriorSubtitle className="mt-1">
          {tStartMenu("ui.start_menu.apps_installed_for", {
            count: availableApps.length,
            orgName: organizationName,
          })}
        </InteriorSubtitle>
      </InteriorHeader>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {SYSTEM_TOOLS.map((tool) => (
            <InteriorTileButton
              key={tool.code}
              onClick={() => handleAppClick(tool.code)}
              title={tool.description}
              className="min-h-[118px]"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-md border"
                style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
              >
                {getWindowIconById(tool.code, undefined, 20)}
              </div>
              <div className="w-full break-words text-center text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
                {tool.name}
              </div>
            </InteriorTileButton>
          ))}

          {availableApps.map((app) => {
            const translatedName = getTranslatedAppName(app.code);
            return (
              <InteriorTileButton
                key={app._id}
                onClick={() => handleAppClick(app.code)}
                title={app.description}
                className="min-h-[118px]"
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-md border"
                  style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
                >
                  {getWindowIconById(app.code, app.icon, 20)}
                </div>

                <div className="w-full break-words text-center text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
                  {translatedName}
                </div>

                {app.category && (
                  <span
                    className="rounded px-2 py-0.5 text-[10px]"
                    style={{ background: "var(--desktop-shell-accent)", color: "var(--desktop-menu-text-muted)" }}
                  >
                    {app.category}
                  </span>
                )}
              </InteriorTileButton>
            );
          })}
        </div>
      </div>

      <div className="border-t px-4 py-2 text-xs" style={{ borderColor: "var(--window-document-border)", color: "var(--desktop-menu-text-muted)" }}>
        {tStartMenu("ui.start_menu.click_app_to_open")}
      </div>
    </InteriorRoot>
  );
}
