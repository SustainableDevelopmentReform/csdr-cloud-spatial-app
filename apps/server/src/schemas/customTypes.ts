import { customType } from 'drizzle-orm/pg-core'

export interface TstzRange {
  start: Date
  end: Date
  bounds: '[)' | '(]' | '()'
}

export const tstzrange = customType<{
  data: TstzRange
  driverData: string
}>({
  dataType() {
    return 'tstzrange'
  },
  toDriver(value: TstzRange): string {
    const start = value.start.toISOString()
    const end = value.end.toISOString()
    return `${value.bounds[0]}"${start}","${end}"${value.bounds[1]}`
  },
  fromDriver(value: string): TstzRange {
    const boundsString = `${value[0]}${value[value.length - 1]}`
    if (
      boundsString !== '[)' &&
      boundsString !== '(]' &&
      boundsString !== '()'
    ) {
      throw new Error(
        `Invalid tstzrange value: ${value} - Expected bounds to be [), (], or ()`,
      )
    }
    const bounds = boundsString
    const parts = value.substring(2, value.length - 2).split('","')

    if (typeof parts[0] === 'undefined' || typeof parts[1] === 'undefined') {
      throw new Error(`Invalid tstzrange value: ${value}`)
    }

    return {
      start: new Date(parts[0]),
      end: new Date(parts[1]),
      bounds: bounds,
    }
  },
})
