"use client";

import { useEffect } from "react";
import { captureRefCode } from "@/lib/affiliate-capture";

/**
 * Silent component that captures ?ref= param into a cookie on any page.
 * Renders nothing — just runs the capture effect.
 */
export function AffiliateCapture() {
  useEffect(() => {
    captureRefCode();
  }, []);

  return null;
}
