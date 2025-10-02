"use client";

import { LoginForm } from "@/components/auth/login-form";
import { useWindowManager } from "@/hooks/use-window-manager";

export function LoginWindow() {
  const { closeWindow, openWindow } = useWindowManager();

  const handleSuccess = () => {
    closeWindow("login");
  };

  const handleSwitchToRegister = () => {
    closeWindow("login");
    openWindow(
      "register",
      "Create Account",
      <div className="p-6"><p>Registration window</p></div>,
      { x: 200, y: 150 },
      { width: 600, height: 550 }
    );
  };

  return (
    <div className="h-full">
      <div>
        {/* Header */}
        <div className="p-4 pb-2 text-center">
          <h1 className="text-xl font-bold mb-1 font-['Press_Start_2P']" style={{ color: 'var(--win95-text)' }}>🍰 Welcome Back!</h1>
          <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>Sign in to access your workspace</p>
        </div>

        {/* Login Form */}
        <LoginForm 
          onSuccess={handleSuccess}
          onSwitchToRegister={handleSwitchToRegister}
        />

        {/* Footer */}
        <div className="text-xs text-center pt-3 mt-4" style={{ color: 'var(--neutral-gray)', borderTop: '2px solid var(--win95-border)' }}>
          Built for startups • Inspired by the &apos;90s • Powered by L4YERCAK3
        </div>
      </div>
    </div>
  );
}
