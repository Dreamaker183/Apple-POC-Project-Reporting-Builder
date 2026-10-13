/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { NextStepsCardData } from '../../types/report';
import { ListTodo, Check, Circle, User, Calendar } from 'lucide-react';

interface Props {
  card: NextStepsCardData;
  onInspect?: () => void;
  isInlineEditing?: boolean;
  onUpdate?: (updated: Partial<NextStepsCardData>) => void;
}

export const NextStepsCard: React.FC<Props> = ({ card, onInspect, isInlineEditing, onUpdate }) => {
  const toggleItemStatus = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdate) return;
    const newItems = card.items.map(item => {
      if (item.id === itemId) {
        const nextStatus: 'planned' | 'in_progress' | 'completed' = 
          item.status === 'completed' ? 'planned' : 'completed';
        return { ...item, status: nextStatus };
      }
      return item;
    });
    onUpdate({ items: newItems });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[11px] font-semibold text-[#727272] tracking-wider uppercase">
        <span className="flex items-center gap-1.5">
          <ListTodo className="w-3.5 h-3.5 text-[#0071E3]" />
          Next Steps & Commitments
        </span>
        {card.sourceRef && (
          <span className="text-[11px] font-normal normal-case text-[#727272]">
            Source verified
          </span>
        )}
      </div>

      <div className="space-y-2">
        {card.items.map((item, idx) => {
          const isDone = item.status === 'completed';
          return (
            <div
              key={item.id}
              className="flex items-start gap-2.5 p-2 rounded-md hover:bg-black/[0.02] transition-colors"
            >
              <button
                type="button"
                onClick={(e) => toggleItemStatus(item.id, e)}
                className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                  isDone
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'border-black/20 hover:border-black/40 bg-white'
                }`}
                aria-label={`Mark "${item.action}" as ${isDone ? 'incomplete' : 'complete'}`}
              >
                {isDone && <Check className="w-3 h-3 stroke-[3]" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className={`text-xs font-medium leading-snug ${isDone ? 'line-through text-[#727272]' : 'text-[#1F1F1F]'}`}>
                  {item.action}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-[#727272]">
                  {item.owner ? (
                    <span className="flex items-center gap-1 text-[#1F1F1F] font-medium">
                      <User className="w-3 h-3 text-[#727272]" />
                      @{item.owner}
                    </span>
                  ) : (
                    <span className="text-amber-700 font-medium">Unassigned</span>
                  )}
                  {item.dueDate && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#727272]" />
                        {item.dueDate}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
