/**
 * Courbes d'apprentissage, calculées sur l'historique de révision.
 *
 * Deux mesures, choisies parce qu'elles disent quelque chose d'utile à
 * l'élève — et non parce qu'elles sont faciles à tracer.
 *
 * 1. **Sa propre courbe de l'oubli** : le taux de réussite en fonction du
 *    temps écoulé depuis la révision précédente. Pas la courbe d'Ebbinghaus
 *    d'un manuel : la sienne, sur ses cartes. Elle dit où sa mémoire lâche, et
 *    donc s'il faut resserrer le rythme.
 *
 * 2. **La montée de l'acquis** : combien de cartes ont été découvertes, et
 *    combien sont devenues solides, semaine après semaine. C'est la courbe qui
 *    donne envie de continuer.
 *
 * Un écueil évité : le taux de réussite dans le temps, qui paraît évident mais
 * ment — ajouter dix cartes neuves le fait chuter alors que rien ne s'est
 * dégradé. On ne le trace pas.
 */

import type { Card, ReviewLog } from '../db/types'
import { DAY_MS, startOfDay } from '../lib/date'

/** En deçà, une courbe ne montrerait que du bruit. */
export const MIN_ANSWERS = 30

/** Intervalle à partir duquel on considère une carte solidement acquise. */
const MASTERED_DAYS = 21

export interface RetentionPoint {
  /** Libellé de la tranche d'intervalle : « 1 j », « 2-3 j »… */
  label: string
  /** Réponses données sur des cartes revenant après cet intervalle. */
  answers: number
  /** Part de réussite, de 0 à 1. */
  rate: number
}

const BUCKETS: { label: string; max: number }[] = [
  { label: '1 j', max: 1 },
  { label: '2-3 j', max: 3 },
  { label: '4-7 j', max: 7 },
  { label: '8-15 j', max: 15 },
  { label: '16-30 j', max: 30 },
  { label: '+ 30 j', max: Infinity },
]

/**
 * Taux de réussite par tranche d'intervalle. Seules les cartes déjà acquises
 * comptent : les paliers d'apprentissage, qui se mesurent en minutes, ne
 * disent rien de l'oubli.
 */
export function retentionCurve(logs: ReviewLog[]): RetentionPoint[] {
  const tally = BUCKETS.map(() => ({ answers: 0, good: 0 }))

  for (const log of logs) {
    if (log.prevInterval < 1) continue
    const index = BUCKETS.findIndex((b) => log.prevInterval <= b.max)
    if (index < 0) continue
    tally[index].answers += 1
    if (log.grade !== 'again') tally[index].good += 1
  }

  return BUCKETS.map((bucket, index) => ({
    label: bucket.label,
    answers: tally[index].answers,
    rate: tally[index].answers > 0 ? tally[index].good / tally[index].answers : 0,
  }))
}

export interface MasteryPoint {
  /** Début de la semaine. */
  ts: number
  /** Cartes vues au moins une fois à cette date. */
  seen: number
  /** Cartes devenues solides (intervalle d'au moins trois semaines). */
  mastered: number
}

/**
 * Découvertes et acquis, cumulés semaine après semaine.
 *
 * On date chaque carte deux fois : sa première révision, et la première fois
 * qu'elle atteint trois semaines d'intervalle. Les deux courbes cumulées
 * racontent alors l'écart entre « vu » et « su » — c'est-à-dire le travail qui
 * reste.
 */
export function masteryCurve(logs: ReviewLog[], weeks = 12, now = Date.now()): MasteryPoint[] {
  const firstSeen = new Map<string, number>()
  const firstMastered = new Map<string, number>()

  for (const log of logs) {
    const seen = firstSeen.get(log.cardId)
    if (seen === undefined || log.ts < seen) firstSeen.set(log.cardId, log.ts)
    if (log.nextInterval >= MASTERED_DAYS) {
      const mastered = firstMastered.get(log.cardId)
      if (mastered === undefined || log.ts < mastered) firstMastered.set(log.cardId, log.ts)
    }
  }

  const seenDates = [...firstSeen.values()].sort((a, b) => a - b)
  const masteredDates = [...firstMastered.values()].sort((a, b) => a - b)

  const end = startOfDay(now) + DAY_MS
  const points: MasteryPoint[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const ts = end - i * 7 * DAY_MS
    points.push({
      ts,
      seen: countUpTo(seenDates, ts),
      mastered: countUpTo(masteredDates, ts),
    })
  }
  return points
}

/** Nombre de dates antérieures ou égales à la borne — recherche dichotomique. */
function countUpTo(sorted: number[], limit: number): number {
  let low = 0
  let high = sorted.length
  while (low < high) {
    const middle = (low + high) >> 1
    if (sorted[middle] <= limit) low = middle + 1
    else high = middle
  }
  return low
}

/** Cartes d'un thème restées sans révision depuis longtemps, pour le contexte. */
export function answersFor(logs: ReviewLog[], deckIds: Set<string>): ReviewLog[] {
  return logs.filter((l) => deckIds.has(l.deckId))
}

/** Le thème a-t-il assez d'historique pour qu'une courbe veuille dire quelque chose ? */
export function hasEnough(logs: ReviewLog[]): boolean {
  return logs.length >= MIN_ANSWERS
}

/** Cartes acquises à ce jour, pour le libellé d'accompagnement. */
export function masteredNow(cards: Card[]): number {
  return cards.filter((c) => !c.suspended && c.srs.interval >= MASTERED_DAYS).length
}
