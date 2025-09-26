import type app from './app'
import { hc } from 'hono/client'

// this is a trick to calculate the type when compiling
export type Client = ReturnType<typeof hc<typeof app>>

export const hcWithType = (...args: Parameters<typeof hc>): Client =>
  hc<typeof app>(...args)
