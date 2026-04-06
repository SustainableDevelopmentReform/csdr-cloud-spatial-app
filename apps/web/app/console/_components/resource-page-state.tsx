'use client'

import { ReactNode } from 'react'
import { StatusMessage } from '~/components/status-message'
import {
  getUserFacingErrorMessage,
  isServerErrorStatus,
} from '~/utils/error-handling'
import { EmptyCard } from './empty-card'

type ResourcePageStateProps = {
  children: ReactNode
  error: unknown
  errorMessage: string
  isLoading: boolean
  loadingMessage: string
  notFoundMessage: string
}

export const ResourcePageState = ({
  children,
  error,
  errorMessage,
  isLoading,
  loadingMessage,
  notFoundMessage,
}: ResourcePageStateProps) => {
  if (isLoading) {
    return <EmptyCard description={loadingMessage} />
  }

  if (isServerErrorStatus(error, 403) || isServerErrorStatus(error, 404)) {
    return <EmptyCard description={notFoundMessage} />
  }

  if (error) {
    return (
      <StatusMessage variant="error">
        {getUserFacingErrorMessage(error) ?? errorMessage}
      </StatusMessage>
    )
  }

  return children
}
