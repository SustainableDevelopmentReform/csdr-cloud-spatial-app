import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '@repo/ui/lib/utils'

const variantStyles = {
  info: 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-400',
  success:
    'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  warning:
    'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  error:
    'border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
  primary: 'border-border bg-muted text-muted-foreground',
} as const

const iconMap = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertTriangle,
  primary: Info,
} as const

type Variant = keyof typeof variantStyles

export interface StatusMessageProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant
  icon?: React.ReactNode
}

export const StatusMessage = ({
  className,
  variant = 'primary',
  icon,
  children,
  ...props
}: StatusMessageProps) => {
  const Icon = iconMap[variant]

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border p-3 text-sm',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {icon ?? <Icon className="h-4 w-4 flex-shrink-0" />}
      <span>{children}</span>
    </div>
  )
}
