// @dada78641/bwstats, (c) 2024. MIT license.

import {ArgumentParser} from 'argparse'

export async function parseCli() {
  const parser = new ArgumentParser({
    description: 'Fetches various StarCraft: Brood War statistics.'
  })

  parser.add_argument('--map-stats', {help: 'Displays map statistics', action: 'store_true'})
  parser.add_argument('--map-names', {help: 'Print out map names', action: 'store_true'})
  parser.add_argument('--refresh', {help: 'Skips the use of cache', action: 'store_true'})
  
  const args = {...parser.parse_args()}
  const main = await import('./index.js')

  if (args.map_stats) {
    const data = await main.getMapStats(undefined, !args.refresh)
    console.log(JSON.stringify(data, null, 2))
  }
  if (args.map_names) {
    const data = await main.getMapNames(args.refresh)
    console.log(JSON.stringify(data, null, 2))
  }
}
