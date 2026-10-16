import React, { useEffect, useRef, useState } from 'react';

interface Props {
  value?: string;
  onCommit: (value: string) => void;
  label: string;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
  allowEmpty?: boolean;
}

/** A field-level editor: blur commits, Escape cancels, typography stays in place. */
export function EditableText({
  value = '',
  onCommit,
  label,
  className = '',
  multiline,
  placeholder = 'Add text',
  allowEmpty = false,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (!editing) {
      setDraft(value);
    }
  }, [value, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const finish = () => {
    if (!cancelRef.current) {
      const trimmed = draft.trim();
      if (trimmed !== value) {
        if (trimmed) {
          onCommit(trimmed);
        } else if (allowEmpty) {
          onCommit('');
        }
      }
    }
    setEditing(false);
  };

  const isInvalidEmpty = !allowEmpty && !draft.trim();

  const common = {
    ref: inputRef,
    value: draft,
    'aria-label': label,
    'aria-required': !allowEmpty,
    'aria-invalid': isInvalidEmpty,
    placeholder,
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
    className: `inline-edit-field ${className} ${isInvalidEmpty ? '!outline-amber-500' : ''}`,
  };

  if (editing) return multiline ? <textarea {...common} rows={3} /> : <input {...common} type="text" />;

  return (
    <button
      type="button"
      aria-label={`Edit ${label}`}
      title={`Edit ${label}${!allowEmpty ? ' (Required)' : ''}`}
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
