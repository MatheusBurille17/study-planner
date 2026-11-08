export interface UndoRedoAction<T> {
  type: string
  previousState: T
  newState: T
  timestamp: number
  description: string
}

/**
 * Pilha de undo/redo com limite de 10 ações.
 * Invariante: undo seguido de redo recupera o estado original.
 */
export class UndoRedoStack<T> {
  private undoStack: UndoRedoAction<T>[] = []
  private redoStack: UndoRedoAction<T>[] = []

  constructor(private readonly maxSize = 10) {}

  record(action: Omit<UndoRedoAction<T>, 'timestamp'>): void {
    this.undoStack.push({ ...action, timestamp: Date.now() })
    if (this.undoStack.length > this.maxSize) this.undoStack.shift()
    this.redoStack = []
  }

  undo(): UndoRedoAction<T> | null {
    const action = this.undoStack.pop()
    if (!action) return null
    this.redoStack.push(action)
    return action
  }

  redo(): UndoRedoAction<T> | null {
    const action = this.redoStack.pop()
    if (!action) return null
    this.undoStack.push(action)
    return action
  }

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  getHistory(): UndoRedoAction<T>[] {
    return [...this.undoStack]
  }

  clear(): void {
    this.undoStack = []
    this.redoStack = []
  }
}
