"use client";

import { useState, useMemo, useRef } from "react";
import { Anchor, Ship, Wind, Calendar, Mail, Phone, CheckCircle2, ArrowRight, ArrowUp, Play, ChevronDown, ChevronUp, TrendingUp, Users, Globe, Zap, FileText, Clock, Shield, Sparkles, Search, Target, Bot, Megaphone, Home, AlertCircle, Star, MessageSquare, Award, Bell, Heart, Package, MapPin, X, Info, Layers, Link2, FileSearch, PenTool, BarChart2, Eye, Lightbulb, Video, Camera, Film, Scissors, Instagram, Mic } from "lucide-react";

// ============================================
// TYPES
// ============================================

interface PricingOption {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  originalPrice?: number;
  savings?: number;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

interface Milestone {
  week: string;
  title: string;
  description: string;
  deliverables: string[];
}

interface LTVInputs {
  // Primary course (e.g., SBF Binnen)
  primaryCourseValue: number;
  primaryCoursesPerYear: number;
  // Upsell courses (e.g., SBF See, SKS, advanced)
  upsellRate: number; // % of customers who book additional courses
  avgUpsellValue: number;
  // Referral
  referralRate: number; // % of customers who refer others
  // For house: different model
  avgBookingValue: number;
  bookingsPerYear: number;
  repeatGuestRate: number;
}


// ============================================
// DETAIL MODAL COMPONENT
// ============================================

function DetailModal({
  isOpen,
  onClose,
  title,
  icon,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <h3 className="text-xl font-bold text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================
// LTV:CAC CALCULATOR COMPONENT (Website Investment)
// ============================================

function LTVCACCalculator() {
  // Default to "combined" to show the full ecosystem value
  const [businessType, setBusinessType] = useState<"segelschule" | "haus" | "combined">("combined");
  const [showDetails, setShowDetails] = useState(true); // Open by default

  // Segelschule: One-time course business with upsell potential
  // Defaults set to show excellent LTV (≥3x ratio)
  const [segelschuleInputs, setSegelschuleInputs] = useState<LTVInputs>({
    // Primary course (e.g., SBF Binnen, basic sailing)
    primaryCourseValue: 550, // Higher value courses
    primaryCoursesPerYear: 40, // More students with good marketing
    // Upsells: Some students continue to SBF See, SKS, etc.
    upsellRate: 35, // 35% book another course (system encourages this)
    avgUpsellValue: 750, // Advanced courses cost more
    // Referrals: Satisfied students tell friends
    referralRate: 30, // 30% bring a friend (system drives referrals)
    // House fields (not used for segelschule)
    avgBookingValue: 0,
    bookingsPerYear: 0,
    repeatGuestRate: 0,
  });

  // House: Repeat guest model
  // Defaults set to show excellent LTV (≥3x ratio)
  const [houseInputs, setHouseInputs] = useState<LTVInputs>({
    primaryCourseValue: 0,
    primaryCoursesPerYear: 0,
    upsellRate: 0,
    avgUpsellValue: 0,
    referralRate: 25, // 25% recommend to others (system drives referrals)
    // House-specific
    avgBookingValue: 180, // Per night (premium pricing)
    bookingsPerYear: 80, // More nights booked with good marketing
    repeatGuestRate: 40, // 40% come back (system builds loyalty)
  });

  const calculations = useMemo(() => {
    // ===========================================
    // SEGELSCHULE LTV CALCULATION
    // Most customers are one-time, but:
    // - Some upsell to advanced courses
    // - Some refer friends (which is essentially new revenue)
    // ===========================================

    // Base revenue from primary courses
    const primaryRevenue = segelschuleInputs.primaryCourseValue * segelschuleInputs.primaryCoursesPerYear;

    // Upsell revenue (% of students who take advanced courses)
    const upsellRevenue = segelschuleInputs.primaryCoursesPerYear *
      (segelschuleInputs.upsellRate / 100) *
      segelschuleInputs.avgUpsellValue;

    // Referral value: Each referral is essentially a "free" customer acquisition
    // We count this as additional LTV because it reduces effective CAC
    const referralValue = segelschuleInputs.primaryCoursesPerYear *
      (segelschuleInputs.referralRate / 100) *
      segelschuleInputs.primaryCourseValue;

    const segelschuleYearlyRevenue = primaryRevenue + upsellRevenue;

    // LTV per customer = base course + upsell chance + referral value
    const segelschuleLTVPerCustomer =
      segelschuleInputs.primaryCourseValue +
      (segelschuleInputs.upsellRate / 100) * segelschuleInputs.avgUpsellValue +
      (segelschuleInputs.referralRate / 100) * segelschuleInputs.primaryCourseValue;

    // Total LTV over the projection period (yearly revenue including referral effect)
    const segelschuleTotalLTV = segelschuleYearlyRevenue + referralValue;

    const segelschuleCAC = 8500;
    const segelschuleRatio = segelschuleTotalLTV / segelschuleCAC;

    // ===========================================
    // HOUSE LTV CALCULATION
    // Guests can return, and they can refer others
    // ===========================================

    // Average guest stays ~2-3 nights
    const avgNightsPerGuest = 2.5;
    const guestsPerYear = Math.round(houseInputs.bookingsPerYear / avgNightsPerGuest);

    // Base revenue
    const houseBaseRevenue = houseInputs.avgBookingValue * houseInputs.bookingsPerYear;

    // Repeat guest value (they come back ~1.5x on average if they return)
    const repeatGuestRevenue = guestsPerYear *
      (houseInputs.repeatGuestRate / 100) *
      houseInputs.avgBookingValue * avgNightsPerGuest;

    // Referral value
    const houseReferralValue = guestsPerYear *
      (houseInputs.referralRate / 100) *
      houseInputs.avgBookingValue * avgNightsPerGuest;

    const houseYearlyRevenue = houseBaseRevenue;
    const houseTotalLTV = houseBaseRevenue + repeatGuestRevenue + houseReferralValue;

    const houseCAC = 8500;
    const houseRatio = houseTotalLTV / houseCAC;

    // ===========================================
    // COMBINED: Synergy from cross-selling
    // Sailing students who stay at the house (and vice versa)
    // ===========================================

    // Synergy: 15% of sailing students also book accommodation
    const crossSellRate = 0.15;
    const crossSellRevenue = segelschuleInputs.primaryCoursesPerYear *
      crossSellRate *
      houseInputs.avgBookingValue * avgNightsPerGuest;

    const combinedYearlyRevenue = segelschuleYearlyRevenue + houseYearlyRevenue + crossSellRevenue;
    const combinedTotalLTV = segelschuleTotalLTV + houseTotalLTV + crossSellRevenue;

    const combinedCAC = 15000;
    const combinedRatio = combinedTotalLTV / combinedCAC;

    return {
      segelschule: {
        ltv: segelschuleTotalLTV,
        ltvPerCustomer: segelschuleLTVPerCustomer,
        cac: segelschuleCAC,
        ratio: segelschuleRatio,
        yearlyRevenue: segelschuleYearlyRevenue,
        breakEvenMonths: Math.ceil(segelschuleCAC / (segelschuleYearlyRevenue / 12)),
        studentsPerYear: segelschuleInputs.primaryCoursesPerYear,
        upsellRevenue,
        referralValue,
      },
      haus: {
        ltv: houseTotalLTV,
        cac: houseCAC,
        ratio: houseRatio,
        yearlyRevenue: houseYearlyRevenue,
        breakEvenMonths: Math.ceil(houseCAC / (houseYearlyRevenue / 12)),
        guestsPerYear,
        repeatGuestRevenue,
        referralValue: houseReferralValue,
      },
      combined: {
        ltv: combinedTotalLTV,
        cac: combinedCAC,
        ratio: combinedRatio,
        yearlyRevenue: combinedYearlyRevenue,
        breakEvenMonths: Math.ceil(combinedCAC / (combinedYearlyRevenue / 12)),
        synergyBonus: crossSellRevenue,
      },
    };
  }, [segelschuleInputs, houseInputs]);

  const current = businessType === "segelschule"
    ? calculations.segelschule
    : businessType === "haus"
    ? calculations.haus
    : calculations.combined;

  const ratioColor = current.ratio >= 3 ? "text-emerald-400" : current.ratio >= 2 ? "text-amber-400" : "text-red-400";

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-slate-700">
      <div className="flex items-center gap-3 mb-2">
        <TrendingUp className="w-6 h-6 text-cyan-400" />
        <h3 className="text-xl font-semibold text-white">Website-Investition</h3>
      </div>
      <p className="text-slate-400 text-sm mb-6">
        Wie schnell macht sich die Website-Entwicklung bezahlt?
      </p>

      {/* Business Type Toggle - 3 tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-slate-900/50 rounded-lg">
        <button
          onClick={() => setBusinessType("segelschule")}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            businessType === "segelschule"
              ? "bg-cyan-500 text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Segelschule
        </button>
        <button
          onClick={() => setBusinessType("haus")}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            businessType === "haus"
              ? "bg-cyan-500 text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Haff Erleben
        </button>
        <button
          onClick={() => setBusinessType("combined")}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            businessType === "combined"
              ? "bg-cyan-500 text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Komplett
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900/50 rounded-xl p-4 text-center">
          <div className="text-2xl md:text-3xl font-bold text-cyan-400">
            {current.ltv.toLocaleString("de-DE")}€
          </div>
          <div className="text-xs text-slate-400 mt-1">Customer Lifetime Value</div>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-4 text-center">
          <div className="text-2xl md:text-3xl font-bold text-amber-400">
            {current.cac.toLocaleString("de-DE")}€
          </div>
          <div className="text-xs text-slate-400 mt-1">Website-Investition</div>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-4 text-center">
          <div className={`text-2xl md:text-3xl font-bold ${ratioColor}`}>
            {current.ratio.toFixed(1)}x
          </div>
          <div className="text-xs text-slate-400 mt-1">LTV:CAC Ratio</div>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-4 text-center">
          <div className="text-2xl md:text-3xl font-bold text-emerald-400">
            ~{current.breakEvenMonths} Mo.
          </div>
          <div className="text-xs text-slate-400 mt-1">Break-Even</div>
        </div>
      </div>

      {/* Ratio Interpretation */}
      <div className={`p-4 rounded-xl mb-6 ${
        current.ratio >= 3 ? "bg-emerald-500/10 border border-emerald-500/30" :
        current.ratio >= 2 ? "bg-amber-500/10 border border-amber-500/30" :
        "bg-red-500/10 border border-red-500/30"
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${
            current.ratio >= 3 ? "bg-emerald-500/20" :
            current.ratio >= 2 ? "bg-amber-500/20" :
            "bg-red-500/20"
          }`}>
            {current.ratio >= 3 ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> :
             current.ratio >= 2 ? <TrendingUp className="w-5 h-5 text-amber-400" /> :
             <TrendingUp className="w-5 h-5 text-red-400" />}
          </div>
          <div>
            <div className={`font-semibold ${
              current.ratio >= 3 ? "text-emerald-400" :
              current.ratio >= 2 ? "text-amber-400" :
              "text-red-400"
            }`}>
              {current.ratio >= 3 ? "Exzellent" : current.ratio >= 2 ? "Gut" : "Entwicklungspotenzial"}
            </div>
            <div className="text-sm text-slate-300 mt-1">
              {current.ratio >= 3
                ? "Ein LTV:CAC von 3:1 oder höher gilt als exzellent. Jeder investierte Euro bringt mindestens 3€ zurück."
                : current.ratio >= 2
                ? "Ein solides Verhältnis. Mit gezieltem Marketing lässt sich das weiter steigern."
                : "Mit Marketing-Maßnahmen (siehe unten) verbessern sich die Zahlen deutlich."}
            </div>
          </div>
        </div>
      </div>

      {/* Show/Hide Details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors mb-4"
      >
        {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        <span className="text-sm">Parameter anpassen</span>
      </button>

      {/* Adjustable Inputs - Show relevant params based on selected tab */}
      {showDetails && (
        <div className="p-4 bg-slate-900/30 rounded-xl">
          {/* Segelschule Parameters */}
          {businessType === "segelschule" && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-400">Kurspreis (z.B. SBF Binnen)</label>
                <input
                  type="range"
                  min="250"
                  max="800"
                  step="25"
                  value={segelschuleInputs.primaryCourseValue}
                  onChange={(e) => setSegelschuleInputs(prev => ({ ...prev, primaryCourseValue: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
                <div className="text-right text-xs text-cyan-400">{segelschuleInputs.primaryCourseValue}€</div>
              </div>
              <div>
                <label className="text-xs text-slate-400">Schüler pro Jahr</label>
                <input
                  type="range"
                  min="10"
                  max="80"
                  step="5"
                  value={segelschuleInputs.primaryCoursesPerYear}
                  onChange={(e) => setSegelschuleInputs(prev => ({ ...prev, primaryCoursesPerYear: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
                <div className="text-right text-xs text-cyan-400">{segelschuleInputs.primaryCoursesPerYear}</div>
              </div>
              <div>
                <label className="text-xs text-slate-400">Upsell-Rate (% Folgekurs)</label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={segelschuleInputs.upsellRate}
                  onChange={(e) => setSegelschuleInputs(prev => ({ ...prev, upsellRate: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
                <div className="text-right text-xs text-amber-400">{segelschuleInputs.upsellRate}%</div>
              </div>
              <div>
                <label className="text-xs text-slate-400">Folgekurs-Preis (SBF See, SKS...)</label>
                <input
                  type="range"
                  min="400"
                  max="1200"
                  step="50"
                  value={segelschuleInputs.avgUpsellValue}
                  onChange={(e) => setSegelschuleInputs(prev => ({ ...prev, avgUpsellValue: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
                <div className="text-right text-xs text-amber-400">{segelschuleInputs.avgUpsellValue}€</div>
              </div>
              <div>
                <label className="text-xs text-slate-400">Empfehlungsrate (%)</label>
                <input
                  type="range"
                  min="5"
                  max="40"
                  step="5"
                  value={segelschuleInputs.referralRate}
                  onChange={(e) => setSegelschuleInputs(prev => ({ ...prev, referralRate: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
                <div className="text-right text-xs text-emerald-400">{segelschuleInputs.referralRate}%</div>
              </div>
            </div>
          )}

          {/* House Parameters */}
          {businessType === "haus" && (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-slate-400">Preis pro Nacht</label>
                <input
                  type="range"
                  min="80"
                  max="250"
                  step="10"
                  value={houseInputs.avgBookingValue}
                  onChange={(e) => setHouseInputs(prev => ({ ...prev, avgBookingValue: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
                <div className="text-right text-xs text-cyan-400">{houseInputs.avgBookingValue}€</div>
              </div>
              <div>
                <label className="text-xs text-slate-400">Gebuchte Nächte/Jahr</label>
                <input
                  type="range"
                  min="20"
                  max="200"
                  step="10"
                  value={houseInputs.bookingsPerYear}
                  onChange={(e) => setHouseInputs(prev => ({ ...prev, bookingsPerYear: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
                <div className="text-right text-xs text-cyan-400">{houseInputs.bookingsPerYear}</div>
              </div>
              <div>
                <label className="text-xs text-slate-400">Wiederkommer (%)</label>
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="5"
                  value={houseInputs.repeatGuestRate}
                  onChange={(e) => setHouseInputs(prev => ({ ...prev, repeatGuestRate: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
                <div className="text-right text-xs text-amber-400">{houseInputs.repeatGuestRate}%</div>
              </div>
              <div>
                <label className="text-xs text-slate-400">Empfehlungsrate (%)</label>
                <input
                  type="range"
                  min="5"
                  max="40"
                  step="5"
                  value={houseInputs.referralRate}
                  onChange={(e) => setHouseInputs(prev => ({ ...prev, referralRate: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
                <div className="text-right text-xs text-emerald-400">{houseInputs.referralRate}%</div>
              </div>
            </div>
          )}

          {/* Combined: Show both */}
          {businessType === "combined" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-cyan-400 mb-3">Segelschule</h4>
                <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="text-xs text-slate-400">Kurspreis</label>
                    <input
                      type="range"
                      min="250"
                      max="800"
                      step="25"
                      value={segelschuleInputs.primaryCourseValue}
                      onChange={(e) => setSegelschuleInputs(prev => ({ ...prev, primaryCourseValue: Number(e.target.value) }))}
                      className="w-full mt-1"
                    />
                    <div className="text-right text-xs text-cyan-400">{segelschuleInputs.primaryCourseValue}€</div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Schüler/Jahr</label>
                    <input
                      type="range"
                      min="10"
                      max="80"
                      step="5"
                      value={segelschuleInputs.primaryCoursesPerYear}
                      onChange={(e) => setSegelschuleInputs(prev => ({ ...prev, primaryCoursesPerYear: Number(e.target.value) }))}
                      className="w-full mt-1"
                    />
                    <div className="text-right text-xs text-cyan-400">{segelschuleInputs.primaryCoursesPerYear}</div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Upsell %</label>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      step="5"
                      value={segelschuleInputs.upsellRate}
                      onChange={(e) => setSegelschuleInputs(prev => ({ ...prev, upsellRate: Number(e.target.value) }))}
                      className="w-full mt-1"
                    />
                    <div className="text-right text-xs text-amber-400">{segelschuleInputs.upsellRate}%</div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Folgekurs €</label>
                    <input
                      type="range"
                      min="400"
                      max="1200"
                      step="50"
                      value={segelschuleInputs.avgUpsellValue}
                      onChange={(e) => setSegelschuleInputs(prev => ({ ...prev, avgUpsellValue: Number(e.target.value) }))}
                      className="w-full mt-1"
                    />
                    <div className="text-right text-xs text-amber-400">{segelschuleInputs.avgUpsellValue}€</div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Empfehlung %</label>
                    <input
                      type="range"
                      min="5"
                      max="40"
                      step="5"
                      value={segelschuleInputs.referralRate}
                      onChange={(e) => setSegelschuleInputs(prev => ({ ...prev, referralRate: Number(e.target.value) }))}
                      className="w-full mt-1"
                    />
                    <div className="text-right text-xs text-emerald-400">{segelschuleInputs.referralRate}%</div>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-amber-400 mb-3">Haff Erleben</h4>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs text-slate-400">Preis/Nacht</label>
                    <input
                      type="range"
                      min="80"
                      max="250"
                      step="10"
                      value={houseInputs.avgBookingValue}
                      onChange={(e) => setHouseInputs(prev => ({ ...prev, avgBookingValue: Number(e.target.value) }))}
                      className="w-full mt-1"
                    />
                    <div className="text-right text-xs text-cyan-400">{houseInputs.avgBookingValue}€</div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Nächte/Jahr</label>
                    <input
                      type="range"
                      min="20"
                      max="200"
                      step="10"
                      value={houseInputs.bookingsPerYear}
                      onChange={(e) => setHouseInputs(prev => ({ ...prev, bookingsPerYear: Number(e.target.value) }))}
                      className="w-full mt-1"
                    />
                    <div className="text-right text-xs text-cyan-400">{houseInputs.bookingsPerYear}</div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Wiederkommer %</label>
                    <input
                      type="range"
                      min="10"
                      max="60"
                      step="5"
                      value={houseInputs.repeatGuestRate}
                      onChange={(e) => setHouseInputs(prev => ({ ...prev, repeatGuestRate: Number(e.target.value) }))}
                      className="w-full mt-1"
                    />
                    <div className="text-right text-xs text-amber-400">{houseInputs.repeatGuestRate}%</div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Empfehlung %</label>
                    <input
                      type="range"
                      min="5"
                      max="40"
                      step="5"
                      value={houseInputs.referralRate}
                      onChange={(e) => setHouseInputs(prev => ({ ...prev, referralRate: Number(e.target.value) }))}
                      className="w-full mt-1"
                    />
                    <div className="text-right text-xs text-emerald-400">{houseInputs.referralRate}%</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Business Model Explanation */}
      {businessType === "segelschule" && (
        <div className="mt-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
          <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            LTV-Berechnung für Segelschulen
          </h4>
          <p className="text-sm text-slate-400 mb-3">
            Bei einer Segelschule sind die meisten Kunden <strong className="text-slate-300">Einmalkunden</strong> – sie machen einen Schein und sind fertig.
            Aber der Wert entsteht durch:
          </p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-cyan-400 font-semibold">{segelschuleInputs.primaryCoursesPerYear} Schüler</div>
              <div className="text-slate-400 text-xs">× {segelschuleInputs.primaryCourseValue}€ Grundkurs</div>
              <div className="text-white font-semibold mt-1">
                = {(segelschuleInputs.primaryCoursesPerYear * segelschuleInputs.primaryCourseValue).toLocaleString("de-DE")}€
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-amber-400 font-semibold">{segelschuleInputs.upsellRate}% Upsell</div>
              <div className="text-slate-400 text-xs">buchen Folgekurs ({segelschuleInputs.avgUpsellValue}€)</div>
              <div className="text-white font-semibold mt-1">
                + {calculations.segelschule.upsellRevenue.toLocaleString("de-DE")}€
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-emerald-400 font-semibold">{segelschuleInputs.referralRate}% Empfehlungen</div>
              <div className="text-slate-400 text-xs">bringen Freunde</div>
              <div className="text-white font-semibold mt-1">
                + {calculations.segelschule.referralValue.toLocaleString("de-DE")}€
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            💡 Typische Upsell-Pfade: SBF Binnen → SBF See → SKS → SSS. Empfehlungen sind "kostenlose" Neukunden.
          </p>
        </div>
      )}

      {/* House Model Explanation */}
      {businessType === "haus" && (
        <div className="mt-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
          <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Home className="w-4 h-4 text-amber-400" />
            LTV-Berechnung für Ferienwohnungen
          </h4>
          <p className="text-sm text-slate-400 mb-3">
            Bei Übernachtungen ist das Modell anders – Gäste <strong className="text-slate-300">kommen zurück</strong> und empfehlen weiter.
          </p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-cyan-400 font-semibold">{houseInputs.bookingsPerYear} Nächte</div>
              <div className="text-slate-400 text-xs">× {houseInputs.avgBookingValue}€ pro Nacht</div>
              <div className="text-white font-semibold mt-1">
                = {(houseInputs.bookingsPerYear * houseInputs.avgBookingValue).toLocaleString("de-DE")}€
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-amber-400 font-semibold">{houseInputs.repeatGuestRate}% Wiederkommer</div>
              <div className="text-slate-400 text-xs">kommen nochmal</div>
              <div className="text-white font-semibold mt-1">
                + {calculations.haus.repeatGuestRevenue.toLocaleString("de-DE")}€
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-emerald-400 font-semibold">{houseInputs.referralRate}% Empfehlungen</div>
              <div className="text-slate-400 text-xs">bringen Freunde</div>
              <div className="text-white font-semibold mt-1">
                + {calculations.haus.referralValue.toLocaleString("de-DE")}€
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Synergy Bonus (Combined only) */}
      {businessType === "combined" && (
        <div className="mt-6 p-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl border border-cyan-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <span className="font-semibold text-white">Cross-Selling Synergie</span>
          </div>
          <p className="text-sm text-slate-300">
            ~15% der Segelschüler buchen auch eine Übernachtung. Das sind zusätzliche{" "}
            <span className="text-emerald-400 font-semibold">{calculations.combined.synergyBonus?.toLocaleString("de-DE")}€</span> Umsatz
            ohne extra Marketing-Kosten.
          </p>
          <p className="text-xs text-slate-500 mt-2">
            💡 Das ist der eigentliche Hebel: Berliner buchen nicht einzeln – sie wollen ein Komplett-Paket "Auszeit am Haff".
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================
// STORYBRAND: PROBLEM SECTION
// ============================================

function ProblemSection() {
  const problems = [
    {
      type: "external",
      icon: <Globe className="w-6 h-6" />,
      title: "Das externe Problem",
      problem: "Keine digitale Präsenz – unsichtbar für die Welt",
      description: "Ohne Website existierst du für die meisten Menschen nicht. Sie suchen 'Segelkurs Ostsee' – und finden andere. Das Haff bleibt ein Geheimnis, das keiner kennt.",
    },
    {
      type: "internal",
      icon: <Heart className="w-6 h-6" />,
      title: "Das innere Problem",
      problem: "Die Frustration, nicht verstanden zu werden",
      description: "Du weißt, dass das Haff etwas Besonderes ist. Aber wie erklärst du das Menschen, die noch nie dort waren? Wie vermeidest du den typischen 'Segeln-an-der-Ostsee'-Einheitsbrei?",
    },
    {
      type: "philosophical",
      icon: <Sparkles className="w-6 h-6" />,
      title: "Das tiefere Problem",
      problem: "Authentizität vs. Marketing",
      description: "Du willst keinen lauten, aufdringlichen Internetauftritt. Das widerspricht allem, wofür der Ort steht. Aber wie baust du ein Geschäft auf, das wirtschaftlich funktioniert – ohne dich zu verbiegen?",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-white mb-4">
          Die Herausforderung
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Du hast etwas Besonderes aufgebaut. Aber die digitale Welt versteht das nicht von selbst.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {problems.map((item, idx) => (
          <div
            key={idx}
            className="group relative bg-slate-900/50 rounded-2xl p-6 border border-slate-700 hover:border-red-500/30 transition-all"
          >
            {/* Problem Type Badge */}
            <div className="absolute -top-3 left-6 bg-red-500/20 text-red-400 text-xs font-medium px-3 py-1 rounded-full border border-red-500/30">
              {item.title}
            </div>

            <div className="pt-4">
              <div className="p-3 bg-red-500/10 rounded-xl w-fit mb-4 text-red-400 group-hover:bg-red-500/20 transition-colors">
                {item.icon}
              </div>

              <h3 className="text-lg font-semibold text-white mb-3">
                {item.problem}
              </h3>

              <p className="text-slate-400 text-sm leading-relaxed">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* The Stakes */}
      <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-2xl p-6 border border-red-500/20 mt-8">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-semibold text-white mb-2">Was passiert, wenn nichts passiert?</h4>
            <p className="text-slate-300 text-sm leading-relaxed">
              Jedes Jahr kommen neue Segelschulen dazu. Ferienwohnungen gibt es wie Sand am Meer.
              Wer nicht online sichtbar ist – mit einer Präsenz, die überzeugt – verliert nicht nur Buchungen.
              Er verliert die Chance, Menschen zu erreichen, die genau das suchen, was du bietest.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// STORYBRAND: GUIDE SECTION
// ============================================

function GuideSection() {
  return (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-white mb-4">
          Warum ich das verstehe
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Du bist nicht der erste, der vor dieser Herausforderung steht.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Empathy */}
        <div className="bg-slate-900/50 rounded-2xl p-8 border border-slate-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Heart className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Ich kenne das Gefühl</h3>
          </div>

          <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
            <p>
              Du hast etwas aufgebaut, das dir wichtig ist. Etwas, das mehr ist als ein Geschäft.
              Und dann kommt jemand und sagt: <em className="text-slate-400">"Du brauchst mehr SEO"</em> oder
              <em className="text-slate-400">"Mach mal Instagram-Reels"</em>.
            </p>
            <p>
              Das fühlt sich falsch an. Weil es falsch ist. Nicht jede Lösung passt zu jedem Problem.
            </p>
            <p className="text-cyan-400 font-medium">
              Du brauchst keine laute Marketing-Maschine. Du brauchst ein System, das so arbeitet wie du:
              ruhig, durchdacht, authentisch.
            </p>
          </div>
        </div>

        {/* Authority */}
        <div className="bg-slate-900/50 rounded-2xl p-8 border border-slate-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Award className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Was ich mitbringe</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
              <p className="text-slate-300 text-sm">
                <strong className="text-white">Fast 20 Jahre</strong> Erfahrung in Webentwicklung und digitalem Marketing
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
              <p className="text-slate-300 text-sm">
                <strong className="text-white">Menschen verstehen:</strong> Was treibt deine Kunden an? Was suchen sie wirklich? Ich versetze mich in ihre Schuhe – und in deine.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
              <p className="text-slate-300 text-sm">
                <strong className="text-white">Automatisierungs-Experte:</strong> Systeme, die arbeiten, während du auf dem Wasser bist
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
              <p className="text-slate-300 text-sm">
                <strong className="text-white">Full-Stack:</strong> Vom Design bis zur Technik – alles aus einer Hand
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* The Promise */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-2xl p-6 border border-cyan-500/20 text-center">
        <p className="text-white font-medium mb-2">Mein Versprechen:</p>
        <p className="text-slate-300 text-sm max-w-2xl mx-auto">
          Eine digitale Präsenz, die die Stille transportiert. Ein System, das dein Geschäft wachsen lässt –
          ohne dass du dafür deine Werte opfern musst. Authentisch, automatisiert, wirksam.
        </p>
      </div>
    </div>
  );
}

// ============================================
// STORYBRAND: SUCCESS VISION SECTION
// ============================================

function SuccessVisionSection() {
  const successPoints = [
    {
      before: "Du beantwortest dieselben Fragen immer wieder",
      after: "Das System antwortet automatisch – professionell und persönlich",
      icon: <MessageSquare className="w-5 h-5" />,
    },
    {
      before: "Kunden buchen, ohne sich vorzubereiten",
      after: "Sie kommen vorbereitet an, voller Vorfreude",
      icon: <Bell className="w-5 h-5" />,
    },
    {
      before: "Nach dem Kurs – Stille. Keine Folgbuchungen",
      after: "Automatische Einladungen zur Weiterreise: SBF See, SKS, Haus",
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      before: "Wenige, sporadische Google-Bewertungen",
      after: "Konstanter Strom an 5-Sterne-Reviews",
      icon: <Star className="w-5 h-5" />,
    },
    {
      before: "Segelschule und Haus laufen getrennt",
      after: "Ein Ökosystem, das sich gegenseitig füttert",
      icon: <Layers className="w-5 h-5" />,
    },
    {
      before: "Du bist Verkäufer, Admin, Support – alles",
      after: "Du bist auf dem Wasser. Das System kümmert sich.",
      icon: <Wind className="w-5 h-5" />,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-white mb-4">
          Stell dir vor...
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          So sieht dein Alltag aus, wenn das System läuft.
        </p>
      </div>

      <div className="space-y-4">
        {successPoints.map((point, idx) => (
          <div
            key={idx}
            className="group bg-slate-900/50 rounded-xl p-5 border border-slate-700 hover:border-emerald-500/30 transition-all"
          >
            <div className="flex items-center gap-6">
              {/* Before */}
              <div className="flex-1 flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg text-red-400 group-hover:bg-red-500/20 transition-colors">
                  {point.icon}
                </div>
                <p className="text-slate-400 text-sm line-through decoration-red-400/50">
                  {point.before}
                </p>
              </div>

              {/* Arrow */}
              <div className="flex-shrink-0">
                <ArrowRight className="w-5 h-5 text-emerald-400" />
              </div>

              {/* After */}
              <div className="flex-1">
                <p className="text-white text-sm font-medium">
                  {point.after}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ultimate Success */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-2xl p-8 border border-emerald-500/20 text-center mt-8">
        <Wind className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-3">
          Das Ergebnis?
        </h3>
        <p className="text-slate-300 max-w-xl mx-auto leading-relaxed">
          Du bist da, wo du sein sollst: <strong className="text-emerald-400">Auf dem Wasser. Bei deinen Gästen.
          Im Moment.</strong> Das System arbeitet im Hintergrund – leise, zuverlässig, jeden Tag.
          Und dein Geschäft wächst, ohne dass du mehr arbeitest.
        </p>
      </div>
    </div>
  );
}

// ============================================
// STORYBRAND: AVOID FAILURE SECTION
// ============================================

function AvoidFailureSection() {
  const failures = [
    {
      stat: "73%",
      description: "der Websitebesucher verlassen eine Seite innerhalb von 3 Sekunden, wenn sie nicht überzeugt",
    },
    {
      stat: "60%",
      description: "der Tourismus-Buchungen beginnen mit einer Google-Suche – wer dort nicht auftaucht, existiert nicht",
    },
    {
      stat: "5x",
      description: "teurer ist es, einen neuen Kunden zu gewinnen, als einen bestehenden zu halten – ohne System passiert das nicht",
    },
  ];

  return (
    <div className="bg-gradient-to-br from-slate-900 to-red-900/20 rounded-2xl p-8 border border-red-500/20">
      <div className="text-center mb-8">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">
          Die Alternative? Nichts tun.
        </h2>
        <p className="text-slate-400 text-sm">
          Und das sind die Konsequenzen.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {failures.map((item, idx) => (
          <div key={idx} className="text-center">
            <div className="text-3xl font-bold text-red-400 mb-2">{item.stat}</div>
            <p className="text-slate-400 text-sm">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700">
        <h4 className="font-semibold text-white mb-4 text-center">Was du verlierst:</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <X className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" />
            <p className="text-slate-400 text-sm">Buchungen von Menschen, die genau das suchen, was du bietest – aber dich nie finden</p>
          </div>
          <div className="flex items-start gap-3">
            <X className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" />
            <p className="text-slate-400 text-sm">Folgekurse, Wiederbuchungen, Empfehlungen – weil niemand dran erinnert wird</p>
          </div>
          <div className="flex items-start gap-3">
            <X className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" />
            <p className="text-slate-400 text-sm">Die Synergie zwischen Segelschule und Haus – zwei Geschäfte, die nebeneinander her laufen</p>
          </div>
          <div className="flex items-start gap-3">
            <X className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" />
            <p className="text-slate-400 text-sm">Deine Zeit – weil du Admin-Arbeit machst, statt auf dem Wasser zu sein</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// STORYBRAND JOURNEY SECTION (Donald Miller Framework)
// ============================================

function StoryBrandJourneySection() {
  const [activeBusiness, setActiveBusiness] = useState<"segelschule" | "haus">("segelschule");
  const [activeStep, setActiveStep] = useState(0);

  // StoryBrand journey for Segelschule
  const segelschuleJourney = [
    {
      step: "Der Held",
      title: "Dein Segelschüler",
      icon: <Users className="w-6 h-6" />,
      color: "cyan",
      avatar: "Max, 35, Berliner, Bürojob, sucht Abenteuer und Freiheit auf dem Wasser",
      wants: "Segeln lernen. Endlich raus aus dem Alltag. Etwas Echtes erleben.",
      feels: "Neugierig, aber unsicher. Wird er es schaffen? Ist das der richtige Ort?",
    },
    {
      step: "Das Problem",
      title: "Seine Herausforderung",
      icon: <AlertCircle className="w-6 h-6" />,
      color: "red",
      external: "Keinen Segelschein – kann nicht aufs Wasser",
      internal: "Zweifel: Bin ich sportlich genug? Kann ich mir das leisten? Finde ich Zeit?",
      philosophical: "Das Gefühl, etwas zu verpassen – ein Leben ohne echte Erlebnisse",
    },
    {
      step: "Der Guide",
      title: "Du – Gerrit",
      icon: <Award className="w-6 h-6" />,
      color: "emerald",
      empathy: "Du verstehst, dass es um mehr geht als einen Schein – es geht ums Ankommen",
      authority: "Erfahrener Skipper, das Plattbodenschiff, das Haff als perfekter Lernort",
      promise: "'Bei mir lernst du verantwortungsvolles Segeln – der erste Schritt aufs Meer'",
    },
    {
      step: "Der Plan",
      title: "Der klare Weg",
      icon: <FileText className="w-6 h-6" />,
      color: "amber",
      steps: [
        "1. Buchung: Sofort Zugang zur Theorie-Vorbereitung",
        "2. Vorfreude: E-Mails stimmen auf das Haff ein",
        "3. Kurs: Praxis am Plattboden, Theorie verstanden",
        "4. Prüfung: Bestanden! Der Schein ist da.",
        "5. Weiter: Einladung zu SBF See – der nächste Schritt",
      ],
    },
    {
      step: "Der Call-to-Action",
      title: "Jetzt buchen",
      icon: <Zap className="w-6 h-6" />,
      color: "purple",
      primary: "'Jetzt Segelkurs buchen' – klarer Button auf der Website",
      secondary: "'Erstgespräch vereinbaren' für Unentschlossene",
      trigger: "Das System erinnert: Vorfreude-Mail 7 Tage vorher",
    },
    {
      step: "Das Ergebnis",
      title: "Erfolg vs. Scheitern",
      icon: <Star className="w-6 h-6" />,
      color: "emerald",
      success: "Max hat den SBF Binnen. Er fühlt sich lebendig. Er erzählt allen davon. Er bucht SBF See.",
      failure: "Ohne klaren Weg: Max googelt weiter, bucht woanders, oder gar nicht.",
      transformation: "Vom Schreibtisch aufs Wasser – vom Träumer zum Segler",
    },
  ];

  // StoryBrand journey for Haus
  const hausJourney = [
    {
      step: "Der Held",
      title: "Dein Gast",
      icon: <Users className="w-6 h-6" />,
      color: "purple",
      avatar: "Anna & Tom, beide 42, zwei Kinder, Hamburg, Stress im Alltag",
      wants: "Auszeit. Stille. Einfach mal abschalten. Qualitätszeit als Familie.",
      feels: "Erschöpft, aber hoffnungsvoll. Gibt es noch Orte ohne WLAN-Zwang?",
    },
    {
      step: "Das Problem",
      title: "Ihre Herausforderung",
      icon: <AlertCircle className="w-6 h-6" />,
      color: "red",
      external: "Kein Ort zum Abschalten – überall Tourismus, Lärm, Stress",
      internal: "Schuldgefühl: Sollten wir nicht produktiv sein? Ist Auszeit egoistisch?",
      philosophical: "Die Sehnsucht nach echtem Leben – nicht nur funktionieren",
    },
    {
      step: "Der Guide",
      title: "Du – Gerrit & Kathrin",
      icon: <Award className="w-6 h-6" />,
      color: "emerald",
      empathy: "Ihr wisst, was Menschen brauchen: Raum, Stille, Offenheit – keine Bewertung",
      authority: "Das Haus am Haff, Kathrins Walking, der Ort der keiner kennt",
      promise: "'Bei uns darfst du einfach sein – ohne Programm, ohne Erwartung'",
    },
    {
      step: "Der Plan",
      title: "Der klare Weg",
      icon: <FileText className="w-6 h-6" />,
      color: "amber",
      steps: [
        "1. Buchung: Sofort Bestätigung + Geheimtipp-PDF",
        "2. Vorfreude: Wetter, Anreise, Walking-Angebot",
        "3. Ankunft: Das Haff empfängt – Stille, Weite, Ankommen",
        "4. Aufenthalt: Tag-2-Check-in, Digital Concierge wenn nötig",
        "5. Danach: 'Das Haff vermisst dich' – Early-Bird nächste Saison",
      ],
    },
    {
      step: "Der Call-to-Action",
      title: "Jetzt buchen",
      icon: <Zap className="w-6 h-6" />,
      color: "purple",
      primary: "'Verfügbarkeit prüfen' – klarer Button",
      secondary: "'Walking dazubuchen' als Upgrade",
      trigger: "Das System cross-sellet: 'Segeln probieren am Plattboden?'",
    },
    {
      step: "Das Ergebnis",
      title: "Erfolg vs. Scheitern",
      icon: <Star className="w-6 h-6" />,
      color: "emerald",
      success: "Anna & Tom kommen jedes Jahr. Sie empfehlen das Haff weiter. Sie buchen Walking, Segeln, alles.",
      failure: "Ohne Präsenz: Sie finden einen anderen Airbnb. Austauschbar. Vergessen.",
      transformation: "Von erschöpft zu erholt – vom Funktionieren zum Leben",
    },
  ];

  const journey = activeBusiness === "segelschule" ? segelschuleJourney : hausJourney;
  const currentStepData = journey[activeStep];

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    cyan: { bg: "bg-cyan-500/20", text: "text-cyan-400", border: "border-cyan-500/30" },
    purple: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
    red: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" },
    emerald: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30" },
    amber: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
  };

  const colors = colorClasses[currentStepData.color];

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-2 mb-6">
          <Layers className="w-4 h-4 text-amber-400" />
          <span className="text-amber-400 text-sm font-medium">StoryBrand Framework</span>
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">
          Die Kundenreise – visualisiert
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto mb-2">
          So führt das System deine Kunden von der ersten Google-Suche bis zum Stammgast.
        </p>
        <p className="text-slate-500 text-xs">
          Basierend auf dem StoryBrand-Framework von{" "}
          <a
            href="https://storybrand.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:text-amber-300 underline"
          >
            Donald Miller
          </a>
        </p>
      </div>

      {/* Business Type Toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex gap-1 p-1 bg-slate-800/50 rounded-xl border border-slate-700">
          <button
            onClick={() => { setActiveBusiness("segelschule"); setActiveStep(0); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${
              activeBusiness === "segelschule"
                ? "bg-cyan-500 text-white shadow-lg"
                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
            }`}
          >
            <Ship className="w-4 h-4" />
            Segelschule
          </button>
          <button
            onClick={() => { setActiveBusiness("haus"); setActiveStep(0); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${
              activeBusiness === "haus"
                ? "bg-purple-500 text-white shadow-lg"
                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
            }`}
          >
            <Home className="w-4 h-4" />
            Haff Erleben
          </button>
        </div>
      </div>

      {/* Journey Steps - Horizontal Clickable */}
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-8 left-0 right-0 h-0.5 bg-slate-700" />
        <div
          className="absolute top-8 left-0 h-0.5 bg-gradient-to-r from-cyan-500 via-amber-500 to-emerald-500 transition-all duration-500"
          style={{ width: `${(activeStep / (journey.length - 1)) * 100}%` }}
        />

        {/* Steps */}
        <div className="grid grid-cols-6 gap-2">
          {journey.map((step, idx) => {
            const stepColors = colorClasses[step.color];
            const isActive = activeStep === idx;
            const isPast = idx < activeStep;

            return (
              <button
                key={idx}
                onClick={() => setActiveStep(idx)}
                className={`relative flex flex-col items-center pt-0 pb-4 transition-all ${
                  isActive ? "scale-105" : "hover:scale-102"
                }`}
              >
                {/* Circle */}
                <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all z-10 ${
                  isActive
                    ? `${stepColors.bg} ${stepColors.border} border-2`
                    : isPast
                    ? "bg-emerald-500/20 border border-emerald-500/30"
                    : "bg-slate-800 border border-slate-700"
                }`}>
                  <span className={isActive ? stepColors.text : isPast ? "text-emerald-400" : "text-slate-500"}>
                    {step.icon}
                  </span>
                </div>

                {/* Label */}
                <span className={`mt-3 text-xs font-medium text-center ${
                  isActive ? stepColors.text : isPast ? "text-emerald-400" : "text-slate-500"
                }`}>
                  {step.step}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Step Content */}
      <div className={`${colors.bg} rounded-2xl p-8 border ${colors.border} transition-all duration-300`}>
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-3 rounded-xl ${colors.bg}`}>
            {currentStepData.icon}
          </div>
          <div>
            <span className={`text-xs font-semibold ${colors.text} uppercase tracking-wider`}>
              {currentStepData.step}
            </span>
            <h3 className="text-xl font-bold text-white">{currentStepData.title}</h3>
          </div>
        </div>

        {/* Content varies by step type */}
        {"avatar" in currentStepData && (
          <div className="space-y-4">
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
              <div className="text-xs text-slate-500 mb-1">Wer ist das?</div>
              <p className="text-slate-300">{currentStepData.avatar}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
                <div className="text-xs text-slate-500 mb-1">Was will er/sie?</div>
                <p className="text-slate-300 text-sm">{currentStepData.wants}</p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
                <div className="text-xs text-slate-500 mb-1">Was fühlt er/sie?</div>
                <p className="text-slate-300 text-sm">{currentStepData.feels}</p>
              </div>
            </div>
          </div>
        )}

        {"external" in currentStepData && (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
              <div className="text-xs text-red-400 mb-1">Externes Problem</div>
              <p className="text-slate-300 text-sm">{currentStepData.external}</p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
              <div className="text-xs text-amber-400 mb-1">Internes Problem</div>
              <p className="text-slate-300 text-sm">{currentStepData.internal}</p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
              <div className="text-xs text-purple-400 mb-1">Philosophisches Problem</div>
              <p className="text-slate-300 text-sm">{currentStepData.philosophical}</p>
            </div>
          </div>
        )}

        {"empathy" in currentStepData && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
                <div className="text-xs text-emerald-400 mb-1">Empathie</div>
                <p className="text-slate-300 text-sm">{currentStepData.empathy}</p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
                <div className="text-xs text-cyan-400 mb-1">Autorität</div>
                <p className="text-slate-300 text-sm">{currentStepData.authority}</p>
              </div>
            </div>
            <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30">
              <div className="text-xs text-emerald-400 mb-1">Das Versprechen</div>
              <p className="text-emerald-300 font-medium">{currentStepData.promise}</p>
            </div>
          </div>
        )}

        {"steps" in currentStepData && currentStepData.steps && (
          <div className="space-y-3">
            {currentStepData.steps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 bg-slate-900/50 rounded-xl p-4 border border-slate-700">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-400 text-xs font-bold">{idx + 1}</span>
                </div>
                <p className="text-slate-300 text-sm">{step.substring(3)}</p>
              </div>
            ))}
          </div>
        )}

        {"primary" in currentStepData && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/30">
                <div className="text-xs text-purple-400 mb-1">Primärer CTA</div>
                <p className="text-slate-300 text-sm">{currentStepData.primary}</p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
                <div className="text-xs text-slate-400 mb-1">Sekundärer CTA</div>
                <p className="text-slate-300 text-sm">{currentStepData.secondary}</p>
              </div>
            </div>
            <div className="bg-cyan-500/10 rounded-xl p-4 border border-cyan-500/30">
              <div className="text-xs text-cyan-400 mb-1">Das System übernimmt</div>
              <p className="text-slate-300 text-sm">{currentStepData.trigger}</p>
            </div>
          </div>
        )}

        {"success" in currentStepData && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30">
                <div className="flex items-center gap-2 text-xs text-emerald-400 mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Erfolg (mit System)
                </div>
                <p className="text-slate-300 text-sm">{currentStepData.success}</p>
              </div>
              <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
                <div className="flex items-center gap-2 text-xs text-red-400 mb-2">
                  <X className="w-4 h-4" />
                  Scheitern (ohne System)
                </div>
                <p className="text-slate-300 text-sm">{currentStepData.failure}</p>
              </div>
            </div>
            <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl p-4 border border-cyan-500/20">
              <div className="text-xs text-white mb-1">Die Transformation</div>
              <p className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 font-semibold">
                {currentStepData.transformation}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
          disabled={activeStep === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            activeStep === 0
              ? "text-slate-600 cursor-not-allowed"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Zurück
        </button>

        <div className="flex gap-1">
          {journey.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveStep(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                activeStep === idx ? "bg-white w-6" : "bg-slate-600 hover:bg-slate-500"
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => setActiveStep(Math.min(journey.length - 1, activeStep + 1))}
          disabled={activeStep === journey.length - 1}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            activeStep === journey.length - 1
              ? "text-slate-600 cursor-not-allowed"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          Weiter
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================
// VISUALLY DYNAMIC LTV BOOSTER (Scroll-Reveal Style)
// ============================================

function DynamicLTVBooster() {
  const [activeBusiness, setActiveBusiness] = useState<"segelschule" | "haus">("segelschule");
  const [activePhase, setActivePhase] = useState<"vorher" | "waehrend" | "nachher">("vorher");

  // Detailed content for Segelschule phases with email previews
  const segelschuleContent = {
    vorher: {
      color: "emerald",
      title: "VORHER",
      subtitle: "Vor dem Kurs",
      description: "Das System baut Vorfreude auf und bereitet deine Segelschüler optimal vor.",
      items: [
        {
          title: "Vorfreude-Sequenz",
          impact: "-50% No-Shows",
          timing: "7, 3 und 1 Tag vorher",
          emails: [
            { day: "7 Tage vorher", subject: "Das erwartet dich am Haff", preview: "In einer Woche ist es soweit. Das Haff wartet auf dich – Stille, Weite, und das Gefühl, wirklich anzukommen...", icon: <Mail className="w-5 h-5" /> },
            { day: "3 Tage vorher", subject: "Deine Packliste fürs Haff", preview: "Fast geschafft! Hier ist, was du mitbringen solltest. Und ein Tipp: Lass das Handy im Auto.", icon: <FileText className="w-5 h-5" /> },
            { day: "1 Tag vorher", subject: "Morgen geht's los!", preview: "Das Wetter sieht gut aus. Das Boot ist bereit. Wir freuen uns auf dich.", icon: <Bell className="w-5 h-5" /> },
          ],
        },
        {
          title: "Theorie-Zugang",
          impact: "+30% Prüfungserfolg",
          timing: "Sofort nach Buchung",
          description: "Sofortiger Zugriff auf die Online-Theorie. Dein Schüler kann sich vorbereiten, wann er will.",
          mockup: { type: "portal", title: "Dein Theorie-Portal", items: ["Kapitel 1: Grundlagen", "Kapitel 2: Vorfahrtsregeln", "Kapitel 3: Knoten", "Fortschritt: 0%"] },
        },
        {
          title: "Packliste & Tipps",
          impact: "+35% Zufriedenheit",
          timing: "Mit der 3-Tage-Mail",
          description: "Was mitbringen? Was erwartet mich? Praktische Infos, die Unsicherheit nehmen.",
          mockup: { type: "checklist", title: "Packliste Segelkurs", items: ["☐ Sonnencreme", "☐ Windjacke", "☐ Feste Schuhe", "☐ Gute Laune", "☑ Handy im Auto lassen"] },
        },
        {
          title: "Upgrade-Angebot",
          impact: "+25% Zusatzumsatz",
          timing: "Mit der Buchungsbestätigung",
          description: "Intelligentes Cross-Selling: Unterkunft am Haff dazubuchen?",
          mockup: { type: "offer", title: "Dein Upgrade", items: ["Du fährst 3h aus Berlin?", "→ Segeln + 2 Nächte am Haff", "Deine Komplett-Auszeit: 599€"] },
        },
      ],
    },
    waehrend: {
      color: "cyan",
      title: "WÄHREND",
      subtitle: "Während des Kurses",
      description: "Unsichtbare Unterstützung, die Probleme verhindert und Momente schafft.",
      items: [
        {
          title: "Foto-Moments",
          impact: "+40% Social Shares",
          timing: "Tag 1, Nachmittag",
          description: "Automatische Erinnerung: Zeit für ein Gruppenfoto! Diese Bilder werden zu Bewertungen.",
          mockup: { type: "notification", title: "📸 Foto-Zeit!", items: ["Perfektes Licht gerade", "Gruppenfoto am Plattboden?", "Diese Erinnerung teilen sie"] },
        },
        {
          title: "Tag-2-Check-in",
          impact: "-70% negative Reviews",
          timing: "Tag 2, 10:00 Uhr",
          emails: [{ day: "Tag 2", subject: "Wie läuft's auf dem Wasser?", preview: "Kurze Frage: Ist alles okay? Läuft der Kurs wie erwartet? Falls nicht – melde dich!", icon: <MessageSquare className="w-5 h-5" /> }],
        },
        {
          title: "Digital Concierge",
          impact: "-80% Support-Aufwand",
          timing: "24/7 verfügbar",
          description: "Bot für häufige Fragen: Zeiten, Treffpunkt, Theorie. Du musst nicht ans Telefon.",
          mockup: { type: "chat", title: "Frag den Concierge", items: ["'Wann ist morgen Treffpunkt?'", "→ 9:00 Uhr am Steg", "'Wo kann ich parken?'", "→ Parkplatz hinter dem..."] },
        },
        {
          title: "Fortschritts-Updates",
          impact: "+25% Zufriedenheit",
          timing: "Täglich abends",
          emails: [{ day: "Jeden Abend", subject: "Dein Tag auf dem Wasser", preview: "Heute gelernt: Wende und Halse. Morgen: Anlegen unter Segeln. Du machst das großartig!", icon: <TrendingUp className="w-5 h-5" /> }],
        },
      ],
    },
    nachher: {
      color: "purple",
      title: "NACHHER",
      subtitle: "Nach dem Kurs",
      description: "Verbindung halten, Folgekurse einladen, Empfehlungen generieren.",
      items: [
        {
          title: "Zertifikat + Danke",
          impact: "+40% mehr Reviews",
          timing: "Tag 1 nach Kursende",
          emails: [{ day: "1 Tag danach", subject: "Du hast es geschafft! Dein Zertifikat", preview: "Herzlichen Glückwunsch zum SBF Binnen! Im Anhang dein Zertifikat. Du hast den ersten Schritt gemacht.", icon: <Award className="w-5 h-5" /> }],
        },
        {
          title: "Upsell-Sequenz",
          impact: "+15% Upsells",
          timing: "14 Tage danach",
          emails: [{ day: "14 Tage danach", subject: "Bereit für den nächsten Schritt?", preview: "SBF See wartet. Vom Haff aufs Meer. Der logische nächste Schritt.", icon: <ArrowRight className="w-5 h-5" /> }],
        },
        {
          title: "Wiederkommer-Magie",
          impact: "+30% Wiederbuchung",
          timing: "Jahrestag + Saisonstart",
          emails: [
            { day: "1 Jahr später", subject: "Erinnerst du dich?", preview: "Vor genau einem Jahr warst du hier am Haff. Zeit für eine Wiederkehr?", icon: <Heart className="w-5 h-5" /> },
            { day: "Vor der Saison", subject: "Early-Bird für dich", preview: "Die neue Saison startet. Als ehemaliger Schüler: 10% Frühbucher-Rabatt.", icon: <Star className="w-5 h-5" /> },
          ],
        },
        {
          title: "Empfehlungs-Engine",
          impact: "+25% Empfehlungen",
          timing: "7 Tage nach Kursende",
          emails: [{ day: "7 Tage danach", subject: "Kennst du jemanden?", preview: "Du warst begeistert? Für jede Empfehlung: 50€ Gutschein für deinen nächsten Kurs.", icon: <Users className="w-5 h-5" /> }],
        },
      ],
    },
  };

  // Detailed content for Haus phases with email previews
  const hausContent = {
    vorher: {
      color: "emerald",
      title: "VORHER",
      subtitle: "Vor dem Aufenthalt",
      description: "Das System stimmt deine Gäste auf das Haff ein und baut Vorfreude auf.",
      items: [
        {
          title: "Vorfreude-Sequenz",
          impact: "-50% No-Shows",
          timing: "7 und 3 Tage vorher",
          emails: [
            { day: "7 Tage vorher", subject: "Das Haff wartet auf dich", preview: "In einer Woche bist du hier. Stille. Weite. Ankommen. Hier sind Orte, die nur Einheimische kennen...", icon: <Mail className="w-5 h-5" /> },
            { day: "3 Tage vorher", subject: "Letzte Infos vor deiner Auszeit", preview: "Das Wetter sieht gut aus. Die Anfahrt, wo der Schlüssel liegt, und ein Tipp...", icon: <MapPin className="w-5 h-5" /> },
          ],
        },
        {
          title: "Geheimtipp-Guide",
          impact: "+35% Zufriedenheit",
          timing: "Mit der Buchungsbestätigung",
          description: "PDF mit Orten, die nur Einheimische kennen. Macht dich zum Insider.",
          mockup: { type: "pdf", title: "Geheimtipps am Haff", items: ["🏖️ Der versteckte Strand", "🍽️ Fischerhütte (kein Tourist)", "🌅 Bester Sonnenuntergang-Spot", "🚶 Kathrins Lieblingsweg"] },
        },
        {
          title: "Walking-Angebot",
          impact: "+20% Zusatzbuchungen",
          timing: "Mit der 7-Tage-Mail",
          description: "Hinweis auf Kathrins begleitete Walks. Cross-Selling, das zum Erlebnis passt.",
          mockup: { type: "offer", title: "Walking mit Kathrin", items: ["Während eures Aufenthalts:", "Begleitete Walks in der Natur", "Zeit mit sich selbst", "→ Jetzt dazubuchen"] },
        },
        {
          title: "Anreise-Infos",
          impact: "+30% positive Ankunft",
          timing: "1 Tag vorher",
          emails: [{ day: "1 Tag vorher", subject: "Morgen bist du hier!", preview: "Aktuelles Wetter: Sonnig, 22°C. Die Anfahrt, der Schlüssel, was dich erwartet.", icon: <Bell className="w-5 h-5" /> }],
        },
      ],
    },
    waehrend: {
      color: "cyan",
      title: "WÄHREND",
      subtitle: "Während des Aufenthalts",
      description: "Der stille Gastgeber – da wenn nötig, unsichtbar wenn nicht.",
      items: [
        {
          title: "Tag-2-Check-in",
          impact: "-70% negative Reviews",
          timing: "Tag 2, morgens",
          emails: [{ day: "Tag 2", subject: "Alles okay bei euch?", preview: "Kurze Frage: Ist alles so, wie ihr es euch vorgestellt habt? Falls etwas fehlt – melde dich.", icon: <MessageSquare className="w-5 h-5" /> }],
        },
        {
          title: "Digital Concierge",
          impact: "-80% Support-Aufwand",
          timing: "24/7 verfügbar",
          description: "WLAN-Passwort, Checkout-Zeit, Restaurant-Tipps – ohne dass du ans Telefon musst.",
          mockup: { type: "chat", title: "Frag den Concierge", items: ["'Wie ist das WLAN-Passwort?'", "→ HaffStille2024", "'Checkout-Zeit?'", "→ 11:00, flexibel auf Anfrage"] },
        },
        {
          title: "Aktivitäten-Tipp",
          impact: "+15% Cross-Selling",
          timing: "Tag 2-3",
          emails: [{ day: "Tag 2-3", subject: "Lust auf was Neues?", preview: "Segeln probieren? Gerrit bietet Schnupperkurse am Plattbodenschiff. Eine Stunde auf dem Wasser.", icon: <Ship className="w-5 h-5" /> }],
        },
        {
          title: "Foto-Erinnerung",
          impact: "+40% Social Shares",
          timing: "Bei schönem Wetter",
          mockup: { type: "notification", title: "📸 Perfektes Licht!", items: ["Sonnenuntergang in 1h", "Bester Spot: Am Steg", "Diese Momente festhalten"] },
        },
      ],
    },
    nachher: {
      color: "purple",
      title: "NACHHER",
      subtitle: "Nach dem Aufenthalt",
      description: "Verbindung halten – aus Gästen werden Stammgäste und Botschafter.",
      items: [
        {
          title: "Review-Pipeline",
          impact: "+40% mehr Reviews",
          timing: "2 Tage nach Abreise",
          emails: [{ day: "2 Tage danach", subject: "Danke für euren Besuch!", preview: "Wir hoffen, ihr hattet eine gute Zeit am Haff. Ein kurzes Feedback würde uns helfen.", icon: <Star className="w-5 h-5" /> }],
        },
        {
          title: "3-Monate-Mail",
          impact: "+30% Wiederbuchung",
          timing: "3 Monate später",
          emails: [{ day: "3 Monate später", subject: "Das Haff vermisst dich", preview: "Der Herbst ist da. Das Haff ist ruhiger denn je. Die Stille, die du kennst – sie wartet.", icon: <Heart className="w-5 h-5" /> }],
        },
        {
          title: "Early-Bird Stammgäste",
          impact: "+25% Frühbuchungen",
          timing: "Vor der Saison",
          emails: [{ day: "Januar/Februar", subject: "Exklusiv für dich: Early-Bird", preview: "Die neue Saison wird geplant. Als Stammgast: Erste Wahl + 10% Frühbucher-Rabatt.", icon: <Star className="w-5 h-5" /> }],
        },
        {
          title: "Jahrestag-Erinnerung",
          impact: "+20% Empfehlungen",
          timing: "Genau 1 Jahr später",
          emails: [{ day: "1 Jahr später", subject: "Letztes Jahr um diese Zeit...", preview: "...wart ihr hier am Haff. Die Stille, die Weite. Wie wär's mit einer Wiederkehr?", icon: <Calendar className="w-5 h-5" /> }],
        },
      ],
    },
  };

  const content = activeBusiness === "segelschule" ? segelschuleContent : hausContent;
  const currentPhase = content[activePhase];

  const colorClasses = {
    emerald: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30", light: "bg-emerald-500/10" },
    cyan: { bg: "bg-cyan-500/20", text: "text-cyan-400", border: "border-cyan-500/30", light: "bg-cyan-500/10" },
    purple: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30", light: "bg-purple-500/10" },
  };
  const colors = colorClasses[currentPhase.color as keyof typeof colorClasses];

  // Calculate progress percentage
  const progressPercent = activePhase === "vorher" ? 0 : activePhase === "waehrend" ? 50 : 100;

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-2 mb-6">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-400 text-sm font-medium">Die Transformation</span>
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">
          Das System, das leise arbeitet
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Drei Phasen, ein Ziel: Mehr Wert aus jedem Gast – automatisch.
        </p>
      </div>

      {/* Business Type Toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex gap-1 p-1 bg-slate-800/50 rounded-xl border border-slate-700">
          <button
            onClick={() => { setActiveBusiness("segelschule"); setActivePhase("vorher"); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${
              activeBusiness === "segelschule"
                ? "bg-cyan-500 text-white shadow-lg"
                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
            }`}
          >
            <Ship className="w-4 h-4" />
            Segelschule
          </button>
          <button
            onClick={() => { setActiveBusiness("haus"); setActivePhase("vorher"); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${
              activeBusiness === "haus"
                ? "bg-purple-500 text-white shadow-lg"
                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
            }`}
          >
            <Home className="w-4 h-4" />
            Haff Erleben
          </button>
        </div>
      </div>

      {/* Phase Selector - Three Equal Tiles */}
      <div className="grid grid-cols-3 gap-4 px-4">
        {(["vorher", "waehrend", "nachher"] as const).map((phase) => {
          const phaseData = content[phase];
          const isActive = activePhase === phase;
          const phaseColors = colorClasses[phaseData.color as keyof typeof colorClasses];

          return (
            <button
              key={phase}
              onClick={() => setActivePhase(phase)}
              className={`relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl transition-all duration-300 min-h-[140px] ${
                isActive
                  ? `${phaseColors.bg} ${phaseColors.border} border-2`
                  : "bg-slate-800/50 border border-slate-700 hover:bg-slate-700/50"
              }`}
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl ${
                isActive ? phaseColors.text : "text-slate-500"
              } ${isActive ? phaseColors.bg : "bg-slate-700"}`}>
                {phase === "vorher" ? "1" : phase === "waehrend" ? "2" : "3"}
              </div>
              <span className={`text-sm font-semibold ${isActive ? phaseColors.text : "text-slate-400"}`}>
                {phaseData.title}
              </span>
              <span className="text-xs text-slate-500 text-center">{phaseData.subtitle}</span>
            </button>
          );
        })}
      </div>

      {/* Progress Bar Below Tiles */}
      <div className="px-4">
        <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-500 transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 px-2">
          <span className="text-xs text-emerald-400">Start</span>
          <span className="text-xs text-cyan-400">Erlebnis</span>
          <span className="text-xs text-purple-400">Danach</span>
        </div>
      </div>

      {/* Active Phase Content - Alternating Layout */}
      <div className={`${colors.light} rounded-2xl p-6 md:p-8 border ${colors.border} transition-all duration-300`}>
        <p className="text-slate-300 text-center mb-10 max-w-2xl mx-auto">
          {currentPhase.description}
        </p>

        <div className="space-y-12">
          {currentPhase.items.map((item, idx) => {
            const isEven = idx % 2 === 0;

            return (
              <div
                key={idx}
                className={`flex flex-col ${isEven ? "md:flex-row" : "md:flex-row-reverse"} gap-6 md:gap-10 items-center`}
              >
                {/* Text Content */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h4 className="text-xl font-bold text-white">{item.title}</h4>
                    <span className={`text-xs font-semibold ${colors.text} ${colors.bg} px-3 py-1 rounded-full`}>
                      {item.impact}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>{item.timing}</span>
                  </div>
                  {"description" in item && item.description && (
                    <p className="text-slate-300">{item.description}</p>
                  )}
                </div>

                {/* Visual Content - Emails or Mockups */}
                <div className="flex-1 w-full">
                  {"emails" in item && item.emails && (
                    <div className="space-y-3">
                      {item.emails.map((email, emailIdx) => (
                        <div key={emailIdx} className="bg-slate-900/70 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-all">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${colors.bg}`}>
                              <span className={colors.text}>{email.icon}</span>
                            </div>
                            <div className="flex-1">
                              <div className="text-xs text-slate-500">{email.day}</div>
                              <div className="font-semibold text-white text-sm">{email.subject}</div>
                            </div>
                          </div>
                          <p className="text-slate-400 text-sm pl-12 leading-relaxed">{email.preview}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {"mockup" in item && item.mockup && (
                    <div className="bg-slate-900/70 rounded-xl p-5 border border-slate-700">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex gap-1">
                          <div className="w-3 h-3 rounded-full bg-red-500/50" />
                          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                          <div className="w-3 h-3 rounded-full bg-green-500/50" />
                        </div>
                        <span className="text-slate-400 text-xs ml-2">{item.mockup.title}</span>
                      </div>
                      <div className="space-y-2">
                        {item.mockup.items.map((mockItem, mockIdx) => (
                          <div key={mockIdx} className={`text-sm ${mockItem.startsWith("→") || mockItem.startsWith("☑") ? colors.text : mockItem.startsWith("☐") ? "text-slate-500" : "text-slate-300"} ${mockItem.startsWith("→") ? "pl-4" : ""}`}>
                            {mockItem}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700">
        <h4 className="font-semibold text-white text-center mb-6">
          Zusammengefasst: Was diese Systeme für {activeBusiness === "segelschule" ? "die Segelschule" : "Haff Erleben"} tun
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-slate-800/50 rounded-xl">
            <div className="text-2xl font-bold text-red-400">-50%</div>
            <div className="text-xs text-slate-500 mt-1">No-Shows</div>
          </div>
          <div className="text-center p-4 bg-slate-800/50 rounded-xl">
            <div className="text-2xl font-bold text-amber-400">+15%</div>
            <div className="text-xs text-slate-500 mt-1">{activeBusiness === "segelschule" ? "Upsells" : "Cross-Sells"}</div>
          </div>
          <div className="text-center p-4 bg-slate-800/50 rounded-xl">
            <div className="text-2xl font-bold text-emerald-400">+40%</div>
            <div className="text-xs text-slate-500 mt-1">Reviews</div>
          </div>
          <div className="text-center p-4 bg-slate-800/50 rounded-xl">
            <div className="text-2xl font-bold text-cyan-400">+30%</div>
            <div className="text-xs text-slate-500 mt-1">Wiederkommer</div>
          </div>
          <div className="text-center p-4 bg-slate-800/50 rounded-xl">
            <div className="text-2xl font-bold text-purple-400">+25%</div>
            <div className="text-xs text-slate-500 mt-1">Empfehlungen</div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl mt-6">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-emerald-400 font-medium text-sm">
            Alle Automationen sind im Website-Preis enthalten – kein Aufpreis
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MARKETING PACKAGES SELECTOR WITH DETAIL MODALS
// ============================================

function MarketingPackagesSection() {
  // Package selection state
  const [selectedPackages, setSelectedPackages] = useState<{
    seo: boolean;
    geo: boolean;
    ads: boolean;
  }>({
    seo: false,
    geo: false,
    ads: false,
  });

  // Modal state
  const [activeModal, setActiveModal] = useState<"seo" | "geo" | "ads" | null>(null);

  // Custom parameters for fine-tuning
  const [customParams, setCustomParams] = useState({
    adsMonthlyBudget: 400,
    adsCostPerClick: 0.80,
    adsConversionRate: 3,
  });

  // Package definitions
  const packages = {
    seo: {
      name: "SEO (Suchmaschinenoptimierung)",
      icon: <Search className="w-6 h-6 text-cyan-400" />,
      color: "cyan",
      monthlyPrice: 350,
      setupFee: 500,
      timeToResults: "4-6 Monate",
      description: "Nachhaltige Sichtbarkeit bei Google & Co.",
      features: [
        "Keyword-Recherche & Strategie",
        "On-Page Optimierung",
        "Technisches SEO",
        "Content-Erstellung (2 Artikel/Monat)",
        "Lokales SEO (Google Business Profile)",
        "Monatliches Reporting",
        "Backlink-Aufbau (Basis)",
      ],
      expectedBookingsYear: 15,
    },
    geo: {
      name: "GEO (AI-Sichtbarkeit)",
      icon: <Bot className="w-6 h-6 text-purple-400" />,
      color: "purple",
      monthlyPrice: 250,
      setupFee: 400,
      timeToResults: "2-4 Monate",
      description: "Gefunden werden von ChatGPT, Perplexity & Co.",
      features: [
        "AI-optimierte Inhalte",
        "Strukturierte Daten (Schema.org)",
        "FAQ & Knowledge-Base Aufbau",
        "Erwähnungen in AI-freundlichen Quellen",
        "Monitoring der AI-Sichtbarkeit",
        "Monatliches Reporting",
      ],
      expectedBookingsYear: 8,
      isNew: true,
    },
    ads: {
      name: "Bezahlte Werbung",
      icon: <Target className="w-6 h-6 text-orange-400" />,
      color: "orange",
      monthlyPrice: customParams.adsMonthlyBudget,
      setupFee: 300,
      timeToResults: "Sofort",
      description: "Sofortige Sichtbarkeit durch Anzeigen.",
      features: [
        "Kampagnen-Setup & Strategie",
        "Zielgruppen-Targeting",
        "Anzeigen-Erstellung",
        "A/B Testing",
        "Conversion-Tracking",
        "Wöchentliche Optimierung",
        "Monatliches Reporting",
      ],
      managementFee: 150, // Additional fee on top of ad spend
      expectedBookingsYear: Math.round((customParams.adsMonthlyBudget / customParams.adsCostPerClick) * (customParams.adsConversionRate / 100) * 12),
    },
  };

  // Calculate totals
  const totals = useMemo(() => {
    let monthlyTotal = 0;
    let setupTotal = 0;
    let yearlyBookings = 0;

    if (selectedPackages.seo) {
      monthlyTotal += packages.seo.monthlyPrice;
      setupTotal += packages.seo.setupFee;
      yearlyBookings += packages.seo.expectedBookingsYear;
    }
    if (selectedPackages.geo) {
      monthlyTotal += packages.geo.monthlyPrice;
      setupTotal += packages.geo.setupFee;
      yearlyBookings += packages.geo.expectedBookingsYear;
    }
    if (selectedPackages.ads) {
      monthlyTotal += packages.ads.monthlyPrice + packages.ads.managementFee;
      setupTotal += packages.ads.setupFee;
      yearlyBookings += packages.ads.expectedBookingsYear;
    }

    const yearlyTotal = monthlyTotal * 12 + setupTotal;
    const costPerBooking = yearlyBookings > 0 ? Math.round(yearlyTotal / yearlyBookings) : 0;

    return { monthlyTotal, setupTotal, yearlyTotal, yearlyBookings, costPerBooking };
  }, [selectedPackages, customParams]);

  const togglePackage = (pkg: "seo" | "geo" | "ads") => {
    setSelectedPackages(prev => ({ ...prev, [pkg]: !prev[pkg] }));
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-slate-700">
      <div className="flex items-center gap-3 mb-2">
        <Megaphone className="w-6 h-6 text-purple-400" />
        <h3 className="text-xl font-semibold text-white">Marketing-Optionen</h3>
        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">Zusatzleistung</span>
      </div>
      <p className="text-slate-400 text-sm mb-6">
        Wähle die Kanäle, die für dich Sinn machen. Klicke auf „Details" für technische Informationen.
      </p>

      {/* Important Note */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-400">Wichtig zu verstehen</div>
            <p className="text-sm text-slate-300 mt-1">
              Die Website allein macht dich nicht automatisch sichtbar. Marketing ist eine <strong>separate, laufende Investition</strong>.
              Wähle unten, was zu deinen Zielen passt.
            </p>
          </div>
        </div>
      </div>

      {/* Package Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {/* SEO Package */}
        <div
          className={`relative rounded-xl p-5 border-2 transition-all cursor-pointer ${
            selectedPackages.seo
              ? "bg-cyan-500/10 border-cyan-500"
              : "bg-slate-900/50 border-slate-700 hover:border-slate-600"
          }`}
          onClick={() => togglePackage("seo")}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {packages.seo.icon}
              <h4 className="font-semibold text-white text-sm">SEO</h4>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              selectedPackages.seo ? "bg-cyan-500 border-cyan-500" : "border-slate-600"
            }`}>
              {selectedPackages.seo && <CheckCircle2 className="w-4 h-4 text-white" />}
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-3">{packages.seo.description}</p>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Monatlich</span>
              <span className="text-white font-semibold">{packages.seo.monthlyPrice}€</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Setup (einmalig)</span>
              <span className="text-slate-300">{packages.seo.setupFee}€</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Erste Ergebnisse</span>
              <span className="text-cyan-400">{packages.seo.timeToResults}</span>
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); setActiveModal("seo"); }}
            className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-cyan-400 flex items-center justify-center gap-2 transition-colors"
          >
            <Info className="w-4 h-4" />
            Details & Technik
          </button>
        </div>

        {/* GEO Package */}
        <div
          className={`relative rounded-xl p-5 border-2 transition-all cursor-pointer ${
            selectedPackages.geo
              ? "bg-purple-500/10 border-purple-500"
              : "bg-slate-900/50 border-slate-700 hover:border-slate-600"
          }`}
          onClick={() => togglePackage("geo")}
        >
          <div className="absolute -top-2 -right-2 text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">
            Neu
          </div>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {packages.geo.icon}
              <h4 className="font-semibold text-white text-sm">GEO</h4>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              selectedPackages.geo ? "bg-purple-500 border-purple-500" : "border-slate-600"
            }`}>
              {selectedPackages.geo && <CheckCircle2 className="w-4 h-4 text-white" />}
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-3">{packages.geo.description}</p>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Monatlich</span>
              <span className="text-white font-semibold">{packages.geo.monthlyPrice}€</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Setup (einmalig)</span>
              <span className="text-slate-300">{packages.geo.setupFee}€</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Erste Ergebnisse</span>
              <span className="text-purple-400">{packages.geo.timeToResults}</span>
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); setActiveModal("geo"); }}
            className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-purple-400 flex items-center justify-center gap-2 transition-colors"
          >
            <Info className="w-4 h-4" />
            Details & Technik
          </button>
        </div>

        {/* Ads Package */}
        <div
          className={`relative rounded-xl p-5 border-2 transition-all cursor-pointer ${
            selectedPackages.ads
              ? "bg-orange-500/10 border-orange-500"
              : "bg-slate-900/50 border-slate-700 hover:border-slate-600"
          }`}
          onClick={() => togglePackage("ads")}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {packages.ads.icon}
              <h4 className="font-semibold text-white text-sm">Ads</h4>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              selectedPackages.ads ? "bg-orange-500 border-orange-500" : "border-slate-600"
            }`}>
              {selectedPackages.ads && <CheckCircle2 className="w-4 h-4 text-white" />}
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-3">{packages.ads.description}</p>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Werbebudget</span>
              <span className="text-white font-semibold">{customParams.adsMonthlyBudget}€/Mo</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">+ Management</span>
              <span className="text-slate-300">{packages.ads.managementFee}€/Mo</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Erste Ergebnisse</span>
              <span className="text-orange-400">{packages.ads.timeToResults}</span>
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); setActiveModal("ads"); }}
            className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-orange-400 flex items-center justify-center gap-2 transition-colors"
          >
            <Info className="w-4 h-4" />
            Details & Technik
          </button>
        </div>
      </div>

      {/* Ads Budget Slider (shown when ads selected) */}
      {selectedPackages.ads && (
        <div className="p-4 bg-slate-900/30 rounded-xl mb-6">
          <h4 className="text-sm font-semibold text-white mb-3">Werbebudget anpassen</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400">Monatliches Werbebudget</label>
              <input
                type="range"
                min="200"
                max="2000"
                step="100"
                value={customParams.adsMonthlyBudget}
                onChange={(e) => setCustomParams(prev => ({ ...prev, adsMonthlyBudget: Number(e.target.value) }))}
                className="w-full mt-1"
              />
              <div className="text-right text-xs text-orange-400">{customParams.adsMonthlyBudget}€</div>
            </div>
            <div>
              <label className="text-xs text-slate-400">Kosten pro Klick (geschätzt)</label>
              <input
                type="range"
                min="0.4"
                max="2.5"
                step="0.1"
                value={customParams.adsCostPerClick}
                onChange={(e) => setCustomParams(prev => ({ ...prev, adsCostPerClick: Number(e.target.value) }))}
                className="w-full mt-1"
              />
              <div className="text-right text-xs text-slate-400">{customParams.adsCostPerClick.toFixed(2)}€</div>
            </div>
            <div>
              <label className="text-xs text-slate-400">Conversion Rate (geschätzt)</label>
              <input
                type="range"
                min="1"
                max="8"
                step="0.5"
                value={customParams.adsConversionRate}
                onChange={(e) => setCustomParams(prev => ({ ...prev, adsConversionRate: Number(e.target.value) }))}
                className="w-full mt-1"
              />
              <div className="text-right text-xs text-emerald-400">{customParams.adsConversionRate}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Total Summary */}
      {(selectedPackages.seo || selectedPackages.geo || selectedPackages.ads) ? (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-orange-500/10 rounded-xl p-5 border border-cyan-500/20">
            <h4 className="font-semibold text-white mb-4">Deine Auswahl</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-slate-400 text-xs">Setup (einmalig)</div>
                <div className="text-white font-bold text-lg">{totals.setupTotal.toLocaleString("de-DE")}€</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs">Monatlich</div>
                <div className="text-white font-bold text-lg">{totals.monthlyTotal.toLocaleString("de-DE")}€</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs">Erwartete Buchungen/Jahr</div>
                <div className="text-emerald-400 font-bold text-lg">~{totals.yearlyBookings}</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs">Ø Kosten/Buchung</div>
                <div className="text-amber-400 font-bold text-lg">~{totals.costPerBooking}€</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Erstes Jahr (Setup + 12× Monatlich)</span>
                <span className="text-xl font-bold text-white">{totals.yearlyTotal.toLocaleString("de-DE")}€</span>
              </div>
            </div>
          </div>

          {/* LTV:CAC Impact Section - HERO DISPLAY */}
          <div className="bg-gradient-to-br from-emerald-500/20 via-cyan-500/10 to-purple-500/10 rounded-2xl p-6 md:p-8 border border-emerald-500/30 relative overflow-hidden">
            {/* Background glow effect */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-lg">Auswirkung auf deinen ROI</h4>
                  <p className="text-slate-400 text-sm">So verbessert Marketing dein LTV:CAC Verhältnis</p>
                </div>
              </div>

              {(() => {
                // Calculate LTV:CAC impact
                // Base values (from LTVCACCalculator defaults)
                const baseLTV = 66000; // Combined LTV without marketing
                const baseCAC = 15000; // Website investment
                const baseRatio = baseLTV / baseCAC;

                // With marketing: More customers = more LTV, but also higher CAC
                const avgCustomerValue = 550 + 180 * 2.5; // Segelschule + Haus combined avg
                const additionalLTV = totals.yearlyBookings * avgCustomerValue * 1.35; // 35% upsell/repeat factor
                const newLTV = baseLTV + additionalLTV;
                const newCAC = baseCAC + totals.yearlyTotal;
                const newRatio = newLTV / newCAC;

                const ratioImprovement = ((newRatio - baseRatio) / baseRatio) * 100;
                const ltvIncrease = ((newLTV - baseLTV) / baseLTV) * 100;
                const isImproved = newRatio > baseRatio;

                return (
                  <div className="space-y-6">
                    {/* HERO: Big Improvement Percentage */}
                    {isImproved && (
                      <div className="text-center py-6 bg-gradient-to-r from-emerald-500/10 via-emerald-500/20 to-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <div className="flex items-center justify-center gap-3 mb-2">
                          <ArrowUp className="w-8 h-8 text-emerald-400 animate-bounce" />
                          <span className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 tabular-nums transition-all duration-500">
                            +{ratioImprovement.toFixed(0)}%
                          </span>
                        </div>
                        <div className="text-emerald-300 font-semibold text-lg">LTV:CAC Verbesserung</div>
                        <div className="text-slate-400 text-sm mt-1">durch deine Marketing-Auswahl</div>
                      </div>
                    )}

                    {/* Before vs After Cards */}
                    <div className="grid md:grid-cols-3 gap-4">
                      {/* Before */}
                      <div className="bg-slate-900/60 rounded-xl p-5 border border-slate-700">
                        <div className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-3">Ohne Marketing</div>
                        <div className="text-3xl font-bold text-slate-400 mb-1">{baseRatio.toFixed(1)}x</div>
                        <div className="text-xs text-slate-500">LTV:CAC Ratio</div>
                        <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">LTV</span>
                            <span className="text-slate-400">{baseLTV.toLocaleString("de-DE")}€</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">CAC</span>
                            <span className="text-slate-400">{baseCAC.toLocaleString("de-DE")}€</span>
                          </div>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="hidden md:flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                          <ArrowRight className="w-8 h-8 text-emerald-400" />
                          <div className="text-xs text-emerald-400 font-medium">Marketing</div>
                        </div>
                      </div>

                      {/* After */}
                      <div className="bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 rounded-xl p-5 border-2 border-emerald-500/50 relative">
                        <div className="absolute -top-3 -right-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                          NEU
                        </div>
                        <div className="text-emerald-400 text-xs font-medium uppercase tracking-wider mb-3">Mit Marketing</div>
                        <div className={`text-4xl font-black mb-1 transition-all duration-500 ${
                          newRatio >= 3 ? "text-emerald-400" : newRatio >= 2 ? "text-amber-400" : "text-red-400"
                        }`}>
                          {newRatio.toFixed(1)}x
                        </div>
                        <div className="text-xs text-emerald-300/80">LTV:CAC Ratio</div>
                        <div className="mt-3 pt-3 border-t border-emerald-500/30 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-emerald-300/60">LTV</span>
                            <span className="text-emerald-300 font-semibold">{Math.round(newLTV).toLocaleString("de-DE")}€</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-emerald-300/60">CAC</span>
                            <span className="text-emerald-300">{Math.round(newCAC).toLocaleString("de-DE")}€</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Additional LTV Increase Highlight */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-slate-900/40 rounded-xl p-4 border border-slate-700/50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-cyan-500/20 rounded-lg">
                            <Users className="w-5 h-5 text-cyan-400" />
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-cyan-400">+{totals.yearlyBookings}</div>
                            <div className="text-xs text-slate-400">Zusätzliche Buchungen/Jahr</div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-slate-900/40 rounded-xl p-4 border border-slate-700/50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-500/20 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-purple-400" />
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-purple-400">+{ltvIncrease.toFixed(0)}%</div>
                            <div className="text-xs text-slate-400">Mehr Lifetime Value</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>LTV:CAC Ratio</span>
                        <span className={newRatio >= 3 ? "text-emerald-400 font-semibold" : newRatio >= 2 ? "text-amber-400" : "text-red-400"}>
                          {newRatio >= 3 ? "Exzellent" : newRatio >= 2 ? "Gut" : "Verbesserungswürdig"}
                        </span>
                      </div>
                      <div className="relative h-6 bg-slate-800 rounded-full overflow-hidden">
                        {/* Base ratio (ghost) */}
                        <div
                          className="absolute inset-y-0 left-0 bg-slate-700/50 rounded-full"
                          style={{ width: `${Math.min((baseRatio / 6) * 100, 100)}%` }}
                        />
                        {/* New ratio (animated) */}
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${
                            newRatio >= 3 ? "bg-gradient-to-r from-emerald-600 via-emerald-500 to-cyan-400" :
                            newRatio >= 2 ? "bg-gradient-to-r from-amber-600 to-amber-400" :
                            "bg-gradient-to-r from-red-600 to-red-400"
                          }`}
                          style={{ width: `${Math.min((newRatio / 6) * 100, 100)}%` }}
                        >
                          {/* Shimmer effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                        </div>
                        {/* Markers */}
                        <div className="absolute inset-y-0 left-[33.3%] w-0.5 bg-slate-600/50" />
                        <div className="absolute inset-y-0 left-[50%] w-0.5 bg-slate-600/50" />
                        {/* Current value indicator */}
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-emerald-400 transition-all duration-700"
                          style={{ left: `calc(${Math.min((newRatio / 6) * 100, 100)}% - 8px)` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>0x</span>
                        <span>2x</span>
                        <span>3x</span>
                        <span>6x+</span>
                      </div>
                    </div>

                    {/* Explanation */}
                    <div className="bg-slate-900/30 rounded-xl p-4 border border-slate-700/50">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-slate-300">
                          <strong className="text-white">Das Prinzip:</strong> Marketing erhöht deinen CAC (Kundenakquisitionskosten),
                          aber jeder neue Kunde generiert durch das automatisierte System mehr Umsatz (Upsells, Wiederkehrer, Empfehlungen).
                          {isImproved ? (
                            <span className="text-emerald-400 font-medium"> Das System macht jeden Marketing-Euro wertvoller!</span>
                          ) : (
                            <span className="text-amber-400"> Die Buchungen müssen den höheren CAC rechtfertigen.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500">
          <p>Wähle oben mindestens eine Option, um die Kosten zu sehen.</p>
        </div>
      )}

      {/* === DETAIL MODALS === */}

      {/* SEO Detail Modal */}
      <DetailModal
        isOpen={activeModal === "seo"}
        onClose={() => setActiveModal(null)}
        title="SEO im Detail"
        icon={<Search className="w-6 h-6 text-cyan-400" />}
      >
        <div className="space-y-6">
          {/* What is SEO */}
          <div>
            <h4 className="font-semibold text-white mb-2">Was ist SEO?</h4>
            <p className="text-slate-300 text-sm">
              SEO (Search Engine Optimization) sorgt dafür, dass deine Website bei Google, Bing und anderen
              Suchmaschinen gefunden wird, wenn jemand nach „Segelschule Ostsee" oder „Ferienwohnung Haff" sucht.
            </p>
          </div>

          {/* Technical Breakdown */}
          <div>
            <h4 className="font-semibold text-white mb-3">Was wir technisch machen</h4>
            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileSearch className="w-4 h-4 text-cyan-400" />
                  <span className="font-medium text-white text-sm">Keyword-Recherche</span>
                </div>
                <p className="text-xs text-slate-400">
                  Wir finden heraus, wonach deine Zielgruppe sucht: „SBF Binnen Kurs", „Segelschein machen",
                  „Urlaub am Stettiner Haff", etc. Diese Keywords werden strategisch in deine Inhalte eingebaut.
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span className="font-medium text-white text-sm">On-Page Optimierung</span>
                </div>
                <p className="text-xs text-slate-400">
                  Titel, Meta-Beschreibungen, Überschriften, Bildtexte – alles wird so optimiert, dass Google
                  versteht, worum es auf deiner Seite geht. Technisch sauber, für Menschen lesbar.
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span className="font-medium text-white text-sm">Technisches SEO</span>
                </div>
                <p className="text-xs text-slate-400">
                  Ladezeiten optimieren, Mobile-Friendliness, XML-Sitemaps, strukturierte Daten (Schema.org),
                  Core Web Vitals. Google belohnt schnelle, gut strukturierte Websites.
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <PenTool className="w-4 h-4 text-cyan-400" />
                  <span className="font-medium text-white text-sm">Content-Erstellung</span>
                </div>
                <p className="text-xs text-slate-400">
                  2 SEO-optimierte Blogartikel pro Monat: „Die 5 häufigsten Fehler beim Segelschein",
                  „Warum das Stettiner Haff perfekt für Anfänger ist", etc. Bringt Traffic und baut Autorität auf.
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <span className="font-medium text-white text-sm">Lokales SEO</span>
                </div>
                <p className="text-xs text-slate-400">
                  Google Business Profile optimieren, lokale Verzeichnisse, Bewertungsmanagement.
                  Wenn jemand in der Nähe sucht, erscheinst du ganz oben.
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="w-4 h-4 text-cyan-400" />
                  <span className="font-medium text-white text-sm">Backlink-Aufbau (Basis)</span>
                </div>
                <p className="text-xs text-slate-400">
                  Links von anderen Websites zu deiner Seite = Vertrauenssignal für Google.
                  Wir bauen qualitative Verlinkungen auf (keine Spam-Links).
                </p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h4 className="font-semibold text-white mb-3">Zeitlicher Ablauf</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-semibold">1</div>
                <div><span className="text-white">Monat 1:</span> <span className="text-slate-400">Setup, Keyword-Recherche, technische Optimierung</span></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-semibold">2</div>
                <div><span className="text-white">Monat 2-3:</span> <span className="text-slate-400">On-Page Optimierung, erste Inhalte, lokales SEO</span></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-semibold">3</div>
                <div><span className="text-white">Monat 4-6:</span> <span className="text-slate-400">Erste Rankings sichtbar, kontinuierliche Optimierung</span></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-semibold">✓</div>
                <div><span className="text-white">Ab Monat 6:</span> <span className="text-slate-400">Stabiler Traffic, messbare Buchungen</span></div>
              </div>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div>
            <h4 className="font-semibold text-white mb-3">Kostenaufschlüsselung</h4>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Setup (einmalig)</span>
                  <span className="text-white">{packages.seo.setupFee}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Monatliche Betreuung</span>
                  <span className="text-white">{packages.seo.monthlyPrice}€</span>
                </div>
                <div className="pt-2 border-t border-slate-700 flex justify-between">
                  <span className="text-slate-300">Erstes Jahr gesamt</span>
                  <span className="text-cyan-400 font-semibold">{(packages.seo.setupFee + packages.seo.monthlyPrice * 12).toLocaleString("de-DE")}€</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DetailModal>

      {/* GEO Detail Modal */}
      <DetailModal
        isOpen={activeModal === "geo"}
        onClose={() => setActiveModal(null)}
        title="GEO im Detail"
        icon={<Bot className="w-6 h-6 text-purple-400" />}
      >
        <div className="space-y-6">
          {/* What is GEO */}
          <div>
            <h4 className="font-semibold text-white mb-2">Was ist GEO?</h4>
            <p className="text-slate-300 text-sm">
              GEO (Generative Engine Optimization) ist die nächste Evolution nach SEO. Immer mehr Menschen
              fragen KI-Assistenten wie ChatGPT, Perplexity oder Claude: „Wo kann ich in der Nähe von Berlin
              segeln lernen?" – und die KI empfiehlt Anbieter basierend auf verfügbaren Informationen.
            </p>
          </div>

          {/* Why it matters */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-purple-400 mb-2">Warum ist das wichtig?</h4>
            <ul className="text-sm text-slate-300 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <span>30% der Gen Z nutzen TikTok/KI statt Google für Suchanfragen (Tendenz steigend)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <span>ChatGPT hat 200+ Millionen wöchentliche Nutzer</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <span>Wer jetzt optimiert, hat einen First-Mover-Vorteil</span>
              </li>
            </ul>
          </div>

          {/* Technical Breakdown */}
          <div>
            <h4 className="font-semibold text-white mb-3">Was wir technisch machen</h4>
            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span className="font-medium text-white text-sm">Strukturierte Daten (Schema.org)</span>
                </div>
                <p className="text-xs text-slate-400">
                  Wir implementieren umfassende Schema-Markups: LocalBusiness, Course, Event, FAQPage, Review.
                  Das hilft KI-Systemen, dein Angebot korrekt zu verstehen und einzuordnen.
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-purple-400" />
                  <span className="font-medium text-white text-sm">FAQ-Optimierung</span>
                </div>
                <p className="text-xs text-slate-400">
                  Umfangreiche FAQ-Seiten mit natürlich formulierten Fragen und Antworten.
                  KI-Systeme lieben gut strukturierte Q&A-Inhalte.
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <PenTool className="w-4 h-4 text-purple-400" />
                  <span className="font-medium text-white text-sm">KI-optimierte Inhalte</span>
                </div>
                <p className="text-xs text-slate-400">
                  Texte, die sowohl für Menschen lesbar als auch für KI-Systeme gut parsebar sind.
                  Klare Fakten, strukturierte Informationen, verifizierbare Details.
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-purple-400" />
                  <span className="font-medium text-white text-sm">Präsenz in KI-freundlichen Quellen</span>
                </div>
                <p className="text-xs text-slate-400">
                  Wikipedia-artige Quellen, Branchenverzeichnisse, lokale Portale – überall dort,
                  wo KI-Systeme ihre Informationen herziehen.
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-purple-400" />
                  <span className="font-medium text-white text-sm">KI-Sichtbarkeits-Monitoring</span>
                </div>
                <p className="text-xs text-slate-400">
                  Wir tracken, ob und wie ChatGPT, Perplexity & Co. dein Business erwähnen.
                  Monatliche Reports zeigen die Entwicklung.
                </p>
              </div>
            </div>
          </div>

          {/* Example */}
          <div>
            <h4 className="font-semibold text-white mb-3">Beispiel: Was passiert bei einer KI-Anfrage?</h4>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="mb-3">
                <div className="text-xs text-purple-400 mb-1">Nutzer fragt ChatGPT:</div>
                <p className="text-sm text-white italic">"Wo kann ich in der Nähe von Berlin segeln lernen? Am liebsten in einer ruhigen Gegend."</p>
              </div>
              <div>
                <div className="text-xs text-emerald-400 mb-1">Optimierte Antwort könnte sein:</div>
                <p className="text-sm text-slate-300">
                  "Eine empfehlenswerte Option ist die Segelschule am Stettiner Haff. Sie bietet SBF-Binnen-Kurse
                  auf einem Plattbodenschiff in einer besonders ruhigen, naturbelassenen Umgebung. Die Anfahrt
                  von Berlin dauert etwa 2 Stunden..."
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div>
            <h4 className="font-semibold text-white mb-3">Kostenaufschlüsselung</h4>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Setup (einmalig)</span>
                  <span className="text-white">{packages.geo.setupFee}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Monatliche Betreuung</span>
                  <span className="text-white">{packages.geo.monthlyPrice}€</span>
                </div>
                <div className="pt-2 border-t border-slate-700 flex justify-between">
                  <span className="text-slate-300">Erstes Jahr gesamt</span>
                  <span className="text-purple-400 font-semibold">{(packages.geo.setupFee + packages.geo.monthlyPrice * 12).toLocaleString("de-DE")}€</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DetailModal>

      {/* Ads Detail Modal */}
      <DetailModal
        isOpen={activeModal === "ads"}
        onClose={() => setActiveModal(null)}
        title="Bezahlte Werbung im Detail"
        icon={<Target className="w-6 h-6 text-orange-400" />}
      >
        <div className="space-y-6">
          {/* What are Ads */}
          <div>
            <h4 className="font-semibold text-white mb-2">Was ist bezahlte Werbung?</h4>
            <p className="text-slate-300 text-sm">
              Mit bezahlter Werbung (Paid Ads) schaltest du Anzeigen auf Plattformen wie Facebook, Instagram
              und Google. Du zahlst pro Klick oder Impression und erreichst sofort deine Zielgruppe.
            </p>
          </div>

          {/* Platforms */}
          <div>
            <h4 className="font-semibold text-white mb-3">Plattformen & Einsatzbereiche</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">f</div>
                  <span className="font-medium text-white text-sm">Facebook & Instagram</span>
                </div>
                <p className="text-xs text-slate-400">
                  Ideal für: Emotionale Ansprache, Lifestyle-Content, Reichweite.
                  Gut für Haff Erleben (Urlaubsgefühl) und Segelschule (Abenteuer).
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center text-white text-xs font-bold">G</div>
                  <span className="font-medium text-white text-sm">Google Ads</span>
                </div>
                <p className="text-xs text-slate-400">
                  Ideal für: Nutzer mit konkreter Suchintention.
                  "SBF Kurs buchen", "Ferienwohnung Stettiner Haff".
                </p>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div>
            <h4 className="font-semibold text-white mb-3">Wie es funktioniert</h4>
            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-orange-400" />
                  <span className="font-medium text-white text-sm">Zielgruppen-Targeting</span>
                </div>
                <p className="text-xs text-slate-400">
                  Wir definieren genau, wer deine Anzeigen sieht: Alter, Interessen (Segeln, Wassersport, Natururlaub),
                  Standort (z.B. Berlin, Hamburg), Verhalten (kürzlich nach Segelkursen gesucht).
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <PenTool className="w-4 h-4 text-orange-400" />
                  <span className="font-medium text-white text-sm">Anzeigen-Erstellung</span>
                </div>
                <p className="text-xs text-slate-400">
                  Wir erstellen ansprechende Anzeigen: Texte, Bilder, Videos.
                  Mehrere Varianten zum Testen, was am besten funktioniert.
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart2 className="w-4 h-4 text-orange-400" />
                  <span className="font-medium text-white text-sm">Optimierung & Reporting</span>
                </div>
                <p className="text-xs text-slate-400">
                  Wöchentliche Anpassungen basierend auf Performance. Monatliche Reports mit allen
                  wichtigen Zahlen: Klicks, Kosten, Buchungen, ROI.
                </p>
              </div>
            </div>
          </div>

          {/* Example Calculation */}
          <div>
            <h4 className="font-semibold text-white mb-3">Beispielrechnung</h4>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Monatliches Budget</span>
                  <span className="text-white">400€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ø Kosten pro Klick</span>
                  <span className="text-white">0,80€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">= Klicks pro Monat</span>
                  <span className="text-orange-400">~500</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ø Conversion Rate</span>
                  <span className="text-white">3%</span>
                </div>
                <div className="pt-2 border-t border-slate-700 flex justify-between">
                  <span className="text-slate-300">= Buchungen pro Monat</span>
                  <span className="text-emerald-400 font-semibold">~15</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div>
            <h4 className="font-semibold text-white mb-3">Kostenaufschlüsselung</h4>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Setup (einmalig)</span>
                  <span className="text-white">{packages.ads.setupFee}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Werbebudget (dein Wert oben)</span>
                  <span className="text-white">{customParams.adsMonthlyBudget}€/Mo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Management-Fee</span>
                  <span className="text-white">{packages.ads.managementFee}€/Mo</span>
                </div>
                <div className="pt-2 border-t border-slate-700 flex justify-between">
                  <span className="text-slate-300">Erstes Jahr gesamt</span>
                  <span className="text-orange-400 font-semibold">
                    {(packages.ads.setupFee + (customParams.adsMonthlyBudget + packages.ads.managementFee) * 12).toLocaleString("de-DE")}€
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                * Das Werbebudget geht direkt an die Plattform (Facebook/Google). Die Management-Fee ist unsere Leistung.
              </p>
            </div>
          </div>
        </div>
      </DetailModal>
    </div>
  );
}

// ============================================
// PRICING SECTION - 3 Options
// ============================================

function PricingSection() {
  const [selectedOption, setSelectedOption] = useState<string>("combined");

  const options: PricingOption[] = [
    {
      id: "segelschule",
      title: "Segelschule",
      subtitle: "Fokussierter Start",
      price: 8500,
      features: [
        "Brand Identity (Logo, Farben, Schriften)",
        "Responsive Website (Mobile-first)",
        "Buchungssystem mit Kalender",
        "Automatische Rechnungsstellung",
        "E-Mail-Benachrichtigungen",
        "4 Sprachen (DE, EN, NL, CH)",
        "SEO-Grundstruktur*",
        "1 Jahr Hosting inklusive",
        "90 Tage Support nach Launch",
      ],
    },
    {
      id: "haus",
      title: "Haff Erleben",
      subtitle: "Das Haus mit Angeboten",
      price: 8500,
      features: [
        "Brand Identity (Logo, Farben, Schriften)",
        "Responsive Website (Mobile-first)",
        "Buchungssystem für Übernachtungen",
        "Automatische Rechnungsstellung",
        "E-Mail-Benachrichtigungen",
        "4 Sprachen (DE, EN, NL, CH)",
        "SEO-Grundstruktur*",
        "1 Jahr Hosting inklusive",
        "90 Tage Support nach Launch",
      ],
    },
    {
      id: "combined",
      title: "Komplett-Paket",
      subtitle: "Segelschule + Haff Erleben",
      price: 15000,
      originalPrice: 17000,
      savings: 2000,
      highlighted: true,
      badge: "Empfohlen",
      features: [
        "Alles aus beiden Einzelpaketen",
        "Gemeinsames Buchungssystem",
        "Cross-Selling Features",
        "Paket-Buchungen (Segeln + Übernachtung)",
        "Einheitliches Brand-System",
        "Erweiterte Analytics",
        "Prioritäts-Support",
        "Strategieberatung (2h)",
      ],
    },
  ];

  return (
    <div>
      <div className="grid md:grid-cols-3 gap-6">
        {options.map((option) => (
          <div
            key={option.id}
            onClick={() => setSelectedOption(option.id)}
            className={`relative cursor-pointer rounded-2xl p-6 transition-all duration-300 ${
              option.highlighted
                ? "bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border-2 border-cyan-500/50"
                : "bg-slate-800/50 border border-slate-700 hover:border-slate-600"
            } ${selectedOption === option.id ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900" : ""}`}
          >
            {option.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-xs font-semibold px-4 py-1 rounded-full">
                {option.badge}
              </div>
            )}

            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto mb-3 bg-slate-700/50 rounded-xl flex items-center justify-center">
                {option.id === "segelschule" ? <Ship className="w-6 h-6 text-cyan-400" /> :
                 option.id === "haus" ? <Home className="w-6 h-6 text-amber-400" /> :
                 <Sparkles className="w-6 h-6 text-purple-400" />}
              </div>
              <h3 className="text-xl font-bold text-white">{option.title}</h3>
              <p className="text-slate-400 text-sm">{option.subtitle}</p>
            </div>

            <div className="text-center mb-6">
              {option.originalPrice && (
                <div className="text-slate-500 line-through text-lg">
                  {option.originalPrice.toLocaleString("de-DE")}€
                </div>
              )}
              <div className="text-4xl font-bold text-white">
                {option.price.toLocaleString("de-DE")}€
              </div>
              {option.savings && (
                <div className="text-emerald-400 text-sm mt-1">
                  Du sparst {option.savings.toLocaleString("de-DE")}€
                </div>
              )}
            </div>

            <ul className="space-y-3">
              {option.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300 text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 pt-6 border-t border-slate-700">
              <div className={`w-full py-3 rounded-xl text-center font-semibold transition-all ${
                selectedOption === option.id
                  ? "bg-cyan-500 text-white"
                  : "bg-slate-700 text-slate-300"
              }`}>
                {selectedOption === option.id ? "Ausgewählt" : "Auswählen"}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Clarification */}
      <div className="mt-6 p-4 bg-slate-800/30 rounded-xl border border-slate-700">
        <p className="text-sm text-slate-400">
          <span className="text-white">*SEO-Grundstruktur:</span> Die Website wird technisch SEO-optimiert gebaut
          (schnelle Ladezeiten, sauberer Code, Meta-Tags, strukturierte Daten). Laufende SEO-Arbeit
          (Content, Backlinks, Monitoring) ist eine separate Leistung.
        </p>
      </div>
    </div>
  );
}

// ============================================
// TIMELINE SECTION
// ============================================

function TimelineSection() {
  const segelschuleMilestones: Milestone[] = [
    {
      week: "Woche 1",
      title: "Discovery & Brand",
      description: "Wir tauchen ein in deine Vision für die Segelschule.",
      deliverables: [
        "Kick-off Workshop (online)",
        "Markenanalyse & Positionierung",
        "Logo-Entwürfe (3 Varianten)",
        "Farbpalette & Typografie",
      ],
    },
    {
      week: "Woche 2-3",
      title: "Design & Struktur",
      description: "Die visuelle Welt der Segelschule nimmt Form an.",
      deliverables: [
        "Wireframes aller Seiten",
        "Mobile-first Designs",
        "Bildsprache & Fotoselektion",
        "Content-Struktur für Kurse",
      ],
    },
    {
      week: "Woche 3-4",
      title: "Entwicklung",
      description: "Code wird geschrieben, Buchungssystem entsteht.",
      deliverables: [
        "Website-Entwicklung",
        "Kursbuchungssystem",
        "Rechnungssystem (B2C & B2B)",
        "E-Mail-Automatisierung (Vorher/Nachher)",
      ],
    },
    {
      week: "Woche 5",
      title: "Content & Feinschliff",
      description: "Texte, Bilder, Details.",
      deliverables: [
        "Content-Einpflege",
        "SEO-Grundoptimierung",
        "Mehrsprachigkeit (DE, EN, NL)",
        "Performance-Tuning",
      ],
    },
    {
      week: "Woche 6",
      title: "Launch Segelschule",
      description: "Die Segelschule geht live.",
      deliverables: [
        "Finaler Test",
        "DNS-Umstellung",
        "Go-Live Segelschule",
        "Übergabe & Einweisung",
      ],
    },
  ];

  const hausMilestones: Milestone[] = [
    {
      week: "Woche 7",
      title: "Haus-Konzept",
      description: "Das Haus als Ort der Offenheit digital übersetzen.",
      deliverables: [
        "Konzept-Workshop Haus & Walking",
        "Design-Adaption für Haus-Website",
        "Bildsprache: Stille & Ankommen",
        "Kathrin's Walking-Angebot integrieren",
      ],
    },
    {
      week: "Woche 8-9",
      title: "Design & Entwicklung",
      description: "Die Haus-Präsenz entsteht.",
      deliverables: [
        "Haus-spezifische Seiten",
        "Unterkunft-Buchungssystem",
        "Walking-Buchungsintegration",
        "Cross-Selling Segelschule ↔ Haus",
      ],
    },
    {
      week: "Woche 10",
      title: "Ökosystem-Verbindung",
      description: "Segelschule und Haus werden vernetzt.",
      deliverables: [
        "Paket-Buchungen (Segeln + Übernachtung)",
        "Intelligente Empfehlungen",
        "Gemeinsame Newsletter-Automatisierung",
        "Digital Concierge Setup",
      ],
    },
    {
      week: "Woche 11",
      title: "Content & Walking",
      description: "Inhalte und Walking-Bereich fertigstellen.",
      deliverables: [
        "Haus-Content einpflegen",
        "Walking-Beschreibungen & Buchung",
        "Geheimtipps für Gäste",
        "Mehrsprachigkeit",
      ],
    },
    {
      week: "Woche 12",
      title: "Launch Haus",
      description: "Das Haus geht live – das Ökosystem ist komplett.",
      deliverables: [
        "Finaler Test Gesamtsystem",
        "Go-Live Haus",
        "Cross-Selling aktivieren",
        "Übergabe & Schulung",
      ],
    },
  ];

  return (
    <div className="relative">
      {/* Phase 1: Segelschule */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <Ship className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Phase 1: Segelschule</h3>
            <p className="text-sm text-slate-400">Woche 1-6</p>
          </div>
        </div>

        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500 via-cyan-400 to-cyan-500" />

          <div className="space-y-8">
            {segelschuleMilestones.map((milestone, idx) => (
              <div
                key={idx}
                className={`relative flex flex-col md:flex-row gap-4 md:gap-8 ${
                  idx % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Dot */}
                <div className="absolute left-4 md:left-1/2 w-3 h-3 bg-cyan-400 rounded-full -translate-x-1/2 ring-4 ring-slate-900 z-10" />

                {/* Content */}
                <div className={`ml-10 md:ml-0 md:w-1/2 ${idx % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"}`}>
                  <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-5 border border-cyan-700/30">
                    <div className="text-cyan-400 text-sm font-semibold mb-1">{milestone.week}</div>
                    <h4 className="text-lg font-bold text-white mb-2">{milestone.title}</h4>
                    <p className="text-slate-400 text-sm mb-4">{milestone.description}</p>
                    <ul className={`space-y-2 ${idx % 2 === 0 ? "md:text-right" : ""}`}>
                      {milestone.deliverables.map((item, i) => (
                        <li key={i} className={`flex items-center gap-2 text-sm text-slate-300 ${idx % 2 === 0 ? "md:flex-row-reverse" : ""}`}>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="relative flex items-center justify-center my-12">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-700" />
        </div>
        <div className="relative px-4 py-2 bg-slate-900 rounded-full border border-slate-700">
          <span className="text-sm text-slate-400">Segelschule live</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-400 inline-block ml-2" />
        </div>
      </div>

      {/* Phase 2: Haus */}
      <div className="mt-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Home className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Phase 2: Haus & Walking</h3>
            <p className="text-sm text-slate-400">Woche 7-12</p>
          </div>
        </div>

        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 via-purple-400 to-purple-500" />

          <div className="space-y-8">
            {hausMilestones.map((milestone, idx) => (
              <div
                key={idx}
                className={`relative flex flex-col md:flex-row gap-4 md:gap-8 ${
                  idx % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Dot */}
                <div className="absolute left-4 md:left-1/2 w-3 h-3 bg-purple-400 rounded-full -translate-x-1/2 ring-4 ring-slate-900 z-10" />

                {/* Content */}
                <div className={`ml-10 md:ml-0 md:w-1/2 ${idx % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"}`}>
                  <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-5 border border-purple-700/30">
                    <div className="text-purple-400 text-sm font-semibold mb-1">{milestone.week}</div>
                    <h4 className="text-lg font-bold text-white mb-2">{milestone.title}</h4>
                    <p className="text-slate-400 text-sm mb-4">{milestone.description}</p>
                    <ul className={`space-y-2 ${idx % 2 === 0 ? "md:text-right" : ""}`}>
                      {milestone.deliverables.map((item, i) => (
                        <li key={i} className={`flex items-center gap-2 text-sm text-slate-300 ${idx % 2 === 0 ? "md:flex-row-reverse" : ""}`}>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Final Divider */}
      <div className="relative flex items-center justify-center mt-12">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-700" />
        </div>
        <div className="relative px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-full border border-slate-600">
          <span className="text-sm text-white font-semibold">Ökosystem komplett</span>
          <Sparkles className="w-4 h-4 text-yellow-400 inline-block ml-2" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// DELIVERABLES SECTION
// ============================================

function DeliverablesSection() {
  const categories = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Brand Identity",
      items: [
        "Logo in allen Formaten (Web, Print, Social)",
        "Farbpalette mit Hex-Codes",
        "Typografie-System",
        "Brand Guidelines PDF",
      ],
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Website",
      items: [
        "Mobile-first, responsive Design",
        "Schnelle Ladezeiten (<2s)",
        "4 Sprachen (DE, EN, NL, CH)",
        "SEO-optimierte Struktur",
        "DSGVO-konform",
      ],
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Buchungssystem",
      items: [
        "Online-Kalender mit Verfügbarkeit",
        "Automatische Buchungsbestätigung",
        "Erinnerungs-E-Mails",
        "Admin-Dashboard",
      ],
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Rechnungen",
      items: [
        "Automatische Rechnungserstellung",
        "Gebrandete PDF-Rechnungen",
        "B2B und B2C Formate",
        "Steuernummer & USt-ID",
      ],
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: "E-Mail-System",
      items: [
        "Buchungsbestätigung (gebrandet)",
        "Kurs-Erinnerungen",
        "Interne Benachrichtigungen",
        "Anpassbare Vorlagen",
      ],
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Support & Hosting",
      items: [
        "1 Jahr Hosting inklusive",
        "90 Tage Support nach Launch",
        "SSL-Zertifikat",
        "Regelmäßige Backups",
      ],
    },
  ];

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {categories.map((category, idx) => (
        <div
          key={idx}
          className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 hover:border-cyan-500/50 transition-colors"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400">
              {category.icon}
            </div>
            <h4 className="font-semibold text-white">{category.title}</h4>
          </div>
          <ul className="space-y-2">
            {category.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ============================================
// VIDEO SECTION
// ============================================

function VideoSection({ videoId }: { videoId?: string }) {
  const [isPlaying, setIsPlaying] = useState(false);

  if (!videoId) {
    return (
      <div className="aspect-video bg-slate-800/50 rounded-2xl flex items-center justify-center border border-slate-700">
        <div className="text-center">
          <Play className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">Video kommt bald...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="aspect-video relative rounded-2xl overflow-hidden">
      {!isPlaying ? (
        <div
          onClick={() => setIsPlaying(true)}
          className="absolute inset-0 bg-slate-800 cursor-pointer group"
        >
          <img
            src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
            alt="Video thumbnail"
            className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-cyan-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play className="w-8 h-8 text-white ml-1" />
            </div>
          </div>
        </div>
      ) : (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      )}
    </div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function GerritOfferPage() {
  // Replace with actual YouTube video ID when ready
  const youtubeVideoId = ""; // e.g., "dQw4w9WgXcQ"

  // Password protection state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  // Sound effect refs for door opening
  const wavesAudioRef = useRef<HTMLAudioElement>(null);
  const seagullAudioRef = useRef<HTMLAudioElement>(null);

  // The password - "haff" - simple, fitting, related to the location
  const correctPassword = "haff";

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.toLowerCase() === correctPassword) {
      setPasswordError(false);
      setIsOpening(true);

      // Play sound effects when doors open
      if (wavesAudioRef.current) {
        wavesAudioRef.current.volume = 0.4;
        wavesAudioRef.current.play().catch(() => {});
      }
      setTimeout(() => {
        if (seagullAudioRef.current) {
          seagullAudioRef.current.volume = 0.3;
          seagullAudioRef.current.play().catch(() => {});
        }
      }, 800);

      // Delay the unlock to show the door opening animation (slower for dramatic effect)
      setTimeout(() => {
        setIsUnlocked(true);
      }, 2500);
    } else {
      setPasswordError(true);
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Sound effects for door opening - place your audio files in /public */}
      <audio ref={wavesAudioRef} src="/sounds/waves.mp3" preload="auto" />
      <audio ref={seagullAudioRef} src="/sounds/seagull.mp3" preload="auto" />

      {/* Password Modal Overlay */}
      {!isUnlocked && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-[2500ms] ${isOpening ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
          {/* Blurred background preview - subtle Baltic sea horizon */}
          <div className="absolute inset-0 bg-slate-900">
            {/* Distant horizon glow */}
            <div className="absolute inset-0 opacity-40">
              <div className="h-full w-full bg-gradient-to-b from-slate-800 via-cyan-900/20 to-slate-900" />
            </div>
            {/* Subtle horizon line */}
            <div className="absolute top-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-600/20 to-transparent" />
          </div>

          {/* Door Opening Animation Container - Maritime boat cabin style */}
          <div className={`absolute inset-0 flex transition-all duration-[2500ms] ease-out ${isOpening ? "scale-110 opacity-0" : ""}`}>
            {/* Left Door - weathered wood style */}
            <div className={`w-1/2 h-full bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 border-r-2 border-slate-500/50 transition-transform duration-[2500ms] ease-out origin-left ${isOpening ? "-translate-x-full" : ""}`}>
              {/* Subtle wood grain lines */}
              <div className="absolute inset-0 opacity-10">
                <div className="h-full w-full" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.03) 40px, rgba(255,255,255,0.03) 41px)" }} />
              </div>
              {/* Porthole-style door handle */}
              <div className="absolute right-6 top-1/2 -translate-y-1/2">
                <div className="w-12 h-12 rounded-full border-4 border-slate-500/60 bg-slate-900/50 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-cyan-900/30 border border-cyan-700/30" />
                </div>
              </div>
            </div>
            {/* Right Door */}
            <div className={`w-1/2 h-full bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 border-l-2 border-slate-500/50 transition-transform duration-[2500ms] ease-out origin-right ${isOpening ? "translate-x-full" : ""}`}>
              {/* Subtle wood grain lines */}
              <div className="absolute inset-0 opacity-10">
                <div className="h-full w-full" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.03) 40px, rgba(255,255,255,0.03) 41px)" }} />
              </div>
              {/* Porthole-style door handle */}
              <div className="absolute left-6 top-1/2 -translate-y-1/2">
                <div className="w-12 h-12 rounded-full border-4 border-slate-500/60 bg-slate-900/50 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-cyan-900/30 border border-cyan-700/30" />
                </div>
              </div>
            </div>
          </div>

          {/* Password Form - ship's logbook style */}
          <div className={`relative z-10 max-w-md w-full mx-4 transition-all duration-500 ${isOpening ? "scale-90 opacity-0" : ""}`}>
            <div className="bg-gradient-to-b from-slate-800/95 to-slate-900/95 backdrop-blur-sm rounded-2xl p-8 border border-cyan-800/30 shadow-2xl shadow-cyan-950/20">
              {/* Subtle rope border decoration */}
              <div className="absolute -top-1 left-8 right-8 h-1 bg-gradient-to-r from-transparent via-cyan-700/20 to-transparent rounded-full" />

              {/* Icon - compass/anchor style */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="p-4 bg-cyan-900/30 rounded-full border border-cyan-700/30">
                    <Anchor className="w-10 h-10 text-cyan-400" />
                  </div>
                  {/* Subtle compass ring */}
                  <div className="absolute inset-0 rounded-full border border-cyan-600/10 scale-125" />
                </div>
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-white text-center mb-2">
                Willkommen, Gerrit
              </h1>
              <p className="text-slate-400 text-center mb-6">
                Dieses Angebot ist nur für dich und deine Frau bestimmt.
              </p>

              {/* Password Form */}
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm text-slate-400 mb-2">
                    Passwort eingeben
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError(false);
                    }}
                    placeholder="••••"
                    className={`w-full px-4 py-3 bg-slate-900/50 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                      passwordError
                        ? "border-red-500 focus:ring-red-500/50"
                        : "border-slate-600 focus:ring-cyan-500/50 focus:border-cyan-500"
                    }`}
                    autoFocus
                  />
                  {passwordError && (
                    <p className="mt-2 text-sm text-red-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Falsches Passwort. Versuch es nochmal.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-cyan-400 transition-all flex items-center justify-center gap-2 border border-cyan-400/20"
                >
                  <Ship className="w-5 h-5" />
                  An Bord kommen
                </button>
              </form>

              {/* Hint */}
              <p className="mt-6 text-center text-slate-500 text-sm">
                <Wind className="w-4 h-4 inline mr-1 opacity-50" />
                <span className="text-slate-400">Hinweis:</span> Der Ort, an dem die Stille wartet.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - with blur when locked */}
      <div className={`transition-all duration-1000 ${!isUnlocked && !isOpening ? "blur-lg scale-105 pointer-events-none" : ""}`}>
      {/* Nautical Background Pattern */}
      <div className="fixed inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-700/50 bg-slate-900/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Anchor className="w-6 h-6 text-cyan-400" />
            </div>
            <span className="font-bold text-white">l4yercak3</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="mailto:remington@l4yercak3.com?subject=Angebot%20Segelschule%20-%20Gerrit" className="text-slate-400 hover:text-white transition-colors" title="E-Mail senden">
              <Mail className="w-5 h-5" />
            </a>
            <a href="tel:+4915140427103" className="text-slate-400 hover:text-white transition-colors" title="Anrufen">
              <Phone className="w-5 h-5" />
            </a>
            <a href="https://cal.com/voundbrand/open-end-meeting" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors" title="Termin buchen">
              <Calendar className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-16">
        {/* ============================================ */}
        {/* STORYBRAND FLOW */}
        {/* ============================================ */}

        {/* 1. HERO - The Hook */}
        <section className="py-16 md:py-24 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full px-4 py-2 mb-6">
              <Ship className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-400 text-sm">Personalisiertes Angebot</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Stille. Natur. Bei sich sein.
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mt-2">
                Digital transportiert – ohne Kitsch.
              </span>
            </h1>

            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Gerrit, ich hab verstanden: Das hier ist kein normales Projekt.
              Du willst Menschen einen Ort geben, an dem sie wieder zu sich finden.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#video"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity"
              >
                <Play className="w-5 h-5" />
                Video ansehen
              </a>
              <a
                href="#angebot"
                className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
              >
                Direkt zum Angebot
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </section>

        {/* 2. VIDEO - Build Connection */}
        <section id="video" className="py-16 px-4 bg-slate-800/30">
          <div className="max-w-4xl mx-auto">
            <VideoSection videoId={youtubeVideoId} />
          </div>
        </section>

        {/* 3. WHAT I UNDERSTOOD - Show we understand his world */}
        <section id="verstanden" className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-4">
                Was ich verstanden habe
              </h2>
              <p className="text-slate-400">
                Bevor wir über Technik reden – hier ist, was bei mir angekommen ist.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Das Segeln */}
              <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-cyan-500/20 rounded-lg">
                    <Ship className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h3 className="font-semibold text-white">Das Segeln</h3>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                  Euer Plattbodenschiff vereint Jollensegeln und Kielbootsegeln – ein bewusster Schritt
                  hin zu <strong className="text-cyan-400">verantwortungsvollem Segeln</strong> auf dem Meer.
                </p>
                <p className="text-slate-400 text-sm italic">
                  „Zugänglich, aber nicht beliebig."
                </p>
                <p className="text-slate-500 text-xs mt-2">
                  Das ist eine Haltung. Die sollte spürbar werden, nicht nur erklärt.
                </p>
              </div>

              {/* Der Ort */}
              <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <MapPin className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-white">Der Ort</h3>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                  Das Haff kennen die meisten Menschen noch nicht. Und genau das ist das Besondere.
                  <strong className="text-emerald-400"> Stille. Natur. Aus dem Alltag aussteigen.</strong>
                </p>
                <p className="text-slate-400 text-sm italic">
                  „Wie bringt man die Emotion rüber – ohne Kitsch, ohne Überladung?"
                </p>
                <p className="text-slate-500 text-xs mt-2">
                  Das ist die eigentliche Aufgabe.
                </p>
              </div>

              {/* Das Haus */}
              <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Home className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="font-semibold text-white">Das Haus</h3>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                  Ein <strong className="text-amber-400">Ort der Offenheit</strong>. Wo Menschen
                  willkommen sind, so wie sie sind. Keine Fassade, kein Auftreten müssen.
                </p>
                <p className="text-slate-500 text-xs mt-2">
                  Ein Raum zum Ankommen – nicht nur physisch.
                </p>
              </div>

              {/* Das Walking */}
              <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Heart className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-white">Das Walking</h3>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                  Deine Frau bietet begleitete Walks an – Menschen dabei helfen,
                  <strong className="text-purple-400"> wieder mit sich selbst in Kontakt zu kommen</strong>.
                </p>
                <p className="text-slate-500 text-xs mt-2">
                  Das ist der dritte Teil des Ökosystems. Segeln, Ankommen, Zu-sich-Finden.
                </p>
              </div>
            </div>

            {/* The Ecosystem */}
            <div className="mt-8 bg-gradient-to-r from-cyan-500/10 via-amber-500/10 to-purple-500/10 rounded-2xl p-6 border border-cyan-500/20">
              <div className="text-center">
                <h4 className="font-semibold text-white mb-3">Das ist ein Ökosystem.</h4>
                <p className="text-slate-300 text-sm max-w-2xl mx-auto">
                  Segeln • Ankommen • Zu-sich-Finden – das gehört zusammen. Die Herausforderung:
                  Wie baut man eine digitale Präsenz, die dieses Gefühl transportiert – und gleichzeitig
                  als Geschäft funktioniert?
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. THE PROBLEM - External, Internal, Philosophical */}
        <section className="py-16 px-4 bg-slate-800/30">
          <div className="max-w-4xl mx-auto">
            <ProblemSection />
          </div>
        </section>

        {/* 5. THE GUIDE - Empathy + Authority */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <GuideSection />
          </div>
        </section>

        {/* 5.5. STORYBRAND JOURNEY - Visualize the customer journey */}
        <section className="py-16 px-4 bg-slate-800/30">
          <div className="max-w-5xl mx-auto">
            <StoryBrandJourneySection />
          </div>
        </section>

        {/* 6. THE PLAN - Timeline (12 Weeks) */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full px-4 py-2 mb-6">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-400 text-sm font-medium">Der Plan</span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                12 Wochen zum kompletten Ökosystem
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                6 Wochen Segelschule + 6 Wochen Haus & Walking. Klarer Fahrplan, keine Überraschungen.
              </p>
            </div>
            <TimelineSection />
          </div>
        </section>

        {/* 7. THE TRANSFORMATION - Dynamic LTV Booster (Success Preview) */}
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <DynamicLTVBooster />
          </div>
        </section>

        {/* 8. SUCCESS VISION - What life looks like after */}
        <section className="py-16 px-4 bg-slate-800/30">
          <div className="max-w-4xl mx-auto">
            <SuccessVisionSection />
          </div>
        </section>

        {/* 9. AVOID FAILURE - The Stakes */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <AvoidFailureSection />
          </div>
        </section>

        {/* ============================================ */}
        {/* OFFER SECTION (Bottom) */}
        {/* ============================================ */}

        {/* 10. THE OFFER - Pricing */}
        <section id="angebot" className="py-16 px-4 bg-slate-800/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-full px-4 py-2 mb-6">
                <Package className="w-4 h-4 text-purple-400" />
                <span className="text-purple-400 text-sm font-medium">Das Angebot</span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Website-Entwicklung
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Drei Optionen – wähle was zu deinem aktuellen Stand passt.
              </p>
            </div>
            <PricingSection />
          </div>
        </section>

        {/* ROI Calculator */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-4">
                Rechnet sich die Website?
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Interaktiver Rechner: Passe die Werte an deine Erwartungen an.
              </p>
            </div>
            <LTVCACCalculator />
          </div>
        </section>

        {/* Marketing Options */}
        <section className="py-16 px-4 bg-slate-800/30">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-4">
                <Megaphone className="w-8 h-8 inline-block mr-3 text-purple-400" />
                Sichtbarkeit: Der nächste Schritt
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Die Website bringt keine automatische Sichtbarkeit. Hier siehst du, was Marketing kostet und bringt.
              </p>
            </div>
            <MarketingPackagesSection />
          </div>
        </section>

        {/* Deliverables */}
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-4">
                Was du bekommst
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Alles, was du brauchst. Nichts, was du nicht brauchst.
              </p>
            </div>
            <DeliverablesSection />
          </div>
        </section>

        {/* Hosting & Support */}
        <section className="py-16 px-4 bg-slate-800/30">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-4">
                Nach dem Launch
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Hosting und Support, wenn du sie brauchst.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-10">
              {/* Hosting */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-cyan-400" />
                  Hosting
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Erstes Jahr</span>
                    <span className="text-emerald-400 font-semibold">Inklusive</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Danach monatlich</span>
                    <span className="text-white font-semibold">25€/Monat</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Oder jährlich</span>
                    <span className="text-white font-semibold">250€/Jahr</span>
                  </div>
                </div>
              </div>

              {/* Support included */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  Support inklusive
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Nach Launch</span>
                    <span className="text-emerald-400 font-semibold">90 Tage inklusive</span>
                  </div>
                  <p className="text-slate-400 text-sm pt-2">
                    Bug-Fixes, kleine Anpassungen, Fragen – alles dabei.
                  </p>
                </div>
              </div>
            </div>

            {/* Support Plans */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-6 text-center">
                Optionale Support-Pakete (nach den ersten 90 Tagen)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-400 font-medium"></th>
                      <th className="text-center py-3 px-4 text-slate-300">Standard</th>
                      <th className="text-center py-3 px-4 text-slate-300">Business</th>
                      <th className="text-center py-3 px-4 text-cyan-400">Premium</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-700/50">
                      <td className="py-3 px-4 text-slate-400">Preis</td>
                      <td className="text-center py-3 px-4 text-white">75€/Monat</td>
                      <td className="text-center py-3 px-4 text-white">150€/Monat</td>
                      <td className="text-center py-3 px-4 text-white">300€/Monat</td>
                    </tr>
                    <tr className="border-b border-slate-700/50">
                      <td className="py-3 px-4 text-slate-400">Reaktionszeit (kritisch)</td>
                      <td className="text-center py-3 px-4 text-white">48h</td>
                      <td className="text-center py-3 px-4 text-white">12h</td>
                      <td className="text-center py-3 px-4 text-white">4h (24/7)</td>
                    </tr>
                    <tr className="border-b border-slate-700/50">
                      <td className="py-3 px-4 text-slate-400">Inkl. Änderungen</td>
                      <td className="text-center py-3 px-4 text-white">1h/Monat</td>
                      <td className="text-center py-3 px-4 text-white">3h/Monat</td>
                      <td className="text-center py-3 px-4 text-white">8h/Monat</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-slate-400">Backups</td>
                      <td className="text-center py-3 px-4 text-white">Monatlich</td>
                      <td className="text-center py-3 px-4 text-white">Wöchentlich</td>
                      <td className="text-center py-3 px-4 text-white">Täglich</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-center text-slate-400 text-sm mt-4">
                Monatlich kündbar. Keine Verpflichtung.
              </p>
            </div>
          </div>
        </section>

        {/* Media Production Section */}
        <section className="py-16 px-4 bg-gradient-to-b from-transparent via-orange-500/5 to-transparent">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-full px-4 py-2 mb-4">
                <Camera className="w-4 h-4 text-orange-400" />
                <span className="text-orange-400 text-sm">Zusätzliche Option</span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Medienproduktion & Content
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Die Stille des Haffs lässt sich nicht mit Stockfotos transportieren.
                Authentische Bilder und Videos machen den Unterschied.
              </p>
            </div>

            {/* Special Offer: Podcast */}
            <div className="bg-gradient-to-br from-orange-500/20 to-amber-500/10 rounded-2xl p-6 md:p-8 border border-orange-500/30 mb-8">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="p-4 bg-orange-500/20 rounded-xl">
                  <Mic className="w-10 h-10 text-orange-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-white">Podcast-Angebot</h3>
                    <span className="text-xs bg-emerald-500 text-white px-2 py-1 rounded-full font-semibold">GRATIS</span>
                  </div>
                  <p className="text-slate-300 mb-4">
                    Ich komme vorbei und wir nehmen gemeinsam eine Podcast-Folge auf – über das Haff, das Segeln,
                    deine Geschichte. Authentisch, persönlich, ohne Skript.
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Aufnahme vor Ort</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Professionelles Equipment</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Veröffentlichung auf meinem Kanal</span>
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm mt-4 italic">
                    → Authentischer Content für dich, interessante Geschichte für mein Publikum. Win-win.
                  </p>
                </div>
              </div>
            </div>

            {/* Media Packages Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Podcast Clips */}
              <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700 hover:border-orange-500/50 transition-colors">
                <div className="p-3 bg-orange-500/20 rounded-lg w-fit mb-4">
                  <Scissors className="w-6 h-6 text-orange-400" />
                </div>
                <h4 className="font-semibold text-white mb-2">Podcast-Clips</h4>
                <p className="text-slate-400 text-sm mb-4">
                  10 kurze Clips aus der Podcast-Aufnahme, optimiert für Social Media.
                </p>
                <div className="text-2xl font-bold text-orange-400 mb-2">500€</div>
                <ul className="text-xs text-slate-500 space-y-1">
                  <li>• 10 Kurzclips (15-60 Sek.)</li>
                  <li>• Untertitel & Branding</li>
                  <li>• Hochformat für Reels/TikTok</li>
                  <li>• Querformat für YouTube</li>
                </ul>
              </div>

              {/* Video Production */}
              <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700 hover:border-orange-500/50 transition-colors">
                <div className="p-3 bg-amber-500/20 rounded-lg w-fit mb-4">
                  <Video className="w-6 h-6 text-amber-400" />
                </div>
                <h4 className="font-semibold text-white mb-2">Video-Dreh</h4>
                <p className="text-slate-400 text-sm mb-4">
                  Halber Tag vor Ort: Segeln, Haff, Haus – echte Momente einfangen.
                </p>
                <div className="text-2xl font-bold text-amber-400 mb-2">2.000€</div>
                <ul className="text-xs text-slate-500 space-y-1">
                  <li>• 4-5 Stunden Dreh</li>
                  <li>• Professionelle Kamera & Drohne</li>
                  <li>• Rohschnitt inkl.</li>
                  <li>• Nutzungsrechte vollständig</li>
                </ul>
              </div>

              {/* Image Film */}
              <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700 hover:border-orange-500/50 transition-colors">
                <div className="p-3 bg-cyan-500/20 rounded-lg w-fit mb-4">
                  <Film className="w-6 h-6 text-cyan-400" />
                </div>
                <h4 className="font-semibold text-white mb-2">Imagefilm</h4>
                <p className="text-slate-400 text-sm mb-4">
                  Professionell geschnittener Film (30 Sek. bis 3 Min.) für Website & Ads.
                </p>
                <div className="text-2xl font-bold text-cyan-400 mb-2">1.500€</div>
                <ul className="text-xs text-slate-500 space-y-1">
                  <li>• Storytelling-Konzept</li>
                  <li>• Professioneller Schnitt</li>
                  <li>• Musik & Sound-Design</li>
                  <li>• Color Grading</li>
                </ul>
              </div>

              {/* Social Media Marketing */}
              <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700 hover:border-orange-500/50 transition-colors relative">
                <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  LAUFEND
                </div>
                <div className="p-3 bg-purple-500/20 rounded-lg w-fit mb-4">
                  <Instagram className="w-6 h-6 text-purple-400" />
                </div>
                <h4 className="font-semibold text-white mb-2">Social Media</h4>
                <p className="text-slate-400 text-sm mb-4">
                  Content-Kalender, Posting, Community – alles aus einer Hand.
                </p>
                <div className="text-2xl font-bold text-purple-400 mb-2">1.200-3.000€<span className="text-sm font-normal text-slate-500">/Mo</span></div>
                <ul className="text-xs text-slate-500 space-y-1">
                  <li>• Content-Strategie</li>
                  <li>• 8-20 Posts/Monat</li>
                  <li>• Stories & Reels</li>
                  <li>• Community Management</li>
                </ul>
              </div>
            </div>

            {/* Note */}
            <div className="mt-8 bg-slate-900/50 rounded-xl p-5 border border-slate-700">
              <div className="flex items-start gap-4">
                <Lightbulb className="w-5 h-5 text-amber-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-slate-300 text-sm">
                    <strong className="text-white">Tipp:</strong> Authentische Bilder und Videos vom Haff sind Gold wert.
                    Sie transportieren das Gefühl, das Worte nicht können – und heben dich von der Konkurrenz ab,
                    die mit Stockfotos arbeitet.
                  </p>
                  <p className="text-slate-500 text-xs mt-2">
                    Diese Pakete sind optional und können jederzeit dazugebucht werden.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-3xl p-8 md:p-12 border border-cyan-500/30">
              <Wind className="w-12 h-12 text-cyan-400 mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Bereit, die Segel zu setzen?
              </h2>
              <p className="text-slate-300 mb-8 max-w-xl mx-auto">
                Eine gute Website ist wie guter Wind: Du merkst sie nicht, aber sie bringt dich voran.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 flex-wrap">
                <a
                  href="https://cal.com/voundbrand/open-end-meeting"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity"
                >
                  <Calendar className="w-5 h-5" />
                  Gespräch buchen
                </a>
                <a
                  href="mailto:remington@l4yercak3.com?subject=Angebot%20Segelschule%20-%20Gerrit"
                  className="inline-flex items-center gap-2 bg-slate-700 text-white font-semibold px-8 py-4 rounded-xl hover:bg-slate-600 transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  E-Mail schreiben
                </a>
                <a
                  href="tel:+4915140427103"
                  className="inline-flex items-center gap-2 bg-slate-700 text-white font-semibold px-8 py-4 rounded-xl hover:bg-slate-600 transition-colors"
                >
                  <Phone className="w-5 h-5" />
                  Anrufen
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-700/50 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Anchor className="w-5 h-5 text-cyan-400" />
            <span className="text-slate-400">© 2025 l4yercak3. Alle Rechte vorbehalten.</span>
          </div>
          <div className="text-slate-500 text-sm">
            Dieses Angebot ist gültig für 14 Tage.
          </div>
        </div>
      </footer>
      </div>{/* End of main content wrapper */}
    </div>
  );
}
