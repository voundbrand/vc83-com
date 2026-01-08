"use client";

import { useState, useMemo } from "react";
import { Anchor, Ship, Wind, Calendar, Mail, Phone, CheckCircle2, ArrowRight, Play, ChevronDown, ChevronUp, TrendingUp, Users, Globe, Zap, FileText, Clock, Shield, Sparkles, Search, Target, Bot, Megaphone, BarChart3, Home, AlertCircle } from "lucide-react";

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
  avgBookingValue: number;
  bookingsPerYear: number;
  customerLifetimeYears: number;
  referralRate: number;
}

interface MarketingInputs {
  monthlyAdBudget: number;
  costPerClick: number;
  conversionRate: number;
  seoMonthlyInvestment: number;
  seoMonthsToResults: number;
  geoMonthlyInvestment: number;
}

// ============================================
// LTV:CAC CALCULATOR COMPONENT (Website Investment)
// ============================================

function LTVCACCalculator() {
  const [businessType, setBusinessType] = useState<"segelschule" | "haus" | "combined">("segelschule");
  const [showDetails, setShowDetails] = useState(false);

  const [segelschuleInputs, setSegelschuleInputs] = useState<LTVInputs>({
    avgBookingValue: 350,
    bookingsPerYear: 25,
    customerLifetimeYears: 2,
    referralRate: 0.15,
  });

  const [houseInputs, setHouseInputs] = useState<LTVInputs>({
    avgBookingValue: 180,
    bookingsPerYear: 40,
    customerLifetimeYears: 3,
    referralRate: 0.20,
  });

  const calculations = useMemo(() => {
    // Segelschule only
    const segelschuleLTV =
      segelschuleInputs.avgBookingValue *
      segelschuleInputs.bookingsPerYear *
      segelschuleInputs.customerLifetimeYears *
      (1 + segelschuleInputs.referralRate);

    const segelschuleCAC = 8500;
    const segelschuleRatio = segelschuleLTV / segelschuleCAC;
    const segelschuleYearlyRevenue = segelschuleInputs.avgBookingValue * segelschuleInputs.bookingsPerYear;

    // House only
    const houseLTV =
      houseInputs.avgBookingValue *
      houseInputs.bookingsPerYear *
      houseInputs.customerLifetimeYears *
      (1 + houseInputs.referralRate);

    const houseCAC = 8500;
    const houseRatio = houseLTV / houseCAC;
    const houseYearlyRevenue = houseInputs.avgBookingValue * houseInputs.bookingsPerYear;

    // Combined (with synergy bonus)
    const synergyMultiplier = 1.25; // 25% synergy from cross-selling
    const combinedLTV = (segelschuleLTV + houseLTV) * synergyMultiplier;
    const combinedCAC = 15000;
    const combinedRatio = combinedLTV / combinedCAC;
    const combinedYearlyRevenue = segelschuleYearlyRevenue + houseYearlyRevenue;

    return {
      segelschule: {
        ltv: segelschuleLTV,
        cac: segelschuleCAC,
        ratio: segelschuleRatio,
        yearlyRevenue: segelschuleYearlyRevenue,
        breakEvenMonths: Math.ceil(segelschuleCAC / (segelschuleYearlyRevenue / 12)),
      },
      haus: {
        ltv: houseLTV,
        cac: houseCAC,
        ratio: houseRatio,
        yearlyRevenue: houseYearlyRevenue,
        breakEvenMonths: Math.ceil(houseCAC / (houseYearlyRevenue / 12)),
      },
      combined: {
        ltv: combinedLTV,
        cac: combinedCAC,
        ratio: combinedRatio,
        yearlyRevenue: combinedYearlyRevenue,
        breakEvenMonths: Math.ceil(combinedCAC / (combinedYearlyRevenue / 12)),
        synergyBonus: (combinedLTV - (segelschuleLTV + houseLTV)),
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

      {/* Adjustable Inputs */}
      {showDetails && (
        <div className="grid md:grid-cols-2 gap-6 p-4 bg-slate-900/30 rounded-xl">
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-3">Segelschule</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Durchschn. Buchungswert (€)</label>
                <input
                  type="range"
                  min="200"
                  max="600"
                  step="25"
                  value={segelschuleInputs.avgBookingValue}
                  onChange={(e) => setSegelschuleInputs(prev => ({ ...prev, avgBookingValue: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
                <div className="text-right text-xs text-cyan-400">{segelschuleInputs.avgBookingValue}€</div>
              </div>
              <div>
                <label className="text-xs text-slate-400">Buchungen pro Jahr</label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={segelschuleInputs.bookingsPerYear}
                  onChange={(e) => setSegelschuleInputs(prev => ({ ...prev, bookingsPerYear: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
                <div className="text-right text-xs text-cyan-400">{segelschuleInputs.bookingsPerYear}</div>
              </div>
              <div>
                <label className="text-xs text-slate-400">Kundenlebensdauer (Jahre)</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.5"
                  value={segelschuleInputs.customerLifetimeYears}
                  onChange={(e) => setSegelschuleInputs(prev => ({ ...prev, customerLifetimeYears: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
                <div className="text-right text-xs text-cyan-400">{segelschuleInputs.customerLifetimeYears} Jahre</div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-3">Haff Erleben (Haus)</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Durchschn. Übernachtungswert (€)</label>
                <input
                  type="range"
                  min="80"
                  max="300"
                  step="10"
                  value={houseInputs.avgBookingValue}
                  onChange={(e) => setHouseInputs(prev => ({ ...prev, avgBookingValue: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
                <div className="text-right text-xs text-cyan-400">{houseInputs.avgBookingValue}€</div>
              </div>
              <div>
                <label className="text-xs text-slate-400">Übernachtungen pro Jahr</label>
                <input
                  type="range"
                  min="20"
                  max="150"
                  step="5"
                  value={houseInputs.bookingsPerYear}
                  onChange={(e) => setHouseInputs(prev => ({ ...prev, bookingsPerYear: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
                <div className="text-right text-xs text-cyan-400">{houseInputs.bookingsPerYear}</div>
              </div>
              <div>
                <label className="text-xs text-slate-400">Kundenlebensdauer (Jahre)</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.5"
                  value={houseInputs.customerLifetimeYears}
                  onChange={(e) => setHouseInputs(prev => ({ ...prev, customerLifetimeYears: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
                <div className="text-right text-xs text-cyan-400">{houseInputs.customerLifetimeYears} Jahre</div>
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
            <span className="font-semibold text-white">Synergie-Bonus</span>
          </div>
          <p className="text-sm text-slate-300">
            Durch Cross-Selling (Segelkurs + Übernachtung) steigt der Gesamtwert um <span className="text-cyan-400 font-semibold">+25%</span>.
            Das sind zusätzliche <span className="text-emerald-400 font-semibold">{calculations.combined.synergyBonus?.toLocaleString("de-DE")}€</span> Lifetime Value.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================
// MARKETING CALCULATOR (SEO, GEO, Ads)
// ============================================

function MarketingCalculator() {
  const [showDetails, setShowDetails] = useState(false);
  const [marketingInputs, setMarketingInputs] = useState<MarketingInputs>({
    monthlyAdBudget: 400,
    costPerClick: 0.80,
    conversionRate: 3,
    seoMonthlyInvestment: 300,
    seoMonthsToResults: 6,
    geoMonthlyInvestment: 200,
  });

  const calculations = useMemo(() => {
    // Paid Ads (Facebook/Instagram)
    const monthlyClicks = marketingInputs.monthlyAdBudget / marketingInputs.costPerClick;
    const monthlyConversions = monthlyClicks * (marketingInputs.conversionRate / 100);
    const yearlyConversionsAds = monthlyConversions * 12;
    const costPerConversionAds = marketingInputs.monthlyAdBudget / monthlyConversions;
    const yearlyAdSpend = marketingInputs.monthlyAdBudget * 12;

    // SEO (organic growth over time)
    const seoYearlyInvestment = marketingInputs.seoMonthlyInvestment * 12;
    // SEO typically brings 2-5x the traffic of paid after establishment
    const estimatedSeoMonthlyVisitors = 500; // conservative estimate after 6 months
    const seoConversionRate = 4; // organic typically converts better
    const seoMonthlyConversions = estimatedSeoMonthlyVisitors * (seoConversionRate / 100);
    const seoYearlyConversions = seoMonthlyConversions * (12 - marketingInputs.seoMonthsToResults);

    // GEO (Generative Engine Optimization)
    const geoYearlyInvestment = marketingInputs.geoMonthlyInvestment * 12;
    // GEO is emerging - estimate 30-50% of SEO effectiveness initially
    const geoMonthlyConversions = seoMonthlyConversions * 0.4;
    const geoYearlyConversions = geoMonthlyConversions * (12 - 4); // faster results than SEO

    // Combined
    const totalYearlyInvestment = yearlyAdSpend + seoYearlyInvestment + geoYearlyInvestment;
    const totalYearlyConversions = yearlyConversionsAds + seoYearlyConversions + geoYearlyConversions;

    return {
      ads: {
        monthlyClicks,
        monthlyConversions,
        yearlyConversions: yearlyConversionsAds,
        costPerConversion: costPerConversionAds,
        yearlySpend: yearlyAdSpend,
      },
      seo: {
        yearlyInvestment: seoYearlyInvestment,
        yearlyConversions: seoYearlyConversions,
        monthsToResults: marketingInputs.seoMonthsToResults,
      },
      geo: {
        yearlyInvestment: geoYearlyInvestment,
        yearlyConversions: geoYearlyConversions,
      },
      total: {
        yearlyInvestment: totalYearlyInvestment,
        yearlyConversions: totalYearlyConversions,
        avgCostPerConversion: totalYearlyInvestment / totalYearlyConversions,
      },
    };
  }, [marketingInputs]);

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-slate-700">
      <div className="flex items-center gap-3 mb-2">
        <Megaphone className="w-6 h-6 text-purple-400" />
        <h3 className="text-xl font-semibold text-white">Marketing-Rechner</h3>
        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">Zusatzleistung</span>
      </div>
      <p className="text-slate-400 text-sm mb-6">
        Die Website ist die Infrastruktur. Marketing bringt die Besucher.
      </p>

      {/* Important Note */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-400">Wichtig zu verstehen</div>
            <p className="text-sm text-slate-300 mt-1">
              Die Website allein macht dich nicht automatisch sichtbar. SEO, GEO und bezahlte Werbung sind <strong>separate Leistungen</strong>, die nicht im Website-Preis enthalten sind.
            </p>
          </div>
        </div>
      </div>

      {/* Three Channels */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {/* Paid Ads */}
        <div className="bg-slate-900/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-orange-400" />
            <h4 className="font-semibold text-white text-sm">Bezahlte Werbung</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Budget/Monat</span>
              <span className="text-white">{marketingInputs.monthlyAdBudget}€</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Klicks/Monat</span>
              <span className="text-orange-400">~{Math.round(calculations.ads.monthlyClicks)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Buchungen/Jahr</span>
              <span className="text-emerald-400 font-semibold">~{Math.round(calculations.ads.yearlyConversions)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Kosten/Buchung</span>
              <span className="text-white">~{Math.round(calculations.ads.costPerConversion)}€</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700">
            <div className="text-xs text-slate-500">Facebook, Instagram, Google Ads</div>
            <div className="text-xs text-orange-400 mt-1">Sofortige Ergebnisse</div>
          </div>
        </div>

        {/* SEO */}
        <div className="bg-slate-900/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-5 h-5 text-cyan-400" />
            <h4 className="font-semibold text-white text-sm">SEO</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Budget/Monat</span>
              <span className="text-white">{marketingInputs.seoMonthlyInvestment}€</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Zeit bis Wirkung</span>
              <span className="text-cyan-400">{calculations.seo.monthsToResults} Monate</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Buchungen/Jahr</span>
              <span className="text-emerald-400 font-semibold">~{Math.round(calculations.seo.yearlyConversions)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Investition/Jahr</span>
              <span className="text-white">{calculations.seo.yearlyInvestment.toLocaleString("de-DE")}€</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700">
            <div className="text-xs text-slate-500">Google, Bing, DuckDuckGo</div>
            <div className="text-xs text-cyan-400 mt-1">Nachhaltige Sichtbarkeit</div>
          </div>
        </div>

        {/* GEO */}
        <div className="bg-slate-900/50 rounded-xl p-4 relative overflow-hidden">
          <div className="absolute top-2 right-2 text-xs bg-purple-500/30 text-purple-400 px-2 py-0.5 rounded-full">
            Neu
          </div>
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-5 h-5 text-purple-400" />
            <h4 className="font-semibold text-white text-sm">GEO</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Budget/Monat</span>
              <span className="text-white">{marketingInputs.geoMonthlyInvestment}€</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Zeit bis Wirkung</span>
              <span className="text-purple-400">~4 Monate</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Buchungen/Jahr</span>
              <span className="text-emerald-400 font-semibold">~{Math.round(calculations.geo.yearlyConversions)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Investition/Jahr</span>
              <span className="text-white">{calculations.geo.yearlyInvestment.toLocaleString("de-DE")}€</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700">
            <div className="text-xs text-slate-500">ChatGPT, Perplexity, Claude</div>
            <div className="text-xs text-purple-400 mt-1">AI-Sichtbarkeit der Zukunft</div>
          </div>
        </div>
      </div>

      {/* Total Summary */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl p-4 border border-cyan-500/20">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-white">Gesamt-Marketing (alle Kanäle)</span>
          <span className="text-lg font-bold text-white">
            {calculations.total.yearlyInvestment.toLocaleString("de-DE")}€/Jahr
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-slate-400">Monatlich</div>
            <div className="text-white font-semibold">
              {Math.round(calculations.total.yearlyInvestment / 12).toLocaleString("de-DE")}€
            </div>
          </div>
          <div>
            <div className="text-slate-400">Erwartete Buchungen/Jahr</div>
            <div className="text-emerald-400 font-semibold">
              ~{Math.round(calculations.total.yearlyConversions)}
            </div>
          </div>
          <div>
            <div className="text-slate-400">Ø Kosten/Buchung</div>
            <div className="text-white font-semibold">
              ~{Math.round(calculations.total.avgCostPerConversion)}€
            </div>
          </div>
        </div>
      </div>

      {/* Show/Hide Details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors mt-4"
      >
        {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        <span className="text-sm">Marketing-Parameter anpassen</span>
      </button>

      {/* Adjustable Marketing Inputs */}
      {showDetails && (
        <div className="mt-4 p-4 bg-slate-900/30 rounded-xl space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400">Ads-Budget/Monat (€)</label>
              <input
                type="range"
                min="100"
                max="1000"
                step="50"
                value={marketingInputs.monthlyAdBudget}
                onChange={(e) => setMarketingInputs(prev => ({ ...prev, monthlyAdBudget: Number(e.target.value) }))}
                className="w-full mt-1"
              />
              <div className="text-right text-xs text-orange-400">{marketingInputs.monthlyAdBudget}€</div>
            </div>
            <div>
              <label className="text-xs text-slate-400">SEO-Budget/Monat (€)</label>
              <input
                type="range"
                min="100"
                max="800"
                step="50"
                value={marketingInputs.seoMonthlyInvestment}
                onChange={(e) => setMarketingInputs(prev => ({ ...prev, seoMonthlyInvestment: Number(e.target.value) }))}
                className="w-full mt-1"
              />
              <div className="text-right text-xs text-cyan-400">{marketingInputs.seoMonthlyInvestment}€</div>
            </div>
            <div>
              <label className="text-xs text-slate-400">GEO-Budget/Monat (€)</label>
              <input
                type="range"
                min="100"
                max="500"
                step="50"
                value={marketingInputs.geoMonthlyInvestment}
                onChange={(e) => setMarketingInputs(prev => ({ ...prev, geoMonthlyInvestment: Number(e.target.value) }))}
                className="w-full mt-1"
              />
              <div className="text-right text-xs text-purple-400">{marketingInputs.geoMonthlyInvestment}€</div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400">Kosten pro Klick (€)</label>
              <input
                type="range"
                min="0.3"
                max="2"
                step="0.1"
                value={marketingInputs.costPerClick}
                onChange={(e) => setMarketingInputs(prev => ({ ...prev, costPerClick: Number(e.target.value) }))}
                className="w-full mt-1"
              />
              <div className="text-right text-xs text-orange-400">{marketingInputs.costPerClick.toFixed(2)}€</div>
            </div>
            <div>
              <label className="text-xs text-slate-400">Conversion Rate (%)</label>
              <input
                type="range"
                min="1"
                max="8"
                step="0.5"
                value={marketingInputs.conversionRate}
                onChange={(e) => setMarketingInputs(prev => ({ ...prev, conversionRate: Number(e.target.value) }))}
                className="w-full mt-1"
              />
              <div className="text-right text-xs text-emerald-400">{marketingInputs.conversionRate}%</div>
            </div>
          </div>
        </div>
      )}

      {/* What is GEO? */}
      <div className="mt-6 p-4 bg-slate-900/50 rounded-xl">
        <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
          <Bot className="w-4 h-4 text-purple-400" />
          Was ist GEO (Generative Engine Optimization)?
        </h4>
        <p className="text-sm text-slate-300">
          GEO ist die neue Disziplin neben SEO. Während SEO für Google optimiert,
          sorgt GEO dafür, dass AI-Assistenten wie <span className="text-purple-400">ChatGPT</span>,
          <span className="text-purple-400"> Perplexity</span> und <span className="text-purple-400">Claude</span> dein
          Business empfehlen, wenn Nutzer nach Segelschulen oder Unterkünften am Haff fragen.
        </p>
        <p className="text-sm text-slate-400 mt-2">
          Immer mehr Menschen nutzen AI statt Google für Empfehlungen – hier früh sichtbar zu sein ist ein Wettbewerbsvorteil.
        </p>
      </div>
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
  const milestones: Milestone[] = [
    {
      week: "Woche 1",
      title: "Discovery & Brand",
      description: "Wir tauchen ein in deine Vision und entwickeln die Markenidentität.",
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
      description: "Die visuelle Welt nimmt Form an.",
      deliverables: [
        "Wireframes aller Seiten",
        "Mobile-first Designs",
        "Bildsprache & Fotoselektion",
        "Content-Struktur",
      ],
    },
    {
      week: "Woche 3-4",
      title: "Entwicklung",
      description: "Code wird geschrieben, Funktionen entstehen.",
      deliverables: [
        "Website-Entwicklung",
        "Buchungssystem-Integration",
        "Rechnungssystem",
        "E-Mail-Automatisierung",
      ],
    },
    {
      week: "Woche 5",
      title: "Content & Feinschliff",
      description: "Texte, Bilder, Details.",
      deliverables: [
        "Content-Einpflege",
        "SEO-Grundoptimierung",
        "Mehrsprachigkeit",
        "Performance-Tuning",
      ],
    },
    {
      week: "Woche 6",
      title: "Launch",
      description: "Wir gehen live.",
      deliverables: [
        "Finaler Test",
        "DNS-Umstellung",
        "Go-Live",
        "Übergabe & Einweisung",
      ],
    },
  ];

  return (
    <div className="relative">
      {/* Timeline Line */}
      <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500 via-purple-500 to-cyan-500" />

      <div className="space-y-8">
        {milestones.map((milestone, idx) => (
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
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-5 border border-slate-700">
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
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
            <a href="mailto:hi@l4yercak3.com" className="text-slate-400 hover:text-white transition-colors">
              <Mail className="w-5 h-5" />
            </a>
            <a href="tel:+491234567890" className="text-slate-400 hover:text-white transition-colors">
              <Phone className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-16">
        {/* Hero Section */}
        <section className="py-16 md:py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full px-4 py-2 mb-6">
              <Ship className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-400 text-sm">Personalisiertes Angebot</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Gerrit, lass uns deine
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400"> Segelschule </span>
              digital auf Kurs bringen
            </h1>

            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Eine Website, die die Stille des Haffs einfängt. Ein Buchungssystem, das arbeitet, während du auf dem Wasser bist.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#angebot"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity"
              >
                Zum Angebot
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="#video"
                className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
              >
                <Play className="w-5 h-5" />
                Video ansehen
              </a>
            </div>
          </div>
        </section>

        {/* Video Section */}
        <section id="video" className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <VideoSection videoId={youtubeVideoId} />
          </div>
        </section>

        {/* Pricing Section */}
        <section id="angebot" className="py-16 px-4 bg-slate-800/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
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

        {/* LTV:CAC Calculator - Website Investment */}
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

        {/* Marketing Calculator - SEO/GEO/Ads */}
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
            <MarketingCalculator />
          </div>
        </section>

        {/* Timeline Section */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-4">
                <Clock className="w-8 h-8 inline-block mr-3 text-cyan-400" />
                6 Wochen bis zum Launch
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Klarer Fahrplan, keine Überraschungen.
              </p>
            </div>
            <TimelineSection />
          </div>
        </section>

        {/* Deliverables Section */}
        <section className="py-16 px-4 bg-slate-800/30">
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
        <section className="py-16 px-4">
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
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="mailto:hi@l4yercak3.com?subject=Angebot%20Segelschule%20-%20Gerrit"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity"
                >
                  <Mail className="w-5 h-5" />
                  Antworten
                </a>
                <a
                  href="tel:+491234567890"
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
    </div>
  );
}
