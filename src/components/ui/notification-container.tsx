"use client";

import { RetroNotification } from "./retro-notification";
import { useNotificationStore } from "@/hooks/use-notification";

export function NotificationContainer() {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <div className="fixed top-0 right-0 z-[9999] pointer-events-none">
      <div className="flex flex-col gap-4 p-4 pointer-events-auto">
        {notifications.map((notification, index) => (
          <div
            key={notification.id}
            style={{ marginTop: index > 0 ? "1rem" : 0 }}
          >
            <RetroNotification
              title={notification.title}
              message={notification.message}
              type={notification.type}
              onClose={() => removeNotification(notification.id)}
              autoClose={notification.autoClose}
              autoCloseDelay={notification.autoCloseDelay}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
