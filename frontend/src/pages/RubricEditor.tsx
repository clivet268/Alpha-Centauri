import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ApiError } from '../services/api.ts'
import { getRubric, type Rating, type Rubric } from '../services/rubrics.ts'
import RubricActionDialog, { type RubricAction } from './RubricActionDialog.tsx'

const SECTIONS = [
  { section: 1, name: 'Introduction' },
  { section: 2, name: 'Materials & Sourcing' },
  { section: 3, name: 'Methodology & Reproducibility' },
  { section: 4, name: 'Replication, Risk of Bias & Statistics' },
  { section: 5, name: 'Reporting & Transparency' },
]
const RATINGS: Rating[] = ['5', '4', '3', '2', '1']
const MAX_RATING = 5
const COLUMN_COUNT = 8
const NOT_AVAILABLE = 'Not available yet'

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

function RubricEditor() {
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
    return <p className="rubric-editor-status">Loading rubric…</p>
  }
  if (load.status === 'error') {
    return (
      <p className="rubric-editor-status" role="alert">
        {load.message}
      </p>
    )
  }

  const { rubric } = load
  const maxScore = MAX_RATING * rubric.questions.length

  return (
    <div className="rubric-editor">
      <div className="control-bar">
        <h1>{rubric.name}</h1>
        <p>
          {rubric.state}
          {rubric.publishDate && ` · Publish date ${rubric.publishDate}`}
        </p>
        <div className="actions">
          <button type="button" disabled title={NOT_AVAILABLE}>
            Duplicate
          </button>
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
            Publish
          </button>
          <button
            type="button"
            disabled={rubric.state !== 'Published'}
            title={
              rubric.state === 'Published'
                ? undefined
                : 'Only published rubrics can be deprecated'
            }
            onClick={() => setAction('deprecate')}
          >
            Deprecate
          </button>
          <button type="button" disabled title={NOT_AVAILABLE}>
            View
          </button>
          <button
            type="button"
            className="danger"
            disabled
            title={NOT_AVAILABLE}
          >
            Delete
          </button>
        </div>
      </div>

      {rubric.replacementRubricId && (
        <p className="notice" role="status">
          This rubric is deprecated. Use{' '}
          <Link to={`/rubric/${rubric.replacementRubricId}`}>
            {rubric.replacementRubricId}
          </Link>{' '}
          instead.
        </p>
      )}

      <div className="questions">
        <table>
          <colgroup>
            <col className="criterion" />
            {RATINGS.map((rating) => (
              <col key={rating} className="rating" />
            ))}
            <col />
            <col className="row-action" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Criterion</th>
              {RATINGS.map((rating) => (
                <th key={rating} scope="col">
                  {rating}
                </th>
              ))}
              <th scope="col">Score Guidance</th>
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          {SECTIONS.map(({ section, name }) => {
            const questions = rubric.questions.filter(
              (q) => q.section === section,
            )
            return (
              <tbody key={section}>
                <tr>
                  <th
                    className="section"
                    colSpan={COLUMN_COUNT}
                    scope="rowgroup"
                  >
                    {name}
                  </th>
                </tr>
                {questions.map((q) => (
                  <tr key={q.questionId}>
                    <td className="text">{q.text}</td>
                    {RATINGS.map((rating) => (
                      <td key={rating} className={`rating-${rating}`}>
                        {rating}
                      </td>
                    ))}
                    <td className="text">
                      {RATINGS.map((rating) => (
                        <div key={rating}>
                          {rating} = {q.explanations[rating]}
                        </div>
                      ))}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="danger"
                        disabled
                        title={NOT_AVAILABLE}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {questions.length === 0 && (
                  <tr>
                    <td className="empty" colSpan={COLUMN_COUNT}>
                      No questions yet.
                    </td>
                  </tr>
                )}
                <tr>
                  <td colSpan={COLUMN_COUNT}>
                    <button
                      type="button"
                      className="add-question"
                      disabled
                      title={NOT_AVAILABLE}
                    >
                      Add Question
                    </button>
                  </td>
                </tr>
              </tbody>
            )
          })}
        </table>

        <dl className="score">
          <div>
            <dt>Maximum Possible Score</dt>
            <dd>{maxScore}</dd>
          </div>
          <div>
            <dt>High &gt;=</dt>
            <dd>{rubric.highThreshold ?? 'Not set'}</dd>
          </div>
          <div>
            <dt>Low &lt;</dt>
            <dd>{rubric.lowThreshold ?? 'Not set'}</dd>
          </div>
          <div>(in between = moderate)</div>
        </dl>
      </div>

      {action && (
        <RubricActionDialog
          rubric={rubric}
          action={action}
          onCancel={() => setAction(undefined)}
          onDone={(changes) => {
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

export default RubricEditor
