/**
 * Thème clair / sombre.
 *
 * Trois états : « auto » suit le réglage du téléphone, « light » et « dark »
 * forcent l'un ou l'autre. Le choix est propre à l'appareil (un élève peut
 * préférer le sombre sur son téléphone et le clair sur l'ordinateur du CDI),
 * il est donc rangé dans localStorage et non dans les réglages sauvegardés.
 *
 * Le thème effectif est toujours écrit sur <html data-theme>, y compris en
 * mode automatique : la feuille de style n'a ainsi qu'un seul bloc sombre à
 * maintenir. Le premier calcul a lieu dans un script en ligne de index.html,
 * avant le premier rendu, pour éviter un éclair de thème clair au lancement.
 */

import { useCallback, useEffect, useState } from 'react'

export type ThemeMode = 'auto' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'vdl-theme'

/** Couleur de la barre d'état du téléphone, accordée au fond de l'application. */
const THEME_COLOR: Record<ResolvedTheme, string> = {
  light: '#f6f4ee',
  dark: '#14120e',
}

export function readMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored
  } catch {
    /* stockage indisponible : on retombe sur le réglage du système */
  }
  return 'auto'
}

function prefersDark(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolve(mode: ThemeMode): ResolvedTheme {
  if (mode === 'auto') return prefersDark() ? 'dark' : 'light'
  return mode
}

function paint(theme: ResolvedTheme) {
  document.documentElement.dataset.theme = theme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLOR[theme])
}

export interface Theme {
  mode: ThemeMode
  resolved: ResolvedTheme
  setMode: (mode: ThemeMode) => void
}

export function useTheme(): Theme {
  const [mode, setModeState] = useState<ThemeMode>(readMode)
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolve(readMode()))

  // En mode automatique, suivre les changements du système (bascule nuit du
  // téléphone) sans que l'utilisateur ait à rouvrir l'application.
  useEffect(() => {
    const next = resolve(mode)
    setResolved(next)
    paint(next)

    if (mode !== 'auto' || typeof matchMedia !== 'function') return
    const query = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const updated: ResolvedTheme = query.matches ? 'dark' : 'light'
      setResolved(updated)
      paint(updated)
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [mode])

  const setMode = useCallback((next: ThemeMode) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      /* le thème s'appliquera quand même, simplement sans être mémorisé */
    }
    setModeState(next)
  }, [])

  return { mode, resolved, setMode }
}
