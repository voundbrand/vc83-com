"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";

export default function ReferralEntryPage() {
  const params = useParams<{ code?: string }>();
  const referralCode = typeof params?.code === "string" ? params.code.trim() : "";

  useEffect(() => {
    if (!referralCode || typeof window === "undefined") {
      return;
    }

    const redirectUrl = new URL("/", window.location.origin);
    redirectUrl.searchParams.set("ref", referralCode);
    window.location.replace(redirectUrl.toString());
  }, [referralCode]);

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6 text-center"
      style={{ background: "var(--shell-bg, #0f1115)", color: "var(--shell-text, #e5e7eb)" }}
    >
      <div>
        <p className="font-pixel text-sm">Applying referral link...</p>
        <p className="mt-2 text-xs opacity-70">You will be redirected to signup.</p>
      </div>
    </main>
  );
}
