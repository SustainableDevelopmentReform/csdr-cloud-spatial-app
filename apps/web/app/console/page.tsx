import { Button } from '@repo/ui/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card'
import {
  ArrowUpRightIcon,
  BarChartHorizontalBigIcon,
  BookOpenIcon,
  DatabaseIcon,
  FileBarChart2Icon,
  LayoutDashboardIcon,
  type LucideIcon,
} from 'lucide-react'
import Link from '~/components/link'
import {
  DASHBOARDS_BASE_PATH,
  PRODUCTS_BASE_PATH,
  REPORTS_BASE_PATH,
} from '~/lib/paths'
import { ConsolePageHeader } from './_components/console-page-header'
import { ConsoleSimpleBreadcrumbs } from './_components/console-simple-breadcrumbs'

type HomeAction = {
  description: string
  href: string
  icon: LucideIcon
  title: string
}

const quickActions: HomeAction[] = [
  {
    title: 'View Dashboards',
    description: 'Explore key metrics and insights across available datasets.',
    href: DASHBOARDS_BASE_PATH,
    icon: LayoutDashboardIcon,
  },
  {
    title: 'View Reports',
    description: 'Access structured reports generated from analysed data.',
    href: REPORTS_BASE_PATH,
    icon: FileBarChart2Icon,
  },
  {
    title: 'Run Analysis',
    description: 'Analyse datasets using maps, charts, and defined methods.',
    href: '/console/data-explorer',
    icon: BarChartHorizontalBigIcon,
  },
  {
    title: 'Explore Data',
    description: 'Search and browse available datasets and data products.',
    href: PRODUCTS_BASE_PATH,
    icon: DatabaseIcon,
  },
]

const HomeActionCard = ({
  description,
  href,
  icon: Icon,
  title,
}: HomeAction) => {
  return (
    <Link
      href={href}
      className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="h-full rounded-2xl border-zinc-300 py-0 shadow-none transition-colors group-hover:bg-neutral-50">
        <CardHeader className="grid grid-cols-[auto_1fr_auto] gap-x-4 gap-y-1 p-6">
          <div className="flex size-6 items-center justify-center text-stone-900">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold leading-6 text-stone-900">
              {title}
            </CardTitle>
            <CardDescription className="mt-1 text-sm leading-5 text-neutral-500">
              {description}
            </CardDescription>
          </div>
          <div className="flex size-9 items-center justify-center rounded-lg text-stone-900 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
            <ArrowUpRightIcon className="size-4" />
          </div>
        </CardHeader>
      </Card>
    </Link>
  )
}

const Page = () => {
  return (
    <div className="flex flex-col gap-6">
      <ConsolePageHeader
        breadcrumbs={<ConsoleSimpleBreadcrumbs items={[{ label: 'Home' }]} />}
      />
      <div className="max-w-[52rem] space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold leading-7 text-card-foreground">
            Home
          </h1>
          <p className="text-sm leading-5 text-muted-foreground">
            Access dashboards, reports, and explore available data.
          </p>
        </div>

        <Card className="rounded-2xl border-zinc-300 py-0 shadow-none">
          <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-stone-900">
                <BookOpenIcon className="size-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold leading-7 text-stone-900">
                  Getting Started
                </h2>
                <p className="text-sm leading-5 text-neutral-500">
                  Learn how to use the SDF, explore example workflows, and
                  understand how data, analysis, and reporting connect.
                </p>
              </div>
            </div>
            <Button
              asChild
              variant="ghost"
              className="self-start md:self-center"
            >
              <a
                href="https://oceanaccounts.org/sdf/tech-demo/"
                rel="noreferrer noopener"
                target="_blank"
              >
                View Guide
                <ArrowUpRightIcon className="size-4" />
              </a>
            </Button>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {quickActions.map((action) => (
            <HomeActionCard key={action.title} {...action} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default Page
