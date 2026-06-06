import { schedule } from '@netlify/functions'
import { runRefresh } from '../../lib/refresh.js'

export const handler = schedule('@daily', async () => {
  try {
    console.log(`[scheduled-refresh] starting (${new Date().toISOString()})`)
    const payload = await runRefresh()
    console.log(
      `[scheduled-refresh] done: ${payload?.meta?.setCount ?? 0} sets`
    )
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        sets: payload?.meta?.setCount,
      }),
    }
  } catch (error) {
    console.error('[scheduled-refresh] failed:', error.message)
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: error.message,
      }),
    }
  }
})
