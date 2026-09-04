import { useEffect, useMemo, useState } from 'react'
import { StoreProvider, useStore } from './state/store'
import { ToastProvider } from './components/ui'
import { Icon, type IconName } from './components/Icon'
import { useRoute, type Route } from './lib/router'
import { countCards, isDue, isNew } from './srs/queue'
import { fireDueReminders, isReminderPending } from './reminders/reminders'
import { TodayScreen } from './screens/Today'
import { LibraryScreen } from './screens/Library'
import { SubjectScreen } from './screens/Subject'
import { DeckScreen } from './screens/Deck'
import { ReviewScreen } from './screens/Review'
import { StatsScreen } from './screens/Stats'
import { SettingsScreen } from './screens/Settings'

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

function Shell() {
  const store = useStore()
  const { route, navigate } = useRoute()
  const [sessionOpen, setSessionOpen] = useState(false)

  const dueTotal = useMemo(
    () => store.cards.filter((c) => isDue(c) || isNew(c)).length,
    [store.cards],
  )

  useReminderTicker()

  if (!store.ready) return <Booting />

  const showChrome = !sessionOpen

  return (
    <div className="shell">
      {showChrome && <AppBar route={route} />}

      {route.name === 'today' && <TodayScreen />}
      {route.name === 'library' && <LibraryScreen />}
      {route.name === 'subject' && <SubjectScreen id={route.id} />}
      {route.name === 'deck' && <DeckScreen id={route.id} />}
      {route.name === 'review' && <ReviewScreen onSessionChange={setSessionOpen} />}
      {route.name === 'stats' && <StatsScreen />}
      {route.name === 'settings' && <SettingsScreen />}

      {showChrome && (
        <nav className="tabbar" aria-label="Navigation principale">
          {TABS.map((tab) => {
            const active =
              route.name === tab.name ||
              (tab.name === 'library' && (route.name === 'subject' || route.name === 'deck')) ||
              (tab.name === 'settings' && route.name === 'stats')
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

  const nested = route.name === 'subject' || route.name === 'deck' || route.name === 'stats'

  const titles: Record<string, string> = {
    today: 'Aujourd’hui',
    library: 'Matières',
    review: 'Réviser',
    stats: 'Statistiques',
    settings: 'Réglages',
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
