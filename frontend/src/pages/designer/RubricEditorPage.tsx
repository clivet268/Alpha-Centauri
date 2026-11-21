import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import RubricTable from '../../components/RubricTable'
import ScoreSummary from '../../components/ScoreSummary'
import { ApiError } from '../../services/api'
import {
  getRubric,
  type Rating as ApiRating,
  type Rubric,
} from '../../services/rubrics'
import { RATINGS, type Question } from '../../types'
import RubricActionDialog, { type RubricAction } from './RubricActionDialog'

const MAX_RATING = 5

type Load =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; rubric: Rubric }

function errorMessage(err: unknown): string {
  if (!(err instanceof ApiError)) return 'Could not load rubric.'
  return err.status === 404 || err.status === 400
    ? 'Rubric not found.'
    : err.message
}

function tableQuestions(rubric: Rubric): Question[] {
  return rubric.questions.map((q, position) => ({
    questionId: q.questionId,
    rubricId: rubric.rubricId,
    section: q.section as Question['section'],
    position,
    text: q.text,
    explanations: RATINGS.map(
      (rating) => q.explanations[String(rating) as ApiRating],
    ),
    updatedAt: '',
  }))
}

export default function RubricEditorPage() {
  const navigate = useNavigate()
  const { rubricId = '' } = useParams()
  const [result, setResult] = useState<{ rubricId: string; load: Load }>()
  const [action, setAction] = useState<RubricAction>()
  const load: Load =
    result?.rubricId === rubricId ? result.load : { status: 'loading' }

  useEffect(() => {
    let stale = false
    getRubric(rubricId)
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

  if (load.status === 'loading') {
    return <p className="rubric-editor-status">Loading rubric...</p>
  }
  if (load.status === 'error') {
    return (
      <p className="rubric-editor-status" role="alert">
        {load.message}
      </p>
    )
  }

  const { rubric } = load
  const editable = rubric.state === 'Unpublished'

  return (
    <div className="page">
      <div className="control-bar">
        <button type="button" onClick={() => navigate('/designer/rubric')}>
          Back to Rubrics
        </button>
        <button type="button">Duplicate Current Rubric</button>
        <button
          type="button"
          disabled={rubric.state !== 'Unpublished'}
          title={
            rubric.state === 'Unpublished'
              ? undefined
              : 'Rubric is already published'
          }
          onClick={() => setAction('publish')}
        >
          Publish Current Rubric
        </button>

        <div
          className="title-input spacer"
          contentEditable={editable}
          suppressContentEditableWarning
        >
          {rubric.name}
        </div>

        {/* auth on important actions? if im reading the payloads right -268 */}
        <button
          type="button"
          className="warning"
          disabled={rubric.state !== 'Published'}
          title={
            rubric.state === 'Published'
              ? undefined
              : 'Only published rubrics can be deprecated'
          }
          onClick={() => setAction('deprecate')}
        >
          Deprecate Current Rubric
        </button>
        <button type="button" onClick={() => navigate('/designer/rubric/view')}>
          View Rubric (Read-only)
        </button>
        {/* auth on important actions? if im reading the payloads right -268 */}
        <button
          type="button"
          className="danger"
          disabled={rubric.state !== 'Unpublished'}
          title={
            rubric.state === 'Unpublished'
              ? undefined
              : 'Published rubrics cannot be deleted'
          }
          onClick={() => setAction('delete')}
        >
          Delete Current Rubric
        </button>
      </div>

      <div className="readonly-note">
        State: {rubric.state}
        {rubric.publishDate && (
          <> &middot; Publish date: {rubric.publishDate}</>
        )}
      </div>
      {rubric.replacementRubricId && (
        <div className="readonly-note" role="status">
          This rubric is deprecated. Use{' '}
          <Link to={`/designer/rubric/${rubric.replacementRubricId}`}>
            {rubric.replacementRubricId}
          </Link>{' '}
          instead.
        </div>
      )}

      <RubricTable
        mode={editable ? 'edit' : 'view'}
        questions={tableQuestions(rubric)}
        viewUrl={rubric.rubricId}
      />
      <ScoreSummary
        label="Maximum Possible Score"
        value={MAX_RATING * rubric.questions.length}
        legend={
          <>
            High &gt;={' '}
            <span
              className="editable"
              contentEditable={editable}
              suppressContentEditableWarning
            >
              {rubric.highThreshold ?? 'Not set'}
            </span>{' '}
            &nbsp; Low &lt;{' '}
            <span
              className="editable"
              contentEditable={editable}
              suppressContentEditableWarning
            >
              {rubric.lowThreshold ?? 'Not set'}
            </span>{' '}
            &nbsp; (in between = moderate)
          </>
        }
      />

      {action && (
        <RubricActionDialog
          rubric={rubric}
          action={action}
          onCancel={() => setAction(undefined)}
          onDone={(changes) => {
            if (action === 'delete') {
              navigate('/designer/rubric')
              return
            }
            setAction(undefined)
            setResult({
              rubricId,
              load: { status: 'loaded', rubric: { ...rubric, ...changes } },
            })
          }}
        />
      )}
    </div>
  )
}
