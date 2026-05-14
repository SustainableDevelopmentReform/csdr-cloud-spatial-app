import { BadgeLink } from '../../../../components/badge-link'
import { MainRunBadge } from '../../_components/main-run-badge'
import { useRunVersionSidebar } from '../../_components/run-version-sidebar'
import { ProductRunLinkParams, useProductRunLink } from '../_hooks'
import { SquareFunctionIcon, Table2Icon } from 'lucide-react'
import type { MouseEventHandler } from 'react'
import { withDataLibrarySource } from '~/lib/paths'

export const ProductRunButton = ({
  productRun,
}: {
  productRun: ProductRunLinkParams
}) => {
  const productRunLink = useProductRunLink()
  const runVersionSidebar = useRunVersionSidebar()
  const href = withDataLibrarySource(productRunLink(productRun))
  const handleClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
    if (!runVersionSidebar) {
      return
    }

    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return
    }

    event.preventDefault()
    runVersionSidebar.openRunVersion({ id: productRun.id, type: 'product' })
  }

  return (
    <BadgeLink href={href} icon={<Table2Icon />} onClick={handleClick}>
      {productRun.name}
      <SquareFunctionIcon />
      {productRun.product.mainRunId === productRun.id && (
        <MainRunBadge size="xs" />
      )}
    </BadgeLink>
  )
}
