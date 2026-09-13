/**
 * Plan de reprises espacées.
 *
 * Le plan ne remplace pas la répétition espacée carte par carte : celle-ci
 * décide de *quelles* cartes revoir, le plan dit *quand* s'y mettre. C'est lui
 * qu'on exporte vers l'agenda, seul endroit capable de sonner tout seul.
 *
 * Il n'y a plus de rythme à choisir, et c'est l'échéance qui l'a rendu inutile.
 * Deux rythmes étaient proposés : la courbe de l'oubli, et un « resserré, pour
 * un contrôle proche » — c'est-à-dire l'approximation d'une date qu'on n'avait
 * pas. Maintenant qu'une date peut être posée, deviner ne se justifie plus :
 *
 *  - **sans échéance**, les rendez-vous suivent la courbe de l'oubli telle
 *    qu'elle est présentée dans les ressources académiques sur la mémorisation
 *    active : demain, dans une semaine, dans un mois, dans six mois ;
 *  - **avec une échéance**, ils se répartissent jusqu'à elle, le dernier la
 *    veille. On garde les paliers naturels qui tombent avant, et l'on ajoute la
 *    veille : pour une date à sept jours, demain, dans trois jours, la veille.
 *
 * Les décalages retenus sont enregistrés avec le plan : celui-ci est la
 * photographie de ce qui a été déposé dans l'agenda, non une formule à
 * réévaluer. Changer l'échéance plus tard reste sans effet sur les rendez-vous
 * déjà posés — il faut rouvrir la feuille et réexporter, ce que l'agenda
 * accepte sans doublon.
 */

import type { PlanPreset, RevisionPlan } from '../db/types'
import { DAY_MS, startOfDay } from '../lib/date'
import { deadlineAt } from '../srs/deadline'

export interface PlanPresetDef {
  id: PlanPreset
  label: string
  hint: string
  /** Jours écoulés depuis le départ. */
  offsets: number[]
}

/**
 * Les deux rythmes d'autrefois. Ils ne sont plus proposés ; ils restent lus,
 * pour que les plans enregistrés avant continuent d'afficher leurs dates.
 */
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

/** Paliers naturels d'une reprise espacée, dont on retient ce qui tient. */
const STEPS = [1, 3, 7, 15, 30]

/**
 * Décalages, en jours, des rendez-vous d'un plan qui démarre maintenant.
 *
 * Sans échéance : la courbe de l'oubli. Avec : les paliers qui tombent avant
 * la veille, puis la veille — dernier rappel utile, le jour même étant trop
 * tard pour apprendre quoi que ce soit. Une échéance pour demain ou pour
 * aujourd'hui ne laisse qu'un rendez-vous, le jour même.
 */
export function planOffsets(dueBy?: string, from = Date.now()): number[] {
  const at = dueBy ? deadlineAt(dueBy) : null
  if (at === null) return PLAN_PRESETS[0].offsets

  const days = Math.round((startOfDay(at) - startOfDay(from)) / DAY_MS)
  const eve = days - 1
  if (eve < 1) return [0]
  return [...STEPS.filter((step) => step < eve), eve]
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
  const offsets = plan.offsets ?? presetOf(plan).offsets
  return offsets.map((offset) => at(new Date(plan.startedAt + offset * DAY_MS), plan.time))
}

/** Prochain rendez-vous à venir, ou null si le plan est arrivé à son terme. */
export function nextPlanDate(plan: RevisionPlan, now = Date.now()): Date | null {
  return planDates(plan).find((date) => date.getTime() > now) ?? null
}
