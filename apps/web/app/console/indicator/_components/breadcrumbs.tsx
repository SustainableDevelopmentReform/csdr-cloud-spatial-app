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
import { useDerivedIndicator, useIndicator } from '../_hooks'
import { IndicatorButton } from './indicator-button'

export const IndicatorsBreadcrumbs = () => {
  const { data: indicator } = useIndicator()
  const { data: derivedIndicator } = useDerivedIndicator()

  const indicatorForBreadcrumb = indicator ?? derivedIndicator

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">Home</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={INDICATORS_BASE_PATH}>Indicators</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {indicatorForBreadcrumb && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <IndicatorButton indicator={indicatorForBreadcrumb} />
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
