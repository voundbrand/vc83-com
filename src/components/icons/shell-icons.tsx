"use client";

import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Blocks,
  AppWindow,
  BookOpen,
  Bot,
  Brain,
  Briefcase,
  Building,
  Building2,
  CalendarDays,
  CircleX,
  Clock3,
  Copy,
  CreditCard,
  FilePenLine,
  FileText,
  FileTextIcon,
  FolderKanban,
  Gift,
  Grid3X3,
  Info,
  Layers3,
  Library,
  Link2,
  LogIn,
  LogOut,
  Minus,
  Moon,
  Package,
  ReceiptText,
  Scale,
  ScrollText,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  Square,
  Store,
  Terminal,
  TriangleAlert,
  UserRound,
  Workflow,
} from "lucide-react";

export type ShellIconTone = "muted" | "active" | "danger";

export interface ShellIconProps {
  size?: 16 | 18 | 20 | number;
  className?: string;
  strokeWidth?: number;
  tone?: ShellIconTone;
}

const TONE_CLASS: Record<ShellIconTone, string> = {
  muted: "text-[var(--desktop-menu-text-muted)]",
  active: "text-[var(--desktop-menu-text)]",
  danger: "text-[var(--error-red)]",
};

function createShellIcon(Icon: LucideIcon) {
  return function ShellIcon({
    size = 16,
    className = "",
    strokeWidth = 1.8,
    tone = "active",
  }: ShellIconProps) {
    return <Icon size={size} strokeWidth={strokeWidth} className={`${TONE_CLASS[tone]} ${className}`} aria-hidden="true" />;
  };
}

export const ShellWindowIcon = createShellIcon(AppWindow);
export const ShellGridIcon = createShellIcon(Grid3X3);
export const ShellBotIcon = createShellIcon(Bot);
export const ShellBuilderIcon = createShellIcon(FolderKanban);
export const ShellPeopleIcon = createShellIcon(Building2);
export const ShellBriefcaseIcon = createShellIcon(Briefcase);
export const ShellPaymentsIcon = createShellIcon(CreditCard);
export const ShellWorkflowIcon = createShellIcon(Workflow);
export const ShellFinderIcon = createShellIcon(Search);
export const ShellTextEditorIcon = createShellIcon(FilePenLine);
export const ShellTerminalIcon = createShellIcon(Terminal);
export const ShellSettingsIcon = createShellIcon(Settings);
export const ShellStoreIcon = createShellIcon(Store);
export const ShellDocsIcon = createShellIcon(BookOpen);
export const ShellLayersIcon = createShellIcon(Layers3);
export const ShellBrainIcon = createShellIcon(Brain);
export const ShellCalendarIcon = createShellIcon(CalendarDays);
export const ShellGiftIcon = createShellIcon(Gift);
export const ShellComplianceIcon = createShellIcon(Scale);
export const ShellFormsIcon = createShellIcon(FileText);
export const ShellTemplatesIcon = createShellIcon(Library);
export const ShellTicketIcon = createShellIcon(FileTextIcon);
export const ShellPackageIcon = createShellIcon(Package);
export const ShellCheckoutIcon = createShellIcon(ShoppingCart);
export const ShellReceiptIcon = createShellIcon(ReceiptText);
export const ShellCertificateIcon = createShellIcon(BadgeCheck);
export const ShellIntegrationsIcon = createShellIcon(Link2);
export const ShellTranslationsIcon = createShellIcon(Blocks);
export const ShellAboutIcon = createShellIcon(Info);
export const ShellWelcomeIcon = createShellIcon(Building);
export const ShellProfileIcon = createShellIcon(UserRound);
export const ShellCartIcon = createShellIcon(ShoppingCart);
export const ShellWarningIcon = createShellIcon(TriangleAlert);
export const ShellShieldIcon = createShellIcon(Shield);
export const ShellMoonIcon = createShellIcon(Moon);
export const ShellSepiaIcon = createShellIcon(ScrollText);
export const ShellClockIcon = createShellIcon(Clock3);
export const ShellLoginIcon = createShellIcon(LogIn);
export const ShellLogoutIcon = createShellIcon(LogOut);
export const ShellMinimizeIcon = createShellIcon(Minus);
export const ShellMaximizeIcon = createShellIcon(Square);
export const ShellRestoreIcon = createShellIcon(Copy);
export const ShellCloseIcon = createShellIcon(CircleX);

const WINDOW_ICON_BY_ID: Record<string, ComponentType<ShellIconProps>> = {
  "ai-assistant": ShellBotIcon,
  "manage": ShellSettingsIcon,
  "control-panel": ShellSettingsIcon,
  "organizations": ShellPeopleIcon,
  "settings": ShellSettingsIcon,
  "crm": ShellPeopleIcon,
  "store": ShellStoreIcon,
  "compliance": ShellComplianceIcon,
  "translations": ShellTranslationsIcon,
  "about": ShellAboutIcon,
  "welcome": ShellWelcomeIcon,
  "all-apps": ShellGridIcon,
  "cart": ShellCartIcon,
  "media-library": ShellPackageIcon,
  "payments": ShellPaymentsIcon,
  "products": ShellPackageIcon,
  "tickets": ShellTicketIcon,
  "certificates": ShellCertificateIcon,
  "events": ShellCalendarIcon,
  "checkout": ShellCheckoutIcon,
  "webchat-deployment": ShellDocsIcon,
  "forms": ShellFormsIcon,
  "web-publishing": ShellDocsIcon,
  "app_invoicing": ShellReceiptIcon,
  "invoicing": ShellReceiptIcon,
  "workflows": ShellWorkflowIcon,
  "templates": ShellTemplatesIcon,
  "integrations": ShellIntegrationsIcon,
  "oauth-tutorial": ShellShieldIcon,
  "tutorials-docs": ShellDocsIcon,
  "login": ShellProfileIcon,
  "projects": ShellBriefcaseIcon,
  "checkout-app": ShellCheckoutIcon,
  "platform-cart": ShellCartIcon,
  "checkout-success": ShellCheckoutIcon,
  "checkout-failed": ShellCheckoutIcon,
  "purchase-result": ShellCheckoutIcon,
  "tutorial-welcome": ShellWelcomeIcon,
  "quick-start": ShellBotIcon,
  "benefits": ShellGiftIcon,
  "booking": ShellCalendarIcon,
  "ai-system": ShellBrainIcon,
  "builder": ShellBuilderIcon,
  "builder-browser": ShellBuilderIcon,
  "agents-browser": ShellPeopleIcon,
  "layers": ShellLayersIcon,
  "layers-browser": ShellLayersIcon,
  "brain": ShellBrainIcon,
  "finder": ShellFinderIcon,
  "text-editor": ShellTextEditorIcon,
  "terminal": ShellTerminalIcon,
  "feedback": ShellDocsIcon,
};

const PRODUCT_APP_ICON_ID_BY_CODE: Record<string, string> = {
  app_invoicing: "invoicing",
};

const LEGACY_EMOJI_ICON_BY_VALUE: Record<string, ComponentType<ShellIconProps>> = {
  "🤖": ShellBotIcon,
  "⚙️": ShellSettingsIcon,
  "🎛️": ShellSettingsIcon,
  "🔧": ShellSettingsIcon,
  "🔐": ShellShieldIcon,
  "👥": ShellPeopleIcon,
  "🏢": ShellPeopleIcon,
  "🏪": ShellStoreIcon,
  "⚖️": ShellComplianceIcon,
  "🌍": ShellTranslationsIcon,
  "ℹ️": ShellAboutIcon,
  "👋": ShellWelcomeIcon,
  "🎂": ShellWelcomeIcon,
  "📱": ShellGridIcon,
  "🛒": ShellCartIcon,
  "🖼️": ShellPackageIcon,
  "💳": ShellPaymentsIcon,
  "📦": ShellPackageIcon,
  "🎫": ShellTicketIcon,
  "🎓": ShellCertificateIcon,
  "📅": ShellCalendarIcon,
  "🛍️": ShellCheckoutIcon,
  "📝": ShellFormsIcon,
  "🌐": ShellDocsIcon,
  "🧾": ShellReceiptIcon,
  "⚡": ShellWorkflowIcon,
  "📑": ShellTemplatesIcon,
  "🔗": ShellIntegrationsIcon,
  "📚": ShellDocsIcon,
  "👤": ShellProfileIcon,
  "💼": ShellBriefcaseIcon,
  "✅": ShellCheckoutIcon,
  "❌": ShellCheckoutIcon,
  "🏷️": ShellCheckoutIcon,
  "🚀": ShellBotIcon,
  "🎁": ShellGiftIcon,
  "📆": ShellCalendarIcon,
  "🧬": ShellBrainIcon,
  "🏗️": ShellBuilderIcon,
  "🕵️": ShellPeopleIcon,
  "🔀": ShellLayersIcon,
  "🧠": ShellBrainIcon,
  "🔍": ShellFinderIcon,
  "🖊️": ShellTextEditorIcon,
  "💻": ShellTerminalIcon,
  "💬": ShellDocsIcon,
};

export function getWindowIconById(
  windowId: string,
  legacyIcon?: string,
  size: 16 | 18 | 20 = 16,
) {
  const Icon =
    WINDOW_ICON_BY_ID[windowId] ??
    (legacyIcon ? LEGACY_EMOJI_ICON_BY_VALUE[legacyIcon] : undefined) ??
    ShellWindowIcon;

  return <Icon size={size} tone={Icon === ShellWindowIcon ? "muted" : "active"} />;
}

export function getProductAppIconByCode(
  appCode: string,
  legacyIcon?: string,
  size: 16 | 18 | 20 = 16,
) {
  const iconId = PRODUCT_APP_ICON_ID_BY_CODE[appCode] ?? appCode;
  return getWindowIconById(iconId, legacyIcon, size);
}
