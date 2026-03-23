import { useCms } from "../providers/CmsProvider";
import type { CmsEditModeState } from "../types";

export function useCmsEditMode(): CmsEditModeState {
  const { isEditMode, setEditMode, toggleEditMode } = useCms();
  return {
    isEditMode,
    setEditMode,
    toggleEditMode,
  };
}
