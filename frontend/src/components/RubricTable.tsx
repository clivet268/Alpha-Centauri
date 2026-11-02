import { Fragment } from 'react'
import { RATINGS, type Answer, type Question } from '../types'

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
}

export default function RubricTable({
  mode,
  questions,
  answers = [],
  viewUrl,
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
}: {
  mode: RubricTableMode
  question: Question
  answer?: Answer
  number: number
}) {
  const editable = mode === 'edit'
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

        {RATINGS.map((rating) => {
          const picked = mode === 'review' && answer?.rating === rating
          return (
            <td
              key={rating}
              className={`rating-${rating}${picked ? ' picked' : ''}`}
            >
              {mode === 'answer' ? (
                <label className="answercell">
                  {rating}
                  <input
                    type="radio"
                    name={`q${number}`}
                    value={rating}
                    defaultChecked={answer?.rating === rating}
                  />
                </label>
              ) : (
                rating
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
            >
              Update Answer
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
              defaultValue={answer?.text}
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
