/**
 * Effect History Manager
 * 
 * Manages undo/redo functionality for effect changes.
 * Provides history tracking, state snapshots, and time-travel debugging.
 */

export interface EffectState {
  clipId: string;
  effectId: string;
  effectType: string;
  parameters: Record<string, any>;
  timestamp: number;
}

export interface HistoryEntry {
  id: string;
  action: 'add' | 'update' | 'remove' | 'batch';
  before: EffectState | EffectState[] | null;
  after: EffectState | EffectState[] | null;
  timestamp: number;
  description: string;
}

export class EffectHistoryManager {
  private history: HistoryEntry[] = [];
  private currentIndex = -1;
  private maxHistorySize = 100;
  private listeners: Set<(entry: HistoryEntry, action: 'undo' | 'redo') => void> = new Set();

  /**
   * Record a new history entry
   */
  record(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): void {
    // Remove any entries after current index (when recording after undo)
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // Create new entry
    const newEntry: HistoryEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    // Add to history
    this.history.push(newEntry);
    this.currentIndex++;

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.currentIndex--;
    }
  }

  /**
   * Record effect addition
   */
  recordAdd(clipId: string, effectId: string, effectType: string, parameters: Record<string, any>): void {
    const state: EffectState = {
      clipId,
      effectId,
      effectType,
      parameters,
      timestamp: Date.now(),
    };

    this.record({
      action: 'add',
      before: null,
      after: state,
      description: `Added ${effectType} effect`,
    });
  }

  /**
   * Record effect update
   */
  recordUpdate(
    clipId: string,
    effectId: string,
    effectType: string,
    beforeParams: Record<string, any>,
    afterParams: Record<string, any>
  ): void {
    const before: EffectState = {
      clipId,
      effectId,
      effectType,
      parameters: beforeParams,
      timestamp: Date.now(),
    };

    const after: EffectState = {
      clipId,
      effectId,
      effectType,
      parameters: afterParams,
      timestamp: Date.now(),
    };

    this.record({
      action: 'update',
      before,
      after,
      description: `Updated ${effectType} effect`,
    });
  }

  /**
   * Record effect removal
   */
  recordRemove(clipId: string, effectId: string, effectType: string, parameters: Record<string, any>): void {
    const state: EffectState = {
      clipId,
      effectId,
      effectType,
      parameters,
      timestamp: Date.now(),
    };

    this.record({
      action: 'remove',
      before: state,
      after: null,
      description: `Removed ${effectType} effect`,
    });
  }

  /**
   * Record batch operation
   */
  recordBatch(before: EffectState[], after: EffectState[], description: string): void {
    this.record({
      action: 'batch',
      before,
      after,
      description,
    });
  }

  /**
   * Undo last action
   */
  undo(): HistoryEntry | null {
    if (!this.canUndo()) {
      return null;
    }

    const entry = this.history[this.currentIndex];
    this.currentIndex--;

    // Notify listeners
    this.notifyListeners(entry, 'undo');

    return entry;
  }

  /**
   * Redo last undone action
   */
  redo(): HistoryEntry | null {
    if (!this.canRedo()) {
      return null;
    }

    this.currentIndex++;
    const entry = this.history[this.currentIndex];

    // Notify listeners
    this.notifyListeners(entry, 'redo');

    return entry;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Get current history state
   */
  getHistory(): HistoryEntry[] {
    return [...this.history];
  }

  /**
   * Get current index
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * Clear history
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }

  /**
   * Jump to specific history entry
   */
  jumpTo(index: number): HistoryEntry | null {
    if (index < 0 || index >= this.history.length) {
      return null;
    }

    const entry = this.history[index];
    this.currentIndex = index;

    return entry;
  }

  /**
   * Get history summary
   */
  getSummary(): {
    total: number;
    current: number;
    canUndo: boolean;
    canRedo: boolean;
    lastAction: string | null;
  } {
    return {
      total: this.history.length,
      current: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      lastAction: this.currentIndex >= 0 ? this.history[this.currentIndex].description : null,
    };
  }

  /**
   * Subscribe to history changes
   */
  subscribe(listener: (entry: HistoryEntry, action: 'undo' | 'redo') => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify listeners
   */
  private notifyListeners(entry: HistoryEntry, action: 'undo' | 'redo'): void {
    this.listeners.forEach(listener => listener(entry, action));
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export history to JSON
   */
  exportHistory(): string {
    return JSON.stringify({
      history: this.history,
      currentIndex: this.currentIndex,
      timestamp: Date.now(),
    }, null, 2);
  }

  /**
   * Import history from JSON
   */
  importHistory(json: string): boolean {
    try {
      const data = JSON.parse(json);
      this.history = data.history;
      this.currentIndex = data.currentIndex;
      return true;
    } catch (error) {
      console.error('Failed to import history:', error);
      return false;
    }
  }
}

/**
 * Singleton instance
 */
let historyManagerInstance: EffectHistoryManager | null = null;

/**
 * Get effect history manager instance
 */
export function getEffectHistoryManager(): EffectHistoryManager {
  if (!historyManagerInstance) {
    historyManagerInstance = new EffectHistoryManager();
  }
  return historyManagerInstance;
}