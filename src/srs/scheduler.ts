/**
 * Moteur de répétition espacée — variante simplifiée de SM-2.
 *
 * Principe : trois réponses possibles.
 *   « Raté »     → la carte repart en apprentissage et revient dans la minute.
 *   « Difficile » → l'intervalle progresse peu, la facilité baisse un peu.
 *   « Su »        → l'intervalle est multiplié par le facteur de facilité.
 *
 * Une carte neuve sue rejoint directement le cycle long, exprimé en jours ;
 * ratée, elle revient une minute plus tard, dans la même séance.
 */

import type { Grade, Settings, Srs } from '../db/types'

export const MINUTE = 60_000
export const DAY = 86_400_000

/**
 * Palier d'apprentissage d'une carte neuve, en minutes. Un seul palier : une
 * carte neuve sue du premier coup rejoint aussitôt le cycle long, seule une
 * carte ratée ou jugée difficile revient dans la séance en cours.
 */
const LEARNING_STEPS = [1]
/** Palier de réapprentissage après un oubli, en minutes. */
const RELEARNING_STEPS = [10]
/** Intervalle en jours à la sortie des paliers d'apprentissage. */
const GRADUATING_INTERVAL = 1
/** Bonus appliqué à une carte « Su » sortant du réapprentissage. */
const LAPSE_FACTOR = 0.5

const MIN_EASE = 1.3
const START_EASE = 2.5

export function newSrs(now = Date.now()): Srs {
  return {
    state: 'new',
    interval: 0,
    ease: START_EASE,
    step: 0,
    due: now,
    reps: 0,
    lapses: 0,
    lastReviewedAt: null,
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * Petite dispersion (±5 %) pour éviter que des cartes apprises le même jour
 * ne reviennent toutes ensemble des mois plus tard.
 */
function fuzz(days: number): number {
  if (days < 3) return days
  const spread = Math.max(1, Math.round(days * 0.05))
  return days + Math.round((Math.random() * 2 - 1) * spread)
}

/** Calcule le nouvel état d'une carte après une réponse. */
export function grade(srs: Srs, answer: Grade, settings: Settings, now = Date.now()): Srs {
  const next: Srs = { ...srs, reps: srs.reps + 1, lastReviewedAt: now }
  const maxInterval = Math.max(1, settings.maxInterval)

  const schedule = (days: number): Srs => {
    const capped = clamp(Math.round(fuzz(days)), 1, maxInterval)
    next.state = 'review'
    next.step = 0
    next.interval = capped
    next.due = now + capped * DAY
    return next
  }

  const inMinutes = (minutes: number, state: 'learning' | 'relearning', step: number): Srs => {
    next.state = state
    next.step = step
    next.interval = 0
    next.due = now + minutes * MINUTE
    return next
  }

  // --- Carte en cours d'apprentissage (neuve ou réapprise) ---
  if (srs.state === 'new' || srs.state === 'learning' || srs.state === 'relearning') {
    const relearning = srs.state === 'relearning'
    const steps = relearning ? RELEARNING_STEPS : LEARNING_STEPS
    const state = relearning ? 'relearning' : 'learning'

    if (answer === 'again') {
      return inMinutes(steps[0], state, 0)
    }

    if (answer === 'hard') {
      const step = clamp(srs.step, 0, steps.length - 1)
      return inMinutes(steps[step], state, step)
    }

    // « Su » : palier suivant, ou sortie vers le cycle long.
    const step = srs.step + 1
    if (step < steps.length) return inMinutes(steps[step], state, step)

    if (relearning) {
      // On reprend là où la carte en était, en divisant l'intervalle.
      return schedule(Math.max(1, Math.round(srs.interval * LAPSE_FACTOR)))
    }
    return schedule(GRADUATING_INTERVAL)
  }

  // --- Carte acquise, en cycle long ---
  const current = Math.max(1, srs.interval)

  if (answer === 'again') {
    next.ease = Math.max(MIN_EASE, srs.ease - 0.2)
    next.lapses = srs.lapses + 1
    // L'intervalle est conservé le temps du réapprentissage : il servira de
    // base (divisé par deux) quand la carte sera de nouveau sue.
    next.state = 'relearning'
    next.step = 0
    next.interval = current
    next.due = now + RELEARNING_STEPS[0] * MINUTE
    return next
  }

  if (answer === 'hard') {
    next.ease = Math.max(MIN_EASE, srs.ease - 0.15)
    return schedule(Math.max(current + 1, current * 1.2))
  }

  return schedule(current * srs.ease)
}

/** Aperçu textuel de la prochaine échéance, affiché sur les boutons de réponse. */
export function previewDelay(srs: Srs, answer: Grade, settings: Settings): string {
  const now = Date.now()
  const result = grade({ ...srs }, answer, settings, now)
  return formatDelay(result.due - now)
}

export function formatDelay(ms: number): string {
  if (ms <= 0) return 'maintenant'
  const minutes = Math.round(ms / MINUTE)
  if (minutes < 60) return `${Math.max(1, minutes)} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.round(ms / DAY)
  if (days < 31) return `${days} j`
  const months = Math.round(days / 30.4)
  if (months < 12) return `${months} mois`
  const years = (days / 365).toFixed(1).replace('.0', '')
  return `${years} an${Number(years) > 1 ? 's' : ''}`
}
