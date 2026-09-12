/**
 * Fabrication d'un fichier d'agenda (iCalendar, RFC 5545).
 *
 * Pourquoi passer par l'agenda : le web ne sait pas programmer une
 * notification à l'avance. Une notification locale ne part qu'à l'ouverture de
 * l'application — c'est-à-dire jamais pour l'élève qui oublie précisément de
 * l'ouvrir. L'agenda du téléphone, lui, sonne tout seul, application fermée et
 * écran éteint, sans serveur, sans compte et sans qu'aucune donnée ne quitte
 * l'appareil.
 *
 * Les heures sont écrites en « heure locale flottante » (sans fuseau) : le
 * rendez-vous tombe à 19 h sur l'appareil qui l'affiche, où qu'il soit. Cela
 * évite d'embarquer une définition de fuseau horaire, et c'est le bon sens
 * pour un rappel de révision.
 */

export interface IcsEvent {
  /** Identifiant stable : réimporter le fichier met à jour au lieu d'empiler. */
  uid: string
  start: Date
  durationMinutes: number
  summary: string
  description?: string
  /** Répétition hebdomadaire, avec une fin — un rappel sans fin est une plaie. */
  weekly?: { days: number[]; until: Date }
}

const WEEKDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

const pad = (n: number) => `${n}`.padStart(2, '0')

/** Horodatage local flottant : « 20260917T190000 ». */
function localStamp(date: Date): string {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(date.getHours())}${pad(date.getMinutes())}00`
  )
}

/** Horodatage UTC, exigé pour DTSTAMP : « 20260912T183000Z ». */
function utcStamp(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  )
}

/** Échappement des valeurs texte : antislash, point-virgule, virgule, saut de ligne. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/**
 * Pliage des lignes à 75 octets, suivi d'une espace en tête de continuation.
 * Le compte se fait en octets et non en caractères : « é » en pèse deux, et
 * couper au milieu d'un caractère produirait un fichier illisible.
 */
function fold(line: string): string {
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= 75) return line

  const out: string[] = []
  let current = ''
  let bytes = 0
  let limit = 75
  for (const char of line) {
    const size = encoder.encode(char).length
    if (bytes + size > limit) {
      out.push(current)
      current = char
      bytes = size
      limit = 74 // l'espace de continuation occupe un octet
    } else {
      current += char
      bytes += size
    }
  }
  out.push(current)
  return out.join('\r\n ')
}

export function buildIcs(events: IcsEvent[], now = new Date()): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VDL Flashcards//Revisions//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const event of events) {
    const end = new Date(event.start.getTime() + event.durationMinutes * 60_000)
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${utcStamp(now)}`,
      `DTSTART:${localStamp(event.start)}`,
      `DTEND:${localStamp(end)}`,
      `SUMMARY:${escapeText(event.summary)}`,
    )
    if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`)
    if (event.weekly && event.weekly.days.length > 0) {
      const days = event.weekly.days
        .slice()
        .sort()
        .map((d) => WEEKDAY_CODES[d])
        .join(',')
      // UNTIL suit la forme de DTSTART : locale ici, donc sans « Z ».
      lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${days};UNTIL=${localStamp(event.weekly.until)}`)
    }
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(event.summary)}`,
      'TRIGGER:PT0S',
      'END:VALARM',
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

/** Nom de fichier sûr, sans accents ni ponctuation. */
export function icsFilename(label: string): string {
  const base = label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  return `revisions-${base || 'flashcards'}.ics`
}
