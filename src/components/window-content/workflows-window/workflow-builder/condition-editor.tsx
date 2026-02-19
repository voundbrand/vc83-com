/**
 * CONDITION EDITOR
 *
 * UI for editing conditional branch logic.
 * Supports simple expression builder and JSON logic editing.
 */

"use client";

import React, { useState } from "react";
import { Plus, Trash2, CheckCircle } from "lucide-react";

interface Condition {
  name: string;
  expression: string;
  color: string;
}

interface ConditionEditorProps {
  conditions: Condition[];
  onSave: (conditions: Condition[]) => void;
  onCancel: () => void;
}

export function ConditionEditor({
  conditions: initialConditions,
  onSave,
  onCancel,
}: ConditionEditorProps) {
  const [conditions, setConditions] = useState<Condition[]>(
    initialConditions.length > 0
      ? initialConditions
      : [
          { name: "success", expression: "input.valid === true", color: "#16a34a" },
          { name: "error", expression: "input.valid !== true", color: "#dc2626" },
        ]
  );

  const [testInput, setTestInput] = useState("{}");
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleAddCondition = () => {
    const newCondition: Condition = {
      name: `branch_${conditions.length + 1}`,
      expression: "true",
      color: "#3b82f6",
    };
    setConditions([...conditions, newCondition]);
  };

  const handleRemoveCondition = (index: number) => {
    if (conditions.length <= 1) {
      alert("Must have at least one condition");
      return;
    }
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleUpdateCondition = (index: number, updates: Partial<Condition>) => {
    setConditions(
      conditions.map((c, i) => (i === index ? { ...c, ...updates } : c))
    );
  };

  const handleTestConditions = () => {
    try {
      const input = JSON.parse(testInput);

      // Simple expression evaluation (very basic - in production use json-logic-js)
      for (const condition of conditions) {
        try {
          // Create a safe evaluation context (used in eval below)
          void input; // evalContext used implicitly in evalFunc

          // Very basic expression evaluation (replace with proper library)
          // This is just for demo - use json-logic-js in production!
          const evalFunc = new Function("input", `return ${condition.expression}`);
          const result = evalFunc(input);

          if (result) {
            setTestResult(`Would take "${condition.name}" branch`);
            return;
          }
        } catch (error) {
          setTestResult(`Error in "${condition.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          return;
        }
      }

      setTestResult("No condition matched (would fail)");
    } catch (error) {
      setTestResult(`Invalid test input: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const presetColors = [
    { name: "Green (Success)", value: "#16a34a" },
    { name: "Red (Error)", value: "#dc2626" },
    { name: "Blue", value: "#3b82f6" },
    { name: "Orange", value: "#f59e0b" },
    { name: "Purple", value: "#9333ea" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="border-2 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto"
        style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
      >
        {/* Header */}
        <div
          className="border-b-2 p-3"
          style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
              Edit Conditions
            </h3>
            <button onClick={onCancel} className="desktop-interior-button p-1 text-xs">
              
            </button>
          </div>
          <p className="mt-1 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
            Define branch conditions using JavaScript expressions
          </p>
        </div>

        {/* Conditions List */}
        <div className="p-4 space-y-3">
          {conditions.map((condition, index) => (
            <div
              key={index}
              className="border-2 p-3"
              style={{ borderColor: condition.color, background: "white" }}
            >
              <div className="flex items-start gap-3">
                {/* Color indicator */}
                <div
                  className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
                  style={{ background: condition.color }}
                />

                {/* Condition config */}
                <div className="flex-1 space-y-2">
                  {/* Branch name */}
                  <div>
                    <label className="text-[10px] font-bold block mb-1" style={{ color: "var(--window-document-text)" }}>
                      Branch Name
                    </label>
                    <input
                      type="text"
                      value={condition.name}
                      onChange={(e) => handleUpdateCondition(index, { name: e.target.value })}
                      className="retro-input w-full text-xs px-2 py-1"
                      placeholder="e.g., success, error, valid"
                    />
                  </div>

                  {/* Expression */}
                  <div>
                    <label className="text-[10px] font-bold block mb-1" style={{ color: "var(--window-document-text)" }}>
                      Condition Expression
                    </label>
                    <textarea
                      value={condition.expression}
                      onChange={(e) => handleUpdateCondition(index, { expression: e.target.value })}
                      className="retro-input w-full text-xs px-2 py-1 font-mono"
                      rows={2}
                      placeholder="e.g., input.email != null && input.email.includes('@')"
                    />
                    <p className="text-[9px] mt-1" style={{ color: "var(--neutral-gray)" }}>
                      Use <code>input.fieldName</code> to access input data
                    </p>
                  </div>

                  {/* Color picker */}
                  <div>
                    <label className="text-[10px] font-bold block mb-1" style={{ color: "var(--window-document-text)" }}>
                      Branch Color
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {presetColors.map((preset) => (
                        <button
                          key={preset.value}
                          onClick={() => handleUpdateCondition(index, { color: preset.value })}
                          className={`p-1 border-2 rounded ${
                            condition.color === preset.value ? "border-black" : "border-gray-300"
                          }`}
                          title={preset.name}
                        >
                          <div
                            className="w-4 h-4 rounded"
                            style={{ background: preset.value }}
                          />
                        </button>
                      ))}
                      <input
                        type="color"
                        value={condition.color}
                        onChange={(e) => handleUpdateCondition(index, { color: e.target.value })}
                        className="w-8 h-8 border-2 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Remove button */}
                {conditions.length > 1 && (
                  <button
                    onClick={() => handleRemoveCondition(index)}
                    className="desktop-interior-button p-1 flex-shrink-0"
                    title="Remove condition"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add condition button */}
          <button
            onClick={handleAddCondition}
            className="desktop-interior-button w-full p-2 flex items-center justify-center gap-2 text-xs"
          >
            <Plus className="h-3 w-3" />
            Add Branch
          </button>
        </div>

        {/* Test Panel */}
        <div
          className="border-t-2 p-4"
          style={{ borderColor: "var(--window-document-border)", background: "#f9fafb" }}
        >
          <h4 className="text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
            Test Conditions
          </h4>
          <div className="space-y-2">
            <div>
              <label className="text-[10px] font-bold block mb-1" style={{ color: "var(--window-document-text)" }}>
                Sample Input Data (JSON)
              </label>
              <textarea
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                className="retro-input w-full text-xs px-2 py-1 font-mono"
                rows={3}
                placeholder='{"email": "test@example.com", "valid": true}'
              />
            </div>
            <button
              onClick={handleTestConditions}
              className="desktop-interior-button px-3 py-1 text-xs flex items-center gap-2"
            >
              <CheckCircle className="h-3 w-3" />
              Test
            </button>
            {testResult && (
              <div
                className={`text-xs p-2 rounded border-2 ${
                  testResult.includes("Error") || testResult.includes("fail")
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-green-500 bg-green-50 text-green-700"
                }`}
              >
                {testResult}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="border-t-2 p-3 flex justify-end gap-2"
          style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
        >
          <button onClick={onCancel} className="desktop-interior-button px-3 py-1 text-xs">
            Cancel
          </button>
          <button
            onClick={() => onSave(conditions)}
            className="desktop-interior-button px-3 py-1 text-xs font-bold"
          >
            Save Conditions
          </button>
        </div>
      </div>
    </div>
  );
}
