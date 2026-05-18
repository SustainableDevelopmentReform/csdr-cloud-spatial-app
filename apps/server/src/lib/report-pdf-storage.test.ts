import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'node:stream'
import { afterEach, describe, expect, it, vi } from 'vitest'

type S3Command = GetObjectCommand | PutObjectCommand
type S3SendResult = {
  Body?: unknown
}

const loadStorageModule = async () => import('./report-pdf-storage')

const expectServerErrorResponse = (
  error: unknown,
  response: {
    statusCode: number
    message: string
  },
) => {
  if (typeof error !== 'object' || error === null) {
    throw new Error('Expected server error object')
  }

  expect(Reflect.get(error, 'response')).toMatchObject(response)
}

const mockS3Client = (
  send: ReturnType<typeof vi.fn<(command: S3Command) => Promise<S3SendResult>>>,
) => {
  vi.doMock('./s3', () => ({
    s3Client: {
      send,
    },
  }))
}

const useProductionStorageEnv = (bucketName = 'reports-bucket') => {
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('S3_BUCKET_NAME', bucketName)
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetModules()
  vi.doUnmock('./s3')
  vi.unstubAllEnvs()
})

describe('report PDF storage', () => {
  it('builds stable published PDF keys', async () => {
    const { buildPublishedReportPdfKey } = await loadStorageModule()

    expect(buildPublishedReportPdfKey('report-1')).toBe(
      'reports/report-1/published.pdf',
    )
  })

  it('throws when production storage is not configured', async () => {
    const send = vi.fn<(command: S3Command) => Promise<S3SendResult>>()
    mockS3Client(send)
    useProductionStorageEnv('')

    const { uploadReportPdf } = await loadStorageModule()

    try {
      await uploadReportPdf('reports/report-1/published.pdf', new Uint8Array())
      throw new Error('Expected uploadReportPdf to fail')
    } catch (error) {
      expectServerErrorResponse(error, {
        statusCode: 500,
        message: 'Report PDF storage is not configured',
      })
    }
  })

  it('uploads production PDFs with the expected S3 command', async () => {
    const send = vi.fn<(command: S3Command) => Promise<S3SendResult>>()
    send.mockResolvedValue({})
    mockS3Client(send)
    useProductionStorageEnv()

    const { uploadReportPdf } = await loadStorageModule()
    const pdfBytes = new Uint8Array([1, 2, 3])

    await uploadReportPdf('reports/report-1/published.pdf', pdfBytes)

    const call = send.mock.calls.at(0)
    if (!call) {
      throw new Error('Expected S3 send to be called')
    }
    const command = call[0]
    expect(command).toBeInstanceOf(PutObjectCommand)
    if (command instanceof PutObjectCommand) {
      expect(command.input).toEqual({
        Bucket: 'reports-bucket',
        Key: 'reports/report-1/published.pdf',
        Body: pdfBytes,
        ContentType: 'application/pdf',
      })
    }
  })

  it('downloads production PDFs from byte-array response bodies', async () => {
    const pdfBytes = new Uint8Array([4, 5, 6])
    const body = {
      transformToByteArray: vi.fn<() => Promise<Uint8Array>>(),
    }
    body.transformToByteArray.mockResolvedValue(pdfBytes)
    const send = vi.fn<(command: S3Command) => Promise<S3SendResult>>()
    send.mockResolvedValue({ Body: body })
    mockS3Client(send)
    useProductionStorageEnv()

    const { downloadReportPdf } = await loadStorageModule()

    await expect(
      downloadReportPdf('reports/report-1/published.pdf'),
    ).resolves.toEqual(pdfBytes)

    const call = send.mock.calls.at(0)
    if (!call) {
      throw new Error('Expected S3 send to be called')
    }
    const command = call[0]
    expect(command).toBeInstanceOf(GetObjectCommand)
    if (command instanceof GetObjectCommand) {
      expect(command.input).toEqual({
        Bucket: 'reports-bucket',
        Key: 'reports/report-1/published.pdf',
      })
    }
  })

  it('downloads production PDFs from readable response bodies', async () => {
    const send = vi.fn<(command: S3Command) => Promise<S3SendResult>>()
    send.mockResolvedValue({
      Body: Readable.from([Buffer.from([7, 8]), '9']),
    })
    mockS3Client(send)
    useProductionStorageEnv()

    const { downloadReportPdf } = await loadStorageModule()

    const downloaded = await downloadReportPdf('reports/report-1/published.pdf')

    expect(Array.from(downloaded)).toEqual([7, 8, 57])
  })

  it('returns not found for missing or unsupported response bodies', async () => {
    const send = vi.fn<(command: S3Command) => Promise<S3SendResult>>()
    send.mockResolvedValueOnce({}).mockResolvedValueOnce({ Body: {} })
    mockS3Client(send)
    useProductionStorageEnv()

    const { downloadReportPdf } = await loadStorageModule()

    await expect(downloadReportPdf('missing.pdf')).rejects.toHaveProperty(
      'message',
      'Failed to get report PDF',
    )
    await expect(downloadReportPdf('unsupported.pdf')).rejects.toHaveProperty(
      'message',
      'Failed to get report PDF',
    )
  })
})
