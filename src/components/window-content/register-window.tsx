"use client";

import { useState } from "react";
import { PersonalRegisterForm } from "@/components/auth/personal-register-form";
import { BusinessRegisterForm } from "@/components/auth/business-register-form";
import { useWindowManager } from "@/hooks/use-window-manager";

export function RegisterWindow() {
  const { closeWindow } = useWindowManager();
  const [registrationType, setRegistrationType] = useState<"personal" | "business">("personal");

  const handleSuccess = () => {
    closeWindow("register");
  };

  const handleSwitchToPersonal = () => {
    setRegistrationType("personal");
  };

  const handleSwitchToBusiness = () => {
    setRegistrationType("business");
  };

  return (
    <div className="h-full" style={{ background: 'var(--win95-bg)' }}>
      <div className="overflow-y-auto h-full">
        {/* Header */}
        <div className="p-4 pb-2 text-center">
          <h1 className="text-xl font-bold mb-1 font-['Press_Start_2P']" style={{ color: 'var(--win95-text)' }}>🍰 Create Your Account</h1>
          <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>Choose your account type to get started</p>
        </div>

        {/* Form */}
        {registrationType === "personal" ? (
          <PersonalRegisterForm 
            onSuccess={handleSuccess}
            onSwitchToBusiness={handleSwitchToBusiness}
          />
        ) : (
          <BusinessRegisterForm 
            onSuccess={handleSuccess}
            onSwitchToPersonal={handleSwitchToPersonal}
          />
        )}

        {/* Footer */}
        <div className="text-xs text-center border-t-2 pt-3 mt-4" style={{
          color: 'var(--neutral-gray)',
          borderColor: 'var(--win95-border)'
        }}>
          Built for startups • Inspired by the &apos;90s • Powered by L4YERCAK3
        </div>
      </div>
    </div>
  );
}