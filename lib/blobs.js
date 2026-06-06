import { getStore } from '@netlify/blobs'

const STORE_KEY = 'catalog:data'

/**
 * Read the catalog from Netlify Blobs.
 * Returns null if not found or on error.
 */
export async function getCatalog() {
  try {
    const store = getStore('catalog')
    const data = await store.get(STORE_KEY)
    return data ? JSON.parse(data) : null
  } catch (err) {
    console.error('[blobs.getCatalog] failed:', err.message)
    return null
  }
}

/**
 * Write the catalog to Netlify Blobs.
 * Throws on error.
 */
export async function setCatalog(data) {
  try {
    const store = getStore('catalog')
    await store.set(STORE_KEY, JSON.stringify(data))
  } catch (err) {
    console.error('[blobs.setCatalog] failed:', err.message)
    throw err
  }
}
