"use client";

import { ReactElement, cloneElement } from "react";
import { usePermissions } from "@/contexts/permission-context";

interface PermissionActionProps {
  permission: string;
  children: ReactElement;
  onUnauthorized?: () => void;
  disabled?: boolean;
}

/**
 * Declarative permission wrapper for any clickable element
 *
 * @example
 * <PermissionAction permission="delete_organization">
 *   <TrashIcon onClick={handleDelete} />
 * </PermissionAction>
 *
 * @example
 * <PermissionAction permission="manage_roles">
 *   <div onClick={openRoleEditor}>Edit Roles</div>
 * </PermissionAction>
 */
export function PermissionAction({
  permission,
  children,
  onUnauthorized,
  disabled = false,
}: PermissionActionProps) {
  const { hasPermission, requestPermission } = usePermissions();
  const allowed = hasPermission(permission);

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;

    if (!allowed) {
      e.preventDefault();
      e.stopPropagation();
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        requestPermission(permission);
      }
      return;
    }

    // Call original onClick if it exists
    const originalOnClick = (children.props as Record<string, unknown>).onClick;
    if (typeof originalOnClick === "function") {
      originalOnClick(e);
    }
  };

  const childProps = children.props as Record<string, unknown>;

  return cloneElement(children, {
    onClick: handleClick,
    "aria-disabled": !allowed || disabled,
    style: {
      ...(typeof childProps.style === "object" ? childProps.style : {}),
      opacity: !allowed || disabled ? 0.5 : 1,
      cursor: !allowed || disabled ? "not-allowed" : "pointer",
    },
  } as Partial<typeof childProps>);
}
