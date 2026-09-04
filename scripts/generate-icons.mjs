/**
 * Génère les icônes PNG de la PWA sans dépendance externe :
 * petit rasteriseur (rectangles arrondis, anticrénelage par sur-échantillonnage)
 * puis encodage PNG via zlib.
 *
 * Motif : deux cartes superposées, en papier crème sur vert sapin.
 */

import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public/icons')

const GREEN = [0x27, 0x5f, 0x4a]
const PAPER = [0xf6, 0xf4, 0xee]
const SURFACE = [0xff, 0xfd, 0xf8]

/* ------------------------------ Rasteriseur ------------------------------ */

function createCanvas(size, [r, g, b]) {
  const data = new Uint8Array(size * size * 3)
  for (let i = 0; i < size * size; i++) {
    data[i * 3] = r
    data[i * 3 + 1] = g
    data[i * 3 + 2] = b
  }
  return { size, data }
}

const insideRoundRect = (px, py, x, y, w, h, radius) => {
  if (px < x || py < y || px > x + w || py > y + h) return false
  const cx = Math.min(Math.max(px, x + radius), x + w - radius)
  const cy = Math.min(Math.max(py, y + radius), y + h - radius)
  const dx = px - cx
  const dy = py - cy
  return dx * dx + dy * dy <= radius * radius
}

/** Remplit un rectangle arrondi avec 4×4 échantillons par pixel. */
function fillRoundRect(canvas, x, y, w, h, radius, [r, g, b], alpha = 1) {
  const { size, data } = canvas
  const x0 = Math.max(0, Math.floor(x))
  const y0 = Math.max(0, Math.floor(y))
  const x1 = Math.min(size, Math.ceil(x + w))
  const y1 = Math.min(size, Math.ceil(y + h))
  const samples = 4
  const step = 1 / samples

  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      let hits = 0
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          if (insideRoundRect(px + (sx + 0.5) * step, py + (sy + 0.5) * step, x, y, w, h, radius)) hits++
        }
      }
      if (hits === 0) continue
      const coverage = (hits / (samples * samples)) * alpha
      const i = (py * size + px) * 3
      data[i] = Math.round(data[i] * (1 - coverage) + r * coverage)
      data[i + 1] = Math.round(data[i + 1] * (1 - coverage) + g * coverage)
      data[i + 2] = Math.round(data[i + 2] * (1 - coverage) + b * coverage)
    }
  }
}

/* ------------------------------- Encodeur PNG ---------------------------- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, payload) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(payload.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), payload])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function encodePng({ size, data }) {
  const raw = Buffer.alloc(size * (size * 3 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0 // filtre « none »
    Buffer.from(data.buffer, y * size * 3, size * 3).copy(raw, y * (size * 3 + 1) + 1)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // profondeur
  ihdr[9] = 2 // couleur RVB
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* --------------------------------- Motif --------------------------------- */

/**
 * @param {number} size côté en pixels
 * @param {number} inset marge relative autour du motif (0 = plein cadre)
 */
function drawIcon(size, inset) {
  const canvas = createCanvas(size, GREEN)
  const u = size / 100

  const cardW = (100 - inset * 2) * 0.62 * u
  const cardH = cardW * 1.28
  const radius = cardW * 0.16
  const cx = size / 2
  const cy = size / 2

  // Carte du fond, décalée en haut à gauche.
  fillRoundRect(
    canvas,
    cx - cardW / 2 - cardW * 0.13,
    cy - cardH / 2 - cardH * 0.09,
    cardW,
    cardH,
    radius,
    PAPER,
    0.42,
  )

  // Carte de premier plan.
  fillRoundRect(
    canvas,
    cx - cardW / 2 + cardW * 0.11,
    cy - cardH / 2 + cardH * 0.08,
    cardW,
    cardH,
    radius,
    SURFACE,
    1,
  )

  // Deux filets qui suggèrent le texte de la carte.
  const lineX = cx - cardW / 2 + cardW * 0.11 + cardW * 0.18
  const lineW = cardW * 0.64
  const lineH = Math.max(2, cardH * 0.055)
  fillRoundRect(canvas, lineX, cy - cardH * 0.06, lineW, lineH, lineH / 2, GREEN, 0.85)
  fillRoundRect(canvas, lineX, cy + cardH * 0.09, lineW * 0.62, lineH, lineH / 2, GREEN, 0.45)

  return canvas
}

function write(name, canvas) {
  writeFileSync(resolve(OUT, name), encodePng(canvas))
  console.log(`  ${name}`)
}

mkdirSync(OUT, { recursive: true })
console.log('Génération des icônes :')
write('icon-192.png', drawIcon(192, 16))
write('icon-512.png', drawIcon(512, 16))
write('icon-maskable-512.png', drawIcon(512, 26))
write('apple-touch-icon.png', drawIcon(180, 14))
write('favicon.png', drawIcon(64, 12))
