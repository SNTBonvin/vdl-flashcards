/** Passage de consigne entre un écran et la session de révision. */

import type { SessionMode } from '../srs/queue'

export interface SessionRequest {
  deckIds: string[]
  mode: SessionMode
  label: string
  /**
   * Cartes neuves autorisées **au-delà** du quota du jour. Sert au « Aller plus
   * loin » de l'accueil : l'application conseille un rythme, elle ne l'impose
   * pas à qui veut en faire davantage en connaissance de cause.
   */
  bonus?: number
  /**
   * Révision blanche : on s'interroge sans que les réponses touchent aux
   * échéances ni à l'historique. C'est ce qu'il faut la veille d'un contrôle —
   * réviser tout un chapitre en répondant « Su » partout allongerait sinon tous
   * les intervalles d'un coup, et l'élève ne reverrait plus rien pendant des
   * semaines.
   */
  dry?: boolean
}

let pending: SessionRequest | null = null

export function requestSession(request: SessionRequest) {
  pending = request
}

export function takeSession(): SessionRequest | null {
  const current = pending
  pending = null
  return current
}
