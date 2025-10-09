"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import { usePermissions } from "@/contexts/permission-context";

interface PermissionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  permission: string;
  children: ReactNode;
  showTooltip?: boolean;
  onUnauthorized?: () => void;
}

/**
 * Declarative permission button - automatically checks permissions and shows notifications
 *
 * @example
 * <PermissionButton permission="manage_users" onClick={handleInvite}>
 *   Invite User
 * </PermissionButton>
 */
export function PermissionButton({
  permission,
  children,
  onClick,
  showTooltip = true,
  onUnauthorized,
  disabled,
  className = "",
  ...props
}: PermissionButtonProps) {
  const { hasPermission, requestPermission } = usePermissions();
  const allowed = hasPermission(permission);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!allowed) {
      e.preventDefault();
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        requestPermission(permission);
      }
      return;
    }

    onClick?.(e);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={className}
      title={!allowed && showTooltip ? `Requires permission: ${permission}` : undefined}
      aria-disabled={!allowed}
      {...props}
    >
      {children}
    </button>
  );
}
