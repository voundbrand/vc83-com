/**
 * USE MODAL HOOK
 *
 * Reusable modal state management hook. Replaces the repeated pattern of:
 *   const [showModal, setShowModal] = useState(false);
 *   const [editId, setEditId] = useState<Id | null>(null);
 *
 * Found in 50+ components across the codebase.
 *
 * Usage:
 *   const modal = useModal();
 *   modal.open();           // Open without an edit target
 *   modal.open(someId);     // Open with an edit target
 *   modal.close();          // Close and clear edit target
 *   modal.isOpen;           // boolean
 *   modal.editId;           // T | null
 *
 * With typed IDs:
 *   const modal = useModal<Id<"objects">>();
 *   modal.open(objectId);   // Type-safe
 *
 * Multiple modals:
 *   const addModal = useModal();
 *   const deleteConfirm = useModal<Id<"objects">>();
 */

import { useState, useCallback } from "react";

interface UseModalReturn<T> {
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** The ID of the item being edited, or null if creating new */
  editId: T | null;
  /** Open the modal. Optionally pass an ID to edit an existing item. */
  open: (id?: T) => void;
  /** Close the modal and clear the edit ID */
  close: () => void;
  /** Toggle the modal open/closed */
  toggle: () => void;
}

export function useModal<T = string>(): UseModalReturn<T> {
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<T | null>(null);

  const open = useCallback((id?: T) => {
    setEditId(id ?? null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setEditId(null);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      if (prev) {
        // Closing - also clear editId
        setEditId(null);
      }
      return !prev;
    });
  }, []);

  return { isOpen, editId, open, close, toggle };
}
