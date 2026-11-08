export function toURLSearchParams(
  params: Record<string, string | string[] | undefined> = {},
): URLSearchParams {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((item) => search.append(key, item))
    } else if (value) {
      search.set(key, value)
    }
  }
  return search
}
