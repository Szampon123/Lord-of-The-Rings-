import { runRefresh } from '../../lib/refresh.js'

export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const payload = await runRefresh()
    return new Response(
      JSON.stringify({ ok: true, meta: payload?.meta }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    console.error('[refresh] full error:', err)
    console.error('[refresh] message:', err?.message)
    console.error('[refresh] stack:', err?.stack)
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
