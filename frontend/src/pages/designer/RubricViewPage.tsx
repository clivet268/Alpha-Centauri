import { useNavigate } from 'react-router'
import RubricTable from '../../components/RubricTable'
import ScoreSummary from '../../components/ScoreSummary'
import { SAMPLE_VIEW_URL, sampleQuestions } from '../../data/sampleData'

export default function RubricViewPage() {
  const navigate = useNavigate()

  return (
    <div className="page">
      <div className="control-bar">
        <label htmlFor="rubricsSelect">Select Rubric:</label>
        <select
          id="rubricsSelect"
          name="rubricsSelect"
          defaultValue="anotherRubric"
        >
          <option value="">Select Rubric</option>
          <option value="anotherRubric">
            Sample rubric (rb_8c1e) - Published
          </option>
        </select>
        <button type="button" onClick={() => navigate('/designer/rubrics')}>
          Back to Editor
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
