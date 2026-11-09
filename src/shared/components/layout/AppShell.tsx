'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckSquare,
  FileText,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  Sparkles,
} from 'lucide-react'
import type { User } from '@/shared/types/user'
import { initialsFromEmail, firstNameFromEmail } from '@/shared/utils/formatting'
import { cn } from '@/shared/utils/classNames'
import { ActivityTypeSelector } from '@/features/activities/presentation/components/ActivityTypeSelector'
import { logoutAction } from '@/features/auth/presentation/actions/logoutAction'
import { NotificationPermissionPrompt } from '@/features/notifications/presentation/components/NotificationPermissionPrompt'
import { OfflineIndicator } from '@/shared/components/layout/OfflineIndicator'
import { InstallPrompt } from '@/shared/components/common/InstallPrompt'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/activities', label: 'Tarefas', icon: CheckSquare },
  { href: '/assessments', label: 'Provas & Trabalhos', shortLabel: 'Provas', icon: FileText },
  { href: '/calendar', label: 'Calendário', shortLabel: 'Agenda', icon: CalendarDays },
  { href: '/subjects', label: 'Disciplinas', icon: BookOpen },
]

const MOBILE_ITEMS = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/activities', label: 'Tarefas', icon: CheckSquare },
  { href: '/calendar', label: 'Agenda', icon: CalendarDays },
  { href: '/assessments', label: 'Provas', icon: FileText },
]

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  return (
    <div className="min-h-screen">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line/80 bg-[#fbf8f4]/95 px-5 py-6 backdrop-blur lg:flex">
        <Link href="/dashboard" className="flex items-center gap-3 px-1">
          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl shadow-soft ring-1 ring-line">
            <img src="/brand/logo.png" alt="" className="h-full w-full object-cover" />
          </span>
          <span>
            <span className="block font-serif text-lg leading-none text-ink">Study Planner</span>
            <span className="mt-1 block text-[10px] uppercase tracking-[0.22em] text-muted">por Amanda</span>
          </span>
        </Link>

        <nav className="mt-8 space-y-1" aria-label="Navegação principal">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                  active
                    ? 'bg-primary-50 font-semibold text-primary-800'
                    : 'text-muted hover:bg-primary-50/60 hover:text-ink',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className={cn('h-4.5 w-4.5', active ? 'text-primary' : 'text-muted')} />
                {label}
              </Link>
            )
          })}
        </nav>

        <button
          type="button"
          onClick={() => setSelectorOpen(true)}
          className="mt-6 flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-soft transition-colors hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" /> Nova atividade
        </button>

        <div className="mt-auto space-y-2">
          <Link
            href="/settings"
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors',
              isActive(pathname, '/settings')
                ? 'bg-primary-50 font-semibold text-primary-800'
                : 'text-muted hover:bg-primary-50/60 hover:text-ink',
            )}
          >
            <Settings className="h-4 w-4" /> Configurações
          </Link>
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-800">
              {initialsFromEmail(user.email)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-ink">{user.name ?? firstNameFromEmail(user.email)}</p>
              <p className="truncate text-[10px] text-muted">{user.email}</p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Sair"
                className="rounded-full p-1.5 text-muted hover:bg-rose/20 hover:text-[#8a3d52]"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Header mobile */}
      <header className="sticky top-0 z-30 border-b border-line/60 bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl ring-1 ring-line">
              <img src="/brand/logo.png" alt="" className="h-full w-full object-cover" />
            </span>
            <span>
              <span className="block text-[10px] uppercase tracking-[0.2em] text-muted">Bem-vinda</span>
              <span className="block font-serif text-base leading-tight text-ink">
                {user.name ?? firstNameFromEmail(user.email)}
              </span>
            </span>
          </Link>

          <div className="relative flex items-center gap-1">
            <Link
              href="/settings/notifications"
              aria-label="Notificações"
              className="rounded-full p-2 text-muted hover:bg-primary-50 hover:text-primary"
            >
              <Bell className="h-4.5 w-4.5" />
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-800"
              aria-label="Abrir menu do perfil"
              aria-expanded={menuOpen}
            >
              {initialsFromEmail(user.email)}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-11 w-52 animate-fade-in rounded-2xl border border-line bg-surface p-2 shadow-soft">
                <div className="px-3 py-2">
                  <p className="truncate text-xs font-semibold text-ink">{user.name ?? firstNameFromEmail(user.email)}</p>
                  <p className="truncate text-[10px] text-muted">{user.email}</p>
                </div>
                <Link href="/profile" className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-ink hover:bg-primary-50">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Meu perfil
                </Link>
                <Link href="/subjects" className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-ink hover:bg-primary-50">
                  <BookOpen className="h-3.5 w-3.5 text-primary" /> Disciplinas
                </Link>
                <Link href="/settings" className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-ink hover:bg-primary-50">
                  <Settings className="h-3.5 w-3.5 text-primary" /> Configurações
                </Link>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-[#8a3d52] hover:bg-rose/20"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sair
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6 lg:px-8 lg:pt-6">
          <OfflineIndicator />
          <NotificationPermissionPrompt />
        </div>
        {children}
      </main>

      {/* Bottom nav mobile */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-background/95 px-2 pt-1.5 backdrop-blur safe-bottom lg:hidden"
        aria-label="Navegação principal"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 items-end">
          {MOBILE_ITEMS.slice(0, 2).map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px]',
                isActive(pathname, href) ? 'font-semibold text-primary' : 'text-muted',
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setSelectorOpen(true)}
              aria-label="Nova atividade"
              className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-soft ring-4 ring-background transition-transform active:scale-95"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>

          {MOBILE_ITEMS.slice(2).map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px]',
                isActive(pathname, href) ? 'font-semibold text-primary' : 'text-muted',
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <ActivityTypeSelector
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        onSelectType={(type) => {
          setSelectorOpen(false)
          router.push(`/activities/new?type=${type}`)
        }}
      />

      <InstallPrompt />
    </div>
  )
}
