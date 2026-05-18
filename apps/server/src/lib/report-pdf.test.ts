import { afterEach, describe, expect, it, vi } from 'vitest'

const loadReportPdfModule = async () => import('./report-pdf')

const expectServerErrorResponse = (
  error: unknown,
  response: {
    statusCode: number
    message: string
    description: string | null
  },
) => {
  if (typeof error !== 'object' || error === null) {
    throw new Error('Expected server error object')
  }

  expect(Reflect.get(error, 'response')).toMatchObject(response)
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetModules()
  vi.doUnmock('playwright-core')
  vi.unstubAllEnvs()
})

describe('report PDF helpers', () => {
  it('parses valid cookie pairs and ignores malformed entries', async () => {
    const { parseCookieHeader } = await loadReportPdfModule()

    expect(
      parseCookieHeader(
        'session=abc; malformed; theme=light; empty=; encoded=a=b=c',
      ),
    ).toEqual([
      { name: 'session', value: 'abc' },
      { name: 'theme', value: 'light' },
      { name: 'empty', value: '' },
      { name: 'encoded', value: 'a=b=c' },
    ])
    expect(parseCookieHeader(null)).toEqual([])
    expect(parseCookieHeader(undefined)).toEqual([])
  })

  it('collects allowed PDF request origins from configured URLs', async () => {
    vi.stubEnv('APP_URL', 'https://app.example.com')
    vi.stubEnv('INTERNAL_FRONTEND_URL', 'http://web:3000')
    vi.stubEnv('INTERNAL_BACKEND_URL', 'http://api:4000')
    vi.stubEnv('MAP_STYLE_URL', 'https://tiles.example.com/style.json')
    vi.stubEnv(
      'PMTILES_ALLOWED_ORIGINS',
      'https://pmtiles.example.com,https://bucket.s3.amazonaws.com',
    )

    const { getAllowedPdfRequestOrigins } = await loadReportPdfModule()

    expect(Array.from(getAllowedPdfRequestOrigins()).sort()).toEqual([
      'http://api:4000',
      'http://web:3000',
      'https://api.protomaps.com',
      'https://app.example.com',
      'https://bucket.s3.amazonaws.com',
      'https://pmtiles.example.com',
      'https://protomaps.github.io',
      'https://tiles.example.com',
    ])
  })

  it('allows only safe internal PDF render requests', async () => {
    const { isAllowedPdfRequestUrl } = await loadReportPdfModule()
    const allowedOrigins = new Set(['https://app.example.com'])

    expect(isAllowedPdfRequestUrl('about:blank', allowedOrigins)).toBe(true)
    expect(
      isAllowedPdfRequestUrl('blob:https://app.example.com/id', allowedOrigins),
    ).toBe(true)
    expect(
      isAllowedPdfRequestUrl('data:image/png;base64,AAAA', allowedOrigins),
    ).toBe(true)
    expect(
      isAllowedPdfRequestUrl(
        'https://app.example.com/report/1',
        allowedOrigins,
      ),
    ).toBe(true)
    expect(
      isAllowedPdfRequestUrl(
        'https://evil.example.com/script.js',
        allowedOrigins,
      ),
    ).toBe(false)
    expect(isAllowedPdfRequestUrl('file:///etc/passwd', allowedOrigins)).toBe(
      false,
    )
    expect(isAllowedPdfRequestUrl('not a url', allowedOrigins)).toBe(false)
  })

  it('wraps browser launch failures in a server error', async () => {
    const launch = vi.fn<() => Promise<never>>()
    launch.mockRejectedValue(new Error('missing chromium'))
    vi.doMock('playwright-core', () => ({
      chromium: {
        launch,
      },
    }))
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('APP_URL', 'http://localhost:3000')

    const { renderReportPdf } = await loadReportPdfModule()

    try {
      await renderReportPdf({
        reportId: 'report-1',
        cookieHeader: null,
      })
      throw new Error('Expected renderReportPdf to fail')
    } catch (error) {
      expectServerErrorResponse(error, {
        statusCode: 500,
        message: 'Failed to generate report PDF',
        description:
          'Chromium is not available. Install Chromium or set PDF_BROWSER_EXECUTABLE_PATH.',
      })
    }
  })
})
