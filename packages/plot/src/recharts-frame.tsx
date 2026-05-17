'use client'

import clsx from 'clsx'
import * as React from 'react'
import * as RechartsPrimitive from 'recharts'

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    color?: string
  }
>

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />')
  }

  return context
}

export const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    config: ChartConfig
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >['children']
  }
>(({ className, children, config, ...props }, ref) => (
  <ChartContext.Provider value={{ config }}>
    <div
      ref={ref}
      className={clsx(
        "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-layer]:outline-none [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
        className,
      )}
      {...props}
    >
      <RechartsPrimitive.ResponsiveContainer debounce={0}>
        {children}
      </RechartsPrimitive.ResponsiveContainer>
    </div>
  </ChartContext.Provider>
))
ChartContainer.displayName = 'Chart'

export const ChartLegend = RechartsPrimitive.Legend

type LegendPayloadItem = {
  type?: string
  dataKey?: string | number
  value?: string | number
  color?: string
}

export const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    payload?: readonly LegendPayloadItem[]
    verticalAlign?: 'top' | 'bottom'
    hideIcon?: boolean
    nameKey?: string
  }
>(
  (
    { className, hideIcon = false, payload, verticalAlign = 'bottom', nameKey },
    ref,
  ) => {
    const { config } = useChart()

    if (!payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={clsx(
          'flex items-center justify-center gap-4',
          verticalAlign === 'top' ? 'pb-3' : 'pt-3',
          className,
        )}
      >
        {payload
          .filter((item) => item.type !== 'none')
          .map((item) => {
            const rawKey =
              nameKey === 'name'
                ? (item.value ?? item.dataKey ?? 'value')
                : (item.dataKey ?? item.value ?? 'value')
            const key = String(rawKey)
            const itemConfig = config[key]

            return (
              <div
                key={key}
                className="flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
              >
                {!hideIcon && (
                  <div
                    className="h-2 w-2 shrink-0 rounded-[2px]"
                    style={{
                      backgroundColor: item.color ?? itemConfig?.color,
                    }}
                  />
                )}
                {itemConfig?.label ?? key}
              </div>
            )
          })}
      </div>
    )
  },
)
ChartLegendContent.displayName = 'ChartLegend'
