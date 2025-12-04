/**
 * SEARCH BAR
 * Full-text search for projects
 */

"use client";

import React from "react";
import { Search, X } from "lucide-react";

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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(value);
  };

  const handleClear = () => {
    onChange("");
    onSearch("");
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={18}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          style={{
            border: "var(--win95-border)",
            backgroundColor: "var(--win95-bg-light)",
          }}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </form>
  );
}
