"use client"

import { useState } from "react"
import { Gift, DollarSign, ClipboardList, Heart, ArrowLeft, Maximize2 } from "lucide-react"
import Link from "next/link"
import { BenefitsList } from "./benefits-window/benefits-list"
import { BenefitDetail } from "./benefits-window/benefit-detail"
import { CommissionsList } from "./benefits-window/commissions-list"
import { CommissionDetail } from "./benefits-window/commission-detail"
import { MyClaimsTab } from "./benefits-window/my-claims-tab"
import { MyEarningsTab } from "./benefits-window/my-earnings-tab"
import type { Id } from "../../../convex/_generated/dataModel"

type ViewType = "benefits" | "commissions" | "my-claims" | "my-earnings"

interface BenefitsWindowProps {
  /** When true, shows back-to-desktop navigation (for /benefits route) */
  fullScreen?: boolean;
}

export function BenefitsWindow({ fullScreen = false }: BenefitsWindowProps = {}) {
  const [activeView, setActiveView] = useState<ViewType>("benefits")
  const [selectedBenefitId, setSelectedBenefitId] = useState<Id<"objects"> | null>(null)
  const [selectedCommissionId, setSelectedCommissionId] = useState<Id<"objects"> | null>(null)

  // Reset selection when switching views
  const handleViewSwitch = (view: ViewType) => {
    setActiveView(view)
    setSelectedBenefitId(null)
    setSelectedCommissionId(null)
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--win95-bg)' }}>
      {/* View Switcher Tabs */}
      <div
        className="flex gap-1 border-b-2 p-2"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg-light)'
        }}
      >
        {/* Back to desktop link (full-screen mode only) */}
        {fullScreen && (
          <Link
            href="/"
            className="retro-button px-3 py-2 flex items-center gap-2"
            title="Back to Desktop"
          >
            <ArrowLeft size={16} />
          </Link>
        )}
        <button
          onClick={() => handleViewSwitch("benefits")}
          className={`retro-button px-4 py-2 flex items-center gap-2 ${
            activeView === "benefits" ? "shadow-inner" : ""
          }`}
          style={{
            background: activeView === "benefits" ? 'var(--win95-selected-bg)' : 'var(--win95-button-face)',
            color: activeView === "benefits" ? 'var(--win95-selected-text)' : 'var(--win95-text)',
          }}
        >
          <Gift size={16} />
          <span className="font-pixel text-xs">Benefits</span>
        </button>
        <button
          onClick={() => handleViewSwitch("commissions")}
          className={`retro-button px-4 py-2 flex items-center gap-2 ${
            activeView === "commissions" ? "shadow-inner" : ""
          }`}
          style={{
            background: activeView === "commissions" ? 'var(--win95-selected-bg)' : 'var(--win95-button-face)',
            color: activeView === "commissions" ? 'var(--win95-selected-text)' : 'var(--win95-text)',
          }}
        >
          <DollarSign size={16} />
          <span className="font-pixel text-xs">Commissions</span>
        </button>
        <button
          onClick={() => handleViewSwitch("my-claims")}
          className={`retro-button px-4 py-2 flex items-center gap-2 ${
            activeView === "my-claims" ? "shadow-inner" : ""
          }`}
          style={{
            background: activeView === "my-claims" ? 'var(--win95-selected-bg)' : 'var(--win95-button-face)',
            color: activeView === "my-claims" ? 'var(--win95-selected-text)' : 'var(--win95-text)',
          }}
        >
          <ClipboardList size={16} />
          <span className="font-pixel text-xs">My Claims</span>
        </button>
        <button
          onClick={() => handleViewSwitch("my-earnings")}
          className={`retro-button px-4 py-2 flex items-center gap-2 ${
            activeView === "my-earnings" ? "shadow-inner" : ""
          }`}
          style={{
            background: activeView === "my-earnings" ? 'var(--win95-selected-bg)' : 'var(--win95-button-face)',
            color: activeView === "my-earnings" ? 'var(--win95-selected-text)' : 'var(--win95-text)',
          }}
        >
          <Heart size={16} />
          <span className="font-pixel text-xs">My Earnings</span>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Open full screen link (window mode only) */}
        {!fullScreen && (
          <Link
            href="/benefits"
            className="retro-button px-3 py-2 flex items-center gap-2"
            title="Open Full Screen"
          >
            <Maximize2 size={16} />
          </Link>
        )}
      </div>

      {/* Content Area */}
      {activeView === "my-claims" ? (
        <div className="flex-1 overflow-hidden">
          <MyClaimsTab />
        </div>
      ) : activeView === "my-earnings" ? (
        <div className="flex-1 overflow-hidden">
          <MyEarningsTab />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: List View */}
          <div
            className="w-1/2 border-r-2 overflow-y-auto"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-bg-light)'
            }}
          >
            {activeView === "benefits" ? (
              <BenefitsList
                selectedId={selectedBenefitId}
                onSelect={setSelectedBenefitId}
              />
            ) : (
              <CommissionsList
                selectedId={selectedCommissionId}
                onSelect={setSelectedCommissionId}
              />
            )}
          </div>

          {/* Right: Detail View */}
          <div
            className="w-1/2 overflow-y-auto p-4"
            style={{ background: 'var(--win95-bg)' }}
          >
            {activeView === "benefits" ? (
              selectedBenefitId ? (
                <BenefitDetail benefitId={selectedBenefitId} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: 'var(--neutral-gray)' }}>
                  <Gift size={48} className="mb-4 opacity-30" />
                  <p className="font-pixel text-sm">Select a benefit</p>
                  <p className="text-xs mt-2">Click on a benefit to view details</p>
                </div>
              )
            ) : (
              selectedCommissionId ? (
                <CommissionDetail commissionId={selectedCommissionId} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: 'var(--neutral-gray)' }}>
                  <DollarSign size={48} className="mb-4 opacity-30" />
                  <p className="font-pixel text-sm">Select a commission</p>
                  <p className="text-xs mt-2">Click on a commission to view details</p>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}
