/**
 * Rappels de révision.
 *
 * Limite technique assumée : le web n'autorise pas de véritable planification
 * en arrière-plan (et iOS l'interdit hors application installée sur l'écran
 * d'accueil). Le rappel est donc évalué à chaque ouverture de l'application et
 * toutes les minutes tant qu'elle est visible : si l'heure programmée du jour
 * est passée et qu'aucune notification n'a encore été envoyée, elle part.
 * À défaut de notification système, la pastille de l'onglet « Aujourd'hui »
 * signale les thèmes en attente.
 */

import type { Deck } from '../db/types'
import { dayKey } from '../lib/date'

export type PermissionState = 'unsupported' | 'default' | 'granted' | 'denied'

export function notificationSupport(): PermissionState {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission as PermissionState
}

export async function requestPermission(): Promise<PermissionState> {
  if (typeof Notification === 'undefined') return 'unsupported'
  try {
    return (await Notification.requestPermission()) as PermissionState
  } catch {
    return 'denied'
  }
}

/** L'heure de rappel du jour est-elle passée, sans notification déjà envoyée ? */
export function isReminderPending(deck: Deck, now = Date.now()): boolean {
  const reminder = deck.reminder
  if (!reminder?.enabled) return false

  const date = new Date(now)
  if (!reminder.days.includes(date.getDay())) return false

  const [hours, minutes] = reminder.time.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return false

  const scheduled = new Date(date)
  scheduled.setHours(hours, minutes, 0, 0)
  if (now < scheduled.getTime()) return false

  return !reminder.lastFiredAt || dayKey(reminder.lastFiredAt) !== dayKey(now)
}

async function show(title: string, body: string, tag: string) {
  const options: NotificationOptions = {
    body,
    tag,
    // BASE_URL suit le chemin de publication : « / » à la racine d'un domaine,
    // « /mon-projet/ » sur GitLab Pages.
    icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
    badge: `${import.meta.env.BASE_URL}icons/icon-192.png`,
    lang: 'fr',
  }
  // Le service worker permet à la notification de survivre à la fermeture
  // de l'onglet ; sinon on retombe sur l'API Notification directe.
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) {
      await registration.showNotification(title, options)
      return
    }
  }
  new Notification(title, options)
}

/**
 * Envoie les rappels dus et renvoie les identifiants des thèmes notifiées,
 * pour que l'appelant enregistre la date de déclenchement.
 */
export async function fireDueReminders(
  decks: Deck[],
  countFor: (deckId: string) => number,
  now = Date.now(),
): Promise<string[]> {
  const pending = decks.filter((deck) => isReminderPending(deck, now))
  if (pending.length === 0) return []
  if (notificationSupport() !== 'granted') return []

  const fired: string[] = []
  for (const deck of pending) {
    const count = countFor(deck.id)
    const body =
      count > 0
        ? `${count} carte${count > 1 ? 's' : ''} à réviser dans « ${deck.name} ».`
        : `C'est l'heure de vous tester sur « ${deck.name} ».`
    try {
      await show('Séance de révision', body, `deck-${deck.id}`)
      fired.push(deck.id)
    } catch {
      /* notification refusée par le système : on réessaiera au prochain tour */
    }
  }
  return fired
}

export const DEFAULT_REMINDER_TIME = '18:00'
export const WEEKDAYS = [1, 2, 3, 4, 5]
