import type { ReactNode } from 'react'

export const EMPTY_PLACEHOLDER_CLASS_NAME =
  'py-8 text-center text-sm text-muted-foreground'

export function EmptyPlaceholder({ children }: { children: ReactNode }) {
  return <p className={EMPTY_PLACEHOLDER_CLASS_NAME}>{children}</p>
}
