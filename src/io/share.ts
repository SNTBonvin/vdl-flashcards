/**
 * Partage d'un thème par lien.
 *
 * Le jeu de cartes voyage **dans** le lien, après le `#`. Deux conséquences
 * heureuses : aucun serveur à héberger, et la partie située après le `#` n'est
 * jamais transmise à l'hébergeur — personne ne peut donc savoir quel jeu a été
 * ouvert, ni par qui.
 *
 * Contrepartie : la longueur. Le contenu est compressé puis encodé en
 * base64url, ce qui donne de l'ordre de 50 à 70 caractères par carte. Au-delà
 * d'une centaine de cartes, l'interface renvoie vers l'export JSON plutôt que
 * de produire un lien ingérable.
 */

import type { Card, Deck, Subject } from '../db/types'

/** Contenu transporté par le lien. Les clés sont courtes : elles sont répétées. */
export interface SharePayload {
  /** Version du format, pour rester compatible si celui-ci évolue. */
  v: 1
  /** Identifiant stable du partage : permet de mettre à jour au lieu de dupliquer. */
  id: string
  /** Numéro de révision, croissant : une valeur plus élevée remplace la précédente. */
  rev: number
  /** Nom affiché de l'auteur du partage. Facultatif. */
  by?: string
  /** Nom de la matière d'accueil. */
  s: string
  /** Nom du thème. */
  t: string
  /** Description du thème. */
  d?: string
  /** Cartes : recto, verso, puis note facultative. */
  c: [string, string, string?][]
}

export class ShareError extends Error {}

/* ------------------------- Encodage / décodage ------------------------- */

const COMPRESSED = 'A'
const PLAIN = 'B'

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  // Par tranches : `String.fromCharCode(...bytes)` dépasse la pile d'appels
  // sur un gros tableau.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(token: string): Uint8Array {
  const padded = token.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** `CompressionStream` manque sur les navigateurs les plus anciens (iOS < 16.4). */
const canCompress = typeof CompressionStream === 'function' && typeof DecompressionStream === 'function'

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const response = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream as ReadableWritablePair))
  return new Uint8Array(await response.arrayBuffer())
}

export async function encodeShare(payload: SharePayload): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(payload))
  if (!canCompress) return PLAIN + toBase64Url(json)
  try {
    return COMPRESSED + toBase64Url(await pipe(json, new CompressionStream('deflate-raw')))
  } catch {
    // Repli silencieux : le lien sera simplement plus long.
    return PLAIN + toBase64Url(json)
  }
}

export async function decodeShare(token: string): Promise<SharePayload> {
  const marker = token[0]
  const body = token.slice(1)
  if (marker !== COMPRESSED && marker !== PLAIN) {
    throw new ShareError("Ce lien de partage n'est pas reconnu.")
  }

  let json: string
  try {
    const bytes = fromBase64Url(body)
    const raw =
      marker === COMPRESSED ? await pipe(bytes, new DecompressionStream('deflate-raw')) : bytes
    json = new TextDecoder().decode(raw)
  } catch {
    throw new ShareError('Ce lien est incomplet ou abîmé. Demandez qu’il vous soit renvoyé.')
  }

  let payload: SharePayload
  try {
    payload = JSON.parse(json) as SharePayload
  } catch {
    throw new ShareError('Ce lien est incomplet ou abîmé. Demandez qu’il vous soit renvoyé.')
  }

  if (payload?.v !== 1 || !Array.isArray(payload.c) || !payload.t || !payload.s) {
    throw new ShareError('Ce lien a été créé par une version incompatible de l’application.')
  }
  return payload
}

/* ------------------------------ Fabrication ----------------------------- */

export function buildPayload(options: {
  subject: Subject
  deck: Deck
  cards: Card[]
  by: string
  shareId: string
}): SharePayload {
  const { subject, deck, cards, by, shareId } = options
  return {
    v: 1,
    id: shareId,
    // L'horodatage est croissant par construction : une diffusion plus récente
    // remplace toujours la précédente chez l'élève.
    rev: Date.now(),
    ...(by.trim() ? { by: by.trim() } : {}),
    s: subject.name,
    t: deck.name,
    ...(deck.description ? { d: deck.description } : {}),
    c: cards
      .filter((card) => !card.suspended)
      .map((card) => (card.notes ? [card.front, card.back, card.notes] : [card.front, card.back])),
  }
}

export function shareUrl(token: string): string {
  return `${window.location.origin}${window.location.pathname}#/p/${token}`
}

/* -------------------------- Aptitude au partage ------------------------- */

export type ShareFit = 'qr' | 'qr-dense' | 'link' | 'too-long'

export interface ShareSize {
  /** Longueur totale du lien, en caractères. */
  length: number
  /** Côté du QR code en modules, ou null s'il dépasse la capacité du format. */
  modules: number | null
  fit: ShareFit
}

/**
 * Classe un lien selon ce qu'on peut réellement en faire.
 *
 * Les seuils portent sur le nombre de modules du QR, pas sur le nombre de
 * cartes : c'est lui qui décide si le code reste lisible. Au-delà de 85
 * modules, il faut approcher le téléphone ; au-delà de 125, mieux vaut
 * renoncer au QR.
 */
export function measure(url: string, modules: number | null): ShareSize {
  const length = url.length
  let fit: ShareFit
  if (modules !== null && modules <= 85) fit = 'qr'
  else if (modules !== null && modules <= 125) fit = 'qr-dense'
  else if (length <= 5000) fit = 'link'
  else fit = 'too-long'
  return { length, modules, fit }
}

export function formatSize(length: number): string {
  return length < 1024 ? `${length} caractères` : `${(length / 1024).toFixed(1).replace('.', ',')} Ko`
}

/** Clé d'appariement d'une carte : le recto, normalisé. */
export function cardKey(front: string): string {
  return front.trim().toLowerCase().replace(/\s+/g, ' ')
}
