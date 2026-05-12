import { redirect } from 'next/navigation'
import { DATA_LIBRARY_BASE_PATH } from '~/lib/paths'

export default () => {
  redirect(DATA_LIBRARY_BASE_PATH)
}
