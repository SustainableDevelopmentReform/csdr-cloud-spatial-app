import { toast } from '@repo/ui/components/ui/sonner'
import { z } from 'zod'

const serverErrorSchema = z.object({
  statusCode: z.number(),
  message: z.string(),
  description: z.string().nullable().optional(),
})

const messageErrorSchema = z.object({
  message: z.string(),
  description: z.string().nullable().optional(),
})

const betterAuthErrorSchema = z.object({
  message: z.string(),
  error: z.object({
    message: z.string(),
  }),
})

export type ErrorToastContent = {
  description?: string
  message: string
}

const getCauseMessage = (cause: unknown): string | undefined => {
  if (typeof cause === 'string' && cause.length > 0) {
    return cause
  }

  if (cause instanceof Error && cause.message.length > 0) {
    return cause.message
  }

  return undefined
}

export const getUserFacingErrorMessage = (error: unknown): string | null => {
  if (typeof error === 'string') {
    return error
  }

  const betterAuthError = betterAuthErrorSchema.safeParse(error)

  if (betterAuthError.success) {
    return betterAuthError.data.error.message
  }

  const serverError = serverErrorSchema.safeParse(error)

  if (serverError.success) {
    return serverError.data.message
  }

  const messageError = messageErrorSchema.safeParse(error)

  if (messageError.success) {
    return messageError.data.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return null
}

export const getErrorToastContent = (
  error: unknown,
): ErrorToastContent | null => {
  if (typeof error === 'string') {
    return { message: error }
  }

  const serverError = serverErrorSchema.safeParse(error)

  if (serverError.success) {
    return {
      message: serverError.data.message,
      description: serverError.data.description ?? undefined,
    }
  }

  const betterAuthError = betterAuthErrorSchema.safeParse(error)

  if (betterAuthError.success) {
    return {
      message: betterAuthError.data.message,
      description: betterAuthError.data.error.message,
    }
  }

  const messageError = messageErrorSchema.safeParse(error)

  if (messageError.success) {
    return {
      message: messageError.data.message,
      description: messageError.data.description ?? undefined,
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      description: getCauseMessage(error.cause),
    }
  }

  return null
}

export const toastError = (error: unknown, fallbackMessage?: string): void => {
  const content = getErrorToastContent(error)

  if (content) {
    toast.error(content.message, {
      description: content.description,
    })
    return
  }

  if (fallbackMessage) {
    toast.error(fallbackMessage)
  }
}
