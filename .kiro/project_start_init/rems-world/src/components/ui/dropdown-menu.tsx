"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronRight } from "lucide-react";

export interface DropdownMenuItem {
  id: string;
  label?: string;
  type?: "item" | "divider" | "submenu";
  action?: () => void;
  submenu?: DropdownMenuItem[];
  disabled?: boolean;
  icon?: React.ReactNode;
  shortcut?: string;
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  align?: "left" | "right";
  className?: string;
}

export function DropdownMenu({
  trigger,
  items,
  align = "left",
  className = "",
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update dropdown position when opened
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: align === "right" ? rect.right - 180 : rect.left,
      });
    }
  }, [isOpen, align]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setActiveSubmenu(null);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setActiveSubmenu(null);
    }
  }, []);

  const handleItemClick = (item: DropdownMenuItem) => {
    if (item.type === "submenu") {
      setActiveSubmenu(activeSubmenu === item.id ? null : item.id);
    } else if (item.action && !item.disabled) {
      item.action();
      setIsOpen(false);
      setActiveSubmenu(null);
    }
  };

  const renderMenuItem = (item: DropdownMenuItem, level = 0) => {
    if (item.type === "divider") {
      return <div key={item.id} className="dropdown-divider" />;
    }

    const isSubmenuOpen = activeSubmenu === item.id;

    return (
      <div
        key={item.id}
        className={`dropdown-item-wrapper ${item.type === "submenu" ? "has-submenu" : ""}`}
      >
        <button
          className={`dropdown-item ${item.disabled ? "disabled" : ""} ${item.type === "submenu" ? "has-submenu" : ""}`}
          onClick={() => handleItemClick(item)}
          disabled={item.disabled}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {item.icon && <span className="dropdown-icon">{item.icon}</span>}
            {item.label && <span className="dropdown-label">{item.label}</span>}
            {item.shortcut && <span className="dropdown-shortcut">{item.shortcut}</span>}
            {item.type === "submenu" && <ChevronRight size={12} className="dropdown-arrow" />}
          </span>
        </button>

        {item.type === "submenu" && item.submenu && isSubmenuOpen && (
          <div className="dropdown-submenu">
            {item.submenu.map((subItem) => renderMenuItem(subItem, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`dropdown-container ${className}`} onKeyDown={handleKeyDown}>
      <div ref={triggerRef} className="dropdown-trigger" onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>

      {isOpen &&
        isMounted &&
        createPortal(
          <div
            ref={dropdownRef}
            className="dropdown-menu-portal"
            style={{
              position: "absolute",
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              zIndex: 9999999,
            }}
          >
            {items.map((item) => renderMenuItem(item))}
          </div>,
          document.body,
        )}

      <style jsx>{`
        /* Dropdown menu styles - updated for consistency */
        .dropdown-container {
          position: relative;
          display: inline-flex;
          align-items: center;
          font-size: 11px;
        }

        .dropdown-trigger {
          cursor: pointer;
          display: flex;
          align-items: center;
        }

        .dropdown-menu-portal {
          background: var(--theme-window-bg, var(--bg-primary));
          border: 1px solid var(--theme-window-border, var(--border-primary));
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          min-width: 180px;
          overflow: hidden;
          animation: dropdownSlide 0.15s ease-out;
        }

        @keyframes dropdownSlide {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .dropdown-item-wrapper {
          position: relative;
        }

        /* Parent menu item stays highlighted when hovering submenu */
        .dropdown-item-wrapper.has-submenu:hover > .dropdown-item {
          background: var(--theme-primary);
          color: #ffffff;
        }

        .dropdown-item-wrapper.has-submenu:hover .dropdown-submenu {
          display: block;
        }

        .dropdown-item {
          display: block;
          width: 100%;
          padding: 6px 12px;
          border: none;
          background: none;
          color: var(--text-secondary);
          font-size: 11px;
          text-align: left;
          cursor: pointer;
          transition: all 0.1s ease;
          white-space: nowrap;
        }

        .dropdown-item:hover:not(.disabled) {
          background: var(--theme-primary);
          color: #ffffff;
        }

        .dropdown-item.disabled {
          color: var(--text-secondary);
          cursor: not-allowed;
          opacity: 0.5;
        }

        .dropdown-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
        }

        .dropdown-label {
          /* Label text */
        }

        .dropdown-shortcut {
          margin-left: auto;
          font-size: 11px;
          opacity: 0.7;
          padding-left: 12px;
        }

        .dropdown-arrow {
          margin-left: auto;
          opacity: 0.6;
          transition: opacity 0.1s ease;
        }

        .dropdown-item:hover .dropdown-arrow {
          opacity: 1;
        }

        .dropdown-divider {
          height: 1px;
          margin: 4px 0;
          background: var(--theme-window-border, var(--border-primary));
          opacity: 0.3;
        }

        .dropdown-submenu {
          display: none;
          position: absolute;
          left: 100%;
          top: -1px;
          margin-left: 2px;
          background: var(--theme-window-bg, var(--bg-primary));
          border: 1px solid var(--theme-window-border, var(--border-primary));
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
          min-width: 160px;
          z-index: 9999999 !important;
          overflow: hidden;
          animation: submenuSlide 0.15s ease-out;
        }

        @keyframes submenuSlide {
          from {
            opacity: 0;
            transform: translateX(-4px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
