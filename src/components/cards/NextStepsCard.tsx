/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EditableText } from '../common/EditableText';
import { NextStepsCardData } from '../../types/report';
import { ListTodo, Check, Circle, User, Calendar, Plus, X } from 'lucide-react';

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
                {isInlineEditing ? (
                  <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={item.action}
                      onChange={(e) => {
                        const updated = [...card.items];
                        updated[idx] = { ...item, action: e.target.value };
                        onUpdate?.({ items: updated });
                      }}
                      placeholder="Action item"
                      aria-label="Action item"
                      className="w-full text-xs p-1.5 bg-neutral-50 border border-black/[0.1] rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0071E3] text-[#1F1F1F]"
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={item.owner || ''}
                        onChange={(e) => {
                          const updated = [...card.items];
                          updated[idx] = { ...item, owner: e.target.value.trim() || undefined };
                          onUpdate?.({ items: updated });
                        }}
                        placeholder="Owner"
                        aria-label="Owner"
                        className="w-full text-xs p-1.5 bg-neutral-50 border border-black/[0.1] rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0071E3] text-[#1F1F1F]"
                      />
                      <input
                        type="text"
                        value={item.dueDate || ''}
                        onChange={(e) => {
                          const updated = [...card.items];
                          updated[idx] = { ...item, dueDate: e.target.value.trim() || undefined };
                          onUpdate?.({ items: updated });
                        }}
                        placeholder="Due date"
                        aria-label="Due date"
                        className="w-full text-xs p-1.5 bg-neutral-50 border border-black/[0.1] rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0071E3] text-[#1F1F1F]"
                      />
                    </div>
                  </div>
                ) : (
                <>
                <div className={`text-xs font-medium leading-snug ${isDone ? 'line-through text-[#727272]' : 'text-[#1F1F1F]'}`}>
                  <EditableText value={item.action} label="action" multiline onCommit={(action) => onUpdate?.({ items: card.items.map((it) => it.id === item.id ? { ...it, action } : it) })} />
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-[#727272]">
                  {item.owner ? (
                    <span className="flex items-center gap-1 text-[#1F1F1F] font-medium">
                      <User className="w-3 h-3 text-[#727272]" />
                      <EditableText
                        value={item.owner}
                        label="step owner"
                        allowEmpty
                        onCommit={(owner) => onUpdate?.({ items: card.items.map((it) => it.id === item.id ? { ...it, owner: owner.trim() || undefined } : it) })}
                      />
                    </span>
                  ) : (
                    <EditableText
                      value=""
                      placeholder="Add owner"
                      label="step owner"
                      allowEmpty
                      onCommit={(owner) => onUpdate?.({ items: card.items.map((it) => it.id === item.id ? { ...it, owner: owner.trim() || undefined } : it) })}
                      className="text-[#6E6E73]"
                    />
                  )}
                  {item.dueDate && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#727272]" />
                        <EditableText
                          value={item.dueDate}
                          label="step due date"
                          allowEmpty
                          onCommit={(dueDate) => onUpdate?.({ items: card.items.map((it) => it.id === item.id ? { ...it, dueDate: dueDate.trim() || undefined } : it) })}
                        />
                      </span>
                    </>
                  )}
                </div>
                </>
                )}
              </div>

              {isInlineEditing && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate?.({ items: card.items.filter((it) => it.id !== item.id) });
                  }}
                  className="p-1 text-[#86868B] hover:text-rose-600 rounded shrink-0"
                  aria-label={`Remove "${item.action}"`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
        {isInlineEditing && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUpdate?.({
                items: [
                  ...card.items,
                  { id: `step-${Date.now()}`, action: '', status: 'planned' as const },
                ],
              });
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#0071E3] hover:bg-[#0071E3]/10 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add step</span>
          </button>
        )}
      </div>
    </div>
  );
};
