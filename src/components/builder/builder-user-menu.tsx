"use client";

/**
 * BUILDER USER MENU
 *
 * User avatar dropdown menu in BuilderHeader.
 * Shows profile, settings, sign out, etc.
 */

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import type { LucideIcon } from "lucide-react";
import {
  User,
  Settings,
  MessageSquare,
  LogOut,
  Moon,
  Globe,
} from "lucide-react";

interface BuilderUserMenuProps {
  onClose: () => void;
}

// Define proper types for menu items
type LinkMenuItem = {
  type: "link";
  icon: LucideIcon;
  label: string;
  href: string;
  external?: boolean;
};

type ButtonMenuItem = {
  type: "button";
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
};

type DisabledMenuItem = {
  type: "disabled";
  icon: LucideIcon;
  label: string;
  value: string;
};

type MenuItem = LinkMenuItem | ButtonMenuItem | DisabledMenuItem;

interface MenuSection {
  label?: string;
  items: MenuItem[];
}

export function BuilderUserMenu({ onClose }: BuilderUserMenuProps) {
  const { user, signOut } = useAuth();
  const userProfileHref = user?.id
    ? `/?app=manage&panel=users&context=current-user&entity=${encodeURIComponent(String(user.id))}`
    : "/?app=manage&panel=users&context=current-user&entity=self";

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  const menuSections: MenuSection[] = [
    {
      items: [
        {
          type: "link",
          icon: Settings,
          label: "Settings",
          href: "/settings",
        },
        {
          type: "link",
          icon: User,
          label: "User Profile",
          href: userProfileHref,
        },
        {
          type: "link",
          icon: MessageSquare,
          label: "Feedback",
          href: "/feedback",
        },
      ],
    },
    {
      label: "Preferences",
      items: [
        {
          type: "disabled",
          icon: Moon,
          label: "Theme",
          value: "Dark",
        },
        {
          type: "disabled",
          icon: Globe,
          label: "Language",
          value: "English",
        },
      ],
    },
    {
      items: [
        {
          type: "button",
          icon: LogOut,
          label: "Sign Out",
          onClick: handleSignOut,
          danger: true,
        },
      ],
    },
  ];

  return (
    <div className="w-64 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl py-1 overflow-hidden">
      {/* User Info */}
      <div className="px-3 py-2 border-b border-neutral-700">
        <p className="text-sm text-neutral-300 truncate">
          {user?.email || "user@example.com"}
        </p>
      </div>

      {menuSections.map((section, sectionIndex) => (
        <div key={sectionIndex}>
          {section.label && (
            <div className="px-3 py-1.5 mt-1">
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                {section.label}
              </span>
            </div>
          )}

          {section.items.map((item) => {
            const Icon = item.icon;

            if (item.type === "link") {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 transition-colors"
                  {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  <Icon className="w-4 h-4 text-neutral-400" />
                  <span className="flex-1">{item.label}</span>
                  {item.external && (
                    <span className="text-xs text-neutral-500">↗</span>
                  )}
                </Link>
              );
            }

            if (item.type === "button") {
              return (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                    item.danger
                      ? "text-red-400 hover:bg-red-900/30 hover:text-red-300"
                      : "text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${item.danger ? "text-red-400" : "text-neutral-400"}`} />
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
              );
            }

            // Disabled items with values (like theme/language selectors)
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-400 cursor-not-allowed"
              >
                <Icon className="w-4 h-4 text-neutral-500" />
                <span className="flex-1">{item.label}</span>
                <span className="text-xs bg-neutral-900 px-2 py-0.5 rounded text-neutral-500">
                  {item.value}
                </span>
              </div>
            );
          })}

          {sectionIndex < menuSections.length - 1 && (
            <div className="h-px bg-neutral-700 my-1" />
          )}
        </div>
      ))}
    </div>
  );
}
