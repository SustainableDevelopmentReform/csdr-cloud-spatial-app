import { type QueryClient } from '@tanstack/react-query'
import { datasetQueryKeys, datasetRunQueryKeys } from '../dataset/_hooks'
import {
  geometriesQueryKeys,
  geometriesRunQueryKeys,
} from '../geometries/_hooks'
import { indicatorQueryKeys } from '../indicator/_hooks'
import { productQueryKeys, productRunQueryKeys } from '../product/_hooks'

// TODO: scope this to only invalidate the queries that are actually affected by the changes (eg specific product run ids)
export const invalidateChartUsageDependencyQueries = async (
  queryClient: QueryClient,
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: indicatorQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: productQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: productRunQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: datasetQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: datasetRunQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: geometriesQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: geometriesRunQueryKeys.all }),
  ])
}
