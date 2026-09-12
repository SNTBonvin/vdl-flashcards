/**
 * Import et export des données.
 *
 * Quatre formats :
 *  - JSON sauvegarde : intégrale (matières, thèmes, cartes, historique,
 *            réglages) — c'est le format pour changer de téléphone. À la
 *            restauration, il remplace tout.
 *  - JSON paquet : un jeu de cartes seul, sans progression ni réglages. C'est
 *            ce qu'on exporte d'une matière, d'un thème ou d'un lot, et ce qui
 *            s'importe *dans* un thème sans rien écraser.
 *  - CSV   : tableur, une carte par ligne.
 *  - Texte : collage rapide « recto ; verso », compatible avec un export Anki
 *            en tabulations ou une liste rédigée à la main.
 */

import type { Backup, Card, Deck, Distribution, Settings, Subject } from '../db/types'

/* ------------------------------- Export -------------------------------- */

export function buildBackup(data: {
  subjects: Subject[]
  decks: Deck[]
  cards: Card[]
  logs: Backup['logs']
  distributions: Distribution[]
  settings: Settings
}): Backup {
  return {
    format: 'vdl-flashcards',
    version: 1,
    exportedAt: new Date().toISOString(),
    subjects: data.subjects,
    decks: data.decks,
    cards: data.cards,
    logs: data.logs,
    distributions: data.distributions,
    settings: data.settings,
  }
}

/** Paquet de cartes : un export partiel, qui s'importe dans un thème. */
export interface CardsFile {
  format: 'vdl-flashcards-cards'
  version: 1
  exportedAt: string
  /** D'où vient le paquet, à titre indicatif : « SVT › Biodiversité ». */
  label: string
  cards: {
    front: string
    back: string
    notes?: string
    tags?: string[]
    subject?: string
    deck?: string
  }[]
}

export function buildCardsFile(
  label: string,
  rows: { subject: string; deck: string; card: Card }[],
): CardsFile {
  return {
    format: 'vdl-flashcards-cards',
    version: 1,
    exportedAt: new Date().toISOString(),
    label,
    // La progression n'est volontairement pas exportée : elle appartient à
    // celui qui a révisé, et un paquet est fait pour être donné.
    cards: rows.map(({ subject, deck, card }) => ({
      front: card.front,
      back: card.back,
      notes: card.notes || undefined,
      tags: card.tags.length > 0 ? card.tags : undefined,
      subject,
      deck,
    })),
  }
}

function escapeCsv(value: string): string {
  return /[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function buildCsv(rows: { subject: string; deck: string; card: Card }[]): string {
  const header = ['matiere', 'categorie', 'recto', 'verso', 'notes', 'etiquettes', 'echeance']
  const lines = rows.map(({ subject, deck, card }) =>
    [
      subject,
      deck,
      card.front,
      card.back,
      card.notes,
      card.tags.join(' '),
      card.srs.state === 'new' ? '' : new Date(card.srs.due).toISOString().slice(0, 10),
    ]
      .map((v) => escapeCsv(v ?? ''))
      .join(','),
  )
  return [header.join(','), ...lines].join('\n')
}

export function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function stamp(): string {
  const d = new Date()
  const p = (n: number) => `${n}`.padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/* ------------------------------- Import -------------------------------- */

export interface ParsedRow {
  front: string
  back: string
  notes?: string
  tags?: string[]
}

/**
 * Lit un fichier de cartes, quel que soit son format : paquet JSON, sauvegarde
 * intégrale (on n'en retient alors que les cartes), tableau JSON brut, ou bien
 * CSV, TSV et texte collé. Renvoie toujours des lignes prêtes à importer.
 *
 * Rien n'est deviné en silence : un JSON qu'on ne sait pas lire lève une
 * erreur explicite plutôt que de produire un import vide.
 */
export function parseCardsText(text: string): ParsedRow[] {
  const trimmed = text.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return parseRows(text)

  let data: unknown
  try {
    data = JSON.parse(trimmed)
  } catch {
    throw new ImportError('Ce fichier JSON est illisible.')
  }

  const list = Array.isArray(data)
    ? data
    : typeof data === 'object' && data !== null && Array.isArray((data as { cards?: unknown }).cards)
      ? (data as { cards: unknown[] }).cards
      : null
  if (!list) throw new ImportError('Ce fichier JSON ne contient pas de cartes.')

  const rows: ParsedRow[] = []
  for (const item of list) {
    if (typeof item !== 'object' || item === null) continue
    const card = item as { front?: unknown; back?: unknown; notes?: unknown; tags?: unknown }
    if (typeof card.front !== 'string' || typeof card.back !== 'string') continue
    if (!card.front.trim() || !card.back.trim()) continue
    rows.push({
      front: card.front,
      back: card.back,
      notes: typeof card.notes === 'string' ? card.notes : undefined,
      tags: Array.isArray(card.tags) ? card.tags.filter((t): t is string => typeof t === 'string') : [],
    })
  }
  if (rows.length === 0) throw new ImportError('Aucune carte lisible dans ce fichier.')
  return rows
}

/** Analyse une ligne CSV en tenant compte des guillemets doublés. */
function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += ch
    } else if (ch === '"') {
      quoted = true
    } else if (ch === delimiter) {
      out.push(field)
      field = ''
    } else {
      field += ch
    }
  }
  out.push(field)
  return out.map((f) => f.trim())
}

/** Devine le séparateur le plus probable d'une ligne. */
function detectDelimiter(sample: string): string {
  const candidates = ['\t', ';', ',', '|']
  let best = '\t'
  let bestCount = 0
  for (const c of candidates) {
    const count = sample.split(c).length - 1
    if (count > bestCount) {
      best = c
      bestCount = count
    }
  }
  return bestCount === 0 ? '\t' : best
}

/**
 * Convertit un texte collé ou un fichier CSV/TSV en lignes de cartes.
 * La première ligne est ignorée si elle ressemble à un en-tête.
 */
export function parseRows(text: string, forcedDelimiter?: string): ParsedRow[] {
  const clean = text.replace(/\r\n?/g, '\n').trim()
  if (!clean) return []

  const lines = clean.split('\n').filter((l) => l.trim().length > 0)
  const delimiter = forcedDelimiter ?? detectDelimiter(lines[0])

  const rows: ParsedRow[] = []
  for (const [index, line] of lines.entries()) {
    const cells = splitCsvLine(line, delimiter)
    if (cells.length < 2) continue

    // En-tête classique : on saute la première ligne.
    if (index === 0) {
      const head = cells.map((c) => c.toLowerCase())
      if (head[0].startsWith('recto') || head[0] === 'front' || head[0] === 'question') continue
      if (head.includes('recto') && head.includes('verso')) continue
    }

    // Format complet (export de l'application) : matière, thème, recto, verso…
    const full = cells.length >= 6 && cells[2] !== '' && cells[3] !== ''
    const front = full ? cells[2] : cells[0]
    const back = full ? cells[3] : cells[1]
    if (!front || !back) continue

    rows.push({
      front,
      back,
      notes: full ? cells[4] : cells[2],
      tags: (full ? cells[5] : cells[3])?.split(/[\s,]+/).filter(Boolean) ?? [],
    })
  }
  return rows
}

export class ImportError extends Error {}

/** Valide un fichier de sauvegarde JSON avant restauration. */
export function parseBackup(text: string): Backup {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new ImportError("Ce fichier n'est pas du JSON valide.")
  }

  const data = raw as Partial<Backup>
  if (!data || typeof data !== 'object') throw new ImportError('Fichier de sauvegarde illisible.')
  if (data.format !== 'vdl-flashcards') {
    throw new ImportError("Ce fichier ne provient pas de l'application.")
  }
  if (!Array.isArray(data.subjects) || !Array.isArray(data.decks) || !Array.isArray(data.cards)) {
    throw new ImportError('Sauvegarde incomplète : matières, thèmes ou cartes manquantes.')
  }

  return {
    format: 'vdl-flashcards',
    version: 1,
    exportedAt: data.exportedAt ?? new Date().toISOString(),
    subjects: data.subjects,
    decks: data.decks,
    cards: data.cards,
    logs: Array.isArray(data.logs) ? data.logs : [],
    distributions: Array.isArray(data.distributions) ? data.distributions : [],
    settings: (data.settings ?? {}) as Settings,
  }
}

export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new ImportError('Lecture du fichier impossible.'))
    reader.readAsText(file, 'utf-8')
  })
}
