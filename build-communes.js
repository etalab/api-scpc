#!/usr/bin/env node
const path = require('path')
const {Transform} = require('stream')
const {createGunzip} = require('zlib')
const {parse} = require('JSONStream')
const getStream = require('get-stream')
const got = require('got')
const {writeJson} = require('fs-extra')

const COMMUNES_URL = 'https://cadastre.data.gouv.fr/data/etalab-cadastre/latest/geojson/france/cadastre-france-communes.json.gz'

async function main() {
  let readCount = 0

  const communes = await getStream.array(
    got.stream(COMMUNES_URL, {responseType: 'buffer'})
      .pipe(createGunzip())
      .pipe(parse('features.*'))
      .pipe(new Transform({
        transform(feature, enc, cb) {
          const commune = {
            code: feature.properties.id,
            nom: feature.properties.nom
          }

          readCount++

          if (readCount % 500 === 0) {
            console.log(`${String(readCount).padStart(5, ' ')} communes lues`)
          }

          cb(null, commune)
        },

        objectMode: true
      }))
  )

  await writeJson(path.join(__dirname, 'communes.json'), communes, {spaces: 2})
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
