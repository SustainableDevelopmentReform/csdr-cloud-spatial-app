import { describe, expect, it } from 'vitest'
import { ServerError } from './error'
import { validatePmtilesUrl } from './url-security'

describe('PMTiles URL validation', () => {
  it('accepts configured HTTPS and S3 origins', () => {
    expect(() =>
      validatePmtilesUrl('https://allowed.example.com/data/run.pmtiles'),
    ).not.toThrow()
    expect(() =>
      validatePmtilesUrl('s3://allowed-bucket/data/run.pmtiles'),
    ).not.toThrow()
  })

  it('rejects loopback and unconfigured origins', () => {
    expect(() =>
      validatePmtilesUrl('http://127.0.0.1:7777/data.pmtiles'),
    ).toThrow(ServerError)
    expect(() =>
      validatePmtilesUrl('https://untrusted.example.com/data.pmtiles'),
    ).toThrow(ServerError)
  })
})
