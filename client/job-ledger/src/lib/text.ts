const decodeHtmlEntities = (value: string) => {
  if (typeof window !== 'undefined' && 'DOMParser' in window) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(value, 'text/html')
    return doc.documentElement.textContent ?? value
  }

  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

const stripMarkdownArtifacts = (value: string) =>
  value
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1') // links
    .replace(/[*_`~]+/g, ' ')
    .replace(/\\n|\\r/g, ' ')
    .replace(/•/g, ' ')

export const sanitizeDescription = (value?: string | null) => {
  if (!value) return ''

  const decoded = decodeHtmlEntities(value)
  const stripped = stripMarkdownArtifacts(decoded)
  return stripped.replace(/\s+/g, ' ').trim()
}
