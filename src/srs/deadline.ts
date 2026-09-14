/**
 * Échéances d'apprentissage : « à savoir pour le lundi 14 ».
 *
 * Le besoin vient d'un usage précis. L'enseignant donne un lot le lundi 7 pour
 * le lundi 14, un deuxième le 14 pour le 21, et l'interrogation du 21 porte sur
 * les deux. L'accumulation, elle, n'a rien demandé à personne : c'est la
 * répétition espacée qui la produit, les lots restant tous dans la rotation.
 *
 * Ce qui manquait est plus étroit. Une carte sue le jour 10 ne revient qu'au
 * jour 16 : l'échéance du 14 tombe dans un trou, et la carte n'est pas repassée
 * avant le contrôle. D'où une règle, une seule :
 *
 *   **Aucune carte à savoir pour le 14 ne doit avoir son échéance après le 14.
 *   Celles qui dépassent sont proposées la veille.**
 *
 * Ce n'est pas un dérèglement : on avance une révision, on n'en supprime
 * aucune, et répondre ce jour-là fait repartir le calcul normalement. C'est la
 * définition opérationnelle d'« être prêt pour lundi ».
 *
 * La règle ne modifie rien en base : elle se lit au moment de construire la
 * file. Changer la date, ou la retirer, agit donc immédiatement et sans
 * rattrapage. Une fois le jour passé, l'échéance devient inerte et la carte
 * poursuit son cycle — le lot rejoint le fonds commun.
 */

import type { Card } from '../db/types'
import { DAY_MS, endOfDay, startOfDay } from '../lib/date'

/** « AAAA-MM-JJ » → dernier instant de ce jour, en heure locale. */
export function deadlineAt(dueBy: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueBy.trim())
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : endOfDay(date.getTime())
}

/** Jours restants avant l'échéance : 0 aujourd'hui, négatif une fois passée. */
export function daysLeft(dueBy: string, now = Date.now()): number | null {
  const at = deadlineAt(dueBy)
  if (at === null) return null
  return Math.round((startOfDay(at) - startOfDay(now)) / DAY_MS)
}

/** L'échéance est-elle derrière nous ? Elle ne joue alors plus aucun rôle. */
export function isPast(dueBy: string, now = Date.now()): boolean {
  const at = deadlineAt(dueBy)
  return at !== null && now > at
}

/**
 * Faut-il proposer cette carte parce que son échéance approche ?
 *
 * Vrai la veille et le jour même, et seulement tant qu'elle n'a pas été revue
 * depuis le début de cette veille : un passage garanti, pas deux. Les cartes
 * neuves n'en relèvent pas — elles sont de toute façon proposées par le quota,
 * et les faire découvrir la veille d'un contrôle ne servirait personne.
 */
export function dueByDeadline(card: Card, now = Date.now()): boolean {
  if (!card.dueBy || card.suspended || card.srs.state === 'new') return false
  const at = deadlineAt(card.dueBy)
  if (at === null) return false
  const eve = startOfDay(at) - DAY_MS
  if (now < eve || now > at) return false
  return (card.srs.lastReviewedAt ?? 0) < eve
}

export interface DeadlineGroup {
  /** « AAAA-MM-JJ ». */
  dueBy: string
  /** Jours restants : 0 aujourd'hui, 1 demain. */
  days: number
  /** Cartes concernées, archivées exclues. */
  total: number
  /** Parmi elles, celles jamais vues. */
  unseen: number
  /**
   * Thèmes concernés et nombre de cartes dans chacun, du plus fourni au moins
   * fourni. « 23 cartes pour lundi » ne dit pas quoi réviser ; « Le web, 14
   * cartes » se rattache à un cours et à un cahier.
   */
  decks: { deckId: string; count: number }[]
  /** Identifiants des cartes concernées, pour retrouver la série d'origine. */
  cardIds: string[]
}

/**
 * Échéances à venir, groupées par date et ordonnées de la plus proche à la plus
 * lointaine. Les dates passées sont écartées : elles n'ont plus rien à dire.
 */
export function upcomingDeadlines(cards: Card[], now = Date.now()): DeadlineGroup[] {
  interface Acc {
    total: number
    unseen: number
    decks: Map<string, number>
    cardIds: string[]
  }
  const groups = new Map<string, Acc>()

  for (const card of cards) {
    if (!card.dueBy || card.suspended || isPast(card.dueBy, now)) continue
    const group = groups.get(card.dueBy) ?? {
      total: 0,
      unseen: 0,
      decks: new Map<string, number>(),
      cardIds: [],
    }
    group.total += 1
    if (card.srs.state === 'new') group.unseen += 1
    group.decks.set(card.deckId, (group.decks.get(card.deckId) ?? 0) + 1)
    group.cardIds.push(card.id)
    groups.set(card.dueBy, group)
  }

  return [...groups.entries()]
    .map(([dueBy, group]) => ({
      dueBy,
      days: daysLeft(dueBy, now) ?? 0,
      total: group.total,
      unseen: group.unseen,
      cardIds: group.cardIds,
      decks: [...group.decks.entries()]
        .map(([deckId, count]) => ({ deckId, count }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => a.days - b.days)
}

/** Libellé d'une échéance : « lundi 14 », ou « aujourd'hui » / « demain ». */
export function formatDeadline(dueBy: string, now = Date.now()): string {
  const at = deadlineAt(dueBy)
  if (at === null) return dueBy
  const days = daysLeft(dueBy, now) ?? 0
  if (days === 0) return "aujourd'hui"
  if (days === 1) return 'demain'
  return new Date(at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })
}
