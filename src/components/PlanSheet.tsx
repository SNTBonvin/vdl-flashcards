import { useEffect, useMemo, useState } from 'react'
import { Icon } from './Icon'
import { ConfirmSheet, Field, Sheet, useToast } from './ui'
import { planDates, planOffsets } from '../reminders/plan'
import { formatDeadline } from '../srs/deadline'
import { buildIcs, icsFilename } from '../io/ics'
import { download } from '../io/transfer'
import { formatDue } from '../lib/date'
import type { Deck, RevisionPlan } from '../db/types'

const DEFAULT_TIME = '18:00'

/** L'année n'apparaît que si le rendez-vous sort de l'année en cours. */
function longDate(date: Date): string {
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

/**
 * Planification des reprises d'un thème, et export vers l'agenda du téléphone.
 *
 * L'agenda est ici le seul dispositif qui sonne vraiment : une notification
 * web ne part qu'à l'ouverture de l'application, c'est-à-dire jamais pour
 * l'élève qui oublie de l'ouvrir. Rien ne sort de l'appareil : le fichier est
 * fabriqué sur place et remis à l'agenda local.
 */
export function PlanSheet({
  open,
  deck,
  dueBy,
  onClose,
  onSave,
  onRemove,
}: {
  open: boolean
  deck: Deck
  /** Échéance la plus proche portée par les cartes du thème, s'il y en a une. */
  dueBy?: string
  onClose: () => void
  onSave: (plan: RevisionPlan) => void
  onRemove: () => void
}) {
  const toast = useToast()
  const [time, setTime] = useState(deck.plan?.time ?? DEFAULT_TIME)
  const [startedAt, setStartedAt] = useState(deck.plan?.startedAt ?? Date.now())
  const [removing, setRemoving] = useState(false)

  // Recharge à l'ouverture : le plan a pu changer entre deux visites.
  useEffect(() => {
    if (!open) return
    setTime(deck.plan?.time ?? DEFAULT_TIME)
    setStartedAt(deck.plan?.startedAt ?? Date.now())
  }, [open, deck.plan])

  // Les rendez-vous se déduisent de l'échéance : il n'y a plus de rythme à
  // choisir, et la feuille montre ce qu'elle va poser.
  const offsets = useMemo(() => planOffsets(dueBy, startedAt), [dueBy, startedAt])
  const plan: RevisionPlan = { offsets, time, startedAt }
  const dates = planDates(plan)
  const hint = dueBy
    ? `Répartis jusqu’à l’échéance — ${formatDeadline(dueBy)} —, le dernier la veille.`
    : 'Demain, dans une semaine, dans un mois, dans six mois : la courbe de l’oubli.'

  const addToCalendar = () => {
    // Identifiant stable par rang : réimporter met à jour les rendez-vous
    // existants au lieu d'en empiler de nouveaux.
    const events = dates.map((date, index) => ({
      uid: `${deck.id}-reprise-${index}@vdl-flashcards`,
      start: date,
      durationMinutes: 15,
      summary: `Réviser : ${deck.name}`,
      description:
        'Reprise espacée. Ouvre l’application et lance une séance sur ce thème — ' +
        'quinze minutes suffisent.',
    }))
    // Le nombre de rendez-vous dépend désormais de l'échéance : un plan qui
    // raccourcit doit retirer de l'agenda ceux qu'il y avait laissés, faute de
    // quoi de faux rappels survivraient à la nouvelle date.
    const avant = deck.plan ? planDates(deck.plan).length : 0
    for (let index = dates.length; index < avant; index += 1) {
      events.push({
        uid: `${deck.id}-reprise-${index}@vdl-flashcards`,
        start: new Date(startedAt),
        durationMinutes: 15,
        summary: `Réviser : ${deck.name}`,
        description: '',
        cancelled: true,
      } as (typeof events)[number])
    }
    download(icsFilename(deck.name), buildIcs(events), 'text/calendar')
    onSave(plan)
    toast('Plan ajouté à l’agenda.')
  }

  return (
    <>
      <Sheet
        open={open}
        title="Planifier mes révisions"
        onClose={onClose}
        footer={
          <button type="button" className="btn btn--primary btn--block" onClick={addToCalendar}>
            <Icon name="today" size={18} />
            Ajouter à mon agenda
          </button>
        }
      >
        <div className="stack stack-5">
          <p className="meta" style={{ lineHeight: 1.6 }}>
            On oublie vite ce qu’on ne revoit pas : l’essentiel se joue dans les premiers jours.
            Ces rendez-vous se posent dans l’agenda de ton téléphone, qui sonnera même
            l’application fermée.
          </p>

          <div className="card card--pad row" data-status={dueBy ? 'warn' : 'ok'} style={{ gap: 12 }}>
            <span className="glyph glyph--warm">
              <Icon name="today" size={18} />
            </span>
            <p className="meta" style={{ lineHeight: 1.55 }}>{hint}</p>
          </div>

          <Field label="Heure" hint="Choisis un moment où tu es disponible.">
            <input
              className="input mono"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </Field>

          {dates.length > 0 && dates[dates.length - 1].getTime() < Date.now() && (
            <div className="card card--pad row" data-status="warn" style={{ gap: 12 }}>
              <span className="glyph glyph--warm">
                <Icon name="info" size={18} />
              </span>
              <p className="meta" style={{ lineHeight: 1.55 }}>
                L’échéance est trop proche pour que ce rendez-vous soit encore à venir : il ne
                sonnera pas. Choisis une heure plus tardive, ou ouvre simplement l’application —
                les cartes à savoir te sont de toute façon proposées.
              </p>
            </div>
          )}

          <div className="stack stack-3">
            <span className="eyebrow">Tes rendez-vous</span>
            <div className="card">
              {dates.map((date, index) => (
                <div key={index} className="listrow" style={{ cursor: 'default' }}>
                  <span className="dot dot--ok" />
                  <span className="grow stack" style={{ gap: 2, minWidth: 0 }}>
                    <span className="listrow__title truncate">{longDate(date)}</span>
                    <span className="listrow__sub">
                      {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </span>
                  <span className="chip mono">{formatDue(date.getTime())}</span>
                </div>
              ))}
            </div>
          </div>

          {deck.plan && (
            <button
              type="button"
              className="btn btn--ghost btn--block"
              onClick={() => setStartedAt(Date.now())}
            >
              <Icon name="reset" size={17} />
              Repartir d’aujourd’hui
            </button>
          )}

          <div className="card card--pad row" data-status="run" style={{ gap: 12 }}>
            <span className="glyph glyph--warm">
              <Icon name="info" size={18} />
            </span>
            <p className="meta" style={{ lineHeight: 1.55 }}>
              Sur iPhone, ouvre le fichier téléchargé puis « Tout ajouter » pour le déposer dans
              ton calendrier. Sur Android, il s’ouvre directement dans l’agenda. Réimporter un
              plan modifié met à jour les rendez-vous au lieu de les dupliquer.
            </p>
          </div>

          {deck.plan && (
            <button
              type="button"
              className="btn btn--danger btn--block"
              onClick={() => setRemoving(true)}
            >
              <Icon name="trash" size={17} />
              Retirer le plan
            </button>
          )}
        </div>
      </Sheet>

      <ConfirmSheet
        open={removing}
        title="Retirer ce plan ?"
        text="Les rendez-vous déjà ajoutés à ton agenda y restent : supprime-les depuis l’agenda si tu n’en veux plus."
        confirmLabel="Retirer"
        onClose={() => setRemoving(false)}
        onConfirm={() => {
          onRemove()
          setRemoving(false)
          onClose()
        }}
      />
    </>
  )
}
