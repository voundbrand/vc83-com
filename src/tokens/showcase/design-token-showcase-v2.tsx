"use client";

import { type Dispatch, type ReactNode, type RefObject, type SetStateAction, useEffect, useRef, useState } from "react";
import {
  InteriorButton,
  InteriorHeader,
  InteriorHelperText,
  InteriorInput,
  InteriorPanel,
  InteriorRoot,
  InteriorSectionHeader,
  InteriorSelect,
  InteriorSubtitle,
  InteriorTabButton,
  InteriorTabRow,
  InteriorTextarea,
  InteriorTileButton,
  InteriorTitle,
} from "@/components/window-content/shared/interior-primitives";

/*
 * l4yercak3 Design Token Showcase v2
 * Desktop Shell Metaphor — Midnight + Daylight
 *
 * Daylight: More white, PostHog app-style. Warm accents, not sepia surfaces.
 * Midnight: True dark, Vercel-inspired. No white buttons — dark surface buttons.
 * Icons: Monochrome Lucide only.
 * Windows: Title bar, controls, interior panels.
 * Menus: Dropdown with hover, dividers, submenus.
 */

const T = {
  midnight: {
    name: "Midnight",
    bg: "#0A0A0A",
    surface: "#141414",
    surfaceRaised: "#1A1A1A",
    surfaceHover: "#1E1E1E",
    surfaceActive: "#252525",
    text: "#EDEDED",
    textSecondary: "#888888",
    textTertiary: "#555555",
    border: "#262626",
    borderHover: "#3A3A3A",
    borderFocus: "#E8520A",
    accent: "#E8520A",
    accentHover: "#CC4709",
    accentSubtle: "rgba(232,82,10,0.10)",
    // Buttons — primary is black, matching the dark shell, with subtle border
    btnPrimaryBg: "#000000",
    btnPrimaryText: "#EDEDED",
    btnPrimaryHover: "#171717",
    btnPrimaryBorder: "#333333",
    btnSecondaryBg: "#1E1E1E",
    btnSecondaryText: "#CCCCCC",
    btnSecondaryBorder: "#333333",
    btnSecondaryHover: "#282828",
    btnGhostText: "#888888",
    btnGhostHover: "#1A1A1A",
    btnDangerBg: "#7F1D1D",
    btnDangerText: "#FCA5A5",
    btnDangerHover: "#991B1B",
    // Semantic
    success: "#34D399", successSubtle: "rgba(52,211,153,0.10)",
    warn: "#FBBF24", warnSubtle: "rgba(251,191,36,0.10)",
    error: "#EF4444", errorSubtle: "rgba(239,68,68,0.10)",
    info: "#3B82F6", infoSubtle: "rgba(59,130,246,0.10)",
    // Window chrome
    windowBg: "#111111",
    windowBorder: "#262626",
    titleBarBg: "#0D0D0D",
    titleBarText: "#777777",
    titleBarBtn: "#333333",
    titleBarBtnHover: "#444444",
    titleBarClose: "#EF4444",
    // Shadows
    shadowSm: "0 1px 3px rgba(0,0,0,0.5)",
    shadowMd: "0 4px 16px rgba(0,0,0,0.65)",
    shadowLg: "0 12px 48px rgba(0,0,0,0.8)",
    overlay: "rgba(0,0,0,0.65)",
    // Menu
    menuBg: "#141414",
    menuBorder: "#262626",
    menuHover: "#1E1E1E",
    menuDivider: "#1E1E1E",
    // Input
    inputBg: "#0F0F0F",
    inputBorder: "#262626",
    // Code
    codeBg: "#0D0D0D",
  },
  daylight: {
    name: "Daylight",
    // PostHog app-style: white surfaces, warm page bg, not sepia
    bg: "#F4F3EF",         // warm light gray — page/desktop behind windows
    surface: "#FFFFFF",     // pure white — window interiors, cards
    surfaceRaised: "#FFFFFF",
    surfaceHover: "#F7F7F5",
    surfaceActive: "#EFEEEB",
    text: "#1A1A1A",
    textSecondary: "#6B6B6B",
    textTertiary: "#A0A09B",
    border: "#E0DDD6",      // warm gray border
    borderHover: "#CCC9C0",
    borderFocus: "#E8520A",
    accent: "#E8520A",       // PostHog orange
    accentHover: "#CC4709",
    accentSubtle: "rgba(232,82,10,0.07)",
    // Buttons — primary matches window header (sepia tone) with warm outline
    btnPrimaryBg: "#E8E5DD",
    btnPrimaryText: "#1A1A1A",
    btnPrimaryHover: "#DDD9D0",
    btnPrimaryBorder: "#C4BFB3",
    btnSecondaryBg: "#FFFFFF",
    btnSecondaryText: "#1A1A1A",
    btnSecondaryBorder: "#E0DDD6",
    btnSecondaryHover: "#F7F7F5",
    btnGhostText: "#6B6B6B",
    btnGhostHover: "#F4F3EF",
    btnDangerBg: "#DC2626",
    btnDangerText: "#FFFFFF",
    btnDangerHover: "#B91C1C",
    // Semantic
    success: "#16A34A", successSubtle: "rgba(22,163,74,0.08)",
    warn: "#D97706", warnSubtle: "rgba(217,119,6,0.08)",
    error: "#DC2626", errorSubtle: "rgba(220,38,38,0.08)",
    info: "#2563EB", infoSubtle: "rgba(37,99,235,0.08)",
    // Window chrome — warm cream title bar like your screenshots
    windowBg: "#FFFFFF",
    windowBorder: "#E0DDD6",
    titleBarBg: "#F4F3EF",
    titleBarText: "#6B6B6B",
    titleBarBtn: "#D6D3CB",
    titleBarBtnHover: "#C0BDB5",
    titleBarClose: "#DC2626",
    // Shadows
    shadowSm: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)",
    shadowMd: "0 4px 16px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.03)",
    shadowLg: "0 16px 48px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.04)",
    overlay: "rgba(0,0,0,0.35)",
    // Menu
    menuBg: "#FFFFFF",
    menuBorder: "#E0DDD6",
    menuHover: "#F7F7F5",
    menuDivider: "#EFEEEB",
    // Input
    inputBg: "#FFFFFF",
    inputBorder: "#E0DDD6",
    // Code
    codeBg: "#F7F7F5",
  },
} as const;

export type ShowcaseScheme = keyof typeof T;
export type ShowcaseScene = "default" | "coverage";
type TokenPalette = (typeof T)[ShowcaseScheme];
type IconRenderer = (size?: number) => ReactNode;
type ContrastPairId =
  | "text-on-bg"
  | "text-secondary-on-bg"
  | "text-on-surface"
  | "text-secondary-on-surface"
  | "accent-on-bg"
  | "btn-primary-text-on-btn-primary-bg";
type ContrastPair = {
  id: ContrastPairId;
  label: string;
  fg: string;
  bg: string;
  threshold: number;
};

// Lucide-style SVG icons — monochrome, 1.5px stroke, currentColor
const I = {
  sun: (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>,
  moon: (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  check: (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  x: (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  minus: (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  square: (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>,
  search: (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  chevronDown: (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  chevronRight: (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  user: (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  settings: (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  layout: (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>,
  file: (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  globe: (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  alert: (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  grid: (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  arrowRight: (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  terminal: (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
  lock: (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
};

const SPACING = [4,8,12,16,20,24,32,40,48,64,80,96];
const RADII = [{n:"none",v:0},{n:"sm",v:4},{n:"md",v:6},{n:"lg",v:8},{n:"xl",v:12},{n:"2xl",v:16},{n:"full",v:9999}];
const TYPE = [
  {tok:"text-xs",sz:12,wt:400,lh:1.5,ex:"Caption · Metadata · Badge labels"},
  {tok:"text-sm",sz:14,wt:400,lh:1.5,ex:"Secondary text · Table cells · Hints"},
  {tok:"text-base",sz:16,wt:400,lh:1.5,ex:"Body text — default for all content."},
  {tok:"text-lg",sz:18,wt:400,lh:1.5,ex:"Lead paragraphs and intros"},
  {tok:"text-xl",sz:20,wt:600,lh:1.375,ex:"Section Sub-headers"},
  {tok:"text-2xl",sz:24,wt:600,lh:1.375,ex:"Card Titles · H3"},
  {tok:"text-3xl",sz:30,wt:600,lh:1.2,ex:"Section Headers · H2"},
  {tok:"text-4xl",sz:36,wt:700,lh:1.2,ex:"Page Title · H1"},
];

function lum(hex: string) {
  const rgb = hex
    .replace("#", "")
    .match(/.{2}/g)!
    .map((color) => {
      const value = parseInt(color, 16) / 255;
      return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function cr(a: string, b: string) {
  const l1 = lum(a);
  const l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function buildContrastPairs(t: TokenPalette, s: ShowcaseScheme): ContrastPair[] {
  const bg = s === "midnight" ? "#0A0A0A" : "#F4F3EF";
  const surface = s === "midnight" ? "#141414" : "#FFFFFF";
  return [
    { id: "text-on-bg", label: "text on bg", fg: t.text, bg, threshold: 4.5 },
    { id: "text-secondary-on-bg", label: "text-secondary on bg", fg: t.textSecondary, bg, threshold: 4.5 },
    { id: "text-on-surface", label: "text on surface", fg: t.text, bg: surface, threshold: 4.5 },
    { id: "text-secondary-on-surface", label: "text-secondary on surface", fg: t.textSecondary, bg: surface, threshold: 4.5 },
    { id: "accent-on-bg", label: "accent on bg", fg: t.accent, bg, threshold: 3 },
    { id: "btn-primary-text-on-btn-primary-bg", label: "btn-primary-text on btn-primary-bg", fg: t.btnPrimaryText, bg: t.btnPrimaryBg, threshold: 4.5 },
  ];
}

export default function DesignTokenShowcaseV2({
  initialScheme = "daylight",
  scene = "default",
}: {
  initialScheme?: ShowcaseScheme;
  scene?: ShowcaseScene;
}) {
  const [s, setS] = useState<ShowcaseScheme>(initialScheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const t = T[s];
  const tr = "all 200ms cubic-bezier(0.4,0,0.2,1)";
  const isCoverageScene = scene === "coverage";
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const h = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(target)) setMenuOpen(false);
      if (selRef.current && !selRef.current.contains(target)) setSelectOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div
      data-testid="design-token-showcase-scene"
      style={{ background: t.bg, color: t.text, minHeight: "100vh", fontFamily: "'Geist', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", transition: "background 400ms ease, color 300ms ease" }}
    >
      <style>{`
        :root {
          --font-geist-sans: 'Geist', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          --font-geist-mono: 'JetBrains Mono', ui-monospace, monospace;
          --font-instrument-serif: 'Instrument Serif', serif;
          --font-playfair: 'Playfair Display', serif;
          --mono: var(--font-geist-mono);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: ${t.accent}22; }
        input::placeholder { color: ${t.textSecondary}; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes modalIn { from { opacity:0; transform:scale(.97) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes slideDown { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* ── TASKBAR ── */}
      <div style={{ background: t.titleBarBg, borderBottom: `1px solid ${t.border}`, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", height: 40, gap: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".05em", color: t.text, marginRight: 20, textTransform: "uppercase", fontFamily: "var(--font-codec-pro), Arial, Helvetica, sans-serif" }}>sevenlayers.io</span>

          {/* Product OS menu trigger */}
          <div ref={menuRef} style={{ position: "relative" }}>
            <button onClick={() => setMenuOpen(!menuOpen)} style={{
              height: 28, padding: "0 10px", borderRadius: 4, border: menuOpen ? `1px solid ${t.borderHover}` : "1px solid transparent",
              background: menuOpen ? t.surfaceHover : "transparent", color: t.text, fontSize: 13, fontWeight: 500,
              cursor: "pointer", transition: tr, display: "flex", alignItems: "center", gap: 4,
            }}
              onMouseEnter={e => { if(!menuOpen) e.currentTarget.style.background = t.surfaceHover; }}
              onMouseLeave={e => { if(!menuOpen) e.currentTarget.style.background = "transparent"; }}
            >
              Product OS {I.chevronDown(14)}
            </button>
            {menuOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, width: 220,
                background: t.menuBg, border: `1px solid ${t.menuBorder}`, borderRadius: 8,
                boxShadow: t.shadowMd, animation: "slideDown .15s ease", overflow: "hidden", zIndex: 60,
              }}>
                {[
                  { icon: I.grid, label: "Browse all apps", count: "34" },
                  { icon: I.search, label: "Search apps" },
                  null,
                  { icon: I.layout, label: "Analytics dashboards", chevron: true },
                  { icon: I.terminal, label: "Product engineering", chevron: true },
                  { icon: I.globe, label: "Communication", chevron: true },
                  { icon: I.settings, label: "Automation", chevron: true },
                  null,
                  { icon: I.file, label: "Roadmap" },
                ].map((item, i) => item === null ? (
                  <div key={`d${i}`} style={{ height: 1, background: t.menuDivider, margin: "4px 0" }} />
                ) : (
                  <MenuItem key={i} item={item} t={t} tr={tr} onClick={() => setMenuOpen(false)} />
                ))}
              </div>
            )}
          </div>

          {["Pricing","Docs","Community"].map(l => (
            <button key={l} style={{
              height: 28, padding: "0 10px", borderRadius: 4, border: "1px solid transparent",
              background: "transparent", color: t.textSecondary, fontSize: 13, fontWeight: 500,
              cursor: "pointer", transition: tr,
            }}
              onMouseEnter={e => { e.currentTarget.style.background = t.surfaceHover; e.currentTarget.style.color = t.text; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = t.textSecondary; }}
            >{l}</button>
          ))}

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
            <button style={{ width: 28, height: 28, borderRadius: 4, border: "none", background: "transparent", color: t.textSecondary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: tr }}
              onMouseEnter={e => { e.currentTarget.style.background = t.surfaceHover; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >{I.search(16)}</button>
            <button style={{ width: 28, height: 28, border: `1px solid ${t.border}`, background: "transparent", color: t.textSecondary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: tr, borderRadius: 9999 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = t.borderHover; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; }}
            >{I.user(14)}</button>
            <button onClick={() => setS(p => p === "midnight" ? "daylight" : "midnight")} style={{
              height: 28, padding: "0 10px", borderRadius: 4, border: `1px solid ${t.border}`,
              background: t.surfaceHover, color: t.text, fontSize: 12, fontWeight: 500,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: tr,
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = t.borderHover; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; }}
            >
              {s === "midnight" ? I.sun(14) : I.moon(14)}
              {s === "midnight" ? "Daylight" : "Midnight"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px 80px" }}>

        {/* ── SECTION: WINDOW WITH INTERIOR ── */}
        <Sec t={t} label="Window · Desktop Shell">
          <Window t={t} tr={tr} title="Design Token Reference — sevenlayers.io">
            {/* Window interior tabs */}
            <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${t.border}`, padding: "0 16px" }}>
              {["Colors","Typography","Spacing & Shape","Components","Contrast"].map((label, i) => (
                <button key={label} onClick={() => setTab(i)} style={{
                  padding: "10px 14px", fontSize: 13, fontWeight: tab === i ? 600 : 400,
                  color: tab === i ? t.text : t.textSecondary,
                  borderBottom: tab === i ? `2px solid ${t.accent}` : "2px solid transparent",
                  background: "transparent", border: "none",
                  cursor: "pointer", transition: tr, marginBottom: -1,
                }}
                  onMouseEnter={e => { if(tab !== i) e.currentTarget.style.color = t.text; }}
                  onMouseLeave={e => { if(tab !== i) e.currentTarget.style.color = t.textSecondary; }}
                >{label}</button>
              ))}
            </div>

            <div style={{ padding: 20 }}>
              {tab === 0 && <ColorsPanel t={t} />}
              {tab === 1 && <TypographyPanel t={t} />}
              {tab === 2 && <SpacingShapePanel t={t} tr={tr} />}
              {tab === 3 && <ComponentsPanel t={t} tr={tr} setModalOpen={setModalOpen} selRef={selRef} selectOpen={selectOpen} setSelectOpen={setSelectOpen} />}
              {tab === 4 && <ContrastPanel t={t} s={s} />}
            </div>
          </Window>
        </Sec>

        {/* ── SECTION: ICON GRID ── */}
        <Sec t={t} label="Icons · Lucide · 1.5px stroke · currentColor">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            {Object.entries(I).map(([name, fn]) => (
              <div key={name} style={{
                width: 72, padding: "12px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                borderRadius: 6, cursor: "default", transition: tr,
              }}
                onMouseEnter={e => e.currentTarget.style.background = t.surfaceHover}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ color: t.text }}>{fn(20)}</div>
                <span style={{ fontSize: 10, color: t.textTertiary }}>{name}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 20, alignItems: "end", marginTop: 16, padding: "12px 0", borderTop: `1px solid ${t.border}` }}>
            {[{tok:"icon-xs",px:14},{tok:"icon-sm",px:16},{tok:"icon-md",px:20},{tok:"icon-lg",px:24},{tok:"icon-xl",px:32}].map(ic => (
              <div key={ic.tok} style={{ textAlign: "center" }}>
                <div style={{ color: t.text }}>{I.settings(ic.px)}</div>
                <div style={{ fontSize: 10, color: t.textTertiary, marginTop: 4, fontFamily: "var(--mono)" }}>{ic.tok}<br/>{ic.px}px</div>
              </div>
            ))}
          </div>
        </Sec>

        {/* ── SECTION: ELEVATION ── */}
        <Sec t={t} label="Elevation · Shadows">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
            {[{tok:"shadow-sm",sh:t.shadowSm},{tok:"shadow-md",sh:t.shadowMd},{tok:"shadow-lg",sh:t.shadowLg}].map(e => (
              <div key={e.tok} style={{
                width: 140, height: 90, borderRadius: 8, background: t.surface, boxShadow: e.sh,
                border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 11, color: t.textSecondary, fontFamily: "var(--mono)" }}>{e.tok}</span>
              </div>
            ))}
            <div style={{
              width: 140, height: 90, borderRadius: 8, background: t.surface,
              boxShadow: `0 0 0 2px ${t.bg}, 0 0 0 4px ${t.borderFocus}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 11, color: t.textSecondary, fontFamily: "var(--mono)" }}>focus-ring</span>
            </div>
          </div>
        </Sec>

        {/* ── SECTION: MOTION ── */}
        <Sec t={t} label="Motion · Duration + Easing">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
            {[{tok:"fast",ms:100,use:"Hover, opacity"},{tok:"normal",ms:200,use:"Buttons, toggles"},{tok:"slow",ms:300,use:"Modals, drawers"},{tok:"slower",ms:500,use:"Pages, charts"}].map(m => (
              <MotionCard key={m.tok} m={m} t={t} />
            ))}
          </div>
        </Sec>

        {isCoverageScene ? (
          <Sec t={t} label="Coverage Contract · Hidden States + Shared Primitives">
            <ShowcaseCoverageMatrix t={t} tr={tr} />
          </Sec>
        ) : null}

      </div>

      {/* MODAL */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: t.overlay, animation: "fadeIn .2s ease" }}
          onClick={() => setModalOpen(false)}>
          <div style={{
            width: "100%", maxWidth: 440, margin: 20, borderRadius: 12, background: t.surface,
            border: `1px solid ${t.border}`, boxShadow: t.shadowLg, animation: "modalIn .25s cubic-bezier(0,0,.2,1)",
          }} onClick={e => e.stopPropagation()}>
            {/* Modal title bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${t.border}` }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Deploy to Production</span>
              <button onClick={() => setModalOpen(false)} style={{ width: 24, height: 24, borderRadius: 4, border: "none", background: "transparent", color: t.textSecondary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{I.x(16)}</button>
            </div>
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 14, color: t.textSecondary, lineHeight: 1.6, marginBottom: 20 }}>
                This will push all staged changes to the live environment. This action cannot be undone.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <Btn t={t} tr={tr} v="secondary" onClick={() => setModalOpen(false)}>Cancel</Btn>
                <Btn t={t} tr={tr} v="danger" onClick={() => setModalOpen(false)}>Deploy</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── WINDOW COMPONENT ── */
function Window({
  t,
  tr,
  title,
  children,
}: {
  t: TokenPalette;
  tr: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div style={{ borderRadius: 10, border: `1px solid ${t.windowBorder}`, overflow: "hidden", boxShadow: t.shadowMd, background: t.windowBg }}>
      {/* Title bar */}
      <div style={{
        display: "flex", alignItems: "center", height: 36, padding: "0 12px",
        background: t.titleBarBg, borderBottom: `1px solid ${t.border}`, gap: 8,
      }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[t.titleBarClose, t.titleBarBtn, t.titleBarBtn].map((c, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: 9999, background: c, border: `1px solid ${t.border}`, transition: tr }} />
          ))}
        </div>
        <span style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: 500, color: t.titleBarText }}>
          {title.split("sevenlayers.io").map((part, i, arr) => (
            <span key={i}>{part}{i < arr.length - 1 && <span style={{ textTransform: "uppercase", fontFamily: "var(--font-codec-pro), Arial, Helvetica, sans-serif", letterSpacing: ".05em" }}>sevenlayers.io</span>}</span>
          ))}
        </span>
        <div style={{ width: 48 }} />
      </div>
      {/* Interior */}
      <div style={{ background: t.surface }}>{children}</div>
    </div>
  );
}

/* ── MENU ITEM ── */
function MenuItem({
  item,
  t,
  tr,
  onClick,
}: {
  item: { icon: IconRenderer; label: string; count?: string; chevron?: boolean };
  t: TokenPalette;
  tr: string;
  onClick: () => void;
}) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "7px 12px",
      background: h ? t.menuHover : "transparent", border: "none", color: t.text, fontSize: 13,
      cursor: "pointer", transition: tr, textAlign: "left",
    }}>
      <span style={{ color: t.textSecondary, flexShrink: 0 }}>{item.icon(16)}</span>
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.count && <span style={{ fontSize: 11, color: t.textTertiary }}>{item.count}</span>}
      {item.chevron && <span style={{ color: t.textTertiary }}>{I.chevronRight(14)}</span>}
    </button>
  );
}

/* ── BUTTON ── */
function Btn({
  t,
  tr,
  v = "secondary",
  size = "md",
  children,
  onClick,
  disabled,
}: {
  t: TokenPalette;
  tr: string;
  v?: "primary" | "secondary" | "ghost" | "danger" | "accent";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const sz = { sm: { h: 28, px: 10, fs: 12 }, md: { h: 32, px: 12, fs: 13 }, lg: { h: 36, px: 16, fs: 14 } }[size];
  const vars = {
    primary: { bg: t.btnPrimaryBg, c: t.btnPrimaryText, bd: t.btnPrimaryBorder, hBg: t.btnPrimaryHover },
    secondary: { bg: t.btnSecondaryBg, c: t.btnSecondaryText, bd: t.btnSecondaryBorder, hBg: t.btnSecondaryHover },
    ghost: { bg: "transparent", c: t.btnGhostText, bd: "transparent", hBg: t.btnGhostHover },
    danger: { bg: t.btnDangerBg, c: t.btnDangerText, bd: "transparent", hBg: t.btnDangerHover },
    accent: { bg: t.accent, c: "#FFFFFF", bd: "transparent", hBg: t.accentHover },
  }[v];
  return (
    <button disabled={disabled} onClick={onClick} style={{
      height: sz.h, padding: `0 ${sz.px}px`, borderRadius: 6, fontSize: sz.fs, fontWeight: 500,
      background: vars.bg, color: vars.c, border: `1px solid ${vars.bd === "transparent" ? "transparent" : vars.bd}`,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .45 : 1,
      display: "inline-flex", alignItems: "center", gap: 6, transition: tr, fontFamily: "inherit",
    }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = vars.hBg; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = vars.bg; }}
    >{children}</button>
  );
}

/* ── SECTION WRAPPER ── */
function Sec({
  t,
  label,
  children,
}: {
  t: TokenPalette;
  label: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", color: t.textTertiary, marginBottom: 12, marginTop: 24 }}>{label}</div>
      {children}
    </div>
  );
}

/* ── COLOR SWATCH ── */
function Swatch({
  color,
  tok,
  label,
  t,
}: {
  color: string;
  tok: string;
  label: string;
  t: TokenPalette;
}) {
  const [cp, setCp] = useState(false);
  void label;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "4px 0" }}
      onClick={() => { navigator.clipboard?.writeText(color); setCp(true); setTimeout(() => setCp(false), 1000); }}>
      <div style={{ width: 32, height: 32, borderRadius: 6, background: color, border: `1px solid ${t.border}`, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: t.text, fontFamily: "var(--mono)" }}>{tok}</div>
        <div style={{ fontSize: 11, color: t.textSecondary }}>{color}{cp ? <span style={{ color: t.success, marginLeft: 6 }}>✓</span> : null}</div>
      </div>
    </div>
  );
}

/* ── TAB PANELS ── */
function ColorsPanel({ t }: { t: TokenPalette }) {
  const groups = [
    { label: "Surfaces", items: [
      [t.bg,"bg","Page / desktop"],[t.surface,"surface","Window interior"],[t.surfaceHover,"surface-hover","Hover"],[t.surfaceActive,"surface-active","Active / pressed"],
    ]},
    { label: "Text", items: [[t.text,"text","Primary"],[t.textSecondary,"text-secondary","Muted"],[t.textTertiary,"text-tertiary","Placeholder"]]},
    { label: "Borders", items: [[t.border,"border","Default"],[t.borderHover,"border-hover","Hover"],[t.borderFocus,"border-focus","Focus"]]},
    { label: "Accent", items: [[t.accent,"accent","Links / focus"],[t.accentHover,"accent-hover","Hover"]]},
    { label: "Semantic", items: [[t.success,"success",""],[t.warn,"warn",""],[t.error,"error",""],[t.info,"info",""]]},
    { label: "Button surfaces", items: [
      [t.btnPrimaryBg,"btn-primary-bg",""],[t.btnPrimaryBorder,"btn-primary-border",""],[t.btnSecondaryBg,"btn-secondary-bg",""],[t.btnDangerBg,"btn-danger-bg",""],
    ]},
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
      {groups.map(g => (
        <div key={g.label}>
          <div style={{ fontSize: 11, fontWeight: 600, color: t.textTertiary, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>{g.label}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {g.items.map(([c, tok, lbl]) => <Swatch key={tok} color={c} tok={tok} label={lbl} t={t} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function TypographyPanel({ t }: { t: TokenPalette }) {
  return (
    <div>
      {/* Font families */}
      <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 12 }}>Font Families</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { tok: "--font-geist-sans", family: "'Geist', 'Segoe UI', Tahoma, sans-serif", label: "Shell UI · Body · Headings", sample: "The quick brown fox jumps" },
          { tok: "--font-geist-mono", family: "'JetBrains Mono', ui-monospace, monospace", label: "Code · IDs · Debug fields", sample: "const x = 42;" },
          { tok: "--font-instrument-serif", family: "'Instrument Serif', serif", label: "Editorial accents only", sample: "Where Events Come Alive" },
          { tok: "--font-codec-pro", family: "'Codec Pro', Arial, Helvetica, sans-serif", label: "Brand accents only · always uppercase (all caps)", sample: "SEVENLAYERS.IO" },
        ].map(f => (
          <div key={f.tok} style={{ padding: 12, borderRadius: 8, background: t.surfaceHover, border: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 10, color: t.textTertiary, fontFamily: "var(--mono)", marginBottom: 4 }}>{f.tok}</div>
            <div style={{ fontSize: 20, fontFamily: f.family, color: t.text, marginBottom: 4, lineHeight: 1.3, fontStyle: "normal", textTransform: f.tok === "--font-codec-pro" ? "uppercase" as const : "none" as const, letterSpacing: f.tok === "--font-codec-pro" ? ".05em" : undefined }}>{f.sample}</div>
            <div style={{ fontSize: 11, color: t.textSecondary }}>{f.label}</div>
          </div>
        ))}
      </div>

      {/* Type scale */}
      <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 12 }}>Type Scale (Geist Sans)</div>
      {TYPE.map((item, i) => (
        <div key={item.tok} style={{ display: "flex", gap: 20, alignItems: "baseline", padding: "14px 0", borderBottom: i < TYPE.length - 1 ? `1px solid ${t.border}` : "none" }}>
          <div style={{ width: 80, flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: t.textTertiary, fontFamily: "var(--mono)" }}>{item.tok}</div>
            <div style={{ fontSize: 10, color: t.textTertiary }}>{item.sz}px · {item.wt}</div>
          </div>
          <div style={{ fontSize: item.sz, fontWeight: item.wt, lineHeight: item.lh, color: t.text }}>{item.ex}</div>
        </div>
      ))}
      <div style={{ marginTop: 16, padding: 16, borderRadius: 8, background: t.codeBg, border: `1px solid ${t.border}` }}>
        <div style={{ fontSize: 10, color: t.textTertiary, fontFamily: "var(--mono)", marginBottom: 8 }}>--font-geist-mono · Code / Terminal</div>
        <pre style={{ fontFamily: "var(--mono)", fontSize: 13, lineHeight: 1.6, color: t.text }}>{`const deploy = async (env) => {
  await build({ target: env });
  return { status: "ok", ts: Date.now() };
};`}</pre>
      </div>
    </div>
  );
}

function SpacingShapePanel({ t, tr }: { t: TokenPalette; tr: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 12 }}>Spacing (4px base)</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
        {SPACING.map(px => (
          <div key={px} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 56, fontSize: 11, color: t.textTertiary, fontFamily: "var(--mono)", textAlign: "right" }}>{px}px</span>
            <div style={{ width: px, height: 16, borderRadius: 3, background: t.accent, opacity: .55, transition: tr }} />
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 12 }}>Radius</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "end" }}>
        {RADII.map(r => (
          <div key={r.n} style={{ textAlign: "center" }}>
            <div style={{ width: 48, height: 48, border: `2px solid ${t.accent}`, borderRadius: r.v, opacity: .7 }} />
            <div style={{ fontSize: 10, color: t.textTertiary, fontFamily: "var(--mono)", marginTop: 6 }}>{r.n}<br/>{r.v === 9999 ? "full" : `${r.v}px`}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComponentsPanel({
  t,
  tr,
  setModalOpen,
  selRef,
  selectOpen,
  setSelectOpen,
}: {
  t: TokenPalette;
  tr: string;
  setModalOpen: Dispatch<SetStateAction<boolean>>;
  selRef: RefObject<HTMLDivElement | null>;
  selectOpen: boolean;
  setSelectOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const [checks, setChecks] = useState({ a: true, b: false });
  const checkKeys: Array<keyof typeof checks> = ["a", "b"];
  return (
    <div>
      {/* Buttons */}
      <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 10 }}>Buttons</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        <Btn t={t} tr={tr} v="primary">Primary</Btn>
        <Btn t={t} tr={tr} v="secondary">{I.settings(14)} Secondary</Btn>
        <Btn t={t} tr={tr} v="ghost">Ghost</Btn>
        <Btn t={t} tr={tr} v="danger">Danger</Btn>
        <Btn t={t} tr={tr} v="accent">{I.arrowRight(14)} Accent CTA</Btn>
        <Btn t={t} tr={tr} v="secondary" disabled>Disabled</Btn>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <Btn t={t} tr={tr} v="primary" size="sm">Small</Btn>
        <Btn t={t} tr={tr} v="primary" size="md">Medium</Btn>
        <Btn t={t} tr={tr} v="primary" size="lg">Large</Btn>
      </div>

      {/* Inputs */}
      <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 10 }}>Inputs</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: t.text, display: "block", marginBottom: 4 }}>Email</label>
          <input type="text" placeholder="you@example.com" style={{
            width: "100%", height: 32, borderRadius: 6, border: `1px solid ${t.inputBorder}`,
            background: t.inputBg, color: t.text, fontSize: 13, padding: "0 10px", outline: "none", transition: tr, fontFamily: "inherit",
          }}
            onFocus={e => { e.target.style.borderColor = t.borderFocus; e.target.style.boxShadow = `0 0 0 2px ${t.bg}, 0 0 0 4px ${t.borderFocus}`; }}
            onBlur={e => { e.target.style.borderColor = t.inputBorder; e.target.style.boxShadow = "none"; }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: t.text, display: "block", marginBottom: 4 }}>Username <span style={{ color: t.error }}>*</span></label>
          <input type="text" value="ab" readOnly style={{
            width: "100%", height: 32, borderRadius: 6, border: `1px solid ${t.error}`,
            background: t.inputBg, color: t.text, fontSize: 13, padding: "0 10px", outline: "none", fontFamily: "inherit",
          }} />
          <span style={{ fontSize: 11, color: t.error, marginTop: 2, display: "block" }}>Min 3 characters</span>
        </div>
        <div ref={selRef}>
          <label style={{ fontSize: 12, fontWeight: 500, color: t.text, display: "block", marginBottom: 4 }}>Environment</label>
          <button onClick={() => setSelectOpen(!selectOpen)} style={{
            width: "100%", height: 32, borderRadius: 6, border: `1px solid ${selectOpen ? t.borderFocus : t.inputBorder}`,
            background: t.inputBg, color: t.text, fontSize: 13, padding: "0 10px",
            display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", transition: tr, fontFamily: "inherit",
          }}>
            <span>Production</span>
            <span style={{ color: t.textTertiary, transform: selectOpen ? "rotate(180deg)" : "", transition: tr }}>{I.chevronDown(14)}</span>
          </button>
          {selectOpen && (
            <div style={{
              position: "relative", marginTop: 4, background: t.menuBg, border: `1px solid ${t.menuBorder}`,
              borderRadius: 8, boxShadow: t.shadowMd, overflow: "hidden", animation: "slideDown .12s ease", zIndex: 10,
            }}>
              {["Production","Staging","Development"].map((opt, i) => (
                <div key={opt} style={{
                  padding: "7px 10px", fontSize: 13, color: i === 0 ? t.accent : t.text, cursor: "pointer", transition: tr,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = t.menuHover}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  onClick={() => setSelectOpen(false)}
                >
                  {opt} {i === 0 && <span style={{ color: t.accent }}>{I.check(14)}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Checkboxes */}
      <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
        {checkKeys.map((k) => {
          const v = checks[k];
          return (
            <label
              key={k}
              style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: t.text }}
              onClick={() => setChecks(c => ({ ...c, [k]: !c[k] }))}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  border: v ? "none" : `1.5px solid ${t.border}`,
                  background: v ? t.accent : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: tr,
                  color: "#FFF",
                }}
              >
                {v && I.check(12)}
              </div>
              Option {k.toUpperCase()}
            </label>
          );
        })}
      </div>

      {/* Badges */}
      <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 10 }}>Badges</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
        {[
          { l: "Default", bg: t.surfaceHover, c: t.textSecondary },
          { l: "Success", bg: t.successSubtle, c: t.success },
          { l: "Warning", bg: t.warnSubtle, c: t.warn },
          { l: "Error", bg: t.errorSubtle, c: t.error },
          { l: "Info", bg: t.infoSubtle, c: t.info },
        ].map(b => (
          <span key={b.l} style={{
            display: "inline-flex", alignItems: "center", height: 22, padding: "0 8px", borderRadius: 9999,
            background: b.bg, color: b.c, fontSize: 12, fontWeight: 500,
          }}>{b.l}</span>
        ))}
      </div>

      {/* Card */}
      <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 10 }}>Card</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, marginBottom: 24 }}>
        <div style={{ padding: 16, borderRadius: 8, border: `1px solid ${t.border}`, background: t.surface }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: t.text, marginBottom: 4 }}>Default Card</div>
          <div style={{ fontSize: 13, color: t.textSecondary, lineHeight: 1.5, marginBottom: 12 }}>Surface bg, default border. Padding space-4.</div>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn t={t} tr={tr} v="primary" size="sm">Action</Btn>
            <Btn t={t} tr={tr} v="ghost" size="sm">Cancel</Btn>
          </div>
        </div>
        <div style={{ padding: 16, borderRadius: 8, border: `1px solid ${t.border}`, background: t.surface, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 120, color: t.textTertiary }}>
          <div style={{ opacity: .4 }}>{I.search(28)}</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: t.textSecondary }}>No results found</div>
        </div>
      </div>

      {/* Table */}
      <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 10 }}>Table</div>
      <div style={{ borderRadius: 8, border: `1px solid ${t.border}`, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: t.surfaceHover }}>
              {["Name","Status","Role","Last active"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: t.textTertiary, borderBottom: `1px solid ${t.border}`, textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { n: "Remington", st: "Active", stc: t.success, stbg: t.successSubtle, r: "Admin", a: "Now" },
              { n: "Franziska", st: "Active", stc: t.success, stbg: t.successSubtle, r: "Owner", a: "2h" },
              { n: "Max Müller", st: "Invited", stc: t.info, stbg: t.infoSubtle, r: "Member", a: "—" },
            ].map((row, i) => (
              <TRow key={row.n} row={row} t={t} tr={tr} last={i === 2} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal trigger */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 10 }}>Modal</div>
        <Btn t={t} tr={tr} v="secondary" onClick={() => setModalOpen(true)}>Open Modal</Btn>
      </div>
    </div>
  );
}

function ShowcaseCoverageMatrix({
  t,
  tr,
}: {
  t: TokenPalette;
  tr: string;
}) {
  return (
    <div data-testid="design-token-showcase-coverage-scene" style={{ display: "grid", gap: 16 }}>
      <div
        data-testid="showcase-tab-state-grid"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}
      >
        <CoverageCard
          testId="showcase-tab-state-typography"
          title="TAB-002 · Typography"
          description="Hidden tab panel is rendered in coverage scene."
          t={t}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: t.text }}>text-2xl</span>
            <span style={{ fontSize: 14, color: t.textSecondary }}>Body copy for tokenized surfaces.</span>
            <span style={{ fontSize: 12, color: t.textTertiary, fontFamily: "var(--mono)" }}>--font-geist-sans</span>
          </div>
        </CoverageCard>
        <CoverageCard
          testId="showcase-tab-state-spacing-shape"
          title="TAB-003 · Spacing & Shape"
          description="Spacing/radius states are present in snapshot coverage."
          t={t}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ width: "100%", height: 6, borderRadius: 3, background: t.accentSubtle }} />
            <div style={{ width: "80%", height: 10, borderRadius: 6, background: t.accent }} />
            <div style={{ width: "60%", height: 14, borderRadius: 10, background: t.surfaceActive, border: `1px solid ${t.border}` }} />
          </div>
        </CoverageCard>
        <CoverageCard
          testId="showcase-tab-state-components"
          title="TAB-004 · Components"
          description="Representative controls from the component tab."
          t={t}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <Btn t={t} tr={tr} v="primary" size="sm">Primary</Btn>
            <Btn t={t} tr={tr} v="secondary" size="sm">Secondary</Btn>
            <span style={{ height: 22, padding: "0 8px", borderRadius: 9999, background: t.successSubtle, color: t.success, display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 600 }}>
              Success
            </span>
          </div>
        </CoverageCard>
        <CoverageCard
          testId="showcase-tab-state-contrast"
          title="TAB-005 · Contrast"
          description="Contrast contract is always visible in the coverage scene."
          t={t}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 30, height: 30, borderRadius: 6, border: `1px solid ${t.border}`, background: t.surface, color: t.text, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>
                Aa
              </span>
              <span style={{ fontSize: 12, color: t.success, fontWeight: 600 }}>PASS 7.2:1</span>
            </div>
            <span style={{ fontSize: 11, color: t.textSecondary }}>text-secondary on surface</span>
          </div>
        </CoverageCard>
      </div>

      <div
        data-testid="showcase-interactive-state-grid"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 12 }}
      >
        <CoverageCard
          testId="showcase-state-menu-open"
          title="ST-001 · Menu Open"
          description="Dropdown/open state is snapshot-visible."
          t={t}
        >
          <div style={{ border: `1px solid ${t.menuBorder}`, borderRadius: 8, overflow: "hidden", background: t.menuBg }}>
            {[
              { icon: I.grid, label: "Browse all apps", count: "34" },
              { icon: I.search, label: "Search apps" },
              { icon: I.settings, label: "Automation", chevron: true },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", fontSize: 12, color: t.text, borderBottom: `1px solid ${t.menuDivider}` }}>
                <span style={{ color: t.textSecondary }}>{item.icon(14)}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.count ? <span style={{ color: t.textTertiary, fontSize: 11 }}>{item.count}</span> : null}
                {item.chevron ? <span style={{ color: t.textTertiary }}>{I.chevronRight(12)}</span> : null}
              </div>
            ))}
          </div>
        </CoverageCard>
        <CoverageCard
          testId="showcase-state-select-open"
          title="ST-003 · Select Open"
          description="Expanded select state is deterministic."
          t={t}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ height: 32, borderRadius: 6, border: `1px solid ${t.borderFocus}`, background: t.inputBg, padding: "0 10px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: t.text }}>
              <span>Production</span>
              <span style={{ color: t.textTertiary, transform: "rotate(180deg)" }}>{I.chevronDown(14)}</span>
            </div>
            <div style={{ border: `1px solid ${t.menuBorder}`, borderRadius: 8, overflow: "hidden", background: t.menuBg }}>
              {["Production", "Staging", "Development"].map((opt, i) => (
                <div key={opt} style={{ padding: "7px 10px", fontSize: 12, color: i === 0 ? t.accent : t.text, background: i === 0 ? t.menuHover : "transparent", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>{opt}</span>
                  {i === 0 ? <span style={{ color: t.accent }}>{I.check(12)}</span> : null}
                </div>
              ))}
            </div>
          </div>
        </CoverageCard>
        <CoverageCard
          testId="showcase-state-modal-open"
          title="ST-002 · Modal Open"
          description="Modal/open overlay state is included."
          t={t}
        >
          <div style={{ border: `1px solid ${t.border}`, borderRadius: 10, overflow: "hidden", background: t.surface, boxShadow: t.shadowSm }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderBottom: `1px solid ${t.border}`, background: t.surfaceHover }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>Deploy to Production</span>
              <span style={{ color: t.textSecondary }}>{I.x(14)}</span>
            </div>
            <div style={{ padding: 10, display: "grid", gap: 8 }}>
              <p style={{ fontSize: 12, color: t.textSecondary, lineHeight: 1.4 }}>
                Open-state modal content is captured in visual tests.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                <Btn t={t} tr={tr} v="secondary" size="sm">Cancel</Btn>
                <Btn t={t} tr={tr} v="danger" size="sm">Deploy</Btn>
              </div>
            </div>
          </div>
        </CoverageCard>
      </div>

      <InteriorRoot
        data-testid="showcase-interior-primitives"
        className="space-y-3 rounded-xl border p-3"
        style={{ borderColor: t.border, background: t.surface }}
      >
        <InteriorHeader className="space-y-2 rounded-md border px-3 py-3" style={{ borderColor: t.border, background: t.surfaceHover }}>
          <InteriorTitle>Shared Interior Primitive Contract</InteriorTitle>
          <InteriorSubtitle>
            Direct showcase coverage for shared interior primitives across midnight/daylight.
          </InteriorSubtitle>
        </InteriorHeader>

        <InteriorPanel className="space-y-3">
          <InteriorSectionHeader>Tabs + Controls</InteriorSectionHeader>
          <InteriorHelperText>
            Includes `InteriorTabRow`, `InteriorTabButton`, `InteriorInput`, `InteriorTextarea`, and `InteriorSelect`.
          </InteriorHelperText>

          <InteriorTabRow className="gap-2 rounded-md border px-2 py-2" style={{ borderColor: t.border }}>
            <InteriorTabButton active>Inputs</InteriorTabButton>
            <InteriorTabButton>Actions</InteriorTabButton>
          </InteriorTabRow>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1 text-xs">
              <span>Email</span>
              <InteriorInput value="you@example.com" readOnly />
            </label>
            <label className="space-y-1 text-xs">
              <span>Environment</span>
              <InteriorSelect defaultValue="production">
                <option value="production">Production</option>
                <option value="staging">Staging</option>
              </InteriorSelect>
            </label>
            <label className="space-y-1 text-xs sm:col-span-2">
              <span>Notes</span>
              <InteriorTextarea value="Shared primitive coverage for UIP-005." readOnly rows={3} />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <InteriorButton size="sm">Neutral</InteriorButton>
            <InteriorButton size="sm" variant="primary">Primary</InteriorButton>
            <InteriorButton size="sm" variant="subtle">Subtle</InteriorButton>
            <InteriorButton size="sm" variant="danger">Danger</InteriorButton>
            <InteriorButton size="sm" variant="ghost">Ghost</InteriorButton>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <InteriorTileButton className="justify-start gap-2 p-3 text-left text-xs">
              <span>{I.layout(14)}</span>
              <span>InteriorTileButton · Surface A</span>
            </InteriorTileButton>
            <InteriorTileButton className="justify-start gap-2 p-3 text-left text-xs">
              <span>{I.grid(14)}</span>
              <span>InteriorTileButton · Surface B</span>
            </InteriorTileButton>
          </div>
        </InteriorPanel>
      </InteriorRoot>
    </div>
  );
}

function CoverageCard({
  testId,
  title,
  description,
  t,
  children,
}: {
  testId: string;
  title: string;
  description: string;
  t: TokenPalette;
  children: ReactNode;
}) {
  return (
    <div
      data-testid={testId}
      style={{
        borderRadius: 10,
        border: `1px solid ${t.border}`,
        background: t.surface,
        padding: 12,
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ display: "grid", gap: 2 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{title}</span>
        <span style={{ fontSize: 11, color: t.textSecondary }}>{description}</span>
      </div>
      {children}
    </div>
  );
}

function ContrastPanel({ t, s }: { t: TokenPalette; s: ShowcaseScheme }) {
  const pairs = buildContrastPairs(t, s);
  return (
    <div data-testid="showcase-contrast-panel" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
      {pairs.map(p => {
        const ratio = cr(p.fg, p.bg);
        const pass = ratio >= p.threshold;
        const ratioLabel = `${ratio.toFixed(1)}:1`;
        const status = pass ? "PASS" : "FAIL";
        return (
          <div
            key={p.id}
            data-testid={`showcase-contrast-row-${p.id}`}
            data-contrast-token-pair={p.id}
            data-contrast-status={status}
            data-contrast-ratio={ratio.toFixed(2)}
            data-contrast-threshold={p.threshold.toFixed(1)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 8, background: t.surfaceHover }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 6, background: p.bg, display: "flex", alignItems: "center", justifyContent: "center", color: p.fg, fontWeight: 700, fontSize: 13, border: `1px solid ${t.border}` }}>Aa</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: t.text }}>{p.label}</div>
              <div style={{ fontSize: 11, display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ color: pass ? t.success : t.error, fontWeight: 600 }}>{ratioLabel}</span>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 9999, background: pass ? t.successSubtle : t.errorSubtle, color: pass ? t.success : t.error }}>{status}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TRow({
  row,
  t,
  tr,
  last,
}: {
  row: { n: string; st: string; stc: string; stbg: string; r: string; a: string };
  t: TokenPalette;
  tr: string;
  last: boolean;
}) {
  const [h, setH] = useState(false);
  return (
    <tr style={{ background: h ? t.surfaceHover : "transparent", transition: tr }} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}>
      <td style={{ padding: "8px 12px", borderBottom: last ? "none" : `1px solid ${t.border}`, fontWeight: 500, color: t.text }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 9999, background: t.surfaceActive, display: "flex", alignItems: "center", justifyContent: "center", color: t.textSecondary, fontSize: 11, fontWeight: 600 }}>{row.n[0]}</div>
          {row.n}
        </div>
      </td>
      <td style={{ padding: "8px 12px", borderBottom: last ? "none" : `1px solid ${t.border}` }}>
        <span style={{ height: 20, padding: "0 8px", borderRadius: 9999, fontSize: 11, fontWeight: 500, background: row.stbg, color: row.stc, display: "inline-flex", alignItems: "center" }}>{row.st}</span>
      </td>
      <td style={{ padding: "8px 12px", borderBottom: last ? "none" : `1px solid ${t.border}`, color: t.textSecondary, fontSize: 13 }}>{row.r}</td>
      <td style={{ padding: "8px 12px", borderBottom: last ? "none" : `1px solid ${t.border}`, color: t.textTertiary, fontSize: 13 }}>{row.a}</td>
    </tr>
  );
}

function MotionCard({
  m,
  t,
}: {
  m: { tok: string; ms: number; use: string };
  t: TokenPalette;
}) {
  const [a, setA] = useState(false);
  return (
    <div style={{ padding: 12, borderRadius: 8, background: t.surfaceHover, cursor: "pointer" }}
      onClick={() => { setA(true); setTimeout(() => setA(false), m.ms + 300); }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: t.textTertiary, fontFamily: "var(--mono)" }}>duration-{m.tok}</div>
      <div style={{ fontSize: 11, color: t.textTertiary, marginBottom: 8 }}>{m.ms}ms · {m.use}</div>
      <div style={{ height: 3, borderRadius: 2, background: t.surfaceActive, overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 2, background: t.accent, width: a ? "100%" : "0%", transition: `width ${m.ms}ms cubic-bezier(0.4,0,0.2,1)` }} />
      </div>
    </div>
  );
}
