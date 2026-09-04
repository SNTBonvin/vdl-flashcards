/** Construction des files de révision. */

import type { Card, ID, Settings } from '../db/types'

export type SessionMode = 'due' | 'quiz' | 'hard'

export interface QueueOptions {
  mode: SessionMode
  /** Cartes déjà introduites aujourd'hui, par catégorie. */
  introducedToday: Record<ID, number>
  settings: Settings
  now?: number
}

export function isDue(card: Card, now = Date.now()): boolean {
  return !card.suspended && card.srs.state !== 'new' && card.srs.due <= now
}

export function isNew(card: Card): boolean {
  return !card.suspended && card.srs.state === 'new'
}

/** Cartes déjà oubliées au moins une fois — la file « à consolider ». */
export function isHard(card: Card): boolean {
  return !card.suspended && (card.srs.lapses > 0 || card.srs.state === 'relearning')
}

function shuffle<T>(items: T[]): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Construit la file d'une session à partir des cartes des catégories choisies.
 *
 * - « due »  : les cartes échues, complétées par des cartes neuves dans la
 *              limite quotidienne réglée.
 * - « quiz » : interrogation — toutes les cartes, échues ou non, mélangées.
 * - « hard » : uniquement les cartes déjà ratées, les plus fautives d'abord.
 */
export function buildQueue(cards: Card[], options: QueueOptions): Card[] {
  const { mode, introducedToday, settings } = options
  const now = options.now ?? Date.now()
  const limit = Math.max(1, settings.maxPerSession)

  if (mode === 'quiz') {
    const pool = cards.filter((c) => !c.suspended)
    return (settings.shuffle ? shuffle(pool) : pool).slice(0, limit)
  }

  if (mode === 'hard') {
    const pool = cards.filter(isHard).sort((a, b) => b.srs.lapses - a.srs.lapses)
    return pool.slice(0, limit)
  }

  const due = cards.filter((c) => isDue(c, now)).sort((a, b) => a.srs.due - b.srs.due)

  // Cartes neuves : quota par catégorie, dans l'ordre de création.
  const remaining: Record<ID, number> = {}
  const fresh: Card[] = []
  for (const card of cards.filter(isNew).sort((a, b) => a.createdAt - b.createdAt)) {
    if (remaining[card.deckId] === undefined) {
      remaining[card.deckId] = Math.max(0, settings.newPerDay - (introducedToday[card.deckId] ?? 0))
    }
    if (remaining[card.deckId] > 0) {
      remaining[card.deckId] -= 1
      fresh.push(card)
    }
  }

  const merged = settings.shuffle ? shuffle([...due, ...fresh]) : [...due, ...fresh]
  return merged.slice(0, limit)
}

export interface DeckCounts {
  total: number
  due: number
  fresh: number
  hard: number
  /** Prochaine échéance parmi les cartes non échues. */
  nextDue: number | null
}

export function countCards(cards: Card[], now = Date.now()): DeckCounts {
  let due = 0
  let fresh = 0
  let hard = 0
  let nextDue: number | null = null

  for (const card of cards) {
    if (card.suspended) continue
    if (isNew(card)) fresh += 1
    else if (card.srs.due <= now) due += 1
    else if (nextDue === null || card.srs.due < nextDue) nextDue = card.srs.due
    if (isHard(card)) hard += 1
  }

  return { total: cards.length, due, fresh, hard, nextDue }
}
