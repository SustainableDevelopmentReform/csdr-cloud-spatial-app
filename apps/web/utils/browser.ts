export const getSearchParams = (
  params: Record<string, unknown> | undefined,
) => {
  if (!params) return ''
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null || item === '') {
          continue
        }
        searchParams.append(key, item.toString())
      }
      continue
    }
    searchParams.set(key, value?.toString() ?? '')
  }
  return searchParams.toString()
}
