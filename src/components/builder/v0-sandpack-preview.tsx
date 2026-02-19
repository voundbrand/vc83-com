"use client";

/**
 * V0 LOCAL PREVIEW
 *
 * Renders v0-generated React/TSX files in a self-contained iframe using:
 * - esm.sh for CDN-based ESM imports (React, lucide-react, etc.)
 * - @babel/standalone for in-browser TSX transpilation
 * - Tailwind CDN for utility classes
 *
 * The complex runtime (module loader, import rewriter, Babel transpilation)
 * lives in public/v0-preview-runtime.js as a plain JS file -- no template
 * literal escaping issues. This component fetches it once, then inlines it
 * into the srcdoc HTML alongside the data (FILES, STUBS, mainFile).
 */

import { useMemo, useRef, useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface V0SandpackPreviewProps {
  generatedFiles: Array<{ path: string; content: string; language: string }>;
  height?: string;
  onIframeRef?: (el: HTMLIFrameElement | null) => void;
}

// ============================================================================
// SHADCN CSS VARIABLES
// ============================================================================

// Fallback theme — only used when v0 generates no CSS files.
// Uses Tailwind v4 format (oklch + @theme inline) matching shadcn/new-york defaults.
const FALLBACK_THEME_CSS_TW = `
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}
@layer base {
  * { border-color: var(--color-border); }
  body {
    background-color: var(--color-background);
    color: var(--color-foreground);
  }
}
`;

const FALLBACK_THEME_CSS_ROOT = `
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0.006 285.885);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.965 0.001 286.375);
  --secondary-foreground: oklch(0.205 0.006 285.885);
  --muted: oklch(0.965 0.001 286.375);
  --muted-foreground: oklch(0.556 0.005 286.286);
  --accent: oklch(0.965 0.001 286.375);
  --accent-foreground: oklch(0.205 0.006 285.885);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0.004 286.32);
  --input: oklch(0.922 0.004 286.32);
  --ring: oklch(0.87 0.006 286.286);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0.006 285.885);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.965 0.001 286.375);
  --sidebar-accent-foreground: oklch(0.205 0.006 285.885);
  --sidebar-border: oklch(0.922 0.004 286.32);
  --sidebar-ring: oklch(0.87 0.006 286.286);
  --radius: 0.625rem;
}
body {
  margin: 0;
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
`;

// ============================================================================
// STUB MODULES (inline JS, no JSX -- already browser-ready)
// ============================================================================

const STUB_MODULES: Record<string, string> = {
  // JSX runtime stubs -- safety net if any code references these directly
  "react/jsx-runtime": `
    const React = window.__REACT__;
    export const jsx = React.createElement;
    export const jsxs = React.createElement;
    export const jsxDEV = React.createElement;
    export const Fragment = React.Fragment;
    export default { jsx: React.createElement, jsxs: React.createElement, Fragment: React.Fragment };
  `,
  "react/jsx-dev-runtime": `
    const React = window.__REACT__;
    export const jsx = React.createElement;
    export const jsxs = React.createElement;
    export const jsxDEV = React.createElement;
    export const Fragment = React.Fragment;
    export default { jsx: React.createElement, jsxs: React.createElement, Fragment: React.Fragment };
  `,
  "next/image": `
    const React = window.__REACT__;
    const Image = React.forwardRef(function Image(props, ref) {
      const { fill, loader, priority, quality, unoptimized, placeholder, blurDataURL, ...rest } = props;
      const style = fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" } : {};
      return React.createElement("img", { ...rest, ref, style: { ...style, ...(rest.style || {}) } });
    });
    Image.displayName = "Image";
    export default Image;
  `,
  "next/link": `
    const React = window.__REACT__;
    const Link = React.forwardRef(function Link({ href, children, ...props }, ref) {
      return React.createElement("a", { href, ref, ...props }, children);
    });
    Link.displayName = "Link";
    export default Link;
  `,
  "next/navigation": `
    export function useRouter() { return { push() {}, back() {}, forward() {}, refresh() {}, replace() {}, prefetch() {} }; }
    export function usePathname() { return "/"; }
    export function useSearchParams() { return new URLSearchParams(); }
    export function useParams() { return {}; }
  `,
  "next/font/google": `
    const font = "'Inter', system-ui, sans-serif";
    const handler = { get: () => () => ({ className: "", style: { fontFamily: font } }) };
    export default new Proxy({}, handler);
    export const Inter = () => ({ className: "", style: { fontFamily: font } });
    export const Geist = () => ({ className: "", variable: "--font-geist-sans", style: { fontFamily: font } });
    export const Geist_Mono = () => ({ className: "", variable: "--font-geist-mono", style: { fontFamily: "'Geist Mono', monospace" } });
    export const Roboto = () => ({ className: "", style: { fontFamily: font } });
    export const Poppins = () => ({ className: "", style: { fontFamily: font } });
  `,
  "@/lib/utils": `
    export function cn(...inputs) {
      return inputs.filter(Boolean).flat().filter(x => typeof x === "string").join(" ");
    }
  `,
};

// Simple shadcn/ui component stubs (plain JS, no JSX)
const SHADCN_COMPONENT_STUBS: Record<string, string> = {
  "@/components/ui/button": `
    const React = window.__REACT__;
    const _vc = { default:"bg-primary text-primary-foreground hover:bg-primary/90", destructive:"bg-destructive text-destructive-foreground hover:bg-destructive/90", outline:"border border-input bg-background hover:bg-accent hover:text-accent-foreground", secondary:"bg-secondary text-secondary-foreground hover:bg-secondary/80", ghost:"hover:bg-accent hover:text-accent-foreground", link:"text-primary underline-offset-4 hover:underline" };
    const _sc = { default:"h-10 px-4 py-2", sm:"h-9 rounded-md px-3", lg:"h-11 rounded-md px-8", icon:"h-10 w-10" };
    const _base = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
    const Button = React.forwardRef(function Button({ className = "", variant = "default", size = "default", asChild, children, ...props }, ref) {
      return React.createElement("button", { ref, className: _base + " " + (_vc[variant]||_vc.default) + " " + (_sc[size]||_sc.default) + " " + className, ...props }, children);
    });
    Button.displayName = "Button";
    export { Button };
    export function buttonVariants({ variant = "default", size = "default", className = "" } = {}) { return _base + " " + (_vc[variant]||_vc.default) + " " + (_sc[size]||_sc.default) + " " + className; }
  `,
  "@/components/ui/card": `
    const React = window.__REACT__;
    const c = (tag, name, cls) => { const C = React.forwardRef((p, r) => React.createElement(tag, { ref: r, className: cls + " " + (p.className || ""), ...Object.fromEntries(Object.entries(p).filter(([k]) => k !== "className")) })); C.displayName = name; return C; };
    export const Card = c("div", "Card", "rounded-lg border bg-card text-card-foreground shadow-sm");
    export const CardHeader = c("div", "CardHeader", "flex flex-col space-y-1.5 p-6");
    export const CardTitle = c("h3", "CardTitle", "text-2xl font-semibold leading-none tracking-tight");
    export const CardDescription = c("p", "CardDescription", "text-sm text-muted-foreground");
    export const CardContent = c("div", "CardContent", "p-6 pt-0");
    export const CardFooter = c("div", "CardFooter", "flex items-center p-6 pt-0");
  `,
  "@/components/ui/badge": `
    const React = window.__REACT__;
    const _bv = { default:"border-transparent bg-primary text-primary-foreground hover:bg-primary/80", secondary:"border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80", destructive:"border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80", outline:"text-foreground" };
    export function Badge({ className = "", children, variant = "default", ...props }) {
      return React.createElement("div", { className: "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors " + (_bv[variant]||_bv.default) + " " + className, ...props }, children);
    }
  `,
  "@/components/ui/input": `
    const React = window.__REACT__;
    const Input = React.forwardRef(function Input({ className = "", ...props }, ref) {
      return React.createElement("input", { ref, className: "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 " + className, ...props });
    });
    Input.displayName = "Input";
    export { Input };
  `,
  "@/components/ui/textarea": `
    const React = window.__REACT__;
    const Textarea = React.forwardRef(function Textarea({ className = "", ...props }, ref) {
      return React.createElement("textarea", { ref, className: "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 " + className, ...props });
    });
    Textarea.displayName = "Textarea";
    export { Textarea };
  `,
  "@/components/ui/separator": `
    const React = window.__REACT__;
    const Separator = React.forwardRef(function Separator({ className = "", orientation = "horizontal", ...props }, ref) {
      return React.createElement("div", { ref, role: "separator", className: "shrink-0 bg-border " + (orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]") + " " + className, ...props });
    });
    Separator.displayName = "Separator";
    export { Separator };
  `,
  "@/components/ui/avatar": `
    const React = window.__REACT__;
    const Avatar = React.forwardRef((p, r) => React.createElement("span", { ref: r, className: "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full " + (p.className || ""), ...Object.fromEntries(Object.entries(p).filter(([k]) => k !== "className")) }));
    Avatar.displayName = "Avatar";
    const AvatarImage = React.forwardRef((p, r) => React.createElement("img", { ref: r, className: "aspect-square h-full w-full " + (p.className || ""), ...Object.fromEntries(Object.entries(p).filter(([k]) => k !== "className")) }));
    AvatarImage.displayName = "AvatarImage";
    const AvatarFallback = React.forwardRef((p, r) => React.createElement("span", { ref: r, className: "flex h-full w-full items-center justify-center rounded-full bg-muted " + (p.className || ""), ...Object.fromEntries(Object.entries(p).filter(([k]) => k !== "className")) }));
    AvatarFallback.displayName = "AvatarFallback";
    export { Avatar, AvatarImage, AvatarFallback };
  `,
  "@/components/ui/accordion": `
    const React = window.__REACT__;
    export function Accordion({ children, type = "single", collapsible, className = "", defaultValue, ...props }) {
      const [openItems, setOpenItems] = React.useState(defaultValue ? (Array.isArray(defaultValue) ? defaultValue : [defaultValue]) : []);
      const toggle = (value) => {
        if (type === "single") {
          setOpenItems(prev => prev.includes(value) && collapsible ? [] : [value]);
        } else {
          setOpenItems(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
        }
      };
      return React.createElement("div", { className, ...props },
        React.Children.map(children, child => child && React.isValidElement(child) ? React.cloneElement(child, { _openItems: openItems, _toggle: toggle }) : child)
      );
    }
    export function AccordionItem({ children, value, className = "", _openItems = [], _toggle, ...props }) {
      const isOpen = _openItems.includes(value);
      return React.createElement("div", { className: "border-b " + className, ...props },
        React.Children.map(children, child => child && React.isValidElement(child) ? React.cloneElement(child, { _isOpen: isOpen, _value: value, _toggle }) : child)
      );
    }
    export function AccordionTrigger({ children, className = "", _isOpen, _value, _toggle, ...props }) {
      return React.createElement("h3", { className: "flex" },
        React.createElement("button", {
          className: "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline " + className,
          onClick: () => _toggle && _toggle(_value), ...props
        }, children, React.createElement("span", { className: "ml-2 transition-transform " + (_isOpen ? "rotate-180" : "") }, "\\u25BC"))
      );
    }
    export function AccordionContent({ children, className = "", _isOpen, ...props }) {
      if (!_isOpen) return null;
      return React.createElement("div", { className: "overflow-hidden text-sm transition-all pb-4 pt-0 " + className, ...props }, children);
    }
  `,
  "@/components/ui/scroll-area": `
    const React = window.__REACT__;
    const ScrollArea = React.forwardRef(function ScrollArea({ children, className = "", ...props }, ref) {
      return React.createElement("div", { ref, className: "relative overflow-auto " + className, ...props }, children);
    });
    ScrollArea.displayName = "ScrollArea";
    const ScrollBar = React.forwardRef(function ScrollBar(props, ref) { return null; });
    ScrollBar.displayName = "ScrollBar";
    export { ScrollArea, ScrollBar };
  `,
  "@/components/ui/dialog": `
    const React = window.__REACT__;
    const Ctx = React.createContext({ open: false, setOpen: () => {} });
    export function Dialog({ children, open: controlledOpen, onOpenChange }) {
      const [internalOpen, setInternalOpen] = React.useState(false);
      const isControlled = controlledOpen !== undefined;
      const open = isControlled ? controlledOpen : internalOpen;
      const setOpen = React.useCallback((v) => { if (!isControlled) setInternalOpen(v); if (onOpenChange) onOpenChange(v); }, [isControlled, onOpenChange]);
      return React.createElement(Ctx.Provider, { value: { open, setOpen } }, children);
    }
    export function DialogTrigger({ children, asChild, ...props }) {
      const { setOpen } = React.useContext(Ctx);
      return React.createElement("span", { ...props, onClick: (e) => { setOpen(true); props.onClick && props.onClick(e); }, style: { cursor: "pointer", ...props.style } }, children);
    }
    export function DialogContent({ children, className = "", ...props }) {
      const { open, setOpen } = React.useContext(Ctx);
      if (!open) return null;
      return React.createElement("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/80 " + className, onClick: (e) => { if (e.target === e.currentTarget) setOpen(false); } },
        React.createElement("div", { className: "bg-background rounded-lg border shadow-lg p-6 max-w-lg w-full", ...props }, children)
      );
    }
    export function DialogHeader({ children, className = "", ...props }) {
      return React.createElement("div", { className: "flex flex-col space-y-1.5 text-center sm:text-left " + className, ...props }, children);
    }
    export function DialogTitle({ children, className = "", ...props }) {
      return React.createElement("h2", { className: "text-lg font-semibold leading-none tracking-tight " + className, ...props }, children);
    }
    export function DialogDescription({ children, className = "", ...props }) {
      return React.createElement("p", { className: "text-sm text-muted-foreground " + className, ...props }, children);
    }
    export function DialogFooter({ children, className = "", ...props }) {
      return React.createElement("div", { className: "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 " + className, ...props }, children);
    }
    export function DialogClose({ children, asChild, ...props }) {
      const { setOpen } = React.useContext(Ctx);
      return React.createElement("span", { ...props, onClick: (e) => { setOpen(false); props.onClick && props.onClick(e); }, style: { cursor: "pointer", ...props.style } }, children);
    }
  `,
  "@/components/ui/select": `
    const React = window.__REACT__;
    export function Select({ children, value, onValueChange, defaultValue }) {
      const [val, setVal] = React.useState(value || defaultValue || "");
      React.useEffect(() => { if (value !== undefined) setVal(value); }, [value]);
      return React.createElement(React.Fragment, null,
        React.Children.map(children, child => child && React.isValidElement(child) ? React.cloneElement(child, { _value: val, _onValueChange: onValueChange || setVal }) : child)
      );
    }
    export function SelectTrigger({ children, className = "", _value, ...props }) {
      return React.createElement("button", { className: "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm " + className, ...props }, children);
    }
    export function SelectValue({ placeholder, _value }) {
      return React.createElement("span", null, _value || placeholder || "");
    }
    export function SelectContent({ children, ...props }) {
      return React.createElement("div", { className: "bg-popover rounded-md border shadow-md p-1" }, children);
    }
    export function SelectItem({ children, value, _onValueChange, ...props }) {
      return React.createElement("div", { className: "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm hover:bg-accent", onClick: () => _onValueChange && _onValueChange(value), ...props }, children);
    }
    export function SelectGroup({ children }) { return React.createElement(React.Fragment, null, children); }
    export function SelectLabel({ children, className = "" }) { return React.createElement("div", { className: "py-1.5 px-2 text-sm font-semibold " + className }, children); }
  `,
  "@/components/ui/switch": `
    const React = window.__REACT__;
    const Switch = React.forwardRef(function Switch({ checked, onCheckedChange, className = "", ...props }, ref) {
      return React.createElement("button", {
        ref, role: "switch", "aria-checked": !!checked,
        className: "peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors " + (checked ? "bg-primary" : "bg-input") + " " + className,
        onClick: () => onCheckedChange && onCheckedChange(!checked), ...props
      }, React.createElement("span", { className: "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform " + (checked ? "translate-x-5" : "translate-x-0") }));
    });
    Switch.displayName = "Switch";
    export { Switch };
  `,
  "@/components/ui/label": `
    const React = window.__REACT__;
    const Label = React.forwardRef(function Label({ className = "", ...props }, ref) {
      return React.createElement("label", { ref, className: "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 " + className, ...props });
    });
    Label.displayName = "Label";
    export { Label };
  `,
  "@/components/ui/tabs": `
    const React = window.__REACT__;
    export function Tabs({ children, defaultValue, className = "", ...props }) {
      const [active, setActive] = React.useState(defaultValue || "");
      return React.createElement("div", { className, "data-active": active, ...props },
        React.Children.map(children, child => child && React.isValidElement(child) ? React.cloneElement(child, { _active: active, _setActive: setActive }) : child)
      );
    }
    export function TabsList({ children, className = "", _active, _setActive, ...props }) {
      return React.createElement("div", { className: "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground " + className, ...props },
        React.Children.map(children, child => child && React.isValidElement(child) ? React.cloneElement(child, { _active, _setActive }) : child)
      );
    }
    export function TabsTrigger({ children, value, className = "", _active, _setActive, ...props }) {
      const isActive = _active === value;
      return React.createElement("button", {
        className: "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all " + (isActive ? "bg-background text-foreground shadow-sm" : "") + " " + className,
        onClick: () => _setActive && _setActive(value), ...props
      }, children);
    }
    export function TabsContent({ children, value, className = "", _active, ...props }) {
      if (_active !== value) return null;
      return React.createElement("div", { className: "mt-2 " + className, ...props }, children);
    }
  `,
  "@/components/ui/table": `
    const React = window.__REACT__;
    const c = (tag, name, cls) => { const C = React.forwardRef((p, r) => React.createElement(tag, { ref: r, className: cls + " " + (p.className || ""), ...Object.fromEntries(Object.entries(p).filter(([k]) => k !== "className")) })); C.displayName = name; return C; };
    export const Table = React.forwardRef((p, r) => React.createElement("div", { className: "relative w-full overflow-auto" }, React.createElement("table", { ref: r, className: "w-full caption-bottom text-sm " + (p.className || ""), ...Object.fromEntries(Object.entries(p).filter(([k]) => k !== "className")) })));
    Table.displayName = "Table";
    export const TableHeader = c("thead", "TableHeader", "[&_tr]:border-b");
    export const TableBody = c("tbody", "TableBody", "[&_tr:last-child]:border-0");
    export const TableFooter = c("tfoot", "TableFooter", "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0");
    export const TableRow = c("tr", "TableRow", "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted");
    export const TableHead = c("th", "TableHead", "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0");
    export const TableCell = c("td", "TableCell", "p-4 align-middle [&:has([role=checkbox])]:pr-0");
    export const TableCaption = c("caption", "TableCaption", "mt-4 text-sm text-muted-foreground");
  `,
  "@/components/ui/tooltip": `
    const React = window.__REACT__;
    export function TooltipProvider({ children }) { return React.createElement(React.Fragment, null, children); }
    export function Tooltip({ children }) { return React.createElement(React.Fragment, null, children); }
    export function TooltipTrigger({ children, asChild, ...props }) { return React.createElement("span", props, children); }
    export function TooltipContent({ children, className = "", ...props }) { return null; }
  `,
  "@/components/ui/dropdown-menu": `
    const React = window.__REACT__;
    export function DropdownMenu({ children }) { return React.createElement(React.Fragment, null, children); }
    export function DropdownMenuTrigger({ children, asChild, ...props }) { return React.createElement("span", props, children); }
    export function DropdownMenuContent({ children, className = "", ...props }) { return null; }
    export function DropdownMenuItem({ children, className = "", ...props }) { return React.createElement("div", { className: "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground " + className, ...props }, children); }
    export function DropdownMenuSeparator({ className = "", ...props }) { return React.createElement("div", { className: "-mx-1 my-1 h-px bg-muted " + className, ...props }); }
    export function DropdownMenuLabel({ children, className = "", ...props }) { return React.createElement("div", { className: "px-2 py-1.5 text-sm font-semibold " + className, ...props }, children); }
    export function DropdownMenuCheckboxItem({ children, checked, ...props }) { return React.createElement("div", props, children); }
    export function DropdownMenuRadioGroup({ children, ...props }) { return React.createElement(React.Fragment, null, children); }
    export function DropdownMenuRadioItem({ children, ...props }) { return React.createElement("div", props, children); }
    export function DropdownMenuSub({ children }) { return React.createElement(React.Fragment, null, children); }
    export function DropdownMenuSubTrigger({ children, ...props }) { return React.createElement("div", props, children); }
    export function DropdownMenuSubContent({ children, ...props }) { return null; }
    export function DropdownMenuGroup({ children }) { return React.createElement(React.Fragment, null, children); }
    export function DropdownMenuPortal({ children }) { return React.createElement(React.Fragment, null, children); }
    export function DropdownMenuShortcut({ children, className = "" }) { return React.createElement("span", { className: "ml-auto text-xs tracking-widest opacity-60 " + className }, children); }
  `,
  "@/components/ui/progress": `
    const React = window.__REACT__;
    const Progress = React.forwardRef(function Progress({ className = "", value = 0, ...props }, ref) {
      return React.createElement("div", { ref, className: "relative h-4 w-full overflow-hidden rounded-full bg-secondary " + className, ...props },
        React.createElement("div", { className: "h-full w-full flex-1 bg-primary transition-all", style: { transform: "translateX(-" + (100 - (value || 0)) + "%)" } })
      );
    });
    Progress.displayName = "Progress";
    export { Progress };
  `,
  "@/components/ui/skeleton": `
    const React = window.__REACT__;
    export function Skeleton({ className = "", ...props }) {
      return React.createElement("div", { className: "animate-pulse rounded-md bg-muted " + className, ...props });
    }
  `,
  "@/components/ui/checkbox": `
    const React = window.__REACT__;
    const Checkbox = React.forwardRef(function Checkbox({ className = "", checked, onCheckedChange, ...props }, ref) {
      return React.createElement("button", {
        ref, role: "checkbox", "aria-checked": !!checked, "data-state": checked ? "checked" : "unchecked",
        className: "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 " + (checked ? "bg-primary text-primary-foreground " : "") + className,
        onClick: () => onCheckedChange && onCheckedChange(!checked), ...props
      }, checked ? React.createElement("span", { className: "flex items-center justify-center text-current" }, "\\u2713") : null);
    });
    Checkbox.displayName = "Checkbox";
    export { Checkbox };
  `,
  "@/components/ui/sheet": `
    const React = window.__REACT__;
    const Ctx = React.createContext({ open: false, setOpen: () => {} });
    export function Sheet({ children, open: controlledOpen, onOpenChange }) {
      const [internalOpen, setInternalOpen] = React.useState(false);
      const isControlled = controlledOpen !== undefined;
      const open = isControlled ? controlledOpen : internalOpen;
      const setOpen = React.useCallback((v) => { if (!isControlled) setInternalOpen(v); if (onOpenChange) onOpenChange(v); }, [isControlled, onOpenChange]);
      return React.createElement(Ctx.Provider, { value: { open, setOpen } }, children);
    }
    export function SheetTrigger({ children, asChild, ...props }) {
      const { setOpen } = React.useContext(Ctx);
      return React.createElement("span", { ...props, onClick: (e) => { setOpen(true); props.onClick && props.onClick(e); }, style: { cursor: "pointer", ...props.style } }, children);
    }
    export function SheetContent({ children, className = "", side = "right", ...props }) {
      const { open, setOpen } = React.useContext(Ctx);
      if (!open) return null;
      const justify = side === "left" ? "justify-start" : side === "top" ? "items-start" : side === "bottom" ? "items-end" : "justify-end";
      return React.createElement("div", { className: "fixed inset-0 z-50 flex " + justify, onClick: (e) => { if (e.target === e.currentTarget) setOpen(false); } },
        React.createElement("div", { className: "bg-background border shadow-lg p-6 " + (side === "left" || side === "right" ? "w-3/4 max-w-sm h-full" : "w-full max-h-[80vh]") + " " + className, ...props }, children)
      );
    }
    export function SheetHeader({ children, className = "", ...props }) { return React.createElement("div", { className: "flex flex-col space-y-2 text-center sm:text-left " + className, ...props }, children); }
    export function SheetTitle({ children, className = "", ...props }) { return React.createElement("h2", { className: "text-lg font-semibold " + className, ...props }, children); }
    export function SheetDescription({ children, className = "", ...props }) { return React.createElement("p", { className: "text-sm text-muted-foreground " + className, ...props }, children); }
    export function SheetFooter({ children, className = "", ...props }) { return React.createElement("div", { className: "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 " + className, ...props }, children); }
    export function SheetClose({ children, ...props }) {
      const { setOpen } = React.useContext(Ctx);
      return React.createElement("span", { ...props, onClick: (e) => { setOpen(false); props.onClick && props.onClick(e); }, style: { cursor: "pointer", ...props.style } }, children);
    }
  `,
  "@/components/ui/drawer": `
    const React = window.__REACT__;
    const Ctx = React.createContext({ open: false, setOpen: () => {} });
    export function Drawer({ children, open: controlledOpen, onOpenChange }) {
      const [internalOpen, setInternalOpen] = React.useState(false);
      const isControlled = controlledOpen !== undefined;
      const open = isControlled ? controlledOpen : internalOpen;
      const setOpen = React.useCallback((v) => { if (!isControlled) setInternalOpen(v); if (onOpenChange) onOpenChange(v); }, [isControlled, onOpenChange]);
      return React.createElement(Ctx.Provider, { value: { open, setOpen } }, children);
    }
    export function DrawerTrigger({ children, asChild, ...props }) {
      const { setOpen } = React.useContext(Ctx);
      return React.createElement("span", { ...props, onClick: (e) => { setOpen(true); props.onClick && props.onClick(e); }, style: { cursor: "pointer", ...props.style } }, children);
    }
    export function DrawerContent({ children, className = "", ...props }) {
      const { open, setOpen } = React.useContext(Ctx);
      if (!open) return null;
      return React.createElement("div", { className: "fixed inset-0 z-50 flex items-end", onClick: (e) => { if (e.target === e.currentTarget) setOpen(false); } },
        React.createElement("div", { className: "bg-background border-t rounded-t-lg shadow-lg p-6 w-full max-h-[80vh] overflow-auto " + className, ...props }, children));
    }
    export function DrawerHeader({ children, className = "", ...props }) { return React.createElement("div", { className: "flex flex-col space-y-2 text-center sm:text-left " + className, ...props }, children); }
    export function DrawerTitle({ children, className = "", ...props }) { return React.createElement("h2", { className: "text-lg font-semibold " + className, ...props }, children); }
    export function DrawerDescription({ children, className = "", ...props }) { return React.createElement("p", { className: "text-sm text-muted-foreground " + className, ...props }, children); }
    export function DrawerFooter({ children, className = "", ...props }) { return React.createElement("div", { className: "flex flex-col gap-2 mt-auto " + className, ...props }, children); }
    export function DrawerClose({ children, ...props }) {
      const { setOpen } = React.useContext(Ctx);
      return React.createElement("span", { ...props, onClick: (e) => { setOpen(false); props.onClick && props.onClick(e); }, style: { cursor: "pointer", ...props.style } }, children);
    }
  `,
  "@/components/ui/popover": `
    const React = window.__REACT__;
    export function Popover({ children }) { return React.createElement(React.Fragment, null, children); }
    export function PopoverTrigger({ children, asChild, ...props }) { return React.createElement("span", props, children); }
    export function PopoverContent({ children, className = "", ...props }) { return null; }
  `,
  "@/components/ui/radio-group": `
    const React = window.__REACT__;
    export function RadioGroup({ children, value, onValueChange, defaultValue, className = "", ...props }) {
      const [val, setVal] = React.useState(value || defaultValue || "");
      React.useEffect(() => { if (value !== undefined) setVal(value); }, [value]);
      return React.createElement("div", { role: "radiogroup", className: "grid gap-2 " + className, ...props },
        React.Children.map(children, child => child && React.isValidElement(child) ? React.cloneElement(child, { _value: val, _onValueChange: onValueChange || setVal }) : child)
      );
    }
    const RadioGroupItem = React.forwardRef(function RadioGroupItem({ className = "", value, _value, _onValueChange, ...props }, ref) {
      const checked = _value === value;
      return React.createElement("button", {
        ref, role: "radio", "aria-checked": checked, "data-state": checked ? "checked" : "unchecked",
        className: "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 " + className,
        onClick: () => _onValueChange && _onValueChange(value), ...props
      }, checked ? React.createElement("span", { className: "flex items-center justify-center" }, React.createElement("span", { className: "h-2.5 w-2.5 rounded-full bg-current" })) : null);
    });
    RadioGroupItem.displayName = "RadioGroupItem";
    export { RadioGroupItem };
  `,
  "@/components/ui/navigation-menu": `
    const React = window.__REACT__;
    const c = (tag, name, cls) => { const C = React.forwardRef((p, r) => React.createElement(tag, { ref: r, className: cls + " " + (p.className || ""), ...Object.fromEntries(Object.entries(p).filter(([k]) => k !== "className")) })); C.displayName = name; return C; };
    export const NavigationMenu = c("nav", "NavigationMenu", "relative z-10 flex max-w-max flex-1 items-center justify-center");
    export const NavigationMenuList = c("ul", "NavigationMenuList", "group flex flex-1 list-none items-center justify-center space-x-1");
    export function NavigationMenuItem({ children, className = "", ...props }) { return React.createElement("li", { className, ...props }, children); }
    export function NavigationMenuTrigger({ children, className = "", ...props }) {
      return React.createElement("button", { className: "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none " + className, ...props }, children);
    }
    export function NavigationMenuContent({ children, className = "", ...props }) { return null; }
    export function NavigationMenuLink({ children, className = "", ...props }) {
      return React.createElement("a", { className: "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground " + className, ...props }, children);
    }
    export const NavigationMenuViewport = c("div", "NavigationMenuViewport", "");
    export function navigationMenuTriggerStyle() { return "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"; }
    export function NavigationMenuIndicator() { return null; }
  `,
  "@/components/ui/alert": `
    const React = window.__REACT__;
    const c = (tag, name, cls) => { const C = React.forwardRef((p, r) => React.createElement(tag, { ref: r, className: cls + " " + (p.className || ""), ...Object.fromEntries(Object.entries(p).filter(([k]) => k !== "className")) })); C.displayName = name; return C; };
    const _av = { default:"bg-background text-foreground", destructive:"border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive" };
    export const Alert = React.forwardRef(function Alert({ className = "", variant = "default", ...props }, ref) {
      return React.createElement("div", { ref, role: "alert", className: "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground " + (_av[variant]||_av.default) + " " + className, ...props });
    });
    Alert.displayName = "Alert";
    export const AlertTitle = c("h5", "AlertTitle", "mb-1 font-medium leading-none tracking-tight");
    export const AlertDescription = c("div", "AlertDescription", "text-sm [&_p]:leading-relaxed");
  `,
  "@/components/ui/alert-dialog": `
    const React = window.__REACT__;
    const Ctx = React.createContext({ open: false, setOpen: () => {} });
    export function AlertDialog({ children, open: controlledOpen, onOpenChange }) {
      const [internalOpen, setInternalOpen] = React.useState(false);
      const isControlled = controlledOpen !== undefined;
      const open = isControlled ? controlledOpen : internalOpen;
      const setOpen = React.useCallback((v) => { if (!isControlled) setInternalOpen(v); if (onOpenChange) onOpenChange(v); }, [isControlled, onOpenChange]);
      return React.createElement(Ctx.Provider, { value: { open, setOpen } }, children);
    }
    export function AlertDialogTrigger({ children, asChild, ...props }) {
      const { setOpen } = React.useContext(Ctx);
      return React.createElement("span", { ...props, onClick: (e) => { setOpen(true); props.onClick && props.onClick(e); }, style: { cursor: "pointer", ...props.style } }, children);
    }
    export function AlertDialogContent({ children, className = "", ...props }) {
      const { open, setOpen } = React.useContext(Ctx);
      if (!open) return null;
      return React.createElement("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/80 " + className, onClick: (e) => { if (e.target === e.currentTarget) setOpen(false); } },
        React.createElement("div", { className: "bg-background rounded-lg border shadow-lg p-6 max-w-lg w-full", ...props }, children));
    }
    export function AlertDialogHeader({ children, className = "", ...props }) { return React.createElement("div", { className: "flex flex-col space-y-2 text-center sm:text-left " + className, ...props }, children); }
    export function AlertDialogFooter({ children, className = "", ...props }) { return React.createElement("div", { className: "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 " + className, ...props }, children); }
    export function AlertDialogTitle({ children, className = "", ...props }) { return React.createElement("h2", { className: "text-lg font-semibold " + className, ...props }, children); }
    export function AlertDialogDescription({ children, className = "", ...props }) { return React.createElement("p", { className: "text-sm text-muted-foreground " + className, ...props }, children); }
    export function AlertDialogAction({ children, className = "", ...props }) {
      const { setOpen } = React.useContext(Ctx);
      return React.createElement("button", { className: "inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-4 py-2 " + className, ...props, onClick: (e) => { setOpen(false); props.onClick && props.onClick(e); } }, children);
    }
    export function AlertDialogCancel({ children, className = "", ...props }) {
      const { setOpen } = React.useContext(Ctx);
      return React.createElement("button", { className: "inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background h-10 px-4 py-2 mt-2 sm:mt-0 " + className, ...props, onClick: (e) => { setOpen(false); props.onClick && props.onClick(e); } }, children);
    }
  `,
  "@/components/ui/slider": `
    const React = window.__REACT__;
    const Slider = React.forwardRef(function Slider({ className = "", value, defaultValue, onValueChange, min = 0, max = 100, step = 1, ...props }, ref) {
      const [val, setVal] = React.useState((value || defaultValue || [50])[0]);
      React.useEffect(() => { if (value) setVal(value[0]); }, [value]);
      const pct = ((val - min) / (max - min)) * 100;
      return React.createElement("div", { ref, className: "relative flex w-full touch-none select-none items-center " + className, ...props },
        React.createElement("div", { className: "relative h-2 w-full grow overflow-hidden rounded-full bg-secondary" },
          React.createElement("div", { className: "absolute h-full bg-primary", style: { width: pct + "%" } })
        ),
        React.createElement("input", { type: "range", min, max, step, value: val, onChange: (e) => { const v = Number(e.target.value); setVal(v); onValueChange && onValueChange([v]); }, className: "absolute inset-0 h-full w-full cursor-pointer opacity-0" })
      );
    });
    Slider.displayName = "Slider";
    export { Slider };
  `,
  "@/components/ui/toggle": `
    const React = window.__REACT__;
    const _tv = { default:"bg-transparent", outline:"border border-input bg-transparent" };
    const _ts = { default:"h-10 px-3", sm:"h-9 px-2.5", lg:"h-11 px-5" };
    const Toggle = React.forwardRef(function Toggle({ className = "", variant = "default", size = "default", pressed, onPressedChange, children, ...props }, ref) {
      return React.createElement("button", {
        ref, "aria-pressed": !!pressed, "data-state": pressed ? "on" : "off",
        className: "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground data-[state=on]:bg-accent data-[state=on]:text-accent-foreground " + (_tv[variant]||_tv.default) + " " + (_ts[size]||_ts.default) + " " + className,
        onClick: () => onPressedChange && onPressedChange(!pressed), ...props
      }, children);
    });
    Toggle.displayName = "Toggle";
    export { Toggle };
  `,
  "@/components/ui/toggle-group": `
    const React = window.__REACT__;
    export function ToggleGroup({ children, type = "single", value, onValueChange, className = "", ...props }) {
      return React.createElement("div", { className: "flex items-center justify-center gap-1 " + className, ...props }, children);
    }
    export function ToggleGroupItem({ children, value, className = "", ...props }) {
      return React.createElement("button", { className: "inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-3 hover:bg-muted hover:text-muted-foreground " + className, ...props }, children);
    }
  `,
  "@/components/ui/hover-card": `
    const React = window.__REACT__;
    export function HoverCard({ children }) { return React.createElement(React.Fragment, null, children); }
    export function HoverCardTrigger({ children, asChild, ...props }) { return React.createElement("span", props, children); }
    export function HoverCardContent({ children, className = "", ...props }) { return null; }
  `,
  "@/components/ui/collapsible": `
    const React = window.__REACT__;
    export function Collapsible({ children, open, onOpenChange, className = "", ...props }) {
      return React.createElement("div", { className, ...props }, children);
    }
    export function CollapsibleTrigger({ children, asChild, ...props }) { return React.createElement("span", { style: { cursor: "pointer" }, ...props }, children); }
    export function CollapsibleContent({ children, className = "", ...props }) { return React.createElement("div", { className, ...props }, children); }
  `,
  "@/components/ui/breadcrumb": `
    const React = window.__REACT__;
    const c = (tag, name, cls) => { const C = React.forwardRef((p, r) => React.createElement(tag, { ref: r, className: cls + " " + (p.className || ""), ...Object.fromEntries(Object.entries(p).filter(([k]) => k !== "className")) })); C.displayName = name; return C; };
    export const Breadcrumb = c("nav", "Breadcrumb", "");
    export const BreadcrumbList = c("ol", "BreadcrumbList", "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5");
    export const BreadcrumbItem = c("li", "BreadcrumbItem", "inline-flex items-center gap-1.5");
    export const BreadcrumbLink = React.forwardRef((p, r) => React.createElement("a", { ref: r, className: "transition-colors hover:text-foreground " + (p.className || ""), ...Object.fromEntries(Object.entries(p).filter(([k]) => k !== "className")) }));
    BreadcrumbLink.displayName = "BreadcrumbLink";
    export function BreadcrumbPage({ children, className = "", ...props }) { return React.createElement("span", { role: "link", "aria-current": "page", className: "font-normal text-foreground " + className, ...props }, children); }
    export function BreadcrumbSeparator({ children, className = "", ...props }) { return React.createElement("li", { role: "presentation", "aria-hidden": true, className: "[&>svg]:size-3.5 " + className, ...props }, children || "/"); }
    export function BreadcrumbEllipsis({ className = "", ...props }) { return React.createElement("span", { className: "flex h-9 w-9 items-center justify-center " + className, ...props }, "..."); }
  `,
  "@/components/ui/command": `
    const React = window.__REACT__;
    const c = (tag, name, cls) => { const C = React.forwardRef((p, r) => React.createElement(tag, { ref: r, className: cls + " " + (p.className || ""), ...Object.fromEntries(Object.entries(p).filter(([k]) => k !== "className")) })); C.displayName = name; return C; };
    export const Command = c("div", "Command", "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground");
    export const CommandInput = React.forwardRef(function CommandInput({ className = "", ...props }, ref) {
      return React.createElement("div", { className: "flex items-center border-b px-3" },
        React.createElement("input", { ref, className: "flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground " + className, ...props }));
    });
    CommandInput.displayName = "CommandInput";
    export const CommandList = c("div", "CommandList", "max-h-[300px] overflow-y-auto overflow-x-hidden");
    export const CommandEmpty = c("div", "CommandEmpty", "py-6 text-center text-sm");
    export const CommandGroup = c("div", "CommandGroup", "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground");
    export const CommandItem = c("div", "CommandItem", "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground");
    export const CommandSeparator = c("div", "CommandSeparator", "-mx-1 h-px bg-border");
    export const CommandShortcut = c("span", "CommandShortcut", "ml-auto text-xs tracking-widest text-muted-foreground");
    export function CommandDialog({ children, ...props }) { return React.createElement("div", props, children); }
  `,
  "@/components/ui/context-menu": `
    const React = window.__REACT__;
    export function ContextMenu({ children }) { return React.createElement(React.Fragment, null, children); }
    export function ContextMenuTrigger({ children, ...props }) { return React.createElement("span", props, children); }
    export function ContextMenuContent({ children }) { return null; }
    export function ContextMenuItem({ children, className = "", ...props }) { return React.createElement("div", { className: "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none " + className, ...props }, children); }
    export function ContextMenuSeparator() { return React.createElement("div", { className: "-mx-1 my-1 h-px bg-border" }); }
    export function ContextMenuLabel({ children, className = "" }) { return React.createElement("div", { className: "px-2 py-1.5 text-sm font-semibold " + className }, children); }
    export function ContextMenuCheckboxItem({ children, ...props }) { return React.createElement("div", props, children); }
    export function ContextMenuRadioGroup({ children }) { return React.createElement(React.Fragment, null, children); }
    export function ContextMenuRadioItem({ children, ...props }) { return React.createElement("div", props, children); }
    export function ContextMenuSub({ children }) { return React.createElement(React.Fragment, null, children); }
    export function ContextMenuSubTrigger({ children, ...props }) { return React.createElement("div", props, children); }
    export function ContextMenuSubContent({ children }) { return null; }
    export function ContextMenuShortcut({ children, className = "" }) { return React.createElement("span", { className: "ml-auto text-xs tracking-widest opacity-60 " + className }, children); }
  `,
  "@/components/ui/menubar": `
    const React = window.__REACT__;
    const c = (tag, name, cls) => { const C = React.forwardRef((p, r) => React.createElement(tag, { ref: r, className: cls + " " + (p.className || ""), ...Object.fromEntries(Object.entries(p).filter(([k]) => k !== "className")) })); C.displayName = name; return C; };
    export const Menubar = c("div", "Menubar", "flex h-10 items-center space-x-1 rounded-md border bg-background p-1");
    export function MenubarMenu({ children }) { return React.createElement(React.Fragment, null, children); }
    export function MenubarTrigger({ children, className = "", ...props }) { return React.createElement("button", { className: "flex cursor-default select-none items-center rounded-sm px-3 py-1.5 text-sm font-medium outline-none hover:bg-accent hover:text-accent-foreground " + className, ...props }, children); }
    export function MenubarContent({ children }) { return null; }
    export function MenubarItem({ children, className = "", ...props }) { return React.createElement("div", { className: "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent " + className, ...props }, children); }
    export function MenubarSeparator() { return React.createElement("div", { className: "-mx-1 my-1 h-px bg-muted" }); }
    export function MenubarLabel({ children, className = "" }) { return React.createElement("div", { className: "px-2 py-1.5 text-sm font-semibold " + className }, children); }
    export function MenubarCheckboxItem({ children, ...props }) { return React.createElement("div", props, children); }
    export function MenubarRadioGroup({ children }) { return React.createElement(React.Fragment, null, children); }
    export function MenubarRadioItem({ children, ...props }) { return React.createElement("div", props, children); }
    export function MenubarSub({ children }) { return React.createElement(React.Fragment, null, children); }
    export function MenubarSubTrigger({ children, ...props }) { return React.createElement("div", props, children); }
    export function MenubarSubContent({ children }) { return null; }
    export function MenubarShortcut({ children, className = "" }) { return React.createElement("span", { className: "ml-auto text-xs tracking-widest text-muted-foreground " + className }, children); }
  `,
  "@/components/ui/calendar": `
    const React = window.__REACT__;
    export function Calendar({ className = "", selected, onSelect, mode = "single", ...props }) {
      return React.createElement("div", { className: "p-3 rounded-md border " + className },
        React.createElement("div", { className: "text-sm text-center text-muted-foreground" }, "Calendar"));
    }
  `,
  "@/hooks/use-toast": `
    const React = window.__REACT__;
    export function useToast() {
      return { toast: function() {}, toasts: [], dismiss: function() {} };
    }
    export function toast() {}
  `,
  "@/components/ui/toaster": `
    const React = window.__REACT__;
    export function Toaster() { return null; }
  `,
};

// ============================================================================
// IMPORT MAP
// ============================================================================

const IMPORT_MAP = {
  imports: {
    "react": "https://esm.sh/react@18.3.1",
    "react/": "https://esm.sh/react@18.3.1/",
    "react-dom": "https://esm.sh/react-dom@18.3.1",
    "react-dom/": "https://esm.sh/react-dom@18.3.1/",
    "react-dom/client": "https://esm.sh/react-dom@18.3.1/client",
    "lucide-react": "https://esm.sh/lucide-react@0.544.0?external=react",
    "clsx": "https://esm.sh/clsx@2.1.1",
    "tailwind-merge": "https://esm.sh/tailwind-merge@2.6.0",
    "class-variance-authority": "https://esm.sh/class-variance-authority@0.7.1",
    "framer-motion": "https://esm.sh/framer-motion@11.15.0?external=react,react-dom",
    "react-icons/": "https://esm.sh/react-icons@4.12.0/",
  },
};

// ============================================================================
// BUILDER INSPECTOR SCRIPT (injected into iframe for element selection)
// ============================================================================

const INSPECTOR_SCRIPT = `
(function() {
  if (window.parent === window) return;
  var isActive = false, overlay = null;
  function createOverlay() {
    var el = document.createElement("div");
    el.id = "builder-inspector-overlay";
    el.style.cssText = "position:fixed;pointer-events:none;border:2px solid #8b5cf6;border-radius:4px;background:rgba(139,92,246,0.08);z-index:99999;transition:all 0.15s ease;display:none;";
    document.body.appendChild(el);
    return el;
  }
  function getMeta(el) {
    var rect = el.getBoundingClientRect();
    var tag = el.tagName.toLowerCase();
    var text = (el.innerText || "").slice(0, 200);
    var isForm = tag === "form" || !!el.querySelector("form,input,textarea,select");
    var isProduct = !!el.querySelector("[data-price],.price") || /\\$\\d/.test(text);
    var isContact = !!el.querySelector("a[href^='mailto:'],a[href^='tel:']") || /email|phone|contact/i.test(text);
    return {
      tag: tag, id: el.id || undefined,
      className: (el.className && typeof el.className === "string") ? el.className.slice(0, 200) : undefined,
      text: text.slice(0, 100),
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      suggestedType: isForm ? "form" : isProduct ? "product" : isContact ? "contact" : null,
      html: el.outerHTML.slice(0, 500)
    };
  }
  function onOver(e) {
    if (!isActive || !overlay) return;
    var el = e.target; if (el === overlay) return;
    var r = el.getBoundingClientRect();
    overlay.style.top = r.top + "px"; overlay.style.left = r.left + "px";
    overlay.style.width = r.width + "px"; overlay.style.height = r.height + "px";
    overlay.style.display = "block";
  }
  function onOut() { if (overlay) overlay.style.display = "none"; }
  function onClick(e) {
    if (!isActive) return;
    e.preventDefault(); e.stopPropagation();
    window.parent.postMessage({ type: "builder:element_selected", payload: getMeta(e.target) }, "*");
  }
  function activate() {
    if (isActive) return; isActive = true;
    overlay = overlay || createOverlay();
    document.addEventListener("mouseover", onOver, true);
    document.addEventListener("mouseout", onOut, true);
    document.addEventListener("click", onClick, true);
    document.body.style.cursor = "crosshair";
    window.parent.postMessage({ type: "builder:inspector_ready" }, "*");
  }
  function deactivate() {
    isActive = false;
    document.removeEventListener("mouseover", onOver, true);
    document.removeEventListener("mouseout", onOut, true);
    document.removeEventListener("click", onClick, true);
    document.body.style.cursor = "";
    if (overlay) { overlay.style.display = "none"; }
  }
  window.addEventListener("message", function(e) {
    if (e.data && e.data.type === "builder:activate_inspector") activate();
    if (e.data && e.data.type === "builder:deactivate_inspector") deactivate();
  });
  window.parent.postMessage({ type: "builder:inspector_loaded" }, "*");
})();
`;

// ============================================================================
// RUNTIME CACHE -- fetch public/v0-preview-runtime.js once
// ============================================================================

let runtimeCache: string | null = null;
let runtimePromise: Promise<string> | null = null;

function fetchRuntime(): Promise<string> {
  if (runtimeCache) return Promise.resolve(runtimeCache);
  if (runtimePromise) return runtimePromise;
  runtimePromise = fetch("/v0-preview-runtime.js")
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch runtime: ${res.status}`);
      return res.text();
    })
    .then((text) => {
      runtimeCache = text;
      return text;
    });
  return runtimePromise;
}

// ============================================================================
// HTML BUILDER
// ============================================================================

/**
 * Safely embed a value as JSON inside a <script> tag.
 * Escapes </script> and <!-- sequences that would break the HTML parser.
 */
function safeJson(obj: unknown): string {
  return JSON.stringify(obj).replace(/<\//g, "<\\/").replace(/<!--/g, "<\\!--");
}

function buildPreviewHtml(
  generatedFiles: Array<{ path: string; content: string; language: string }>,
  runtimeJs: string
): string {
  // Collect all file paths
  const fileMap = new Map<string, string>();
  for (const file of generatedFiles) {
    let path = file.path;
    if (!path.startsWith("/")) path = "/" + path;
    fileMap.set(path, file.content);
  }

  // Find the main entry file — prefer page.tsx, then index.tsx, then any file
  // with a default export, then any .tsx/.jsx as last resort.
  let mainFile = "/page.tsx";
  const candidates = [
    "/page.tsx", "/app/page.tsx", "/src/app/page.tsx",
    "/index.tsx", "/app/index.tsx", "/src/app/index.tsx",
    "/index.jsx", "/page.jsx",
  ];
  let found = false;
  for (const c of candidates) {
    if (fileMap.has(c)) { mainFile = c; found = true; break; }
  }
  if (!found) {
    // Look for any TSX/JSX file that contains "export default"
    for (const [path, content] of fileMap) {
      if ((path.endsWith(".tsx") || path.endsWith(".jsx")) && content.includes("export default")) {
        mainFile = path;
        found = true;
        break;
      }
    }
  }
  if (!found) {
    // Last resort: any TSX/JSX file (skip layout, globals, component subdirs)
    for (const [path] of fileMap) {
      if ((path.endsWith(".tsx") || path.endsWith(".jsx")) && !path.includes("layout") && !path.includes("/components/")) {
        mainFile = path;
        break;
      }
    }
  }

  // Collect CSS from generated files
  let generatedCss = "";
  for (const [path, content] of fileMap) {
    if (path.endsWith(".css")) {
      generatedCss += "\n" + content;
    }
  }

  // Auto-detect Tailwind version from generated CSS.
  // v0 generates v4 CSS with @import "tailwindcss" / @theme directives.
  // Older outputs may use @tailwind directives (v3 style) — we treat these
  // as v4 too since we normalize the CSS for the v4 browser CDN.
  const hasV3Directives = generatedCss.includes("@tailwind");
  const isV4 = generatedCss.includes('@import "tailwindcss"')
    || generatedCss.includes("@import 'tailwindcss'")
    || generatedCss.includes("@theme")
    || hasV3Directives;

  // Strip directives handled by CDN / external links
  const strippedCss = generatedCss
    .replace(/@import\s+['"]tailwindcss['"];\s*/g, "")
    .replace(/@import\s+['"]tw-animate-css['"];\s*/g, "")
    .replace(/@tailwind\s+(base|components|utilities)\s*;/g, "");

  // Use generated CSS as source of truth; fall back to defaults if no CSS files
  const hasGeneratedCss = generatedCss.trim().length > 0;

  // Detect if the CSS is pre-compiled Tailwind output (v0 sometimes returns
  // the full built CSS with @layer theme/base/components/utilities blocks
  // rather than just the source globals.css)
  const isCompiledCss = strippedCss.includes("/*! tailwindcss") || strippedCss.includes("@layer theme, base, components, utilities");

  let twCssContent: string;
  let rootCssContent: string;

  if (hasGeneratedCss && isCompiledCss) {
    // Pre-compiled Tailwind CSS: put everything in a regular <style> tag
    // (it already includes all utility classes and base styles).
    // Extract @theme inline and @custom-variant for the CDN to handle
    // any additional classes from our component stubs.
    const themeBlocks: string[] = [];
    const compiledCss = strippedCss.replace(
      /(@theme\s+inline\s*\{[^}]*\}|@custom-variant[^;]+;)/g,
      (_match, block: string) => { themeBlocks.push(block); return ""; }
    );
    // If no @theme inline in compiled CSS, inject our fallback
    if (!themeBlocks.some(b => b.includes("@theme"))) {
      themeBlocks.unshift(FALLBACK_THEME_CSS_TW);
    }
    rootCssContent = compiledCss;
    twCssContent = themeBlocks.join("\n");
  } else if (hasGeneratedCss && isV4) {
    // Split: :root and .dark blocks go in regular <style> (immediately available),
    // everything else (@theme, @custom-variant, @layer with @apply) goes in
    // <style type="text/tailwindcss"> for the v4 browser CDN to process.

    // First, unwrap :root/.dark from @layer base { ... } if present.
    // v0 sometimes generates: @layer base { :root { ... } .dark { ... } }
    // Tailwind v4 needs :root/.dark OUTSIDE @layer base for variables to resolve.
    let normalizedCss = strippedCss;
    {
      // Use a balanced-brace approach to extract @layer base content
      const layerBaseIdx = normalizedCss.indexOf("@layer base");
      if (layerBaseIdx !== -1) {
        const openBrace = normalizedCss.indexOf("{", layerBaseIdx);
        if (openBrace !== -1) {
          let depth = 1;
          let i = openBrace + 1;
          while (i < normalizedCss.length && depth > 0) {
            if (normalizedCss[i] === "{") depth++;
            else if (normalizedCss[i] === "}") depth--;
            i++;
          }
          const inner = normalizedCss.slice(openBrace + 1, i - 1);
          const before = normalizedCss.slice(0, layerBaseIdx);
          const after = normalizedCss.slice(i);
          // Check if the @layer base only contains :root and .dark blocks
          const strippedInner = inner.replace(/(?::root|\.dark)\s*\{[^}]*\}/g, "").trim();
          if (strippedInner.length === 0) {
            // Only :root/.dark inside — lift them out
            normalizedCss = before + inner + after;
          } else {
            // Mixed content — extract :root/.dark, keep the rest in @layer base
            const extracted: string[] = [];
            const kept = inner.replace(
              /((?::root|\.dark)\s*\{[^}]*\})/g,
              (_m, block: string) => { extracted.push(block); return ""; }
            );
            normalizedCss = before + extracted.join("\n") + "\n@layer base {" + kept + "\n}" + after;
          }
        }
      }
    }

    // Convert raw HSL values (e.g. --primary: 0 0% 100%) to wrapped hsl() format.
    // v0 v3-style CSS uses raw space-separated HSL without hsl() wrapper,
    // but Tailwind v4 @theme inline needs the full hsl() or oklch() value.
    normalizedCss = normalizedCss.replace(
      /(--[\w-]+)\s*:\s*(\d{1,3}(?:\.\d+)?)\s+(\d{1,3}(?:\.\d+)?%)\s+(\d{1,3}(?:\.\d+)?%)\s*;/g,
      (_match, prop: string, h: string, s: string, l: string) => `${prop}: hsl(${h} ${s} ${l});`
    );

    const rootBlocks: string[] = [];
    // Match top-level :root { ... } and .dark { ... } blocks
    const remaining = normalizedCss.replace(
      /(?:^|\n)((?::root|\.dark)\s*\{[^}]*\})/g,
      (_match, block: string) => { rootBlocks.push(block); return ""; }
    );

    // Ensure @theme inline block exists with all required color mappings.
    // v0 may omit it entirely (v3 style) or include a partial one.
    const hasThemeInline = remaining.includes("@theme inline") || remaining.includes("@theme {");
    let twContent = remaining;
    if (!hasThemeInline) {
      twContent = FALLBACK_THEME_CSS_TW + "\n" + twContent;
    }

    rootCssContent = rootBlocks.join("\n") + "\nbody { margin: 0; font-family: 'Inter', system-ui, sans-serif; }";
    twCssContent = twContent;
  } else if (hasGeneratedCss) {
    // Non-Tailwind CSS (rare) — pass through as-is
    twCssContent = strippedCss;
    rootCssContent = "";
  } else {
    // No generated CSS: use fallback
    twCssContent = FALLBACK_THEME_CSS_TW;
    rootCssContent = FALLBACK_THEME_CSS_ROOT;
  }

  // Build module registry (v0 files minus CSS)
  const moduleRegistry: Record<string, string> = {};
  for (const [path, content] of fileMap) {
    if (path.endsWith(".css")) continue;
    let code = content;
    code = code.replace(/^["']use client["'];?\s*\n?/m, "");
    code = code.replace(/^["']use server["'];?\s*\n?/m, "");
    moduleRegistry[path] = code;
  }

  const allStubs = { ...STUB_MODULES, ...SHADCN_COMPONENT_STUBS };

  // Escape </script> in the runtime JS itself (in case it contains that string)
  const safeRuntimeJs = runtimeJs.replace(/<\/script/gi, "<\\/script");

  // The HTML template only interpolates JSON data blobs and the pre-fetched
  // runtime JS. No complex JS with regexes in the template literal.
  // Always use Tailwind v4 browser CDN — our fallback theme uses @theme inline
  // which is a v4-only feature, and all v0 output is v4-compatible.
  const tailwindCdn = "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4";

  // Tailwind directives (@theme, @custom-variant, @layer) go in type="text/tailwindcss".
  // :root variables and body styles go in a regular <style> tag.
  const styleTag = `<style type="text/tailwindcss">${twCssContent}<\/style>\n  <style>${rootCssContent}<\/style>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tw-animate-css@1/dist/tw-animate.css">
  <script src="${tailwindCdn}"><\/script>
  <script src="https://unpkg.com/@babel/standalone@7.26.4/babel.min.js"><\/script>
  <script type="importmap">${safeJson(IMPORT_MAP)}<\/script>
  ${styleTag}
</head>
<body>
  <div id="root"></div>

  <script>
    // Debug: log processed CSS for inspection
    console.log("[V0 Preview] TW CSS (type=text/tailwindcss):", document.querySelector('style[type="text/tailwindcss"]')?.textContent?.slice(0, 500));
    console.log("[V0 Preview] Root CSS (regular style):", document.querySelectorAll('style:not([type])')[0]?.textContent?.slice(0, 500));
    // Inject data for the runtime to consume (plain <script>, not module)
    window.__V0_DATA = {
      FILES: ${safeJson(moduleRegistry)},
      STUBS: ${safeJson(allStubs)},
      mainFile: ${safeJson(mainFile)}
    };
  <\/script>

  <script type="module">
${safeRuntimeJs}
  <\/script>

  <script>${INSPECTOR_SCRIPT}<\/script>
</body>
</html>`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function V0SandpackPreview({ generatedFiles, height = "100%", onIframeRef }: V0SandpackPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runtimeJs, setRuntimeJs] = useState<string | null>(runtimeCache);

  // Fetch the runtime JS on mount (cached after first fetch)
  useEffect(() => {
    if (runtimeCache) {
      setRuntimeJs(runtimeCache);
      return;
    }
    fetchRuntime()
      .then(setRuntimeJs)
      .catch((e) => setError(`Failed to load preview runtime: ${e.message}`));
  }, []);

  const htmlContent = useMemo(() => {
    if (generatedFiles.length === 0 || !runtimeJs) return null;
    try {
      return buildPreviewHtml(generatedFiles, runtimeJs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to build preview");
      return null;
    }
  }, [generatedFiles, runtimeJs]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
  }, [htmlContent]);

  if (!htmlContent) {
    if (error) {
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center max-w-sm">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="relative w-full" style={{ height }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/50 z-10">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto mb-3" />
            <p className="text-neutral-400 text-sm">Building preview...</p>
          </div>
        </div>
      )}
      <iframe
        ref={(el) => {
          (iframeRef as React.MutableRefObject<HTMLIFrameElement | null>).current = el;
          onIframeRef?.(el);
        }}
        srcDoc={htmlContent}
        className="w-full h-full border-0"
        title="v0 Preview"
        sandbox="allow-scripts allow-same-origin"
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
}
