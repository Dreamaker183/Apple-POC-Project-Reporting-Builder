/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';

export interface ShortcutBinding {
  /** The key to listen for (e.g. 'z', 'e', 'Enter', '\\', '?'). */
  key: string;
  /** Whether Cmd/Ctrl must be held. */
  meta?: boolean;
  /** Whether Shift must be held. */
  shift?: boolean;
  /** Allow firing while focused on an input/textarea/select/contenteditable. */
  allowInInput?: boolean;
  /** Handler to invoke when the shortcut is triggered. */
  handler: () => void;
}

/**
 * Registers global keyboard shortcuts. Automatically unregisters on unmount.
 *
 * @param shortcuts - Array of shortcut bindings to register.
 * @param deps - React dependency array for re-registration.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutBinding[], deps: React.DependencyList) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;

      const target = e.target as HTMLElement;
      const isInput = !!target.closest('input, textarea, select, [contenteditable="true"]');

      for (const binding of shortcuts) {
        const metaMatch = binding.meta
          ? (e.metaKey || e.ctrlKey)
          : !(e.metaKey || e.ctrlKey);
        const shiftMatch = binding.shift ? e.shiftKey : !e.shiftKey;
        const keyMatch = e.key.toLowerCase() === binding.key.toLowerCase() || e.key === binding.key;

        if (metaMatch && shiftMatch && keyMatch) {
          if (isInput && !binding.allowInInput) continue;
          e.preventDefault();
          binding.handler();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
