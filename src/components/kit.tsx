'use client'
import type { ReactNode } from 'react'
import { sfx } from '@/game/audio'

/** `minimize`: the button folds the sheet down to its header (used while you are inside a place) instead of closing it. */
export function Sheet({ title, icon, subtitle, onClose, children, footer, minimize }: { title: string; icon?: string; subtitle?: ReactNode; onClose?: () => void; children: ReactNode; footer?: ReactNode; minimize?: boolean }) {
  return (
    <section className="sheet" role="dialog" aria-label={title}>
      <header className="sheet-head">
        {icon && <span className="sheet-icon">{icon}</span>}
        <div className="sheet-title">
          <h2>{title}</h2>
          {subtitle && <div className="sheet-sub">{subtitle}</div>}
        </div>
        {onClose && (
          <button className="icon-btn" onClick={() => { sfx('click'); onClose() }} aria-label={minimize ? 'Minimize' : 'Close'} title={minimize ? 'Minimize' : 'Close'}>
            {minimize ? '▾' : '✕'}
          </button>
        )}
      </header>
      <div className="sheet-body">{children}</div>
      {footer && <footer className="sheet-foot">{footer}</footer>}
    </section>
  )
}

export function Meter({ value, max = 100, tone = 'green', label }: { value: number; max?: number; tone?: 'green' | 'blue' | 'gold' | 'red'; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className={`meter ${tone}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      <i style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Chip({ tone = 'neutral', children }: { tone?: 'neutral' | 'plus' | 'minus' | 'warn' | 'gold' | 'blue'; children: ReactNode }) {
  return <span className={`chip ${tone}`}>{children}</span>
}

export function Btn({ children, onClick, disabled, kind = 'primary', small, title }: { children: ReactNode; onClick?: () => void; disabled?: boolean; kind?: 'primary' | 'ghost' | 'danger' | 'soft'; small?: boolean; title?: string }) {
  return (
    <button
      className={`btn ${kind} ${small ? 'small' : ''}`}
      disabled={disabled}
      title={title}
      onClick={() => {
        sfx('click')
        onClick?.()
      }}
    >
      {children}
    </button>
  )
}

export function Modal({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label={label}>
      <div className="modal">{children}</div>
    </div>
  )
}
