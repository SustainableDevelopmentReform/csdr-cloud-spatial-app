import { describe, expect, it } from 'vitest'
import { setupIsolatedTestFile } from '~/test-utils/integration'
import { expectJsonResponse } from '~/test-utils/route-test-helpers'

const { app, createSessionHeaders } = await setupIsolatedTestFile(
  import.meta.url,
)

describe('app routes', () => {
  it('serves the OpenAPI and Scalar endpoints', async () => {
    const docResponse = await app.request(
      new Request('http://localhost/api/v0/doc'),
    )

    expect(docResponse.status).toBe(200)
    expect(docResponse.headers.get('content-type')).toContain(
      'application/json',
    )

    const docJson = (await docResponse.json()) as {
      openapi: string
      info: { title: string }
      servers: { url: string }[]
    }

    expect(docJson.openapi).toBe('3.0.0')
    expect(docJson.info.title).toBe('Spatial Data Framework API')
    expect(docJson.servers[0]?.url).toBe('http://localhost')

    const scalarResponse = await app.request(
      new Request('http://localhost/api/v0/scalar'),
    )

    expect(scalarResponse.status).toBe(200)
    expect(scalarResponse.headers.get('content-type')).toContain('text/html')

    const scalarHtml = await scalarResponse.text()

    expect(scalarHtml).toContain('/api/v0/doc')
  })

  it('returns the global not-found response for unknown endpoints', async () => {
    const missingRouteJson = await expectJsonResponse<null>(
      await app.request(new Request('http://localhost/api/v0/does-not-exist')),
      {
        status: 404,
        message:
          "Endpoint you're looking for is not found: http://localhost/api/v0/does-not-exist. See API docs at http://localhost/api/v0/scalar or return to the web UI home at http://localhost:3000/console.",
      },
    )
    expect(missingRouteJson.data).toBeNull()
  })

  it('rejects unsafe cookie-authenticated requests without a trusted origin', async () => {
    const headers = await createSessionHeaders({
      email: 'csrf-admin@example.com',
      role: 'admin',
    })
    headers.delete('origin')
    headers.set('content-type', 'application/json')

    await expectJsonResponse(
      await app.request(
        new Request('http://localhost/api/v0/dataset', {
          method: 'POST',
          headers,
          body: JSON.stringify({ name: 'CSRF dataset' }),
        }),
      ),
      {
        status: 403,
        message: 'CSRF validation failed',
        description:
          'Cookie-authenticated API requests must come from a trusted origin.',
      },
    )
  })

  it('rejects simple content types and oversized request bodies', async () => {
    const headers = await createSessionHeaders({
      email: 'csrf-simple-admin@example.com',
      role: 'admin',
    })
    headers.set('content-type', 'text/plain')

    await expectJsonResponse(
      await app.request(
        new Request('http://localhost/api/v0/dataset', {
          method: 'POST',
          headers,
          body: 'name=Simple',
        }),
      ),
      {
        status: 403,
        message: 'CSRF validation failed',
        description:
          'Cookie-authenticated API requests must use a non-simple content type.',
      },
    )

    const oversizedHeaders = new Headers()
    oversizedHeaders.set('content-length', `${25 * 1024 * 1024 + 1}`)

    await expectJsonResponse(
      await app.request(
        new Request('http://localhost/api/v0/dataset', {
          method: 'POST',
          headers: oversizedHeaders,
          body: '{}',
        }),
      ),
      {
        status: 413,
        message: 'Payload Too Large',
      },
    )
  })
})
