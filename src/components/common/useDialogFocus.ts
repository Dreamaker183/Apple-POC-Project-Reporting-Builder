import { useEffect, useRef } from 'react';

export function useDialogFocus(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const selector = 'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]';
    const timer = window.setTimeout(() => dialog?.querySelector<HTMLElement>(selector)?.focus(), 0);
    const keydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeRef.current(); }
      if (e.key !== 'Tab' || !dialog) return;
      const fields = [...dialog.querySelectorAll<HTMLElement>(selector)].filter((el) => el.getClientRects().length);
      const first = fields[0];
      const last = fields[fields.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', keydown, true);
      previous?.focus();
    };
  }, [open]);
}
