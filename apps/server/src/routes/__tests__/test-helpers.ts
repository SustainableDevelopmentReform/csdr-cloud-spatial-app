import { expect } from 'vitest'

export type JsonResponse<T> = {
  statusCode: number
  message: string
  data: T
  description?: string | null
}

export const readJson = async <T>(response: Response) =>
  (await response.json()) as JsonResponse<T>

export const expectJsonResponse = async <T>(
  response: Response,
  options: {
    status: number
    message: string
    description?: string | null
  },
) => {
  expect(response.status).toBe(options.status)

  const json = await readJson<T>(response)

  expect(json.statusCode).toBe(options.status)
  expect(json.message).toBe(options.message)

  if ('description' in options) {
    expect(json.description ?? null).toBe(options.description ?? null)
  }

  return json
}
