import { useEffect, useRef, useState } from 'react'
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
  download,
  parseBackup,
  readFile,
  stamp,
} from '../io/transfer'
import { notificationSupport, requestPermission } from '../reminders/reminders'
import { APP_BUILD_DATE, APP_VERSION, checkNow, useAppUpdate, type CheckResult } from '../pwa/update'
import { useTheme, type ThemeMode } from '../theme/theme'
import { useRoute } from '../lib/router'
import {
  PublishError,
  checkAccess,
  forgetToken,
  parseRepo,
  readToken,
  saveToken,
} from '../io/github'
import { ExportSheet, exportRows } from '../components/ExportSheet'
import {
  formatBytes,
  readPersist,
  readUsage,
  requestPersist,
  type PersistState,
} from '../lib/storage'

const THEMES: { value: ThemeMode; label: string }[] = [
  { value: 'auto', label: 'Automatique' },
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
]

export function SettingsScreen() {
  const store = useStore()
  const toast = useToast()
  const { navigate } = useRoute()
  const theme = useTheme()
  const fileInput = useRef<HTMLInputElement>(null)
  const [pendingRestore, setPendingRestore] = useState<ReturnType<typeof parseBackup> | null>(null)
  const [wiping, setWiping] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [persist, setPersist] = useState<PersistState | null>(null)
  const [usage, setUsage] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [state, size] = await Promise.all([readPersist(), readUsage()])
      if (cancelled) return
      setPersist(state)
      setUsage(size?.usage ?? null)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const exportJson = () => {
    const backup = buildBackup({
      subjects: store.subjects,
      decks: store.decks,
      cards: store.cards,
      logs: store.logs,
      distributions: store.distributions,
      settings: store.settings,
    })
    download(`flashcards-${stamp()}.json`, JSON.stringify(backup, null, 2), 'application/json')
    toast('Sauvegarde exportée.')
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

      {/* ---------------- Apparence ---------------- */}
      <section className="stack stack-3">
        <SectionHead title="Apparence" />
        <div className="card card--pad stack stack-3">
          <div className="seg">
            {THEMES.map((item) => (
              <button
                key={item.value}
                type="button"
                className="seg__item"
                aria-pressed={theme.mode === item.value}
                onClick={() => theme.setMode(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <span className="meta" style={{ lineHeight: 1.55 }}>
            {theme.mode === 'auto'
              ? `Suit le réglage du téléphone — actuellement ${theme.resolved === 'dark' ? 'sombre' : 'clair'}.`
              : 'Réglage propre à cet appareil.'}
          </span>
        </div>
      </section>

      {/* ---------------- Révision ---------------- */}
      <section className="stack stack-3">
        <SectionHead title="Révision" />
        <div className="card card--pad stack stack-5">
          <Field
            label="Nouvelles cartes par jour"
            hint="Par thème. Au-delà, les cartes neuves attendent le lendemain."
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

          <Field
            label="Intervalle maximum (jours)"
            hint="Plafond entre deux passages d’une même carte. 90 jours garde tout dans la rotation d’un trimestre à l’autre ; au-delà, une carte peut disparaître pour la moitié de l’année."
          >
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

          <Toggle
            checked={store.settings.showReviewHelp}
            onChange={(v) => void store.saveSettings({ showReviewHelp: v })}
            label="Expliquer les modes de séance"
            hint="L’encart « quel mode choisir ? » sur l’écran Réviser, que l’on peut y refermer d’une croix."
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
            hint="Chaque thème peut ensuite avoir son propre horaire."
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
              Les rappels partent quand l’application est ouverte ou au premier plan. Sur iPhone, installe-la
              sur l’écran d’accueil (Partager → Sur l’écran d’accueil) pour que les notifications fonctionnent.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- Diffusion ---------------- */}
      <section className="stack stack-3">
        <SectionHead title="Diffusion" />
        <div className="card card--pad stack stack-4">
          <Toggle
            checked={store.settings.teacherTools}
            onChange={(v) => void store.saveSettings({ teacherTools: v })}
            label="Outils d’enseignant"
            hint="Fait apparaître les lots de distribution et la publication sous un code. Sans eux, l’application reste complète pour réviser, créer et partager ses propres cartes."
          />
          {store.settings.teacherTools && (
            <p className="meta" style={{ lineHeight: 1.55 }}>
              Ces outils n’agissent que sur cet appareil : publier suppose d’avoir les droits sur
              le dépôt, et rien ici ne les donne.
            </p>
          )}
        </div>

        {store.settings.teacherTools && <PublishToken />}
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
              onClick={() => setExporting(true)}
              disabled={store.cards.length === 0}
            >
              <Icon name="download" size={17} />
              Cartes
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
            matières · thèmes · cartes
          </span>

          <hr className="rule" />

          <div className="row row--between">
            <span className="grow stack" style={{ gap: 1, minWidth: 0 }}>
              <span className="listrow__title">Protection sur cet appareil</span>
              <span className="meta">
                {persist === 'persisted'
                  ? 'Le navigateur ne supprimera pas tes cartes pour faire de la place.'
                  : persist === 'unsupported'
                    ? 'Ce navigateur ne sait pas protéger le stockage. Exporte la sauvegarde régulièrement.'
                    : persist === 'denied'
                      ? 'Le navigateur a refusé. Exporte la sauvegarde régulièrement.'
                      : 'Sans protection, le navigateur peut effacer tes cartes s’il manque de place.'}
              </span>
            </span>
            <span className={`chip ${persist === 'persisted' ? 'chip--ok' : 'chip--warn'}`}>
              {persist === null
                ? '…'
                : persist === 'persisted'
                  ? 'protégées'
                  : persist === 'unsupported'
                    ? 'indisponible'
                    : persist === 'denied'
                      ? 'refusée'
                      : 'à demander'}
            </span>
          </div>

          {(persist === 'ask' || persist === 'grantable') && (
            <button
              type="button"
              className="btn btn--ghost btn--block"
              onClick={async () => {
                const granted = await requestPersist()
                setPersist(granted ? 'persisted' : 'denied')
                toast(
                  granted
                    ? 'Tes cartes sont protégées sur cet appareil.'
                    : 'Le navigateur a refusé. Pense à exporter la sauvegarde.',
                  granted ? 'default' : 'error',
                )
              }}
            >
              <Icon name="shield" size={17} />
              Protéger mes données
            </button>
          )}

          {usage !== null && (
            <div className="row row--between">
              <span className="meta">Place occupée</span>
              <span className="mono" style={{ fontSize: 13 }}>
                {formatBytes(usage)}
              </span>
            </div>
          )}

          <button type="button" className="btn btn--danger btn--block" onClick={() => setWiping(true)}>
            <Icon name="trash" size={17} />
            Tout effacer
          </button>
        </div>
      </section>

      {/* ---------------- À propos ---------------- */}
      <section className="stack stack-3">
        <SectionHead title="À propos" />

        <div className="card card--pad row row--between">
          <span className="grow stack" style={{ gap: 1 }}>
            <span className="listrow__title">Version installée</span>
            <span className="meta">
              Compare-la avec tes élèves pour vérifier qu’ils sont à jour.
            </span>
          </span>
          <span className="chip mono">
            {APP_VERSION} · {APP_BUILD_DATE}
          </span>
        </div>

        <VersionCheck />

        <button
          type="button"
          className="card card--pad card--tap"
          onClick={() => navigate({ name: 'help' })}
        >
          <div className="row">
            <span className="glyph">
              <Icon name="sparkle" size={18} />
            </span>
            <span className="grow stack" style={{ gap: 1 }}>
              <span className="listrow__title">Prise en main</span>
              <span className="meta">Le mode d’emploi, et un exemple à ajouter en un clic.</span>
            </span>
            <Icon name="chevron-right" size={18} />
          </div>
        </button>

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

      <ExportSheet
        open={exporting}
        scopes={[
          {
            id: 'tout',
            label: 'Toutes mes cartes',
            rows: exportRows(store.cards, store.decks, store.subjects),
          },
          ...store.subjects.map((subject) => ({
            id: subject.id,
            label: subject.name,
            rows: exportRows(
              (store.decksBySubject.get(subject.id) ?? []).flatMap(
                (d) => store.cardsByDeck.get(d.id) ?? [],
              ),
              store.decks,
              store.subjects,
            ),
          })),
        ]}
        onClose={() => setExporting(false)}
      />

      <ConfirmSheet
        open={pendingRestore !== null}
        title="Restaurer cette sauvegarde ?"
        text={
          pendingRestore
            ? `Le contenu actuel sera remplacé par ${pendingRestore.subjects.length} ${plural(pendingRestore.subjects.length, 'matière')}, ${pendingRestore.decks.length} ${plural(pendingRestore.decks.length, 'thème')} et ${pendingRestore.cards.length} ${plural(pendingRestore.cards.length, 'carte')}. Cette action est irréversible.`
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
        text="Toutes les matières, thèmes, cartes et l’historique de révision seront supprimés de cet appareil. Exporte d’abord une sauvegarde si tu souhaites les conserver."
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
                <strong style={{ color: 'var(--ink)' }}>Raté</strong> — la carte repart en apprentissage :
                elle revient dans la minute, puis dix minutes plus tard, avant de rejoindre le cycle long.
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
            « Tout revoir » interroge sur toutes les cartes choisies, échues ou non, et met la
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

/**
 * Jeton de publication : ce qui transforme le dépôt d'un fichier en un bouton.
 *
 * Il est délibérément rangé ici plutôt que dans la feuille de publication :
 * c'est un réglage de l'appareil, qu'on saisit une fois, pas une étape de la
 * diffusion. Et il est écrit dans une case à part de la base — jamais dans les
 * réglages exportés, une sauvegarde n'ayant aucune raison de transporter un
 * droit d'écriture (voir io/github).
 */
function PublishToken() {
  const store = useStore()
  const toast = useToast()
  const [token, setToken] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forgetting, setForgetting] = useState(false)

  useEffect(() => {
    void readToken().then((value) => setSaved(value.length > 0))
  }, [])

  const repo = parseRepo(store.settings.publishRepo)

  const save = async () => {
    if (!repo) {
      setError('Renseigne d’abord l’adresse du dépôt dans la feuille de publication.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await checkAccess(repo, token.trim())
      await saveToken(token)
      setToken('')
      setSaved(true)
      toast('Jeton enregistré sur cet appareil.')
    } catch (e) {
      setError(e instanceof PublishError ? e.message : 'Vérification impossible.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card card--pad stack stack-4">
      <div className="row row--between">
        <span className="eyebrow">Publier en un geste</span>
        {saved && <span className="chip chip--ok">jeton en place</span>}
      </div>

      <p className="meta" style={{ lineHeight: 1.6 }}>
        Sans jeton, publier veut dire télécharger un fichier puis le déposer à la main sur le
        dépôt. Avec un jeton, l’application le dépose pour toi.
      </p>

      {saved ? (
        <>
          <p className="meta" style={{ lineHeight: 1.6 }}>
            Le jeton est enregistré sur cet appareil seulement. Il ne part jamais dans la
            sauvegarde, et n’est envoyé qu’à GitHub, au moment où tu publies.
          </p>
          <button
            type="button"
            className="btn btn--ghost btn--block"
            onClick={() => setForgetting(true)}
          >
            <Icon name="trash" size={17} />
            Oublier ce jeton
          </button>
        </>
      ) : (
        <>
          <div className="stack stack-2">
            <span className="label">Comment en obtenir un</span>
            <p className="meta" style={{ lineHeight: 1.6 }}>
              Sur GitHub : <span className="mono">Settings → Developer settings → Personal access
              tokens → Fine-grained tokens</span>. Donne-lui accès au{' '}
              <strong style={{ color: 'var(--ink)' }}>seul dépôt du projet</strong>, et une seule
              autorisation : <span className="mono">Contents</span> en lecture et écriture. Il
              s’annule d’un clic depuis la même page si tu perds ton téléphone.
            </p>
          </div>

          <Field label="Jeton" hint="Collé une fois, il reste sur cet appareil.">
            <input
              className="input mono"
              style={{ fontSize: 12 }}
              type="password"
              value={token}
              onChange={(e) => {
                setToken(e.target.value)
                setError(null)
              }}
              placeholder="github_pat_…"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </Field>

          {!repo && (
            <p className="meta" style={{ lineHeight: 1.55 }}>
              Le dépôt n’est pas encore renseigné, ou n’est pas sur GitHub. Cette voie ne vaut que
              pour un dépôt GitHub — ailleurs, le dépôt manuel reste le chemin.
            </p>
          )}

          {error && (
            <div className="card card--pad row" data-status="warn" style={{ gap: 12 }}>
              <span className="glyph glyph--warm">
                <Icon name="info" size={18} />
              </span>
              <p className="meta" style={{ lineHeight: 1.55 }}>{error}</p>
            </div>
          )}

          <button
            type="button"
            className="btn btn--primary btn--block"
            disabled={!token.trim() || !repo || busy}
            onClick={() => void save()}
          >
            {busy ? 'Vérification…' : 'Vérifier et enregistrer'}
          </button>
        </>
      )}

      <ConfirmSheet
        open={forgetting}
        title="Oublier ce jeton ?"
        text="La publication redeviendra manuelle : télécharger le fichier, puis le déposer sur le dépôt. Le jeton lui-même reste valide sur GitHub tant que tu ne l’y révoques pas."
        confirmLabel="Oublier"
        onClose={() => setForgetting(false)}
        onConfirm={async () => {
          await forgetToken()
          setSaved(false)
          toast('Jeton retiré de cet appareil.')
        }}
      />
    </div>
  )
}

/**
 * Vérification de version à la demande.
 *
 * L'application se met à jour toute seule — au retour au premier plan, au
 * retour du réseau, toutes les demi-heures. Ce bouton ne remplace pas cela : il
 * sert à pouvoir répondre, devant une classe, « regarde, tu es à jour », ou à
 * forcer la main avant un cours.
 *
 * D'où le soin apporté aux trois réponses possibles. « À jour » ne doit être
 * affiché que si on l'a vraiment vérifié : quand le site est injoignable, on le
 * dit, au lieu de rassurer à tort.
 */
function VersionCheck() {
  const update = useAppUpdate()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<CheckResult | null>(null)

  const run = async () => {
    setBusy(true)
    setResult(null)
    try {
      setResult(await checkNow())
    } finally {
      setBusy(false)
    }
  }

  const found = result === 'updated' || update.available

  return (
    <div className="card card--pad stack stack-3" data-status={found ? 'run' : undefined}>
      <div className="row row--between">
        <span className="grow stack" style={{ gap: 1 }}>
          <span className="listrow__title">Mise à jour de l’application</span>
          <span className="meta">
            Vérifiée d’elle-même à chaque ouverture. À demander ici en cas de doute.
          </span>
        </span>
        {result && !busy && (
          <span className={`chip ${found ? 'chip--accent' : result === 'current' ? 'chip--ok' : 'chip--warn'}`}>
            {found
              ? 'nouvelle version'
              : result === 'current'
                ? 'à jour'
                : result === 'offline'
                  ? 'hors ligne'
                  : 'indisponible'}
          </span>
        )}
      </div>

      {result === 'offline' && (
        <p className="meta" style={{ lineHeight: 1.55 }}>
          Le site n’a pas répondu : impossible de savoir. L’application continue de fonctionner avec
          la version installée, et retentera d’elle-même au retour du réseau.
        </p>
      )}

      {result === 'unsupported' && (
        <p className="meta" style={{ lineHeight: 1.55 }}>
          Ce navigateur ne gère pas les mises à jour hors ligne — en navigation privée, par exemple.
          Recharge la page pour obtenir la dernière version.
        </p>
      )}

      {found ? (
        <>
          <p className="meta" style={{ lineHeight: 1.55 }}>
            Une nouvelle version est prête. Tes cartes, ton historique et tes réglages sont
            conservés : seule l’application est remplacée.
          </p>
          <button type="button" className="btn btn--primary btn--block" onClick={update.apply}>
            <Icon name="download" size={18} />
            Installer et recharger
          </button>
        </>
      ) : (
        <button
          type="button"
          className="btn btn--ghost btn--block"
          disabled={busy}
          onClick={() => void run()}
        >
          <Icon name="reset" size={17} />
          {busy ? 'Vérification…' : 'Vérifier maintenant'}
        </button>
      )}
    </div>
  )
}
