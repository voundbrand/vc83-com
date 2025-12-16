/**
 * Quick Start ICP (Ideal Customer Profile) types
 */

export type ICPId =
  | "ai-agency"
  | "founder-builder"
  | "event-manager"
  | "freelancer"
  | "enterprise";

export interface ICPDefinition {
  id: ICPId;
  name: string;
  icon: string; // Emoji or icon name
  description: string;
  features: string[];
  comingSoon?: boolean;
  provisions: {
    apps: string[];
    templates: string[];
    features: string[];
  };
}

export interface QuickStartProgress {
  icpId: ICPId;
  status: "idle" | "provisioning" | "completed" | "error";
  progress: number; // 0-100
  steps: {
    name: string;
    status: "pending" | "in_progress" | "completed" | "error";
    message?: string;
  }[];
  error?: string;
}
