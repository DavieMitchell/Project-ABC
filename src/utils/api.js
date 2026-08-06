// Talks only to your own Worker URL — never to Anthropic directly.
// Set this once you've deployed the worker (see /worker/README.md).
// Trailing slash(es) are stripped so it doesn't matter how the URL was
// pasted into the GitHub secret — "…workers.dev" and "…workers.dev/" both work.
export const WORKER_URL = (import.meta.env.VITE_WORKER_URL || '').replace(/\/+$/, '')

// input: { text: string, images: [{ data: base64String, mediaType: "image/jpeg" }, ...] }
// Either can be empty, but not both. If images are present, text is treated
// as a description of the photo(s), not a separate item.
// Returns { name, calories, protein, carbs, fat, sugar, saturatedFat, fiber, note }
export async function logFood({ text = '', images = [] }) {
  if (!WORKER_URL) throw new Error('Worker URL not configured yet — see worker/README.md.')
  const res = await fetch(`${WORKER_URL}/log-food`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, images })
  })
  if (!res.ok) {
    const bodyText = await res.text().catch(() => '')
    throw new Error(`Worker error: ${res.status}${bodyText ? ` — ${bodyText}` : ''}`)
  }
  return res.json()
}
