/**
 * Plan de reprises espacées.
 *
 * Les échéances proposées suivent la courbe de l'oubli d'Ebbinghaus telle
 * qu'elle est présentée dans les ressources académiques sur la mémorisation
 * active : un rappel le lendemain, un la semaine suivante, un le mois suivant,
 * un six mois plus tard. Le second rythme, plus resserré, convient à un
 * contrôle proche.
 *
 * Le plan ne remplace pas la répétition espacée carte par carte : celle-ci
 * décide de *quelles* cartes revoir, le plan dit *quand* s'y mettre. C'est lui
 * qu'on exporte vers l'agenda, seul endroit capable de sonner tout seul.
 */

import type { PlanPreset, RevisionPlan } from '../db/types'
import { DAY_MS } from '../lib/date'

export interface PlanPresetDef {
  id: PlanPreset
  label: string
  hint: string
  /** Jours écoulés depuis le départ. */
  offsets: number[]
}

export const PLAN_PRESETS: PlanPresetDef[] = [
  {
    id: 'ebbinghaus',
    label: 'Courbe de l’oubli',
    hint: 'Demain, dans une semaine, dans un mois, dans six mois.',
    offsets: [1, 7, 30, 180],
  },
  {
    id: 'resserre',
    label: 'Resserré',
    hint: 'Cinq reprises en un mois, pour un contrôle proche.',
    offsets: [1, 3, 7, 15, 30],
  },
]

export function presetOf(plan: RevisionPlan): PlanPresetDef {
  return PLAN_PRESETS.find((p) => p.id === plan.preset) ?? PLAN_PRESETS[0]
}

/** Applique « HH:MM » à un jour donné. */
function at(day: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date(day)
  date.setHours(Number.isNaN(hours) ? 18 : hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0)
  return date
}

/** Les rendez-vous du plan, dans l'ordre. */
export function planDates(plan: RevisionPlan): Date[] {
  return presetOf(plan).offsets.map((offset) => at(new Date(plan.startedAt + offset * DAY_MS), plan.time))
}

/** Prochain rendez-vous à venir, ou null si le plan est arrivé à son terme. */
export function nextPlanDate(plan: RevisionPlan, now = Date.now()): Date | null {
  return planDates(plan).find((date) => date.getTime() > now) ?? null
}
