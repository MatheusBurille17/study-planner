'use client'

import { useCallback, useEffect, useState } from 'react'

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermissionState>('default')

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported')
      return
    }
    setPermission(Notification.permission as NotificationPermissionState)

    let status: PermissionStatus | null = null
    if ('permissions' in navigator) {
      navigator.permissions
        .query({ name: 'notifications' as PermissionName })
        .then((result) => {
          status = result
          status.onchange = () => setPermission(Notification.permission as NotificationPermissionState)
        })
        .catch(() => undefined)
    }
    return () => {
      if (status) status.onchange = null
    }
  }, [])

  const requestPermission = useCallback(async (): Promise<NotificationPermissionState> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
    const result = await Notification.requestPermission()
    setPermission(result as NotificationPermissionState)
    return result as NotificationPermissionState
  }, [])

  return { permission, requestPermission, isSupported: permission !== 'unsupported' }
}
