"use client";

import { useState, useEffect } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import {
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  CreditCard,
  DollarSign,
  Zap,
  RotateCw,
} from "lucide-react";

interface StripeConnectSectionProps {
  organizationId: Id<"organizations">;
  organization?: Doc<"organizations"> | null;
}

export function StripeConnectSection({ organizationId, organization }: StripeConnectSectionProps) {
  const { sessionId } = useAuth();
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"test" | "live">("live"); // Default to live mode
  const startOnboarding = useMutation(api.stripeConnect.startOnboarding);
  const getOnboardingUrl = useAction(api.stripeConnect.getStripeOnboardingUrl);
  const refreshAccountStatus = useMutation(api.stripeConnect.refreshAccountStatus);
  const disconnectStripe = useMutation(api.stripeConnect.disconnectStripeConnect);
  const handleOAuthCallbackMutation = useMutation(api.stripeConnect.handleOAuthCallback);

  // Get Stripe Connect config from payment providers
  const stripeProvider = organization?.paymentProviders?.find(
    (p) => p.providerCode === "stripe-connect"
  );

  const stripeConnectId = stripeProvider?.accountId;
  const accountStatus = stripeProvider?.status;
  const onboardingCompleted = stripeProvider?.metadata?.onboardingCompleted ?? false;
  const testMode = stripeProvider?.isTestMode ?? false; // Show actual mode

  // Handle OAuth callback from Stripe
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code'); // OAuth authorization code
    const state = urlParams.get('state'); // Organization ID (CSRF protection)

    // Handle OAuth callback (detected by presence of code and state params)
    if (code && state && sessionId) {
      console.log('Processing Stripe OAuth callback...');

      // Complete OAuth connection
      handleOAuthCallbackMutation({
        sessionId,
        organizationId: state as Id<"organizations">,
        code,
        state,
        isTestMode: selectedMode === "test", // Use selected mode
      }).then(() => {
        console.log('OAuth callback processed successfully');

        // Check if we should reopen the payments window
        const shouldReopenPayments = localStorage.getItem('stripe_oauth_reopen_payments');

        // Clean up URL parameters
        const cleanUrl = shouldReopenPayments
          ? `${window.location.pathname}?openWindow=payments`
          : window.location.pathname;

        window.history.replaceState({}, '', cleanUrl);

        // Clear the localStorage flag
        localStorage.removeItem('stripe_oauth_reopen_payments');

        // Refresh status after a delay to show the connected account
        setTimeout(() => {
          refreshAccountStatus({
            sessionId,
            organizationId,
          }).catch(err => console.error('Failed to refresh after OAuth:', err));
        }, 2000);
      }).catch(err => {
        console.error('Failed to process OAuth callback:', err);
        alert('Failed to connect Stripe account. Please try again.');
        localStorage.removeItem('stripe_oauth_reopen_payments');
      });

      return;
    }
  }, [sessionId, organizationId, selectedMode, refreshAccountStatus, handleOAuthCallbackMutation]);

  const handleStartOnboarding = async () => {
    if (!sessionId) return;

    setIsOnboarding(true);
    try {
      // Store flag to reopen payments window after OAuth completes
      localStorage.setItem('stripe_oauth_reopen_payments', 'true');

      // OAuth redirect URI - must be clean (no query params)
      const returnUrl = window.location.origin;
      const refreshUrl = window.location.origin;

      const isTestMode = selectedMode === "test";

      // Step 1: Create the Stripe account
      await startOnboarding({
        sessionId,
        organizationId,
        refreshUrl,
        returnUrl,
        isTestMode, // Pass organization's mode preference
      });

      // Step 2: Wait for account creation, then get the onboarding URL
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Get the onboarding URL and redirect
      const result = await getOnboardingUrl({
        sessionId,
        organizationId,
        refreshUrl,
        returnUrl,
        isTestMode, // Pass organization's mode preference
      });

      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error("No onboarding URL returned");
      }
    } catch (error) {
      console.error("Failed to start onboarding:", error);
      alert("Failed to start Stripe Connect onboarding. Please try again.");
      setIsOnboarding(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!sessionId || !stripeConnectId) return;

    try {
      await refreshAccountStatus({
        sessionId,
        organizationId,
      });
    } catch (error) {
      console.error("Failed to refresh status:", error);
    }
  };

  const handleDisconnect = async () => {
    if (!sessionId) return;

    const confirmed = window.confirm(
      "Are you sure you want to disconnect your Stripe account? This will stop all payment processing for this organization."
    );

    if (!confirmed) return;

    setIsDisconnecting(true);
    try {
      await disconnectStripe({
        sessionId,
        organizationId,
      });
      // Show success message
      alert("Stripe account disconnected successfully");
    } catch (error) {
      console.error("Failed to disconnect:", error);
      alert("Failed to disconnect Stripe account. Please try again.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const getStatusIcon = () => {
    switch (accountStatus) {
      case "active":
        return <CheckCircle2 className="text-green-500" size={20} />;
      case "pending":
        return <AlertTriangle className="text-yellow-500" size={20} />;
      case "restricted":
      case "disabled":
        return <XCircle className="text-red-500" size={20} />;
      default:
        return <CreditCard className="text-gray-400" size={20} />;
    }
  };

  const getStatusText = () => {
    switch (accountStatus) {
      case "active":
        return "Your Stripe account is active and ready to accept payments";
      case "pending":
        return "Your Stripe account is pending verification";
      case "restricted":
        return "Your Stripe account has restrictions. Please check your Stripe dashboard";
      case "disabled":
        return "Your Stripe account is disabled. Please contact Stripe support";
      default:
        return "No Stripe account connected";
    }
  };

  // Not connected state
  if (!stripeConnectId) {
    return (
      <div className="space-y-6">
        {/* Hero Section */}
        <div className="text-center py-8">
          <div
            className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full"
            style={{ background: "var(--primary-light)" }}
          >
            <CreditCard size={32} style={{ color: "var(--primary)" }} />
          </div>
          <h3 className="text-lg font-bold mb-2" style={{ color: "var(--win95-text)" }}>
            Connect Your Stripe Account
          </h3>
          <p className="text-sm max-w-md mx-auto" style={{ color: "var(--neutral-gray)" }}>
            Accept payments from your customers using Stripe Connect. Start accepting credit cards, ACH, and more.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className="p-4 border-2"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
          >
            <DollarSign size={24} style={{ color: "var(--success)" }} className="mb-2" />
            <h4 className="font-bold text-sm mb-1" style={{ color: "var(--win95-text)" }}>
              Accept Payments
            </h4>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              Process credit cards, debit cards, and ACH transfers
            </p>
          </div>

          <div
            className="p-4 border-2"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
          >
            <Zap size={24} style={{ color: "var(--warning)" }} className="mb-2" />
            <h4 className="font-bold text-sm mb-1" style={{ color: "var(--win95-text)" }}>
              Instant Payouts
            </h4>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              Get paid instantly with Stripe&apos;s fast payout system
            </p>
          </div>

          <div
            className="p-4 border-2"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
          >
            <CheckCircle2 size={24} style={{ color: "var(--primary)" }} className="mb-2" />
            <h4 className="font-bold text-sm mb-1" style={{ color: "var(--win95-text)" }}>
              Secure & Compliant
            </h4>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              PCI-compliant payments with advanced fraud protection
            </p>
          </div>
        </div>

        {/* Mode Selection */}
        <div
          className="p-4 border-2"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
        >
          <h4 className="font-bold text-sm mb-3" style={{ color: "var(--win95-text)" }}>
            Choose Connection Mode
          </h4>
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedMode("live")}
              className="flex-1 p-3 border-2 text-left transition-all"
              style={{
                borderColor: selectedMode === "live" ? "var(--primary)" : "var(--win95-border)",
                background: selectedMode === "live" ? "var(--primary-light)" : "var(--win95-bg)",
                borderTopColor: selectedMode === "live" ? "var(--primary)" : "var(--win95-button-dark)",
                borderLeftColor: selectedMode === "live" ? "var(--primary)" : "var(--win95-button-dark)",
                borderBottomColor: selectedMode === "live" ? "var(--primary)" : "var(--win95-button-light)",
                borderRightColor: selectedMode === "live" ? "var(--primary)" : "var(--win95-button-light)",
              }}
            >
              <div className="flex items-start gap-2">
                <CheckCircle2
                  size={16}
                  style={{ color: selectedMode === "live" ? "var(--success)" : "var(--neutral-gray)" }}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <p className="font-bold text-xs mb-1" style={{ color: "var(--win95-text)" }}>
                    Live Mode (Recommended)
                  </p>
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    Process real payments and accept money from customers
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedMode("test")}
              className="flex-1 p-3 border-2 text-left transition-all"
              style={{
                borderColor: selectedMode === "test" ? "var(--warning)" : "var(--win95-border)",
                background: selectedMode === "test" ? "var(--warning-light)" : "var(--win95-bg)",
                borderTopColor: selectedMode === "test" ? "var(--warning)" : "var(--win95-button-dark)",
                borderLeftColor: selectedMode === "test" ? "var(--warning)" : "var(--win95-button-dark)",
                borderBottomColor: selectedMode === "test" ? "var(--warning)" : "var(--win95-button-light)",
                borderRightColor: selectedMode === "test" ? "var(--warning)" : "var(--win95-button-light)",
              }}
            >
              <div className="flex items-start gap-2">
                <RotateCw
                  size={16}
                  style={{ color: selectedMode === "test" ? "var(--warning)" : "var(--neutral-gray)" }}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <p className="font-bold text-xs mb-1" style={{ color: "var(--win95-text)" }}>
                    Test Mode
                  </p>
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    Test your checkout flow with Stripe test cards
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* CTA */}
        <div className="flex justify-center pt-4">
          <button
            onClick={handleStartOnboarding}
            disabled={isOnboarding}
            className="px-6 py-3 text-sm font-bold flex items-center gap-2"
            style={{
              backgroundColor: "var(--primary)",
              color: "white",
              border: "2px solid",
              borderTopColor: "var(--win95-button-light)",
              borderLeftColor: "var(--win95-button-light)",
              borderBottomColor: "var(--win95-button-dark)",
              borderRightColor: "var(--win95-button-dark)",
            }}
          >
            {isOnboarding ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink size={16} />
                Connect Stripe Account ({selectedMode === "test" ? "Test" : "Live"} Mode)
              </>
            )}
          </button>
        </div>

        {/* Note */}
        <div
          className="p-3 border-2 text-xs"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--info-light)",
            color: "var(--win95-text)",
          }}
        >
          <p className="font-semibold mb-1">Connect Your Stripe Account:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>
              <strong>Already have Stripe?</strong> You&apos;ll be able to sign in with your existing account
            </li>
            <li>
              <strong>New to Stripe?</strong> You can create an account during the connection process
            </li>
            <li>
              Have ready: business information, bank details, and tax ID
            </li>
          </ul>
        </div>
      </div>
    );
  }

  // Connected state
  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div
        className="p-4 border-2"
        style={{
          borderColor: "var(--win95-border)",
          background: accountStatus === "active" ? "var(--success-light)" : "var(--warning-light)",
        }}
      >
        <div className="flex items-start gap-3">
          {getStatusIcon()}
          <div className="flex-1">
            <h3 className="font-bold text-sm mb-1" style={{ color: "var(--win95-text)" }}>
              Account Status: {accountStatus || "Unknown"}
            </h3>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {getStatusText()}
            </p>
          </div>
          <button
            onClick={handleRefreshStatus}
            className="px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: "var(--win95-button-face)",
              color: "var(--win95-text)",
              border: "2px solid",
              borderTopColor: "var(--win95-button-light)",
              borderLeftColor: "var(--win95-button-light)",
              borderBottomColor: "var(--win95-button-dark)",
              borderRightColor: "var(--win95-button-dark)",
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Account Details */}
      <div
        className="p-4 border-2"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <h3 className="font-bold text-sm mb-3" style={{ color: "var(--win95-text)" }}>
          Account Details
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--neutral-gray)" }}>Stripe Account ID:</span>
            <span className="font-mono" style={{ color: "var(--win95-text)" }}>
              {stripeConnectId}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--neutral-gray)" }}>Onboarding Status:</span>
            <span className="font-semibold" style={{ color: onboardingCompleted ? "var(--success)" : "var(--warning)" }}>
              {onboardingCompleted ? "Complete" : "Incomplete"}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--neutral-gray)" }}>Mode:</span>
            <span className="font-semibold" style={{ color: testMode ? "var(--warning)" : "var(--success)" }}>
              {testMode ? "Test Mode" : "Live Mode"}
            </span>
          </div>
        </div>
      </div>

      {/* Onboarding incomplete warning */}
      {!onboardingCompleted && (
        <div
          className="p-4 border-2 flex items-start gap-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--warning)",
            color: "var(--win95-text)",
          }}
        >
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Onboarding Incomplete</p>
            <p className="text-xs mt-1">
              You need to complete your Stripe Connect onboarding to start accepting payments.
            </p>
            <button
              onClick={handleStartOnboarding}
              disabled={isOnboarding}
              className="mt-3 px-4 py-2 text-xs font-semibold flex items-center gap-2"
              style={{
                backgroundColor: "var(--win95-button-face)",
                color: "var(--win95-text)",
                border: "2px solid",
                borderTopColor: "var(--win95-button-light)",
                borderLeftColor: "var(--win95-button-light)",
                borderBottomColor: "var(--win95-button-dark)",
                borderRightColor: "var(--win95-button-dark)",
              }}
            >
              {isOnboarding ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <ExternalLink size={14} />
                  Complete Onboarding
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div
        className="p-4 border-2"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <h3 className="font-bold text-sm mb-3" style={{ color: "var(--win95-text)" }}>
          Quick Actions
        </h3>
        <div className="flex flex-col gap-2">
          <a
            href={`https://dashboard.stripe.com/${testMode ? "test/" : ""}connect/accounts/${stripeConnectId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2"
            style={{
              backgroundColor: "var(--primary)",
              color: "white",
              border: "2px solid",
              borderTopColor: "var(--win95-button-light)",
              borderLeftColor: "var(--win95-button-light)",
              borderBottomColor: "var(--win95-button-dark)",
              borderRightColor: "var(--win95-button-dark)",
            }}
          >
            <ExternalLink size={14} />
            Open Stripe Dashboard
          </a>

          <button
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2"
            style={{
              backgroundColor: "var(--error)",
              color: "white",
              border: "2px solid",
              borderTopColor: "var(--win95-button-light)",
              borderLeftColor: "var(--win95-button-light)",
              borderBottomColor: "var(--win95-button-dark)",
              borderRightColor: "var(--win95-button-dark)",
              opacity: isDisconnecting ? 0.6 : 1,
              cursor: isDisconnecting ? "not-allowed" : "pointer",
            }}
          >
            {isDisconnecting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <XCircle size={14} />
                Disconnect Stripe Account
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
