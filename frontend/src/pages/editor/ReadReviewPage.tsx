import { useNavigate } from 'react-router'
import RubricTable from '../../components/RubricTable'
import ScoreSummary from '../../components/ScoreSummary'
import TitleBar from '../../components/TitleBar'
import {
  SAMPLE_VIEW_URL,
  completedAnswers,
  sampleQuestions,
} from '../../data/sampleData'

export default function ReadReviewPage() {
  const navigate = useNavigate()

  return (
    <div className="page">
      <TitleBar
        title="Read Review"
        right={
          <button type="button" onClick={() => navigate('/editor/dashboard')}>
            Back to Dashboard
          </button>
        }
      />
      <div className="infobar">
        <div>Paper: pp_7c90 - Sample paper title</div>
        <div>Assignment: as_e1d3</div>
        <div>Reviewer: rev1@uni.edu</div>
        <div>Status: Completed (2026-10-28)</div>
      </div>
      <div className="readonly-note">
        Read-only. The reviewer's chosen score is outlined and their comment
        shown under each question.
      </div>
      <RubricTable
        mode="review"
        questions={sampleQuestions}
        answers={completedAnswers}
        viewUrl={SAMPLE_VIEW_URL}
      />
      <ScoreSummary
        label="Total Score Given"
        value="35 / 50 - Moderate"
        legend="High >= 55   Low < 40   (in between = moderate)"
      />
    </div>
  )
}
