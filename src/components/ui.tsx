/** Briques d'interface communes, alignées sur la charte « Papier ». */

import { createPortal } from 'react-dom'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Icon, type IconName } from './Icon'

/* ------------------------------ État vide ------------------------------ */

export function EmptyState({
  icon = 'inbox',
  title,
  text,
  action,
}: {
  icon?: IconName
  title: string
  text: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <div className="empty__icon">
        <Icon name={icon} size={24} />
      </div>
      <div className="stack stack-2" style={{ alignItems: 'center' }}>
        <div className="empty__title">{title}</div>
        <p className="empty__text">{text}</p>
      </div>
      {action}
    </div>
  )
}

/* ------------------------------- Feuille ------------------------------- */

export function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  // Portail vers <body> : les écrans sont animés et créent un contexte
  // d'empilement, la feuille doit en sortir pour couvrir la barre d'onglets.
  return createPortal(
    <div
      className="scrim"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet__grab" />
        <div className="sheet__head">
          <h2 className="grow truncate" style={{ fontSize: 17 }}>
            {title}
          </h2>
          <button type="button" className="icon-btn icon-btn--bare" onClick={onClose} aria-label="Fermer">
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="sheet__body">{children}</div>
        {footer && <div className="sheet__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

/* ------------------------------ Champs -------------------------------- */

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      {children}
      {hint && (
        <span className="meta" style={{ fontSize: 12.5 }}>
          {hint}
        </span>
      )}
    </label>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <button
      type="button"
      className="row row--between"
      onClick={() => onChange(!checked)}
      style={{ width: '100%', background: 'transparent', border: 0, padding: 0, textAlign: 'left' }}
    >
      <span className="grow stack" style={{ gap: 2 }}>
        <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>{label}</span>
        {hint && <span className="meta">{hint}</span>}
      </span>
      <span className="switch" role="switch" aria-checked={checked} aria-label={label} />
    </button>
  )
}

/* ------------------------------- Toasts ------------------------------- */

interface ToastMessage {
  id: number
  text: string
  tone: 'default' | 'error'
}

const ToastContext = createContext<(text: string, tone?: 'default' | 'error') => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const notify = useCallback((text: string, tone: 'default' | 'error' = 'default') => {
    window.clearTimeout(timer.current)
    setToast({ id: Date.now(), text, tone })
    timer.current = window.setTimeout(() => setToast(null), 3200)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={notify}>
      {children}
      {toast && (
        <div className={`toast${toast.tone === 'error' ? ' toast--err' : ''}`} role="status">
          <Icon name={toast.tone === 'error' ? 'info' : 'check'} size={16} />
          <span>{toast.text}</span>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

/* ----------------------------- Confirmation ---------------------------- */

export function ConfirmSheet({
  open,
  title,
  text,
  confirmLabel = 'Supprimer',
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  text: string
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Sheet
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost grow" onClick={onClose}>
            Annuler
          </button>
          <button
            type="button"
            className="btn btn--primary grow"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ color: 'var(--ink-2)', fontSize: 14.5, lineHeight: 1.6 }}>{text}</p>
    </Sheet>
  )
}

/* ------------------------------ Divers -------------------------------- */

export function StatRow({ items }: { items: { value: ReactNode; label: string; accent?: boolean }[] }) {
  return (
    <div className="card stats">
      {items.map((item) => (
        <div className="stat" key={item.label}>
          <div className={`stat__value${item.accent ? ' stat__value--accent' : ''}`}>{item.value}</div>
          <div className="stat__label">{item.label}</div>
        </div>
      ))}
    </div>
  )
}

export function SectionHead({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="section-head">
      <span className="eyebrow">{title}</span>
      {aside}
    </div>
  )
}

export const plural = (n: number, one: string, many = `${one}s`) => (n > 1 ? many : one)
