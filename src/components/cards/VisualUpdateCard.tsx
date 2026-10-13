/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { VisualUpdateCardData } from '../../types/report';
import { Image, CheckCircle } from 'lucide-react';

interface Props {
  card: VisualUpdateCardData;
  onInspect?: () => void;
  isInlineEditing?: boolean;
  onUpdate?: (updated: Partial<VisualUpdateCardData>) => void;
}

export const VisualUpdateCard: React.FC<Props> = ({ card, onInspect, isInlineEditing, onUpdate }) => {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-[11px] font-semibold text-[#727272] tracking-wider uppercase">
        <span className="flex items-center gap-1.5">
          <Image className="w-3.5 h-3.5 text-[#0071E3]" />
          Visual Asset Update
        </span>
        {card.altText && card.altText.length > 5 && (
          <span className="flex items-center gap-1 text-[11px] font-normal normal-case text-emerald-700">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            WCAG Alt Text
          </span>
        )}
      </div>

      <h3 className="text-sm font-semibold text-[#1F1F1F]">{card.title}</h3>

      <div className="relative rounded-lg overflow-hidden border border-black/[0.08] bg-neutral-50 max-h-56 flex items-center justify-center">
        <img
          src={card.imageUrl}
          alt={card.altText}
          className="w-full h-auto object-contain max-h-56"
          loading="lazy"
        />
      </div>

      <div className="space-y-1 text-xs">
        <p className="font-medium text-[#1F1F1F]">{card.caption}</p>
        {card.context && (
          <p className="text-[#727272] leading-relaxed">{card.context}</p>
        )}
      </div>
    </div>
  );
};
