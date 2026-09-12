/**
 * Jeux publiés, désignés par un code court.
 *
 * Le partage par lien porte les cartes dans l'URL : autonome, mais long, et
 * sur iPhone un lien n'atteint jamais l'application installée. Un code court —
 * « SVT-2DE-BIO1 » — se dicte en classe et se tape dans l'application déjà
 * ouverte. En contrepartie il ne contient rien : il désigne un fichier publié
 * à côté du site, qu'il faut aller chercher une fois. Ensuite, les cartes sont
 * copiées sur l'appareil et tout redevient autonome.
 *
 * Les deux chemins coexistent, et se rejoignent : un code produit exactement
 * la même charge utile qu'un lien, et passe donc par les mêmes règles de
 * réception — aperçu avant ajout, mise à jour sans doublon, progression
 * conservée.
 */

import type { SharePayload } from './share'

/** Fichier déposé dans « public/c/<code>.json » et publié avec le site. */
export interface PublishedSet {
  format: 'vdl-flashcards-set'
  version: 1
  /** Le code lui-même, en majuscules. Doit correspondre au nom du fichier. */
  code: string
  publishedAt: string
  /** Le jeu apparaît-il dans le catalogue, ou n'est-il joignable que par son code ? */
  listed: boolean
  /** Niveau de classe, pour le classement du catalogue. Facultatif. */
  level?: string
  by?: string
  subject: string
  deck: string
  description?: string
  /** Identifiant de partage du thème : c'est lui qui évite les doublons. */
  shareId: string
  rev: number
  cards: [string, string, string?][]
}

/** Index des jeux visibles, reconstruit à chaque publication. */
export interface Catalogue {
  format: 'vdl-flashcards-catalogue'
  version: 1
  builtAt: string
  sets: CatalogueEntry[]
}

export interface CatalogueEntry {
  code: string
  subject: string
  deck: string
  level?: string
  by?: string
  description?: string
  cards: number
  publishedAt: string | null
}

export class CatalogError extends Error {}

/**
 * Un code lisible : lettres, chiffres et tirets, en majuscules. Assez court
 * pour être dicté, assez long pour rester parlant.
 */
export const CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{1,23}$/

export function normalizeCode(input: string): string | null {
  const code = input
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
  return CODE_PATTERN.test(code) ? code : null
}

/** Propose un code à partir des noms, sans prétendre qu'il soit libre. */
export function suggestCode(subject: string, deck: string, level?: string): string {
  const part = (value: string, max: number) =>
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '')
      .slice(0, max)
  return [part(subject, 4), level ? part(level, 4) : '', part(deck, 8)]
    .filter(Boolean)
    .join('-')
    .slice(0, 24)
}

/** Dossier où le site est servi : « / » ou « /vdl-flashcards/ ». */
function baseDir(): string {
  const path = window.location.pathname
  return path.endsWith('/') ? path : path.slice(0, path.lastIndexOf('/') + 1)
}

export function setUrl(code: string): string {
  return `${window.location.origin}${baseDir()}c/${code}.json`
}

/** Chemin à donner au fichier dans le dépôt. */
export function setPath(code: string): string {
  return `public/c/${code}.json`
}

export function setToPayload(set: PublishedSet): SharePayload {
  return {
    v: 1,
    id: set.shareId,
    rev: set.rev,
    by: set.by,
    s: set.subject,
    t: set.deck,
    d: set.description,
    c: set.cards,
  }
}

export function catalogueUrl(): string {
  return `${window.location.origin}${baseDir()}catalogue.json`
}

/**
 * Lit l'index des jeux visibles. Un catalogue vide n'est pas une erreur : rien
 * n'a encore été publié, ou tout a été publié sans être listé.
 */
export async function fetchCatalogue(): Promise<CatalogueEntry[]> {
  let response: Response
  try {
    response = await fetch(catalogueUrl(), { cache: 'no-cache' })
  } catch {
    throw new CatalogError(
      'Impossible de joindre le site. Le catalogue demande une connexion ; les cartes déjà reçues, non.',
    )
  }
  if (response.status === 404) return []
  if (!response.ok) throw new CatalogError('Le site a répondu une erreur. Réessayez dans un moment.')

  const type = response.headers.get('content-type') ?? ''
  const text = await response.text()
  if (!type.includes('json') && !text.trimStart().startsWith('{')) return []

  try {
    const data = JSON.parse(text) as Partial<Catalogue>
    return Array.isArray(data.sets) ? data.sets : []
  } catch {
    throw new CatalogError('Le catalogue est illisible.')
  }
}

function isPublishedSet(value: unknown): value is PublishedSet {
  if (typeof value !== 'object' || value === null) return false
  const set = value as Partial<PublishedSet>
  return (
    set.format === 'vdl-flashcards-set' &&
    typeof set.subject === 'string' &&
    typeof set.deck === 'string' &&
    // Un identifiant de partage vide ferait confondre deux jeux : on refuse.
    typeof set.shareId === 'string' &&
    set.shareId.length > 0 &&
    Array.isArray(set.cards)
  )
}

/**
 * Va chercher un jeu publié. Les erreurs sont distinguées : un code inconnu et
 * une panne de réseau n'appellent pas le même geste de la part de l'élève.
 */
export async function fetchSet(code: string): Promise<PublishedSet> {
  let response: Response
  try {
    response = await fetch(setUrl(code), { cache: 'no-cache' })
  } catch {
    throw new CatalogError(
      'Impossible de joindre le site. Vérifiez votre connexion, puis réessayez : une fois reçues, les cartes n’auront plus besoin de réseau.',
    )
  }

  const unknown = new CatalogError(`Aucun jeu ne porte le code « ${code} ». Vérifiez la saisie.`)
  if (response.status === 404) throw unknown
  if (!response.ok) {
    throw new CatalogError('Le site a répondu une erreur. Réessayez dans un moment.')
  }

  // Beaucoup d'hébergements renvoient la page d'accueil, avec un code 200, pour
  // une adresse inconnue : sans cette vérification, un code faux passerait pour
  // un fichier abîmé. Un code inconnu doit se dire comme tel.
  const type = response.headers.get('content-type') ?? ''
  const text = await response.text()
  if (!type.includes('json') && !text.trimStart().startsWith('{')) throw unknown

  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new CatalogError('Le jeu publié sous ce code est illisible.')
  }

  if (!isPublishedSet(data)) {
    throw new CatalogError('Le fichier trouvé n’est pas un jeu de cartes.')
  }
  return data
}
