/**
 * Copie les polices auto-hébergées depuis les paquets @fontsource et génère
 * `src/styles/fonts.css`.
 *
 * Objectif : aucune requête vers un service tiers au chargement de la page.
 * Les polices étaient auparavant servies par fonts.gstatic.com, ce qui
 * transmet l'adresse IP de chaque élève à Google — à proscrire pour un usage
 * scolaire. Elles sont désormais servies par le site lui-même et mises en
 * cache par le service worker pour le fonctionnement hors ligne.
 *
 * Les deux familles sont sous licence SIL Open Font License 1.1, qui autorise
 * la redistribution : les licences sont copiées à côté des fichiers.
 *
 * Lancer après une mise à jour des paquets :  npm run fonts
 */

import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MODULES = resolve(ROOT, 'node_modules/@fontsource')
const FONT_DIR = resolve(ROOT, 'public/fonts')
const CSS_OUT = resolve(ROOT, 'src/styles/fonts.css')

/** Sous-ensembles retenus : le latin couvre le français, l'étendu les autres
 *  langues à alphabet latin enseignées au lycée. */
const SUBSETS = ['latin', 'latin-ext']

const FAMILIES = [
  { pkg: 'hanken-grotesk', family: 'Hanken Grotesk', weights: [400, 500, 600, 700] },
  { pkg: 'ibm-plex-mono', family: 'IBM Plex Mono', weights: [400, 500, 600] },
]

mkdirSync(FONT_DIR, { recursive: true })

const blocks = []
let copied = 0

for (const { pkg, family, weights } of FAMILIES) {
  for (const weight of weights) {
    const css = readFileSync(resolve(MODULES, pkg, `${weight}.css`), 'utf8')

    for (const subset of SUBSETS) {
      const file = `${pkg}-${subset}-${weight}-normal.woff2`
      const source = resolve(MODULES, pkg, 'files', file)
      if (!existsSync(source)) {
        throw new Error(`Fichier de police introuvable : ${file}`)
      }

      // On récupère la plage Unicode officielle du sous-ensemble plutôt que
      // de la recopier à la main : elle évolue avec les paquets amont.
      const marker = `/* ${pkg}-${subset}-${weight}-normal */`
      const start = css.indexOf(marker)
      if (start === -1) throw new Error(`Bloc @font-face introuvable : ${marker}`)
      const range = /unicode-range:\s*([^;]+);/.exec(css.slice(start, start + 900))
      if (!range) throw new Error(`Plage Unicode introuvable : ${marker}`)

      copyFileSync(source, resolve(FONT_DIR, file))
      copied += 1

      blocks.push(
        [
          `@font-face {`,
          `  font-family: '${family}';`,
          `  font-style: normal;`,
          `  font-weight: ${weight};`,
          `  font-display: swap;`,
          `  src: url('/fonts/${file}') format('woff2');`,
          `  unicode-range: ${range[1].trim()};`,
          `}`,
        ].join('\n'),
      )
    }
  }
}

// Licences redistribuées avec les fichiers, comme l'exige l'OFL.
for (const { pkg } of FAMILIES) {
  const license = resolve(MODULES, pkg, 'LICENSE')
  if (existsSync(license)) copyFileSync(license, resolve(FONT_DIR, `LICENSE-${pkg}.txt`))
}

const header = `/*
 * Polices auto-hébergées — généré par \`npm run fonts\`, ne pas modifier à la main.
 *
 * Hanken Grotesk et IBM Plex Mono, SIL Open Font License 1.1 (licences dans
 * public/fonts/). Servies par le site lui-même : aucune requête vers un
 * service tiers, aucune adresse IP transmise à un hébergeur externe.
 */

`

writeFileSync(CSS_OUT, header + blocks.join('\n\n') + '\n')
console.log(`${copied} fichiers de police copiés dans public/fonts/`)
console.log(`${blocks.length} déclarations @font-face écrites dans src/styles/fonts.css`)
