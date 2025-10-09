"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePermissions } from "@/contexts/permission-context";

interface PermissionLinkProps {
  permission: string;
  href: string;
  children: ReactNode;
  className?: string;
  onUnauthorized?: () => void;
}

/**
 * Declarative permission link - requires permission to navigate
 *
 * @example
 * <PermissionLink permission="view_analytics" href="/analytics">
 *   View Analytics Dashboard
 * </PermissionLink>
 */
export function PermissionLink({
  permission,
  href,
  children,
  className = "",
  onUnauthorized,
}: PermissionLinkProps) {
  const { hasPermission, requestPermission } = usePermissions();
  const allowed = hasPermission(permission);

  const handleClick = (e: React.MouseEvent) => {
    if (!allowed) {
      e.preventDefault();
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        requestPermission(permission);
      }
    }
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={className}
      aria-disabled={!allowed}
      style={{
        opacity: !allowed ? 0.5 : 1,
        cursor: !allowed ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </Link>
  );
}
