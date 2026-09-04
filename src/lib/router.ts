/** Routeur minimal basé sur le fragment d'URL (compatible PWA hors-ligne). */

import { useCallback, useEffect, useState } from 'react'

export type Route =
  | { name: 'today' }
  | { name: 'library' }
  | { name: 'subject'; id: string }
  | { name: 'deck'; id: string }
  | { name: 'review' }
  | { name: 'stats' }
  | { name: 'settings' }

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split('?')[0]
  const [head, param] = path.split('/')
  switch (head) {
    case 'library':
      return { name: 'library' }
    case 'subject':
      return param ? { name: 'subject', id: param } : { name: 'library' }
    case 'deck':
      return param ? { name: 'deck', id: param } : { name: 'library' }
    case 'review':
      return { name: 'review' }
    case 'stats':
      return { name: 'stats' }
    case 'settings':
      return { name: 'settings' }
    default:
      return { name: 'today' }
  }
}

export function toPath(route: Route): string {
  switch (route.name) {
    case 'subject':
      return `#/subject/${route.id}`
    case 'deck':
      return `#/deck/${route.id}`
    case 'today':
      return '#/today'
    default:
      return `#/${route.name}`
  }
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const navigate = useCallback((next: Route) => {
    window.location.hash = toPath(next)
  }, [])

  const back = useCallback(() => {
    if (window.history.length > 1) window.history.back()
    else window.location.hash = '#/library'
  }, [])

  return { route, navigate, back }
}
