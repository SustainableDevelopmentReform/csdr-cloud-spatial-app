export function getAuthErrorMessage(error: unknown): string | null {
  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error) {
    const nestedError = (
      error as Error & {
        error?: { message?: string }
      }
    ).error

    if (typeof nestedError?.message === 'string') {
      return nestedError.message
    }

    return error.message
  }

  if (typeof error === 'object' && error) {
    if ('message' in error && typeof error.message === 'string') {
      return error.message
    }

    if (
      'error' in error &&
      typeof error.error === 'object' &&
      error.error &&
      'message' in error.error &&
      typeof error.error.message === 'string'
    ) {
      return error.error.message
    }
  }

  return null
}

export function isAuthErrorMessage(error: unknown, message: string) {
  return getAuthErrorMessage(error) === message
}
