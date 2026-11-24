import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import ConfirmModal from '../../components/ConfirmModal'
import RubricTable from '../../components/RubricTable'
import ScoreSummary from '../../components/ScoreSummary'
import TitleBar from '../../components/TitleBar'
import type { Rating } from '../../types'
import { ApiError } from '../../services/api.ts'
import { getStoredReviewCredentials } from '../../services/reviewSession.ts'
import {
  accessReview,
  saveAnswer,
  toTableAnswers,
  toTableQuestions,
  type ReviewAccess,
  type ReviewAnswer,
  type ReviewCredentials,
} from '../../services/reviews.ts'

type Load =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; review: ReviewAccess }

export default function ReviewerReviewPage() {
  const navigate = useNavigate()
  const [creds] = useState<ReviewCredentials | null>(getStoredReviewCredentials)
  const [load, setLoad] = useState<Load>({ phase: 'loading' })
  const [answers, setAnswers] = useState<ReviewAnswer[]>([])
  const [savingId, setSavingId] = useState<string | null>(null)
  const [status, setStatus] = useState<{ text: string; error?: boolean }>()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!creds) {
      navigate('/review')
      return
    }
    let cancelled = false
    accessReview(creds)
      .then((review) => {
        if (cancelled) return
        setAnswers(review.answers)
        setLoad({ phase: 'ready', review })
      })
      .catch((e) => {
        if (!cancelled) {
          setLoad({
            phase: 'error',
            message: e instanceof ApiError ? e.message : 'Could not load the review.',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [creds, navigate])

  const review = load.phase === 'ready' ? load.review : null
  const tableQuestions = useMemo(() => (review ? toTableQuestions(review.rubric.questions) : []), [review])
  const tableAnswers = useMemo(() => toTableAnswers(answers), [answers])
  // Same numbering the table shows: by section, then position.
  const questionNumber = useMemo(
    () =>
      new Map(
        [...tableQuestions]
          .sort((a, b) => a.section - b.section || a.position - b.position)
          .map((q, i) => [q.questionId, i + 1]),
      ),
    [tableQuestions],
  )

  const backToAccess = (
    <button type="button" onClick={() => navigate('/review')}>
      Back to Access
    </button>
  )

  if (!review) {
    return (
      <div className="page">
        <TitleBar left={backToAccess} title="Reviewer Review" />
        <div className="status-line" role={load.phase === 'error' ? 'alert' : undefined}>
          {load.phase === 'error' ? load.message : 'Loading review...'}
        </div>
      </div>
    )
  }

  const completedReview = review.status === 'Completed' ? review : null
  const completed = completedReview !== null
  const { lowThreshold, highThreshold } = review.rubric
  const maxScore = review.rubric.questions.length * 5
  // Only saved answers count; a score picked but not yet saved with Update Answer is not included.
  const savedTotal = answers.reduce((sum, a) => sum + a.rating, 0)
  const scoreValue = completedReview
    ? `${completedReview.totalScore} / ${maxScore} - ${completedReview.quality}`
    : `${savedTotal} / ${maxScore}`

  async function handleSaveAnswer(questionId: string, rating: Rating | null, text: string) {
    if (!creds || savingId) return
    const n = questionNumber.get(questionId)
    if (rating === null || text.trim().length === 0) {
      setStatus({ text: `Question ${n}: choose a score and write a comment before updating.`, error: true })
      return
    }
    setSavingId(questionId)
    try {
      await saveAnswer(creds, { questionId, rating, text })
      setAnswers((prev) => [...prev.filter((a) => a.questionId !== questionId), { questionId, rating, text }])
      setStatus({ text: `Last update: question ${n} saved.` })
    } catch (e) {
      setStatus({
        text: `Question ${n} was not saved: ${e instanceof ApiError ? e.message : 'please try again.'}`,
        error: true,
      })
    } finally {
      setSavingId(null)
    }
  }

  async function copyReport() {
    if (!completedReview) return
    try {
      await navigator.clipboard.writeText(completedReview.report)
      setCopied(true)
    } catch {
      setCopied(false) // clipboard blocked; the text is selectable in the box
    }
  }

  return (
    <div className="page">
      <TitleBar
        left={
          <>
            {backToAccess}
            <span>Paper: {review.paper.title}</span>
            <span>
              Journal: {review.journal.name}, Vol. {review.journal.volume} No. {review.journal.number}
            </span>
          </>
        }
        title="Reviewer Review"
        right={<span>Deadline: {review.deadline}</span>}
      />
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="status-line" role={status?.error ? 'alert' : undefined}>
          {completed
            ? 'This review is completed and can no longer be changed.'
            : (status?.text ??
              'Every question needs a score and a comment before you can complete. Answers are saved per question with Update Answer.')}
        </div>
        <RubricTable
          mode="answer"
          questions={tableQuestions}
          answers={tableAnswers}
          viewUrl={review.paper.reference}
          onSaveAnswer={handleSaveAnswer}
          savingQuestionId={savingId}
          readOnly={completed}
        />
        <ScoreSummary
          label={completed ? 'Your Final Score' : 'Your Saved Total'}
          value={scoreValue}
          legend={`High >= ${highThreshold ?? '-'}   Low < ${lowThreshold ?? '-'}   (in between = moderate)`}
        />
        {completedReview && (
          <div className="questionscontainer">
            <div>Review report (copy this into your review system):</div>
            <pre className="review-report">{completedReview.report}</pre>
            <button type="button" onClick={copyReport}>
              {copied ? 'Copied' : 'Copy Report'}
            </button>
          </div>
        )}
        <div className="control-bar">
          <div className="status-line spacer">Status: {review.status}</div>
          {!completed && (
            <button type="button" onClick={() => setConfirmOpen(true)}>
              Complete Review
            </button>
          )}
        </div>
      </form>

      {/* TODO(complete-review): confirming should call completeReview(creds) from services/reviews.ts
          (POST /review/complete), handle 409 INCOMPLETE_ANSWERS (details = unanswered question ids),
          then reload so the report and final score appear. Not wired yet. */}
      <ConfirmModal
        open={confirmOpen}
        title="Complete Review"
        confirmLabel="Confirm Complete"
        onClose={() => setConfirmOpen(false)}
      >
        All questions need a score and a comment.
        <br />
        Once completed you cannot change your answers.
        <br />
        Submit review for "{review.paper.title}"?
      </ConfirmModal>
    </div>
  )
}
