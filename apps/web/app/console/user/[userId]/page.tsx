import { redirect } from 'next/navigation'
import { USERS_BASE_PATH } from '~/lib/paths'

export default async ({ params }: { params: Promise<{ userId: string }> }) => {
  const { userId } = await params

  redirect(`${USERS_BASE_PATH}/${userId}`)
}
