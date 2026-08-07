// Talks only to your own Worker URL — never to Anthropic directly.
// Set this once you've deployed the worker (see /worker/README.md).
// Two defensive normalisations, since this value is pasted by hand into a
// GitHub secret and both mistakes have happened before:
// - trailing slash(es) are stripped ("…workers.dev/" -> "…workers.dev")
// - a missing "https://" scheme is added back ("project-abc-api...workers.dev"
//   would otherwise be treated as a path on the app's own site, not Cloudflare)
function normalizeWorkerUrl(raw) {
  let url = (raw || '').trim().replace(/\/+$/, '')
  if (url && !/^https?:\/\//i.test(url)) {
    url = `https://${url}`
  }
  return url
}

export const WORKER_URL = normalizeWorkerUrl(import.meta.env.VITE_WORKER_URL)

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
