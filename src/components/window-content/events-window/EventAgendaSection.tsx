"use client";

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, Calendar } from 'lucide-react';
import { useNamespaceTranslations } from '@/hooks/use-namespace-translations';

export interface AgendaItem {
  id: string;
  date: number; // timestamp
  startTime: string; // e.g., "09:00"
  endTime?: string; // e.g., "10:30"
  title: string;
  description?: string;
  location?: string;
  speaker?: string;
  badge?: {
    text: string;
    color: string; // hex color or preset name
    enabled: boolean;
  };
}

interface EventAgendaSectionProps {
  agenda: AgendaItem[];
  onAgendaChange: (agenda: AgendaItem[]) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const EventAgendaSection: React.FC<EventAgendaSectionProps> = ({
  agenda,
  onAgendaChange,
  isOpen,
  onToggle,
}) => {
  const { t } = useNamespaceTranslations("ui.events");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const handleAddItem = () => {
    const newItem: AgendaItem = {
      id: `agenda-${Date.now()}`,
      date: Date.now(),
      startTime: "09:00",
      endTime: "10:00",
      title: "",
      description: "",
      location: "",
      speaker: "",
    };
    onAgendaChange([...agenda, newItem]);
    setEditingItemId(newItem.id);
  };

  const handleUpdateItem = (id: string, updates: Partial<AgendaItem>) => {
    onAgendaChange(
      agenda.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
  };

  const handleDeleteItem = (id: string) => {
    onAgendaChange(agenda.filter((item) => item.id !== id));
    if (editingItemId === id) {
      setEditingItemId(null);
    }
  };

  const groupedByDate = agenda.reduce((acc, item) => {
    const dateKey = new Date(item.date).toLocaleDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(item);
    return acc;
  }, {} as Record<string, AgendaItem[]>);

  const sessionPlural = agenda.length === 1 ? '' : 's';

  if (!isOpen) {
    return (
      <div>
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center justify-between w-full text-left py-2 px-3 border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg-light)",
            color: "var(--win95-text)",
          }}
        >
          <div className="flex-1">
            <span className="text-sm font-bold">📅 {t('ui.events.form.agenda')}</span>
            {agenda.length > 0 && (
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                {agenda.length} session{sessionPlural} scheduled
              </p>
            )}
          </div>
          <ChevronDown size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left py-2 px-3 border-2"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg-light)",
          color: "var(--win95-text)",
        }}
      >
        <span className="text-sm font-bold">📅 {t('ui.events.form.agenda')}</span>
        <ChevronUp size={16} />
      </button>

      <div className="pl-4 space-y-3 border-l-2" style={{ borderColor: "var(--win95-border)" }}>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          {t('ui.events.form.agenda_description')}
        </p>

        {/* Add Session Button */}
        <button
          type="button"
          onClick={handleAddItem}
          className="flex items-center gap-2 px-3 py-2 text-sm font-bold border-2 w-full"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--primary)",
            color: "white",
          }}
        >
          <Plus size={16} />
          {t('ui.events.form.add_session')}
        </button>

        {/* Agenda Items */}
        {agenda.length === 0 ? (
          <div
            className="text-center py-8 border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg-light)",
              color: "var(--neutral-gray)",
            }}
          >
            <Calendar size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-xs">{t('ui.events.form.no_sessions')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedByDate)
              .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
              .map(([dateKey, items]) => (
                <div key={dateKey} className="space-y-2">
                  {/* Date Header */}
                  <div
                    className="px-2 py-1 text-xs font-bold border-2"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-bg-light)",
                      color: "var(--win95-text)",
                    }}
                  >
                    {new Date(items[0].date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>

                  {/* Sessions for this date */}
                  {items
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map((item) => (
                      <div
                        key={item.id}
                        className="p-3 border-2 space-y-2"
                        style={{
                          borderColor: editingItemId === item.id ? "var(--primary)" : "var(--win95-border)",
                          background: "var(--win95-input-bg)",
                        }}
                      >
                        {/* Header Row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            {/* Date */}
                            <div>
                              <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                                {t('ui.events.form.agenda_date')}
                              </label>
                              <input
                                type="date"
                                value={new Date(item.date).toISOString().split('T')[0]}
                                onChange={(e) => {
                                  const newDate = new Date(e.target.value).getTime();
                                  handleUpdateItem(item.id, { date: newDate });
                                }}
                                className="w-full px-2 py-1 text-xs border-2"
                                style={{
                                  borderColor: "var(--win95-border)",
                                  background: "var(--win95-input-bg)",
                                  color: "var(--win95-input-text)",
                                }}
                              />
                            </div>

                            {/* Time Range */}
                            <div>
                              <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                                {t('ui.events.form.agenda_time')}
                              </label>
                              <div className="flex items-center gap-1">
                                <input
                                  type="time"
                                  value={item.startTime}
                                  onChange={(e) => handleUpdateItem(item.id, { startTime: e.target.value })}
                                  className="flex-1 px-2 py-1 text-xs border-2"
                                  style={{
                                    borderColor: "var(--win95-border)",
                                    background: "var(--win95-input-bg)",
                                    color: "var(--win95-input-text)",
                                  }}
                                />
                                <span className="text-xs">-</span>
                                <input
                                  type="time"
                                  value={item.endTime || ""}
                                  onChange={(e) => handleUpdateItem(item.id, { endTime: e.target.value })}
                                  className="flex-1 px-2 py-1 text-xs border-2"
                                  style={{
                                    borderColor: "var(--win95-border)",
                                    background: "var(--win95-input-bg)",
                                    color: "var(--win95-input-text)",
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="px-2 py-1 text-xs border-2 flex-shrink-0"
                            style={{
                              borderColor: "var(--win95-border)",
                              background: "#DC2626",
                              color: "white",
                            }}
                            title={t('ui.events.form.delete_session')}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        {/* Title */}
                        <div>
                          <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                            {t('ui.events.form.session_title')}
                          </label>
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => handleUpdateItem(item.id, { title: e.target.value })}
                            placeholder={t('ui.events.form.session_title_placeholder')}
                            className="w-full px-2 py-1 text-xs border-2"
                            style={{
                              borderColor: "var(--win95-border)",
                              background: "var(--win95-input-bg)",
                              color: "var(--win95-input-text)",
                            }}
                          />
                        </div>

                        {/* Speaker & Location */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                              {t('ui.events.form.speaker_optional')}
                            </label>
                            <input
                              type="text"
                              value={item.speaker || ""}
                              onChange={(e) => handleUpdateItem(item.id, { speaker: e.target.value })}
                              placeholder={t('ui.events.form.speaker_placeholder')}
                              className="w-full px-2 py-1 text-xs border-2"
                              style={{
                                borderColor: "var(--win95-border)",
                                background: "var(--win95-input-bg)",
                                color: "var(--win95-input-text)",
                              }}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                              {t('ui.events.form.location_optional')}
                            </label>
                            <input
                              type="text"
                              value={item.location || ""}
                              onChange={(e) => handleUpdateItem(item.id, { location: e.target.value })}
                              placeholder={t('ui.events.form.location_placeholder')}
                              className="w-full px-2 py-1 text-xs border-2"
                              style={{
                                borderColor: "var(--win95-border)",
                                background: "var(--win95-input-bg)",
                                color: "var(--win95-input-text)",
                              }}
                            />
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                            {t('ui.events.form.description_optional')}
                          </label>
                          <textarea
                            value={item.description || ""}
                            onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                            placeholder={t('ui.events.form.description_placeholder')}
                            rows={2}
                            className="w-full px-2 py-1 text-xs border-2"
                            style={{
                              borderColor: "var(--win95-border)",
                              background: "var(--win95-input-bg)",
                              color: "var(--win95-input-text)",
                            }}
                          />
                        </div>

                        {/* Badge Configuration */}
                        <div
                          className="p-2 border-2 space-y-2"
                          style={{
                            borderColor: "var(--win95-border)",
                            background: "var(--win95-bg-light)",
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                              {t('ui.events.form.session_badge')}
                            </label>
                            <label className="flex items-center gap-1 text-xs">
                              <input
                                type="checkbox"
                                checked={item.badge?.enabled ?? false}
                                onChange={(e) => {
                                  const currentBadge = item.badge || { text: "Session", color: "#6B46C1", enabled: false };
                                  handleUpdateItem(item.id, {
                                    badge: {
                                      ...currentBadge,
                                      enabled: e.target.checked,
                                    }
                                  });
                                }}
                                className="w-3 h-3"
                              />
                              <span style={{ color: "var(--win95-text)" }}>{t('ui.events.form.show_badge')}</span>
                            </label>
                          </div>

                          {(item.badge?.enabled ?? false) && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                                  {t('ui.events.form.badge_text')}
                                </label>
                                <input
                                  type="text"
                                  value={item.badge?.text || "Session"}
                                  onChange={(e) => {
                                    const currentBadge = item.badge || { text: "Session", color: "#6B46C1", enabled: true };
                                    handleUpdateItem(item.id, {
                                      badge: {
                                        ...currentBadge,
                                        text: e.target.value,
                                      }
                                    });
                                  }}
                                  placeholder={t('ui.events.form.badge_text_placeholder')}
                                  className="w-full px-2 py-1 text-xs border-2"
                                  style={{
                                    borderColor: "var(--win95-border)",
                                    background: "var(--win95-input-bg)",
                                    color: "var(--win95-input-text)",
                                  }}
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                                  {t('ui.events.form.badge_color')}
                                </label>
                                <div className="flex gap-1">
                                  <input
                                    type="color"
                                    value={item.badge?.color || "#6B46C1"}
                                    onChange={(e) => {
                                      const currentBadge = item.badge || { text: "Session", color: "#6B46C1", enabled: true };
                                      handleUpdateItem(item.id, {
                                        badge: {
                                          ...currentBadge,
                                          color: e.target.value,
                                        }
                                      });
                                    }}
                                    className="w-10 h-6 border-2 cursor-pointer"
                                    style={{
                                      borderColor: "var(--win95-border)",
                                    }}
                                  />
                                  <input
                                    type="text"
                                    value={item.badge?.color || "#6B46C1"}
                                    onChange={(e) => {
                                      const currentBadge = item.badge || { text: "Session", color: "#6B46C1", enabled: true };
                                      handleUpdateItem(item.id, {
                                        badge: {
                                          ...currentBadge,
                                          color: e.target.value,
                                        }
                                      });
                                    }}
                                    placeholder="#6B46C1"
                                    className="flex-1 px-2 py-1 text-xs border-2"
                                    style={{
                                      borderColor: "var(--win95-border)",
                                      background: "var(--win95-input-bg)",
                                      color: "var(--win95-input-text)",
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Badge Preview */}
                          {(item.badge?.enabled ?? false) && (
                            <div className="flex items-center gap-2 pt-1">
                              <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                                {t('ui.events.form.badge_preview')}
                              </span>
                              <span
                                className="px-2 py-1 text-xs font-bold rounded"
                                style={{
                                  backgroundColor: item.badge?.color || "#6B46C1",
                                  color: "white",
                                }}
                              >
                                {item.badge?.text || "Session"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventAgendaSection;
