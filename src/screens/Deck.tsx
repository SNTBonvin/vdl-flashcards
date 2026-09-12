import { useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
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
  Toggle,
  plural,
  useToast,
} from '../components/ui'
import { DeckSheet } from './Subject'
import { DEFAULT_REMINDER_TIME, WEEKDAYS, requestPermission } from '../reminders/reminders'
import type { Card, Reminder } from '../db/types'
import { DAY_SHORT, formatDue } from '../lib/date'
import { ImportError, parseRows, readFile } from '../io/transfer'
import { ShareSheet } from '../components/ShareSheet'
import { DistributionSheet } from '../components/DistributionSheet'
import { PlanSheet } from '../components/PlanSheet'
import { PickCardsSheet } from '../components/PickCardsSheet'
import { nextPlanDate } from '../reminders/plan'
import { buildIcs, icsFilename } from '../io/ics'
import { download } from '../io/transfer'
import type { Distribution, ID } from '../db/types'

/**
 * Les filtres mêlent deux dimensions — l'état de révision et l'origine — dans
 * un seul sélecteur exclusif. C'est volontairement simple : croiser « difficiles »
 * et « reçues » n'apporterait rien à ce stade, et deux barres de filtres sur un
 * téléphone coûtent plus qu'elles ne rapportent. Les cartes archivées sont
 * exclues de tous les autres filtres.
 */
type Filter = 'all' | 'due' | 'new' | 'hard' | 'shared' | 'own' | 'archived'

export function DeckScreen({ id }: { id: string }) {
  const store = useStore()
  const { navigate } = useRoute()
  const toast = useToast()

  const [editingDeck, setEditingDeck] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<Card | 'new' | null>(null)
  const [sharing, setSharing] = useState(false)
  /**
   * Sélection multiple. `editing` désigne le lot en cours de modification :
   * quand il est présent, valider met le lot à jour au lieu d'en créer un.
   */
  const [selection, setSelection] = useState<{ ids: Set<ID>; editing: Distribution | null } | null>(
    null,
  )
  const [namingLot, setNamingLot] = useState(false)
  const [lotName, setLotName] = useState('')
  // Les feuilles de lot sont repérées par identifiant, pas par objet : le lot
  // change pendant qu'elles sont ouvertes (renommage, sélection modifiée).
  const [openLotId, setOpenLotId] = useState<ID | null>(null)
  const [sharingLotId, setSharingLotId] = useState<ID | null>(null)
  const [movingTo, setMovingTo] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)
  const [picking, setPicking] = useState(false)
  /** Modification d'une carte reçue, en attente de confirmation d'appropriation. */
  const [claiming, setClaiming] = useState<{ card: Card; values: CardValues } | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const deck = store.decks.find((d) => d.id === id)
  const cards = useMemo(() => store.cardsByDeck.get(id) ?? [], [store.cardsByDeck, id])
  const counts = countCards(cards)
  const lots = useMemo(() => store.distributionsByDeck.get(id) ?? [], [store.distributionsByDeck, id])

  const nextReprise = deck?.plan ? nextPlanDate(deck.plan) : null

  const selected = selection?.ids ?? new Set<ID>()
  const selecting = selection !== null
  const openLot = lots.find((l) => l.id === openLotId) ?? null
  const sharingLot = lots.find((l) => l.id === sharingLotId) ?? null

  const toggle = (cardId: ID) =>
    setSelection((current) => {
      if (!current) return current
      const ids = new Set(current.ids)
      if (ids.has(cardId)) ids.delete(cardId)
      else ids.add(cardId)
      return { ...current, ids }
    })

  /** Le thème contient-il à la fois des cartes reçues et des cartes personnelles ? */
  const mixed = useMemo(
    () => cards.some((c) => c.sharedFrom) && cards.some((c) => !c.sharedFrom),
    [cards],
  )

  const visible = useMemo(() => {
    const now = Date.now()
    const search = query.trim().toLowerCase()
    const matching = search
      ? cards.filter(
          (c) =>
            c.front.toLowerCase().includes(search) ||
            c.back.toLowerCase().includes(search) ||
            c.tags.some((t) => t.toLowerCase().includes(search)),
        )
      : cards
    const sorted = matching.slice().sort((a, b) => a.createdAt - b.createdAt)
    if (filter === 'archived') return sorted.filter((c) => c.suspended)

    const live = sorted.filter((c) => !c.suspended)
    switch (filter) {
      case 'due':
        return live.filter((c) => c.srs.state !== 'new' && c.srs.due <= now)
      case 'new':
        return live.filter((c) => c.srs.state === 'new')
      case 'hard':
        return live.filter((c) => c.srs.lapses > 0 || c.srs.state === 'relearning')
      case 'shared':
        return live.filter((c) => c.sharedFrom)
      case 'own':
        return live.filter((c) => !c.sharedFrom)
      default:
        return live
    }
  }, [cards, filter, query])

  if (!deck) {
    return (
      <main className="screen">
        <EmptyState
          icon="layers"
          title="Thème introuvable"
          text="Il a peut-être été supprimé."
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

  const start = (mode: 'due' | 'quiz' | 'hard') => {
    requestSession({ deckIds: [deck.id], mode, label: deck.name })
    navigate({ name: 'review' })
  }

  return (
    <main className="screen stack stack-5">
      {deck.sharedBy && (
        <div className="card card--pad row" data-status="run" style={{ gap: 12 }}>
          <span className="glyph glyph--warm">
            <Icon name="layers" size={18} />
          </span>
          <span className="grow stack" style={{ gap: 1, minWidth: 0 }}>
            <span className="listrow__title truncate">Partagé par {deck.sharedBy}</span>
            <span className="meta">Vos réponses et votre progression vous appartiennent.</span>
          </span>
        </div>
      )}

      {deck.reserve && (
        <div className="card card--pad row" data-status="idle" style={{ gap: 12 }}>
          <span className="glyph glyph--warm">
            <Icon name="inbox" size={18} />
          </span>
          <span className="grow stack" style={{ gap: 1, minWidth: 0 }}>
            <span className="listrow__title truncate">Thème de réserve</span>
            <span className="meta">
              Ces cartes attendent d’être affectées : elles ne sont pas révisées et ne comptent
              nulle part, mais restent cherchables et reprenables.
            </span>
          </span>
        </div>
      )}

      {deck.description && (
        <p style={{ color: 'var(--ink-2)', fontSize: 14.5, lineHeight: 1.6, padding: '0 2px' }}>
          {deck.description}
        </p>
      )}

      <StatRow
        items={
          deck.reserve
            ? [
                { value: counts.total, label: plural(counts.total, 'carte') },
                { value: counts.archived, label: 'archivées' },
              ]
            : [
                { value: counts.total, label: plural(counts.total, 'carte') },
                { value: waiting, label: 'à réviser', accent: waiting > 0 },
                { value: counts.hard, label: 'difficiles' },
              ]
        }
      />

      <div className="row" style={{ gap: 10 }}>
        {!deck.reserve && (
          <>
            <button
              type="button"
              className="btn btn--primary grow"
              disabled={counts.total === 0}
              onClick={() => start(waiting > 0 ? 'due' : 'quiz')}
            >
              <Icon name="review" size={18} />
              {waiting > 0 ? `Réviser ${waiting}` : 'Interrogation'}
            </button>
            <button
              type="button"
              className={`icon-btn${deck.reminder?.enabled ? ' chip--accent' : ''}`}
              onClick={() => setReminderOpen(true)}
              aria-label="Rappel"
            >
              <Icon name={deck.reminder?.enabled ? 'bell' : 'bell-off'} size={18} />
            </button>
          </>
        )}
        {deck.reserve && <span className="grow" />}
        <button type="button" className="icon-btn" onClick={() => setEditingDeck(true)} aria-label="Modifier">
          <Icon name="edit" size={18} />
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--danger"
          onClick={() => setConfirming(true)}
          aria-label="Supprimer"
        >
          <Icon name="trash" size={18} />
        </button>
      </div>

      {counts.total > 0 && !deck.reserve && (
        <button type="button" className="btn btn--ghost btn--block" onClick={() => setPlanOpen(true)}>
          <Icon name="today" size={18} />
          {nextReprise
            ? `Prochaine reprise ${formatDue(nextReprise.getTime())}`
            : 'Planifier mes révisions'}
        </button>
      )}

      <div className="row" style={{ gap: 10 }}>
        <button type="button" className="btn btn--ghost grow" onClick={() => setEditingCard('new')}>
          <Icon name="plus" size={18} />
          Ajouter une carte
        </button>
        <button type="button" className="btn btn--ghost grow" onClick={() => setImportOpen(true)}>
          <Icon name="upload" size={18} />
          Importer
        </button>
      </div>

      {counts.total > 0 && !deck.reserve && (
        <button type="button" className="btn btn--ghost btn--block" onClick={() => setSharing(true)}>
          <Icon name="move" size={18} />
          Partager ce thème
        </button>
      )}

      {!deck.reserve && (lots.length > 0 || counts.total > 0) && (
        <section className="stack stack-3">
          <SectionHead
            title="Lots de distribution"
            aside={
              counts.total > 0 && !selecting ? (
                <button
                  type="button"
                  className="btn btn--quiet"
                  onClick={() => setSelection({ ids: new Set(), editing: null })}
                >
                  Nouveau lot
                </button>
              ) : undefined
            }
          />
          {lots.length === 0 ? (
            <div className="card card--pad">
              <p className="meta" style={{ lineHeight: 1.6 }}>
                Un lot est une sélection de cartes de ce thème, que l’on diffuse séparément. Chez
                l’élève, les lots se rejoignent dans le même thème.
              </p>
            </div>
          ) : (
            <div className="card">
              {lots.map((lot) => {
                const inLot = cards.filter((c) => lot.cardIds.includes(c.id) && !c.suspended).length
                return (
                  <button
                    key={lot.id}
                    type="button"
                    className="listrow"
                    onClick={() => setOpenLotId(lot.id)}
                  >
                    <span className="grow stack" style={{ gap: 2, minWidth: 0 }}>
                      <span className="listrow__title truncate">{lot.name}</span>
                      <span className="listrow__sub">
                        {inLot} {plural(inLot, 'carte')}
                        {lot.lastSharedAt
                          ? ` · diffusé le ${new Date(lot.lastSharedAt).toLocaleDateString('fr-FR')}`
                          : ' · jamais diffusé'}
                      </span>
                    </span>
                    <Icon name="chevron-right" size={18} />
                  </button>
                )
              })}
            </div>
          )}
        </section>
      )}

      <section className="stack stack-3">
        <SectionHead
          title="Cartes"
          aside={
            counts.total > 0 ? (
              <button
                type="button"
                className="btn btn--quiet"
                onClick={() =>
                  setSelection(selecting ? null : { ids: new Set(), editing: null })
                }
              >
                {selecting ? 'Annuler' : 'Sélectionner'}
              </button>
            ) : undefined
          }
        />

        {cards.length > 20 && (
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
              placeholder="Rechercher dans ce thème…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              inputMode="search"
            />
          </div>
        )}

        <div className="seg seg--scroll">
          {(
            [
              ['all', 'Toutes'],
              ['due', 'Dues'],
              ['new', 'Neuves'],
              ['hard', 'Difficiles'],
              ...(mixed ? ([['shared', 'Reçues'], ['own', 'Mes cartes']] as [Filter, string][]) : []),
              ...(counts.archived > 0
                ? ([['archived', `Archivées ${counts.archived}`]] as [Filter, string][])
                : []),
            ] as [Filter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="seg__item"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon="card"
            title={filter === 'all' ? 'Aucune carte' : 'Aucune carte dans ce filtre'}
            text={
              filter === 'all'
                ? 'Ajoutez vos cartes une par une, ou importez une liste depuis un tableur ou un autre logiciel.'
                : 'Changez de filtre pour retrouver le reste des cartes de ce thème.'
            }
            action={
              filter === 'all' ? (
                <div className="stack stack-2" style={{ width: '100%', maxWidth: 280 }}>
                  <button
                    type="button"
                    className="btn btn--primary btn--block"
                    onClick={() => setEditingCard('new')}
                  >
                    <Icon name="plus" size={18} />
                    Ajouter une carte
                  </button>
                  {store.cards.length > cards.length && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--block"
                      onClick={() => setPicking(true)}
                    >
                      <Icon name="search" size={18} />
                      Reprendre une carte
                    </button>
                  )}
                </div>
              ) : undefined
            }
          />
        ) : (
          <div className="card">
            {visible.map((card) => (
              <button
                key={card.id}
                type="button"
                className="listrow"
                onClick={() => (selecting ? toggle(card.id) : setEditingCard(card))}
              >
                {selecting ? (
                  <span className="tick" data-checked={selected.has(card.id)} aria-hidden="true">
                    <Icon name="check" size={14} strokeWidth={2.4} />
                  </span>
                ) : (
                  <span className={`dot dot--${statusOf(card)}`} />
                )}
                <span className="grow stack" style={{ gap: 2, minWidth: 0 }}>
                  <span className="listrow__title clamp-2">{card.front}</span>
                  <span className="listrow__sub truncate">
                    {card.sharedFrom && (
                      <span className="mono" style={{ color: 'var(--primary)', fontSize: 10.5 }}>
                        REÇUE ·{' '}
                      </span>
                    )}
                    {card.back}
                  </span>
                </span>
                <span className="chip mono">{cardStateLabel(card)}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {counts.hard > 0 && (
        <button type="button" className="btn btn--ghost btn--block" onClick={() => start('hard')}>
          <Icon name="flag" size={18} />
          Reprendre les {counts.hard} cartes difficiles
        </button>
      )}

      {selecting && (
        <>
          {/* La barre est fixe : cet espace évite qu'elle masque la dernière carte. */}
          <div aria-hidden="true" style={{ height: selection?.editing ? 118 : 172 }} />
          <SelectBarPortal>
            <div className="selectbar__inner">
              <div className="row row--between">
                <span className="listrow__title">
                  {selected.size}{' '}
                  {plural(selected.size, 'carte sélectionnée', 'cartes sélectionnées')}
                </span>
                <button
                  type="button"
                  className="btn btn--quiet"
                  onClick={() =>
                    setSelection((current) =>
                      current
                        ? {
                            ...current,
                            ids:
                              visible.every((c) => current.ids.has(c.id)) && visible.length > 0
                                ? new Set<ID>()
                                : new Set(visible.map((c) => c.id)),
                          }
                        : current,
                    )
                  }
                >
                  {visible.length > 0 && visible.every((c) => selected.has(c.id))
                    ? 'Aucune'
                    : 'Tout'}
                </button>
              </div>

              <button
                type="button"
                className="btn btn--primary btn--block"
                disabled={selected.size === 0}
                onClick={async () => {
                  const editing = selection?.editing
                  if (editing) {
                    await store.updateDistribution(editing.id, { cardIds: [...selected] })
                    setSelection(null)
                    setOpenLotId(editing.id)
                    toast('Lot mis à jour.')
                  } else {
                    setLotName(`Lot ${lots.length + 1}`)
                    setNamingLot(true)
                  }
                }}
              >
                <Icon name="layers" size={18} />
                {selection?.editing ? 'Enregistrer le lot' : 'Créer un lot'}
              </button>

              {!selection?.editing && (
                <div className="row" style={{ gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn--ghost grow"
                    disabled={selected.size === 0}
                    onClick={() => setMovingTo(true)}
                  >
                    <Icon name="move" size={17} />
                    Déplacer
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost grow"
                    disabled={selected.size === 0}
                    onClick={async () => {
                      const ids = [...selected]
                      const archiving = ids.some((cardId) => !cards.find((c) => c.id === cardId)?.suspended)
                      await store.archiveCards(ids, archiving)
                      setSelection(null)
                      toast(
                        archiving
                          ? `${ids.length} ${plural(ids.length, 'carte archivée', 'cartes archivées')}.`
                          : `${ids.length} ${plural(ids.length, 'carte réactivée', 'cartes réactivées')}.`,
                      )
                    }}
                  >
                    <Icon name={filter === 'archived' ? 'reset' : 'inbox'} size={17} />
                    {filter === 'archived' ? 'Réactiver' : 'Archiver'}
                  </button>
                </div>
              )}
            </div>
          </SelectBarPortal>
        </>
      )}

      {/* --- Feuilles --- */}

      <CardSheet
        open={editingCard !== null}
        card={editingCard === 'new' ? null : editingCard}
        onClose={() => setEditingCard(null)}
        onPickExisting={() => {
          setEditingCard(null)
          setPicking(true)
        }}
        onSubmit={async (values) => {
          if (editingCard && editingCard !== 'new') {
            // Modifier une carte reçue, c'est se l'approprier : elle cesse de
            // suivre les mises à jour de l'auteur. On le dit avant, pas après.
            const rewritten =
              editingCard.sharedFrom !== undefined &&
              (values.front !== editingCard.front ||
                values.back !== editingCard.back ||
                values.notes !== editingCard.notes)
            if (rewritten) {
              setClaiming({ card: editingCard, values })
              return
            }
            await store.updateCard(editingCard.id, values)
            toast('Carte modifiée.')
          } else {
            await store.createCard(deck.id, values)
            toast('Carte ajoutée.')
          }
          setEditingCard(null)
        }}
        onDelete={async () => {
          if (editingCard && editingCard !== 'new') {
            await store.deleteCard(editingCard.id)
            toast('Carte supprimée.')
          }
          setEditingCard(null)
        }}
        onReset={async () => {
          if (editingCard && editingCard !== 'new') {
            await store.resetCards([editingCard.id])
            toast('Progression de la carte réinitialisée.')
          }
          setEditingCard(null)
        }}
      />

      <DeckSheet
        open={editingDeck}
        title="Modifier le thème"
        initial={{ name: deck.name, description: deck.description, reserve: deck.reserve }}
        onClose={() => setEditingDeck(false)}
        onSubmit={async (name, description, reserve) => {
          await store.updateDeck(deck.id, { name, description, reserve })
          setEditingDeck(false)
          toast('Thème mis à jour.')
        }}
      />

      <ReminderSheet
        open={reminderOpen}
        deckId={deck.id}
        deckName={deck.name}
        reminder={deck.reminder}
        onClose={() => setReminderOpen(false)}
        onSubmit={async (reminder) => {
          if (reminder?.enabled) {
            const permission = await requestPermission()
            if (permission !== 'granted') {
              toast('Les notifications sont refusées par le navigateur.', 'error')
            } else if (!store.settings.notificationsEnabled) {
              await store.saveSettings({ notificationsEnabled: true })
            }
          }
          await store.setReminder(deck.id, reminder)
          setReminderOpen(false)
          toast(reminder?.enabled ? 'Rappel programmé.' : 'Rappel désactivé.')
        }}
      />

      <ImportSheet
        open={importOpen}
        deckName={deck.name}
        onClose={() => setImportOpen(false)}
        onImport={async (rows) => {
          const added = await store.createCards(deck.id, rows)
          setImportOpen(false)
          toast(`${added} ${plural(added, 'carte importée', 'cartes importées')}.`)
        }}
      />

      <ConfirmSheet
        open={claiming !== null}
        title="Cette carte deviendra la vôtre"
        text={`En la modifiant, elle quitte les cartes reçues${deck.sharedBy ? ` de ${deck.sharedBy}` : ''} et devient une carte personnelle. Les corrections apportées au thème partagé ne s’y appliqueront plus, et votre progression sur cette carte est conservée.`}
        confirmLabel="Modifier"
        onClose={() => setClaiming(null)}
        onConfirm={async () => {
          if (!claiming) return
          await store.updateCard(claiming.card.id, { ...claiming.values, sharedFrom: undefined })
          toast('Carte modifiée — elle est désormais la vôtre.')
          setEditingCard(null)
          setClaiming(null)
        }}
      />

      <PickCardsSheet
        open={picking}
        deckId={deck.id}
        onClose={() => setPicking(false)}
        onPick={async (ids) => {
          const copies = await store.copyCards(ids, deck.id)
          setPicking(false)
          // Si un lot est en cours de composition, les cartes reprises y entrent
          // directement : on ne fait pas revenir l'utilisateur en arrière.
          setSelection((current) =>
            current
              ? { ...current, ids: new Set([...current.ids, ...copies.map((c) => c.id)]) }
              : current,
          )
          toast(`${copies.length} ${plural(copies.length, 'carte reprise', 'cartes reprises')}.`)
        }}
      />

      <PlanSheet
        open={planOpen}
        deck={deck}
        onClose={() => setPlanOpen(false)}
        onSave={async (plan) => {
          await store.updateDeck(deck.id, { plan })
          setPlanOpen(false)
        }}
        onRemove={async () => {
          await store.updateDeck(deck.id, { plan: null })
          toast('Plan retiré.')
        }}
      />

      <ShareSheet open={sharing} deck={deck} onClose={() => setSharing(false)} />

      <Sheet
        open={namingLot}
        title="Nouveau lot"
        onClose={() => setNamingLot(false)}
        footer={
          <button
            type="button"
            className="btn btn--primary btn--block"
            disabled={!lotName.trim()}
            onClick={async () => {
              const lot = await store.createDistribution(deck.id, lotName.trim(), [...selected])
              setNamingLot(false)
              setSelection(null)
              setOpenLotId(lot.id)
              toast('Lot créé.')
            }}
          >
            Créer le lot
          </button>
        }
      >
        <div className="stack stack-5">
          <Field label="Intitulé" hint="Pour vous y retrouver. L’élève ne le voit pas.">
            <input
              className="input"
              value={lotName}
              onChange={(e) => setLotName(e.target.value)}
              placeholder="Lot 1"
              autoFocus
            />
          </Field>
          <p className="meta" style={{ lineHeight: 1.6 }}>
            {selected.size} {plural(selected.size, 'carte retenue', 'cartes retenues')} sur{' '}
            {counts.total}. Le lot reste modifiable, et une même carte peut figurer dans plusieurs
            lots.
          </p>
        </div>
      </Sheet>

      <DistributionSheet
        open={openLot !== null}
        lot={openLot}
        onClose={() => setOpenLotId(null)}
        onShare={() => {
          if (!openLot) return
          setSharingLotId(openLot.id)
          setOpenLotId(null)
        }}
        onEditSelection={() => {
          if (!openLot) return
          setSelection({ ids: new Set(openLot.cardIds), editing: openLot })
          setFilter('all')
          setOpenLotId(null)
        }}
        onDuplicated={(copy) => setOpenLotId(copy.id)}
      />

      {sharingLot && (
        <ShareSheet
          open
          deck={deck}
          cards={cards.filter((c) => sharingLot.cardIds.includes(c.id))}
          title={`Diffuser « ${sharingLot.name} »`}
          onClose={() => setSharingLotId(null)}
          onShared={() => void store.markDistributionShared(sharingLot.id)}
        />
      )}

      <MoveSheet
        open={movingTo}
        count={selected.size}
        currentDeckId={deck.id}
        onClose={() => setMovingTo(false)}
        onMove={async (target) => {
          const ids = [...selected]
          await store.moveCards(ids, target)
          setMovingTo(false)
          setSelection(null)
          toast(`${ids.length} ${plural(ids.length, 'carte déplacée', 'cartes déplacées')}.`)
        }}
      />

      <ConfirmSheet
        open={confirming}
        title={`Supprimer « ${deck.name} » ?`}
        text={`Les ${counts.total} ${plural(counts.total, 'carte')} de ce thème et leur progression seront définitivement supprimées.`}
        onClose={() => setConfirming(false)}
        onConfirm={async () => {
          await store.deleteDeck(deck.id)
          toast('Thème supprimé.')
          navigate({ name: 'subject', id: deck.subjectId })
        }}
      />
    </main>
  )
}

function statusOf(card: Card): 'ok' | 'run' | 'warn' | 'err' | 'idle' {
  if (card.suspended) return 'idle'
  if (card.srs.state === 'new') return 'idle'
  if (card.srs.state === 'relearning') return 'err'
  if (card.srs.due <= Date.now()) return 'warn'
  return 'ok'
}

function cardStateLabel(card: Card): string {
  if (card.suspended) return 'archivée'
  if (card.srs.state === 'new') return 'neuve'
  if (card.srs.state === 'relearning') return 'à revoir'
  if (card.srs.due <= Date.now()) return 'due'
  return formatDue(card.srs.due)
}

/**
 * La barre de sélection sort vers <body> : l'écran est animé et crée un
 * contexte d'empilement, où « position: fixed » se cale sur l'écran et non sur
 * la fenêtre. Même raison que pour les feuilles.
 */
function SelectBarPortal({ children }: { children: ReactNode }) {
  return createPortal(<div className="selectbar">{children}</div>, document.body)
}

/* ------------------------------ Déplacement ------------------------------ */

/**
 * Déplacer des cartes vers un autre thème. Les lots qui les contenaient ne les
 * comptent plus : un lot ne diffuse que les cartes présentes dans son thème.
 */
function MoveSheet({
  open,
  count,
  currentDeckId,
  onClose,
  onMove,
}: {
  open: boolean
  count: number
  currentDeckId: string
  onClose: () => void
  onMove: (deckId: string) => void
}) {
  const store = useStore()
  const targets = store.decks.filter((d) => d.id !== currentDeckId)

  return (
    <Sheet open={open} title="Déplacer les cartes" onClose={onClose}>
      <div className="stack stack-5">
        <p className="meta" style={{ lineHeight: 1.6 }}>
          {count} {plural(count, 'carte partira', 'cartes partiront')} vers le thème choisi, avec
          leur progression.
        </p>

        {targets.length === 0 ? (
          <EmptyState
            icon="layers"
            title="Aucun autre thème"
            text="Créez d’abord un second thème pour pouvoir y déplacer des cartes."
          />
        ) : (
          <div className="card">
            {targets.map((target) => {
              const subject = store.subjects.find((s) => s.id === target.subjectId)
              return (
                <button
                  key={target.id}
                  type="button"
                  className="listrow"
                  onClick={() => onMove(target.id)}
                >
                  <span className="grow stack" style={{ gap: 2, minWidth: 0 }}>
                    <span className="listrow__title truncate">{target.name}</span>
                    <span className="listrow__sub truncate">{subject?.name ?? 'Sans matière'}</span>
                  </span>
                  {target.reserve && <span className="chip mono">réserve</span>}
                  <Icon name="chevron-right" size={18} />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </Sheet>
  )
}

/* ------------------------------ Éditeur de carte ------------------------------ */

export interface CardValues {
  front: string
  back: string
  notes: string
  tags: string[]
  suspended: boolean
}

export function CardSheet({
  open,
  card,
  onClose,
  onSubmit,
  onDelete,
  onReset,
  onPickExisting,
}: {
  open: boolean
  card: Card | null
  onClose: () => void
  onSubmit: (values: CardValues) => void
  onDelete?: () => void
  onReset?: () => void
  /** Ouvre la reprise d'une carte existante, à la place d'une saisie. */
  onPickExisting?: () => void
}) {
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')
  const [suspended, setSuspended] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const loadedFor = useRef<string | null>(null)

  // Recharge les champs quand la feuille s'ouvre sur une autre carte.
  const key = open ? (card?.id ?? 'new') : null
  if (key !== loadedFor.current) {
    loadedFor.current = key
    if (open) {
      setFront(card?.front ?? '')
      setBack(card?.back ?? '')
      setNotes(card?.notes ?? '')
      setTags(card?.tags.join(' ') ?? '')
      setSuspended(card?.suspended ?? false)
    }
  }

  /** Seuil indicatif : au-delà, la carte porte presque toujours deux idées. */
  const longCard = front.trim().length > 180 || back.trim().length > 180

  const submit = () => {
    if (!front.trim() || !back.trim()) return
    onSubmit({
      front: front.trim(),
      back: back.trim(),
      notes: notes.trim(),
      tags: tags.split(/[\s,]+/).filter(Boolean),
      suspended,
    })
  }

  return (
    <>
      <Sheet
        open={open}
        title={card ? 'Modifier la carte' : 'Nouvelle carte'}
        onClose={onClose}
        footer={
          <>
            {card && onDelete && !card.sharedFrom && (
              <button
                type="button"
                className="icon-btn icon-btn--danger"
                onClick={() => setConfirmDelete(true)}
                aria-label="Supprimer la carte"
                style={{ height: 46, width: 46 }}
              >
                <Icon name="trash" size={18} />
              </button>
            )}
            <button
              type="button"
              className="btn btn--primary grow"
              onClick={submit}
              disabled={!front.trim() || !back.trim()}
            >
              Enregistrer
            </button>
          </>
        }
      >
        <div className="stack stack-5">
          {!card && onPickExisting && (
            <button type="button" className="btn btn--ghost btn--block" onClick={onPickExisting}>
              <Icon name="search" size={17} />
              Reprendre une carte que j’ai déjà
            </button>
          )}

          <Field
            label="Recto — la question"
            hint="Une seule notion par carte : c’est ce qui rend la mémorisation efficace."
          >
            <textarea
              className="textarea"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="En quelle année débute la Ve République ?"
              autoFocus={!card}
            />
          </Field>
          <Field label="Verso — la réponse">
            <textarea
              className="textarea"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="1958"
            />
          </Field>

          {longCard && (
            <div className="card card--pad row" data-status="warn" style={{ gap: 12 }}>
              <span className="glyph glyph--warm">
                <Icon name="info" size={18} />
              </span>
              <p className="meta" style={{ lineHeight: 1.55 }}>
                Carte longue. Une carte se retient d’autant mieux qu’elle tient en une idée et une
                formulation courte : deux cartes valent souvent mieux qu’une.
              </p>
            </div>
          )}
          <Field label="Note" hint="Précision affichée après la réponse. Facultatif.">
            <textarea
              className="textarea"
              style={{ minHeight: 70 }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <Field label="Étiquettes" hint="Séparées par des espaces.">
            <input className="input mono" value={tags} onChange={(e) => setTags(e.target.value)} />
          </Field>

          {card && (
            <>
              <hr className="rule" />
              <Toggle
                checked={suspended}
                onChange={setSuspended}
                label="Archiver la carte"
                hint="Elle sort de la liste et n’est plus proposée en révision. Réversible."
              />
              {card.sharedFrom && (
                <p className="meta" style={{ lineHeight: 1.55 }}>
                  Cette carte a été reçue par partage. Elle s’archive plutôt qu’elle ne se supprime :
                  une suppression définitive serait annulée à la prochaine mise à jour du thème.
                </p>
              )}
              <div className="card card--pad stack stack-3">
                <span className="eyebrow">Progression</span>
                <div className="row row--between">
                  <span className="meta">État</span>
                  <span className="chip mono">{cardStateLabel(card)}</span>
                </div>
                <div className="row row--between">
                  <span className="meta">Révisions · oublis</span>
                  <span className="mono" style={{ fontSize: 13 }}>
                    {card.srs.reps} · {card.srs.lapses}
                  </span>
                </div>
                <div className="row row--between">
                  <span className="meta">Intervalle · facilité</span>
                  <span className="mono" style={{ fontSize: 13 }}>
                    {card.srs.interval} j · {card.srs.ease.toFixed(2)}
                  </span>
                </div>
                {onReset && (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={onReset}>
                    <Icon name="reset" size={16} />
                    Réinitialiser la progression
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </Sheet>

      <ConfirmSheet
        open={confirmDelete}
        title="Supprimer cette carte ?"
        text="La carte et son historique de révision seront perdus."
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => onDelete?.()}
      />
    </>
  )
}

/* -------------------------------- Rappels -------------------------------- */

/**
 * Recopie le rappel hebdomadaire dans l'agenda, pour un an. Une répétition
 * sans fin finirait par encombrer l'agenda bien après l'année scolaire.
 */
function exportWeekly(deckId: string, deckName: string, time: string, days: number[]) {
  const [hours, minutes] = time.split(':').map(Number)
  const start = new Date()
  start.setHours(hours || 18, minutes || 0, 0, 0)
  // Premier jour coché à venir, pour que la série démarre au bon endroit.
  while (!days.includes(start.getDay()) || start.getTime() < Date.now()) {
    start.setDate(start.getDate() + 1)
  }
  const until = new Date(start)
  until.setFullYear(until.getFullYear() + 1)

  download(
    icsFilename(`${deckName}-rappel`),
    buildIcs([
      {
        uid: `${deckId}-hebdo@vdl-flashcards`,
        start,
        durationMinutes: 15,
        summary: `Réviser : ${deckName}`,
        description: 'Rappel de révision. Quinze minutes suffisent.',
        weekly: { days, until },
      },
    ]),
    'text/calendar',
  )
}

function ReminderSheet({
  open,
  deckId,
  deckName,
  reminder,
  onClose,
  onSubmit,
}: {
  open: boolean
  deckId: string
  deckName: string
  reminder: Reminder | null
  onClose: () => void
  onSubmit: (reminder: Reminder | null) => void
}) {
  const [enabled, setEnabled] = useState(reminder?.enabled ?? false)
  const [time, setTime] = useState(reminder?.time ?? DEFAULT_REMINDER_TIME)
  const [days, setDays] = useState<number[]>(reminder?.days ?? WEEKDAYS)
  const loaded = useRef(false)

  if (open && !loaded.current) {
    loaded.current = true
    setEnabled(reminder?.enabled ?? false)
    setTime(reminder?.time ?? DEFAULT_REMINDER_TIME)
    setDays(reminder?.days ?? WEEKDAYS)
  }
  if (!open && loaded.current) loaded.current = false

  const toggleDay = (day: number) =>
    setDays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort(),
    )

  return (
    <Sheet
      open={open}
      title="Rappel de révision"
      onClose={onClose}
      footer={
        <button
          type="button"
          className="btn btn--primary btn--block"
          onClick={() =>
            onSubmit(
              enabled && days.length > 0
                ? { enabled: true, time, days, lastFiredAt: reminder?.lastFiredAt ?? null }
                : { enabled: false, time, days, lastFiredAt: null },
            )
          }
        >
          Enregistrer
        </button>
      }
    >
      <div className="stack stack-5">
        <Toggle
          checked={enabled}
          onChange={setEnabled}
          label="Me rappeler de réviser"
          hint={`Notification pour « ${deckName} ».`}
        />

        {enabled && (
          <>
            <Field label="Heure">
              <input className="input mono" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>

            <div className="field">
              <span className="label">Jours</span>
              <div className="picker">
                {DAY_SHORT.map((label, index) => (
                  <button
                    key={index}
                    type="button"
                    className="chip chip--select"
                    style={{ width: 42, justifyContent: 'center', padding: 0 }}
                    aria-pressed={days.includes(index)}
                    onClick={() => toggleDay(index)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="btn btn--ghost btn--block"
              disabled={days.length === 0}
              onClick={() => exportWeekly(deckId, deckName, time, days)}
            >
              <Icon name="today" size={17} />
              Ajouter ce rappel à mon agenda
            </button>

            <div className="card card--pad row" data-status="warn" style={{ gap: 12 }}>
              <span className="glyph glyph--warm">
                <Icon name="info" size={18} />
              </span>
              <p className="meta" style={{ lineHeight: 1.55 }}>
                La notification de l’application ne part qu’à son ouverture : elle rappelle ce qui
                est dû, elle ne réveille pas le téléphone. Pour être prévenu même application
                fermée, ajoutez le rappel à votre agenda.
              </p>
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}

/* -------------------------------- Import -------------------------------- */

export function ImportSheet({
  open,
  deckName,
  onClose,
  onImport,
}: {
  open: boolean
  deckName: string
  onClose: () => void
  onImport: (rows: { front: string; back: string; notes?: string; tags?: string[] }[]) => void
}) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const rows = useMemo(() => (text.trim() ? parseRows(text) : []), [text])

  const pickFile = async (file: File | undefined) => {
    if (!file) return
    try {
      setText(await readFile(file))
      setError(null)
    } catch (e) {
      setError(e instanceof ImportError ? e.message : 'Lecture du fichier impossible.')
    }
  }

  return (
    <Sheet
      open={open}
      title="Importer des cartes"
      onClose={() => {
        setText('')
        setError(null)
        onClose()
      }}
      footer={
        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={rows.length === 0}
          onClick={() => {
            onImport(rows)
            setText('')
          }}
        >
          Importer {rows.length > 0 ? `${rows.length} ${plural(rows.length, 'carte')}` : ''}
        </button>
      }
    >
      <div className="stack stack-5">
        <p className="meta" style={{ lineHeight: 1.6 }}>
          Collez une liste ou choisissez un fichier CSV / TSV. Une carte par ligne, le recto puis le verso,
          séparés par une tabulation, un point-virgule ou une virgule. Les cartes iront dans « {deckName} ».
        </p>

        <button type="button" className="btn btn--ghost btn--block" onClick={() => fileInput.current?.click()}>
          <Icon name="upload" size={18} />
          Choisir un fichier
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,.tsv,.txt,text/plain,text/csv"
          hidden
          onChange={(e) => void pickFile(e.target.files?.[0])}
        />

        <Field label="Ou collez vos cartes">
          <textarea
            className="textarea mono"
            style={{ minHeight: 150, fontSize: 13 }}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setError(null)
            }}
            placeholder={'1958 ; Début de la Ve République\n1962 ; Élection du président au suffrage universel'}
          />
        </Field>

        {error && (
          <div className="card card--pad" data-status="err">
            <span className="meta" style={{ color: 'var(--err)' }}>
              {error}
            </span>
          </div>
        )}

        {rows.length > 0 && (
          <div className="stack stack-3">
            <SectionHead title={`Aperçu · ${rows.length} ${plural(rows.length, 'carte')}`} />
            <div className="card">
              {rows.slice(0, 5).map((row, index) => (
                <div key={index} className="listrow" style={{ cursor: 'default' }}>
                  <span className="grow stack" style={{ gap: 2, minWidth: 0 }}>
                    <span className="listrow__title truncate">{row.front}</span>
                    <span className="listrow__sub truncate">{row.back}</span>
                  </span>
                </div>
              ))}
              {rows.length > 5 && (
                <div className="listrow" style={{ cursor: 'default' }}>
                  <span className="meta mono">+ {rows.length - 5} autres</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  )
}
