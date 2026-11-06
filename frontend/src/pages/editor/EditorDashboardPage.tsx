import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import ConfirmModal from '../../components/ConfirmModal'
import FormModal from '../../components/FormModal'
import ListTable from '../../components/ListTable'
import Modal from '../../components/Modal'
import RubricTable from '../../components/RubricTable'
import ScoreSummary from '../../components/ScoreSummary'
import TitleBar from '../../components/TitleBar'
import { ApiError } from '../../services/api'
import {
  getDashboard,
  toRubricQuestions,
  type Dashboard,
  type DashboardIssue,
  type DashboardRubric,
} from '../../services/journals'
import {
  SAMPLE_VIEW_URL,
  sampleAssignments,
  sampleIssues,
  samplePapers,
  sampleQuestions,
  sampleRubrics,
} from '../../data/sampleData'
import type { Issue, Rubric } from '../../types'
import PaperList from './PaperList'

type Popup =
  | 'createIssue'
  | 'deleteIssue'
  | 'addPaper'
  | 'withdrawPaper'
  | 'closePaper'
  | 'assign'
  | 'unassign'
  | 'url'
  | null

export default function EditorDashboardPage() {
  const navigate = useNavigate()
  const [popup, setPopup] = useState<Popup>(null)
  const close = () => setPopup(null)

  return (
    <div className="page">
      {/* auth on important actions? if im reading the payloads right -268 */}
      {/* TODO post journalId -268 */}
      <TitleBar
        left={
          <>
            <span>Journal Name</span>
            <span>Journal ID</span>
          </>
        }
        title="Journal Editor Dashboard"
        right={
          <button type="button" className="danger">
            Unregister Current Journal
          </button>
        }
      />

      <div className="dashspace">
        <div className="dashpanel">
          <div className="panel-title">List of Rubrics in Journal</div>
          <div className="listbox">
            <ListTable<Rubric>
              className="rubric-list"
              rows={sampleRubrics}
              columns={[
                { header: 'Rubric ID', render: (r) => r.rubricId },
                { header: 'Name', render: (r) => r.name },
                { header: 'State', render: (r) => r.state },
                {
                  header: 'ReplacementId',
                  render: (r) => r.replacementRubricId,
                },
                { header: 'Publishdate', render: (r) => r.publishDate },
              ]}
            />
          </div>
          <div className="hint">Page 1 of x &lt; [10 of y] &gt;</div>
        </div>

        <div className="dashpanel">
          <div className="panel-title">List of Issues in Journal</div>
          <div className="listbox">
            <ListTable<Issue>
              className="issue-list"
              rows={sampleIssues}
              selectedRows={[0]}
              columns={[
                { header: 'Rubric ID', render: (i) => i.issueId },
                { header: 'Name', render: (i) => i.volume },
                { header: 'State', render: (i) => i.number },
              ]}
            />
          </div>
          <div className="hint">Page 1 of x &lt; [10 of y] &gt;</div>
          <div className="actionbar">
            <button type="button" onClick={() => setPopup('createIssue')}>
              Create Issue
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => setPopup('deleteIssue')}
            >
              Delete Selected Issue
            </button>
          </div>
        </div>

        <div className="dashpanel scrollbox">
          <RubricTable
            mode="view"
            questions={sampleQuestions}
            viewUrl={SAMPLE_VIEW_URL}
          />
          <ScoreSummary
            label="Maximum Possible Score"
            value="70"
            legend=">= 55 = High Score  40 to 55 moderate < 40 = low"
          />
        </div>

        <div className="dashpanel">
          <div className="panel-title">List of Papers in Issue</div>
          <div className="listbox">
            <PaperList papers={samplePapers} assignments={sampleAssignments} />
          </div>
          <div className="hint">Page 1 of x &lt; [10 of y] &gt;</div>
          <div className="hint">
            Click a paper or assignment row to select it
          </div>
          <div className="actionbar">
            <span>Paper:</span>
            <button type="button" onClick={() => setPopup('addPaper')}>
              Add Paper
            </button>
            <button type="button" onClick={() => setPopup('closePaper')}>
              Close Selected Paper
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => setPopup('withdrawPaper')}
            >
              Withdraw Selected Paper
            </button>
          </div>
          <div className="actionbar">
            <span>Reviewer:</span>
            <button type="button" onClick={() => setPopup('assign')}>
              Assign Reviewer
            </button>
            <button type="button" onClick={() => setPopup('url')}>
              Generate RubricURL
            </button>
            <button type="button" onClick={() => navigate('/editor/review')}>
              Read Review
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => setPopup('unassign')}
            >
              Unassign Selected Reviewer
            </button>
          </div>
        </div>
      </div>

      {/* Popups */}
      <FormModal
        open={popup === 'createIssue'}
        title="Create Issue"
        fields={[
          { name: 'volume', label: 'Volume', type: 'number' },
          { name: 'number', label: 'Number', type: 'number' },
        ]}
        onClose={close}
      />
      <ConfirmModal
        open={popup === 'deleteIssue'}
        title="Delete Issue"
        confirmLabel="Delete"
        danger
        onClose={close}
      >
        Delete issue {issueLabel}?
      </ConfirmModal>
      <FormModal
        open={popup === 'addPaper'}
        title={`Add Paper to Issue ${selectedIssue?.issueId ?? ''}`}
        fields={[
          { name: 'paperTitle', label: 'Title' },
          { name: 'paperDoi', label: 'DOI / URL' },
        ]}
        onClose={close}
      />
      <ConfirmModal
        open={popup === 'withdrawPaper'}
        title="Withdraw Paper"
        confirmLabel="Withdraw"
        danger
        onClose={close}
      >
        Withdraw paper pp_7c90 (Sample paper title)?
      </ConfirmModal>
      <ConfirmModal
        open={popup === 'closePaper'}
        title="Close Paper"
        confirmLabel="Close Paper"
        onClose={close}
      >
        Close paper pp_7c90? Reviewers can no longer update answers.
      </ConfirmModal>
      <FormModal
        open={popup === 'assign'}
        title="Assign Reviewer to Paper pp_7c90"
        submitLabel="Assign"
        fields={[
          { name: 'reviewerEmail', label: 'Reviewer Email', type: 'email' },
          { name: 'deadline', label: 'Deadline', type: 'date' },
        ]}
        onClose={close}
      />
      <ConfirmModal
        open={popup === 'unassign'}
        title="Unassign Reviewer"
        confirmLabel="Unassign"
        danger
        onClose={close}
      >
        Unassign rev1@uni.edu (as_e1d3) from paper pp_7c90?
      </ConfirmModal>
      <Modal
        open={popup === 'url'}
        title="RubricURL for assignment as_e1d3 (rev1@uni.edu)"
        onClose={close}
      >
        <p>Send both to the reviewer. The PIN is shown once.</p>
        <div>RubricURL:</div>
        <div className="pinbox">https://raser.example/review/as_e1d3</div>
        <div>PIN:</div>
        <div className="pinbox">482915</div>
        <div className="actions">
          <button type="button" onClick={close}>
            Close
          </button>
          <button type="button">Copy</button>
        </div>
      </Modal>
    </div>
  )
}
