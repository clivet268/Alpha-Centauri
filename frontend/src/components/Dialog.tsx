import { useId, type ReactNode } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
}

function openModal(dialog: HTMLDialogElement | null) {
  if (dialog && !dialog.open) dialog.showModal()
}

function Dialog({ title, onClose, children }: Props) {
  const titleId = useId()

  return (
    <dialog
      ref={openModal}
      className="dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <h2 id={titleId}>{title}</h2>
      {children}
    </dialog>
  )
}

export default Dialog
