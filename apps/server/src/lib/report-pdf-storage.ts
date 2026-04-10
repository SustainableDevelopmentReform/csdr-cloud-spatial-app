import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'node:stream'
import { env } from '~/env'
import { ServerError } from './error'
import { s3Client } from './s3'

const inMemoryReportPdfStorage = new Map<string, Uint8Array>()

type ByteArrayReadable = {
  transformToByteArray: () => Promise<Uint8Array>
}

const hasTransformToByteArray = (value: unknown): value is ByteArrayReadable =>
  typeof value === 'object' &&
  value !== null &&
  'transformToByteArray' in value &&
  typeof value.transformToByteArray === 'function'

const isReadableStream = (value: unknown): value is Readable =>
  typeof value === 'object' && value !== null && value instanceof Readable

const readReadableBody = async (stream: Readable): Promise<Uint8Array> => {
  const chunks: Uint8Array[] = []

  for await (const chunk of stream) {
    if (chunk instanceof Uint8Array) {
      chunks.push(chunk)
      continue
    }

    if (typeof chunk === 'string') {
      chunks.push(Buffer.from(chunk))
    }
  }

  return Buffer.concat(chunks)
}

const assertPdfStorageConfigured = () => {
  if (!env.S3_BUCKET_NAME || !s3Client) {
    throw new ServerError({
      statusCode: 500,
      message: 'Report PDF storage is not configured',
      description:
        'Set the S3 bucket name and configure the S3 client before publishing reports.',
    })
  }

  return {
    bucketName: env.S3_BUCKET_NAME,
    client: s3Client,
  }
}

const reportPdfNotFoundError = () =>
  new ServerError({
    statusCode: 404,
    message: 'Failed to get report PDF',
    description: 'The published report PDF could not be found.',
  })

export const buildPublishedReportPdfKey = (reportId: string) =>
  `reports/${reportId}/published.pdf`

export const uploadReportPdf = async (
  key: string,
  pdfBytes: Uint8Array,
): Promise<void> => {
  if (env.NODE_ENV === 'test') {
    inMemoryReportPdfStorage.set(key, pdfBytes)
    return
  }

  const { bucketName, client } = assertPdfStorageConfigured()

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: pdfBytes,
      ContentType: 'application/pdf',
    }),
  )
}

export const downloadReportPdf = async (key: string): Promise<Uint8Array> => {
  if (env.NODE_ENV === 'test') {
    const storedPdf = inMemoryReportPdfStorage.get(key)

    if (!storedPdf) {
      throw reportPdfNotFoundError()
    }

    return storedPdf
  }

  const { bucketName, client } = assertPdfStorageConfigured()
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
  )

  if (!response.Body) {
    throw reportPdfNotFoundError()
  }

  if (hasTransformToByteArray(response.Body)) {
    return response.Body.transformToByteArray()
  }

  if (isReadableStream(response.Body)) {
    return readReadableBody(response.Body)
  }

  throw reportPdfNotFoundError()
}
