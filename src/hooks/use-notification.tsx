"use client";

import { create } from "zustand";

interface NotificationAction {
  label: string;
  onClick: () => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "success" | "error" | "info";
  autoClose?: boolean;
  autoCloseDelay?: number;
  actionLabel?: string;
  onAction?: () => void;
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

type NotificationOptions = {
  autoClose?: boolean;
  autoCloseDelay?: number;
  action?: NotificationAction;
};

type NotificationConfig = boolean | NotificationOptions | undefined;

function normalizeNotificationOptions(config: NotificationConfig): NotificationOptions {
  if (typeof config === "boolean") {
    return { autoClose: config };
  }
  return config || {};
}

export function useNotification() {
  const { addNotification } = useNotificationStore();

  const pushNotification = (
    type: "success" | "error" | "info",
    title: string,
    message: string,
    config?: NotificationConfig
  ) => {
    const options = normalizeNotificationOptions(config);
    addNotification({
      title,
      message,
      type,
      autoClose: options.autoClose ?? (options.action ? false : true),
      autoCloseDelay: options.autoCloseDelay,
      actionLabel: options.action?.label,
      onAction: options.action?.onClick,
    });
  };

  return {
    success: (title: string, message: string, config?: NotificationConfig) =>
      pushNotification("success", title, message, config),
    error: (title: string, message: string, config?: NotificationConfig) =>
      pushNotification("error", title, message, config),
    info: (title: string, message: string, config?: NotificationConfig) =>
      pushNotification("info", title, message, config),
  };
}
