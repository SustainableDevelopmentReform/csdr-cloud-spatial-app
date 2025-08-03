import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { QueryKey } from '~/utils/fetcher'
import { authClient } from '../../../../utils/auth'

export const useGetUserById = (id: string | undefined) => {
  return useQuery({
    queryKey: [QueryKey.UserProfile, id],
    queryFn: async () => {
      if (!id) return null
      const res = await authClient.admin.listUsers({
        query: {
          filterValue: id,
          filterField: 'id',
          filterOperator: 'eq',
        },
      })

      if (res.error) {
        throw res.error
      }

      return res.data.users[0]
    },
    placeholderData: keepPreviousData,
  })
}

// export const useGetAllOrganizations = () =>
//   useQuery({
//     queryKey: [QueryKey.Organizations, QueryKey.AllOrganizations],
//     queryFn: async () => {
//       const res = await client.api.v1.organization.$get({
//         query: {
//           size: '99999',
//         },
//       })

//       const json = await res.json()

//       return json.data.data
//     },
//   })
