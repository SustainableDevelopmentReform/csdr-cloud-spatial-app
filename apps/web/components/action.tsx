import { cn } from '@repo/ui/lib/utils'

export type FieldGroupProps = {
  title: string
  description?: string
  disabled?: boolean
  className?: string
  children: React.ReactNode
}

export const FieldGroup = (props: FieldGroupProps) => {
  return (
    <div
      className={cn(
        'flex flex-col gap-2',
        props.disabled && 'opacity-50',
        props.className,
      )}
    >
      <div className="font-medium">{props.title}</div>
      {props.description && <div className="mb-3">{props.description}</div>}
      {props.children}
    </div>
  )
}
