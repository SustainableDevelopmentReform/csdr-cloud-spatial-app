import { Button } from '@repo/ui/components/ui/button'
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card'
import { ArrowUpRightIcon } from 'lucide-react'
import Link from 'next/link'

export type DetailCardProps = {
  title: React.ReactNode
  description?: React.ReactNode
  footer?: React.ReactNode
  subFooter?: React.ReactNode
} & (
  | {
      actionText?: string
      actionIcon?: React.ReactNode
      actionLink?: string
      actionOnClick?: () => void
    }
  | { actionButton?: React.ReactNode }
)

export const DetailCard = (props: DetailCardProps) => {
  return (
    <Card className="@container/card">
      <CardHeader>
        {'actionButton' in props && props.actionButton && (
          <div>{props.actionButton}</div>
        )}
        {props.description && (
          <CardDescription>{props.description}</CardDescription>
        )}
        <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {props.title}
        </CardTitle>

        {'actionLink' in props && props.actionLink && (
          <CardAction>
            <Button size="sm" asChild>
              <Link href={props.actionLink}>
                {props.actionText ?? 'Open'}{' '}
                {props.actionIcon ?? <ArrowUpRightIcon />}
              </Link>
            </Button>
          </CardAction>
        )}
        {'actionOnClick' in props && props.actionOnClick && (
          <CardAction>
            <Button size="sm" onClick={props.actionOnClick}>
              {props.actionText ?? 'Open'}{' '}
              {props.actionIcon ?? <ArrowUpRightIcon />}
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        {props.footer && <div className="font-medium">{props.footer}</div>}
        {props.subFooter && (
          <div className="text-muted-foreground">{props.subFooter}</div>
        )}
      </CardFooter>
    </Card>
  )
}
