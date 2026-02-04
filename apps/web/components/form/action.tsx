import { Label } from '@repo/ui/components/ui/label'
import { cn } from '@repo/ui/lib/utils'

export type FieldGroupProps = {
  title: string
  description?: React.ReactNode
  disabled?: boolean
  className?: string
  children: React.ReactNode
}

export const FieldGroup = (props: FieldGroupProps) => {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 mt-2',
        props.disabled && 'opacity-50',
        props.className,
      )}
    >
      <Label>{props.title}</Label>
      {props.description && (
        <div className="mt-1 text-sm text-muted-foreground">
          {props.description}
        </div>
      )}
      {props.children}
    </div>
  )
}
