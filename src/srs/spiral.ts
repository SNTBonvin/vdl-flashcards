/**
 * Reprise spiralaire.
 *
 * Les ressources académiques sur la mémorisation insistent sur un point que la
 * seule répétition espacée carte par carte ne couvre pas : revenir sur les
 * chapitres antérieurs, au lieu de ne travailler que le chapitre en cours.
 * D'où cette suggestion, qui repère le thème déjà travaillé le plus longtemps
 * laissé de côté et propose de le reprendre.
 *
 * On regarde la date de dernière révision portée par les cartes, et non
 * l'historique : c'est la même information, en moins cher.
 */

import type { Card, Deck } from '../db/types'
import { DAY_MS } from '../lib/date'

export interface SpiralSuggestion {
  deck: Deck
  /** Jours écoulés depuis la dernière révision du thème. */
  days: number
  /** Cartes vivantes du thème. */
  cards: number
}

/** Seuil à partir duquel un thème mérite d'être reproposé. */
export const SPIRAL_MIN_DAYS = 21

export function spiralSuggestion(
  decks: Deck[],
  cardsByDeck: Map<string, Card[]>,
  now = Date.now(),
  minDays = SPIRAL_MIN_DAYS,
): SpiralSuggestion | null {
  let best: SpiralSuggestion | null = null

  for (const deck of decks) {
    const cards = (cardsByDeck.get(deck.id) ?? []).filter((c) => !c.suspended)
    if (cards.length === 0) continue

    // Un thème jamais ouvert n'est pas « à reprendre » : il est à découvrir.
    let last = 0
    for (const card of cards) {
      if (card.srs.lastReviewedAt && card.srs.lastReviewedAt > last) last = card.srs.lastReviewedAt
    }
    if (last === 0) continue

    const days = Math.floor((now - last) / DAY_MS)
    if (days < minDays) continue
    if (!best || days > best.days) best = { deck, days, cards: cards.length }
  }

  return best
}
