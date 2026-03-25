import { type StatusCode } from 'hono/utils/http-status'

interface ServerErrorOptions {
  data?: unknown
  statusCode?: StatusCode
  message?: string
  description?: string
}

export class ServerError extends Error {
  private statusCode: StatusCode = 500
  public message = 'Something went wrong'
  private data: unknown
  private description: string | null = null

  constructor(options: ServerErrorOptions) {
    super(options.message)
    this.statusCode = options.statusCode || 500
    this.message = options.message || 'Something went wrong'
    this.data = options.data
    this.description = options.description || null
  }

  get response(): {
    statusCode: StatusCode
    message: string
    data: unknown
    description: string | null
  } {
    return {
      statusCode: this.statusCode,
      message: this.message,
      data: this.data || null,
      description: this.description,
    }
  }
}
