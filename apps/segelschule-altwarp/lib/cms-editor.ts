import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  getConvexClient,
  getOrganizationId,
  queryInternal,
  resolveSegelschuleOrganizationId,
} from "@/lib/server-convex";

// Dynamic require avoids excessively deep Convex API type instantiation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedInternalApi: any =
  require("../../../convex/_generated/api").internal;

export const CMS_EDITOR_SESSION_COOKIE = "segelschule_altwarp_editor_session";

export const CMS_EDITOR_PERMISSIONS = [
  "edit_published_pages",
  "publish_pages",
  "media_library.upload",
] as const;

export type CmsEditorPermission = (typeof CMS_EDITOR_PERMISSIONS)[number];

export type CmsEditorPermissionMap = Record<CmsEditorPermission, boolean>;

export interface EditorSessionState {
  sessionId: string;
  userId: string;
  sessionOrganizationId: string;
  siteOrganizationId: string;
  email: string;
  expiresAt: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    currentOrganization: {
      id: string;
      name: string;
      slug: string;
    } | null;
    organizations: Array<{
      id: string;
      name: string;
      slug: string;
      role: string;
    }>;
  } | null;
  permissions: CmsEditorPermissionMap;
}

interface EditorSessionUserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  currentOrganization: {
    id: string;
    name: string;
    slug: string;
  } | null;
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
  }>;
}

export interface EditorSessionScope {
  organizationId?: string | null;
  requestHost?: string | null;
  sessionId?: string | null;
}

export class EditorSessionError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function getCmsOrganizationId(
  scope: EditorSessionScope = {}
): Promise<Id<"organizations">> {
  const hostScopedOrganizationId = await resolveSegelschuleOrganizationId({
    organizationId: scope.organizationId,
    requestHost: scope.requestHost,
  });
  const organizationId = hostScopedOrganizationId || getOrganizationId();
  if (!organizationId) {
    throw new Error("Platform organization is not configured");
  }
  return organizationId as Id<"organizations">;
}

function getEditorCookieOptions(expiresAt?: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(typeof expiresAt === "number" ? { expires: new Date(expiresAt) } : {}),
  };
}

function normalizeSessionId(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function createDefaultPermissionMap(): CmsEditorPermissionMap {
  return {
    edit_published_pages: false,
    publish_pages: false,
    "media_library.upload": false,
  };
}

export function applyEditorSessionCookie(
  response: NextResponse,
  sessionId: string,
  expiresAt: number
): void {
  response.cookies.set(
    CMS_EDITOR_SESSION_COOKIE,
    sessionId,
    getEditorCookieOptions(expiresAt)
  );
}

export function clearEditorSessionCookie(response: NextResponse): void {
  response.cookies.set(CMS_EDITOR_SESSION_COOKIE, "", {
    ...getEditorCookieOptions(),
    maxAge: 0,
  });
}

export async function getEditorSessionIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return normalizeSessionId(cookieStore.get(CMS_EDITOR_SESSION_COOKIE)?.value);
}

export async function resolveEditorSessionState(
  sessionId: string,
  scope: EditorSessionScope = {}
): Promise<EditorSessionState | null> {
  const normalizedSessionId = normalizeSessionId(sessionId);
  if (!normalizedSessionId) {
    return null;
  }

  const convex = getConvexClient();
  const siteOrganizationId = await getCmsOrganizationId(scope);

  try {
    const auth = await queryInternal(
      convex,
      generatedInternalApi.rbacHelpers.requireAuthenticatedUserQuery,
      { sessionId: normalizedSessionId }
    );

    const permissionResults = (await queryInternal(
      convex,
      generatedInternalApi.rbacHelpers.checkPermissionsQuery,
      {
        userId: auth.userId,
        permissions: [...CMS_EDITOR_PERMISSIONS],
        organizationId: siteOrganizationId,
      }
    )) as Partial<Record<CmsEditorPermission, boolean>>;

    const permissions = createDefaultPermissionMap();
    for (const permission of CMS_EDITOR_PERMISSIONS) {
      permissions[permission] = permissionResults[permission] === true;
    }

    const user = (await queryInternal(
      convex,
      generatedInternalApi.api.v1.mobileOAuthInternal.getUserProfileForMobile,
      {
        userId: auth.userId,
        organizationId: siteOrganizationId,
      }
    )) as EditorSessionUserProfile | null;

    return {
      sessionId: normalizedSessionId,
      userId: String(auth.userId),
      sessionOrganizationId: String(auth.organizationId),
      siteOrganizationId: String(siteOrganizationId),
      email: auth.session.email,
      expiresAt: auth.session.expiresAt,
      user: user
        ? {
            id: String(user.id),
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            currentOrganization: user.currentOrganization
              ? {
                  id: String(user.currentOrganization.id),
                  name: user.currentOrganization.name,
                  slug: user.currentOrganization.slug,
                }
              : null,
            organizations: Array.isArray(user.organizations)
              ? user.organizations.map((organization: EditorSessionUserProfile["organizations"][number]) => ({
                  id: String(organization.id),
                  name: organization.name,
                  slug: organization.slug,
                  role: organization.role,
                }))
              : [],
          }
        : null,
      permissions,
    };
  } catch (error) {
    console.warn("[CMS Editor] Failed to resolve editor session:", error);
    return null;
  }
}

export async function getEditorSessionStateFromCookie(): Promise<EditorSessionState | null> {
  const sessionId = await getEditorSessionIdFromCookie();
  if (!sessionId) {
    return null;
  }
  return await resolveEditorSessionState(sessionId);
}

export async function requireEditorSession(
  requiredPermissions: CmsEditorPermission[] = [],
  scope: EditorSessionScope = {}
): Promise<EditorSessionState> {
  const sessionId =
    normalizeSessionId(scope.sessionId ?? undefined) ||
    (await getEditorSessionIdFromCookie());
  if (!sessionId) {
    throw new EditorSessionError(401, "Editor session required");
  }

  const session = await resolveEditorSessionState(sessionId, scope);
  if (!session) {
    throw new EditorSessionError(401, "Editor session is invalid or expired");
  }

  for (const permission of requiredPermissions) {
    if (!session.permissions[permission]) {
      throw new EditorSessionError(
        403,
        `Permission denied: ${permission} required`
      );
    }
  }

  return session;
}
