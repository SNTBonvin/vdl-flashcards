/**
 * Détection des mises à jour de l'application.
 *
 * Le problème à résoudre : une PWA installée n'est presque jamais rechargée.
 * L'élève la garde ouverte en arrière-plan pendant des jours, et « rafraîchir
 * la page » ne suffit pas — tant qu'un onglet reste ouvert, le service worker
 * déjà installé continue de servir l'ancienne version depuis son cache.
 *
 * D'où trois mécanismes :
 *
 *  1. le nouveau service worker prend la main dès son installation
 *     (`skipWaiting` + `clientsClaim`, réglés dans vite.config.ts) : il n'attend
 *     pas la fermeture de tous les onglets, qui peut ne jamais arriver ;
 *  2. une vérification explicite à chaque retour au premier plan, au retour du
 *     réseau, puis toutes les trente minutes ;
 *  3. le rechargement, lui, n'est jamais imposé : un bandeau le propose, pour
 *     ne pas interrompre une session de révision en cours.
 *
 * Les données ne sont jamais concernées : elles vivent dans IndexedDB, que la
 * mise à jour du service worker ne touche pas. Seuls les fichiers de
 * l'application (HTML, JS, CSS, polices) sont remplacés.
 */

import { useCallback, useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

/** Intervalle entre deux vérifications tant que l'application reste ouverte. */
const CHECK_INTERVAL = 30 * 60 * 1000

const hasSW = typeof navigator !== 'undefined' && 'serviceWorker' in navigator

/**
 * Y avait-il déjà un service worker aux commandes au chargement ?
 *
 * Sans cette photographie prise avant tout enregistrement, on confondrait la
 * toute première prise de contrôle (installation initiale, parfaitement
 * normale) avec l'arrivée d'une nouvelle version.
 */
const hadControllerAtStartup = hasSW && navigator.serviceWorker.controller !== null

interface State {
  available: boolean
  listeners: Set<(available: boolean) => void>
}

// Le service worker ne doit être enregistré qu'une fois par chargement de
// page, alors que le composant qui l'observe peut être monté plusieurs fois.
const state: State = { available: false, listeners: new Set() }
let started = false

function announce() {
  if (state.available) return // déjà signalé
  state.available = true
  for (const listener of state.listeners) listener(true)
}

function start() {
  if (started) return
  started = true

  registerSW({
    immediate: true,
    // Signalé dès qu'une nouvelle version est installée, avant même qu'elle
    // ne prenne la main.
    onNeedRefresh() {
      announce()
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return

      const check = () => {
        if (document.visibilityState !== 'visible') return
        // Un échec ici (hors ligne, serveur injoignable) est sans conséquence :
        // on retentera au prochain passage au premier plan.
        registration.update().catch(() => {})
      }

      document.addEventListener('visibilitychange', check)
      window.addEventListener('online', check)
      window.setInterval(check, CHECK_INTERVAL)
    },
  })

  if (hasSW) {
    // Le nouveau service worker vient de prendre les commandes : les fichiers
    // servis ne sont plus ceux que cette page a chargés.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadControllerAtStartup) announce()
    })
  }
}

export interface AppUpdate {
  /** Une nouvelle version attend d'être appliquée. */
  available: boolean
  /** Applique la mise à jour et recharge l'application. */
  apply: () => void
  /** Masque le bandeau jusqu'au prochain lancement. */
  dismiss: () => void
}

export function useAppUpdate(): AppUpdate {
  const [available, setAvailable] = useState(state.available)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    start()
    const listener = (next: boolean) => {
      setAvailable(next)
      if (next) setDismissed(false)
    }
    state.listeners.add(listener)
    setAvailable(state.available)
    return () => {
      state.listeners.delete(listener)
    }
  }, [])

  /**
   * Le rechargement est inconditionnel : au moment du clic, le nouveau service
   * worker a le plus souvent déjà pris la main, et recharger suffit. S'il
   * attendait encore, on lui demande d'abord la main — mais on recharge dans
   * tous les cas, pour qu'un bouton pressé produise toujours un effet visible.
   */
  const apply = useCallback(() => {
    void (async () => {
      try {
        const registration = await navigator.serviceWorker?.getRegistration()
        if (registration?.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
          await new Promise((resolve) => setTimeout(resolve, 300))
        }
      } catch {
        /* on recharge quand même */
      }
      window.location.reload()
    })()
  }, [])

  return { available: available && !dismissed, apply, dismiss: () => setDismissed(true) }
}

/** Version affichée dans les réglages, pour vérifier qu'une mise à jour a bien été appliquée. */
export const APP_VERSION = __APP_VERSION__
export const APP_BUILD_DATE = __APP_BUILD_DATE__
