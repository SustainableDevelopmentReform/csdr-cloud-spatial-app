import { getUserServerSession } from '~/utils/getUserServerSession'

const Page = async () => {
  const { user } = await getUserServerSession()

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-3xl font-medium">
        {user ? `Hello ${user.name}` : 'Welcome'}
      </h1>
      <p className="text-muted-foreground">
        {user
          ? 'Use the sidebar to explore your organization resources and any globally shared data.'
          : 'Browse shared resources or log in to work with your organization data.'}
      </p>
    </div>
  )
}

export default Page
