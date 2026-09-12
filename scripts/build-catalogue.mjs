/**
 * Index des jeux publiés, reconstruit à chaque publication.
 *
 * Un site statique ne sait pas lister un dossier : sans index, l'application
 * ne pourrait joindre un jeu que si l'on connaît son code. Ce script lit les
 * fichiers de « public/c », retient ceux qui se déclarent visibles, et écrit
 * « public/catalogue.json ».
 *
 * Il est volontairement produit et non tenu à la main : un catalogue qui se
 * met à jour tout seul ne peut pas mentir sur ce qui est réellement en ligne.
 *
 * Usage : node scripts/build-catalogue.mjs [dossier] [sortie]
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

const dir = process.argv[2] ?? 'public/c'
const out = process.argv[3] ?? 'public/catalogue.json'

const entries = []

if (existsSync(dir)) {
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    let set
    try {
      set = JSON.parse(readFileSync(join(dir, file), 'utf8'))
    } catch {
      continue // check-sets.mjs a déjà fait échouer la publication le cas échéant
    }
    if (set.format !== 'vdl-flashcards-set') continue
    // Un jeu non listé reste joignable par son code : c'est tout l'intérêt.
    if (set.listed === false) continue

    entries.push({
      code: set.code,
      subject: set.subject,
      deck: set.deck,
      ...(set.level ? { level: set.level } : {}),
      ...(set.by ? { by: set.by } : {}),
      ...(set.description ? { description: set.description } : {}),
      cards: Array.isArray(set.cards) ? set.cards.length : 0,
      publishedAt: set.publishedAt ?? null,
    })
  }
}

/** Ordre scolaire, et non alphabétique : « 1re » vient après « 2de ». */
const LEVELS = ['6e', '5e', '4e', '3e', '2de', '1re', 'Tle']
const rank = (level) => {
  const index = LEVELS.indexOf(level ?? '')
  return index === -1 ? LEVELS.length : index
}

entries.sort(
  (a, b) =>
    a.subject.localeCompare(b.subject, 'fr') ||
    rank(a.level) - rank(b.level) ||
    a.deck.localeCompare(b.deck, 'fr'),
)

const catalogue = {
  format: 'vdl-flashcards-catalogue',
  version: 1,
  builtAt: new Date().toISOString(),
  sets: entries,
}

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(catalogue, null, 2) + '\n', 'utf8')
console.log(`Catalogue écrit : ${entries.length} jeu(x) visible(s) → ${out}`)
