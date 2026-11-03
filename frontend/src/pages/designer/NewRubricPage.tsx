import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import RubricTable from '../../components/RubricTable'
import { createRubric } from '../../services/rubrics'

export default function NewRubricPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(undefined)
    try {
      const { rubricId } = await createRubric(name.trim())
      navigate(`/designer/rubric/${rubricId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create rubric.')
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <form className="control-bar" onSubmit={submit}>
        <button type="button" onClick={() => navigate('/designer/rubric')}>
          Back to Rubrics
        </button>
        <input
          className="title-input spacer"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Enter Rubric Name"
          aria-label="Rubric name"
          maxLength={200}
          required
          autoFocus
        />
        <button type="submit" disabled={busy || !name.trim()}>
          {busy ? 'Creating...' : 'Create Rubric'}
        </button>
      </form>

      {error && (
        <div className="error-text" role="alert">
          {error}
        </div>
      )}

      <RubricTable mode="view" questions={[]} viewUrl="" />
    </div>
  )
}
