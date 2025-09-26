import { serve } from '@hono/node-server'
import app from './app'
import { env } from './env'

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  () => {
    console.log(`Server is running on http://localhost:${env.PORT}`)
  },
)
