import { useEffect, useId, useRef, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/**
 * Helskärm i mobil, centrerad ruta på större skärmar. Bygger på <dialog> med showModal(),
 * som ger fokusfälla, Esc-stängning och gör bakgrunden oklickbar.
 */
export function Modal({ open, onClose, title, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // Esc: låt React-state styra stängningen i stället för webbläsaren
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      // Klick på bakgrunden (utanför innehållet) stänger på större skärmar
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-surface text-text backdrop:bg-black/60 sm:m-auto sm:h-auto sm:max-h-[90dvh] sm:max-w-[420px] sm:rounded-2xl"
    >
      <div className="relative flex min-h-full flex-col px-4 pt-10 pb-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Stäng"
          className="absolute top-3 right-4 grid size-10 place-items-center rounded-full text-icon hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-icon"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        <h2 id={titleId} className="text-2xl font-bold">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  )
}
