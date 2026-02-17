/**
 * SEARCH BAR
 * Full-text search for projects
 */

"use client";

import type React from "react";
import { Search, X } from "lucide-react";
import { InteriorButton, InteriorInput } from "@/components/window-content/shared/interior-primitives";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = "Search projects...",
}: SearchBarProps) {
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSearch(value);
  };

  const handleClear = () => {
    onChange("");
    onSearch("");
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
        size={16}
        style={{ color: "var(--desktop-menu-text-muted)" }}
      />
      <InteriorInput
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="py-2 pl-9 pr-9 text-sm"
      />
      {value && (
        <InteriorButton
          type="button"
          size="sm"
          variant="ghost"
          onClick={handleClear}
          className="absolute right-1 top-1/2 -translate-y-1/2 px-2"
          aria-label="Clear search"
        >
          <X size={14} />
        </InteriorButton>
      )}
    </form>
  );
}
