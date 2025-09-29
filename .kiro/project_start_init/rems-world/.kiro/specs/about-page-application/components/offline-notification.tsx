"use client";

import { useOnlineStatus } from "@/hooks/use-online-status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function OfflineNotification() {
  const isOnline = useOnlineStatus();
  const [showOffline, setShowOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowOffline(true);
    } else {
      // Delay hiding to show reconnection message
      const timer = setTimeout(() => setShowOffline(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!showOffline) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-2">
      <Alert
        className={`${
          isOnline
            ? "border-green-500 bg-green-50 dark:bg-green-950"
            : "border-orange-500 bg-orange-50 dark:bg-orange-950"
        }`}
      >
        <WifiOff className="h-4 w-4" />
        <AlertTitle>{isOnline ? "Back Online" : "You're Offline"}</AlertTitle>
        <AlertDescription>
          {isOnline
            ? "Your connection has been restored."
            : "Some features may be limited. We'll reconnect automatically when you're back online."}
        </AlertDescription>
      </Alert>
    </div>
  );
}
