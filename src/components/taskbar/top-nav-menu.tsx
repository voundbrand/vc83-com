"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { captureShellTelemetry } from "@/components/providers/posthog-provider";
import { cn } from "@/lib/utils";

export interface TopNavMenuItem {
  id: string;
  label?: string;
  onSelect?: () => void;
  href?: string;
  icon?: ReactNode;
  divider?: boolean;
  disabled?: boolean;
  submenu?: boolean;
  shortcut?: string;
  children?: TopNavMenuItem[];
}

interface TopNavMenuProps {
  label: ReactNode;
  items: TopNavMenuItem[];
  align?: "left" | "right";
  submenuDirection?: "left" | "right";
  className?: string;
  buttonClassName?: string;
  menuLabel?: string;
  triggerAriaLabel?: string;
}

export function TopNavMenu({
  label,
  items,
  align = "left",
  submenuDirection = "right",
  className,
  buttonClassName,
  menuLabel,
  triggerAriaLabel,
}: TopNavMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openSubmenuIndex, setOpenSubmenuIndex] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const submenuItemRefs = useRef<Record<number, Array<HTMLButtonElement | null>>>({});
  const resolvedMenuLabel = menuLabel ?? (typeof label === "string" ? label : "Menu");
  const submenuOpensLeft = submenuDirection === "left";

  const selectableIndexes = useMemo(
    () =>
      items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => !item.divider && !item.disabled)
        .map(({ index }) => index),
    [items],
  );

  const selectableSubmenuIndexes = useMemo(() => {
    const indexMap: Record<number, number[]> = {};

    items.forEach((item, parentIndex) => {
      if (!item.children) {
        return;
      }

      indexMap[parentIndex] = item.children
        .map((child, childIndex) => ({ child, childIndex }))
        .filter(({ child }) => !child.divider && !child.disabled)
        .map(({ childIndex }) => childIndex);
    });

    return indexMap;
  }, [items]);

  const closeMenu = () => {
    setOpenSubmenuIndex(null);
    setIsOpen(false);
  };

  const focusItemByIndex = (index: number) => {
    const ref = itemRefs.current[index];
    ref?.focus();
  };

  const focusSubmenuItemByIndex = (parentIndex: number, childIndex: number) => {
    const ref = submenuItemRefs.current[parentIndex]?.[childIndex];
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

  const focusNextSubmenuItem = (parentIndex: number, currentChildIndex: number, direction: 1 | -1) => {
    const selectableChildren = selectableSubmenuIndexes[parentIndex] ?? [];
    if (selectableChildren.length === 0) {
      return;
    }

    const currentSelectablePosition = selectableChildren.indexOf(currentChildIndex);
    if (currentSelectablePosition < 0) {
      const fallbackIndex = direction === 1
        ? selectableChildren[0]
        : selectableChildren[selectableChildren.length - 1];
      focusSubmenuItemByIndex(parentIndex, fallbackIndex);
      return;
    }

    const nextSelectablePosition =
      (currentSelectablePosition + direction + selectableChildren.length) % selectableChildren.length;

    focusSubmenuItemByIndex(parentIndex, selectableChildren[nextSelectablePosition]);
  };

  const openSubmenu = (parentIndex: number, focusFirstItem: boolean) => {
    const selectableChildren = selectableSubmenuIndexes[parentIndex] ?? [];
    if (selectableChildren.length === 0) {
      return;
    }

    setOpenSubmenuIndex(parentIndex);

    if (focusFirstItem) {
      requestAnimationFrame(() => {
        focusSubmenuItemByIndex(parentIndex, selectableChildren[0]);
      });
    }
  };

  const selectItem = (item: TopNavMenuItem, itemId: string, labelOverride?: string, interactionTypeOverride?: "link" | "action") => {
    captureShellTelemetry("shell_nav_select", {
      menuLabel: resolvedMenuLabel,
      itemId,
      itemLabel: labelOverride ?? item.label ?? item.id,
      hasHref: Boolean(item.href),
      interactionType: interactionTypeOverride ?? (item.href ? "link" : "action"),
    });

    if (item.href) {
      window.location.assign(item.href);
      closeMenu();
      return;
    }

    item.onSelect?.();
    closeMenu();
  };

  useEffect(() => {
    if (!isOpen) {
      setOpenSubmenuIndex(null);
      return;
    }

    const handlePointerOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
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
      setOpenSubmenuIndex(null);
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
      setOpenSubmenuIndex(null);
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
      setOpenSubmenuIndex(null);
    }
  };

  const handleTopLevelItemKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const item = items[index];
    const hasSubmenu = Boolean((item.children ?? []).some((child) => !child.divider && !child.disabled));

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

    if ((event.key === "ArrowRight" || (submenuOpensLeft && event.key === "ArrowLeft")) && hasSubmenu) {
      event.preventDefault();
      openSubmenu(index, true);
      return;
    }

    if ((event.key === "Enter" || event.key === " ") && hasSubmenu) {
      event.preventDefault();
      openSubmenu(index, true);
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
      closeMenu();
      buttonRef.current?.focus();
    }
  };

  const handleSubmenuItemKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    parentIndex: number,
    childIndex: number,
  ) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusNextSubmenuItem(parentIndex, childIndex, 1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusNextSubmenuItem(parentIndex, childIndex, -1);
      return;
    }

    if (event.key === "ArrowLeft" || (submenuOpensLeft && event.key === "ArrowRight")) {
      event.preventDefault();
      setOpenSubmenuIndex(null);
      requestAnimationFrame(() => {
        focusItemByIndex(parentIndex);
      });
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      const selectableChildren = selectableSubmenuIndexes[parentIndex] ?? [];
      if (selectableChildren.length > 0) {
        focusSubmenuItemByIndex(parentIndex, selectableChildren[0]);
      }
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const selectableChildren = selectableSubmenuIndexes[parentIndex] ?? [];
      if (selectableChildren.length > 0) {
        focusSubmenuItemByIndex(parentIndex, selectableChildren[selectableChildren.length - 1]);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
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
        aria-label={triggerAriaLabel ?? `${resolvedMenuLabel} menu`}
        className={cn(
          "desktop-topbar-link inline-flex items-center px-2 py-1 text-xs font-semibold",
          isOpen && "desktop-topbar-link-active",
          buttonClassName,
        )}
        onClick={() => {
          setIsOpen((prev) => !prev);
          setOpenSubmenuIndex(null);
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        {label}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label={`${resolvedMenuLabel} menu`}
          className={cn(
            "desktop-taskbar-menu absolute top-full mt-1 min-w-[220px] rounded-md p-1",
            align === "left" ? "left-0" : "right-0",
          )}
        >
          {items.map((item, index) => {
            if (item.divider) {
              return <div key={item.id} className="desktop-taskbar-menu-divider my-1" />;
            }

            const children = item.children ?? [];
            const hasSubmenu = children.some((child) => !child.divider && !child.disabled);
            const showSubmenu = openSubmenuIndex === index && hasSubmenu;

            return (
              <div
                key={item.id}
                className="relative"
                onMouseEnter={() => {
                  if (hasSubmenu) {
                    setOpenSubmenuIndex(index);
                    return;
                  }
                  setOpenSubmenuIndex(null);
                }}
              >
                <button
                  ref={(element) => {
                    itemRefs.current[index] = element;
                  }}
                  type="button"
                  role="menuitem"
                  aria-haspopup={hasSubmenu ? "menu" : undefined}
                  aria-expanded={hasSubmenu ? showSubmenu : undefined}
                  disabled={item.disabled}
                  className={cn(
                    "desktop-taskbar-menu-item w-full rounded-sm px-2 py-1 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--focus-ring-offset)]",
                    item.disabled && "opacity-50",
                  )}
                  onClick={() => {
                    if (item.disabled) {
                      return;
                    }

                    if (hasSubmenu) {
                      setOpenSubmenuIndex((previous) => (previous === index ? null : index));
                      return;
                    }

                    selectItem(item, item.id);
                  }}
                  onKeyDown={(event) => handleTopLevelItemKeyDown(event, index)}
                  title={item.disabled ? "Coming soon" : item.label}
                >
                  <span className="flex items-center gap-2">
                    {(item.submenu || hasSubmenu) && submenuOpensLeft ? <span aria-hidden="true">‹</span> : null}
                    {item.icon ? <span className="flex h-4 w-4 items-center justify-center">{item.icon}</span> : null}
                    <span className="flex-1 truncate">{item.label || ""}</span>
                    {item.shortcut ? <span className="text-[10px] opacity-75">{item.shortcut}</span> : null}
                    {(item.submenu || hasSubmenu) && !submenuOpensLeft ? <span aria-hidden="true">›</span> : null}
                  </span>
                </button>

                {showSubmenu && (
                  <div
                    role="menu"
                    aria-label={`${item.label ?? item.id} submenu`}
                    className={cn(
                      "desktop-taskbar-menu absolute top-0 min-w-[220px] rounded-md p-1",
                      submenuOpensLeft ? "right-full mr-1" : "left-full ml-1",
                    )}
                  >
                    {children.map((child, childIndex) => {
                      if (child.divider) {
                        return <div key={child.id} className="desktop-taskbar-menu-divider my-1" />;
                      }

                      return (
                        <button
                          key={child.id}
                          ref={(element) => {
                            if (!submenuItemRefs.current[index]) {
                              submenuItemRefs.current[index] = [];
                            }
                            submenuItemRefs.current[index][childIndex] = element;
                          }}
                          type="button"
                          role="menuitem"
                          disabled={child.disabled}
                          className={cn(
                            "desktop-taskbar-menu-item w-full rounded-sm px-2 py-1 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--focus-ring-offset)]",
                            child.disabled && "opacity-50",
                          )}
                          onClick={() => {
                            if (child.disabled) {
                              return;
                            }

                            selectItem(child, `${item.id}/${child.id}`, child.label, child.href ? "link" : "action");
                          }}
                          onKeyDown={(event) => handleSubmenuItemKeyDown(event, index, childIndex)}
                          title={child.disabled ? "Coming soon" : child.label}
                        >
                          <span className="flex items-center gap-2">
                            {child.icon ? <span className="flex h-4 w-4 items-center justify-center">{child.icon}</span> : null}
                            <span className="flex-1 truncate">{child.label || ""}</span>
                            {child.shortcut ? <span className="text-[10px] opacity-75">{child.shortcut}</span> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
