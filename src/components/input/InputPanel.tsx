/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MetricInput, ImageAssetInput } from '../../types/report';
import { MetricsEditor } from './MetricsEditor';
import { ImageUploader } from './ImageUploader';
import { 
  FileText, 
  BarChart2, 
  Image as ImageIcon, 
  Wand2, 
  Trash2, 
  Eye, 
  Link2 
} from 'lucide-react';
import { SAMPLE_SOURCE_TEXT, SAMPLE_MESSY_SOURCE_TEXT } from '../../lib/sampleData';

interface Props {
  rawNotes: string;
  metrics: MetricInput[];
  images: ImageAssetInput[];
  onNotesChange: (notes: string) => void;
  onMetricsChange: (metrics: MetricInput[]) => void;
  onImagesChange: (images: ImageAssetInput[]) => void;
  onGenerateReport: () => void;
  highlightPassage?: { start?: number; end?: number; text?: string } | null;
}

export const InputPanel: React.FC<Props> = ({
  rawNotes,
  metrics,
  images,
  onNotesChange,
  onMetricsChange,
  onImagesChange,
  onGenerateReport,
  highlightPassage,
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'metrics' | 'images'>('text');
  const [textMode, setTextMode] = useState<'edit' | 'preview'>('edit');

  const renderHighlightedText = () => {
    if (!highlightPassage?.text || !rawNotes) {
      return (
        <p className="text-xs text-[#86868B] leading-relaxed whitespace-pre-wrap">
          {rawNotes || 'No notes provided yet.'}
        </p>
      );
    }

    const passage = highlightPassage.text.trim();
    const index = rawNotes.indexOf(passage);
    if (index === -1) {
      return (
        <p className="text-xs text-[#1D1D1F] leading-relaxed whitespace-pre-wrap">
          {rawNotes}
        </p>
      );
    }

    const before = rawNotes.slice(0, index);
    const match = rawNotes.slice(index, index + passage.length);
    const after = rawNotes.slice(index + passage.length);

    return (
      <div className="text-xs text-[#1D1D1F] leading-relaxed whitespace-pre-wrap select-text">
        <span>{before}</span>
        <mark className="bg-[#0071E3]/15 text-[#0071E3] font-medium border-b border-[#0071E3] px-0.5 rounded-xs transition-all">
          {match}
        </mark>
        <span>{after}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] border-r border-black/[0.06]">
      {/* Top Header & Segmented Tab */}
      <div className="p-3.5 border-b border-black/[0.06] bg-white space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-[#1D1D1F] tracking-tight">
            Sources
          </h2>
          <span className="text-[11px] text-[#86868B]">
            Truth-Preserving
          </span>
        </div>

        {/* Apple Segmented Control */}
        <div className="flex items-center p-0.5 bg-black/[0.04] rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-1 rounded-md transition-all ${
              activeTab === 'text'
                ? 'bg-white text-[#1D1D1F] shadow-xs font-semibold'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Notes
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('metrics')}
            className={`flex-1 py-1 rounded-md transition-all ${
              activeTab === 'metrics'
                ? 'bg-white text-[#1D1D1F] shadow-xs font-semibold'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Metrics ({metrics.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('images')}
            className={`flex-1 py-1 rounded-md transition-all ${
              activeTab === 'images'
                ? 'bg-white text-[#1D1D1F] shadow-xs font-semibold'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Images ({images.length})
          </button>
        </div>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-3.5">
        {activeTab === 'text' && (
          <div className="flex flex-col h-full space-y-3">
            {/* Quick Actions Bar */}
            <div className="flex items-center justify-between text-xs text-[#86868B]">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px]">Preset:</span>
                <button
                  type="button"
                  onClick={() => onNotesChange(SAMPLE_SOURCE_TEXT)}
                  className="text-[11px] font-medium text-[#0071E3] hover:underline"
                >
                  Standard
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => onNotesChange(SAMPLE_MESSY_SOURCE_TEXT)}
                  className="text-[11px] font-medium text-[#0071E3] hover:underline"
                >
                  Messy
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTextMode(textMode === 'edit' ? 'preview' : 'edit')}
                  className="text-[11px] text-[#86868B] hover:text-[#1D1D1F] flex items-center gap-1"
                  title="Toggle highlight preview"
                >
                  <Eye className="w-3 h-3" />
                  <span>{textMode === 'edit' ? 'Trace' : 'Edit'}</span>
                </button>
                {rawNotes && (
                  <button
                    type="button"
                    onClick={() => onNotesChange('')}
                    className="p-1 text-[#86868B] hover:text-rose-600 rounded transition-colors"
                    title="Clear text"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Main Text Editor */}
            <div className="flex-1 min-h-[260px] relative">
              {textMode === 'edit' ? (
                <textarea
                  value={rawNotes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  placeholder="Paste standup notes, sprint achievements, blockers, or upcoming actions..."
                  className="w-full h-full min-h-[260px] text-xs leading-relaxed p-3 bg-white border border-black/[0.06] rounded-xl focus:border-[#0071E3] focus:outline-none focus:ring-1 focus:ring-[#0071E3]/20 resize-none font-sans transition-all text-[#1D1D1F] placeholder:text-black/30"
                />
              ) : (
                <div className="w-full h-full min-h-[260px] p-3 bg-white border border-black/[0.06] rounded-xl overflow-y-auto">
                  {renderHighlightedText()}
                </div>
              )}
            </div>

            {/* Grounded Source Passage Indicator (Minimalist) */}
            {highlightPassage?.text && (
              <div className="p-3 bg-white rounded-xl border border-[#0071E3]/20 text-xs space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase text-[#0071E3]">
                  <Link2 className="w-3 h-3" />
                  <span>Referenced in selected card</span>
                </div>
                <p className="text-xs text-[#1D1D1F] italic leading-relaxed">
                  "{highlightPassage.text}"
                </p>
              </div>
            )}

            <div className="text-[11px] text-[#86868B] flex items-center justify-between pt-1">
              <span>{rawNotes.length} characters</span>
              <span>Press ⌘⏎ to generate</span>
            </div>
          </div>
        )}

        {activeTab === 'metrics' && (
          <MetricsEditor metrics={metrics} onChange={onMetricsChange} />
        )}

        {activeTab === 'images' && (
          <ImageUploader images={images} onChange={onImagesChange} />
        )}
      </div>

      {/* Primary Action Button */}
      <div className="p-3.5 bg-white border-t border-black/[0.06] space-y-1.5">
        <button
          type="button"
          onClick={onGenerateReport}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-4 bg-[#0071E3] hover:bg-[#0077ED] text-white font-medium text-xs rounded-xl shadow-[0_1px_2px_rgba(0,113,227,0.3)] transition-all active:scale-[0.98]"
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>Generate Report</span>
        </button>
        <p className="text-[10px] text-center text-[#86868B]">
          Deterministic facts · No AI hallucinations
        </p>
      </div>
    </div>
  );
};
