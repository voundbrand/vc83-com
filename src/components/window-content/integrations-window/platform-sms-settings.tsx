"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
// Dynamic require to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };
import { InteriorButton } from "@/components/ui/interior-button";
import { useAuth } from "@/hooks/use-auth";
import { useNotification } from "@/hooks/use-notification";
import { useRetroConfirm } from "@/components/retro-confirm-dialog";
import {
  Loader2,
  CheckCircle2,
  ArrowLeft,
  MessageCircle,
  Phone,
  Type,
  Globe,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

interface PlatformSmsSettingsProps {
  onBack: () => void;
}

type VlnWizardStep = "choose" | "country" | "offers" | "details" | "checkout";

interface VlnOffer {
  numberKey: string;
  number: string;
  country: string;
  type: string;
  capabilities: string[];
  infobipSetupPrice: number;
  infobipMonthlyPrice: number;
  currency: string;
  ourSetupPrice: number;
  ourMonthlyPrice: number;
}

export function PlatformSmsSettings({ onBack }: PlatformSmsSettingsProps) {
  const { sessionId, user } = useAuth();
  const notification = useNotification();
  const confirmDialog = useRetroConfirm();

  // UI state
  const [step, setStep] = useState<VlnWizardStep>("choose");
  const [senderName, setSenderName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // VLN wizard state
  const [selectedCountry, setSelectedCountry] = useState("DE");
  const [isLoadingNumbers, setIsLoadingNumbers] = useState(false);
  const [availableOffers, setAvailableOffers] = useState<VlnOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<VlnOffer | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [useCase, setUseCase] = useState("");
  const [optInFlow, setOptInFlow] = useState("");
  const [optOutFlow, setOptOutFlow] = useState("STOP keyword auto-unsubscribe");
  const [messageExample, setMessageExample] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false);

  // Queries & mutations
  const smsConfig = useQuery(
    api.channels.platformSms.getPlatformSmsConfig,
    sessionId ? { sessionId } : "skip"
  );
  const saveAlphanumeric = useMutation(
    api.channels.platformSms.saveAlphanumericSender
  );
  const disconnect = useMutation(
    api.channels.platformSms.disconnectPlatformSms
  );
  const getNumbers = useAction(
    api.channels.platformSms.getAvailableNumbers
  );
  const saveVlnOrder = useMutation(
    api.channels.platformSms.saveVlnOrder
  );

  const isLoading = smsConfig === undefined;
  const isConfigured = smsConfig?.configured;

  // ── Handlers ──────────────────────────────────────────────

  const handleSaveAlphanumeric = async () => {
    if (!sessionId) return;
    const trimmed = senderName.replace(/[^a-zA-Z0-9 ]/g, "").trim();
    if (trimmed.length < 1 || trimmed.length > 11) {
      notification.error("Invalid Name", "Sender name must be 1-11 alphanumeric characters.");
      return;
    }
    setIsSaving(true);
    try {
      await saveAlphanumeric({ sessionId, senderName: trimmed });
      notification.success("Saved", `SMS sender set to "${trimmed}".`);
      setSenderName("");
    } catch (error) {
      notification.error(
        "Error",
        error instanceof Error ? error.message : "Failed to save sender name"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!sessionId) return;
    const confirmed = await confirmDialog.confirm({
      title: "Disconnect L4YERCAK3 SMS",
      message:
        "This will remove your custom SMS sender. Outbound SMS will use the platform default sender. Continue?",
      confirmText: "Disconnect",
      cancelText: "Cancel",
      confirmVariant: "primary",
    });
    if (!confirmed) return;
    try {
      await disconnect({ sessionId });
      notification.success("Disconnected", "Custom SMS sender removed.");
    } catch (error) {
      notification.error(
        "Error",
        error instanceof Error ? error.message : "Disconnect failed"
      );
    }
  };

  const handleBrowseNumbers = async () => {
    if (!sessionId) return;
    setIsLoadingNumbers(true);
    setStep("offers");
    try {
      const result = await getNumbers({ sessionId, country: selectedCountry });
      if (result.success) {
        setAvailableOffers(result.offers as VlnOffer[]);
      } else {
        notification.error("Error", result.error || "Failed to load numbers");
        setStep("country");
      }
    } catch (error) {
      notification.error(
        "Error",
        error instanceof Error ? error.message : "Failed to load numbers"
      );
      setStep("country");
    } finally {
      setIsLoadingNumbers(false);
    }
  };

  const handleSelectOffer = (offer: VlnOffer) => {
    setSelectedOffer(offer);
    setStep("details");
  };

  const handleSubmitVlnOrder = async () => {
    if (!sessionId || !selectedOffer) return;
    if (!companyName.trim() || !useCase.trim() || !optInFlow.trim() || !messageExample.trim()) {
      notification.error("Missing Fields", "Please fill in all required fields.");
      return;
    }
    setIsSubmittingOrder(true);
    try {
      await saveVlnOrder({
        sessionId,
        country: selectedCountry,
        numberKey: selectedOffer.numberKey,
        number: selectedOffer.number,
        infobipSetupPrice: selectedOffer.infobipSetupPrice,
        infobipMonthlyPrice: selectedOffer.infobipMonthlyPrice,
        ourSetupPrice: selectedOffer.ourSetupPrice,
        ourMonthlyPrice: selectedOffer.ourMonthlyPrice,
        companyName: companyName.trim(),
        useCase: useCase.trim(),
        optInFlow: optInFlow.trim(),
        optOutFlow: optOutFlow.trim(),
        messageExample: messageExample.trim(),
      });
      setStep("checkout");
    } catch (error) {
      notification.error(
        "Error",
        error instanceof Error ? error.message : "Failed to save order"
      );
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleSenderNameChange = (value: string) => {
    const sanitized = value.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 11);
    setSenderName(sanitized);
  };

  const COUNTRIES = [
    { code: "DE", name: "Deutschland", flag: "🇩🇪" },
    { code: "AT", name: "Österreich", flag: "🇦🇹" },
    { code: "CH", name: "Schweiz", flag: "🇨🇭" },
  ];

  // ── Render ────────────────────────────────────────────────

  return (
    <>
      <confirmDialog.Dialog />
      <div className="flex flex-col h-full" style={{ background: "var(--window-document-bg)" }}>
        {/* Header */}
        <div
          className="px-4 py-3 border-b-2 flex items-center gap-3"
          style={{ borderColor: "var(--window-document-border)" }}
        >
          <button
            onClick={step === "choose" ? onBack : () => {
              if (step === "offers") setStep("country");
              else if (step === "details") setStep("offers");
              else if (step === "checkout") setStep("details");
              else if (step === "country") setStep("choose");
              else onBack();
            }}
            className="flex items-center gap-1 text-sm hover:underline"
            style={{ color: "var(--tone-accent)" }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="flex items-center gap-2">
            <MessageCircle size={24} style={{ color: "#7c3aed" }} />
            <div>
              <h2 className="font-bold text-sm" style={{ color: "var(--window-document-text)" }}>
                L4YERCAK3 SMS
              </h2>
              <p className="text-xs italic" style={{ color: "var(--neutral-gray)" }}>
                🍰 <span style={{ fontFamily: "var(--font-brand, inherit)" }}>l4yercak3</span>
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div
              className="p-6 border-2 rounded flex flex-col items-center justify-center gap-2"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg-elevated)",
              }}
            >
              <Loader2 size={24} className="animate-spin" style={{ color: "var(--window-document-text)" }} />
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>Loading...</p>
            </div>
          ) : isConfigured && smsConfig?.senderType === "alphanumeric" ? (
            /* ======== ALPHANUMERIC ACTIVE ======== */
            <div className="space-y-4">
              <div
                className="p-4 border-2 rounded"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                  <span className="text-xs font-bold" style={{ color: "#10b981" }}>
                    Alphanumeric Sender Active
                  </span>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                      Sender Name
                    </p>
                    <p className="text-sm font-mono" style={{ color: "var(--window-document-text)" }}>
                      {smsConfig.alphanumericSender}
                    </p>
                  </div>
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    Outbound SMS will show this name as the sender. Recipients cannot reply to alphanumeric senders.
                  </p>
                </div>
              </div>

              <div
                className="p-3 border-2 rounded flex items-center gap-2"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
              >
                <AlertCircle size={14} style={{ color: "var(--tone-accent)" }} />
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  Per-message cost: <strong>2 credits</strong> per outbound SMS
                </p>
              </div>

              <InteriorButton variant="secondary" onClick={() => setStep("choose")} className="w-full">
                Change Sender
              </InteriorButton>
              <InteriorButton variant="secondary" onClick={handleDisconnect} className="w-full">
                Disconnect
              </InteriorButton>
            </div>
          ) : isConfigured && smsConfig?.senderType === "vln" ? (
            /* ======== VLN ACTIVE / PENDING ======== */
            <div className="space-y-4">
              <div
                className="p-4 border-2 rounded"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  {smsConfig.vlnStatus === "active" ? (
                    <>
                      <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                      <span className="text-xs font-bold" style={{ color: "#10b981" }}>
                        Dedicated Number Active
                      </span>
                    </>
                  ) : (
                    <>
                      <Loader2 size={16} className="animate-spin" style={{ color: "#f59e0b" }} />
                      <span className="text-xs font-bold" style={{ color: "#f59e0b" }}>
                        {smsConfig.vlnStatus === "pending_payment"
                          ? "Awaiting Payment"
                          : smsConfig.vlnStatus === "pending_provisioning"
                            ? "Provisioning (~30 days)"
                            : smsConfig.vlnStatus || "Processing"}
                      </span>
                    </>
                  )}
                </div>
                <div className="space-y-2">
                  {smsConfig.vlnNumber && (
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                        Number
                      </p>
                      <p className="text-sm font-mono" style={{ color: "var(--window-document-text)" }}>
                        {smsConfig.vlnNumber}
                      </p>
                    </div>
                  )}
                  {smsConfig.vlnCountry && (
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                        Country
                      </p>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {smsConfig.vlnCountry}
                      </p>
                    </div>
                  )}
                  {smsConfig.vlnOurMonthlyFee && (
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                        Monthly Fee
                      </p>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        EUR {smsConfig.vlnOurMonthlyFee.toFixed(2)}/mo
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div
                className="p-3 border-2 rounded flex items-center gap-2"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
              >
                <AlertCircle size={14} style={{ color: "var(--tone-accent)" }} />
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  Per-message cost: <strong>2 credits</strong> per outbound SMS (in addition to number subscription)
                </p>
              </div>

              <InteriorButton variant="secondary" onClick={handleDisconnect} className="w-full">
                Cancel Number
              </InteriorButton>
            </div>
          ) : step === "choose" ? (
            /* ======== CHOOSE SENDER TYPE ======== */
            <div className="space-y-4">
              {/* Hero */}
              <div
                className="p-6 border-2 rounded text-center"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
              >
                <MessageCircle
                  size={48}
                  className="mx-auto mb-4"
                  style={{ color: "#7c3aed" }}
                />
                <p className="text-sm font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
                  Set Up SMS Sender
                </p>
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  Customize how your outbound SMS appears to recipients.
                </p>
              </div>

              {/* Option A: Alphanumeric */}
              <div
                className="w-full text-left p-4 border-2 rounded"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                <div className="flex items-start gap-3">
                  <Type size={24} style={{ color: "#7c3aed", flexShrink: 0, marginTop: 2 }} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
                        Alphanumeric Sender
                      </p>
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ background: "#10b981", color: "white" }}
                      >
                        Free
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                      Send SMS as your brand name (e.g., &quot;MyAgency&quot;). Outbound only — recipients cannot reply.
                    </p>
                  </div>
                </div>
                {/* Inline alphanumeric form */}
                <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--window-document-border)" }}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => handleSenderNameChange(e.target.value)}
                      placeholder="BrandName"
                      maxLength={11}
                      className="flex-1 p-2 border-2 rounded text-xs"
                      style={{
                        borderColor: "var(--window-document-border)",
                        background: "var(--window-document-bg)",
                        color: "var(--window-document-text)",
                      }}
                    />
                    <InteriorButton
                      onClick={() => {
                        handleSaveAlphanumeric();
                      }}
                      disabled={isSaving || !senderName.trim()}
                      className="whitespace-nowrap"
                    >
                      {isSaving ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        "Activate"
                      )}
                    </InteriorButton>
                  </div>
                  <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                    Max 11 characters, alphanumeric only. Instant activation.
                  </p>
                </div>
              </div>

              {/* Option B: Dedicated Number */}
              <button
                className="w-full text-left p-4 border-2 rounded hover:opacity-90 transition-opacity"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                }}
                onClick={() => setStep("country")}
              >
                <div className="flex items-start gap-3">
                  <Phone size={24} style={{ color: "#7c3aed", flexShrink: 0, marginTop: 2 }} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
                        Dedicated Number
                      </p>
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ background: "#f59e0b", color: "white" }}
                      >
                        Paid
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                      Get a real phone number for two-way SMS. Recipients can reply. Separate monthly subscription.
                    </p>
                    <div className="flex items-center gap-1 mt-2" style={{ color: "var(--tone-accent)" }}>
                      <span className="text-xs font-bold">Browse Numbers</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              </button>

              {/* Per-message cost note */}
              <div
                className="p-3 border-2 rounded flex items-center gap-2"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
              >
                <AlertCircle size={14} style={{ color: "var(--tone-accent)" }} />
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  Both options charge <strong>2 credits per outbound SMS</strong> for message delivery.
                </p>
              </div>
            </div>
          ) : step === "country" ? (
            /* ======== VLN STEP 1: COUNTRY ======== */
            <div className="space-y-4">
              <div
                className="p-4 border-2 rounded"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
              >
                <p className="text-xs font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
                  Step 1 of 4
                </p>
                <p className="text-sm font-bold mb-3" style={{ color: "var(--window-document-text)" }}>
                  Select Country
                </p>
                <p className="text-xs mb-4" style={{ color: "var(--neutral-gray)" }}>
                  Choose the country for your dedicated SMS number.
                </p>

                <div className="space-y-2">
                  {COUNTRIES.map((c) => (
                    <button
                      key={c.code}
                      className="w-full text-left p-3 border-2 rounded flex items-center gap-3 hover:opacity-90"
                      style={{
                        borderColor:
                          selectedCountry === c.code
                            ? "var(--tone-accent)"
                            : "var(--window-document-border)",
                        background:
                          selectedCountry === c.code
                            ? "var(--window-document-bg)"
                            : "transparent",
                      }}
                      onClick={() => setSelectedCountry(c.code)}
                    >
                      <span className="text-lg">{c.flag}</span>
                      <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                        {c.name} ({c.code})
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <InteriorButton onClick={handleBrowseNumbers} className="w-full">
                Browse Available Numbers
              </InteriorButton>
            </div>
          ) : step === "offers" ? (
            /* ======== VLN STEP 2: OFFERS ======== */
            <div className="space-y-4">
              <div
                className="p-4 border-2 rounded"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
              >
                <p className="text-xs font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
                  Step 2 of 4
                </p>
                <p className="text-sm font-bold mb-3" style={{ color: "var(--window-document-text)" }}>
                  Available Numbers
                </p>

                {isLoadingNumbers ? (
                  <div className="flex flex-col items-center gap-2 py-8">
                    <Loader2 size={24} className="animate-spin" style={{ color: "var(--window-document-text)" }} />
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      Loading offers from Infobip...
                    </p>
                  </div>
                ) : availableOffers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      No numbers available for {selectedCountry}. Try a different country.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {availableOffers.map((offer) => (
                      <button
                        key={offer.numberKey}
                        className="w-full text-left p-3 border-2 rounded hover:opacity-90"
                        style={{
                          borderColor: "var(--window-document-border)",
                          background: "var(--window-document-bg)",
                        }}
                        onClick={() => handleSelectOffer(offer)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-mono font-bold" style={{ color: "var(--window-document-text)" }}>
                              {offer.number}
                            </p>
                            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                              {offer.type} &middot; {offer.capabilities?.join(", ")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                              {offer.currency} {offer.ourSetupPrice?.toFixed(2)} setup
                            </p>
                            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                              {offer.currency} {offer.ourMonthlyPrice?.toFixed(2)}/mo
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mt-1" style={{ color: "var(--tone-accent)" }}>
                          <span className="text-xs">Select</span>
                          <ChevronRight size={12} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : step === "details" ? (
            /* ======== VLN STEP 3: COMPLIANCE DETAILS ======== */
            <div className="space-y-4">
              <div
                className="p-4 border-2 rounded"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
              >
                <p className="text-xs font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
                  Step 3 of 4
                </p>
                <p className="text-sm font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
                  Registration Details
                </p>
                <p className="text-xs mb-4" style={{ color: "var(--neutral-gray)" }}>
                  Required for number registration. Provisioning takes approximately 30 days.
                </p>

                {selectedOffer && (
                  <div
                    className="p-2 mb-4 border-2 rounded"
                    style={{ borderColor: "var(--tone-accent)", background: "var(--window-document-bg)" }}
                  >
                    <p className="text-xs font-mono font-bold" style={{ color: "var(--window-document-text)" }}>
                      {selectedOffer.number}
                    </p>
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {selectedOffer.currency} {selectedOffer.ourSetupPrice?.toFixed(2)} setup + {selectedOffer.currency} {selectedOffer.ourMonthlyPrice?.toFixed(2)}/mo
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold block mb-1" style={{ color: "var(--window-document-text)" }}>
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Your company name"
                      className="w-full p-2 border-2 rounded text-xs"
                      style={{
                        borderColor: "var(--window-document-border)",
                        background: "var(--window-document-bg)",
                        color: "var(--window-document-text)",
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1" style={{ color: "var(--window-document-text)" }}>
                      Use Case *
                    </label>
                    <input
                      type="text"
                      value={useCase}
                      onChange={(e) => setUseCase(e.target.value)}
                      placeholder="e.g., Appointment reminders, marketing campaigns"
                      className="w-full p-2 border-2 rounded text-xs"
                      style={{
                        borderColor: "var(--window-document-border)",
                        background: "var(--window-document-bg)",
                        color: "var(--window-document-text)",
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1" style={{ color: "var(--window-document-text)" }}>
                      Opt-In Flow *
                    </label>
                    <input
                      type="text"
                      value={optInFlow}
                      onChange={(e) => setOptInFlow(e.target.value)}
                      placeholder="How do users opt in to receive SMS?"
                      className="w-full p-2 border-2 rounded text-xs"
                      style={{
                        borderColor: "var(--window-document-border)",
                        background: "var(--window-document-bg)",
                        color: "var(--window-document-text)",
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1" style={{ color: "var(--window-document-text)" }}>
                      Opt-Out Flow *
                    </label>
                    <input
                      type="text"
                      value={optOutFlow}
                      onChange={(e) => setOptOutFlow(e.target.value)}
                      placeholder="How can users unsubscribe?"
                      className="w-full p-2 border-2 rounded text-xs"
                      style={{
                        borderColor: "var(--window-document-border)",
                        background: "var(--window-document-bg)",
                        color: "var(--window-document-text)",
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1" style={{ color: "var(--window-document-text)" }}>
                      Example Message *
                    </label>
                    <textarea
                      value={messageExample}
                      onChange={(e) => setMessageExample(e.target.value)}
                      placeholder="Example of a typical SMS you would send"
                      rows={3}
                      className="w-full p-2 border-2 rounded text-xs resize-none"
                      style={{
                        borderColor: "var(--window-document-border)",
                        background: "var(--window-document-bg)",
                        color: "var(--window-document-text)",
                      }}
                    />
                  </div>
                </div>
              </div>

              <InteriorButton
                onClick={handleSubmitVlnOrder}
                disabled={isSubmittingOrder}
                className="w-full"
              >
                {isSubmittingOrder ? (
                  <>
                    <Loader2 size={14} className="mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Continue to Summary"
                )}
              </InteriorButton>
            </div>
          ) : step === "checkout" ? (
            /* ======== VLN STEP 4: CHECKOUT SUMMARY ======== */
            <div className="space-y-4">
              <div
                className="p-4 border-2 rounded"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
              >
                <p className="text-xs font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
                  Step 4 of 4
                </p>
                <p className="text-sm font-bold mb-3" style={{ color: "var(--window-document-text)" }}>
                  Order Summary
                </p>

                {selectedOffer && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs" style={{ color: "var(--window-document-text)" }}>
                      <span>Number</span>
                      <span className="font-mono font-bold">{selectedOffer.number}</span>
                    </div>
                    <div className="flex justify-between text-xs" style={{ color: "var(--window-document-text)" }}>
                      <span>Country</span>
                      <span>{selectedCountry}</span>
                    </div>
                    <div
                      className="border-t pt-2"
                      style={{ borderColor: "var(--window-document-border)" }}
                    >
                      <div className="flex justify-between text-xs" style={{ color: "var(--window-document-text)" }}>
                        <span>One-time setup fee</span>
                        <span className="font-bold">
                          {selectedOffer.currency} {selectedOffer.ourSetupPrice?.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs mt-1" style={{ color: "var(--window-document-text)" }}>
                        <span>Monthly subscription</span>
                        <span className="font-bold">
                          {selectedOffer.currency} {selectedOffer.ourMonthlyPrice?.toFixed(2)}/mo
                        </span>
                      </div>
                    </div>
                    <div
                      className="border-t pt-2"
                      style={{ borderColor: "var(--window-document-border)" }}
                    >
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        + 2 credits per outbound SMS (message delivery cost)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div
                className="p-3 border-2 rounded"
                style={{ borderColor: "#f59e0b", background: "var(--window-document-bg-elevated)" }}
              >
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  <strong>Note:</strong> Number registration takes approximately 30 days.
                  You will be charged after completing Stripe checkout.
                  The subscription can be cancelled at any time.
                </p>
              </div>

              <InteriorButton
                onClick={async () => {
                  if (!sessionId || !user?.currentOrganization?.id) return;
                  setIsSubmittingCheckout(true);
                  try {
                    const resp = await fetch("/api/stripe/create-sms-checkout", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        organizationId: user.currentOrganization.id,
                        organizationName: companyName || user.currentOrganization.name,
                        email: user.email,
                        successUrl: `${window.location.origin}?sms_checkout=success`,
                        cancelUrl: `${window.location.origin}?sms_checkout=cancel`,
                      }),
                    });
                    const data = await resp.json();
                    if (data.checkoutUrl) {
                      window.location.href = data.checkoutUrl;
                    } else {
                      notification.error("Error", data.error || "Failed to create checkout");
                    }
                  } catch (error) {
                    notification.error(
                      "Error",
                      error instanceof Error ? error.message : "Failed to create checkout session"
                    );
                  } finally {
                    setIsSubmittingCheckout(false);
                  }
                }}
                disabled={isSubmittingCheckout}
                className="w-full"
              >
                {isSubmittingCheckout ? (
                  <>
                    <Loader2 size={14} className="mr-1 animate-spin" />
                    Redirecting to Stripe...
                  </>
                ) : (
                  <>
                    <Globe size={14} className="mr-1" />
                    Subscribe &amp; Purchase
                  </>
                )}
              </InteriorButton>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
