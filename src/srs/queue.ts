/** Construction des files de révision. */

import type { Card, ID, Settings } from '../db/types'
import { dueByDeadline } from './deadline'

export type SessionMode = 'due' | 'quiz' | 'hard'

export interface QueueOptions {
  mode: SessionMode
  /** Cartes déjà introduites aujourd'hui, par thème. */
  introducedToday: Record<ID, number>
  settings: Settings
  now?: number
  /**
   * Cartes neuves autorisées au-delà du quota du jour. Budget **global**, pris
   * dans l'ordre de création quel que soit le thème : « dix cartes de plus » se
   * comprend sans avoir à raisonner thème par thème.
   */
  bonus?: number
}

export function isDue(card: Card, now = Date.now()): boolean {
  if (card.suspended || card.srs.state === 'new') return false
  // Une carte à savoir pour bientôt est proposée même si son échéance propre
  // tombe après le jour dit : c'est le seul effet des échéances de lot, et il
  // ne fait qu'avancer une révision (voir srs/deadline).
  return card.srs.due <= now || dueByDeadline(card, now)
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
  const { taken: fresh } = pickFresh(cards, introducedToday, settings, options.bonus ?? 0)

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
  bonus = 0,
): { taken: Card[]; held: number } {
  const remaining: Record<ID, number> = {}
  const taken: Card[] = []
  let extra = Math.max(0, bonus)
  let held = 0

  // À quota serré, les cartes attendues pour une date passent devant : il serait
  // absurde de retenir pour demain ce qui doit être su lundi.
  const queue = cards
    .filter(isNew)
    .sort((a, b) => (a.dueBy ?? '9999').localeCompare(b.dueBy ?? '9999') || a.createdAt - b.createdAt)

  for (const card of queue) {
    if (remaining[card.deckId] === undefined) {
      remaining[card.deckId] = Math.max(0, settings.newPerDay - (introducedToday[card.deckId] ?? 0))
    }
    if (remaining[card.deckId] > 0) {
      remaining[card.deckId] -= 1
      taken.push(card)
    } else if (extra > 0) {
      // Le budget supplémentaire se prend sur n'importe quel thème, dans
      // l'ordre de création : « dix de plus » reste lisible.
      extra -= 1
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
  const { taken, held } = pickFresh(cards, options.introducedToday, options.settings, options.bonus ?? 0)
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
