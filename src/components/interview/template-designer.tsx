"use client";

/**
 * INTERVIEW TEMPLATE DESIGNER
 *
 * Agency-facing UI for creating and editing interview templates.
 * Form-based editor with phase/question management.
 *
 * Features:
 * - Template metadata editing
 * - Phase list with drag-to-reorder
 * - Question editor per phase
 * - Skip condition builder
 * - Output schema viewer
 * - Preview mode
 */

import { useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { InterviewPhase, InterviewQuestion } from "../../../convex/schemas/interviewSchemas";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Save,
  Play,
  Archive,
  Copy,
  Settings,
} from "lucide-react";

interface TemplateDesignerProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  templateId?: Id<"objects">;
  onSave?: () => void;
  onPreview?: () => void;
}

export function InterviewTemplateDesigner({
  sessionId,
  organizationId,
  templateId,
  onSave,
  onPreview,
}: TemplateDesignerProps) {
  // State
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);

  // Queries
  const template = useQuery(
    api.interviewTemplateOntology.getTemplate,
    templateId ? { sessionId, templateId } : "skip"
  );

  // Mutations
  const createTemplate = useMutation(api.interviewTemplateOntology.createTemplate);
  const updateTemplate = useMutation(api.interviewTemplateOntology.updateTemplate);
  const updatePhases = useMutation(api.interviewTemplateOntology.updateTemplatePhases);
  const activateTemplate = useMutation(api.interviewTemplateOntology.activateTemplate);
  const archiveTemplate = useMutation(api.interviewTemplateOntology.archiveTemplate);
  const cloneTemplate = useMutation(api.interviewTemplateOntology.cloneTemplate);

  // Local state for editing
  const [localName, setLocalName] = useState(template?.customProperties?.templateName || "");
  const [localDescription, setLocalDescription] = useState(template?.customProperties?.description || "");
  const [localMode, setLocalMode] = useState<"quick" | "standard" | "deep_discovery">(
    template?.customProperties?.mode || "standard"
  );
  const [localPhases, setLocalPhases] = useState<InterviewPhase[]>(
    template?.customProperties?.phases || []
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Update local state when template loads
  useState(() => {
    if (template?.customProperties) {
      setLocalName(template.customProperties.templateName);
      setLocalDescription(template.customProperties.description);
      setLocalMode(template.customProperties.mode);
      setLocalPhases(template.customProperties.phases || []);
    }
  });

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  };

  const addPhase = () => {
    const newPhase: InterviewPhase = {
      phaseId: `phase_${Date.now()}`,
      phaseName: `Phase ${localPhases.length + 1}`,
      order: localPhases.length + 1,
      isRequired: false,
      estimatedMinutes: 5,
      questions: [],
      completionPrompt: "Great! Let's move on to the next section.",
    };
    setLocalPhases([...localPhases, newPhase]);
    setExpandedPhases((prev) => new Set([...prev, newPhase.phaseId]));
    setHasUnsavedChanges(true);
  };

  const removePhase = (phaseId: string) => {
    setLocalPhases(localPhases.filter((p) => p.phaseId !== phaseId));
    setHasUnsavedChanges(true);
  };

  const updatePhase = (phaseId: string, updates: Partial<InterviewPhase>) => {
    setLocalPhases(
      localPhases.map((p) => (p.phaseId === phaseId ? { ...p, ...updates } : p))
    );
    setHasUnsavedChanges(true);
  };

  const addQuestion = (phaseId: string) => {
    const phase = localPhases.find((p) => p.phaseId === phaseId);
    if (!phase) return;

    const newQuestion: InterviewQuestion = {
      questionId: `q_${Date.now()}`,
      promptText: "Enter your question here...",
      expectedDataType: "freeform",
      extractionField: `field_${phase.questions.length + 1}`,
    };

    updatePhase(phaseId, { questions: [...phase.questions, newQuestion] });
    setEditingQuestion(newQuestion.questionId);
  };

  const updateQuestion = (
    phaseId: string,
    questionId: string,
    updates: Partial<InterviewQuestion>
  ) => {
    const phase = localPhases.find((p) => p.phaseId === phaseId);
    if (!phase) return;

    const updatedQuestions = phase.questions.map((q) =>
      q.questionId === questionId ? { ...q, ...updates } : q
    );
    updatePhase(phaseId, { questions: updatedQuestions });
  };

  const removeQuestion = (phaseId: string, questionId: string) => {
    const phase = localPhases.find((p) => p.phaseId === phaseId);
    if (!phase) return;

    updatePhase(phaseId, {
      questions: phase.questions.filter((q) => q.questionId !== questionId),
    });
  };

  const handleSave = async () => {
    if (!templateId) {
      // Create new template
      await createTemplate({
        sessionId,
        organizationId,
        templateName: localName,
        description: localDescription,
        mode: localMode,
      });
    } else {
      // Update existing template
      await updateTemplate({
        sessionId,
        templateId,
        updates: {
          templateName: localName,
          description: localDescription,
          mode: localMode,
        },
      });

      // Update phases
      await updatePhases({
        sessionId,
        templateId,
        phases: localPhases,
      });
    }

    setHasUnsavedChanges(false);
    onSave?.();
  };

  const handleActivate = async () => {
    if (!templateId) return;
    await activateTemplate({ sessionId, templateId });
  };

  const handleArchive = async () => {
    if (!templateId) return;
    await archiveTemplate({ sessionId, templateId });
  };

  const handleClone = async () => {
    if (!templateId) return;
    await cloneTemplate({
      sessionId,
      sourceTemplateId: templateId,
      newName: `${localName} (Copy)`,
    });
  };

  // Calculate totals
  const totalQuestions = localPhases.reduce((sum, p) => sum + p.questions.length, 0);
  const totalMinutes = localPhases.reduce((sum, p) => sum + p.estimatedMinutes, 0);

  return (
    <div className="h-full flex flex-col bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <input
              type="text"
              value={localName}
              onChange={(e) => {
                setLocalName(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="Template Name"
              className="text-xl font-semibold bg-transparent border-none outline-none w-full placeholder:text-slate-500"
            />
            <input
              type="text"
              value={localDescription}
              onChange={(e) => {
                setLocalDescription(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="Description..."
              className="text-sm text-slate-400 bg-transparent border-none outline-none w-full mt-1 placeholder:text-slate-600"
            />
          </div>

          <div className="flex items-center gap-2 ml-4">
            {/* Mode selector */}
            <select
              value={localMode}
              onChange={(e) => {
                setLocalMode(e.target.value as "quick" | "standard" | "deep_discovery");
                setHasUnsavedChanges(true);
              }}
              className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-md"
            >
              <option value="quick">Quick (15 min)</option>
              <option value="standard">Standard (25 min)</option>
              <option value="deep_discovery">Deep (45 min)</option>
            </select>

            {/* Actions */}
            {templateId && (
              <>
                <button
                  onClick={handleClone}
                  className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md"
                  title="Clone template"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={handleArchive}
                  className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md"
                  title="Archive template"
                >
                  <Archive className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              onClick={onPreview}
              className="px-3 py-1.5 text-sm bg-slate-700 text-slate-200 rounded-md hover:bg-slate-600 flex items-center gap-1"
            >
              <Play className="w-4 h-4" />
              Preview
            </button>

            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              className="px-3 py-1.5 text-sm bg-violet-600 text-white rounded-md hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Save className="w-4 h-4" />
              Save
            </button>

            {templateId && template?.status === "draft" && (
              <button
                onClick={handleActivate}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-500"
              >
                Activate
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
          <span>{localPhases.length} phases</span>
          <span>{totalQuestions} questions</span>
          <span>~{totalMinutes} min</span>
          {template?.status && (
            <span
              className={`px-2 py-0.5 rounded text-xs ${
                template.status === "active"
                  ? "bg-green-900 text-green-300"
                  : template.status === "draft"
                    ? "bg-yellow-900 text-yellow-300"
                    : "bg-slate-700 text-slate-400"
              }`}
            >
              {template.status}
            </span>
          )}
        </div>
      </div>

      {/* Phase List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {localPhases.map((phase, index) => (
          <PhaseCard
            key={phase.phaseId}
            phase={phase}
            index={index}
            isExpanded={expandedPhases.has(phase.phaseId)}
            onToggle={() => togglePhase(phase.phaseId)}
            onUpdate={(updates) => updatePhase(phase.phaseId, updates)}
            onRemove={() => removePhase(phase.phaseId)}
            onAddQuestion={() => addQuestion(phase.phaseId)}
            onUpdateQuestion={(qId, updates) => updateQuestion(phase.phaseId, qId, updates)}
            onRemoveQuestion={(qId) => removeQuestion(phase.phaseId, qId)}
            editingQuestion={editingQuestion}
            setEditingQuestion={setEditingQuestion}
          />
        ))}

        {/* Add Phase Button */}
        <button
          onClick={addPhase}
          className="w-full py-3 border-2 border-dashed border-slate-700 rounded-lg text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Phase
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// PHASE CARD COMPONENT
// ============================================================================

interface PhaseCardProps {
  phase: InterviewPhase;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<InterviewPhase>) => void;
  onRemove: () => void;
  onAddQuestion: () => void;
  onUpdateQuestion: (questionId: string, updates: Partial<InterviewQuestion>) => void;
  onRemoveQuestion: (questionId: string) => void;
  editingQuestion: string | null;
  setEditingQuestion: (id: string | null) => void;
}

function PhaseCard({
  phase,
  index,
  isExpanded,
  onToggle,
  onUpdate,
  onRemove,
  onAddQuestion,
  onUpdateQuestion,
  onRemoveQuestion,
  editingQuestion,
  setEditingQuestion,
}: PhaseCardProps) {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      {/* Phase Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-750"
        onClick={onToggle}
      >
        <GripVertical className="w-4 h-4 text-slate-500 cursor-grab" />

        <button className="text-slate-400">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>

        <div className="flex-1">
          <input
            type="text"
            value={phase.phaseName}
            onChange={(e) => onUpdate({ phaseName: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className="font-medium bg-transparent border-none outline-none"
          />
          <div className="text-xs text-slate-500 mt-0.5">
            {phase.questions.length} questions ~ {phase.estimatedMinutes} min
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <label className="flex items-center gap-1 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={phase.isRequired}
              onChange={(e) => onUpdate({ isRequired: e.target.checked })}
              className="w-3 h-3"
            />
            Required
          </label>

          <input
            type="number"
            value={phase.estimatedMinutes}
            onChange={(e) => onUpdate({ estimatedMinutes: parseInt(e.target.value) || 5 })}
            className="w-12 px-2 py-1 text-xs bg-slate-700 rounded border-none outline-none"
            min={1}
            max={30}
          />
          <span className="text-xs text-slate-500">min</span>

          <button
            onClick={onRemove}
            className="p-1 text-slate-500 hover:text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Questions */}
      {isExpanded && (
        <div className="border-t border-slate-700 px-4 py-3 space-y-3">
          {/* Intro Prompt */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">Phase Introduction</label>
            <input
              type="text"
              value={phase.introPrompt || ""}
              onChange={(e) => onUpdate({ introPrompt: e.target.value })}
              placeholder="What the interviewer says when entering this phase..."
              className="w-full px-3 py-2 text-sm bg-slate-700 rounded border-none outline-none placeholder:text-slate-500"
            />
          </div>

          {/* Questions List */}
          {phase.questions.map((question, qIndex) => (
            <QuestionEditor
              key={question.questionId}
              question={question}
              index={qIndex}
              isEditing={editingQuestion === question.questionId}
              onEdit={() => setEditingQuestion(question.questionId)}
              onUpdate={(updates) => onUpdateQuestion(question.questionId, updates)}
              onRemove={() => onRemoveQuestion(question.questionId)}
            />
          ))}

          {/* Add Question Button */}
          <button
            onClick={onAddQuestion}
            className="w-full py-2 text-sm border border-dashed border-slate-600 rounded text-slate-500 hover:text-slate-300 hover:border-slate-400 flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>

          {/* Completion Prompt */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">Phase Completion</label>
            <input
              type="text"
              value={phase.completionPrompt}
              onChange={(e) => onUpdate({ completionPrompt: e.target.value })}
              placeholder="What to say when phase is complete..."
              className="w-full px-3 py-2 text-sm bg-slate-700 rounded border-none outline-none placeholder:text-slate-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// QUESTION EDITOR COMPONENT
// ============================================================================

interface QuestionEditorProps {
  question: InterviewQuestion;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onUpdate: (updates: Partial<InterviewQuestion>) => void;
  onRemove: () => void;
}

function QuestionEditor({
  question,
  index,
  isEditing,
  onEdit,
  onUpdate,
  onRemove,
}: QuestionEditorProps) {
  return (
    <div className="bg-zinc-750 rounded-lg p-3 border border-slate-600">
      <div className="flex items-start gap-2">
        <span className="text-xs text-slate-500 mt-1">Q{index + 1}</span>
        <div className="flex-1">
          <textarea
            value={question.promptText}
            onChange={(e) => onUpdate({ promptText: e.target.value })}
            onClick={onEdit}
            rows={isEditing ? 3 : 1}
            className="w-full px-2 py-1 text-sm bg-transparent border-none outline-none resize-none"
            placeholder="Enter your question..."
          />

          {isEditing && (
            <div className="mt-2 space-y-2">
              {/* Help Text */}
              <input
                type="text"
                value={question.helpText || ""}
                onChange={(e) => onUpdate({ helpText: e.target.value })}
                placeholder="Help text (shown if user needs clarification)"
                className="w-full px-2 py-1 text-xs bg-slate-700 rounded border-none outline-none placeholder:text-slate-500"
              />

              {/* Data Type & Field */}
              <div className="flex gap-2">
                <select
                  value={question.expectedDataType}
                  onChange={(e) =>
                    onUpdate({
                      expectedDataType: e.target.value as InterviewQuestion["expectedDataType"],
                    })
                  }
                  className="px-2 py-1 text-xs bg-slate-700 rounded border-none"
                >
                  <option value="freeform">Freeform</option>
                  <option value="text">Text</option>
                  <option value="list">List</option>
                  <option value="choice">Choice</option>
                  <option value="rating">Rating</option>
                </select>

                <input
                  type="text"
                  value={question.extractionField}
                  onChange={(e) => onUpdate({ extractionField: e.target.value })}
                  placeholder="Field name (e.g., bio, icp)"
                  className="flex-1 px-2 py-1 text-xs bg-slate-700 rounded border-none outline-none placeholder:text-slate-500"
                />
              </div>

              {/* Follow-up Prompts */}
              <div>
                <label className="text-xs text-slate-500 block mb-1">Follow-up prompts (one per line)</label>
                <textarea
                  value={question.followUpPrompts?.join("\n") || ""}
                  onChange={(e) =>
                    onUpdate({
                      followUpPrompts: e.target.value.split("\n").filter((s) => s.trim()),
                    })
                  }
                  rows={2}
                  placeholder="Can you elaborate on that?&#10;Tell me more about..."
                  className="w-full px-2 py-1 text-xs bg-slate-700 rounded border-none outline-none resize-none placeholder:text-slate-500"
                />
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onRemove}
          className="p-1 text-slate-500 hover:text-red-400"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
