import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { ConfirmSheet, Field, Sheet, useToast } from './ui'
import { PLAN_PRESETS, planDates } from '../reminders/plan'
import { buildIcs, icsFilename } from '../io/ics'
import { download } from '../io/transfer'
import { formatDue } from '../lib/date'
import type { Deck, PlanPreset, RevisionPlan } from '../db/types'

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
  onClose,
  onSave,
  onRemove,
}: {
  open: boolean
  deck: Deck
  onClose: () => void
  onSave: (plan: RevisionPlan) => void
  onRemove: () => void
}) {
  const toast = useToast()
  const [preset, setPreset] = useState<PlanPreset>(deck.plan?.preset ?? 'ebbinghaus')
  const [time, setTime] = useState(deck.plan?.time ?? DEFAULT_TIME)
  const [startedAt, setStartedAt] = useState(deck.plan?.startedAt ?? Date.now())
  const [removing, setRemoving] = useState(false)

  // Recharge à l'ouverture : le plan a pu changer entre deux visites.
  useEffect(() => {
    if (!open) return
    setPreset(deck.plan?.preset ?? 'ebbinghaus')
    setTime(deck.plan?.time ?? DEFAULT_TIME)
    setStartedAt(deck.plan?.startedAt ?? Date.now())
  }, [open, deck.plan])

  const plan: RevisionPlan = { preset, time, startedAt }
  const dates = planDates(plan)
  const hint = PLAN_PRESETS.find((p) => p.id === preset)?.hint ?? ''

  const addToCalendar = () => {
    // Identifiant stable par rang : réimporter met à jour les rendez-vous
    // existants au lieu d'en empiler de nouveaux.
    const events = dates.map((date, index) => ({
      uid: `${deck.id}-reprise-${index}@vdl-flashcards`,
      start: date,
      durationMinutes: 15,
      summary: `Réviser : ${deck.name}`,
      description:
        'Reprise espacée. Ouvrez l’application et lancez une séance sur ce thème — ' +
        'quinze minutes suffisent.',
    }))
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
            Ces rendez-vous se posent dans l’agenda de votre téléphone, qui sonnera même
            l’application fermée.
          </p>

          <div className="field">
            <span className="label">Rythme</span>
            <div className="seg">
              {PLAN_PRESETS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="seg__item"
                  aria-pressed={preset === item.id}
                  onClick={() => setPreset(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <span className="meta" style={{ fontSize: 12.5 }}>
              {hint}
            </span>
          </div>

          <Field label="Heure" hint="Choisissez un moment où vous êtes disponible.">
            <input
              className="input mono"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </Field>

          <div className="stack stack-3">
            <span className="eyebrow">Vos rendez-vous</span>
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
              Sur iPhone, ouvrez le fichier téléchargé puis « Tout ajouter » pour le déposer dans
              votre calendrier. Sur Android, il s’ouvre directement dans l’agenda. Réimporter un
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
        text="Les rendez-vous déjà ajoutés à votre agenda y restent : supprimez-les depuis l’agenda si vous n’en voulez plus."
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
