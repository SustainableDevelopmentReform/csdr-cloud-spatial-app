import { getUserFacingErrorMessage } from '~/utils/error-handling'

export function getAuthErrorMessage(error: unknown): string | null {
  return getUserFacingErrorMessage(error)
}

export function isAuthErrorMessage(error: unknown, message: string) {
  return getAuthErrorMessage(error) === message
}
