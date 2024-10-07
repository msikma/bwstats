// @dada78641/bwstats, (c) 2024. MIT license.

import {slugifyUrl} from './slugify.js'
import {readCache, writeCache} from './cache.js'

/**
 * Actually performs the live fetch operation.
 * 
 * This returns the data as an object, with "text" being the actual HTML content.
 */
async function _fetchPage(url) {
  try {
    const response = await fetch(url)
    const time = new Date()

    return {text: response.ok ? await response.text() : '', status: response.status, error: !response.ok, time}
  }
  catch (error) {
    return {text: '', status: error.message, error: true, time}
  }
}

/**
 * Fetches the HTML content of a URL, either from cache or from live.
 */
export async function fetchPage(url, useCache = true, maxAgeMs = undefined) {
  if (!useCache) {
    return _fetchPage(url)
  }

  const slug = slugifyUrl(url)
  const cache = await readCache(slug, maxAgeMs)
  if (cache !== null) {
    return cache
  }

  const res = await _fetchPage(url)
  if (res.error) {
    return res
  }
  await writeCache(slug, res)
  return res
}
