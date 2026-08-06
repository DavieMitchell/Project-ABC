// Project ABC — Cloudflare Worker
//
// This is the ONLY piece of code that ever touches your real Anthropic
// API key. Your phone app calls this worker's URL; this worker calls
// Anthropic; the key never appears in the browser.
//
// Deploy instructions are in worker/README.md.

const ALLOWED_ORIGIN = '*' // tighten to your GitHub Pages URL once deployed

function cors(res) {
  res.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  return res
}

async function callClaude(env, body) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body)
  })
  return res.json()
}

const NUTRITION_INSTRUCTIONS =
  'You are a nutrition estimator inside a food diary app. Given a description ' +
  'or photo of food, respond with ONLY JSON, no markdown, no preamble, in ' +
  'exactly this shape: ' +
  '{"name":"short food name","calories":0,"protein":0,"carbs":0,"fat":0,' +
  '"sugar":0,"saturatedFat":0,"fiber":0,"note":"one short caveat if the estimate is rough"}. ' +
  'All macro values are grams except calories (kcal). Use typical UK portion ' +
  'sizes when the description is vague, and say so briefly in "note". Be as ' +
  'accurate as you reasonably can from the information given — never refuse, ' +
  'always return your best estimate.'

function parseClaudeJSON(data) {
  const text = data?.content?.find((b) => b.type === 'text')?.text || '{}'
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return {
      name: 'Unrecognised entry', calories: 0, protein: 0, carbs: 0, fat: 0,
      sugar: 0, saturatedFat: 0, fiber: 0,
      note: 'Could not read that one — try rewording or retaking the photo.'
    }
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return cors(new Response(null, { status: 204 }))
    }

    const url = new URL(request.url)

    if (request.method === 'POST' && url.pathname === '/log-food') {
      const body = await request.json()
      const text = (body.text || '').trim()
      const images = Array.isArray(body.images) ? body.images : []

      const userContent = []
      for (const img of images) {
        userContent.push({ type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.data } })
      }

      if (images.length && text) {
        // Photo(s) plus a note — the text describes/clarifies the photo,
        // it is not a second, separate food item.
        userContent.push({
          type: 'text',
          text: `Estimate the nutrition for the food shown in the photo${images.length > 1 ? 's' : ''} above. ` +
            `The user's note describes or clarifies what's shown (e.g. brand, portion size, ingredients not visible) — ` +
            `it is not a separate food item, use it to refine the same estimate: "${text}"`
        })
      } else if (images.length) {
        userContent.push({
          type: 'text',
          text: `Estimate the nutrition for the food shown in the photo${images.length > 1 ? 's' : ''} above.`
        })
      } else {
        userContent.push({ type: 'text', text: `Estimate the nutrition for: ${text}` })
      }

      const data = await callClaude(env, {
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        system: NUTRITION_INSTRUCTIONS,
        messages: [{ role: 'user', content: userContent }]
      })

      const parsed = parseClaudeJSON(data)
      return cors(
        new Response(JSON.stringify(parsed), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    }

    return cors(new Response('Not found', { status: 404 }))
  }
}
