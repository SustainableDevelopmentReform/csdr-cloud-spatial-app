'use client'

import * as React from 'react'

type PrintReadinessContextValue = {
  setDependencyState: (id: string, ready: boolean) => void
  removeDependency: (id: string) => void
}

const PrintReadinessContext =
  React.createContext<PrintReadinessContextValue | null>(null)

const waitForAnimationFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })

export const waitForAnimationFrames = async (count: number) => {
  for (let frame = 0; frame < count; frame += 1) {
    await waitForAnimationFrame()
  }
}

export const PrintReadinessProvider = ({
  baseReady,
  children,
}: {
  baseReady: boolean
  children: React.ReactNode | ((ready: boolean) => React.ReactNode)
}) => {
  const [dependencies, setDependencies] = React.useState<
    Record<string, boolean>
  >({})

  const setDependencyState = React.useCallback((id: string, ready: boolean) => {
    setDependencies((currentDependencies) => {
      if (currentDependencies[id] === ready) {
        return currentDependencies
      }

      return {
        ...currentDependencies,
        [id]: ready,
      }
    })
  }, [])

  const removeDependency = React.useCallback((id: string) => {
    setDependencies((currentDependencies) => {
      if (!(id in currentDependencies)) {
        return currentDependencies
      }

      const nextDependencies = { ...currentDependencies }
      delete nextDependencies[id]
      return nextDependencies
    })
  }, [])

  const isReady =
    baseReady && Object.values(dependencies).every((ready) => ready)

  const contextValue = React.useMemo(
    () => ({
      setDependencyState,
      removeDependency,
    }),
    [removeDependency, setDependencyState],
  )

  return (
    <PrintReadinessContext.Provider value={contextValue}>
      {typeof children === 'function' ? children(isReady) : children}
    </PrintReadinessContext.Provider>
  )
}

export const usePrintRenderReadiness = ({
  isReady,
  enabled = true,
  settleFrames = 2,
}: {
  isReady: boolean
  enabled?: boolean
  settleFrames?: number
}) => {
  const context = React.useContext(PrintReadinessContext)
  const dependencyId = React.useId()

  React.useEffect(() => {
    if (!context || !enabled) {
      return
    }

    context.setDependencyState(dependencyId, false)

    if (!isReady) {
      return () => {
        context.removeDependency(dependencyId)
      }
    }

    let cancelled = false

    const settle = async () => {
      await waitForAnimationFrames(settleFrames)

      if (!cancelled) {
        context.setDependencyState(dependencyId, true)
      }
    }

    void settle()

    return () => {
      cancelled = true
      context.removeDependency(dependencyId)
    }
  }, [context, dependencyId, enabled, isReady, settleFrames])
}
