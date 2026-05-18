import { describe, expect, it } from 'vitest'
import { deriveRunStatus } from '../src/crud'

describe('deriveRunStatus', () => {
  it('returns latest when the run id matches the latest run id', () => {
    expect(
      deriveRunStatus({
        latestRunCreatedAt: '2024-01-01T00:00:00.000Z',
        latestRunId: 'run-1',
        runCreatedAt: '2024-02-01T00:00:00.000Z',
        runId: 'run-1',
      }),
    ).toBe('latest')
  })

  it('returns draft for non-latest runs created after the latest run', () => {
    expect(
      deriveRunStatus({
        latestRunCreatedAt: '2024-01-01T00:00:00.000Z',
        latestRunId: 'run-1',
        runCreatedAt: '2024-02-01T00:00:00.000Z',
        runId: 'run-2',
      }),
    ).toBe('draft')
  })

  it('returns previous for non-latest runs created before the latest run', () => {
    expect(
      deriveRunStatus({
        latestRunCreatedAt: '2024-02-01T00:00:00.000Z',
        latestRunId: 'run-1',
        runCreatedAt: '2024-01-01T00:00:00.000Z',
        runId: 'run-2',
      }),
    ).toBe('previous')
  })

  it('returns previous when latest run date is missing and ids do not match', () => {
    expect(
      deriveRunStatus({
        latestRunId: 'run-1',
        runCreatedAt: '2024-02-01T00:00:00.000Z',
        runId: 'run-2',
      }),
    ).toBe('previous')
  })

  it('returns draft when a run exists but no latest run is selected', () => {
    expect(
      deriveRunStatus({
        latestRunId: null,
        runCreatedAt: '2024-02-01T00:00:00.000Z',
        runId: 'run-1',
      }),
    ).toBe('draft')
  })
})
