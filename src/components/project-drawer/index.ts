/**
 * Project Drawer Components
 *
 * A reusable drawer system for displaying project meetings on static project pages.
 *
 * Usage:
 * ```tsx
 * import {
 *   ProjectDrawerProvider,
 *   ProjectDrawerTrigger,
 *   ProjectDrawer,
 *   MeetingDetailModal,
 * } from "@/components/project-drawer";
 *
 * const PROJECT_CONFIG = {
 *   organizationId: "xxx" as Id<"organizations">,
 *   projectId: "yyy" as Id<"objects">,
 *   theme: "amber",
 * };
 *
 * export default function ProjectPage() {
 *   return (
 *     <ProjectDrawerProvider config={PROJECT_CONFIG}>
 *       <YourPageContent />
 *       <ProjectDrawerTrigger />
 *       <ProjectDrawer />
 *       <MeetingDetailModal />
 *     </ProjectDrawerProvider>
 *   );
 * }
 * ```
 */

// Main components
export { ProjectDrawerProvider, useProjectDrawer } from "./ProjectDrawerProvider";
export type { ProjectDrawerConfig, DrawerTheme } from "./ProjectDrawerProvider";

export { ProjectDrawerTrigger } from "./ProjectDrawerTrigger";
export { ProjectDrawer } from "./ProjectDrawer";
export { MeetingDetailModal } from "./MeetingDetailModal";

// Sub-components (for customization)
export { MeetingList } from "./MeetingList";
export { MeetingCard } from "./MeetingCard";
export { MeetingNotes } from "./MeetingNotes";
export { MeetingVideos } from "./MeetingVideos";
export { MeetingFiles } from "./MeetingFiles";
export { MeetingComments } from "./MeetingComments";
export { LoginPrompt } from "./LoginPrompt";

// Hooks
export { useProjectMeetings } from "./hooks/useProjectMeetings";
export { useMeetingDetails } from "./hooks/useMeetingDetails";
export { useMeetingComments } from "./hooks/useMeetingComments";
