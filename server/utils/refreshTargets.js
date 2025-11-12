export const parseRefreshTargets = (rawTargets, fallbackTargets) => {
  const fallback = fallbackTargets && fallbackTargets.length ? fallbackTargets : []
  if (!rawTargets) {
    return fallback.length ? fallback : []
  }

  return rawTargets
    .split(/[;\n]/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((entry) => {
      const [qInput, locInput, pageInput] = entry.split("@").map((piece) => piece.trim())
      return {
        q: qInput || fallback[0]?.q,
        loc: locInput || fallback[0]?.loc,
        page: pageInput ? Number(pageInput) || 1 : 1,
      }
    })
    .filter((target) => target.q && target.loc)
}
