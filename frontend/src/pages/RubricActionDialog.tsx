import { useState, type FormEvent } from 'react'
import Dialog from '../components/Dialog.tsx'
import {
  deprecateRubric,
  publishRubric,
  type Rubric,
} from '../services/rubrics.ts'

export type RubricAction = 'publish' | 'deprecate'

interface Props {
  rubric: Rubric
  action: RubricAction
  onDone: (changes: Partial<Rubric>) => void
  onCancel: () => void
}

function RubricActionDialog({ rubric, action, onDone, onCancel }: Props) {
  const [replacementRubricId, setReplacementRubricId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const isPublish = action === 'publish'

  async function run(): Promise<Partial<Rubric>> {
    if (isPublish) {
      const { publishDate } = await publishRubric(rubric.rubricId)
      return { state: 'Published', publishDate }
    }
    const replacement = replacementRubricId.trim()
    if (replacement === rubric.rubricId) {
      throw new Error('Replacement must be a different rubric.')
    }
    await deprecateRubric(rubric.rubricId, replacement)
    return { state: 'Deprecated', replacementRubricId: replacement }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(undefined)
    try {
      onDone(await run())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setBusy(false)
    }
  }

  return (
    <Dialog
      title={isPublish ? 'Publish rubric' : 'Deprecate rubric'}
      onClose={() => {
        if (!busy) onCancel()
      }}
    >
      <form onSubmit={submit}>
        {isPublish ? (
          <p>
            Publish "{rubric.name}”? Published rubrics cannot be edited or
            deleted.
          </p>
        ) : (
          <>
            <p>
              Deprecate "{rubric.name}”? Users will be told to use the
              replacement. This cannot be undone.
            </p>
            <label>
              Replacement rubric ID
              <input
                value={replacementRubricId}
                onChange={(event) => setReplacementRubricId(event.target.value)}
                placeholder="Enter replacement rubric ID"
                required
                autoFocus
              />
            </label>
          </>
        )}
        {error && (
          <p className="dialog-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="submit" disabled={busy}>
            {isPublish ? 'Publish' : 'Deprecate'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

export default RubricActionDialog
