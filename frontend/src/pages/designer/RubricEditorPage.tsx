import { useState } from 'react'
import { useNavigate } from 'react-router'
import FormModal from '../../components/FormModal'
import RubricTable from '../../components/RubricTable'
import ScoreSummary from '../../components/ScoreSummary'
import { SAMPLE_VIEW_URL, sampleQuestions } from '../../data/sampleData'

export default function RubricEditorPage() {
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="page">
      <div className="control-bar">
        {/* I want the rubric select to be a popup dialogue what you can scroll through,
            we CAN feed the list here and make it have a next x rubrics BUT its way more
            friendly with its own window -268 */}
        <label htmlFor="rubricsSelect">Select Rubric:</label>
        <select id="rubricsSelect" name="rubricsSelect">
          <option value="">Select Rubric</option>
          <option value="anotherRubric">Another Rubric</option>
        </select>
        <button type="button" onClick={() => setCreateOpen(true)}>
          Create New Rubric
        </button>
        <button type="button">Duplicate Current Rubric</button>
        <button type="button">Publish Current Rubric</button>

        <div
          className="title-input spacer"
          contentEditable
          suppressContentEditableWarning
        >
          Click To Edit Rubric Title
        </div>

        {/* auth on important actions? if im reading the payloads right -268 */}
        <button type="button" className="warning">
          Deprecate Current Rubric
        </button>
        <button
          type="button"
          onClick={() => navigate('/designer/rubrics/view')}
        >
          View Rubric (Read-only)
        </button>
        {/* auth on important actions? if im reading the payloads right -268 */}
        {/* TODO post rubricId -268 */}
        <button type="button" className="danger">
          Delete Current Rubric
        </button>
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

      {/* TODO -268 */}
      <FormModal
        open={createOpen}
        title="Create New Rubric"
        fields={[{ name: 'name', label: 'Rubric Name' }]}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  )
}
