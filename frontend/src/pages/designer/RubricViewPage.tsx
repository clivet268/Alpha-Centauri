import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import RubricTable from '../../components/RubricTable'
import ScoreSummary from '../../components/ScoreSummary'
import { ApiError } from '../../services/api'
import { viewRubric, type Rubric } from '../../services/rubrics'
import { tableQuestions } from './tableQuestions'

const MAX_RATING = 5

type Load =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; rubric: Rubric }

function errorMessage(err: unknown): string {
  if (!(err instanceof ApiError)) return 'Could not load rubric.'
  return err.status === 404 || err.status === 400
    ? 'Rubric not found or not published.'
    : err.message
}

export default function RubricViewPage() {
  const navigate = useNavigate()
  const { rubricId = '' } = useParams()
  const [result, setResult] = useState<{ rubricId: string; load: Load }>()
  const load: Load =
    result?.rubricId === rubricId ? result.load : { status: 'loading' }

  useEffect(() => {
    let stale = false
    viewRubric(rubricId)
      .then((rubric) => {
        if (!stale) {
          setResult({ rubricId, load: { status: 'loaded', rubric } })
        }
      })
      .catch((err: unknown) => {
        if (!stale) {
          setResult({
            rubricId,
            load: { status: 'error', message: errorMessage(err) },
          })
        }
      })
    return () => {
      stale = true
    }
  }, [rubricId])

  const backButton = (
    <button type="button" onClick={() => navigate('/designer/rubric')}>
      Back to Rubrics
    </button>
  )

  if (load.status === 'loading') {
    return <p className="rubric-editor-status">Loading rubric...</p>
  }
  if (load.status === 'error') {
    return (
      <div className="page">
        <div className="control-bar">{backButton}</div>
        <p className="rubric-editor-status" role="alert">
          {load.message}
        </p>
      </div>
    )
  }

  const { rubric } = load

  return (
    <div className="page">
      <div className="control-bar">
        {backButton}
        <div className="spacer title-input">{rubric.name}</div>
      </div>

      <div className="readonly-note">
        Read-only view. State: {rubric.state} &middot; Publish date:{' '}
        {rubric.publishDate}
      </div>
      <RubricTable
        mode="view"
        questions={tableQuestions(rubric)}
        viewUrl={rubric.rubricId}
      />
      <ScoreSummary
        label="Maximum Possible Score"
        value={MAX_RATING * rubric.questions.length}
        legend={`High >= ${rubric.highThreshold ?? 'Not set'}   Low < ${
          rubric.lowThreshold ?? 'Not set'
        }   (in between = moderate)`}
      />
    </div>
  )
}
