'use client'

import { ConsoleSimpleBreadcrumbs } from '../../_components/console-simple-breadcrumbs'
import { INDICATORS_BASE_PATH } from '../../../../lib/paths'
import { useIndicator } from '../_hooks'

export const IndicatorsBreadcrumbs = () => {
  const { data: indicator } = useIndicator()

  return (
    <ConsoleSimpleBreadcrumbs
      items={[
        { label: 'Indicators', href: INDICATORS_BASE_PATH },
        ...(indicator ? [{ label: indicator.name }] : []),
      ]}
    />
  )
}
