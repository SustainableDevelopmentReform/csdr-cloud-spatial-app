'use client'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@repo/ui/components/ui/breadcrumb'
import Link from '../../../../components/link'
import { INDICATORS_BASE_PATH } from '../../../../lib/paths'
import { useIndicator } from '../_hooks'
import { IndicatorButton } from './indicator-button'

export const IndicatorsBreadcrumbs = () => {
  const { data: indicator } = useIndicator()

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={INDICATORS_BASE_PATH}>Indicators</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {indicator && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <IndicatorButton indicator={indicator} />
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
