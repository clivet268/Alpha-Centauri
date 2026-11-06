import { useState } from 'react'
import { useNavigate } from 'react-router'
import ConfirmModal from '../../components/ConfirmModal'
import RubricTable from '../../components/RubricTable'
import ScoreSummary from '../../components/ScoreSummary'
import TitleBar from '../../components/TitleBar'
import {
  SAMPLE_VIEW_URL,
  inProgressAnswers,
  sampleQuestions,
} from '../../data/sampleData'

export default function ReviewerReviewPage() {
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <div className="page">
      <TitleBar
        left={
          <>
            <button type="button" onClick={() => navigate('/review')}>
              Back to Access
            </button>
            <span>Paper: Sample paper title</span>
            <span>Assignment: as_e1d4</span>
          </>
        }
        title="Reviewer Review"
        right={<span>Deadline: 2026-11-01</span>}
      />
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="status-line">
          Every question needs a score and a comment before you can complete.
          Answers are saved per question. Last update: question 7 saved.
        </div>
        <RubricTable
          mode="answer"
          questions={sampleQuestions}
          answers={inProgressAnswers}
          viewUrl={SAMPLE_VIEW_URL}
        />
        <ScoreSummary
          label="Your Total Score"
          value="35 / 50"
          legend="High >= 55   Low < 40   (in between = moderate)"
        />
        <div className="control-bar">
          <div className="status-line spacer">Status: InProgress</div>
          <button type="button" onClick={() => setConfirmOpen(true)}>
            Complete Review
          </button>
        </div>
      </form>

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
        Submit review for "Sample paper title"?
      </ConfirmModal>
    </div>
  )
}
