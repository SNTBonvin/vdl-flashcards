/**
 * Magasin applicatif : l'intégralité des données tient en mémoire (le volume
 * reste modeste) et chaque écriture est répercutée dans IndexedDB.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import * as idb from '../db/idb'
import {
  DEFAULT_SETTINGS,
  type Backup,
  type Card,
  type Deck,
  type Grade,
  type ID,
  type Reminder,
  type ReviewLog,
  type Settings,
  type Subject,
} from '../db/types'
import { grade as gradeCard, newSrs } from '../srs/scheduler'
import { cardKey, type SharePayload } from '../io/share'
import { dayKey } from '../lib/date'
import { uid } from '../lib/id'

export interface ImportResult {
  deckId: ID
  /** Cartes nouvellement ajoutées. */
  added: number
  /** Cartes déjà présentes dont le contenu a été mis à jour. */
  updated: number
  /** Cartes déjà présentes et inchangées : leur progression est conservée. */
  unchanged: number
  /** Le thème existait déjà (même identifiant de partage). */
  merged: boolean
}

interface IntroTracker {
  day: string
  counts: Record<ID, number>
}

interface State {
  ready: boolean
  subjects: Subject[]
  decks: Deck[]
  cards: Card[]
  logs: ReviewLog[]
  settings: Settings
  intro: IntroTracker
}

type Action =
  | { type: 'loaded'; payload: Omit<State, 'ready'> }
  | { type: 'subjects'; payload: Subject[] }
  | { type: 'decks'; payload: Deck[] }
  | { type: 'cards'; payload: Card[] }
  | { type: 'logs'; payload: ReviewLog[] }
  | { type: 'settings'; payload: Settings }
  | { type: 'intro'; payload: IntroTracker }
  | { type: 'replaceAll'; payload: Omit<State, 'ready' | 'intro'> }

const INITIAL: State = {
  ready: false,
  subjects: [],
  decks: [],
  cards: [],
  logs: [],
  settings: DEFAULT_SETTINGS,
  intro: { day: dayKey(), counts: {} },
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loaded':
      return { ...action.payload, ready: true }
    case 'subjects':
      return { ...state, subjects: action.payload }
    case 'decks':
      return { ...state, decks: action.payload }
    case 'cards':
      return { ...state, cards: action.payload }
    case 'logs':
      return { ...state, logs: action.payload }
    case 'settings':
      return { ...state, settings: action.payload }
    case 'intro':
      return { ...state, intro: action.payload }
    case 'replaceAll':
      return { ...state, ...action.payload }
  }
}

const byPosition = <T extends { position: number; createdAt: number }>(a: T, b: T) =>
  a.position - b.position || a.createdAt - b.createdAt

export interface Store extends State {
  /** Cartes indexées par thème — recalculé à chaque changement. */
  cardsByDeck: Map<ID, Card[]>
  decksBySubject: Map<ID, Deck[]>

  createSubject(name: string, code?: string): Promise<Subject>
  updateSubject(id: ID, patch: Partial<Omit<Subject, 'id'>>): Promise<void>
  deleteSubject(id: ID): Promise<void>

  createDeck(subjectId: ID, name: string, description?: string): Promise<Deck>
  updateDeck(id: ID, patch: Partial<Omit<Deck, 'id'>>): Promise<void>
  setReminder(id: ID, reminder: Reminder | null): Promise<void>
  deleteDeck(id: ID): Promise<void>

  createCard(deckId: ID, data: Pick<Card, 'front' | 'back'> & Partial<Card>): Promise<Card>
  createCards(deckId: ID, rows: { front: string; back: string; notes?: string; tags?: string[] }[]): Promise<number>
  updateCard(id: ID, patch: Partial<Omit<Card, 'id'>>): Promise<void>
  deleteCard(id: ID): Promise<void>
  deleteCards(ids: ID[]): Promise<void>
  moveCards(ids: ID[], deckId: ID): Promise<void>

  answer(card: Card, value: Grade): Promise<Card>
  resetCards(ids: ID[]): Promise<void>

  /** Attribue un identifiant de partage au thème s'il n'en a pas encore. */
  prepareShare(deckId: ID): Promise<string>
  /** Ajoute ou met à jour un thème reçu par lien. */
  importShare(payload: SharePayload): Promise<ImportResult>

  saveSettings(patch: Partial<Settings>): Promise<void>
  restore(backup: Backup): Promise<void>
  wipe(): Promise<void>
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [subjects, decks, cards, logs, settings, intro] = await Promise.all([
        idb.getAll<Subject>('subjects'),
        idb.getAll<Deck>('decks'),
        idb.getAll<Card>('cards'),
        idb.getAll<ReviewLog>('logs'),
        idb.getMeta<Settings>('settings'),
        idb.getMeta<IntroTracker>('intro'),
      ])
      if (cancelled) return

      const today = dayKey()
      dispatch({
        type: 'loaded',
        payload: {
          subjects: subjects.sort(byPosition),
          decks: decks.sort(byPosition),
          cards,
          logs,
          settings: { ...DEFAULT_SETTINGS, ...(settings ?? {}) },
          intro: intro && intro.day === today ? intro : { day: today, counts: {} },
        },
      })
    })().catch((error) => {
      console.error('Chargement des données impossible', error)
      dispatch({ type: 'loaded', payload: { ...INITIAL } })
    })
    return () => {
      cancelled = true
    }
  }, [])

  /* ----------------------------- Matières ----------------------------- */

  const createSubject = useCallback(async (name: string, code?: string) => {
    const current = stateRef.current.subjects
    const subject: Subject = {
      id: uid('s'),
      name: name.trim(),
      code: (code?.trim() || name.trim().slice(0, 3)).toUpperCase(),
      createdAt: Date.now(),
      position: current.length,
    }
    await idb.put('subjects', subject)
    dispatch({ type: 'subjects', payload: [...current, subject].sort(byPosition) })
    return subject
  }, [])

  const updateSubject = useCallback(async (id: ID, patch: Partial<Omit<Subject, 'id'>>) => {
    const next = stateRef.current.subjects.map((s) => (s.id === id ? { ...s, ...patch } : s))
    const updated = next.find((s) => s.id === id)
    if (updated) await idb.put('subjects', updated)
    dispatch({ type: 'subjects', payload: next.sort(byPosition) })
  }, [])

  const deleteSubject = useCallback(async (id: ID) => {
    const { subjects, decks, cards } = stateRef.current
    const deckIds = decks.filter((d) => d.subjectId === id).map((d) => d.id)
    const cardIds = cards.filter((c) => deckIds.includes(c.deckId)).map((c) => c.id)
    await Promise.all([
      idb.del('subjects', [id]),
      idb.del('decks', deckIds),
      idb.del('cards', cardIds),
    ])
    dispatch({ type: 'subjects', payload: subjects.filter((s) => s.id !== id) })
    dispatch({ type: 'decks', payload: decks.filter((d) => d.subjectId !== id) })
    dispatch({ type: 'cards', payload: cards.filter((c) => !deckIds.includes(c.deckId)) })
  }, [])

  /* ---------------------------- Thèmes ---------------------------- */

  const createDeck = useCallback(async (subjectId: ID, name: string, description = '') => {
    const current = stateRef.current.decks
    const deck: Deck = {
      id: uid('d'),
      subjectId,
      name: name.trim(),
      description: description.trim(),
      createdAt: Date.now(),
      position: current.filter((d) => d.subjectId === subjectId).length,
      reminder: null,
    }
    await idb.put('decks', deck)
    dispatch({ type: 'decks', payload: [...current, deck].sort(byPosition) })
    return deck
  }, [])

  const updateDeck = useCallback(async (id: ID, patch: Partial<Omit<Deck, 'id'>>) => {
    const next = stateRef.current.decks.map((d) => (d.id === id ? { ...d, ...patch } : d))
    const updated = next.find((d) => d.id === id)
    if (updated) await idb.put('decks', updated)
    dispatch({ type: 'decks', payload: next.sort(byPosition) })
  }, [])

  const setReminder = useCallback(
    (id: ID, reminder: Reminder | null) => updateDeck(id, { reminder }),
    [updateDeck],
  )

  const deleteDeck = useCallback(async (id: ID) => {
    const { decks, cards } = stateRef.current
    const cardIds = cards.filter((c) => c.deckId === id).map((c) => c.id)
    await Promise.all([idb.del('decks', [id]), idb.del('cards', cardIds)])
    dispatch({ type: 'decks', payload: decks.filter((d) => d.id !== id) })
    dispatch({ type: 'cards', payload: cards.filter((c) => c.deckId !== id) })
  }, [])

  /* ------------------------------ Cartes ------------------------------ */

  const makeCard = (deckId: ID, data: Partial<Card> & { front: string; back: string }): Card => {
    const now = Date.now()
    return {
      id: uid('c'),
      deckId,
      front: data.front.trim(),
      back: data.back.trim(),
      notes: (data.notes ?? '').trim(),
      tags: data.tags ?? [],
      createdAt: now,
      updatedAt: now,
      suspended: data.suspended ?? false,
      srs: data.srs ?? newSrs(now),
    }
  }

  const createCard = useCallback(
    async (deckId: ID, data: Pick<Card, 'front' | 'back'> & Partial<Card>) => {
      const card = makeCard(deckId, data)
      await idb.put('cards', card)
      dispatch({ type: 'cards', payload: [...stateRef.current.cards, card] })
      return card
    },
    [],
  )

  const createCards = useCallback(
    async (deckId: ID, rows: { front: string; back: string; notes?: string; tags?: string[] }[]) => {
      const cards = rows
        .filter((r) => r.front.trim() && r.back.trim())
        .map((r) => makeCard(deckId, r as Card))
      if (cards.length === 0) return 0
      await idb.putMany('cards', cards)
      dispatch({ type: 'cards', payload: [...stateRef.current.cards, ...cards] })
      return cards.length
    },
    [],
  )

  const updateCard = useCallback(async (id: ID, patch: Partial<Omit<Card, 'id'>>) => {
    const next = stateRef.current.cards.map((c) =>
      c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c,
    )
    const updated = next.find((c) => c.id === id)
    if (updated) await idb.put('cards', updated)
    dispatch({ type: 'cards', payload: next })
  }, [])

  const deleteCards = useCallback(async (ids: ID[]) => {
    if (ids.length === 0) return
    await idb.del('cards', ids)
    const set = new Set(ids)
    dispatch({ type: 'cards', payload: stateRef.current.cards.filter((c) => !set.has(c.id)) })
  }, [])

  const deleteCard = useCallback((id: ID) => deleteCards([id]), [deleteCards])

  const moveCards = useCallback(async (ids: ID[], deckId: ID) => {
    const set = new Set(ids)
    const next = stateRef.current.cards.map((c) =>
      set.has(c.id) ? { ...c, deckId, updatedAt: Date.now() } : c,
    )
    await idb.putMany('cards', next.filter((c) => set.has(c.id)))
    dispatch({ type: 'cards', payload: next })
  }, [])

  /* ---------------------------- Révision ------------------------------ */

  const answer = useCallback(async (card: Card, value: Grade) => {
    const { settings, cards, logs, intro } = stateRef.current
    const now = Date.now()
    const wasNew = card.srs.state === 'new'
    const srs = gradeCard(card.srs, value, settings, now)
    const updated: Card = { ...card, srs, updatedAt: now }

    const log: ReviewLog = {
      id: uid('l'),
      cardId: card.id,
      deckId: card.deckId,
      ts: now,
      grade: value,
      prevInterval: card.srs.interval,
      nextInterval: srs.interval,
    }

    const today = dayKey(now)
    const base = intro.day === today ? intro : { day: today, counts: {} }
    const nextIntro: IntroTracker = wasNew
      ? { day: today, counts: { ...base.counts, [card.deckId]: (base.counts[card.deckId] ?? 0) + 1 } }
      : base

    await Promise.all([
      idb.put('cards', updated),
      idb.put('logs', log),
      idb.setMeta('intro', nextIntro),
    ])

    dispatch({ type: 'cards', payload: cards.map((c) => (c.id === card.id ? updated : c)) })
    dispatch({ type: 'logs', payload: [...logs, log] })
    dispatch({ type: 'intro', payload: nextIntro })
    return updated
  }, [])

  const resetCards = useCallback(async (ids: ID[]) => {
    const set = new Set(ids)
    const now = Date.now()
    const next = stateRef.current.cards.map((c) =>
      set.has(c.id) ? { ...c, srs: newSrs(now), updatedAt: now } : c,
    )
    await idb.putMany('cards', next.filter((c) => set.has(c.id)))
    dispatch({ type: 'cards', payload: next })
  }, [])

  /* ----------------------------- Partage ------------------------------ */

  const prepareShare = useCallback(async (deckId: ID) => {
    const deck = stateRef.current.decks.find((d) => d.id === deckId)
    if (!deck) throw new Error('Thème introuvable.')
    if (deck.shareId) return deck.shareId
    const shareId = uid('sh')
    const next = stateRef.current.decks.map((d) => (d.id === deckId ? { ...d, shareId } : d))
    await idb.put('decks', next.find((d) => d.id === deckId)!)
    dispatch({ type: 'decks', payload: next })
    return shareId
  }, [])

  /**
   * Ajoute un thème reçu par lien, ou le met à jour s'il est déjà là.
   *
   * Deux règles importantes pour l'élève :
   *  - les cartes sont appariées sur leur recto normalisé, donc une carte déjà
   *    travaillée **conserve sa progression** même si le verso a été corrigé ;
   *  - une carte retirée du jeu par l'auteur n'est jamais supprimée : un lien
   *    n'efface rien chez celui qui le reçoit.
   */
  const importShare = useCallback(async (payload: SharePayload): Promise<ImportResult> => {
    const { subjects, decks, cards } = stateRef.current
    const now = Date.now()

    const normalized = payload.s.trim().toLowerCase()
    let subject = subjects.find((s) => s.name.trim().toLowerCase() === normalized)
    let nextSubjects = subjects
    if (!subject) {
      subject = {
        id: uid('s'),
        name: payload.s.trim(),
        code: payload.s.trim().slice(0, 3).toUpperCase(),
        createdAt: now,
        position: subjects.length,
      }
      nextSubjects = [...subjects, subject]
      await idb.put('subjects', subject)
    }

    // Le thème est retrouvé par son identifiant de partage, où qu'il ait été
    // rangé entre-temps par l'élève.
    const existing = decks.find((d) => d.shareId === payload.id)
    const deck: Deck = existing
      ? {
          ...existing,
          name: payload.t.trim(),
          description: payload.d?.trim() ?? existing.description,
          shareRev: Math.max(existing.shareRev ?? 0, payload.rev),
          sharedBy: payload.by ?? existing.sharedBy,
        }
      : {
          id: uid('d'),
          subjectId: subject.id,
          name: payload.t.trim(),
          description: payload.d?.trim() ?? '',
          createdAt: now,
          position: decks.filter((d) => d.subjectId === subject!.id).length,
          reminder: null,
          shareId: payload.id,
          shareRev: payload.rev,
          sharedBy: payload.by,
        }

    const inDeck = cards.filter((c) => c.deckId === deck.id)
    const byKey = new Map(inDeck.map((c) => [cardKey(c.front), c]))

    const created: Card[] = []
    const touched: Card[] = []
    let unchanged = 0

    for (const [front, back, notes] of payload.c) {
      if (!front?.trim() || !back?.trim()) continue
      const current = byKey.get(cardKey(front))
      if (!current) {
        created.push(makeCard(deck.id, { front, back, notes: notes ?? '' } as Card))
        continue
      }
      const nextBack = back.trim()
      const nextNotes = (notes ?? '').trim()
      if (current.back === nextBack && current.notes === nextNotes) {
        unchanged += 1
        continue
      }
      // La progression (srs) est délibérément laissée intacte.
      touched.push({ ...current, back: nextBack, notes: nextNotes, updatedAt: now })
    }

    await Promise.all([
      idb.put('decks', deck),
      idb.putMany('cards', [...created, ...touched]),
    ])

    const touchedIds = new Set(touched.map((c) => c.id))
    dispatch({ type: 'subjects', payload: nextSubjects.slice().sort(byPosition) })
    dispatch({
      type: 'decks',
      payload: (existing ? decks.map((d) => (d.id === deck.id ? deck : d)) : [...decks, deck]).sort(
        byPosition,
      ),
    })
    dispatch({
      type: 'cards',
      payload: [
        ...cards.map((c) => (touchedIds.has(c.id) ? touched.find((u) => u.id === c.id)! : c)),
        ...created,
      ],
    })

    return {
      deckId: deck.id,
      added: created.length,
      updated: touched.length,
      unchanged,
      merged: Boolean(existing),
    }
  }, [])

  /* ---------------------------- Réglages ------------------------------ */

  const saveSettings = useCallback(async (patch: Partial<Settings>) => {
    const next = { ...stateRef.current.settings, ...patch }
    await idb.setMeta('settings', next)
    dispatch({ type: 'settings', payload: next })
  }, [])

  const restore = useCallback(async (backup: Backup) => {
    await idb.clearAll()
    await Promise.all([
      idb.putMany('subjects', backup.subjects),
      idb.putMany('decks', backup.decks),
      idb.putMany('cards', backup.cards),
      idb.putMany('logs', backup.logs ?? []),
      idb.setMeta('settings', { ...DEFAULT_SETTINGS, ...(backup.settings ?? {}) }),
    ])
    dispatch({
      type: 'replaceAll',
      payload: {
        subjects: backup.subjects.slice().sort(byPosition),
        decks: backup.decks.slice().sort(byPosition),
        cards: backup.cards,
        logs: backup.logs ?? [],
        settings: { ...DEFAULT_SETTINGS, ...(backup.settings ?? {}) },
      },
    })
  }, [])

  const wipe = useCallback(async () => {
    await idb.clearAll()
    dispatch({
      type: 'replaceAll',
      payload: { subjects: [], decks: [], cards: [], logs: [], settings: stateRef.current.settings },
    })
  }, [])

  const indexes = useMemo(() => {
    const cardsByDeck = new Map<ID, Card[]>()
    for (const deck of state.decks) cardsByDeck.set(deck.id, [])
    for (const card of state.cards) {
      const list = cardsByDeck.get(card.deckId)
      if (list) list.push(card)
      else cardsByDeck.set(card.deckId, [card])
    }
    const decksBySubject = new Map<ID, Deck[]>()
    for (const subject of state.subjects) decksBySubject.set(subject.id, [])
    for (const deck of state.decks) {
      const list = decksBySubject.get(deck.subjectId)
      if (list) list.push(deck)
      else decksBySubject.set(deck.subjectId, [deck])
    }
    return { cardsByDeck, decksBySubject }
  }, [state.cards, state.decks, state.subjects])

  const value = useMemo<Store>(
    () => ({
      ...state,
      ...indexes,
      createSubject,
      updateSubject,
      deleteSubject,
      createDeck,
      updateDeck,
      setReminder,
      deleteDeck,
      createCard,
      createCards,
      updateCard,
      deleteCard,
      deleteCards,
      moveCards,
      answer,
      resetCards,
      prepareShare,
      importShare,
      saveSettings,
      restore,
      wipe,
    }),
    [
      state,
      indexes,
      createSubject,
      updateSubject,
      deleteSubject,
      createDeck,
      updateDeck,
      setReminder,
      deleteDeck,
      createCard,
      createCards,
      updateCard,
      deleteCard,
      deleteCards,
      moveCards,
      answer,
      resetCards,
      prepareShare,
      importShare,
      saveSettings,
      restore,
      wipe,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore doit être utilisé dans un StoreProvider.')
  return store
}
