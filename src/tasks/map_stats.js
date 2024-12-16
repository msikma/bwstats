// @dada78641/bwstats, (c) 2024. MIT license.

import orderBy from 'lodash.orderby'
import * as cheerio from 'cheerio'
import {maps} from '@dada78641/bwmapnames'
import {readCache, writeCache} from '../util/cache.js'
import {fetchPage} from '../util/fetch.js'

// URL to the map stats page on EloBoard.
const URL_MAP_STATS = `https://eloboard.com/men/bbs/board.php?bo_table=map_stac`

// Minimum number of games for us to consider the map statistics useful.
const STATISTICAL_SIGNIFICANCE = 30

// Names used to create the map nicknames.
const sagiNames = {
  T: 'Tesagi',
  P: 'Pusagi',
  Z: 'Zesagi',
}

/**
 * Returns a translated map name.
 */
function getTranslatedMapName(nameKor, srcL, dstL) {
  const foundMap = maps.find(map => map[srcL] === nameKor)
  return foundMap[dstL]
}

/**
 * Extracts the wins, losses, number of games and the win/loss ratio from a map stats table cell.
 */
function extractWinsLosses(text) {
  const matches = text.match(/([0-9]+)승\s?([0-9]+)패/)
  const wins = Number(matches[1])
  const losses = Number(matches[2])
  const games = wins + losses
  const ratio = games === 0 ? null : wins / games
  return {wins, losses, games, ratio}
}

/**
 * Extracts wins/losses from matchups cells.
 */
function extractMatchups(items) {
  return items.map(item => {
    const code = item.slice(0, 3).split('-')
    const matches = extractWinsLosses(item)
    return [code.map(i => i.toUpperCase()).join('v'), matches]
  })
}

/**
 * Creates a nickname for a map where a certain race is the strongest.
 */
function makeNickname(name, race, isKnownMap) {
  // If we don't have a translation for this map name, don't bother trying to create a nickname.
  if (!isKnownMap) {
    return null
  }
  const nickname = makeSimpleNickname(name, race)
  if (nickname === name) {
    return makeComplicatedNickname(name, race)
  }
  return nickname
}

/**
 * Creates a "simple" nickname for a map where a certain race is the strongest.
 * 
 * This is the regular way of making a nickname, by appending a letter.
 */
function makeSimpleNickname(name, race) {
  const nameLower = `${name.slice(0, 1).toLowerCase()}${name.slice(1)}`
  const startsWithVowel = !!nameLower[0].match(/[aiueo]/)

  if (startsWithVowel) {
    return `${race.toUpperCase()}${nameLower}`
  }
  else {
    return `${race.toUpperCase()}${nameLower.slice(1)}`
  }
}

/**
 * Creates a "complicated" nickname for a map where a certain race is the strongest.
 * 
 * This code runs when a "simple" nickname results in the nickname being the same as the normal name.
 */
function makeComplicatedNickname(name, race) {
  const items = name.trim().split(' ')
  if (items.length === 1) {
    // One item: replace the start substring only.
    const vowel = name.match(/^([aeiou]+)/i)
    if (vowel) {
      return [sagiNames[race.toUpperCase()], name.slice(vowel[1].length)].join('')
    }

    const consonant = name.match(/^([^aiueo][aiueoy]?)/i)
    if (consonant) {
      return [sagiNames[race.toUpperCase()], name.slice(consonant[1].length)].join('')
    }
  }
  if (items.length > 1) {
    // Multiple items: replace the whole first word.
    return [sagiNames[race.toUpperCase()], ...items.slice(1)].join(' ')
  }
}

/**
 * Generates metadata for a given map.
 * 
 * This includes the best race for the given map, and a map nickname.
 */
function calculateMeta(map) {
  const races = Object.entries(map.statsPerRace).map(race => ({...race[1], race: race[0]}))
  const ordered = orderBy(races, 'ratio', 'desc')
  const best = ordered[0].race
  const nickname = makeNickname(map.name, best, !map.isUnknownMap)

  return {
    bestRace: best,
    nickname,
  }
}

/**
 * Extracts win rate data from the table rows on the stats page.
 */
function extractMapsData($, rows) {
  const maps = {}

  // Since each map has two rows associated with it, we need to keep track of the current map.
  // Either a string or null.
  let currMapKey = null

  // Number of rows that failed to parse for some reason. Should always be zero.
  let rowParseFailures = 0

  // Number of maps with a name we are unfamiliar with. These will parse successfully,
  // but they won't have an English name.
  let unknownMaps = 0

  rows.forEach(row => {
    try {
      const rowMap = $('> td:nth-child(1)', row)
      const rowZerg = $('> td:nth-child(2)', row)
      const rowProtoss = $('> td:nth-child(3)', row)
      const rowTerran = $('> td:nth-child(4)', row)
    
      if (currMapKey === null) {
        const rowMapContent = rowMap.text().trim()
        const rowMapSplit = rowMapContent.match(/(.+?)\(([0-9]+)\)/)
        
        // The last row on the page has no content.
        if (rowMapSplit === null) {
          return
        }
    
        // Determine the English name for this map.
        // If we don't have this map's translation in the database, this will be null.
        const currMapNameKor = rowMapSplit[1].trim()
        const currMapName = getTranslatedMapName(currMapNameKor, 'kor', 'eng')
        currMapKey = currMapName ? currMapName : currMapNameKor
        
        const isKnownMap = currMapName != null
        if (!maps[currMapKey]) {
          maps[currMapKey] = {}
        }

        maps[currMapKey].name = isKnownMap ? currMapName : rowMapSplit[1]
        maps[currMapKey].numberOfGames = Number(rowMapSplit[2].trim())
        maps[currMapKey].isStatisticallySignificant = maps[currMapKey].numberOfGames >= STATISTICAL_SIGNIFICANCE
        maps[currMapKey].isUnknownMap = !isKnownMap

        if (!isKnownMap) {
          unknownMaps += 1
        }
    
        $('strong', rowZerg).remove()
        $('strong', rowProtoss).remove()
        $('strong', rowTerran).remove()
    
        maps[currMapKey].statsPerRace = {
          Z: extractWinsLosses(rowZerg.text().trim()),
          P: extractWinsLosses(rowProtoss.text().trim()),
          T: extractWinsLosses(rowTerran.text().trim()),
        }
    
        return
      }
    
      const matchups = [
        ...extractMatchups(rowZerg.html().split('<br>').map(i => i.trim())),
        ...extractMatchups(rowProtoss.html().split('<br>').map(i => i.trim())),
        ...extractMatchups(rowTerran.html().split('<br>').map(i => i.trim())),
      ]
    
      maps[currMapKey].statsPerMatchup = Object.fromEntries(matchups)
      maps[currMapKey].meta = calculateMeta(maps[currMapKey])
    
      currMapKey = null
    }
    catch (err) {
      // If something goes wrong, we'll assume that the HTML structure has changed in some way.
      // In that case, all bets are off and we should just return nothing.

      // Also, set currMapKey to null so we don't assume the next row is relevant to the previous.
      currMapKey = null

      rowParseFailures += 1
    }
  })

  return [
    orderBy(maps, 'numberOfGames', 'desc'),
    unknownMaps,
    rowParseFailures,
  ]
}

/**
 * Extracts map statistics from the EloBoard map stats page.
 * 
 * Takes a Cheerio object.
 */
function extractData($, res) {
  const listBoard = $('.list-board table tbody')
  
  const rows = $('> tr', listBoard).get()
  const [maps, unknownMaps, rowParseFailures] = extractMapsData($, rows)

  return {
    maps,
    fetchTime: new Date(res.time),
    unknownMaps,
    rowParseFailures,
    statisticalSignificanceMinimum: STATISTICAL_SIGNIFICANCE,
  }
}

/**
 * Returns the map CSV file with placeholders for new maps.
 * 
 * This is used to update the map-names.csv file in the @dada78641/bwtoolsdata package.
 * As new maps are designed and added, these will get added to the EloBoard maps page.
 * These new maps need have their Korean and English names added to the map-names.csv file.
 * 
 * This function retrieves the map stats data and then return the original CSV file with
 * new maps added in with the English name listed as "PLACEHOLDER" in all caps.
 * 
 * If there are no new maps, this function will return null.
 */
export async function getMapNamesData(refresh = false) {
  const data = await getMapStatsData(undefined, !refresh)

  // List the number of unknown maps we've found. Usually an empty array.
  const unknownMaps = data.maps.filter(map => map.isUnknownMap)
  const newData = {
    lastUpdated: new Date().toISOString(),
    maps: [...maps, ...unknownMaps.map(map => ({eng: null, kor: map.name}))].sort(),
  }

  return newData
}

/**
 * Actually retrieves the EloBoard map stats, if no cache is available.
 */
async function _getMapStatsData(maxAgeMs = undefined, useCache = true) {
  const res = await fetchPage(URL_MAP_STATS, useCache, maxAgeMs)
  const $ = cheerio.load(res.text)
  const data = extractData($, res)
  return data
}

/**
 * Retrieves the remote EloBoard map stats page (or loads it from cache), parses it,
 * and returns the data.
 * 
 * maxAgeMs is used to determine if cache should be used, or if a fresh copy should be fetched.
 * If it's set to undefined, the default cache duration is used.
 */
export async function getMapStatsData(maxAgeMs = undefined, useCache = true) {
  // Attempt to load the generated map stats data from cache.
  const cachedData = await readCache('MapStatsData')
  if (cachedData && useCache) {
    return cachedData.data
  }

  // Fetch fresh data, write it to cache, and return it.
  const data = await _getMapStatsData(maxAgeMs, useCache)
  await writeCache('MapStatsData', {data})
  return data
}
