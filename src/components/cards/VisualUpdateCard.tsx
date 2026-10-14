/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EditableText } from '../common/EditableText';
import { VisualUpdateCardData } from '../../types/report';
import { Image, CheckCircle } from 'lucide-react';

interface Props {
  card: VisualUpdateCardData;
  onInspect?: () => void;
  isInlineEditing?: boolean;
  onUpdate?: (updated: Partial<VisualUpdateCardData>) => void;
}

export const VisualUpdateCard: React.FC<Props> = ({ card, isInlineEditing, onUpdate }) => {
  const editInput =
    'w-full text-[13px] p-2 bg-neutral-50 border border-black/[0.1] rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0071E3] text-[#1F1F1F]';
  const editLabel = 'text-[11px] font-medium text-[#86868B] block mb-1';
  return (
    <div className="space-y-2.5">
      <h3 className="text-sm font-semibold text-[#1F1F1F]"><EditableText value={card.title} label="visual title" onCommit={(title) => onUpdate?.({ title })} /></h3>

      <div className="relative rounded-lg overflow-hidden border border-black/[0.08] bg-neutral-50 max-h-56 flex items-center justify-center">
        <img
          src={card.imageUrl}
          alt={card.altText}
          className="w-full h-auto object-contain max-h-56"
          loading="lazy"
        />
      </div>

      {isInlineEditing ? (
        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
          <div>
            <label className={editLabel}>Title</label>
            <input
              type="text"
              value={card.title}
              onChange={(e) => onUpdate?.({ title: e.target.value })}
              className={editInput}
            />
          </div>
          <div>
            <label className={editLabel}>Caption</label>
            <input
              type="text"
              value={card.caption}
              onChange={(e) => onUpdate?.({ caption: e.target.value })}
              className={editInput}
            />
          </div>
          <div>
            <label className={editLabel}>Alt text (accessibility)</label>
            <input
              type="text"
              value={card.altText}
              onChange={(e) => onUpdate?.({ altText: e.target.value })}
              className={editInput}
            />
          </div>
          <div>
            <label className={editLabel}>Context</label>
            <textarea
              value={card.context || ''}
              onChange={(e) => onUpdate?.({ context: e.target.value })}
              rows={2}
              className={editInput}
            />
          </div>
        </div>
      ) : (
      <div className="space-y-1 text-xs">
        <EditableText value={card.caption} label="caption" onCommit={(caption) => onUpdate?.({ caption })} className="font-medium text-[#1F1F1F]" />
        {card.context && (
          <EditableText value={card.context} label="visual context" multiline onCommit={(context) => onUpdate?.({ context })} className="text-[#727272] leading-relaxed" />
        )}
      </div>
      )}
    </div>
  );
};
