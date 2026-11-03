import { useNavigate } from 'react-router'
import RubricTable from '../../components/RubricTable'
import ScoreSummary from '../../components/ScoreSummary'
import { SAMPLE_VIEW_URL, sampleQuestions } from '../../data/sampleData'

export default function RubricViewPage() {
  const navigate = useNavigate()

  return (
    <div className="page">
      <div className="control-bar">
        <button type="button" onClick={() => navigate('/designer/rubric')}>
          Back to Rubrics
        </button>
        <div className="spacer title-input">Sample rubric</div>
      </div>

      <div className="readonly-note">
        Read-only view. State: Published &middot; Publish date: 2026-09-30
      </div>
      <RubricTable
        mode="view"
        questions={sampleQuestions}
        viewUrl={SAMPLE_VIEW_URL}
      />
      <ScoreSummary
        label="Maximum Possible Score"
        value="50"
        legend="High >= 55   Low < 40   (in between = moderate)"
      />
    </div>
  )
}
