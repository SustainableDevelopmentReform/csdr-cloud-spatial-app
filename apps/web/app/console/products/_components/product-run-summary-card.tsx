import { Badge } from '@repo/ui/components/ui/badge'
import { Button } from '@repo/ui/components/ui/button'
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card'
import { ArrowUpRightIcon, Loader2Icon, RefreshCwIcon } from 'lucide-react'
import Link from '../../../../components/link'
import { formatDate, formatDateTime } from '../../../../utils/date'
import {
  Product,
  ProductRun,
  useProductRunLink,
  useRefreshProductRunSummary,
} from '../_hooks'
import { VariableButton } from '../../variables/_components/variable-button'

export const ProductRunSummaryCard = ({
  product,
  productRun,
}: {
  product: Product | undefined | null
  productRun?: ProductRun | undefined | null
}) => {
  const productRunLink = useProductRunLink()
  const refreshProductRunSummary = useRefreshProductRunSummary()

  if (!product?.mainRun) {
    return null
  }

  if (product?.mainRun && !product?.mainRun?.outputSummary) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Main Run</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-3xl">
            No summary
          </CardTitle>
          <CardAction>
            <Button
              size="sm"
              onClick={() => {
                product.mainRun &&
                  refreshProductRunSummary.mutate(product.mainRun)
              }}
              disabled={refreshProductRunSummary.isPending}
            >
              {refreshProductRunSummary.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <>
                  Refresh <RefreshCwIcon />
                </>
              )}
            </Button>
          </CardAction>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>
          {productRun ? 'Product Run Summary' : 'Product Main Run Summary'}
        </CardDescription>
        <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-3xl">
          Created at {formatDateTime(product?.mainRun?.createdAt)}
        </CardTitle>
        {!productRun && (
          <CardAction>
            <Button size="sm" asChild>
              <Link href={productRunLink(product?.mainRun)}>
                Open <ArrowUpRightIcon />
              </Link>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="flex gap-2">
          {product.mainRun?.outputSummary?.variables?.map((variable) => (
            <VariableButton
              variable={variable.variable}
              key={variable.variable.id}
            />
          ))}
        </div>
        <div className="line-clamp-1 flex gap-2 font-medium">
          Data range: {formatDate(product?.mainRun?.outputSummary?.startTime)}{' '}
          to {formatDate(product?.mainRun?.outputSummary?.endTime)}
        </div>
        <div className="text-muted-foreground">
          {product?.mainRun?.outputSummary?.outputCount} outputs
        </div>
      </CardFooter>
    </Card>
  )
}
