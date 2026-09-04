/** Passage de consigne entre un écran et la session de révision. */

import type { SessionMode } from '../srs/queue'

export interface SessionRequest {
  deckIds: string[]
  mode: SessionMode
  label: string
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
