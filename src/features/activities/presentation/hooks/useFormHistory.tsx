'use client'

import { useEffect, useRef, useState } from 'react'
import { Redo2, Undo2 } from 'lucide-react'
import { UndoRedoStack } from '../../domain/undoRedoStack'
import { Button } from '@/shared/components/ui/button'

/**
 * Histórico de alterações do formulário com limite de 10 ações.
 * Atalhos: Ctrl+Z (desfazer) e Ctrl+Y / Ctrl+Shift+Z (refazer).
 */
export function useFormHistory<T>(state: T, setState: (value: T) => void) {
  const stack = useRef(new UndoRedoStack<T>(10))
  const [, forceRender] = useState(0)
  const stateRef = useRef(state)
  stateRef.current = state

  function update(next: T) {
    if (JSON.stringify(next) === JSON.stringify(stateRef.current)) return
    stack.current.record({
      type: 'edit',
      previousState: stateRef.current,
      newState: next,
      description: 'Editar campos',
    })
    setState(next)
    forceRender((value) => value + 1)
  }

  function undo() {
    const action = stack.current.undo()
    if (action) {
      setState(action.previousState)
      forceRender((value) => value + 1)
    }
  }

  function redo() {
    const action = stack.current.redo()
    if (action) {
      setState(action.newState)
      forceRender((value) => value + 1)
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
      if (!isTyping && !(event.ctrlKey || event.metaKey)) return
      if (!(event.ctrlKey || event.metaKey)) return
      if (event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      } else if (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey)) {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  return {
    update,
    undo,
    redo,
    canUndo: stack.current.canUndo(),
    canRedo: stack.current.canRedo(),
  }
}

export function UndoRedoControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="Desfazer alteração"
        title="Desfazer (Ctrl+Z)"
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRedo}
        disabled={!canRedo}
        aria-label="Refazer alteração"
        title="Refazer (Ctrl+Y)"
      >
        <Redo2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
