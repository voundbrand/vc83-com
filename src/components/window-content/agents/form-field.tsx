/**
 * Reusable Win95-styled form field for agent configuration forms.
 */

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  type?: string;
}

export function FormField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  rows,
  type,
}: FormFieldProps) {
  const style = {
    borderColor: "var(--win95-border)",
    background: "var(--win95-bg-light, #fff)",
    color: "var(--win95-text)",
  };

  return (
    <div>
      <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--win95-text)" }}>
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows || 3}
          className="w-full border-2 px-2 py-1 text-xs resize-y"
          style={style}
        />
      ) : (
        <input
          type={type || "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border-2 px-2 py-1 text-xs"
          style={style}
        />
      )}
    </div>
  );
}
