"use client";

import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface User {
  _id: Id<"users">;
  firstName: string;
  lastName?: string;
  email: string;
  defaultOrgId: Id<"organizations">;
  emailVerified?: boolean;
}

interface Organization {
  _id: Id<"organizations">;
  name: string;
  slug: string;
  plan: "personal" | "business" | "enterprise";
  isPersonalWorkspace: boolean;
}

interface PersonalSignUpData {
  firstName: string;
  email: string;
  password: string;
}

interface BusinessSignUpData extends PersonalSignUpData {
  lastName: string;
  businessName: string;
  taxId?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
}

interface AuthContextType {
  user: User | null;
  currentOrg: Organization | null;
  organizations: Organization[];
  isLoading: boolean;
  isAuthenticated: boolean;
  signUpPersonal: (data: PersonalSignUpData) => Promise<void>;
  signUpBusiness: (data: BusinessSignUpData) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchOrganization: (orgId: Id<"organizations">) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { signIn: convexSignIn, signOut: convexSignOut } = useAuthActions();
  const [currentOrgId, setCurrentOrgId] = useState<Id<"organizations"> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mutations
  const signUpPersonalMutation = useMutation(api.auth.signUpPersonal);
  const signUpBusinessMutation = useMutation(api.auth.signUpBusiness);

  // Queries
  const user = useQuery(api.auth.currentUser) || null;
  const userOrgs = useQuery(api.organizations.getUserOrganizations) || [];
  const currentOrgData = useQuery(
    api.organizations.getOrganization,
    currentOrgId ? { orgId: currentOrgId } : "skip"
  );

  // Set initial org when user loads
  useEffect(() => {
    if (user && !currentOrgId) {
      setCurrentOrgId(user.defaultOrgId);
    }
    if (user !== undefined) {
      setIsLoading(false);
    }
  }, [user, currentOrgId]);

  const signUpPersonal = async (data: PersonalSignUpData) => {
    try {
      // Get client IP (in production, this would come from a server endpoint)
      const ipAddress = "127.0.0.1"; // Placeholder for dev
      
      await signUpPersonalMutation({
        firstName: data.firstName,
        email: data.email,
        password: data.password,
        ipAddress,
      });
      
      // Auto sign-in after signup
      await convexSignIn("password", { email: data.email, password: data.password });
    } catch (error) {
      console.error("Personal signup failed:", error);
      throw error;
    }
  };

  const signUpBusiness = async (data: BusinessSignUpData) => {
    try {
      const ipAddress = "127.0.0.1"; // Placeholder for dev
      
      await signUpBusinessMutation({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        businessName: data.businessName,
        taxId: data.taxId,
        street: data.street || "",
        city: data.city || "",
        postalCode: data.postalCode || "",
        country: data.country || "",
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        website: data.website,
        ipAddress,
      });
      
      // Auto sign-in after signup
      await convexSignIn("password", { email: data.email, password: data.password });
    } catch (error) {
      console.error("Business signup failed:", error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await convexSignIn("password", { email, password });
    } catch (error) {
      console.error("Sign in failed:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await convexSignOut();
      setCurrentOrgId(null);
    } catch (error) {
      console.error("Sign out failed:", error);
      throw error;
    }
  };

  const switchOrganization = async (orgId: Id<"organizations">) => {
    setCurrentOrgId(orgId);
    // Store preference in localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("currentOrgId", orgId);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentOrg: currentOrgData || null,
        organizations: userOrgs,
        isLoading,
        isAuthenticated: !!user,
        signUpPersonal,
        signUpBusiness,
        signIn,
        signOut,
        switchOrganization,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}