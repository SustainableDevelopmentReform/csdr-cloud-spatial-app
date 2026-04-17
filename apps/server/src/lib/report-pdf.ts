import { access } from 'node:fs/promises'
import { platform } from 'node:os'
import { chromium } from 'playwright-core'
import { env } from '~/env'
import { ServerError } from './error'

const reportReadySelector = '[data-report-print-ready="true"]'
const testPdfBytes = Buffer.from('%PDF-1.4\n% Report PDF fixture\n')

const browserExecutableCandidates = [
  env.PDF_BROWSER_EXECUTABLE_PATH,
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
]

const parseCookieHeader = (
  cookieHeader: string | null | undefined,
): { name: string; value: string }[] => {
  if (!cookieHeader) {
    return []
  }

  return cookieHeader
    .split(';')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const separatorIndex = entry.indexOf('=')

      if (separatorIndex === -1) {
        return null
      }

      return {
        name: entry.slice(0, separatorIndex),
        value: entry.slice(separatorIndex + 1),
      }
    })
    .filter((entry) => entry !== null)
}

const pathExists = async (path: string): Promise<boolean> => {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

const resolveBrowserExecutablePath = async (): Promise<string | undefined> => {
  for (const candidate of browserExecutableCandidates) {
    if (!candidate) {
      continue
    }

    if (await pathExists(candidate)) {
      return candidate
    }
  }

  return undefined
}

const getReportPrintUrl = (reportId: string) =>
  new URL(`/report/${reportId}/print`, env.APP_URL).toString()

const getBrowserLaunchArgs = (): string[] => {
  const args = ['--disable-dev-shm-usage']

  if (platform() === 'linux') {
    args.push('--no-sandbox', '--disable-setuid-sandbox')
  }

  return args
}

export const renderReportPdf = async (options: {
  reportId: string
  cookieHeader: string | null | undefined
}): Promise<Uint8Array> => {
  if (env.NODE_ENV === 'test') {
    return testPdfBytes
  }

  const executablePath = await resolveBrowserExecutablePath()

  let browser

  try {
    browser = await chromium.launch({
      headless: true,
      executablePath,
      args: getBrowserLaunchArgs(),
    })
  } catch {
    throw new ServerError({
      statusCode: 500,
      message: 'Failed to generate report PDF',
      description:
        'Chromium is not available. Install Chromium or set PDF_BROWSER_EXECUTABLE_PATH.',
    })
  }

  try {
    const context = await browser.newContext({
      colorScheme: 'light',
    })

    const frontendUrl = new URL(env.APP_URL)
    const cookies = parseCookieHeader(options.cookieHeader)

    if (cookies.length > 0) {
      await context.addCookies(
        cookies.map((cookie) => ({
          name: cookie.name,
          value: cookie.value,
          domain: frontendUrl.hostname,
          path: '/',
          secure:
            cookie.name.startsWith('__Secure-') ||
            frontendUrl.protocol === 'https:',
        })),
      )
    }

    const page = await context.newPage()
    const response = await page.goto(getReportPrintUrl(options.reportId), {
      waitUntil: 'networkidle',
    })

    if (!response?.ok()) {
      throw new ServerError({
        statusCode: 500,
        message: 'Failed to generate report PDF',
        description:
          'The report print view could not be rendered for PDF generation.',
      })
    }

    await page.waitForFunction(
      (selector) => document.querySelector(selector) !== null,
      reportReadySelector,
    )
    await page.emulateMedia({ media: 'screen' })
    await page.evaluate(async () => {
      await document.fonts.ready
    })

    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '16mm',
        right: '14mm',
        bottom: '16mm',
        left: '14mm',
      },
    })
  } catch (error) {
    if (error instanceof ServerError) {
      throw error
    }

    throw new ServerError({
      statusCode: 500,
      message: 'Failed to generate report PDF',
      description: 'Unexpected error while rendering the report PDF.',
    })
  } finally {
    await browser.close()
  }
}
