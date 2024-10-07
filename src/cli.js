// @dada78641/bwstats, (c) 2024. MIT license.

import {ArgumentParser} from 'argparse'

export async function parseCli() {
  const parser = new ArgumentParser({
    description: 'Fetches various StarCraft: Brood War statistics.'
  })

  parser.add_argument('--map-stats', {help: 'Displays map statistics', action: 'store_true'})
  parser.add_argument('--map-csv', {help: 'Print out an updated CSV file', action: 'store_true'})
  
  const args = {...parser.parse_args()}
  const main = await import('./index.js')

  if (args.map_stats) {
    const data = await main.getMapStats()
    console.log(JSON.stringify(data, null, 2))
  }
  if (args.map_csv) {
    const csv = await main.getMapNamesCsv()
    if (!csv) {
      console.error('bwstats.js: error: no CSV updates are available')
    }
    else {
      console.log(csv)
    }
  }
}
