import { getCatalog } from '../../lib/blobs.js'

export default async (req, context) => {
  const catalog = await getCatalog()
  const meta = catalog?.meta || {
    generatedAt: null,
    setCount: 0,
    notes: ['No data gathered yet.'],
  }
  return new Response(JSON.stringify(meta), {
    headers: { 'Content-Type': 'application/json' },
  })
}
