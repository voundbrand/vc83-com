"use client";

import { useState, useRef } from "react";
import {
  Brain,
  Database,
  Activity,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
  XCircle,
  Clock,
  FileDown,
  RefreshCw,
  BarChart3,
  Cpu,
  Sparkles,
  Play,
  Trash2,
  Package,
  Upload,
  Download,
  Rocket,
  ExternalLink,
  Settings,
  Zap,
  MessageSquare,
  FileText,
} from "lucide-react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

/**
 * AI System Window - Super Admin AI Training & System Status
 *
 * Permission: create_system_organization (super admin only)
 *
 * This window allows super admins to:
 * - View training data collection statistics
 * - Monitor AI system health
 * - Export training data for fine-tuning
 * - Track model training progress
 */

type TabType = "training" | "models";

export function AiSystemWindow() {
  const [activeTab, setActiveTab] = useState<TabType>("training");

  // Data fetching - training stats
  const trainingStats = useQuery(api.ai.trainingData.getTrainingStats, {});
  const syntheticStats = useQuery(api.seed.seedSyntheticTraining.getSyntheticStats, {});

  // Mutations
  const generateAndImportSynthetic = useMutation(api.seed.seedSyntheticTraining.generateAndImportSynthetic);
  const clearSyntheticData = useMutation(api.seed.seedSyntheticTraining.clearSyntheticData);
  const runSyntheticImport = useMutation(api.seed.seedSyntheticTraining.runSyntheticImport);

  // File input ref for JSONL import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [isExporting, setIsExporting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [syntheticResult, setSyntheticResult] = useState<{
    success: boolean;
    message: string;
    imported?: number;
    skipped?: number;
  } | null>(null);
  const [exportResult, setExportResult] = useState<{
    success: boolean;
    message: string;
    count?: number;
    batchId?: string;
  } | null>(null);

  // Export training data actions
  const exportTrainingData = useAction(api.ai.trainingExport.exportTrainingData);
  const exportAutoTrainFormat = useAction(api.ai.trainingExport.exportAutoTrainFormat);
  const exportAutoTrainTextFormat = useAction(api.ai.trainingExport.exportAutoTrainTextFormat);
  const exportFireworksFormat = useAction(api.ai.trainingExport.exportFireworksFormat);

  // AutoTrain configuration state
  const [autoTrainConfig, setAutoTrainConfig] = useState({
    format: "messages" as "messages" | "text",
    baseModel: "mistralai/Mistral-7B-Instruct-v0.2",
    includeSystemPrompt: true,
    highQualityOnly: true,
  });
  const [isAutoTrainExporting, setIsAutoTrainExporting] = useState(false);
  const [autoTrainResult, setAutoTrainResult] = useState<{
    success: boolean;
    message: string;
    count?: number;
  } | null>(null);

  // Handle export
  const handleExport = async (highQualityOnly: boolean) => {
    setIsExporting(true);
    setExportResult(null);

    try {
      const result = await exportTrainingData({
        onlyHighQuality: highQualityOnly,
        anonymize: true,
        markAsExported: true,
      });

      if (result.success) {
        // Create downloadable file
        const blob = new Blob([result.jsonl], { type: "application/jsonl" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `training-data-${result.batchId}.jsonl`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setExportResult({
          success: true,
          message: `Exported ${result.count} examples`,
          count: result.count,
          batchId: result.batchId,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed";
      setExportResult({
        success: false,
        message,
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Handle generate and import synthetic data
  const handleGenerateSynthetic = async () => {
    setIsGenerating(true);
    setSyntheticResult(null);

    try {
      const result = await generateAndImportSynthetic({});

      setSyntheticResult({
        success: true,
        message: `Generated ${result.generatedCount} examples from ${result.templatesCount} templates`,
        imported: result.imported,
        skipped: result.skipped,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Generation failed";
      setSyntheticResult({
        success: false,
        message,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle clear synthetic data
  const handleClearSynthetic = async () => {
    if (!confirm("Are you sure you want to delete all synthetic training data? This cannot be undone.")) {
      return;
    }

    setIsClearing(true);
    setSyntheticResult(null);

    try {
      const result = await clearSyntheticData({});

      setSyntheticResult({
        success: true,
        message: `Deleted ${result.deleted} synthetic examples`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Clear failed";
      setSyntheticResult({
        success: false,
        message,
      });
    } finally {
      setIsClearing(false);
    }
  };

  // Handle download full JSONL (72 examples)
  const handleDownloadFullJsonl = async () => {
    setIsDownloading(true);
    setSyntheticResult(null);

    try {
      const response = await fetch("/api/training/generate-synthetic");
      if (!response.ok) {
        throw new Error("Failed to generate JSONL");
      }

      const blob = await response.blob();
      const exampleCount = response.headers.get("X-Example-Count") || "72";

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `synthetic-training-data-${exampleCount}-examples.jsonl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSyntheticResult({
        success: true,
        message: `Downloaded ${exampleCount} examples as JSONL`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Download failed";
      setSyntheticResult({
        success: false,
        message,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle import JSONL file
  const handleImportJsonl = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setSyntheticResult(null);

    try {
      const content = await file.text();
      const lines = content.trim().split("\n");
      const examples = lines.map((line) => JSON.parse(line));

      // Import in batches of 25 to avoid mutation size limits
      const batchSize = 25;
      let totalImported = 0;
      let totalSkipped = 0;

      for (let i = 0; i < examples.length; i += batchSize) {
        const batch = examples.slice(i, i + batchSize);
        const result = await runSyntheticImport({ examples: batch });
        totalImported += result.imported;
        totalSkipped += result.skipped;
      }

      setSyntheticResult({
        success: true,
        message: `Imported ${totalImported} examples from ${file.name}`,
        imported: totalImported,
        skipped: totalSkipped,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed";
      setSyntheticResult({
        success: false,
        message: `${message}. Make sure the file is valid JSONL format.`,
      });
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Calculate percentages for visual displays
  const getPercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  // Handle AutoTrain format export
  const handleAutoTrainExport = async () => {
    setIsAutoTrainExporting(true);
    setAutoTrainResult(null);

    try {
      let result;
      if (autoTrainConfig.format === "messages") {
        result = await exportAutoTrainFormat({
          onlyHighQuality: autoTrainConfig.highQualityOnly,
          anonymize: true,
          includeSystemPrompt: autoTrainConfig.includeSystemPrompt,
          includeExported: true, // Allow re-export of already exported examples
        });
      } else {
        result = await exportAutoTrainTextFormat({
          onlyHighQuality: autoTrainConfig.highQualityOnly,
          anonymize: true,
          includeExported: true, // Allow re-export of already exported examples
        });
      }

      if (result.success) {
        // Create downloadable file
        const blob = new Blob([result.jsonl], { type: "application/jsonl" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `autotrain-${result.format}-${result.count}-examples.jsonl`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setAutoTrainResult({
          success: true,
          message: `Exported ${result.count} examples in AutoTrain ${result.format} format`,
          count: result.count,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed";
      setAutoTrainResult({
        success: false,
        message,
      });
    } finally {
      setIsAutoTrainExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--win95-bg)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
        <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
          <Brain size={16} style={{ color: 'var(--primary)' }} />
          AI System
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
          Monitor training data collection and AI system health
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "training" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "training" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("training")}
        >
          <Database size={14} />
          Training Data
        </button>
        <button
          className="px-4 py-2 text-xs font-bold transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "models" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "models" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("models")}
        >
          <Cpu size={14} />
          Fine-tuned Models
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "training" && (
          <>
            {/* Export Result Message */}
            {exportResult && (
              <div
                className="mb-6 p-4 rounded flex items-start gap-3"
                style={{
                  backgroundColor: exportResult.success ? "var(--success)" : "var(--error)",
                  color: "white",
                  border: "2px solid",
                  borderColor: exportResult.success ? "var(--success)" : "var(--error)",
                }}
              >
                {exportResult.success ? (
                  <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={20} className="flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="text-sm font-semibold">{exportResult.message}</p>
                  {exportResult.batchId && (
                    <p className="text-xs mt-1 opacity-80">Batch ID: {exportResult.batchId}</p>
                  )}
                </div>
              </div>
            )}

            {/* Main Stats Grid */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded border-2" style={{ borderColor: "var(--win95-border)", backgroundColor: "var(--win95-bg-light)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Database size={20} style={{ color: "var(--primary)" }} />
                  <span className="text-xs font-semibold" style={{ color: "var(--win95-text-secondary)" }}>Total Examples</span>
                </div>
                <div className="text-3xl font-bold" style={{ color: "var(--primary)" }}>
                  {trainingStats?.total || 0}
                </div>
              </div>

              <div className="p-4 rounded border-2" style={{ borderColor: "var(--win95-border)", backgroundColor: "var(--win95-bg-light)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={20} style={{ color: "var(--success)" }} />
                  <span className="text-xs font-semibold" style={{ color: "var(--win95-text-secondary)" }}>High Quality</span>
                </div>
                <div className="text-3xl font-bold" style={{ color: "var(--success)" }}>
                  {trainingStats?.quality.high_quality || 0}
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--win95-text-secondary)" }}>
                  {getPercentage(trainingStats?.quality.high_quality || 0, trainingStats?.total || 0)}% of total
                </div>
              </div>

              <div className="p-4 rounded border-2" style={{ borderColor: "var(--win95-border)", backgroundColor: "var(--win95-bg-light)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={20} style={{ color: "var(--warning)" }} />
                  <span className="text-xs font-semibold" style={{ color: "var(--win95-text-secondary)" }}>Ready for Training</span>
                </div>
                <div className="text-3xl font-bold" style={{ color: "var(--warning)" }}>
                  {trainingStats?.readyForTraining || 0}
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--win95-text-secondary)" }}>
                  High quality & not exported
                </div>
              </div>

              <div className="p-4 rounded border-2" style={{ borderColor: "var(--win95-border)", backgroundColor: "var(--win95-bg-light)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <FileDown size={20} style={{ color: "var(--info)" }} />
                  <span className="text-xs font-semibold" style={{ color: "var(--win95-text-secondary)" }}>Already Exported</span>
                </div>
                <div className="text-3xl font-bold" style={{ color: "var(--info)" }}>
                  {trainingStats?.export.exported || 0}
                </div>
              </div>
            </div>

            {/* Example Types Breakdown */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="p-4 rounded border-2" style={{ borderColor: "var(--win95-border)", backgroundColor: "var(--win95-bg-light)" }}>
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
                  <BarChart3 size={16} style={{ color: "var(--primary)" }} />
                  By Example Type
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: "var(--win95-text)" }}>Page Generation</span>
                      <span style={{ color: "var(--win95-text-secondary)" }}>{trainingStats?.byType.page_generation || 0}</span>
                    </div>
                    <div className="w-full h-2 rounded" style={{ backgroundColor: "var(--win95-border)" }}>
                      <div
                        className="h-2 rounded"
                        style={{
                          backgroundColor: "var(--primary)",
                          width: `${getPercentage(trainingStats?.byType.page_generation || 0, trainingStats?.total || 0)}%`
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: "var(--win95-text)" }}>Section Edit</span>
                      <span style={{ color: "var(--win95-text-secondary)" }}>{trainingStats?.byType.section_edit || 0}</span>
                    </div>
                    <div className="w-full h-2 rounded" style={{ backgroundColor: "var(--win95-border)" }}>
                      <div
                        className="h-2 rounded"
                        style={{
                          backgroundColor: "var(--secondary)",
                          width: `${getPercentage(trainingStats?.byType.section_edit || 0, trainingStats?.total || 0)}%`
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: "var(--win95-text)" }}>Design Choice</span>
                      <span style={{ color: "var(--win95-text-secondary)" }}>{trainingStats?.byType.design_choice || 0}</span>
                    </div>
                    <div className="w-full h-2 rounded" style={{ backgroundColor: "var(--win95-border)" }}>
                      <div
                        className="h-2 rounded"
                        style={{
                          backgroundColor: "var(--info)",
                          width: `${getPercentage(trainingStats?.byType.design_choice || 0, trainingStats?.total || 0)}%`
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: "var(--win95-text)" }}>Tool Invocation</span>
                      <span style={{ color: "var(--win95-text-secondary)" }}>{trainingStats?.byType.tool_invocation || 0}</span>
                    </div>
                    <div className="w-full h-2 rounded" style={{ backgroundColor: "var(--win95-border)" }}>
                      <div
                        className="h-2 rounded"
                        style={{
                          backgroundColor: "var(--warning)",
                          width: `${getPercentage(trainingStats?.byType.tool_invocation || 0, trainingStats?.total || 0)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Feedback Breakdown */}
              <div className="p-4 rounded border-2" style={{ borderColor: "var(--win95-border)", backgroundColor: "var(--win95-bg-light)" }}>
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
                  <ThumbsUp size={16} style={{ color: "var(--success)" }} />
                  User Feedback
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded" style={{ backgroundColor: "var(--win95-bg)" }}>
                    <ThumbsUp size={24} className="mx-auto mb-2" style={{ color: "var(--success)" }} />
                    <div className="text-xl font-bold" style={{ color: "var(--success)" }}>
                      {trainingStats?.byFeedback.thumbs_up || 0}
                    </div>
                    <div className="text-xs" style={{ color: "var(--win95-text-secondary)" }}>Thumbs Up</div>
                  </div>
                  <div className="text-center p-3 rounded" style={{ backgroundColor: "var(--win95-bg)" }}>
                    <ThumbsDown size={24} className="mx-auto mb-2" style={{ color: "var(--error)" }} />
                    <div className="text-xl font-bold" style={{ color: "var(--error)" }}>
                      {trainingStats?.byFeedback.thumbs_down || 0}
                    </div>
                    <div className="text-xs" style={{ color: "var(--win95-text-secondary)" }}>Thumbs Down</div>
                  </div>
                  <div className="text-center p-3 rounded" style={{ backgroundColor: "var(--win95-bg)" }}>
                    <Clock size={24} className="mx-auto mb-2" style={{ color: "var(--neutral-gray)" }} />
                    <div className="text-xl font-bold" style={{ color: "var(--neutral-gray)" }}>
                      {trainingStats?.byFeedback.no_explicit_feedback || 0}
                    </div>
                    <div className="text-xs" style={{ color: "var(--win95-text-secondary)" }}>No Feedback</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Outcome Breakdown */}
            <div className="p-4 rounded border-2 mb-6" style={{ borderColor: "var(--win95-border)", backgroundColor: "var(--win95-bg-light)" }}>
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
                <CheckCircle size={16} style={{ color: "var(--success)" }} />
                Page Save Outcomes
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-4 rounded" style={{ backgroundColor: "var(--win95-bg)" }}>
                  <div className="text-2xl font-bold" style={{ color: "var(--success)" }}>
                    {trainingStats?.byOutcome.accepted || 0}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "var(--win95-text-secondary)" }}>
                    Accepted (as-is)
                  </div>
                  <div className="text-xs mt-1 px-2 py-0.5 rounded inline-block" style={{ backgroundColor: "var(--success)", color: "white" }}>
                    Best Quality
                  </div>
                </div>
                <div className="text-center p-4 rounded" style={{ backgroundColor: "var(--win95-bg)" }}>
                  <div className="text-2xl font-bold" style={{ color: "var(--warning)" }}>
                    {trainingStats?.byOutcome.accepted_with_edits || 0}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "var(--win95-text-secondary)" }}>
                    Accepted with Edits
                  </div>
                  <div className="text-xs mt-1 px-2 py-0.5 rounded inline-block" style={{ backgroundColor: "var(--warning)", color: "white" }}>
                    Usable
                  </div>
                </div>
                <div className="text-center p-4 rounded" style={{ backgroundColor: "var(--win95-bg)" }}>
                  <div className="text-2xl font-bold" style={{ color: "var(--error)" }}>
                    {trainingStats?.byOutcome.rejected || 0}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "var(--win95-text-secondary)" }}>
                    Rejected
                  </div>
                  <div className="text-xs mt-1 px-2 py-0.5 rounded inline-block" style={{ backgroundColor: "var(--error)", color: "white" }}>
                    Low Quality
                  </div>
                </div>
                <div className="text-center p-4 rounded" style={{ backgroundColor: "var(--win95-bg)" }}>
                  <div className="text-2xl font-bold" style={{ color: "var(--neutral-gray)" }}>
                    {trainingStats?.byOutcome.no_feedback || 0}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "var(--win95-text-secondary)" }}>
                    No Feedback
                  </div>
                  <div className="text-xs mt-1 px-2 py-0.5 rounded inline-block" style={{ backgroundColor: "var(--neutral-gray)", color: "white" }}>
                    Abandoned
                  </div>
                </div>
              </div>
            </div>

            {/* Synthetic Data Section */}
            <div className="p-4 rounded border-2 mb-6" style={{ borderColor: "var(--secondary)", backgroundColor: "var(--win95-bg-light)" }}>
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
                <Sparkles size={16} style={{ color: "var(--secondary)" }} />
                Synthetic Training Data
              </h3>
              <p className="text-xs mb-4" style={{ color: "var(--win95-text-secondary)" }}>
                Bootstrap training data from 12 industry templates. Use &quot;Quick Import&quot; for embedded examples (~36),
                or download the full JSONL (72 examples), review it, then import.
              </p>

              {/* Synthetic Result Message */}
              {syntheticResult && (
                <div
                  className="mb-4 p-3 rounded flex items-start gap-2"
                  style={{
                    backgroundColor: syntheticResult.success ? "var(--success)" : "var(--error)",
                    color: "white",
                  }}
                >
                  {syntheticResult.success ? (
                    <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={16} className="flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-xs font-semibold">{syntheticResult.message}</p>
                    {syntheticResult.imported !== undefined && (
                      <p className="text-xs mt-1 opacity-80">
                        Imported: {syntheticResult.imported}, Skipped (duplicates): {syntheticResult.skipped}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Synthetic Stats */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="p-3 rounded" style={{ backgroundColor: "var(--win95-bg)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Package size={14} style={{ color: "var(--win95-text-secondary)" }} />
                    <span className="text-xs" style={{ color: "var(--win95-text-secondary)" }}>Templates</span>
                  </div>
                  <div className="text-xl font-bold" style={{ color: "var(--win95-text)" }}>
                    12
                  </div>
                </div>
                <div className="p-3 rounded" style={{ backgroundColor: "var(--win95-bg)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={14} style={{ color: "var(--success)" }} />
                    <span className="text-xs" style={{ color: "var(--win95-text-secondary)" }}>Quick</span>
                  </div>
                  <div className="text-xl font-bold" style={{ color: "var(--success)" }}>
                    {syntheticStats?.availableExamples || 36}
                  </div>
                </div>
                <div className="p-3 rounded" style={{ backgroundColor: "var(--win95-bg)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={14} style={{ color: "var(--info)" }} />
                    <span className="text-xs" style={{ color: "var(--win95-text-secondary)" }}>Full</span>
                  </div>
                  <div className="text-xl font-bold" style={{ color: "var(--info)" }}>
                    72
                  </div>
                </div>
                <div className="p-3 rounded" style={{ backgroundColor: "var(--win95-bg)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Database size={14} style={{ color: "var(--primary)" }} />
                    <span className="text-xs" style={{ color: "var(--win95-text-secondary)" }}>Imported</span>
                  </div>
                  <div className="text-xl font-bold" style={{ color: "var(--primary)" }}>
                    {syntheticStats?.totalSynthetic || 0}
                  </div>
                </div>
              </div>

              {/* Actions - Row 1: Quick Actions */}
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={handleGenerateSynthetic}
                  disabled={isGenerating || isClearing || isImporting}
                  className="beveled-button px-4 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: "var(--success)",
                    color: "white",
                  }}
                  title="Quick import of ~36 embedded examples"
                >
                  {isGenerating ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Play size={16} />
                  )}
                  Quick Import ({syntheticStats?.availableExamples || 36})
                </button>
                <button
                  onClick={handleClearSynthetic}
                  disabled={isGenerating || isClearing || isImporting || (syntheticStats?.totalSynthetic || 0) === 0}
                  className="beveled-button px-4 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: "var(--error)",
                    color: "white",
                  }}
                >
                  {isClearing ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  Clear All
                </button>
              </div>

              {/* Actions - Row 2: Full JSONL */}
              <div className="flex items-center gap-3 pt-3 border-t" style={{ borderColor: "var(--win95-border)" }}>
                <span className="text-xs" style={{ color: "var(--win95-text-secondary)" }}>Full dataset (72 examples):</span>
                <button
                  onClick={handleDownloadFullJsonl}
                  disabled={isDownloading || isImporting}
                  className="beveled-button px-3 py-1.5 text-xs font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: "var(--info)",
                    color: "white",
                  }}
                  title="Download full 72-example JSONL file"
                >
                  {isDownloading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
                  Download JSONL
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating || isClearing || isImporting}
                  className="beveled-button px-3 py-1.5 text-xs font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "white",
                  }}
                  title="Import JSONL file into database"
                >
                  {isImporting ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Upload size={14} />
                  )}
                  Import JSONL
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jsonl,.json"
                  onChange={handleImportJsonl}
                  className="hidden"
                />
              </div>

              {/* Template breakdown if we have data */}
              {syntheticStats?.hasData && Object.keys(syntheticStats.byTemplate).length > 0 && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--win95-border)" }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
                    Imported by Template:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(syntheticStats.byTemplate).map(([template, count]) => (
                      <span
                        key={template}
                        className="text-xs px-2 py-1 rounded"
                        style={{ backgroundColor: "var(--win95-bg)", color: "var(--win95-text-secondary)" }}
                      >
                        {template}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Export Section */}
            <div className="p-4 rounded border-2 mb-6" style={{ borderColor: "var(--primary)", backgroundColor: "var(--win95-bg-light)" }}>
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
                <FileDown size={16} style={{ color: "var(--primary)" }} />
                Export Training Data
              </h3>
              <p className="text-xs mb-4" style={{ color: "var(--win95-text-secondary)" }}>
                Export training examples to Hugging Face JSONL format for fine-tuning. Data is anonymized automatically.
              </p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleExport(true)}
                  disabled={isExporting || (trainingStats?.readyForTraining || 0) === 0}
                  className="beveled-button px-4 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "white",
                  }}
                >
                  {isExporting ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <FileDown size={16} />
                  )}
                  Export High Quality ({trainingStats?.readyForTraining || 0})
                </button>
                <button
                  onClick={() => handleExport(false)}
                  disabled={isExporting || (trainingStats?.export.not_exported || 0) === 0}
                  className="beveled-button px-4 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: "var(--neutral-gray)",
                    color: "white",
                  }}
                >
                  {isExporting ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <FileDown size={16} />
                  )}
                  Export All ({trainingStats?.export.not_exported || 0})
                </button>
              </div>
            </div>

            {/* Training Progress Indicator */}
            <div className="p-4 rounded border-2" style={{ borderColor: "var(--win95-border)", backgroundColor: "var(--win95-bg-light)" }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--win95-text)" }}>
                Training Milestone Progress
              </h3>
              <div className="relative">
                <div className="flex justify-between mb-2">
                  <span className="text-xs" style={{ color: "var(--win95-text-secondary)" }}>0</span>
                  <span className="text-xs" style={{ color: "var(--win95-text-secondary)" }}>First Training (200)</span>
                  <span className="text-xs" style={{ color: "var(--win95-text-secondary)" }}>500</span>
                  <span className="text-xs" style={{ color: "var(--win95-text-secondary)" }}>1000</span>
                </div>
                <div className="w-full h-4 rounded" style={{ backgroundColor: "var(--win95-border)" }}>
                  <div
                    className="h-4 rounded transition-all duration-500"
                    style={{
                      backgroundColor: (trainingStats?.quality.high_quality || 0) >= 200 ? "var(--success)" : "var(--primary)",
                      width: `${Math.min(100, ((trainingStats?.quality.high_quality || 0) / 1000) * 100)}%`
                    }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <div className="text-center">
                    <div
                      className="w-3 h-3 rounded-full mx-auto mb-1"
                      style={{
                        backgroundColor: (trainingStats?.quality.high_quality || 0) >= 200 ? "var(--success)" : "var(--neutral-gray)"
                      }}
                    />
                    <span className="text-xs" style={{ color: "var(--win95-text-secondary)" }}>
                      {(trainingStats?.quality.high_quality || 0) >= 200 ? "Ready!" : `${200 - (trainingStats?.quality.high_quality || 0)} to go`}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs mt-4" style={{ color: "var(--win95-text-secondary)" }}>
                {(trainingStats?.quality.high_quality || 0) >= 200
                  ? "You have enough high-quality examples for your first fine-tuning run on Hugging Face!"
                  : `Collect ${200 - (trainingStats?.quality.high_quality || 0)} more high-quality examples to reach the first training milestone.`
                }
              </p>
            </div>

            {/* Empty State */}
            {(trainingStats?.total || 0) === 0 && (
              <div className="text-center py-12 mt-6">
                <Brain size={64} className="mx-auto mb-4" style={{ color: "var(--neutral-gray)" }} />
                <p className="text-lg font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
                  No Training Data Yet
                </p>
                <p className="text-sm" style={{ color: "var(--win95-text-secondary)" }}>
                  Training data is automatically collected when users interact with the Page Builder AI.
                  <br />
                  Start using the Page Builder to begin collecting training examples!
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === "models" && (
          <>
            {/* Platform Export Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* HuggingFace / Together.ai Card */}
              <div className="p-4 rounded border-2" style={{ borderColor: "#FFD21E", backgroundColor: "var(--win95-bg-light)" }}>
                <div className="flex items-center gap-3 mb-3">
                  {/* HuggingFace Logo */}
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#FFD21E" }}>
                    <span className="text-xl">🤗</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>HuggingFace</h4>
                    <p className="text-xs" style={{ color: "var(--win95-text-secondary)" }}>AutoTrain & Together.ai</p>
                  </div>
                </div>
                <p className="text-xs mb-3" style={{ color: "var(--win95-text-secondary)" }}>
                  Messages format for chat models. Works with HuggingFace AutoTrain and Together.ai fine-tuning.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={async () => {
                      setIsAutoTrainExporting(true);
                      setAutoTrainResult(null);
                      try {
                        const result = await exportAutoTrainFormat({
                          onlyHighQuality: autoTrainConfig.highQualityOnly,
                          anonymize: true,
                          includeSystemPrompt: autoTrainConfig.includeSystemPrompt,
                          includeExported: true,
                        });
                        if (result.success) {
                          const blob = new Blob([result.jsonl], { type: "application/jsonl" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `huggingface-messages-${result.count}-examples.jsonl`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                          setAutoTrainResult({ success: true, message: `Exported ${result.count} examples for HuggingFace`, count: result.count });
                        }
                      } catch (error) {
                        setAutoTrainResult({ success: false, message: error instanceof Error ? error.message : "Export failed" });
                      } finally {
                        setIsAutoTrainExporting(false);
                      }
                    }}
                    disabled={isAutoTrainExporting || (trainingStats?.total || 0) === 0}
                    className="w-full beveled-button px-3 py-2 text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "#FFD21E", color: "#000" }}
                  >
                    {isAutoTrainExporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                    Export Messages Format
                  </button>
                  <button
                    onClick={async () => {
                      setIsAutoTrainExporting(true);
                      setAutoTrainResult(null);
                      try {
                        const result = await exportAutoTrainTextFormat({
                          onlyHighQuality: autoTrainConfig.highQualityOnly,
                          anonymize: true,
                          includeExported: true,
                        });
                        if (result.success) {
                          const blob = new Blob([result.jsonl], { type: "application/jsonl" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `huggingface-text-${result.count}-examples.jsonl`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                          setAutoTrainResult({ success: true, message: `Exported ${result.count} examples (text format)`, count: result.count });
                        }
                      } catch (error) {
                        setAutoTrainResult({ success: false, message: error instanceof Error ? error.message : "Export failed" });
                      } finally {
                        setIsAutoTrainExporting(false);
                      }
                    }}
                    disabled={isAutoTrainExporting || (trainingStats?.total || 0) === 0}
                    className="w-full beveled-button px-3 py-2 text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "var(--win95-bg)", color: "var(--win95-text)", border: "1px solid var(--win95-border)" }}
                  >
                    <Download size={14} />
                    Export Text Format
                  </button>
                </div>
                <a
                  href="https://huggingface.co/autotrain"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 text-xs flex items-center gap-1 hover:underline"
                  style={{ color: "#FFD21E" }}
                >
                  <ExternalLink size={12} /> Open AutoTrain
                </a>
              </div>

              {/* Together.ai Card */}
              <div className="p-4 rounded border-2" style={{ borderColor: "#6366F1", backgroundColor: "var(--win95-bg-light)" }}>
                <div className="flex items-center gap-3 mb-3">
                  {/* Together.ai Logo */}
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#6366F1" }}>
                    <span className="text-white text-lg font-bold">T</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>Together.ai</h4>
                    <p className="text-xs" style={{ color: "var(--win95-text-secondary)" }}>Serverless Fine-tuning</p>
                  </div>
                </div>
                <p className="text-xs mb-3" style={{ color: "var(--win95-text-secondary)" }}>
                  Same format as HuggingFace. Upload via Together CLI or dashboard. Pay-per-token inference.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={async () => {
                      setIsAutoTrainExporting(true);
                      setAutoTrainResult(null);
                      try {
                        const result = await exportAutoTrainFormat({
                          onlyHighQuality: autoTrainConfig.highQualityOnly,
                          anonymize: true,
                          includeSystemPrompt: autoTrainConfig.includeSystemPrompt,
                          includeExported: true,
                        });
                        if (result.success) {
                          const blob = new Blob([result.jsonl], { type: "application/jsonl" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `together-ai-${result.count}-examples.jsonl`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                          setAutoTrainResult({ success: true, message: `Exported ${result.count} examples for Together.ai`, count: result.count });
                        }
                      } catch (error) {
                        setAutoTrainResult({ success: false, message: error instanceof Error ? error.message : "Export failed" });
                      } finally {
                        setIsAutoTrainExporting(false);
                      }
                    }}
                    disabled={isAutoTrainExporting || (trainingStats?.total || 0) === 0}
                    className="w-full beveled-button px-3 py-2 text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "#6366F1", color: "white" }}
                  >
                    {isAutoTrainExporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                    Export for Together.ai
                  </button>
                </div>
                <a
                  href="https://api.together.ai/fine-tuning"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 text-xs flex items-center gap-1 hover:underline"
                  style={{ color: "#6366F1" }}
                >
                  <ExternalLink size={12} /> Open Together.ai
                </a>
              </div>

              {/* Fireworks.ai Card */}
              <div className="p-4 rounded border-2" style={{ borderColor: "#F97316", backgroundColor: "var(--win95-bg-light)" }}>
                <div className="flex items-center gap-3 mb-3">
                  {/* Fireworks.ai Logo */}
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#F97316" }}>
                    <span className="text-white text-lg">🎆</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>Fireworks.ai</h4>
                    <p className="text-xs" style={{ color: "var(--win95-text-secondary)" }}>Serverless Inference</p>
                  </div>
                </div>
                <p className="text-xs mb-3" style={{ color: "var(--win95-text-secondary)" }}>
                  Input/output format for Fireworks fine-tuning. Fast serverless inference with LoRA support.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={async () => {
                      setIsAutoTrainExporting(true);
                      setAutoTrainResult(null);
                      try {
                        const result = await exportFireworksFormat({
                          onlyHighQuality: autoTrainConfig.highQualityOnly,
                          anonymize: true,
                          includeSystemPrompt: autoTrainConfig.includeSystemPrompt,
                          includeExported: true,
                        });
                        if (result.success) {
                          const blob = new Blob([result.jsonl], { type: "application/jsonl" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `fireworks-ai-${result.count}-examples.jsonl`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                          setAutoTrainResult({ success: true, message: `Exported ${result.count} examples for Fireworks.ai`, count: result.count });
                        }
                      } catch (error) {
                        setAutoTrainResult({ success: false, message: error instanceof Error ? error.message : "Export failed" });
                      } finally {
                        setIsAutoTrainExporting(false);
                      }
                    }}
                    disabled={isAutoTrainExporting || (trainingStats?.total || 0) === 0}
                    className="w-full beveled-button px-3 py-2 text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "#F97316", color: "white" }}
                  >
                    {isAutoTrainExporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                    Export for Fireworks.ai
                  </button>
                </div>
                <a
                  href="https://app.fireworks.ai/fine-tuning"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 text-xs flex items-center gap-1 hover:underline"
                  style={{ color: "#F97316" }}
                >
                  <ExternalLink size={12} /> Open Fireworks.ai
                </a>
              </div>
            </div>

            {/* Export Result Message */}
            {autoTrainResult && (
              <div
                className="mb-6 p-3 rounded flex items-start gap-2"
                style={{
                  backgroundColor: autoTrainResult.success ? "var(--success)" : "var(--error)",
                  color: "white",
                }}
              >
                {autoTrainResult.success ? (
                  <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={16} className="flex-shrink-0 mt-0.5" />
                )}
                <p className="text-xs font-semibold">{autoTrainResult.message}</p>
              </div>
            )}

            {/* Export Options */}
            <div className="p-4 rounded border-2 mb-6" style={{ borderColor: "var(--win95-border)", backgroundColor: "var(--win95-bg-light)" }}>
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
                <Settings size={16} style={{ color: "var(--info)" }} />
                Export Options
              </h3>
              <div className="flex items-center gap-6 p-3 rounded" style={{ backgroundColor: "var(--win95-bg)" }}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoTrainConfig.highQualityOnly}
                    onChange={(e) => setAutoTrainConfig((c) => ({ ...c, highQualityOnly: e.target.checked }))}
                  />
                  <TrendingUp size={14} style={{ color: "var(--success)" }} />
                  <span className="text-xs" style={{ color: "var(--win95-text)" }}>
                    High quality only ({trainingStats?.quality.high_quality || 0} examples)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoTrainConfig.includeSystemPrompt}
                    onChange={(e) => setAutoTrainConfig((c) => ({ ...c, includeSystemPrompt: e.target.checked }))}
                  />
                  <Brain size={14} style={{ color: "var(--info)" }} />
                  <span className="text-xs" style={{ color: "var(--win95-text)" }}>
                    Include system prompt
                  </span>
                </label>
              </div>
              <p className="text-xs mt-3" style={{ color: "var(--win95-text-secondary)" }}>
                Total available: {trainingStats?.total || 0} examples • High quality: {trainingStats?.quality.high_quality || 0} examples
              </p>
            </div>

            {/* AutoTrain Workflow Guide */}
            <div className="p-4 rounded border-2 mb-6" style={{ borderColor: "var(--win95-border)", backgroundColor: "var(--win95-bg-light)" }}>
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
                <Zap size={16} style={{ color: "var(--warning)" }} />
                AutoTrain Workflow
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 rounded" style={{ backgroundColor: "var(--win95-bg)" }}>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2"
                    style={{ backgroundColor: "var(--primary)", color: "white" }}
                  >
                    1
                  </div>
                  <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
                    Export Data
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--win95-text-secondary)" }}>
                    Download JSONL from above
                  </p>
                </div>
                <div className="text-center p-3 rounded" style={{ backgroundColor: "var(--win95-bg)" }}>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2"
                    style={{ backgroundColor: "var(--primary)", color: "white" }}
                  >
                    2
                  </div>
                  <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
                    Create Dataset
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--win95-text-secondary)" }}>
                    Upload to HF Datasets
                  </p>
                </div>
                <div className="text-center p-3 rounded" style={{ backgroundColor: "var(--win95-bg)" }}>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2"
                    style={{ backgroundColor: "var(--primary)", color: "white" }}
                  >
                    3
                  </div>
                  <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
                    Start Training
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--win95-text-secondary)" }}>
                    AutoTrain LoRA fine-tune
                  </p>
                </div>
                <div className="text-center p-3 rounded" style={{ backgroundColor: "var(--win95-bg)" }}>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2"
                    style={{ backgroundColor: "var(--success)", color: "white" }}
                  >
                    4
                  </div>
                  <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
                    Deploy Model
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--win95-text-secondary)" }}>
                    HF Inference or OpenRouter
                  </p>
                </div>
              </div>
            </div>

            {/* Training Configuration Reference */}
            <div className="p-4 rounded border-2 mb-6" style={{ borderColor: "var(--info)", backgroundColor: "var(--win95-bg-light)" }}>
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
                <Settings size={16} style={{ color: "var(--info)" }} />
                Recommended AutoTrain Settings
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
                    Training Configuration
                  </h4>
                  <table className="w-full text-xs">
                    <tbody>
                      <tr>
                        <td className="py-1" style={{ color: "var(--win95-text-secondary)" }}>Task Type</td>
                        <td className="py-1 font-mono" style={{ color: "var(--win95-text)" }}>LLM SFT (Fine-tuning)</td>
                      </tr>
                      <tr>
                        <td className="py-1" style={{ color: "var(--win95-text-secondary)" }}>Training Method</td>
                        <td className="py-1 font-mono" style={{ color: "var(--win95-text)" }}>LoRA/PEFT</td>
                      </tr>
                      <tr>
                        <td className="py-1" style={{ color: "var(--win95-text-secondary)" }}>LoRA Rank</td>
                        <td className="py-1 font-mono" style={{ color: "var(--win95-text)" }}>16-32</td>
                      </tr>
                      <tr>
                        <td className="py-1" style={{ color: "var(--win95-text-secondary)" }}>Learning Rate</td>
                        <td className="py-1 font-mono" style={{ color: "var(--win95-text)" }}>2e-4 to 5e-5</td>
                      </tr>
                      <tr>
                        <td className="py-1" style={{ color: "var(--win95-text-secondary)" }}>Epochs</td>
                        <td className="py-1 font-mono" style={{ color: "var(--win95-text)" }}>3-5</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <h4 className="text-xs font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
                    Data Column Mapping
                  </h4>
                  <table className="w-full text-xs">
                    <tbody>
                      <tr>
                        <td className="py-1" style={{ color: "var(--win95-text-secondary)" }}>Messages Format</td>
                        <td className="py-1 font-mono" style={{ color: "var(--win95-text)" }}>messages column</td>
                      </tr>
                      <tr>
                        <td className="py-1" style={{ color: "var(--win95-text-secondary)" }}>Text Format</td>
                        <td className="py-1 font-mono" style={{ color: "var(--win95-text)" }}>text column</td>
                      </tr>
                      <tr>
                        <td className="py-1" style={{ color: "var(--win95-text-secondary)" }}>Chat Template</td>
                        <td className="py-1 font-mono" style={{ color: "var(--win95-text)" }}>Auto (from model)</td>
                      </tr>
                      <tr>
                        <td className="py-1" style={{ color: "var(--win95-text-secondary)" }}>Max Length</td>
                        <td className="py-1 font-mono" style={{ color: "var(--win95-text)" }}>4096-8192</td>
                      </tr>
                      <tr>
                        <td className="py-1" style={{ color: "var(--win95-text-secondary)" }}>Batch Size</td>
                        <td className="py-1 font-mono" style={{ color: "var(--win95-text)" }}>4-8 (auto)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="text-xs mt-4 p-2 rounded" style={{ backgroundColor: "var(--win95-bg)", color: "var(--win95-text-secondary)" }}>
                <strong>Tip:</strong> Start with the default AutoTrain settings. For page builder JSON output,
                increase max_length to 8192 to accommodate larger outputs. Use LoRA for faster training and lower cost.
              </p>
            </div>

            {/* Deployed Models (placeholder for future) */}
            <div className="p-4 rounded border-2" style={{ borderColor: "var(--win95-border)", backgroundColor: "var(--win95-bg-light)" }}>
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
                <Cpu size={16} style={{ color: "var(--success)" }} />
                Deployed Models
              </h3>
              <div className="text-center py-8">
                <Cpu size={48} className="mx-auto mb-3" style={{ color: "var(--neutral-gray)" }} />
                <p className="text-sm" style={{ color: "var(--win95-text-secondary)" }}>
                  No custom models deployed yet
                </p>
                <p className="text-xs mt-2" style={{ color: "var(--win95-text-secondary)" }}>
                  After training on AutoTrain, add your model endpoint here to use it in the Page Builder
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
