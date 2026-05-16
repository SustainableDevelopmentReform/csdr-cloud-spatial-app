'use client'

import { Button } from '@repo/ui/components/ui/button'
import { cn } from '@repo/ui/lib/utils'
import { ArrowLeftIcon, ChevronDownIcon, XIcon } from 'lucide-react'
import {
  createContext,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'

export type ConsoleSideDrawerOpenSource = 'drawer' | 'root'

type ConsoleSideDrawerSnapshot = {
  drawerId: string
  restore: () => void
}

type ConsoleSideDrawerRegistration = {
  close: () => void
  getSnapshot?: () => ConsoleSideDrawerSnapshot | null
}

type ConsoleSideDrawerActions = {
  closeActiveDrawer: () => void
  closeDrawer: (drawerId: string) => void
  goBack: () => void
  pushActiveDrawerSnapshot: () => void
  registerDrawer: (
    drawerId: string,
    registration: ConsoleSideDrawerRegistration,
  ) => () => void
  requestOpen: (
    drawerId: string,
    options?: { source?: ConsoleSideDrawerOpenSource },
  ) => void
}

const ConsoleSideDrawerActionsContext =
  createContext<ConsoleSideDrawerActions | null>(null)

const ConsoleSideDrawerStateContext = createContext<{
  activeDrawerId: string | null
  historyLength: number
}>({
  activeDrawerId: null,
  historyLength: 0,
})

export const getConsoleSideDrawerOpenSource = (
  element: Element | null,
): ConsoleSideDrawerOpenSource =>
  element?.closest('[data-console-side-drawer]') ? 'drawer' : 'root'

export const useConsoleSideDrawerStack = () => {
  const drawerActions = useContext(ConsoleSideDrawerActionsContext)

  return useMemo(
    () => ({
      closeActiveDrawer: () => {
        drawerActions?.closeActiveDrawer()
      },
      pushActiveDrawerSnapshot: () => {
        drawerActions?.pushActiveDrawerSnapshot()
      },
    }),
    [drawerActions],
  )
}

export const ConsoleSideDrawerProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [drawerState, setDrawerState] = useState<{
    activeDrawerId: string | null
    historyLength: number
  }>({
    activeDrawerId: null,
    historyLength: 0,
  })
  const activeDrawerIdRef = useRef<string | null>(null)
  const drawerHistoryRef = useRef<ConsoleSideDrawerSnapshot[]>([])
  const drawerRegistryRef = useRef(
    new Map<string, ConsoleSideDrawerRegistration>(),
  )

  const syncDrawerState = useCallback(() => {
    setDrawerState({
      activeDrawerId: activeDrawerIdRef.current,
      historyLength: drawerHistoryRef.current.length,
    })
  }, [])

  const closeRegisteredDrawers = useCallback((drawerIds: string[]) => {
    const closedDrawerIds = new Set<string>()

    for (const drawerId of drawerIds) {
      if (closedDrawerIds.has(drawerId)) {
        continue
      }

      closedDrawerIds.add(drawerId)
      drawerRegistryRef.current.get(drawerId)?.close()
    }
  }, [])

  const getActiveDrawerSnapshot = useCallback(() => {
    const activeDrawerId = activeDrawerIdRef.current

    if (!activeDrawerId) {
      return null
    }

    return (
      drawerRegistryRef.current.get(activeDrawerId)?.getSnapshot?.() ?? null
    )
  }, [])

  const pushActiveDrawerSnapshot = useCallback(() => {
    const activeDrawerSnapshot = getActiveDrawerSnapshot()

    if (!activeDrawerSnapshot) {
      return
    }

    drawerHistoryRef.current = [
      ...drawerHistoryRef.current,
      activeDrawerSnapshot,
    ]
    syncDrawerState()
  }, [getActiveDrawerSnapshot, syncDrawerState])

  const closeActiveDrawer = useCallback(() => {
    const activeDrawerId = activeDrawerIdRef.current
    const drawerIdsToClose = [
      ...(activeDrawerId ? [activeDrawerId] : []),
      ...drawerHistoryRef.current.map((entry) => entry.drawerId),
    ]

    activeDrawerIdRef.current = null
    drawerHistoryRef.current = []
    syncDrawerState()
    closeRegisteredDrawers(drawerIdsToClose)
  }, [closeRegisteredDrawers, syncDrawerState])

  const closeDrawer = useCallback(
    (drawerId: string) => {
      if (activeDrawerIdRef.current !== drawerId) {
        return
      }

      const drawerIdsToClose = drawerHistoryRef.current.map(
        (entry) => entry.drawerId,
      )

      activeDrawerIdRef.current = null
      drawerHistoryRef.current = []
      syncDrawerState()
      closeRegisteredDrawers(drawerIdsToClose)
    },
    [closeRegisteredDrawers, syncDrawerState],
  )

  const goBack = useCallback(() => {
    const previousDrawer = drawerHistoryRef.current.at(-1)

    if (!previousDrawer) {
      return
    }

    const activeDrawerId = activeDrawerIdRef.current
    drawerHistoryRef.current = drawerHistoryRef.current.slice(0, -1)
    activeDrawerIdRef.current = previousDrawer.drawerId
    syncDrawerState()

    if (activeDrawerId && activeDrawerId !== previousDrawer.drawerId) {
      drawerRegistryRef.current.get(activeDrawerId)?.close()
    }

    previousDrawer.restore()
  }, [syncDrawerState])

  const registerDrawer = useCallback(
    (drawerId: string, registration: ConsoleSideDrawerRegistration) => {
      drawerRegistryRef.current.set(drawerId, registration)

      return () => {
        const registeredDrawer = drawerRegistryRef.current.get(drawerId)

        if (registeredDrawer === registration) {
          drawerRegistryRef.current.delete(drawerId)
        }
      }
    },
    [],
  )

  const requestOpen = useCallback(
    (drawerId: string, options?: { source?: ConsoleSideDrawerOpenSource }) => {
      const activeDrawer = activeDrawerIdRef.current
      const source = options?.source ?? 'root'

      if (source === 'drawer') {
        if (activeDrawer && activeDrawer !== drawerId) {
          const activeDrawerSnapshot = getActiveDrawerSnapshot()

          if (activeDrawerSnapshot) {
            drawerHistoryRef.current = [
              ...drawerHistoryRef.current,
              activeDrawerSnapshot,
            ]
          }
        }

        activeDrawerIdRef.current = drawerId
        syncDrawerState()
        return
      }

      const drawerIdsToClose = [
        ...(activeDrawer && activeDrawer !== drawerId ? [activeDrawer] : []),
        ...drawerHistoryRef.current.map((entry) => entry.drawerId),
      ]

      activeDrawerIdRef.current = drawerId
      drawerHistoryRef.current = []
      syncDrawerState()
      closeRegisteredDrawers(drawerIdsToClose)
    },
    [closeRegisteredDrawers, getActiveDrawerSnapshot, syncDrawerState],
  )

  const actions = useMemo(
    () => ({
      closeActiveDrawer,
      closeDrawer,
      goBack,
      pushActiveDrawerSnapshot,
      registerDrawer,
      requestOpen,
    }),
    [
      closeActiveDrawer,
      closeDrawer,
      goBack,
      pushActiveDrawerSnapshot,
      registerDrawer,
      requestOpen,
    ],
  )

  return (
    <ConsoleSideDrawerActionsContext.Provider value={actions}>
      <ConsoleSideDrawerStateContext.Provider value={drawerState}>
        {children}
      </ConsoleSideDrawerStateContext.Provider>
    </ConsoleSideDrawerActionsContext.Provider>
  )
}

type ConsoleSideDrawerProps = {
  badge?: ReactNode
  children: ReactNode
  closeLabel: string
  description?: ReactNode
  drawerRef?: RefObject<HTMLElement | null>
  footer?: ReactNode
  onBackRestore?: () => void
  onClose: () => void
  open: boolean
  openSource?: ConsoleSideDrawerOpenSource
  tagline: ReactNode
  title: ReactNode
}

export const ConsoleSideDrawer = ({
  badge,
  children,
  closeLabel,
  description,
  drawerRef,
  footer,
  onBackRestore,
  onClose,
  open,
  openSource = 'root',
  tagline,
  title,
}: ConsoleSideDrawerProps) => {
  const drawerId = useId()
  const drawerActions = useContext(ConsoleSideDrawerActionsContext)
  const drawerState = useContext(ConsoleSideDrawerStateContext)
  const openSourceRef = useRef(openSource)

  useEffect(() => {
    openSourceRef.current = openSource
  }, [openSource])

  const handleClose = useCallback(() => {
    if (drawerActions) {
      drawerActions.closeActiveDrawer()
      return
    }

    onClose()
  }, [drawerActions, onClose])

  const handleBack = useCallback(() => {
    drawerActions?.goBack()
  }, [drawerActions])

  const handleClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      const target = event.target

      if (!(target instanceof Element)) {
        return
      }

      if (target.closest('a[href]')) {
        handleClose()
      }
    },
    [handleClose],
  )

  useEffect(() => {
    return drawerActions?.registerDrawer(drawerId, {
      close: onClose,
      getSnapshot: onBackRestore
        ? () => ({
            drawerId,
            restore: onBackRestore,
          })
        : undefined,
    })
  }, [drawerActions, drawerId, onBackRestore, onClose])

  useEffect(() => {
    if (!drawerActions) {
      return
    }

    if (open) {
      drawerActions.requestOpen(drawerId, { source: openSourceRef.current })
      return
    }

    drawerActions.closeDrawer(drawerId)
  }, [drawerActions, drawerId, open])

  const isActiveDrawer = drawerActions
    ? drawerState.activeDrawerId === drawerId
    : open

  if (!open || !isActiveDrawer) {
    return null
  }

  return (
    <aside
      ref={drawerRef}
      data-console-side-drawer="true"
      className="fixed inset-y-0 right-0 z-50 flex w-80 max-w-full flex-col gap-5 overflow-hidden border-l border-border bg-sidebar px-4 py-2 text-foreground shadow-md"
      onClick={handleClick}
      style={{ backgroundColor: 'var(--sidebar)' }}
    >
      <div className="flex justify-between">
        {drawerState.historyLength > 0 ? (
          <Button
            aria-label="Back to previous details"
            className="size-7 opacity-60 hover:opacity-100"
            onClick={handleBack}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
        ) : (
          <div className="size-7" />
        )}
        <Button
          aria-label={closeLabel}
          className="size-7 opacity-60 hover:opacity-100"
          onClick={handleClose}
          size="icon"
          type="button"
          variant="ghost"
        >
          <XIcon className="size-4" />
        </Button>
      </div>

      <div className="space-y-5">
        <p className="text-sm font-medium leading-5 text-muted-foreground">
          {tagline}
        </p>
        <h2 className="break-words text-4xl font-bold leading-10 tracking-normal text-foreground">
          {title}
        </h2>
        {description ? (
          <div className="break-words text-base leading-6 text-muted-foreground">
            {description}
          </div>
        ) : null}
      </div>

      {badge ? <div>{badge}</div> : null}

      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

      {footer ? (
        <div className="shrink-0 space-y-4 border-t border-border py-4">
          {footer}
        </div>
      ) : null}
    </aside>
  )
}

export const ConsoleSideDrawerSection = ({
  children,
  defaultOpen = false,
  title,
}: {
  children: ReactNode
  defaultOpen?: boolean
  title: string
}) => {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="border-b border-border">
      <button
        className="flex w-full items-center justify-between py-4 text-left text-sm font-medium text-foreground"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{title}</span>
        <ChevronDownIcon
          className={cn(
            'size-4 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open ? <div className="pb-4 text-sm leading-5">{children}</div> : null}
    </section>
  )
}
