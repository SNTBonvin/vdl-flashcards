import { useEffect, useMemo, useRef, useState } from 'react'
import { StoreProvider, useStore } from './state/store'
import { ToastProvider } from './components/ui'
import { Icon, type IconName } from './components/Icon'
import { useRoute, type Route } from './lib/router'
import { claimPersistIfSilent } from './lib/storage'
import { checkSets } from './io/updates'
import { countCards, countSession } from './srs/queue'
import { fireDueReminders, isReminderPending } from './reminders/reminders'
import { UpdateBanner } from './components/UpdateBanner'
import { useAppUpdate } from './pwa/update'
import { TodayScreen } from './screens/Today'
import { LibraryScreen } from './screens/Library'
import { SubjectScreen } from './screens/Subject'
import { DeckScreen } from './screens/Deck'
import { ReviewScreen } from './screens/Review'
import { StatsScreen } from './screens/Stats'
import { SettingsScreen } from './screens/Settings'
import { ShareScreen } from './screens/Share'
import { HelpScreen } from './screens/Help'
import { CatalogueScreen } from './screens/Catalogue'
import { DiffusionScreen } from './screens/Diffusion'

export function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </StoreProvider>
  )
}

const TABS: { name: Route['name']; label: string; icon: IconName }[] = [
  { name: 'today', label: 'Aujourd’hui', icon: 'today' },
  { name: 'library', label: 'Matières', icon: 'library' },
  { name: 'review', label: 'Réviser', icon: 'review' },
  { name: 'settings', label: 'Réglages', icon: 'settings' },
]

/**
 * En mode auteur, l'appareil ne révise pas : les deux onglets de révision
 * cèdent la place à la diffusion, qui devient le lieu de travail.
 */
const TABS_AUTEUR: { name: Route['name']; label: string; icon: IconName }[] = [
  { name: 'library', label: 'Matières', icon: 'library' },
  { name: 'diffusion', label: 'Diffusion', icon: 'upload' },
  { name: 'settings', label: 'Réglages', icon: 'settings' },
]

function Shell() {
  const store = useStore()
  const { route, navigate } = useRoute()
  const [sessionOpen, setSessionOpen] = useState(false)
  const update = useAppUpdate()

  // Même compte que la séance, quota du jour compris : une pastille qui annonce
  // plus que ce qu'on peut réviser envoie dans une séance vide.
  const dueTotal = useMemo(
    () =>
      countSession(store.studyCards, {
        introducedToday: store.intro.counts,
        settings: store.settings,
      }).total,
    [store.studyCards, store.intro.counts, store.settings],
  )

  useReminderTicker()

  // Le magasin change à chaque écriture ; les effets ci-dessous veulent sa
  // version du moment, sans se réinstaller pour autant.
  const storeRef = useRef(store)
  storeRef.current = store

  // Stockage durable : on ne prend que ce que le navigateur accorde sans rien
  // afficher. La demande qui ouvre une fenêtre reste dans les réglages.
  useEffect(() => {
    void claimPersistIfSilent()
  }, [])

  // Jeux reçus par code : on regarde si le professeur a redéposé quelque chose,
  // pour pouvoir le signaler. Rien n'est importé sans geste de l'élève, et
  // l'échec est silencieux (voir io/updates).
  //
  // Au démarrage, mais aussi au retour au premier plan : une application
  // installée sur un téléphone n'est jamais « relancée », elle est mise de côté
  // et reprise. Sans cela, celui qui ne ferme jamais l'application ne verrait
  // jamais rien. Le délai d'une heure par jeu, lui, évite la rafale.
  const running = useRef(false)
  useEffect(() => {
    if (!store.ready) return

    const look = async () => {
      if (running.current) return
      running.current = true
      try {
        await checkSets(storeRef.current.decks, storeRef.current.updateDeck)
      } finally {
        running.current = false
      }
    }

    // Quelques secondes de retard : le premier écran d'abord, le réseau ensuite.
    const timer = window.setTimeout(() => void look(), 2500)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void look()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [store.ready])

  if (!store.ready) return <Booting />

  const showChrome = !sessionOpen
  const tabs = store.authorMode ? TABS_AUTEUR : TABS

  return (
    <div className="shell">
      {showChrome && <AppBar route={route} />}

      {/* En mode auteur, l'accueil et la séance n'ont plus d'objet : on est
          renvoyé aux matières, où le travail commence. */}
      {route.name === 'today' && (store.authorMode ? <LibraryScreen /> : <TodayScreen />)}
      {route.name === 'library' && <LibraryScreen />}
      {route.name === 'subject' && <SubjectScreen id={route.id} />}
      {route.name === 'deck' && <DeckScreen key={route.id} id={route.id} lot={route.lot} />}
      {route.name === 'review' &&
        (store.authorMode ? <LibraryScreen /> : <ReviewScreen onSessionChange={setSessionOpen} />)}
      {route.name === 'stats' && <StatsScreen />}
      {route.name === 'settings' && <SettingsScreen />}
      {route.name === 'share' && <ShareScreen token={route.token} />}
      {route.name === 'set' && <ShareScreen code={route.code} />}
      {route.name === 'catalogue' && <CatalogueScreen />}
      {route.name === 'diffusion' && <DiffusionScreen />}
      {route.name === 'help' && <HelpScreen />}

      {/* Masqué pendant une session : on n'interrompt pas une révision en cours. */}
      {showChrome && <UpdateBanner update={update} />}

      {showChrome && (
        <nav className="tabbar" aria-label="Navigation principale">
          {tabs.map((tab) => {
            const active =
              route.name === tab.name ||
              (tab.name === 'library' &&
                (route.name === 'subject' ||
                  route.name === 'deck' ||
                  route.name === 'catalogue')) ||
              (tab.name === 'settings' &&
                (route.name === 'stats' ||
                  route.name === 'help' ||
                  (route.name === 'diffusion' && !store.authorMode)))
            return (
              <button
                key={tab.name}
                type="button"
                className="tab"
                aria-current={active ? 'page' : undefined}
                onClick={() => navigate({ name: tab.name } as Route)}
              >
                <Icon name={tab.icon} size={21} />
                <span>{tab.label}</span>
                {tab.name === 'today' && dueTotal > 0 && (
                  <span className="tab__badge">{dueTotal > 99 ? '99+' : dueTotal}</span>
                )}
              </button>
            )
          })}
        </nav>
      )}
    </div>
  )
}

function AppBar({ route }: { route: Route }) {
  const [scrolled, setScrolled] = useState(false)
  const { navigate, back } = useRoute()
  const store = useStore()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const subject = route.name === 'subject' ? store.subjects.find((s) => s.id === route.id) : null
  const deck = route.name === 'deck' ? store.decks.find((d) => d.id === route.id) : null
  const deckSubject = deck ? store.subjects.find((s) => s.id === deck.subjectId) : null

  const nested =
    route.name === 'subject' ||
    route.name === 'deck' ||
    route.name === 'stats' ||
    route.name === 'help' ||
    route.name === 'catalogue' ||
    route.name === 'diffusion'

  const titles: Record<string, string> = {
    today: 'Aujourd’hui',
    library: 'Matières',
    review: 'Réviser',
    stats: 'Statistiques',
    settings: 'Réglages',
    share: 'Thème partagé',
    set: 'Jeu publié',
    catalogue: 'Catalogue',
    diffusion: 'Diffusion',
    help: 'Prise en main',
  }

  return (
    <header className="appbar" data-scrolled={scrolled}>
      <div className="appbar__inner">
        {nested && (
          <button type="button" className="icon-btn icon-btn--bare" onClick={back} aria-label="Retour">
            <Icon name="chevron-left" size={20} />
          </button>
        )}
        <div className="grow stack" style={{ gap: 0, minWidth: 0 }}>
          {/* Sur les onglets, le grand titre de la page suffit : la barre ne
              reprend le libellé qu'une fois la page défilée. */}
          <div className="appbar__title truncate" hidden={!nested && !scrolled}>
            {subject?.name ?? deck?.name ?? titles[route.name] ?? 'Flashcards'}
          </div>
          {deckSubject && <div className="appbar__sub truncate">{deckSubject.name}</div>}
        </div>
        {route.name === 'today' && (
          <button
            type="button"
            className="icon-btn"
            onClick={() => navigate({ name: 'stats' })}
            aria-label="Statistiques"
          >
            <Icon name="chart" size={19} />
          </button>
        )}
      </div>
    </header>
  )
}

function Booting() {
  return (
    <div className="shell">
      <div className="screen" style={{ display: 'grid', placeItems: 'center', minHeight: '70dvh' }}>
        <div className="stack stack-3" style={{ alignItems: 'center' }}>
          <div className="glyph glyph--lg">
            <Icon name="layers" size={22} />
          </div>
          <span className="eyebrow">Chargement…</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Évalue les rappels au lancement, à chaque retour au premier plan, puis
 * toutes les minutes tant que l'application reste visible.
 */
function useReminderTicker() {
  const store = useStore()

  useEffect(() => {
    if (!store.ready) return
    let stopped = false

    const tick = async () => {
      if (stopped || document.visibilityState !== 'visible') return
      if (!store.settings.notificationsEnabled) return

      const pending = store.decks.filter((d) => isReminderPending(d))
      if (pending.length === 0) return

      const fired = await fireDueReminders(pending, (deckId) => {
        const cards = store.cardsByDeck.get(deckId) ?? []
        const counts = countCards(cards)
        return counts.due + counts.fresh
      })

      const now = Date.now()
      for (const deckId of fired) {
        const deck = store.decks.find((d) => d.id === deckId)
        if (deck?.reminder) {
          await store.setReminder(deckId, { ...deck.reminder, lastFiredAt: now })
        }
      }
    }

    void tick()
    const interval = window.setInterval(tick, 60_000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      stopped = true
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [store])
}
