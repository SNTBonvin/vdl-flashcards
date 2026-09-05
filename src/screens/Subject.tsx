import { useMemo, useState } from 'react'
import { useStore } from '../state/store'
import { useRoute } from '../lib/router'
import { requestSession } from '../state/session'
import { countCards } from '../srs/queue'
import { Icon } from '../components/Icon'
import {
  ConfirmSheet,
  EmptyState,
  Field,
  SectionHead,
  Sheet,
  StatRow,
  plural,
  useToast,
} from '../components/ui'
import { SubjectSheet } from './Library'
import { formatDue } from '../lib/date'

export function SubjectScreen({ id }: { id: string }) {
  const store = useStore()
  const { navigate } = useRoute()
  const toast = useToast()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const subject = store.subjects.find((s) => s.id === id)
  const decks = useMemo(() => store.decksBySubject.get(id) ?? [], [store.decksBySubject, id])
  const allCards = useMemo(
    () => decks.flatMap((d) => store.cardsByDeck.get(d.id) ?? []),
    [decks, store.cardsByDeck],
  )
  const counts = countCards(allCards)

  if (!subject) {
    return (
      <main className="screen">
        <EmptyState
          icon="folder"
          title="Matière introuvable"
          text="Elle a peut-être été supprimée depuis un autre onglet."
          action={
            <button type="button" className="btn btn--ghost" onClick={() => navigate({ name: 'library' })}>
              Retour aux matières
            </button>
          }
        />
      </main>
    )
  }

  const waiting = counts.due + counts.fresh

  return (
    <main className="screen stack stack-5">
      <StatRow
        items={[
          { value: decks.length, label: plural(decks.length, 'thème') },
          { value: counts.total, label: plural(counts.total, 'carte') },
          { value: waiting, label: 'à réviser', accent: waiting > 0 },
        ]}
      />

      <div className="row" style={{ gap: 10 }}>
        <button
          type="button"
          className="btn btn--primary grow"
          disabled={counts.total === 0}
          onClick={() => {
            requestSession({
              deckIds: decks.map((d) => d.id),
              mode: waiting > 0 ? 'due' : 'quiz',
              label: subject.name,
            })
            navigate({ name: 'review' })
          }}
        >
          <Icon name="review" size={18} />
          {waiting > 0 ? `Réviser ${waiting}` : 'Interrogation'}
        </button>
        <button type="button" className="icon-btn" onClick={() => setEditing(true)} aria-label="Renommer la matière">
          <Icon name="edit" size={18} />
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--danger"
          onClick={() => setConfirming(true)}
          aria-label="Supprimer la matière"
        >
          <Icon name="trash" size={18} />
        </button>
      </div>

      <section className="stack stack-3">
        <SectionHead title="Thèmes" />
        {decks.length === 0 ? (
          <EmptyState
            icon="layers"
            title="Aucun thème"
            text="Un thème regroupe les cartes d’un chapitre ou d’un thème précis."
            action={
              <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
                <Icon name="plus" size={18} />
                Nouveau thème
              </button>
            }
          />
        ) : (
          <>
            <div className="stack stack-2">
              {decks.map((deck) => {
                const deckCounts = countCards(store.cardsByDeck.get(deck.id) ?? [])
                const deckWaiting = deckCounts.due + deckCounts.fresh
                return (
                  <button
                    key={deck.id}
                    type="button"
                    className="card card--pad card--tap"
                    data-status={deckWaiting > 0 ? 'run' : deckCounts.total === 0 ? 'idle' : 'ok'}
                    onClick={() => navigate({ name: 'deck', id: deck.id })}
                  >
                    <div className="row">
                      <div className="grow stack" style={{ gap: 4, minWidth: 0 }}>
                        <span className="listrow__title truncate">{deck.name}</span>
                        <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                          <span className="chip">{deckCounts.total} cartes</span>
                          {deckWaiting > 0 ? (
                            <span className="chip chip--accent">{deckWaiting} dues</span>
                          ) : deckCounts.nextDue ? (
                            <span className="chip chip--ok">{formatDue(deckCounts.nextDue)}</span>
                          ) : null}
                          {deck.reminder?.enabled && (
                            <span className="chip chip--warn">
                              <Icon name="bell" size={12} />
                              {deck.reminder.time}
                            </span>
                          )}
                        </span>
                      </div>
                      <Icon name="chevron-right" size={18} />
                    </div>
                  </button>
                )
              })}
            </div>
            <button type="button" className="btn btn--ghost btn--block" onClick={() => setCreating(true)}>
              <Icon name="plus" size={18} />
              Nouveau thème
            </button>
          </>
        )}
      </section>

      <DeckSheet
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={async (name, description) => {
          const deck = await store.createDeck(subject.id, name, description)
          setCreating(false)
          toast(`Thème « ${deck.name} » créé.`)
          navigate({ name: 'deck', id: deck.id })
        }}
      />

      <SubjectSheet
        open={editing}
        title="Modifier la matière"
        initial={{ name: subject.name, code: subject.code }}
        onClose={() => setEditing(false)}
        onSubmit={async (name, code) => {
          await store.updateSubject(subject.id, { name, code: code.toUpperCase() })
          setEditing(false)
          toast('Matière mise à jour.')
        }}
      />

      <ConfirmSheet
        open={confirming}
        title={`Supprimer « ${subject.name} » ?`}
        text={`Cette matière, ses ${decks.length} ${plural(decks.length, 'thème')} et ses ${counts.total} ${plural(counts.total, 'carte')} seront définitivement supprimés. Pensez à exporter une sauvegarde avant.`}
        onClose={() => setConfirming(false)}
        onConfirm={async () => {
          await store.deleteSubject(subject.id)
          toast('Matière supprimée.')
          navigate({ name: 'library' })
        }}
      />
    </main>
  )
}

export function DeckSheet({
  open,
  onClose,
  onSubmit,
  initial,
  title = 'Nouveau thème',
}: {
  open: boolean
  onClose: () => void
  onSubmit: (name: string, description: string) => void
  initial?: { name: string; description: string }
  title?: string
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')

  const submit = () => {
    if (!name.trim()) return
    onSubmit(name.trim(), description.trim())
    setName(initial?.name ?? '')
    setDescription(initial?.description ?? '')
  }

  return (
    <Sheet
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <button type="button" className="btn btn--primary btn--block" onClick={submit} disabled={!name.trim()}>
          Enregistrer
        </button>
      }
    >
      <div className="stack stack-5">
        <Field label="Nom du thème">
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="La Ve République"
            autoFocus
          />
        </Field>
        <Field label="Description" hint="Facultatif — quelques mots pour vous repérer.">
          <textarea
            className="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Institutions, dates clés, personnages"
          />
        </Field>
      </div>
    </Sheet>
  )
}
