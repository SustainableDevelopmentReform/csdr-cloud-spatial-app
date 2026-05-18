import type { TimeChangeBaseline, TimeChangeMode } from './chart-primitives'

export type TimeChangeSupportedMode = Exclude<TimeChangeMode, 'none'>

export type TimeChangeRecord = {
  id: string
  value: number
  timePoint: Date | string
  indicatorName?: string | null
  geometryOutputName?: string | null
  [key: string]: unknown
}

export type TimeChangeTransformedRecord<TRecord extends TimeChangeRecord> =
  TRecord & {
    /** Original raw product-output value before the transform was applied. */
    rawValue?: number
    /** Previous raw value used to calculate this step-over-step change. */
    baselineValue?: number
    /** Previous time point used to calculate this step-over-step change. */
    baselineTimePoint?: Date | string
    /** Product output id for the previous point used in the calculation. */
    baselineProductOutputId?: string
    /** Applied time-change mode, omitted when raw values are used. */
    timeChangeMode?: TimeChangeSupportedMode
  }

export type TimeChangeTransformOptions = {
  /** Transform mode. `none` returns raw values unchanged. */
  mode?: TimeChangeMode
  /** Baseline selector. Only `firstTimePoint` is supported in v1. */
  baseline?: TimeChangeBaseline
  /**
   * Record fields that define an independent series.
   *
   * Defaults to indicator plus geometry so each indicator/boundary time series
   * gets its own previous-point comparisons.
   */
  groupKeys?: readonly string[]
  /** Field containing the time point used for sorting each series. */
  timeKey?: string
  /** Numeric field to transform. Defaults to `value`. */
  valueKey?: string
}

export type TimeChangeCapability = {
  /**
   * Non-raw transform modes this chart can render.
   *
   * Keep this chart-owned. Do not infer support from subtype names in host apps.
   */
  modes: readonly TimeChangeSupportedMode[]
  /** Default mode used when the persisted chart omits `transform`. */
  defaultMode: 'none'
  /** Baseline strategy supported by this chart capability. */
  baseline: TimeChangeBaseline
}

const DEFAULT_GROUP_KEYS = ['indicatorName', 'geometryOutputName']
const DEFAULT_TIME_KEY = 'timePoint'
const DEFAULT_VALUE_KEY = 'value'

function field(record: Record<string, unknown>, key: string): unknown {
  return record[key]
}

function toTimeSortKey(value: unknown): number {
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string') {
    const parsed = new Date(value).getTime()
    if (!Number.isNaN(parsed)) return parsed
  }
  return Number.MAX_SAFE_INTEGER
}

function toGroupPart(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  return String(value ?? '')
}

function toGroupKey(record: TimeChangeRecord, groupKeys: readonly string[]) {
  return groupKeys.map((key) => toGroupPart(field(record, key))).join('\u001F')
}

function sortByTime<TRecord extends TimeChangeRecord>(
  records: readonly TRecord[],
  timeKey: string,
): TRecord[] {
  return [...records].sort(
    (a, b) =>
      toTimeSortKey(field(a, timeKey)) - toTimeSortKey(field(b, timeKey)),
  )
}

/**
 * Group records into independent time series before applying a transform.
 */
export function groupRecordsForTimeChange<TRecord extends TimeChangeRecord>(
  records: readonly TRecord[],
  groupKeys: readonly string[] = DEFAULT_GROUP_KEYS,
): Map<string, TRecord[]> {
  const groups = new Map<string, TRecord[]>()

  for (const record of records) {
    const key = toGroupKey(record, groupKeys)
    const current = groups.get(key) ?? []
    current.push(record)
    groups.set(key, current)
  }

  return groups
}

/**
 * Return the first time point in a series after chronological sorting.
 */
export function getTimeChangeBaseline<TRecord extends TimeChangeRecord>(
  records: readonly TRecord[],
  options: Pick<TimeChangeTransformOptions, 'timeKey' | 'valueKey'> = {},
): TRecord | null {
  const timeKey = options.timeKey ?? DEFAULT_TIME_KEY
  const valueKey = options.valueKey ?? DEFAULT_VALUE_KEY
  const sorted = sortByTime(records, timeKey)

  return (
    sorted.find((record) => typeof field(record, valueKey) === 'number') ?? null
  )
}

/**
 * Declare that a chart definition can render change-over-time values.
 */
export function supportsTimeChangeTransform({
  modes,
  defaultMode = 'none',
  baseline = 'firstTimePoint',
}: {
  modes: readonly TimeChangeSupportedMode[]
  defaultMode?: 'none'
  baseline?: TimeChangeBaseline
}): TimeChangeCapability {
  return {
    modes,
    defaultMode,
    baseline,
  }
}

/**
 * Apply a step-over-step delta or percent-delta transform to product outputs.
 *
 * The original record `id` is preserved so selection can still resolve the
 * current product output. Percent changes with a zero previous value are skipped
 * because they cannot produce a finite value.
 */
export function applyTimeChangeTransform<TRecord extends TimeChangeRecord>(
  records: readonly TRecord[],
  options: TimeChangeTransformOptions = {},
): TimeChangeTransformedRecord<TRecord>[] {
  const mode = options.mode ?? 'none'
  if (mode === 'none') return [...records]

  const baselineMode = options.baseline ?? 'firstTimePoint'
  if (baselineMode !== 'firstTimePoint') return [...records]

  const groupKeys = options.groupKeys ?? DEFAULT_GROUP_KEYS
  const timeKey = options.timeKey ?? DEFAULT_TIME_KEY
  const valueKey = options.valueKey ?? DEFAULT_VALUE_KEY
  const groups = groupRecordsForTimeChange(records, groupKeys)
  const transformed: TimeChangeTransformedRecord<TRecord>[] = []

  for (const groupRecords of groups.values()) {
    const sorted = sortByTime(groupRecords, timeKey)
    let previousRecord: TRecord | null = null

    for (const record of sorted) {
      const rawValue = field(record, valueKey)
      if (typeof rawValue !== 'number') continue

      if (!previousRecord) {
        previousRecord = record
        continue
      }

      const baselineValue = field(previousRecord, valueKey)
      if (typeof baselineValue !== 'number') {
        previousRecord = record
        continue
      }

      if (mode === 'percentDelta' && baselineValue === 0) {
        previousRecord = record
        continue
      }

      const value =
        mode === 'delta'
          ? rawValue - baselineValue
          : ((rawValue - baselineValue) / baselineValue) * 100

      transformed.push({
        ...record,
        value,
        rawValue,
        baselineValue,
        baselineTimePoint: previousRecord.timePoint,
        baselineProductOutputId: previousRecord.id,
        timeChangeMode: mode,
      })
      previousRecord = record
    }
  }

  return transformed
}
