export const MainRunBadge = ({ size = 'md' }: { size?: 'xs' | 'md' }) => {
  if (size === 'xs') {
    return (
      <span className="inline-flex h-3 shrink-0 items-center rounded-[3px] border border-neutral-300 bg-neutral-100 px-1 text-[9px] font-medium leading-none text-neutral-700">
        latest
      </span>
    )
  }
  return (
    <span className="inline-flex h-4 shrink-0 items-center rounded-[4px] border border-neutral-300 bg-neutral-100 px-1.5 text-[10px] font-medium leading-none text-neutral-700">
      latest
    </span>
  )
}
