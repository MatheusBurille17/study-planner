import { cn } from '@/shared/utils/classNames'

/*
 * Esqueletos exibidos pelo `loading.tsx` do App Router.
 *
 * Eles aparecem imediatamente ao clicar em uma aba, antes de o servidor
 * responder, evitando a sensação de tela travada. A estrutura imita o layout
 * real para que a troca pelo conteúdo não cause "salto" visual.
 */

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-2xl bg-line/50', className)} />
}

function LoadingLabel() {
  return <span className="sr-only">Carregando…</span>
}

export function ListPageSkeleton({ titleWidth = 'w-44' }: { titleWidth?: string }) {
  return (
    <div className="page-shell" role="status" aria-live="polite" aria-busy="true">
      <LoadingLabel />
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <div className="h-2.5 w-28 animate-pulse rounded bg-line/60" />
          <div className={cn('h-8 animate-pulse rounded bg-line/70', titleWidth)} />
          <div className="h-3 w-72 max-w-full animate-pulse rounded bg-line/50" />
        </div>
        <div className="h-10 w-36 animate-pulse rounded-full bg-line/60" />
      </header>

      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="h-12 animate-pulse rounded-full bg-line/50" />
        <div className="h-12 w-40 animate-pulse rounded-full bg-line/50" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        <div className="hidden space-y-3 lg:block">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-24" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-2xl border border-line bg-surface p-4">
              <div className="h-4 w-2/3 rounded bg-line/70" />
              <div className="mt-3 h-3 w-full rounded bg-line/50" />
              <div className="mt-2 h-3 w-1/3 rounded bg-line/50" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ContentPageSkeleton({ maxWidth = 'max-w-4xl' }: { maxWidth?: string }) {
  return (
    <div className={cn('page-shell', maxWidth)} role="status" aria-live="polite" aria-busy="true">
      <LoadingLabel />
      <header className="mb-5 space-y-2">
        <div className="h-2.5 w-24 animate-pulse rounded bg-line/60" />
        <div className="h-8 w-52 animate-pulse rounded bg-line/70" />
        <div className="h-3 w-80 max-w-full animate-pulse rounded bg-line/50" />
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="animate-pulse rounded-3xl border border-line bg-surface p-5">
            <div className="h-4 w-32 rounded bg-line/70" />
            <div className="mt-3 h-3 w-full rounded bg-line/50" />
            <div className="mt-2 h-3 w-2/3 rounded bg-line/50" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function FormPageSkeleton({ maxWidth = 'max-w-3xl' }: { maxWidth?: string }) {
  return (
    <div className={cn('page-shell', maxWidth)} role="status" aria-live="polite" aria-busy="true">
      <LoadingLabel />
      <div className="mb-5 space-y-2">
        <div className="h-2.5 w-24 animate-pulse rounded bg-line/60" />
        <div className="h-8 w-56 animate-pulse rounded bg-line/70" />
      </div>
      <div className="space-y-4 rounded-3xl border border-line bg-surface p-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="h-3 w-28 animate-pulse rounded bg-line/60" />
            <div className="h-11 animate-pulse rounded-xl bg-line/40" />
          </div>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <div className="h-10 w-24 animate-pulse rounded-full bg-line/50" />
          <div className="h-10 w-32 animate-pulse rounded-full bg-line/60" />
        </div>
      </div>
    </div>
  )
}
