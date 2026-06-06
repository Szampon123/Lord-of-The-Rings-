import { getCatalog } from '../../lib/blobs.js'

export default async (req, context) => {
  const catalog = await getCatalog()
  if (!catalog) {
    return new Response(
      JSON.stringify({ error: 'No data yet. Trigger a refresh.' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
  return new Response(JSON.stringify(catalog), {
    headers: { 'Content-Type': 'application/json' },
  })
}
