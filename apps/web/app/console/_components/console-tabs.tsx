'use client'

import { Tabs, TabsList, TabsTrigger } from '@repo/ui/components/ui/tabs'
import { cn } from '@repo/ui/lib/utils'
import type { LucideIcon } from 'lucide-react'
import type { ComponentProps } from 'react'

export const ConsolePrimaryTabsList = ({
  className,
  ...props
}: ComponentProps<typeof TabsList>) => (
  <TabsList className={className} {...props} />
)

export const ConsolePrimaryTabsTrigger = ({
  className,
  ...props
}: ComponentProps<typeof TabsTrigger>) => (
  <TabsTrigger className={className} {...props} />
)

type ConsoleSecondaryTabItem<TValue extends string> = {
  icon?: LucideIcon
  label: string
  value: TValue
}

type ConsoleSecondaryTabsProps<TValue extends string> = {
  className?: string
  items: readonly ConsoleSecondaryTabItem<TValue>[]
  onValueChange: (value: TValue) => void
  value: TValue
}

export const ConsoleSecondaryTabs = <TValue extends string>({
  className,
  items,
  onValueChange,
  value,
}: ConsoleSecondaryTabsProps<TValue>) => {
  const handleValueChange = (nextValue: string) => {
    const nextItem = items.find((item) => item.value === nextValue)

    if (nextItem) {
      onValueChange(nextItem.value)
    }
  }

  return (
    <Tabs
      className={cn('w-fit gap-0', className)}
      onValueChange={handleValueChange}
      value={value}
    >
      <TabsList className="h-auto gap-0.5 rounded-[10px] bg-background p-0.5">
        {items.map((item) => {
          const Icon = item.icon

          return (
            <TabsTrigger
              className="h-9 flex-none rounded-lg bg-transparent px-3 py-2.5 text-sm font-medium leading-5 text-foreground shadow-none data-[state=active]:bg-accent data-[state=active]:shadow-none"
              key={item.value}
              value={item.value}
            >
              {Icon ? <Icon className="size-4" /> : null}
              {item.label}
            </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  )
}
