'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/shared/utils/classNames'

interface SearchBarProps {
  value?: string
  onSearch: (term: string) => void
  placeholder?: string
  resultCount?: number
  totalCount?: number
  className?: string
}

/** Busca com debounce de 300ms; Enter executa imediatamente. */
export function SearchBar({
  value = '',
  onSearch,
  placeholder = 'Buscar por título, descrição…',
  resultCount,
  totalCount,
  className,
}: SearchBarProps) {
  const [term, setTerm] = useState(value)
  const timer = useRef<number | null>(null)
  const lastSubmitted = useRef(value)

  useEffect(() => {
    setTerm(value)
    lastSubmitted.current = value
  }, [value])

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  function schedule(next: string) {
    setTerm(next)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      if (lastSubmitted.current !== next) {
        lastSubmitted.current = next
        onSearch(next)
      }
    }, 300)
  }

  function submitImmediately() {
    if (timer.current) window.clearTimeout(timer.current)
    if (lastSubmitted.current !== term) {
      lastSubmitted.current = term
      onSearch(term)
    }
  }

  function clear() {
    setTerm('')
    if (timer.current) window.clearTimeout(timer.current)
    lastSubmitted.current = ''
    onSearch('')
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={term}
          onChange={(event) => schedule(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              submitImmediately()
            }
          }}
          placeholder={placeholder}
          aria-label="Buscar atividades"
          className="h-12 w-full rounded-full border border-line bg-surface pl-11 pr-11 text-sm text-ink shadow-sm placeholder:text-muted/70 focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        />
        {term && (
          <button
            type="button"
            onClick={clear}
            aria-label="Limpar busca"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted hover:bg-line/60 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {resultCount !== undefined && (
        <p className="px-1 text-[11px] text-muted" aria-live="polite">
          {resultCount} {resultCount === 1 ? 'resultado' : 'resultados'}
          {totalCount !== undefined && resultCount !== totalCount ? ` de ${totalCount}` : ''} encontrados
        </p>
      )}
    </div>
  )
}
