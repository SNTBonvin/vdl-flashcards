/**
 * Fabrique le PDF du guide de l'élève à partir de docs/guide-eleve-impression.html.
 *
 * Le guide existe en trois formes qui ne se remplacent pas : GUIDE-ELEVE.md pour
 * le coller dans l'ENT, la page d'impression pour la mise en page, et ce PDF
 * pour la distribution. La page reste la source de la mise en page ; ce script
 * ne fait que l'imprimer, avec Chromium, sans dépendance ajoutée au projet.
 *
 *   npm i -D playwright && npx playwright install chromium
 *   node scripts/guide-pdf.mjs
 */

import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { chromium } from 'playwright'

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(`file://${racine}/docs/guide-eleve-impression.html`, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.pdf({
  path: `${racine}/docs/Guide-eleve-flashcards.pdf`,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  margin: { top: '15mm', bottom: '17mm', left: '15mm', right: '15mm' },
  headerTemplate: '<div></div>',
  footerTemplate:
    '<div style="width:100%;font-family:sans-serif;font-size:7pt;color:#988e7e;padding:0 15mm;display:flex;justify-content:space-between;">' +
    '<span>Flashcards — Guide de l’élève</span>' +
    '<span class="pageNumber"></span>' +
    '</div>',
})
await browser.close()
console.log('pdf ok')
