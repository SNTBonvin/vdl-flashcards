/** Construction des files de révision. */

import type { Card, ID, Settings } from '../db/types'

export type SessionMode = 'due' | 'quiz' | 'hard'

export interface QueueOptions {
  mode: SessionMode
  /** Cartes déjà introduites aujourd'hui, par thème. */
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
 * Construit la file d'une session à partir des cartes des thèmes choisis.
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
  const { taken: fresh } = pickFresh(cards, introducedToday, settings)

  const merged = settings.shuffle ? shuffle([...due, ...fresh]) : [...due, ...fresh]
  return merged.slice(0, limit)
}

/**
 * Cartes neuves retenues pour aujourd'hui, dans la limite du quota par thème.
 *
 * Isolé parce que **deux endroits** en ont besoin et ne doivent jamais diverger :
 * la file d'une séance, et le compteur qui l'annonce. Les avoir laissés séparés
 * a produit un défaut visible — l'accueil promettait des cartes que la séance ne
 * servait pas, le quota du jour étant déjà épuisé.
 */
function pickFresh(
  cards: Card[],
  introducedToday: Record<ID, number>,
  settings: Settings,
): { taken: Card[]; held: number } {
  const remaining: Record<ID, number> = {}
  const taken: Card[] = []
  let held = 0

  for (const card of cards.filter(isNew).sort((a, b) => a.createdAt - b.createdAt)) {
    if (remaining[card.deckId] === undefined) {
      remaining[card.deckId] = Math.max(0, settings.newPerDay - (introducedToday[card.deckId] ?? 0))
    }
    if (remaining[card.deckId] > 0) {
      remaining[card.deckId] -= 1
      taken.push(card)
    } else {
      held += 1
    }
  }

  return { taken, held }
}

export interface SessionCounts {
  /** Cartes échues à revoir. */
  due: number
  /** Cartes neuves que la séance introduira aujourd'hui. */
  fresh: number
  /**
   * Cartes neuves **retenues** par le quota du jour. Elles existent, elles sont
   * visibles dans le thème, mais elles ne seront pas proposées avant demain :
   * c'est ce qu'il faut dire plutôt que de les compter comme disponibles.
   */
  held: number
  /** Ce que la séance servira réellement — le nombre à afficher sur le bouton. */
  total: number
}

/**
 * Ce qu'une séance « à revoir » contiendrait si on la lançait maintenant.
 *
 * À préférer à `countCards` partout où un nombre annonce une séance : celui-ci
 * compte les cartes du thème, celui-là ce que l'on peut effectivement réviser.
 */
export function countSession(cards: Card[], options: Omit<QueueOptions, 'mode'>): SessionCounts {
  const now = options.now ?? Date.now()
  const limit = Math.max(1, options.settings.maxPerSession)
  const due = cards.filter((c) => isDue(c, now)).length
  const { taken, held } = pickFresh(cards, options.introducedToday, options.settings)
  return { due, fresh: taken.length, held, total: Math.min(limit, due + taken.length) }
}

export interface DeckCounts {
  /** Cartes visibles : les archivées en sont exclues. */
  total: number
  /** Cartes archivées, comptées à part. */
  archived: number
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
  let archived = 0
  let nextDue: number | null = null

  for (const card of cards) {
    if (card.suspended) {
      archived += 1
      continue
    }
    if (isNew(card)) fresh += 1
    else if (card.srs.due <= now) due += 1
    else if (nextDue === null || card.srs.due < nextDue) nextDue = card.srs.due
    if (isHard(card)) hard += 1
  }

  return { total: cards.length - archived, archived, due, fresh, hard, nextDue }
}
