"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

declare global {
  interface Window {
    Cal: any;
  }
}

export function CalButton({
  className,
  variant = "default",
  size = "default",
  children = "Schedule a Meeting",
}: {
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  children?: React.ReactNode;
}) {
  useEffect(() => {
    // Cal.com embed script
    (function (C: any, A: string, L: string) {
      let p = function (a: any, ar: any) {
        a.q.push(ar);
      };
      let d = C.document;
      C.Cal =
        C.Cal ||
        function () {
          let cal = C.Cal;
          let ar = arguments;
          if (!cal.loaded) {
            cal.ns = {};
            cal.q = cal.q || [];
            d.head.appendChild(d.createElement("script")).src = A;
            cal.loaded = true;
          }
          if (ar[0] === L) {
            const api: any = function () {
              p(api, arguments);
            };
            const namespace = ar[1];
            api.q = api.q || [];
            if (typeof namespace === "string") {
              cal.ns[namespace] = cal.ns[namespace] || api;
              p(cal.ns[namespace], ar);
              p(cal, ["initNamespace", namespace]);
            } else p(cal, ar);
            return;
          }
          p(cal, ar);
        };
    })(window, "https://app.cal.com/embed/embed.js", "init");

    window.Cal("init", "open-end-meeting", { origin: "https://app.cal.com" });
    window.Cal.ns["open-end-meeting"]("ui", {
      theme: "light",
      cssVarsPerTheme: {
        light: {
          "cal-brand": "#e0870b",
        },
      },
      hideEventTypeDetails: false,
      layout: "month_view",
    });
  }, []);

  return (
    <Button
      className={className}
      variant={variant}
      size={size}
      data-cal-link="voundbrand/open-end-meeting"
      data-cal-namespace="open-end-meeting"
      data-cal-config='{"layout":"month_view","theme":"light"}'
    >
      <Calendar className="mr-2 h-4 w-4" />
      {children}
    </Button>
  );
}
