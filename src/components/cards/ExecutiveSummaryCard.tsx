/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EditableText } from '../common/EditableText';
import { ExecutiveSummaryCardData } from '../../types/report';
import { Sparkles, FileText, CheckCircle2, Plus, X } from 'lucide-react';

interface Props {
  card: ExecutiveSummaryCardData;
  onInspect?: () => void;
  isInlineEditing?: boolean;
  onUpdate?: (updated: Partial<ExecutiveSummaryCardData>) => void;
}

export const ExecutiveSummaryCard: React.FC<Props> = ({ card, isInlineEditing, onUpdate }) => {
  return (
    <div className="space-y-3">
      {isInlineEditing ? (
        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
          <textarea
            aria-label="Summary Text"
            value={card.summary}
            onChange={(e) => onUpdate?.({ summary: e.target.value })}
            className="w-full text-[14px] leading-relaxed p-2.5 bg-neutral-50 border border-black/[0.1] rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
            rows={3}
          />
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-[#727272] uppercase tracking-wide">
              Key Accomplishments
            </div>
            {card.keyAccomplishments.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const updated = [...card.keyAccomplishments];
                    updated[idx] = e.target.value;
                    onUpdate?.({ keyAccomplishments: updated });
                  }}
                  aria-label={`Accomplishment ${idx + 1}`}
                  className="flex-1 min-w-0 text-[13px] p-2 bg-neutral-50 border border-black/[0.1] rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0071E3] text-[#1F1F1F]"
                />
                <button
                  type="button"
                  onClick={() =>
                    onUpdate?.({ keyAccomplishments: card.keyAccomplishments.filter((_, i) => i !== idx) })
                  }
                  className="p-1 text-[#86868B] hover:text-rose-600 rounded shrink-0"
                  aria-label={`Remove accomplishment ${idx + 1}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => onUpdate?.({ keyAccomplishments: [...card.keyAccomplishments, ''] })}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#0071E3] hover:bg-[#0071E3]/10 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add accomplishment</span>
            </button>
          </div>
          <input
            type="text"
            aria-label="Status note"
            value={card.statusNote || ''}
            onChange={(e) => onUpdate?.({ statusNote: e.target.value.trim() || undefined })}
            placeholder="Status note (optional)"
            className="w-full text-[13px] p-2.5 bg-neutral-50 border border-black/[0.1] rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0071E3] text-[#1F1F1F]"
          />
        </div>
      ) : (
        <EditableText value={card.summary} label="summary" multiline placeholder="Add executive summary..." onCommit={(summary) => onUpdate?.({ summary })} className="text-[15px] leading-relaxed text-[#1F1F1F]" />
      )}

      {!isInlineEditing && card.keyAccomplishments.length > 0 && (
        <div className="pt-2 border-t border-black/[0.05]">
          <div className="text-[11px] font-semibold text-[#727272] mb-1.5 uppercase tracking-wide">
            Key Accomplishments
          </div>
          <ul className="space-y-1.5">
            {card.keyAccomplishments.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-[13px] text-[#333333]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                <EditableText
                  value={item}
                  label={`accomplishment ${idx + 1}`}
                  allowEmpty
                  onCommit={(value) => {
                    const trimmed = value.trim();
                    if (!trimmed) {
                      onUpdate?.({ keyAccomplishments: card.keyAccomplishments.filter((_, i) => i !== idx) });
                    } else {
                      onUpdate?.({ keyAccomplishments: card.keyAccomplishments.map((old, i) => (i === idx ? trimmed : old)) });
                    }
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isInlineEditing && card.statusNote && (
        <div className="mt-2 p-2.5 bg-amber-500/[0.06] border border-amber-500/20 rounded-md text-[12px] text-amber-900 flex items-start gap-2">
          <span className="font-semibold text-amber-700 shrink-0">Note:</span>
          <EditableText
            value={card.statusNote}
            label="status note"
            allowEmpty
            onCommit={(statusNote) => onUpdate?.({ statusNote: statusNote.trim() || undefined })}
          />
        </div>
      )}
    </div>
  );
};
