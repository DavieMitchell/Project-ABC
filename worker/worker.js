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

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return cors(new Response(null, { status: 204 }))
    }

    const url = new URL(request.url)

    if (request.method === 'POST' && url.pathname === '/checkin') {
      const { messages } = await request.json()
      const data = await callClaude(env, {
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system:
          'You are a brief, warm daily check-in companion inside a personal ' +
          'health diary app. Ask how the person is doing with food and mood ' +
          'today. Keep replies short (2-4 sentences), never give medical or ' +
          'dosing advice, and suggest talking to a doctor for anything clinical.',
        messages
      })
      const reply = data?.content?.find((b) => b.type === 'text')?.text || ''
      return cors(
        new Response(JSON.stringify({ reply }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    }

    if (request.method === 'POST' && url.pathname === '/estimate-macros') {
      const { image, mediaType } = await request.json()
      const data = await callClaude(env, {
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: image }
              },
              {
                type: 'text',
                text:
                  'Estimate calories and macros (protein/carbs/fat in grams) ' +
                  'for this plate of food. Respond with ONLY JSON in the form ' +
                  '{"calories":0,"protein":0,"carbs":0,"fat":0,"note":""}. ' +
                  'No markdown, no preamble.'
              }
            ]
          }
        ]
      })
      const text = data?.content?.find((b) => b.type === 'text')?.text || '{}'
      let parsed
      try {
        parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      } catch {
        parsed = { calories: null, protein: null, carbs: null, fat: null, note: 'Could not parse estimate — try again.' }
      }
      return cors(
        new Response(JSON.stringify(parsed), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    }

    return cors(new Response('Not found', { status: 404 }))
  }
}
