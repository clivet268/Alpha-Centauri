import { Fragment, useState } from 'react'
import { RATINGS, type Answer, type Question, type Rating } from '../types'

export type RubricTableMode = 'view' | 'edit' | 'answer' | 'review'

const SECTION_NAMES = [
  'Introduction',
  'Materials & Sourcing',
  'Methodology & Reproducibility',
  'Replication, Risk of Bias & Statistics',
  'Reporting & Transparency',
]

interface RubricTableProps {
  mode: RubricTableMode
  questions: Question[]
  answers?: Answer[]
  viewUrl: string
  // answer mode only:
  /** Called when the reviewer presses "Update Answer" on one row. rating is null if none is picked yet. */
  onSaveAnswer?: (questionId: string, rating: Rating | null, text: string) => void
  /** Question currently being saved. While set, every Update Answer button is disabled (one update at a time). */
  savingQuestionId?: string | null
  /** Completed review: show the answers but allow no changes. */
  readOnly?: boolean
}

export default function RubricTable({
  mode,
  questions,
  answers = [],
  viewUrl,
  onSaveAnswer,
  savingQuestionId = null,
  readOnly = false,
}: RubricTableProps) {
  const hasActionColumn = mode === 'edit' || mode === 'answer'
  let questionNumber = 0

  return (
    <div className="questionscontainer">
      <div className="rubric-url">{viewUrl}</div>
      <table
        className={`grid-table rubric-table${hasActionColumn ? ' with-actions' : ''}`}
      >
        <thead>
          <tr>
            <th>Criterion</th>
            <th>Max</th>
            <th>4</th>
            <th>3</th>
            <th>2</th>
            <th>Min</th>
            <th>Score Guidance</th>
            {hasActionColumn && <th />}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="full-row">Description of the scoring system</td>
          </tr>
          {SECTION_NAMES.map((name, i) => (
            <Fragment key={name}>
              <tr>
                <td className="full-row section-row">{name}</td>
              </tr>
              {questions
                .filter((q) => q.section === i + 1)
                .sort((a, b) => a.position - b.position)
                .map((q) => {
                  questionNumber++
                  return (
                    <QuestionRows
                      key={q.questionId}
                      mode={mode}
                      question={q}
                      answer={answers.find(
                        (a) => a.questionId === q.questionId,
                      )}
                      number={questionNumber}
                      onSaveAnswer={onSaveAnswer}
                      savingQuestionId={savingQuestionId}
                      readOnly={readOnly}
                    />
                  )
                })}
              {mode === 'edit' && (
                <tr>
                  <td className="full-row">
                    <button type="button" className="rowbutton">
                      Add Question
                    </button>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function QuestionRows({
  mode,
  question: q,
  answer,
  number,
  onSaveAnswer,
  savingQuestionId,
  readOnly,
}: {
  mode: RubricTableMode
  question: Question
  answer?: Answer
  number: number
  onSaveAnswer?: RubricTableProps['onSaveAnswer']
  savingQuestionId: string | null
  readOnly: boolean
}) {
  const editable = mode === 'edit'
  // Draft values for answer mode; only sent to the server when "Update Answer" is pressed.
  const [rating, setRating] = useState<Rating | null>(answer?.rating ?? null)
  const [text, setText] = useState(answer?.text ?? '')
  const guidance = q.explanations
    .map((text, i) => (text ? `${RATINGS[i]} = ${text}` : ''))
    .filter(Boolean)
    .join('; ')

  return (
    <>
      <tr>
        <td
          className="text-cell"
          contentEditable={editable}
          suppressContentEditableWarning
        >
          {q.text}
        </td>

        {RATINGS.map((r) => {
          const picked = mode === 'review' && answer?.rating === r
          return (
            <td
              key={r}
              className={`rating-${r}${picked ? ' picked' : ''}`}
            >
              {mode === 'answer' ? (
                <label className="answercell">
                  {r}
                  <input
                    type="radio"
                    name={`q${number}`}
                    value={r}
                    checked={rating === r}
                    disabled={readOnly}
                    onChange={() => setRating(r)}
                  />
                </label>
              ) : (
                r
              )}
            </td>
          )
        })}

        <td
          className="text-cell"
          contentEditable={editable}
          suppressContentEditableWarning
        >
          {guidance}
        </td>

        {mode === 'edit' && (
          <td>
            <button
              type="button"
              className="rowbutton danger"
              title="Delete this question"
            >
              Delete
            </button>
          </td>
        )}
        {mode === 'answer' && (
          <td>
            <button
              type="button"
              className="rowbutton"
              title="Save my answer for this question"
              disabled={readOnly || savingQuestionId !== null}
              onClick={() => onSaveAnswer?.(q.questionId, rating, text)}
            >
              {savingQuestionId === q.questionId ? 'Saving...' : 'Update Answer'}
            </button>
          </td>
        )}
      </tr>

      {mode === 'answer' && (
        <tr>
          <td className="commentcell">
            <label htmlFor={`c${number}`}>
              Comment on this question (required):
            </label>
            <textarea
              id={`c${number}`}
              name={`c${number}`}
              required
              placeholder="Explain your score"
              value={text}
              readOnly={readOnly}
              onChange={(e) => setText(e.target.value)}
            />
          </td>
        </tr>
      )}
      {mode === 'review' && (
        <tr>
          <td className="commentcell">
            Reviewer comment:
            <div className="commenttext">{answer?.text}</div>
          </td>
        </tr>
      )}
    </>
  )
}
