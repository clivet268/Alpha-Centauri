import type { ReactNode } from 'react'
import Modal from './Modal'

interface ConfirmModalProps {
  open: boolean
  title: string
  confirmLabel: string
  danger?: boolean
  busy?: boolean
  onClose: () => void
  onConfirm?: () => void
  children: ReactNode
}

export default function ConfirmModal({
  open,
  title,
  confirmLabel,
  danger,
  busy,
  onClose,
  onConfirm,
  children,
}: ConfirmModalProps) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p>{children}</p>
      <div className="actions">
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className={danger ? 'danger' : undefined}
          disabled={busy}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
