/** Utilitaires de date, en heure locale. */

export const DAY_MS = 86_400_000

/** Clé de jour « AAAA-MM-JJ » en heure locale. */
export function dayKey(ts: number | Date = Date.now()): string {
  const d = ts instanceof Date ? ts : new Date(ts)
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function startOfDay(ts: number = Date.now()): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function endOfDay(ts: number = Date.now()): number {
  return startOfDay(ts) + DAY_MS - 1
}

const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
export const DAY_SHORT = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

export function dayName(index: number): string {
  return DAY_NAMES[index] ?? ''
}

/** Date lisible : « 4 sept. », ou « aujourd'hui » / « demain ». */
export function formatDate(ts: number): string {
  const today = startOfDay()
  const diff = Math.round((startOfDay(ts) - today) / DAY_MS)
  if (diff === 0) return "aujourd'hui"
  if (diff === 1) return 'demain'
  if (diff === -1) return 'hier'
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

/** Échéance relative : « en retard », « dans 3 j »… */
export function formatDue(ts: number, now = Date.now()): string {
  if (ts <= now) return 'à réviser'
  const days = Math.ceil((startOfDay(ts) - startOfDay(now)) / DAY_MS)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'demain'
  if (days < 31) return `dans ${days} j`
  const months = Math.round(days / 30.4)
  if (months < 12) return `dans ${months} mois`
  return `dans ${(days / 365).toFixed(1).replace('.0', '')} an(s)`
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
