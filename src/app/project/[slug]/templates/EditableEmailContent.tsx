"use client";

import { EditableText, EditableMultilineText, useCanEdit } from "@/components/project-editing";

interface EditableEmailSubjectProps {
  /** Block ID for this email (e.g., "systems.segelschule.anticipation.email1") */
  blockId: string;
  /** Default subject text */
  defaultValue: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Editable email subject line.
 * In edit mode, shows as an editable text field.
 * In view mode, just renders the text.
 */
export function EditableEmailSubject({
  blockId,
  defaultValue,
  className = "",
}: EditableEmailSubjectProps) {
  const canEdit = useCanEdit();

  // In view mode or when editing not available, just render the text
  if (!canEdit) {
    return <span className={className}>{defaultValue}</span>;
  }

  return (
    <EditableText
      blockId={`${blockId}.subject`}
      defaultValue={defaultValue}
      as="span"
      className={className}
      sectionId={blockId.split(".").slice(0, 2).join(".")} // e.g., "systems.segelschule"
      maxLength={100}
    />
  );
}

interface EditableEmailPreviewProps {
  /** Block ID for this email (e.g., "systems.segelschule.anticipation.email1") */
  blockId: string;
  /** Default preview text */
  defaultValue: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Editable email preview text.
 * In edit mode, shows as an editable multiline text field.
 * In view mode, just renders the text.
 */
export function EditableEmailPreview({
  blockId,
  defaultValue,
  className = "",
}: EditableEmailPreviewProps) {
  const canEdit = useCanEdit();

  // In view mode or when editing not available, just render the text
  if (!canEdit) {
    return <span className={className}>{defaultValue}</span>;
  }

  return (
    <EditableMultilineText
      blockId={`${blockId}.preview`}
      defaultValue={defaultValue}
      as="span"
      className={className}
      sectionId={blockId.split(".").slice(0, 2).join(".")} // e.g., "systems.segelschule"
      maxLength={300}
    />
  );
}

interface EditableSequenceTitleProps {
  /** Block ID for this sequence (e.g., "systems.segelschule.anticipation") */
  blockId: string;
  /** Default title text */
  defaultValue: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Editable sequence title.
 */
export function EditableSequenceTitle({
  blockId,
  defaultValue,
  className = "",
}: EditableSequenceTitleProps) {
  const canEdit = useCanEdit();

  if (!canEdit) {
    return <span className={className}>{defaultValue}</span>;
  }

  return (
    <EditableText
      blockId={`${blockId}.title`}
      defaultValue={defaultValue}
      as="span"
      className={className}
      sectionId={blockId.split(".").slice(0, 2).join(".")}
      maxLength={80}
    />
  );
}
