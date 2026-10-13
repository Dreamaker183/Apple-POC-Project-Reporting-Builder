import React, { useEffect, useRef, useState } from 'react';

interface Props {
  value: string;
  onCommit: (value: string) => void;
  label: string;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
}

/** A field-level editor: blur commits, Escape cancels, typography stays in place. */
export function EditableText({ value, onCommit, label, className = '', multiline, placeholder = 'Add text' }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const cancelRef = useRef(false);
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);
  const finish = () => {
    if (!cancelRef.current && draft !== value && draft.trim()) onCommit(draft.trim());
    setEditing(false);
  };
  const common = {
    ref: inputRef,
    value: draft,
    'aria-label': label,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
    onBlur: finish,
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    onKeyDown: (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Escape') {
        cancelRef.current = true;
        setEditing(false);
      } else if (e.key === 'Enter' && (!multiline || e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        finish();
      }
    },
    className: `inline-edit-field ${className}`,
  };
  if (editing) return multiline ? <textarea {...common} rows={3} /> : <input {...common} type="text" />;
  return (
    <button
      type="button"
      aria-label={`Edit ${label}`}
      title={`Edit ${label}`}
      className={`editable-text ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        cancelRef.current = false;
        setDraft(value);
        setEditing(true);
      }}
    >
      {value || <span className="text-[#76767B]">{placeholder}</span>}
    </button>
  );
}
