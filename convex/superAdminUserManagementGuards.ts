import type { Id } from "./_generated/dataModel";

export function assertActorIsSuperAdmin(isSuperAdmin: boolean): void {
  if (!isSuperAdmin) {
    throw new Error("Nicht autorisiert: Nur Super-Administratoren können Benutzer verwalten");
  }
}

export function assertNotSelfDeactivation(
  actorUserId: Id<"users">,
  targetUserId: Id<"users">
): void {
  if (actorUserId === targetUserId) {
    throw new Error("Selbst-Deaktivierung ist nicht erlaubt");
  }
}

export function assertNotSelfMembershipRemoval(
  actorUserId: Id<"users">,
  targetUserId: Id<"users">,
  actorSessionOrganizationId: Id<"organizations">,
  targetOrganizationId: Id<"organizations">
): void {
  if (actorUserId === targetUserId && actorSessionOrganizationId === targetOrganizationId) {
    throw new Error("Selbst-Entfernung aus der aktuellen Sitzungsorganisation ist nicht erlaubt");
  }
}

export function assertNotLastGlobalSuperAdmin(args: {
  targetHasSuperAdminRole: boolean;
  activeSuperAdminCount: number;
  nextIsActive: boolean;
}): void {
  const deactivatingSuperAdmin = args.targetHasSuperAdminRole && args.nextIsActive === false;
  if (deactivatingSuperAdmin && args.activeSuperAdminCount <= 1) {
    throw new Error("Der letzte aktive Super-Administrator kann nicht deaktiviert werden");
  }
}

export function assertOrgOwnerNotOrphaned(args: {
  targetIsOrgOwner: boolean;
  nextIsOrgOwner: boolean;
  remainingActiveOwnerCount: number;
  organizationLabel?: string;
}): void {
  if (args.targetIsOrgOwner && !args.nextIsOrgOwner && args.remainingActiveOwnerCount <= 0) {
    const suffix = args.organizationLabel ? ` (${args.organizationLabel})` : "";
    throw new Error(`Diese Änderung würde die Organisation ohne aktiven Eigentümer lassen${suffix}`);
  }
}
