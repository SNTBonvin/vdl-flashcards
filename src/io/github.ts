/**
 * Dépôt d'un fichier sur GitHub, depuis l'appareil de l'enseignant.
 *
 * L'application est servie par le dépôt, sans droits sur lui : c'est bien pour
 * cela qu'aucune clé ne figure dans le code envoyé aux élèves, et cela ne
 * changera pas. Ce module ne sert **que** l'appareil de celui qui publie, avec
 * un jeton qu'il a créé lui-même et saisi dans ses réglages.
 *
 * Trois garde-fous, qui sont la raison d'être de ce fichier :
 *
 *  - **le jeton n'est pas dans les réglages.** Il vit dans une case à part de
 *    la base locale, précisément pour ne pas partir dans l'export de
 *    sauvegarde : une sauvegarde se transmet, se pose sur un ordinateur
 *    partagé, se perd. Un jeton d'écriture n'a rien à y faire.
 *  - **il ne part que vers `api.github.com`**, et seulement sur un geste
 *    explicite de publication.
 *  - **rien n'en dépend.** Sans jeton, la feuille de publication reste ce
 *    qu'elle était : préparer le fichier, l'ouvrir dans le navigateur, coller.
 *    Un jeton expiré ou révoqué ramène simplement à ce chemin-là.
 */

import { delMeta, getMeta, setMeta } from '../db/idb'

/** Clé du magasin « meta ». Volontairement hors de l'objet des réglages. */
const TOKEN_KEY = 'publishToken'

export class PublishError extends Error {}

export interface RepoRef {
  owner: string
  repo: string
}

/** `https://github.com/compte/projet` → `{ owner, repo }`. Les autres forges : non. */
export function parseRepo(url: string): RepoRef | null {
  const match = url
    .trim()
    .replace(/\.git$/, '')
    .replace(/\/+$/, '')
    .match(/^https?:\/\/(?:www\.)?github\.com\/([^/\s]+)\/([^/\s]+)$/i)
  return match ? { owner: match[1], repo: match[2] } : null
}

export async function readToken(): Promise<string> {
  return (await getMeta<string>(TOKEN_KEY)) ?? ''
}

export async function saveToken(token: string): Promise<void> {
  const value = token.trim()
  if (value) await setMeta(TOKEN_KEY, value)
  else await delMeta(TOKEN_KEY)
}

export async function forgetToken(): Promise<void> {
  await delMeta(TOKEN_KEY)
}

const API = 'https://api.github.com'

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

/**
 * Traduit une réponse d'erreur en une phrase qui dit quoi faire.
 *
 * GitHub répond 404 aussi bien pour un dépôt qui n'existe pas que pour un
 * dépôt auquel le jeton n'a pas accès — c'est délibéré de leur part, et cela
 * doit se dire tel quel plutôt que de laisser chercher du mauvais côté.
 */
function fail(status: number): PublishError {
  if (status === 401)
    return new PublishError(
      'Le jeton a été refusé. Il est peut-être expiré, révoqué, ou incomplet à la recopie.',
    )
  if (status === 403)
    return new PublishError(
      'Le jeton n’a pas le droit d’écrire ici. Il lui faut l’autorisation « Contents » en lecture et écriture sur ce dépôt.',
    )
  if (status === 404)
    return new PublishError(
      'Dépôt introuvable — ou le jeton n’a pas été autorisé sur ce dépôt précis. Vérifiez l’adresse et la portée du jeton.',
    )
  if (status === 409 || status === 422)
    return new PublishError(
      'Le fichier a changé sur le dépôt entre-temps. Rouvrez la feuille de publication et recommencez.',
    )
  return new PublishError(`GitHub a répondu une erreur (${status}). Réessayez dans un moment.`)
}

async function call(path: string, token: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API}${path}`, { ...init, headers: headers(token) })
  } catch {
    throw new PublishError('Impossible de joindre GitHub. Vérifiez votre connexion.')
  }
}

/** Le jeton ouvre-t-il bien ce dépôt, et en écriture ? */
export async function checkAccess(repo: RepoRef, token: string): Promise<void> {
  const response = await call(`/repos/${repo.owner}/${repo.repo}`, token)
  if (!response.ok) throw fail(response.status)
  const data = (await response.json()) as { permissions?: { push?: boolean } }
  // L'absence de la section « permissions » n'est pas un refus : certains
  // jetons ne la renvoient pas. On ne conclut que sur un « push: false » franc.
  if (data.permissions && data.permissions.push === false) throw fail(403)
}

/** Empreinte du fichier déjà en place, `null` s'il n'existe pas encore. */
async function currentSha(repo: RepoRef, token: string, path: string): Promise<string | null> {
  const response = await call(`/repos/${repo.owner}/${repo.repo}/contents/${path}`, token)
  if (response.status === 404) return null
  if (!response.ok) throw fail(response.status)
  const data = (await response.json()) as { sha?: string }
  return data.sha ?? null
}

/** `btoa` ne prend que des octets : on encode d'abord en UTF-8. */
function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

export interface PutResult {
  /** Adresse du fichier sur le dépôt, pour pouvoir aller vérifier. */
  url: string
  /** Vrai s'il s'agissait d'un remplacement, faux d'une création. */
  replaced: boolean
}

/**
 * Dépose ou remplace un fichier. La branche n'est pas précisée : GitHub écrit
 * alors sur la branche par défaut du dépôt, ce qui évite de deviner son nom.
 */
export async function putFile(
  repo: RepoRef,
  token: string,
  path: string,
  content: string,
  message: string,
): Promise<PutResult> {
  const sha = await currentSha(repo, token, path)
  const response = await call(`/repos/${repo.owner}/${repo.repo}/contents/${path}`, token, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: toBase64(content),
      ...(sha ? { sha } : {}),
    }),
  })
  if (!response.ok) throw fail(response.status)
  const data = (await response.json()) as { content?: { html_url?: string } }
  return {
    url: data.content?.html_url ?? `https://github.com/${repo.owner}/${repo.repo}/blob/HEAD/${path}`,
    replaced: sha !== null,
  }
}
