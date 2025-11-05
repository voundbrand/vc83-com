"use client";

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, Calendar } from 'lucide-react';

export interface AgendaItem {
  id: string;
  date: number; // timestamp
  startTime: string; // e.g., "09:00"
  endTime?: string; // e.g., "10:30"
  title: string;
  description?: string;
  location?: string;
  speaker?: string;
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
            <span className="text-sm font-bold">📅 Event Agenda & Schedule</span>
            {agenda.length > 0 && (
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                {agenda.length} session{agenda.length !== 1 ? 's' : ''} scheduled
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
        <span className="text-sm font-bold">📅 Event Agenda & Schedule</span>
        <ChevronUp size={16} />
      </button>

      <div className="pl-4 space-y-3 border-l-2" style={{ borderColor: "var(--win95-border)" }}>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          Build your event schedule with sessions, speakers, and timing
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
          Add Session
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
            <p className="text-xs">No sessions yet. Click "Add Session" to get started.</p>
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
                                Date
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
                                Time
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
                              background: "var(--danger)",
                              color: "white",
                            }}
                            title="Delete session"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        {/* Title */}
                        <div>
                          <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                            Session Title
                          </label>
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => handleUpdateItem(item.id, { title: e.target.value })}
                            placeholder="e.g., Opening Keynote, Workshop, Panel Discussion"
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
                              Speaker (Optional)
                            </label>
                            <input
                              type="text"
                              value={item.speaker || ""}
                              onChange={(e) => handleUpdateItem(item.id, { speaker: e.target.value })}
                              placeholder="Speaker name"
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
                              Location (Optional)
                            </label>
                            <input
                              type="text"
                              value={item.location || ""}
                              onChange={(e) => handleUpdateItem(item.id, { location: e.target.value })}
                              placeholder="Room/venue"
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
                            Description (Optional)
                          </label>
                          <textarea
                            value={item.description || ""}
                            onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                            placeholder="Brief description of this session..."
                            rows={2}
                            className="w-full px-2 py-1 text-xs border-2"
                            style={{
                              borderColor: "var(--win95-border)",
                              background: "var(--win95-input-bg)",
                              color: "var(--win95-input-text)",
                            }}
                          />
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
