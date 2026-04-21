import { redirect } from 'next/navigation'
import { USERS_BASE_PATH } from '~/lib/paths'

export default () => {
  redirect(USERS_BASE_PATH)
}
