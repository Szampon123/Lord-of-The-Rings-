import { runRefresh } from '../../lib/refresh.js'

export const handler = async (event, context) => {
  try {
    console.log(`[scheduled-refresh] starting`)
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
}
