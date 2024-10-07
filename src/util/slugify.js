// @dada78641/bwstats, (c) 2024. MIT license.

import {default as _slugify} from '@sindresorhus/slugify'

/**
 * Slugifies a string.
 */
export function slugify(str) {
  return _slugify(
    str,
    {
      separator: '_',
      decamelize: false,
      preserveLeadingUnderscore: true
    }
  )
}

/**
 * Slugifies a URL.
 * 
 * This clears the hash and sorts the search parameters before slugifying.
 */
export function slugifyUrl(url) {
  const obj = new URL(url)
  obj.hash = ''
  obj.searchParams.sort()
  return slugify(obj.toString())
}
