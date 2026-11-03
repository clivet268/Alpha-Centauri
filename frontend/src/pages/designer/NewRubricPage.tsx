import { useNavigate } from 'react-router'
import RubricTable from '../../components/RubricTable'
import ScoreSummary from '../../components/ScoreSummary'
import { SAMPLE_VIEW_URL, sampleQuestions } from '../../data/sampleData'

export default function NewRubricPage() {
  const navigate = useNavigate()

  return (
    <div className="page">
      <div className="control-bar">
        <button type="button" onClick={() => navigate('/designer/rubric')}>
          Back to Rubrics
        </button>
        <div
          className="title-input spacer"
          contentEditable
          suppressContentEditableWarning
        >
          Click To Edit Rubric Title
        </div>
      </div>

      <RubricTable
        mode="edit"
        questions={sampleQuestions}
        viewUrl={SAMPLE_VIEW_URL}
      />
      <ScoreSummary
        label="Maximum Possible Score"
        value="70"
        legend={
          <>
            High &gt;={' '}
            <span
              className="editable"
              contentEditable
              suppressContentEditableWarning
            >
              55
            </span>{' '}
            &nbsp; Low &lt;{' '}
            <span
              className="editable"
              contentEditable
              suppressContentEditableWarning
            >
              40
            </span>{' '}
            &nbsp; (in between = moderate)
          </>
        }
      />
    </div>
  )
}
