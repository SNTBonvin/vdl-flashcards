/** Modèle de données de l'application. Tout est stocké localement (IndexedDB). */

export type ID = string

/** Matière — le niveau de classement le plus haut (ex. « Histoire-Géographie »). */
export interface Subject {
  id: ID
  name: string
  /** Court libellé mono affiché en pastille (2-3 lettres). */
  code: string
  createdAt: number
  position: number
}

/**
 * Thème de cartes à l'intérieur d'une matière (ex. « La Ve République »).
 *
 * Le type et le champ `deckId` des cartes gardent volontairement leur nom
 * d'origine : ce sont les clés effectivement écrites dans IndexedDB et dans
 * les sauvegardes JSON déjà exportées. Les renommer obligerait à migrer les
 * données existantes — et donc à risquer de les perdre — pour un simple
 * changement de vocabulaire. « Thème » est le mot de l'interface, `Deck`
 * celui du stockage.
 */
export interface Deck {
  id: ID
  subjectId: ID
  name: string
  description: string
  createdAt: number
  position: number
  reminder: Reminder | null
}

/** Rappel de révision programmé pour un thème. */
export interface Reminder {
  enabled: boolean
  /** Heure au format « HH:MM ». */
  time: string
  /** Jours de la semaine, 0 = dimanche … 6 = samedi. */
  days: number[]
  /** Dernier déclenchement notifié (horodatage), pour éviter les doublons. */
  lastFiredAt: number | null
}

export type CardState = 'new' | 'learning' | 'review' | 'relearning'

/** État de répétition espacée porté par chaque carte. */
export interface Srs {
  state: CardState
  /** Intervalle courant en jours (0 tant que la carte est en apprentissage). */
  interval: number
  /** Facteur de facilité (SM-2), 1.3 minimum. */
  ease: number
  /** Index de l'étape d'apprentissage courante. */
  step: number
  /** Prochaine échéance (horodatage ms). */
  due: number
  /** Nombre total de révisions. */
  reps: number
  /** Nombre d'oublis (réponses « Raté » sur une carte déjà acquise). */
  lapses: number
  lastReviewedAt: number | null
}

export interface Card {
  id: ID
  deckId: ID
  front: string
  back: string
  notes: string
  tags: string[]
  createdAt: number
  updatedAt: number
  /** Une carte suspendue n'est jamais proposée en révision. */
  suspended: boolean
  srs: Srs
}

export type Grade = 'again' | 'hard' | 'good'

export interface ReviewLog {
  id: ID
  cardId: ID
  deckId: ID
  ts: number
  grade: Grade
  /** Intervalle en jours avant la réponse. */
  prevInterval: number
  /** Intervalle en jours après la réponse. */
  nextInterval: number
}

export interface Settings {
  /** Nouvelles cartes introduites par jour et par thème. */
  newPerDay: number
  /** Plafond de cartes à réviser par session. */
  maxPerSession: number
  /** Mélanger l'ordre des cartes dans une session. */
  shuffle: boolean
  /** Afficher d'abord le verso (révision inversée). */
  reverse: boolean
  /** Rappels système activés (nécessite l'autorisation du navigateur). */
  notificationsEnabled: boolean
  /** Intervalle maximum en jours. */
  maxInterval: number
}

export const DEFAULT_SETTINGS: Settings = {
  newPerDay: 20,
  maxPerSession: 60,
  shuffle: true,
  reverse: false,
  notificationsEnabled: false,
  maxInterval: 365,
}

/** Format du fichier d'export/import JSON. */
export interface Backup {
  format: 'vdl-flashcards'
  version: 1
  exportedAt: string
  subjects: Subject[]
  decks: Deck[]
  cards: Card[]
  logs: ReviewLog[]
  settings: Settings
}
