'use client'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@repo/ui/components/ui/breadcrumb'
import Link from '../../../../components/link'
import { VARIABLES_BASE_PATH } from '../../../../lib/paths'
import { useVariable } from '../_hooks'
import { VariableButton } from './variable-button'

export const VariablesBreadcrumbs = () => {
  const { data: variable } = useVariable()

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
            <Link href={VARIABLES_BASE_PATH}>Variables</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {variable && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <VariableButton variable={variable} />
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
