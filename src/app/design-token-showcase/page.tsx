"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import DesignTokenShowcaseV2, { type ShowcaseScheme, type ShowcaseScene } from "@/tokens/showcase/design-token-showcase-v2";

function resolveSchemeParam(raw: string | null): ShowcaseScheme {
  if (raw === "midnight") {
    return "midnight";
  }
  return "daylight";
}

function resolveSceneParam(raw: string | null): ShowcaseScene {
  if (raw === "coverage") {
    return "coverage";
  }
  return "default";
}

function DesignTokenShowcaseInner() {
  const searchParams = useSearchParams();
  const scheme = resolveSchemeParam(searchParams.get("scheme"));
  const scene = resolveSceneParam(searchParams.get("scene"));

  return <DesignTokenShowcaseV2 initialScheme={scheme} scene={scene} />;
}

export default function DesignTokenShowcasePage() {
  return (
    <Suspense>
      <DesignTokenShowcaseInner />
    </Suspense>
  );
}
