// Exports all published content to content/seed.ndjson — Sanity's dataset
// import format — so the demo dataset can be rebuilt from the repo.
//
//   npm run content:backup   (writes content/seed.ndjson)
//   npm run content:seed     (imports it via `sanity dataset import`)
//
// Standalone script, so it uses @sanity/client directly (the app itself
// derives its clients from the sanity:client virtual module instead).
import { createClient } from '@sanity/client'
import { mkdirSync, writeFileSync } from 'node:fs'

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID ?? 'im07utyl',
  dataset: process.env.PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2026-07-01',
  useCdn: false,
  token: process.env.SANITY_API_READ_TOKEN,
})

const TYPES = ['settings', 'post', 'question']
// Published docs only; system fields regenerate on import.
const STRIP = ['_rev', '_createdAt', '_updatedAt']

const docs = await client.fetch(
  `*[_type in $types && !(_id in path("drafts.**"))] | order(_id asc)`,
  { types: TYPES }
)

const lines = docs.map((doc) => {
  for (const key of STRIP) delete doc[key]
  return JSON.stringify(doc)
})

mkdirSync('content', { recursive: true })
writeFileSync('content/seed.ndjson', lines.join('\n') + '\n')

const byType = docs.reduce((acc, d) => ((acc[d._type] = (acc[d._type] ?? 0) + 1), acc), {})
console.log(`Wrote ${docs.length} documents to content/seed.ndjson`, byType)
