import type { ReactNode } from 'react'
import Modal from './Modal'

interface ConfirmModalProps {
  open: boolean
  title: string
  confirmLabel: string
  danger?: boolean
  onClose: () => void
  children: ReactNode
}

export default function ConfirmModal({
  open,
  title,
  confirmLabel,
  danger,
  onClose,
  children,
}: ConfirmModalProps) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p>{children}</p>
      <div className="actions">
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className={danger ? 'danger' : undefined}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
