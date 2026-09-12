/**
 * Durabilité du stockage local.
 *
 * Par défaut, ce que l'application écrit sur l'appareil est en stockage « au
 * mieux » : le navigateur peut le supprimer de lui-même s'il manque de place,
 * et Safari efface le stockage d'un site resté sept jours sans visite. Le
 * stockage persistant lève ces deux menaces — il ne protège évidemment pas
 * d'un effacement demandé par la personne elle-même.
 *
 * La demande est silencieuse sur les navigateurs Android quand l'application
 * est installée, mais Firefox ouvre une fenêtre de permission. On ne la
 * déclenche donc jamais au démarrage : au lancement on ne prend que ce qui
 * s'accorde sans rien afficher, le reste passe par un geste explicite dans les
 * réglages.
 */

export type PersistState =
  /** Déjà accordé : les données ne seront pas évincées. */
  | 'persisted'
  /** Le navigateur accorderait sans rien demander. */
  | 'grantable'
  /** Il faut le demander, et une fenêtre peut s'ouvrir. */
  | 'ask'
  /** Refusé par le navigateur ou par l'utilisateur. */
  | 'denied'
  /** Navigateur trop ancien, ou navigation privée. */
  | 'unsupported'

function supported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.storage?.persist === 'function'
}

/** État de la permission, quand le navigateur sait la donner à l'avance. */
async function permissionState(): Promise<PermissionState | null> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return null
  try {
    const status = await navigator.permissions.query({
      name: 'persistent-storage' as PermissionName,
    })
    return status.state
  } catch {
    // Safari ne connaît pas cette permission : on ne peut rien présumer.
    return null
  }
}

export async function readPersist(): Promise<PersistState> {
  if (!supported()) return 'unsupported'
  try {
    if (await navigator.storage.persisted()) return 'persisted'
  } catch {
    return 'unsupported'
  }
  const state = await permissionState()
  if (state === 'granted') return 'grantable'
  if (state === 'denied') return 'denied'
  return 'ask'
}

/** Demande le stockage persistant. Peut ouvrir une fenêtre : geste explicite. */
export async function requestPersist(): Promise<boolean> {
  if (!supported()) return false
  try {
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

/**
 * Au démarrage : ne prend que ce qui s'obtient sans rien afficher. Ne demande
 * jamais rien de sa propre initiative.
 */
export async function claimPersistIfSilent(): Promise<void> {
  if ((await readPersist()) !== 'grantable') return
  await requestPersist()
}

/** Place occupée par l'application sur l'appareil, en octets. */
export async function readUsage(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === 'undefined' || typeof navigator.storage?.estimate !== 'function') {
    return null
  }
  try {
    const { usage, quota } = await navigator.storage.estimate()
    if (usage === undefined) return null
    return { usage, quota: quota ?? 0 }
  } catch {
    return null
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
}

/**
 * Sur iPhone, une application ajoutée à l'écran d'accueil possède son propre
 * stockage, distinct de celui de Safari — et le système ne sait pas confier un
 * lien à une application web. Un lien ouvert depuis un message atterrit donc
 * dans Safari, où les cartes reçues resteront invisibles pour l'application
 * installée. On ne peut pas l'empêcher : on peut prévenir.
 */
export function isIosBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  // iPadOS 13+ se présente comme un Mac : le tactile le trahit.
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  if (!ios) return false
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches)
  return !standalone
}
