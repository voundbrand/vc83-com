"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface TopNavMenuItem {
  id: string;
  label?: string;
  onSelect?: () => void;
  icon?: ReactNode;
  divider?: boolean;
  disabled?: boolean;
  submenu?: boolean;
  shortcut?: string;
}

interface TopNavMenuProps {
  label: string;
  items: TopNavMenuItem[];
  align?: "left" | "right";
  className?: string;
  buttonClassName?: string;
}

export function TopNavMenu({
  label,
  items,
  align = "left",
  className,
  buttonClassName,
}: TopNavMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectableIndexes = useMemo(
    () =>
      items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => !item.divider && !item.disabled)
        .map(({ index }) => index),
    [items],
  );

  const focusItemByIndex = (index: number) => {
    const ref = itemRefs.current[index];
    ref?.focus();
  };

  const focusNextItem = (currentIndex: number, direction: 1 | -1) => {
    if (selectableIndexes.length === 0) {
      return;
    }

    const currentSelectablePosition = selectableIndexes.indexOf(currentIndex);

    if (currentSelectablePosition < 0) {
      const fallbackIndex = direction === 1
        ? selectableIndexes[0]
        : selectableIndexes[selectableIndexes.length - 1];
      focusItemByIndex(fallbackIndex);
      return;
    }

    const nextSelectablePosition =
      (currentSelectablePosition + direction + selectableIndexes.length) % selectableIndexes.length;

    focusItemByIndex(selectableIndexes[nextSelectablePosition]);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      if (selectableIndexes.length > 0) {
        requestAnimationFrame(() => {
          focusItemByIndex(selectableIndexes[0]);
        });
      }
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      if (selectableIndexes.length > 0) {
        requestAnimationFrame(() => {
          focusItemByIndex(selectableIndexes[selectableIndexes.length - 1]);
        });
      }
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen((prev) => !prev);
    }
  };

  const handleItemKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusNextItem(index, 1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusNextItem(index, -1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      if (selectableIndexes.length > 0) {
        focusItemByIndex(selectableIndexes[0]);
      }
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      if (selectableIndexes.length > 0) {
        focusItemByIndex(selectableIndexes[selectableIndexes.length - 1]);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      buttonRef.current?.focus();
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={cn(
          "desktop-topbar-link inline-flex items-center px-2 py-1 text-xs font-semibold",
          isOpen && "desktop-topbar-link-active",
          buttonClassName,
        )}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
      >
        {label}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label={`${label} menu`}
          className={cn(
            "desktop-taskbar-menu absolute top-full mt-1 min-w-[220px] rounded-md p-1",
            align === "left" ? "left-0" : "right-0",
          )}
        >
          {items.map((item, index) => {
            if (item.divider) {
              return <div key={item.id} className="desktop-taskbar-menu-divider my-1" />;
            }

            return (
              <button
                key={item.id}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={cn(
                  "desktop-taskbar-menu-item w-full rounded-sm px-2 py-1 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--focus-ring-offset)]",
                  item.disabled && "opacity-50",
                )}
                onClick={() => {
                  if (item.disabled) {
                    return;
                  }
                  item.onSelect?.();
                  setIsOpen(false);
                }}
                onKeyDown={(event) => handleItemKeyDown(event, index)}
                title={item.disabled ? "Coming soon" : item.label}
              >
                <span className="flex items-center gap-2">
                  {item.icon ? <span className="flex h-4 w-4 items-center justify-center">{item.icon}</span> : null}
                  <span className="flex-1 truncate">{item.label || ""}</span>
                  {item.shortcut ? <span className="text-[10px] opacity-75">{item.shortcut}</span> : null}
                  {item.submenu ? <span aria-hidden="true">›</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
