'use client'

import { useEffect, useRef } from 'react'

const UNSAVED_CHANGES_MESSAGE =
  'You have unsaved changes. Are you sure you want to leave this page?'

export const useUnsavedChangesWarning = (isDirty: boolean) => {
  const isDirtyRef = useRef(isDirty)

  useEffect(() => {
    isDirtyRef.current = isDirty
  }, [isDirty])

  // Handle browser-level navigation: tab close, refresh, URL bar navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return
      e.preventDefault()
      e.returnValue = UNSAVED_CHANGES_MESSAGE
      return UNSAVED_CHANGES_MESSAGE
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // Handle in-app link clicks (Next.js client-side navigation)
  // Intercept <a> tag clicks in the capture phase so we run before Next.js
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!isDirtyRef.current) return

      const anchor = (e.target as HTMLElement).closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (!href) return
      if (anchor.target === '_blank') return
      if (anchor.hasAttribute('download')) return

      // Skip modifier key clicks (open in new tab)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

      // Skip same-page hash links
      if (href.startsWith('#')) return

      // Only intercept same-origin navigation
      try {
        const url = new URL(href, window.location.origin)
        if (url.origin !== window.location.origin) return
      } catch {
        return
      }

      const shouldLeave = window.confirm(UNSAVED_CHANGES_MESSAGE)
      if (!shouldLeave) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])
}
