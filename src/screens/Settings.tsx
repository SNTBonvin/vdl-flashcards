import { useRef, useState } from 'react'
import { useStore } from '../state/store'
import { Icon } from '../components/Icon'
import {
  ConfirmSheet,
  Field,
  SectionHead,
  Sheet,
  Toggle,
  plural,
  useToast,
} from '../components/ui'
import {
  ImportError,
  buildBackup,
  buildCsv,
  download,
  parseBackup,
  readFile,
  stamp,
} from '../io/transfer'
import { notificationSupport, requestPermission } from '../reminders/reminders'

export function SettingsScreen() {
  const store = useStore()
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const [pendingRestore, setPendingRestore] = useState<ReturnType<typeof parseBackup> | null>(null)
  const [wiping, setWiping] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

  const exportJson = () => {
    const backup = buildBackup({
      subjects: store.subjects,
      decks: store.decks,
      cards: store.cards,
      logs: store.logs,
      settings: store.settings,
    })
    download(`flashcards-${stamp()}.json`, JSON.stringify(backup, null, 2), 'application/json')
    toast('Sauvegarde exportée.')
  }

  const exportCsv = () => {
    const rows = store.cards.map((card) => {
      const deck = store.decks.find((d) => d.id === card.deckId)
      const subject = deck ? store.subjects.find((s) => s.id === deck.subjectId) : undefined
      return { subject: subject?.name ?? '', deck: deck?.name ?? '', card }
    })
    download(`flashcards-${stamp()}.csv`, buildCsv(rows), 'text/csv')
    toast('Cartes exportées en CSV.')
  }

  const pickBackup = async (file: File | undefined) => {
    if (!file) return
    try {
      setPendingRestore(parseBackup(await readFile(file)))
    } catch (error) {
      toast(error instanceof ImportError ? error.message : 'Import impossible.', 'error')
    }
    if (fileInput.current) fileInput.current.value = ''
  }

  const permission = notificationSupport()

  return (
    <main className="screen stack stack-6">
      <div className="page-title">
        <h1>Réglages</h1>
      </div>

      {/* ---------------- Révision ---------------- */}
      <section className="stack stack-3">
        <SectionHead title="Révision" />
        <div className="card card--pad stack stack-5">
          <Field
            label="Nouvelles cartes par jour"
            hint="Par catégorie. Au-delà, les cartes neuves attendent le lendemain."
          >
            <input
              className="input mono"
              type="number"
              min={0}
              max={200}
              value={store.settings.newPerDay}
              onChange={(e) => void store.saveSettings({ newPerDay: clampNumber(e.target.value, 0, 200) })}
            />
          </Field>

          <Field label="Cartes maximum par session" hint="Limite la longueur d’une séance.">
            <input
              className="input mono"
              type="number"
              min={5}
              max={500}
              value={store.settings.maxPerSession}
              onChange={(e) => void store.saveSettings({ maxPerSession: clampNumber(e.target.value, 5, 500) })}
            />
          </Field>

          <Field label="Intervalle maximum (jours)" hint="Plafond entre deux passages d’une même carte.">
            <input
              className="input mono"
              type="number"
              min={1}
              max={3650}
              value={store.settings.maxInterval}
              onChange={(e) => void store.saveSettings({ maxInterval: clampNumber(e.target.value, 1, 3650) })}
            />
          </Field>

          <hr className="rule" />

          <Toggle
            checked={store.settings.shuffle}
            onChange={(v) => void store.saveSettings({ shuffle: v })}
            label="Mélanger les cartes"
            hint="Ordre aléatoire à chaque session."
          />
          <Toggle
            checked={store.settings.reverse}
            onChange={(v) => void store.saveSettings({ reverse: v })}
            label="Inverser recto et verso"
            hint="La réponse devient la question."
          />
        </div>
      </section>

      {/* ---------------- Rappels ---------------- */}
      <section className="stack stack-3">
        <SectionHead title="Rappels" />
        <div className="card card--pad stack stack-4">
          <Toggle
            checked={store.settings.notificationsEnabled && permission === 'granted'}
            onChange={async (value) => {
              if (!value) {
                await store.saveSettings({ notificationsEnabled: false })
                return
              }
              const result = await requestPermission()
              if (result === 'granted') {
                await store.saveSettings({ notificationsEnabled: true })
                toast('Notifications activées.')
              } else if (result === 'unsupported') {
                toast('Ce navigateur ne gère pas les notifications.', 'error')
              } else {
                toast('Notifications refusées dans les réglages du navigateur.', 'error')
              }
            }}
            label="Notifications de révision"
            hint="Chaque catégorie peut ensuite avoir son propre horaire."
          />

          <div className="row row--between">
            <span className="meta">Autorisation du navigateur</span>
            <span
              className={`chip ${
                permission === 'granted' ? 'chip--ok' : permission === 'denied' ? 'chip--err' : 'chip--warn'
              }`}
            >
              {
                {
                  granted: 'accordée',
                  denied: 'refusée',
                  default: 'à demander',
                  unsupported: 'indisponible',
                }[permission]
              }
            </span>
          </div>

          <div className="card card--pad row" data-status="warn" style={{ gap: 12 }}>
            <span className="glyph glyph--warm">
              <Icon name="info" size={18} />
            </span>
            <p className="meta" style={{ lineHeight: 1.55 }}>
              Les rappels partent quand l’application est ouverte ou au premier plan. Sur iPhone, installez-la
              sur l’écran d’accueil (Partager → Sur l’écran d’accueil) pour que les notifications fonctionnent.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- Données ---------------- */}
      <section className="stack stack-3">
        <SectionHead title="Données" />
        <div className="card card--pad stack stack-4">
          <p className="meta" style={{ lineHeight: 1.6 }}>
            Tout est stocké sur cet appareil, hors ligne : aucun compte, aucun serveur, aucune requête vers
            un service tiers — polices comprises. La sauvegarde JSON contient les cartes, l’historique et les
            réglages : c’est elle qu’il faut utiliser pour changer de téléphone.
          </p>

          <button
            type="button"
            className="btn btn--primary btn--block"
            onClick={exportJson}
            disabled={store.cards.length === 0}
          >
            <Icon name="download" size={18} />
            Exporter la sauvegarde
          </button>

          <div className="row" style={{ gap: 10 }}>
            <button
              type="button"
              className="btn btn--ghost grow"
              onClick={exportCsv}
              disabled={store.cards.length === 0}
            >
              <Icon name="download" size={17} />
              CSV
            </button>
            <button type="button" className="btn btn--ghost grow" onClick={() => fileInput.current?.click()}>
              <Icon name="upload" size={17} />
              Restaurer
            </button>
          </div>

          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => void pickBackup(e.target.files?.[0])}
          />

          <hr className="rule" />

          <div className="row row--between">
            <span className="meta">Contenu actuel</span>
            <span className="mono" style={{ fontSize: 13 }}>
              {store.subjects.length} · {store.decks.length} · {store.cards.length}
            </span>
          </div>
          <span className="meta" style={{ fontSize: 12 }}>
            matières · catégories · cartes
          </span>

          <button type="button" className="btn btn--danger btn--block" onClick={() => setWiping(true)}>
            <Icon name="trash" size={17} />
            Tout effacer
          </button>
        </div>
      </section>

      {/* ---------------- À propos ---------------- */}
      <section className="stack stack-3">
        <SectionHead title="À propos" />
        <button type="button" className="card card--pad card--tap" onClick={() => setAboutOpen(true)}>
          <div className="row">
            <span className="glyph">
              <Icon name="info" size={18} />
            </span>
            <span className="grow stack" style={{ gap: 1 }}>
              <span className="listrow__title">Comment fonctionne la répétition</span>
              <span className="meta">Le calcul des échéances, expliqué.</span>
            </span>
            <Icon name="chevron-right" size={18} />
          </div>
        </button>
      </section>

      {/* ---------------- Feuilles ---------------- */}

      <ConfirmSheet
        open={pendingRestore !== null}
        title="Restaurer cette sauvegarde ?"
        text={
          pendingRestore
            ? `Le contenu actuel sera remplacé par ${pendingRestore.subjects.length} ${plural(pendingRestore.subjects.length, 'matière')}, ${pendingRestore.decks.length} ${plural(pendingRestore.decks.length, 'catégorie')} et ${pendingRestore.cards.length} ${plural(pendingRestore.cards.length, 'carte')}. Cette action est irréversible.`
            : ''
        }
        confirmLabel="Restaurer"
        onClose={() => setPendingRestore(null)}
        onConfirm={async () => {
          if (!pendingRestore) return
          await store.restore(pendingRestore)
          toast('Sauvegarde restaurée.')
        }}
      />

      <ConfirmSheet
        open={wiping}
        title="Tout effacer ?"
        text="Toutes les matières, catégories, cartes et l’historique de révision seront supprimés de cet appareil. Exportez d’abord une sauvegarde si vous souhaitez les conserver."
        confirmLabel="Effacer"
        onClose={() => setWiping(false)}
        onConfirm={async () => {
          await store.wipe()
          toast('Données effacées.')
        }}
      />

      <Sheet open={aboutOpen} title="La répétition espacée" onClose={() => setAboutOpen(false)}>
        <div className="stack stack-5" style={{ color: 'var(--ink-2)', fontSize: 14.5, lineHeight: 1.65 }}>
          <p>
            Chaque carte porte un intervalle et un facteur de facilité. À chaque réponse, l’intervalle est
            recalculé : plus une carte est sue, plus elle s’espace ; dès qu’elle est ratée, elle revient.
          </p>
          <div className="card">
            <div className="listrow" style={{ cursor: 'default' }}>
              <span className="dot dot--err" />
              <span className="grow">
                <strong style={{ color: 'var(--ink)' }}>Raté</strong> — la carte repart en apprentissage et
                revient dans la minute, puis dans la séance suivante.
              </span>
            </div>
            <div className="listrow" style={{ cursor: 'default' }}>
              <span className="dot dot--warn" />
              <span className="grow">
                <strong style={{ color: 'var(--ink)' }}>Difficile</strong> — l’intervalle avance peu et la
                facilité baisse légèrement.
              </span>
            </div>
            <div className="listrow" style={{ cursor: 'default' }}>
              <span className="dot dot--ok" />
              <span className="grow">
                <strong style={{ color: 'var(--ink)' }}>Su</strong> — l’intervalle est multiplié par le
                facteur de facilité (2,5 au départ).
              </span>
            </div>
          </div>
          <p>
            Une carte neuve sue du premier coup rejoint directement le cycle long : elle revient le
            lendemain, puis de plus en plus tard. Une carte ratée réapparaît dans la même séance, et une
            carte acquise que l’on oublie repart avec un intervalle divisé par deux. Le mode
            « Interrogation » interroge sur toutes les cartes choisies, échues ou non, et met la
            planification à jour comme une révision normale.
          </p>
        </div>
      </Sheet>
    </main>
  )
}

function clampNumber(raw: string, min: number, max: number): number {
  const value = Number.parseInt(raw, 10)
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}
