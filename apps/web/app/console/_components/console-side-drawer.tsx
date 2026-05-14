'use client'

import { Button } from '@repo/ui/components/ui/button'
import { cn } from '@repo/ui/lib/utils'
import { ChevronDownIcon, XIcon } from 'lucide-react'
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

type ConsoleSideDrawerActions = {
  closeDrawer: (drawerId: string) => void
  registerDrawer: (drawerId: string, onClose: () => void) => () => void
  requestOpen: (drawerId: string) => void
}

const ConsoleSideDrawerActionsContext =
  createContext<ConsoleSideDrawerActions | null>(null)

const ConsoleSideDrawerStateContext = createContext<string | null>(null)

export const ConsoleSideDrawerProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [activeDrawerId, setActiveDrawerIdState] = useState<string | null>(null)
  const activeDrawerIdRef = useRef<string | null>(null)
  const drawerRegistryRef = useRef(new Map<string, () => void>())

  const setActiveDrawerId = useCallback((drawerId: string | null) => {
    activeDrawerIdRef.current = drawerId
    setActiveDrawerIdState(drawerId)
  }, [])

  const closeDrawer = useCallback(
    (drawerId: string) => {
      if (activeDrawerIdRef.current === drawerId) {
        setActiveDrawerId(null)
      }
    },
    [setActiveDrawerId],
  )

  const registerDrawer = useCallback(
    (drawerId: string, onClose: () => void) => {
      drawerRegistryRef.current.set(drawerId, onClose)

      return () => {
        const registeredClose = drawerRegistryRef.current.get(drawerId)

        if (registeredClose === onClose) {
          drawerRegistryRef.current.delete(drawerId)
        }
      }
    },
    [],
  )

  const requestOpen = useCallback(
    (drawerId: string) => {
      const activeDrawer = activeDrawerIdRef.current

      if (activeDrawer && activeDrawer !== drawerId) {
        drawerRegistryRef.current.get(activeDrawer)?.()
      }

      setActiveDrawerId(drawerId)
    },
    [setActiveDrawerId],
  )

  const actions = useMemo(
    () => ({
      closeDrawer,
      registerDrawer,
      requestOpen,
    }),
    [closeDrawer, registerDrawer, requestOpen],
  )

  return (
    <ConsoleSideDrawerActionsContext.Provider value={actions}>
      <ConsoleSideDrawerStateContext.Provider value={activeDrawerId}>
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
  onClose: () => void
  open: boolean
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
  onClose,
  open,
  tagline,
  title,
}: ConsoleSideDrawerProps) => {
  const drawerId = useId()
  const drawerActions = useContext(ConsoleSideDrawerActionsContext)
  const activeDrawerId = useContext(ConsoleSideDrawerStateContext)
  const handleClose = useCallback(() => {
    drawerActions?.closeDrawer(drawerId)
    onClose()
  }, [drawerActions, drawerId, onClose])

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
    return drawerActions?.registerDrawer(drawerId, handleClose)
  }, [drawerActions, drawerId, handleClose])

  useEffect(() => {
    if (!drawerActions) {
      return
    }

    if (open) {
      drawerActions.requestOpen(drawerId)
      return
    }

    drawerActions.closeDrawer(drawerId)
  }, [drawerActions, drawerId, open])

  const isActiveDrawer = drawerActions ? activeDrawerId === drawerId : open

  if (!open || !isActiveDrawer) {
    return null
  }

  return (
    <aside
      ref={drawerRef}
      className="fixed inset-y-0 right-0 z-50 flex w-80 max-w-full flex-col gap-5 overflow-hidden border-l border-border bg-sidebar px-4 py-2 text-foreground shadow-md"
      onClick={handleClick}
      style={{ backgroundColor: 'var(--sidebar)' }}
    >
      <div className="flex justify-end">
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
