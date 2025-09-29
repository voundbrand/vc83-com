"use client";

import React from "react";
import { DropdownMenu } from "./dropdown-menu";

interface SystemMenuProps {
  onThemeClick: () => void;
  onAboutClick: () => void;
}

export function SystemMenu({ onThemeClick, onAboutClick }: SystemMenuProps) {
  return (
    <DropdownMenu
      trigger={<span className="menu-item">System</span>}
      items={[
        {
          id: "theme",
          label: "Theme...",
          type: "item",
          action: onThemeClick,
        },
        {
          id: "divider1",
          type: "divider",
        },
        {
          id: "about",
          label: "About This Mac",
          type: "item",
          action: onAboutClick,
        },
      ]}
    />
  );
}
