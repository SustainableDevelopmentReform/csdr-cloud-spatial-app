import { env } from '../env'

export const buildInfo = {
  name: 'csdr-cloud-spatial-app',
  version: env.APP_VERSION,
  commit: env.APP_COMMIT ?? null,
  buildTime: env.APP_BUILD_TIME ?? null,
  image: env.APP_IMAGE ?? null,
  environment: env.NODE_ENV,
}
