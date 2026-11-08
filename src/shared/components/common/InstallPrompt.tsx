'use client'

import { useEffect, useState } from 'react'
import { Download, Smartphone, X } from 'lucide-react'
import { Dialog } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { IOSInstallGuide } from '@/shared/components/common/IOSInstallGuide'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const STORAGE_KEY = 'installPromptDismissed'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    if (standalone) {
      setInstalled(true)
      return
    }
    if (window.localStorage.getItem(STORAGE_KEY) === 'true') return

    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
    setIsIOS(ios)
    if (ios) setVisible(true)

    function onBeforeInstall(event: Event) {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      setVisible(true)
    }
    function onInstalled() {
      setInstalled(true)
      setVisible(false)
      window.localStorage.setItem(STORAGE_KEY, 'true')
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  function dismiss() {
    setVisible(false)
    window.localStorage.setItem(STORAGE_KEY, 'true')
  }

  async function install() {
    if (!deferredPrompt) {
      setGuideOpen(true)
      return
    }
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') {
      setInstalled(true)
      setVisible(false)
    } else {
      dismiss()
    }
    setDeferredPrompt(null)
  }

  if (!visible || installed) return null

  return (
    <>
      <div className="fixed inset-x-3 bottom-24 z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-soft backdrop-blur sm:right-6 sm:left-auto sm:bottom-6 lg:bottom-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-[#9a6bf0] text-white">
          {isIOS ? <Smartphone className="h-5 w-5" /> : <Download className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-ink">Instale o Study Planner</p>
          <p className="text-[10px] text-muted">Acesso rápido na tela inicial, mesmo offline.</p>
        </div>
        <Button size="sm" onClick={() => void install()}>
          {isIOS ? 'Como instalar' : 'Instalar'}
        </Button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Agora não"
          className="rounded-full p-1.5 text-muted hover:bg-line/60 hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <Dialog open={guideOpen} onOpenChange={setGuideOpen} title="Instalar no iOS" description="Adicione à Tela de Início em poucos passos.">
        <IOSInstallGuide />
      </Dialog>
    </>
  )
}
