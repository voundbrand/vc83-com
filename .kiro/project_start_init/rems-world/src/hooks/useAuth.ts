"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useCurrentUser() {
  return useQuery(api.users.current);
}

export function useAuth() {
  const user = useCurrentUser();

  return {
    user,
    isAuthenticated: !!user,
    isLoading: user === undefined,
  };
}
