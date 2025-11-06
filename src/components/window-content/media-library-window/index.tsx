"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useCurrentOrganization, useAuth } from "@/hooks/use-auth";
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability";
import { useWindowManager } from "@/hooks/use-window-manager";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { Upload, Image as ImageIcon, Settings, Trash2, X, Check } from "lucide-react";

interface MediaLibraryWindowProps {
  onSelect?: (media: {
    _id: Id<"organizationMedia">;
    url: string;
    filename: string;
    mimeType: string;
  }) => void;
  selectionMode?: boolean;
}

type TabType = "upload" | "library" | "settings";

export default function MediaLibraryWindow({
  onSelect,
  selectionMode = false,
}: MediaLibraryWindowProps) {
  const [activeTab, setActiveTab] = useState<TabType>("library");
  const currentOrg = useCurrentOrganization();
  const activeOrgId = currentOrg?.id || null;
  const { sessionId } = useAuth();
  const { closeWindow } = useWindowManager();
  const { t } = useNamespaceTranslations("ui.media_library");

  // Check app availability - returns guard component if unavailable/loading, null if available
  const guard = useAppAvailabilityGuard({
    code: "media-library",
    name: "Media Library",
    description: "Centralized media management for your organization"
  });

  if (guard) return guard;

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--win95-bg)' }}>
      {/* Tabs - Windows 95 Style */}
      <div className="flex border-b-2 shrink-0" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "library" ? 'var(--win95-bg)' : 'var(--win95-bg-light)',
            color: activeTab === "library" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("library")}
        >
          <ImageIcon className="w-4 h-4" />
          {t("ui.media_library.tab.library")}
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "upload" ? 'var(--win95-bg)' : 'var(--win95-bg-light)',
            color: activeTab === "upload" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("upload")}
        >
          <Upload className="w-4 h-4" />
          {t("ui.media_library.tab.upload")}
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "settings" ? 'var(--win95-bg)' : 'var(--win95-bg-light)',
            color: activeTab === "settings" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("settings")}
        >
          <Settings className="w-4 h-4" />
          {t("ui.media_library.tab.settings")}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "library" && (
          <LibraryTab
            organizationId={activeOrgId}
            sessionId={sessionId}
            onSelect={onSelect}
            selectionMode={selectionMode}
            closeWindow={closeWindow}
            t={t}
          />
        )}
        {activeTab === "upload" && (
          <UploadTab organizationId={activeOrgId} sessionId={sessionId} t={t} />
        )}
        {activeTab === "settings" && (
          <SettingsTab organizationId={activeOrgId} sessionId={sessionId} t={t} />
        )}
      </div>
    </div>
  );
}

// Library Tab - Browse and select media
function LibraryTab({
  organizationId,
  sessionId,
  onSelect,
  selectionMode,
  closeWindow,
  t,
}: {
  organizationId: string | null;
  sessionId: string | null;
  onSelect?: (media: {
    _id: Id<"organizationMedia">;
    url: string;
    filename: string;
    mimeType: string;
  }) => void;
  selectionMode: boolean;
  closeWindow: (id: string) => void;
  t: (key: string) => string;
}) {
  const [selectedMedia, setSelectedMedia] = useState<Id<"organizationMedia"> | null>(null);
  const media = useQuery(
    api.organizationMedia.listMedia,
    organizationId && sessionId ? {
      organizationId: organizationId as Id<"organizations">,
      sessionId: sessionId
    } : "skip"
  );
  const deleteMedia = useMutation(api.organizationMedia.deleteMedia);

  const handleDelete = async (mediaId: Id<"organizationMedia">) => {
    if (!sessionId) {
      alert(t("ui.media_library.error.not_authenticated"));
      return;
    }

    if (confirm(t("ui.media_library.library.delete_confirm"))) {
      try {
        await deleteMedia({ sessionId, mediaId });
      } catch (error) {
        console.error("Delete failed:", error);
        alert(t("ui.media_library.error.delete_failed"));
      }
    }
  };

  const handleSelect = (item: NonNullable<typeof media>[number]) => {
    if (selectionMode && onSelect && item.url) {
      // Call the onSelect callback with the media data
      onSelect({
        _id: item._id,
        url: item.url,
        filename: item.filename,
        mimeType: item.mimeType,
      });
      // Close the Media Library window after selection
      closeWindow("media-library");
    } else {
      // Just update local selection state (normal browsing mode)
      setSelectedMedia(item._id);
    }
  };

  if (!media) {
    return (
      <div className="flex items-center justify-center h-full">
        <div style={{ color: 'var(--neutral-gray)' }}>{t("ui.media_library.library.loading")}</div>
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <ImageIcon className="w-16 h-16 mb-4" style={{ color: 'var(--win95-border)' }} />
        <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--win95-text)' }}>{t("ui.media_library.library.empty_title")}</h3>
        <p className="mb-4" style={{ color: 'var(--neutral-gray)' }}>{t("ui.media_library.library.empty_description")}</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {media.map((item) => (
          <div
            key={item._id}
            className="relative group rounded-lg border-2 overflow-hidden cursor-pointer hover:shadow-lg"
            style={{
              borderColor: selectedMedia === item._id ? 'var(--win95-highlight)' : 'var(--win95-border)',
              background: selectedMedia === item._id ? 'var(--win95-highlight-bg)' : 'transparent',
              transform: selectedMedia === item._id ? 'scale(0.98)' : 'scale(1)',
              transition: 'all 0.2s ease-in-out',
              borderWidth: selectedMedia === item._id ? '3px' : '2px',
            }}
            onClick={() => handleSelect(item)}
          >
            {/* Selection Checkmark */}
            {selectedMedia === item._id && (
              <div
                className="absolute top-2 right-2 z-10 rounded-full flex items-center justify-center shadow-lg"
                style={{
                  background: 'var(--win95-highlight)',
                  width: '28px',
                  height: '28px',
                }}
              >
                <Check className="w-5 h-5 text-white" strokeWidth={3} />
              </div>
            )}

            {/* Image Preview */}
            <div className="aspect-square relative" style={{ background: 'var(--win95-bg-light)' }}>
              {item.mimeType.startsWith("image/") && item.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.url}
                  alt={item.filename}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-12 h-12" style={{ color: 'var(--neutral-gray)' }} />
                </div>
              )}

              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item._id);
                  }}
                  className="p-2 text-white rounded-lg transition-colors"
                  style={{ background: 'var(--error)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* File Info */}
            <div className="p-2" style={{ background: 'var(--win95-bg-light)' }}>
              <p className="text-xs font-medium truncate" style={{ color: 'var(--win95-text)' }}>
                {item.filename}
              </p>
              <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                {formatBytes(item.sizeBytes)}
              </p>
            </div>

            {/* Selection Indicator */}
            {selectedMedia === item._id && (
              <div className="absolute top-2 right-2 text-white rounded-full p-1" style={{ background: 'var(--win95-highlight)' }}>
                <X className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Upload Tab - Drag and drop upload
function UploadTab({ organizationId, sessionId, t }: { organizationId: string | null; sessionId: string | null; t: (key: string) => string }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const generateUploadUrl = useMutation(api.organizationMedia.generateUploadUrl);
  const saveMedia = useMutation(api.organizationMedia.saveMedia);

  const handleFileSelect = async (file: File) => {
    if (!organizationId) {
      alert(t("ui.media_library.error.no_organization"));
      return;
    }

    if (!sessionId) {
      alert(t("ui.media_library.error.not_authenticated"));
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Generate upload URL with quota check
      const uploadUrl = await generateUploadUrl({
        sessionId,
        organizationId: organizationId as Id<"organizations">,
        estimatedSizeBytes: file.size,
      });

      // Upload to Convex storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const { storageId } = await result.json();

      // Save metadata
      await saveMedia({
        sessionId,
        organizationId: organizationId as Id<"organizations">,
        storageId,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });

      setUploadProgress(100);
      alert(t("ui.media_library.success.upload"));
    } catch (error) {
      console.error("Upload failed:", error);
      alert(
        error instanceof Error
          ? error.message
          : t("ui.media_library.error.upload_failed")
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelect(file);
    } else {
      alert(t("ui.media_library.error.image_only"));
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div
        className="w-full max-w-2xl border-4 border-dashed rounded-2xl p-12 transition-all text-center"
        style={{
          borderColor: isDragging ? 'var(--win95-highlight)' : 'var(--win95-border)',
          background: isDragging ? 'var(--win95-bg)' : 'var(--win95-bg-light)',
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div className="space-y-4">
            <Upload className="w-16 h-16 mx-auto animate-bounce" style={{ color: 'var(--win95-highlight)' }} />
            <div>
              <p className="text-lg font-semibold" style={{ color: 'var(--win95-text)' }}>
                {t("ui.media_library.upload.uploading")}
              </p>
              <div className="mt-4 w-full rounded-full h-3" style={{ background: 'var(--win95-border-light)' }}>
                <div
                  className="h-3 rounded-full transition-all"
                  style={{
                    width: `${uploadProgress}%`,
                    background: 'var(--win95-highlight)'
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            <Upload className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--neutral-gray)' }} />
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
              {t("ui.media_library.upload.drop_title")}
            </h3>
            <p className="mb-6" style={{ color: 'var(--neutral-gray)' }}>
              {t("ui.media_library.upload.drop_subtitle")}
            </p>
            <label className="inline-block">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
              <span
                className="px-6 py-3 rounded-lg font-medium cursor-pointer transition-colors inline-block"
                style={{
                  background: 'var(--win95-highlight)',
                  color: 'var(--win95-titlebar-text)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                {t("ui.media_library.upload.choose_file")}
              </span>
            </label>
            <p className="text-sm mt-4" style={{ color: 'var(--neutral-gray)' }}>
              {t("ui.media_library.upload.max_file_size")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// Settings Tab - Quota management
function SettingsTab({ organizationId, sessionId, t }: { organizationId: string | null; sessionId: string | null; t: (key: string) => string }) {
  const usage = useQuery(
    api.organizationMedia.getStorageUsage,
    organizationId && sessionId ? {
      organizationId: organizationId as Id<"organizations">,
      sessionId: sessionId
    } : "skip"
  );

  if (!usage) {
    return (
      <div className="flex items-center justify-center h-full">
        <div style={{ color: 'var(--neutral-gray)' }}>{t("ui.media_library.settings.loading")}</div>
      </div>
    );
  }

  const usagePercent = (usage.totalBytes / usage.quotaBytes) * 100;

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Storage Quota */}
        <div className="rounded-lg border p-6" style={{ background: 'var(--win95-bg-light)', borderColor: 'var(--win95-border)' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--win95-text)' }}>
            {t("ui.media_library.settings.storage_usage")}
          </h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span style={{ color: 'var(--neutral-gray)' }}>
                  {formatBytes(usage.totalBytes)} {t("ui.media_library.settings.used")}
                </span>
                <span style={{ color: 'var(--neutral-gray)' }}>
                  {formatBytes(usage.quotaBytes)} {t("ui.media_library.settings.total")}
                </span>
              </div>
              <div className="w-full rounded-full h-4 overflow-hidden" style={{ background: 'var(--win95-border-light)' }}>
                <div
                  className="h-4 rounded-full transition-all"
                  style={{
                    width: `${Math.min(usagePercent, 100)}%`,
                    background: usagePercent > 90
                      ? 'var(--error)'
                      : usagePercent > 75
                      ? '#f59e0b'
                      : 'var(--win95-highlight)'
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 rounded-lg" style={{ background: 'var(--win95-bg)' }}>
                <p className="text-2xl font-bold" style={{ color: 'var(--win95-text)' }}>
                  {usage.fileCount}
                </p>
                <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>{t("ui.media_library.settings.files")}</p>
              </div>
              <div className="p-4 rounded-lg" style={{ background: 'var(--win95-bg)' }}>
                <p className="text-2xl font-bold" style={{ color: 'var(--win95-text)' }}>
                  {Math.round(usagePercent)}%
                </p>
                <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>{t("ui.media_library.settings.used_percentage")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Plan Info */}
        <div className="rounded-lg border p-6" style={{ background: 'var(--win95-bg-light)', borderColor: 'var(--win95-border)' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--win95-text)' }}>
            {t("ui.media_library.settings.your_plan")}
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span style={{ color: 'var(--neutral-gray)' }}>{t("ui.media_library.settings.storage_quota")}</span>
              <span className="font-semibold" style={{ color: 'var(--win95-text)' }}>
                {formatBytes(usage.quotaBytes)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Utility function
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
