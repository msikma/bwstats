// @dada78641/bwstats, (c) 2024. MIT license.

import os from 'node:os'
import path from 'node:path'
import {promises as fs} from 'node:fs'

// By default, let cache live for 24 hours.
const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000

/**
 * Ensures that the cache directory structure exists.
 */
function ensureCachePath() {
  const dirpath = path.join(os.homedir(), '.cache', 'bwstats')
  return fs.mkdir(dirpath, {recursive: true})
}

/**
 * Returns a JSON cache file path for a given slug.
 */
function getCachePath(slug) {
  return path.join(os.homedir(), '.cache', 'bwstats', `${slug}.json`)
}

/**
 * Actually performs the cache read operation.
 */
async function _readCache(filepath, maxAgeMs) {
  const stats = await fs.stat(filepath)

  // Return null if the file is older than our threshold.
  if ((Date.now() - stats.mtimeMs) > maxAgeMs) {
    return null
  }

  const data = JSON.parse(await fs.readFile(filepath, 'utf8'))
  return data
}

/**
 * Reads data from a JSON cache file, if it is within the max age.
 */
export async function readCache(slug, maxAgeMs = DEFAULT_MAX_AGE_MS) {
  await ensureCachePath()
  try {
    const res = await _readCache(getCachePath(slug), maxAgeMs)
    return res
  }
  catch (error) {
    if (error.code === 'ENOENT') {
      return null
    }
    // Throw unexpected errors.
    throw error
  }
}

/**
 * Writes data to a JSON cache file.
 */
export async function writeCache(slug, data) {
  await ensureCachePath()
  await fs.writeFile(getCachePath(slug), JSON.stringify(data, null, 2), 'utf8')
}
