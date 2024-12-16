// @dada78641/bwstats, (c) 2024. MIT license.

import {getMapStatsData, getMapNamesData} from './tasks/map_stats.js'

/**
 * Returns map names in English and Korean.
 * 
 * Will include new maps if they show up on EloBoard.
 */
export async function getMapNames(refresh = false) {
  return getMapNamesData(refresh)
}

/**
 * Returns EloBoard map statistics.
 * 
 * If magAgeMs is set, the data is ensured to be fresh if the cache is older.
 */
export async function getMapStats(maxAgeMs = undefined, useCache = true) {
  return getMapStatsData(maxAgeMs, useCache)
}
