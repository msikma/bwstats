// @dada78641/bwstats, (c) 2024. MIT license.

import {getMapStatsData, getUpdatedMapCsv} from './tasks/map_stats.js'

/**
 * Returns a map names .csv file with new maps from EloBoard added in.
 */
export function getMapNamesCsv() {
  return getUpdatedMapCsv()
}

/**
 * Returns EloBoard map statistics.
 * 
 * If magAgeMs is set, the data is ensured to be fresh if the cache is older.
 */
export async function getMapStats(maxAgeMs = undefined) {
  return getMapStatsData(maxAgeMs)
}
