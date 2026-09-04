import { useMemo, useState } from 'react'
import { useStore } from '../state/store'
import { useRoute } from '../lib/router'
import { countCards } from '../srs/queue'
import { Icon } from '../components/Icon'
import { EmptyState, Field, SectionHead, Sheet, plural, useToast } from '../components/ui'

export function LibraryScreen() {
  const store = useStore()
  const { navigate } = useRoute()
  const toast = useToast()
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')

  const rows = useMemo(
    () =>
      store.subjects.map((subject) => {
        const decks = store.decksBySubject.get(subject.id) ?? []
        const cards = decks.flatMap((d) => store.cardsByDeck.get(d.id) ?? [])
        return { subject, decks, counts: countCards(cards) }
      }),
    [store.subjects, store.decksBySubject, store.cardsByDeck],
  )

  const search = query.trim().toLowerCase()
  const results = useMemo(() => {
    if (search.length < 2) return []
    return store.cards
      .filter(
        (c) =>
          c.front.toLowerCase().includes(search) ||
          c.back.toLowerCase().includes(search) ||
          c.tags.some((t) => t.toLowerCase().includes(search)),
      )
      .slice(0, 30)
  }, [store.cards, search])

  return (
    <main className="screen stack stack-5">
      <div className="page-title">
        <h1>Matières</h1>
      </div>

      <div style={{ position: 'relative' }}>
        <span
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--ink-4)',
            display: 'flex',
          }}
        >
          <Icon name="search" size={17} />
        </span>
        <input
          className="input"
          style={{ paddingLeft: 38 }}
          placeholder="Rechercher une carte…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
          inputMode="search"
        />
      </div>

      {search.length >= 2 ? (
        <section className="stack stack-3">
          <SectionHead title={`${results.length} ${plural(results.length, 'résultat')}`} />
          {results.length === 0 ? (
            <EmptyState
              icon="search"
              title="Aucune carte trouvée"
              text="Essayez un autre mot, ou vérifiez l’orthographe. La recherche porte sur le recto, le verso et les étiquettes."
            />
          ) : (
            <div className="card">
              {results.map((card) => {
                const deck = store.decks.find((d) => d.id === card.deckId)
                return (
                  <button
                    key={card.id}
                    type="button"
                    className="listrow"
                    onClick={() => deck && navigate({ name: 'deck', id: deck.id })}
                  >
                    <span className="grow stack" style={{ gap: 2, minWidth: 0 }}>
                      <span className="listrow__title clamp-2">{card.front}</span>
                      <span className="listrow__sub truncate">
                        {deck?.name ?? 'Catégorie supprimée'} · {card.back}
                      </span>
                    </span>
                    <Icon name="chevron-right" size={18} />
                  </button>
                )
              })}
            </div>
          )}
        </section>
      ) : rows.length === 0 ? (
        <EmptyState
          icon="folder"
          title="Aucune matière"
          text="Les matières regroupent vos catégories : Histoire, Anglais, Biologie… Commencez par en créer une."
          action={
            <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
              <Icon name="plus" size={18} />
              Nouvelle matière
            </button>
          }
        />
      ) : (
        <>
          <section className="stack stack-2">
            {rows.map(({ subject, decks, counts }) => {
              const waiting = counts.due + counts.fresh
              return (
                <button
                  key={subject.id}
                  type="button"
                  className="card card--pad card--tap"
                  data-status={waiting > 0 ? 'run' : counts.total === 0 ? 'idle' : 'ok'}
                  onClick={() => navigate({ name: 'subject', id: subject.id })}
                >
                  <div className="row">
                    <span className="glyph glyph--lg mono" style={{ fontSize: 13, fontWeight: 600 }}>
                      {subject.code}
                    </span>
                    <span className="grow stack" style={{ gap: 3, minWidth: 0 }}>
                      <span className="listrow__title truncate">{subject.name}</span>
                      <span className="row" style={{ gap: 6 }}>
                        <span className="chip">
                          {decks.length} {plural(decks.length, 'catégorie')}
                        </span>
                        <span className="chip">
                          {counts.total} {plural(counts.total, 'carte')}
                        </span>
                        {waiting > 0 && <span className="chip chip--accent">{waiting} dues</span>}
                      </span>
                    </span>
                    <Icon name="chevron-right" size={18} />
                  </div>
                </button>
              )
            })}
          </section>

          <button type="button" className="btn btn--ghost btn--block" onClick={() => setCreating(true)}>
            <Icon name="plus" size={18} />
            Nouvelle matière
          </button>
        </>
      )}

      <SubjectSheet
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={async (name, code) => {
          const subject = await store.createSubject(name, code)
          setCreating(false)
          toast(`Matière « ${subject.name} » créée.`)
          navigate({ name: 'subject', id: subject.id })
        }}
      />
    </main>
  )
}

export function SubjectSheet({
  open,
  onClose,
  onSubmit,
  initial,
  title = 'Nouvelle matière',
}: {
  open: boolean
  onClose: () => void
  onSubmit: (name: string, code: string) => void
  initial?: { name: string; code: string }
  title?: string
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [code, setCode] = useState(initial?.code ?? '')

  const reset = () => {
    setName(initial?.name ?? '')
    setCode(initial?.code ?? '')
  }

  const submit = () => {
    if (!name.trim()) return
    onSubmit(name.trim(), code.trim() || name.trim().slice(0, 3))
    reset()
  }

  return (
    <Sheet
      open={open}
      title={title}
      onClose={() => {
        reset()
        onClose()
      }}
      footer={
        <button type="button" className="btn btn--primary btn--block" onClick={submit} disabled={!name.trim()}>
          Enregistrer
        </button>
      }
    >
      <div className="stack stack-5">
        <Field label="Nom de la matière">
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Histoire-Géographie"
            autoFocus
          />
        </Field>
        <Field label="Abréviation" hint="Deux ou trois lettres, affichées en pastille.">
          <input
            className="input mono"
            value={code}
            maxLength={3}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="HG"
          />
        </Field>
      </div>
    </Sheet>
  )
}
