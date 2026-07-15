// Talks only to your own Worker URL — never to Anthropic directly.
// Set this once you've deployed the worker (see /worker/README.md).
const WORKER_URL = import.meta.env.VITE_WORKER_URL || ''

export async function checkInChat(messages) {
  if (!WORKER_URL) throw new Error('Worker URL not configured yet.')
  const res = await fetch(`${WORKER_URL}/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages })
  })
  if (!res.ok) throw new Error(`Worker error: ${res.status}`)
  return res.json() // { reply: "..." }
}

export async function estimateMacrosFromPhoto(base64Image, mediaType) {
  if (!WORKER_URL) throw new Error('Worker URL not configured yet.')
  const res = await fetch(`${WORKER_URL}/estimate-macros`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image, mediaType })
  })
  if (!res.ok) throw new Error(`Worker error: ${res.status}`)
  return res.json() // { calories, protein, carbs, fat, note }
}
