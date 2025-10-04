export const getSearchParams = (
  params: Record<string, unknown> | undefined,
) => {
  if (!params) return ''
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, value?.toString() ?? '')
  }
  return searchParams.toString()
}
