/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MetricInput } from '../../types/report';
import { Plus, Trash2, HelpCircle } from 'lucide-react';

interface Props {
  metrics: MetricInput[];
  onChange: (metrics: MetricInput[]) => void;
}

export const MetricsEditor: React.FC<Props> = ({ metrics, onChange }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState<string>('');
  const [newUnit, setNewUnit] = useState('');
  const [newTarget, setNewTarget] = useState<string>('');
  const [newPrev, setNewPrev] = useState<string>('');
  const [newExplanation, setNewExplanation] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setValidationError('Metric name is required');
      return;
    }
    const valNum = parseFloat(newValue);
    if (isNaN(valNum)) {
      setValidationError('Value must be a valid number');
      return;
    }

    const targetNum = newTarget.trim() ? parseFloat(newTarget) : undefined;
    const prevNum = newPrev.trim() ? parseFloat(newPrev) : undefined;

    const newMetric: MetricInput = {
      id: `metric-${Date.now()}`,
      name: newName.trim(),
      value: valNum,
      unit: newUnit.trim(),
      target: isNaN(targetNum as number) ? undefined : targetNum,
      previousValue: isNaN(prevNum as number) ? undefined : prevNum,
      explanation: newExplanation.trim() || undefined,
    };

    onChange([...metrics, newMetric]);
    setNewName('');
    setNewValue('');
    setNewUnit('');
    setNewTarget('');
    setNewPrev('');
    setNewExplanation('');
    setValidationError(null);
    setShowAddForm(false);
  };

  const handleUpdate = (id: string, updates: Partial<MetricInput>) => {
    onChange(metrics.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const handleDelete = (id: string) => {
    onChange(metrics.filter(m => m.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-[#727272]">
          {metrics.length} metric{metrics.length !== 1 ? 's' : ''} configured
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 text-xs font-semibold text-[#0071E3] hover:text-[#0071E3]/80 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {showAddForm ? 'Cancel' : 'Add Metric'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} className="p-3 bg-white rounded-lg border border-black/[0.08] space-y-3">
          <div className="text-xs font-semibold text-[#1F1F1F]">New Quantitative Metric</div>
          
          {validationError && (
            <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded">
              {validationError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-[#727272] block mb-1">Name *</label>
              <input
                type="text"
                placeholder="e.g. Sprint completion"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full text-xs p-1.5 border border-black/15 rounded focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[#727272] block mb-1">Unit</label>
              <input
                type="text"
                placeholder="e.g. %, ms, pts"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                className="w-full text-xs p-1.5 border border-black/15 rounded focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] font-medium text-[#727272] block mb-1">Current Value *</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 85"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full text-xs p-1.5 border border-black/15 rounded focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[#727272] block mb-1">Target</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 100"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                className="w-full text-xs p-1.5 border border-black/15 rounded focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[#727272] block mb-1">Previous</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 70"
                value={newPrev}
                onChange={(e) => setNewPrev(e.target.value)}
                className="w-full text-xs p-1.5 border border-black/15 rounded focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-[#727272] block mb-1">Context Note</label>
            <input
              type="text"
              placeholder="e.g. On track against sprint commitment"
              value={newExplanation}
              onChange={(e) => setNewExplanation(e.target.value)}
              className="w-full text-xs p-1.5 border border-black/15 rounded focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-1.5 bg-[#0071E3] text-white text-xs font-semibold rounded hover:bg-[#0071E3]/90 transition-colors"
          >
            Save Metric
          </button>
        </form>
      )}

      {/* Metrics List */}
      <div className="space-y-2">
        {metrics.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#727272] bg-black/[0.02] rounded-lg">
            No metrics defined. Add your key quantitative metrics above.
          </div>
        ) : (
          metrics.map((m) => (
            <div
              key={m.id}
              className="p-2.5 bg-white rounded-lg border border-black/[0.06] hover:border-black/[0.12] transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={m.name}
                  onChange={(e) => handleUpdate(m.id, { name: e.target.value })}
                  className="font-medium text-xs text-[#1F1F1F] bg-transparent border-b border-transparent hover:border-black/20 focus:border-[#0071E3] focus:outline-none py-0.5 w-3/5"
                  title="Metric name"
                />
                <div className="flex items-center gap-1.5">
                  <div className="text-xs font-semibold text-[#1F1F1F]">
                    {m.value}{m.unit}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(m.id)}
                    className="p-1 text-[#727272] hover:text-rose-600 rounded transition-colors"
                    aria-label={`Delete metric ${m.name}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {(m.target !== undefined || m.explanation) && (
                <div className="mt-1 text-[11px] text-[#727272] flex items-center justify-between">
                  <span>
                    {m.target !== undefined && `Target: ${m.target}${m.unit}`}
                  </span>
                  {m.explanation && (
                    <span className="truncate max-w-[160px]" title={m.explanation}>
                      {m.explanation}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
