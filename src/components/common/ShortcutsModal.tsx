/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useDialogFocus } from './useDialogFocus';
import { X, Command, Keyboard } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  useDialogFocus(isOpen, onClose);
  if (!isOpen) return null;

  const shortcuts = [
    { key: '⌘ + \\ / Ctrl + \\', description: 'Show or hide projects sidebar' },
    { key: '⌘ + Z / Ctrl + Z', description: 'Undo report changes' },
    { key: '⇧ + ⌘ + Z', description: 'Redo report changes' },
    { key: '⌘ + E / Ctrl + E', description: 'Open Destination-Aware Export dialog' },
    { key: '⌘ + P / Ctrl + P', description: 'Open Print-to-PDF layout' },
    { key: '⌘ + Enter', description: 'Build or update report' },
    { key: 'Alt + ↑ / ↓', description: 'Move focused card' },
    { key: 'Esc', description: 'Close active modal dialog' },
    { key: '?', description: 'Show keyboard shortcuts cheat-sheet' },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs no-print"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl border border-black/10 shadow-2xl max-w-md w-full p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center">
              <Keyboard className="w-4 h-4" />
            </div>
            <h2 id="shortcuts-title" className="text-sm font-bold text-[#1F1F1F]">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#727272] hover:text-[#1F1F1F] rounded-md hover:bg-neutral-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {shortcuts.map((sc, idx) => (
            <div 
              key={idx} 
              className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              <span className="text-[#333333]">{sc.description}</span>
              <kbd className="px-2 py-1 bg-neutral-100 border border-black/10 rounded font-mono text-[11px] font-semibold text-[#1F1F1F] shadow-2xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-black/[0.06] text-center">
          <p className="text-[11px] text-[#727272]">
            Apple-style keyboard ergonomics designed for rapid enterprise report curation.
          </p>
        </div>
      </div>
    </div>
  );
};
