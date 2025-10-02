"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export function OrganizationSwitcher() {
  const { user, currentOrg, organizations, switchOrganization, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user || !currentOrg) {
    return null;
  }

  const handleOrgSwitch = async (orgId: string) => {
    await switchOrganization(orgId as Parameters<typeof switchOrganization>[0]);
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="retro-button px-3 py-1 text-xs flex items-center gap-2 hover:bg-purple-50 dark:hover:bg-purple-900/20"
      >
        <span className="font-pixel">
          {currentOrg.isPersonalWorkspace ? "👤" : "🏢"}
        </span>
        <span className="max-w-[120px] truncate">
          {currentOrg.name}
        </span>
        <span className={`transition-transform ${isOpen ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-64 retro-window window-corners dark:retro-window-dark border-2 border-gray-400 dark:border-gray-600 shadow-lg z-50">
          {/* User Info */}
          <div className="p-3 border-b border-gray-300 dark:border-gray-600">
            <p className="font-pixel text-xs text-purple-600 dark:text-purple-400 mb-1">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {user.email}
            </p>
          </div>

          {/* Current Organization */}
          <div className="p-3 border-b border-gray-300 dark:border-gray-600 bg-purple-50 dark:bg-purple-900/20">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Organization</p>
            <div className="flex items-center gap-2">
              <span>{currentOrg.isPersonalWorkspace ? "👤" : "🏢"}</span>
              <div className="flex-1 min-w-0">
                <p className="font-pixel text-xs text-purple-700 dark:text-purple-300 truncate">
                  {currentOrg.name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                  {currentOrg.plan} Plan
                </p>
              </div>
              <span className="text-purple-600">✓</span>
            </div>
          </div>

          {/* Other Organizations */}
          {organizations.length > 1 && (
            <div className="max-h-48 overflow-y-auto">
              <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                Switch Organization
              </p>
              {organizations
                .filter((org) => org._id !== currentOrg._id)
                .map((org) => (
                  <button
                    key={org._id}
                    onClick={() => handleOrgSwitch(org._id)}
                    className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                  >
                    <span>{org.isPersonalWorkspace ? "👤" : "🏢"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate text-gray-800 dark:text-gray-200">
                        {org.name}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                        {org.plan} Plan
                      </p>
                    </div>
                  </button>
                ))}
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-gray-300 dark:border-gray-600">
            <button
              onClick={() => {
                setIsOpen(false);
                // TODO: Open organization settings window
              }}
              className="w-full px-3 py-2 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              ⚙️ Organization Settings
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                // TODO: Open create organization window
              }}
              className="w-full px-3 py-2 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              ➕ Create Organization
            </button>
            <button
              onClick={handleSignOut}
              className="w-full px-3 py-2 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 dark:text-red-400 border-t border-gray-300 dark:border-gray-600"
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}