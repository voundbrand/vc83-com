"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-media-query";

interface StartMenuItem {
  label?: string;
  icon?: string;
  onClick?: () => void;
  divider?: boolean;
  submenu?: StartMenuItem[];
}

interface StartMenuProps {
  items: StartMenuItem[];
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function StartMenu({ items, isOpen, onClose, className }: StartMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        const startButton = document.querySelector("[data-start-button]");
        if (startButton && startButton.contains(event.target as Node)) {
          return;
        }
        onClose();
        setOpenSubmenu(null);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className={cn(
        "absolute bottom-full left-0 mb-1 retro-window window-corners dark:retro-window-dark shadow-lg flex",
        isMobile ? "w-full start-menu-mobile" : "min-w-[200px]",
        className
      )}
      style={{
        zIndex: 10000
      }}
    >
      {/* Windows 95-style vertical stripe */}
      <div className="w-8 flex items-center justify-center" style={{ background: 'var(--win95-border)' }}>
        <div className="transform -rotate-90 whitespace-nowrap font-['Press_Start_2P'] text-sm tracking-wider" style={{ color: 'var(--win95-bg-light)' }}>
          L4YERCAK3
        </div>
      </div>
      
      <div className="flex-1 py-1">
        {items.map((item, index) => (
          <div key={index} className="relative">
            {item.divider ? (
              <div className="h-[1px] mx-1 my-1" style={{ background: 'var(--win95-border)' }} />
            ) : (
              <>
                <button
                  onClick={() => {
                    if (item.submenu) {
                      setOpenSubmenu(openSubmenu === index ? null : index);
                    } else {
                      item.onClick?.();
                      onClose();
                      setOpenSubmenu(null);
                    }
                  }}
                  onMouseEnter={() => {
                    if (item.submenu && !isMobile) {
                      setOpenSubmenu(index);
                    }
                  }}
                  className="w-full px-3 py-1 text-left flex items-center justify-between gap-2 transition-colors font-pixel hover-menu-item"
                  style={{ color: 'var(--win95-text)' }}
                >
                  <div className="flex items-center gap-2">
                    {item.icon && <span className="text-base">{item.icon}</span>}
                    <span>{item.label || ""}</span>
                  </div>
                  {item.submenu && <span className="text-xs">▶</span>}
                </button>

                {/* Submenu */}
                {item.submenu && openSubmenu === index && (
                  <div
                    className={cn(
                      "absolute retro-window window-corners dark:retro-window-dark shadow-lg",
                      isMobile
                        ? "left-0 top-full mt-1 w-full"
                        : "left-full top-0 ml-1 min-w-[180px]"
                    )}
                  >
                    <div className="py-1">
                      {item.submenu.map((subitem, subindex) => (
                        <button
                          key={subindex}
                          onClick={() => {
                            subitem.onClick?.();
                            onClose();
                            setOpenSubmenu(null);
                          }}
                          className="w-full px-3 py-1 text-left flex items-center gap-2 transition-colors font-pixel hover-menu-item"
                          style={{ color: 'var(--win95-text)' }}
                        >
                          {subitem.icon && (
                            <span className="text-base">{subitem.icon}</span>
                          )}
                          <span>{subitem.label || ""}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}