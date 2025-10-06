"use client";

import { create } from "zustand";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "success" | "error" | "info";
  autoClose?: boolean;
  autoCloseDelay?: number;
}

interface NotificationStore {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id">) => void;
  removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  addNotification: (notification) => {
    const id = Math.random().toString(36).substring(7);
    set((state) => ({
      notifications: [...state.notifications, { ...notification, id }],
    }));
  },
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));

export function useNotification() {
  const { addNotification } = useNotificationStore();

  return {
    success: (title: string, message: string, autoClose = true) =>
      addNotification({ title, message, type: "success", autoClose }),
    error: (title: string, message: string, autoClose = true) =>
      addNotification({ title, message, type: "error", autoClose }),
    info: (title: string, message: string, autoClose = true) =>
      addNotification({ title, message, type: "info", autoClose }),
  };
}
