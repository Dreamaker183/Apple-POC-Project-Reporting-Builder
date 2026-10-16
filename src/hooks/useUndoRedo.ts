/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';

const MAX_HISTORY = 20;

/**
 * Generic undo/redo history stack.
 *
 * @typeParam T - The state snapshot type (e.g. `ReportProject`).
 */
export function useUndoRedo<T>() {
  const [historyStack, setHistoryStack] = useState<T[]>([]);
  const [redoStack, setRedoStack] = useState<T[]>([]);

  /** Push the current state onto the undo stack before a destructive operation. */
  const recordHistory = useCallback((currentState: T) => {
    setHistoryStack((prev) => [...prev.slice(-(MAX_HISTORY - 1)), structuredClone(currentState)]);
    setRedoStack([]);
  }, []);

  /** Pop the most recent snapshot from the undo stack. Returns `null` if empty. */
  const undo = useCallback((currentState: T): T | null => {
    if (historyStack.length === 0) return null;
    const previous = historyStack[historyStack.length - 1];
    setRedoStack((prev) => [...prev, currentState]);
    setHistoryStack((prev) => prev.slice(0, -1));
    return previous;
  }, [historyStack]);

  /** Pop the most recent snapshot from the redo stack. Returns `null` if empty. */
  const redo = useCallback((currentState: T): T | null => {
    if (redoStack.length === 0) return null;
    const next = redoStack[redoStack.length - 1];
    setHistoryStack((prev) => [...prev, currentState]);
    setRedoStack((prev) => prev.slice(0, -1));
    return next;
  }, [redoStack]);

  /** Clear both stacks (e.g. when switching projects). */
  const clearHistory = useCallback(() => {
    setHistoryStack([]);
    setRedoStack([]);
  }, []);

  return {
    canUndo: historyStack.length > 0,
    canRedo: redoStack.length > 0,
    recordHistory,
    undo,
    redo,
    clearHistory,
  } as const;
}
