"use client";

interface EditableFieldStyleOptions {
  isEditMode: boolean;
  isActive: boolean;
  isBusy: boolean;
  allowLineBreaks?: boolean;
}

export function getEditableFieldStyle({
  isEditMode,
  isActive,
  isBusy,
  allowLineBreaks = false,
}: EditableFieldStyleOptions) {
  const border = isEditMode
    ? isActive
      ? "2px solid rgba(37, 99, 235, 0.85)"
      : "2px dashed rgba(37, 99, 235, 0.5)"
    : "2px solid transparent";

  return {
    border,
    borderRadius: 10,
    cursor: isEditMode ? "text" : "inherit",
    minHeight: 24,
    opacity: isBusy ? 0.72 : 1,
    outline: "none",
    padding: isEditMode ? "6px 8px" : undefined,
    transition:
      "border-color 120ms ease, background-color 120ms ease, box-shadow 120ms ease, opacity 120ms ease",
    whiteSpace: allowLineBreaks ? "pre-wrap" : undefined,
    backgroundColor: isEditMode ? "rgba(219, 234, 254, 0.22)" : undefined,
    boxShadow: isEditMode
      ? isActive
        ? "0 0 0 3px rgba(37, 99, 235, 0.15)"
        : "0 0 0 1px rgba(37, 99, 235, 0.12)"
      : undefined,
  };
}

export function EditableFieldHint({
  isEditMode,
  label = "Editable",
}: {
  isEditMode: boolean;
  label?: string;
}) {
  if (!isEditMode) {
    return null;
  }

  return (
    <span
      style={{
        justifySelf: "start",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#1d4ed8",
        backgroundColor: "rgba(219, 234, 254, 0.9)",
        border: "1px solid rgba(37, 99, 235, 0.25)",
        borderRadius: 999,
        padding: "2px 7px",
      }}
    >
      {label}
    </span>
  );
}
