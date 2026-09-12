/**
 * Vérification des jeux publiés, avant que le site ne parte en ligne.
 *
 * Un code mort — fichier mal nommé, JSON abîmé, identifiant de partage absent —
 * ne se voit qu'au moment où trente élèves le tapent en même temps. Autant
 * qu'il fasse échouer la publication.
 *
 * Usage : node scripts/check-sets.mjs [dossier]   (par défaut « public/c »)
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'

const dir = process.argv[2] ?? 'public/c'
const CODE = /^[A-Z0-9][A-Z0-9-]{1,23}$/

if (!existsSync(dir)) {
  console.log(`Aucun jeu publié (${dir} absent).`)
  process.exit(0)
}

const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
const errors = []
const seen = new Map()

for (const file of files) {
  const code = basename(file, '.json')
  const where = `${dir}/${file}`

  if (!CODE.test(code)) {
    errors.push(`${where} : le nom du fichier n'est pas un code valide (majuscules, chiffres, tirets).`)
    continue
  }

  let set
  try {
    set = JSON.parse(readFileSync(join(dir, file), 'utf8'))
  } catch (e) {
    errors.push(`${where} : JSON illisible — ${e.message}`)
    continue
  }

  if (set.format !== 'vdl-flashcards-set') {
    errors.push(`${where} : ce n'est pas un jeu de cartes (format attendu « vdl-flashcards-set »).`)
    continue
  }
  if (set.code !== code) {
    errors.push(`${where} : le code interne « ${set.code} » ne correspond pas au nom du fichier.`)
  }
  if (typeof set.shareId !== 'string' || set.shareId.length === 0) {
    errors.push(`${where} : identifiant de partage absent — deux jeux se confondraient chez l'élève.`)
  }
  if (!Array.isArray(set.cards) || set.cards.length === 0) {
    errors.push(`${where} : aucune carte.`)
  } else {
    const bad = set.cards.findIndex(
      (c) => !Array.isArray(c) || typeof c[0] !== 'string' || typeof c[1] !== 'string' || !c[0].trim() || !c[1].trim(),
    )
    if (bad >= 0) errors.push(`${where} : la carte n° ${bad + 1} n'a pas de recto et de verso.`)
  }

  const previous = seen.get(set.shareId)
  if (previous && set.shareId) {
    // Deux codes pour un même thème sont légitimes (des lots successifs),
    // mais deux fichiers identiques trahissent en général une erreur.
    console.log(`Note : « ${code} » et « ${previous} » publient le même thème.`)
  }
  seen.set(set.shareId, code)
}

if (errors.length > 0) {
  console.error(`\n${errors.length} problème(s) dans les jeux publiés :\n`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log(`${files.length} jeu(x) publié(s), tous valides.`)
