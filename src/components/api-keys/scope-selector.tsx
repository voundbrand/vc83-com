/**
 * SCOPE SELECTOR COMPONENT
 *
 * UI for selecting API scopes when creating API keys.
 * Provides granular permission control with visual feedback.
 *
 * Features:
 * - Checkbox tree for scope categories
 * - Risk level indicators
 * - Real-time permission preview
 * - Wildcard warning
 *
 * @see .kiro/api_oauth_jose/OPTION_C_SECURITY_ENHANCEMENTS.md Task 5
 */

"use client";

import React, { useState } from "react";
import {
  WILDCARD_SCOPE,
  SCOPE_CATEGORIES,
  getScopesByCategory,
  getScopeSummary,
  type ScopeCategory,
} from "@/lib/scopes";

interface ScopeSelectorProps {
  selectedScopes: string[];
  onChange: (scopes: string[]) => void;
  disabled?: boolean;
}

export function ScopeSelector({ selectedScopes, onChange, disabled }: ScopeSelectorProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<ScopeCategory>>(
    new Set(SCOPE_CATEGORIES)
  );

  const hasWildcard = selectedScopes.includes("*");
  const scopeSummary = getScopeSummary(selectedScopes);

  const toggleCategory = (category: ScopeCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleScope = (scopeValue: string) => {
    if (disabled) return;

    if (scopeValue === "*") {
      // Toggle wildcard - if enabling, clear all other scopes
      if (hasWildcard) {
        onChange([]);
      } else {
        onChange(["*"]);
      }
      return;
    }

    // If wildcard is enabled, disable it first
    if (hasWildcard) {
      onChange([scopeValue]);
      return;
    }

    // Toggle individual scope
    if (selectedScopes.includes(scopeValue)) {
      onChange(selectedScopes.filter((s) => s !== scopeValue));
    } else {
      onChange([...selectedScopes, scopeValue]);
    }
  };

  const selectAllInCategory = (category: ScopeCategory) => {
    if (disabled) return;

    const categoryScopes = getScopesByCategory(category).map((s) => s.value);
    const allSelected = categoryScopes.every((s) => selectedScopes.includes(s));

    if (allSelected) {
      // Deselect all in category
      onChange(selectedScopes.filter((s) => !categoryScopes.includes(s)));
    } else {
      // Select all in category
      const newScopes = new Set([...selectedScopes, ...categoryScopes]);
      newScopes.delete("*"); // Remove wildcard if present
      onChange(Array.from(newScopes));
    }
  };

  // Risk color helper - preserved for future scope UI enhancements
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _getRiskColor = (risk: "low" | "medium" | "high") => {
    switch (risk) {
      case "low":
        return "text-green-600";
      case "medium":
        return "text-yellow-600";
      case "high":
        return "text-red-600";
    }
  };

  const getRiskBadge = (risk: "low" | "medium" | "high") => {
    const colors = {
      low: "bg-green-100 text-green-700 border-green-300",
      medium: "bg-yellow-100 text-yellow-700 border-yellow-300",
      high: "bg-red-100 text-red-700 border-red-300",
    };

    return (
      <span
        className={`text-xs px-2 py-0.5 rounded-full border ${colors[risk]}`}
      >
        {risk}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Wildcard Warning */}
      {hasWildcard && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-red-600 text-xl">⚠️</div>
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-1">
                Full Access Enabled
              </h4>
              <p className="text-sm text-red-700">
                This key will have unrestricted access to all resources. Consider using
                specific scopes instead for better security.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Scope Selection */}
      <div className="space-y-3">
        {/* Wildcard Checkbox */}
        <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
          <input
            type="checkbox"
            checked={hasWildcard}
            onChange={() => toggleScope("*")}
            disabled={disabled}
            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">
                {WILDCARD_SCOPE.label}
              </span>
              {getRiskBadge("high")}
            </div>
            <p className="text-sm text-gray-600 mt-0.5">
              {WILDCARD_SCOPE.description}
            </p>
          </div>
        </label>

        {/* Category-based Scopes */}
        {!hasWildcard && (
          <div className="space-y-2">
            {SCOPE_CATEGORIES.map((category) => {
              const categoryScopes = getScopesByCategory(category);
              const allSelected = categoryScopes.every((s) =>
                selectedScopes.includes(s.value)
              );
              const someSelected = categoryScopes.some((s) =>
                selectedScopes.includes(s.value)
              );
              const isExpanded = expandedCategories.has(category);

              return (
                <div key={category} className="border rounded-lg overflow-hidden">
                  {/* Category Header */}
                  <div className="bg-gray-50 border-b">
                    <div className="flex items-center gap-2 p-3">
                      <button
                        type="button"
                        onClick={() => toggleCategory(category)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        {isExpanded ? "▼" : "▶"}
                      </button>
                      <label className="flex items-center gap-2 flex-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(input) => {
                            if (input) {
                              input.indeterminate = someSelected && !allSelected;
                            }
                          }}
                          onChange={() => selectAllInCategory(category)}
                          disabled={disabled}
                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <span className="font-semibold text-gray-900">
                          {category}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({categoryScopes.length} permissions)
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Scopes in Category */}
                  {isExpanded && (
                    <div className="divide-y">
                      {categoryScopes.map((scope) => {
                        const isSelected = selectedScopes.includes(scope.value);

                        return (
                          <label
                            key={scope.value}
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleScope(scope.value)}
                              disabled={disabled}
                              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 ml-6"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {scope.label}
                                </span>
                                {getRiskBadge(scope.risk)}
                              </div>
                              <p className="text-xs text-gray-600 mt-0.5">
                                {scope.description}
                              </p>
                            </div>
                          </label>
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

      {/* Permission Summary */}
      {!hasWildcard && selectedScopes.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-semibold text-purple-900 mb-2">
            Permission Summary
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-purple-700">
                <strong>{scopeSummary.total}</strong> permissions selected
              </span>
              {getRiskBadge(scopeSummary.riskLevel)}
            </div>
            <div className="space-y-1">
              {Object.entries(scopeSummary.byCategory).map(([category, count]) => (
                <div key={category} className="flex items-center gap-2 text-purple-700">
                  <span className="w-4 h-4 flex items-center justify-center text-purple-600">
                    ✓
                  </span>
                  <span>
                    {category}: {count} permission{count !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No Permissions Warning */}
      {!hasWildcard && selectedScopes.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-yellow-600 text-xl">⚠️</div>
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-900 mb-1">
                No Permissions Selected
              </h4>
              <p className="text-sm text-yellow-700">
                This API key won't be able to access any resources. Select at least one
                permission to make it functional.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
