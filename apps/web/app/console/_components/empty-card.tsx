import { Card, CardDescription, CardHeader } from '@repo/ui/components/ui/card'

export type EmptyCardProps = {
  description: React.ReactNode
}

export const EmptyCard = (props: EmptyCardProps) => {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{props.description}</CardDescription>
      </CardHeader>
    </Card>
  )
}
