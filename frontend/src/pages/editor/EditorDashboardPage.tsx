import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import ConfirmModal from '../../components/ConfirmModal'
import FormModal from '../../components/FormModal'
import LogoutButton from '../../components/LogoutButton'
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
import { createIssue } from '../../services/issue'
import {
  clearStoredJournalId,
  getStoredJournalId,
  setStoredJournalId,
} from '../../services/session'
import PaperList from './PaperList'

const ISSUES_PER_PAGE = 10
const MAX_RATING = 5

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

// Outcome of the latest finished request.
interface Result {
  data?: Dashboard
  error?: string
}

export default function EditorDashboardPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // RequireEditor only renders this page when one of these is set.
  const journalId = (searchParams.get('journalId') ?? getStoredJournalId())!

  // Bump to refetch. Call reload() after any action that changes journal data.
  const [reloads, setReloads] = useState(0)
  const reload = () => setReloads((n) => n + 1)

  const [result, setResult] = useState<Result>()
  const [issuePage, setIssuePage] = useState(1)
  const [selectedRubricId, setSelectedRubricId] = useState<string>()
  const [selectedIssueId, setSelectedIssueId] = useState<string>()
  const [selectedPaperId, setSelectedPaperId] = useState<string>()
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>()
  const [popup, setPopup] = useState<Popup>(null)
  const close = () => setPopup(null)

  const data = result?.data
  const error = result?.error

  // If issues disappear and the requested page no longer exists, show the last one.
  const totalPages = data
    ? Math.max(1, Math.ceil(data.page.totalCount / data.page.limit))
    : Infinity
  const currentPage = Math.min(issuePage, totalPages)
  const offset = (currentPage - 1) * ISSUES_PER_PAGE

  useEffect(() => {
    setStoredJournalId(journalId)
  }, [journalId])

  useEffect(() => {
    getDashboard(journalId, ISSUES_PER_PAGE, offset)
      .then((data) => setResult({ data }))
      .catch((err: unknown) =>
        setResult({
          error:
            err instanceof ApiError ? err.message : 'Could not load dashboard.',
        }),
      )
  }, [journalId, offset, reloads])

  if (!data && !error) {
    return <p className="rubric-editor-status">Loading dashboard...</p>
  }
  if (!data) {
    return (
      <div className="page">
        <p className="rubric-editor-status error-text" role="alert">
          {error}
        </p>
        <div className="actions">
          <button type="button" onClick={reload}>
            Try Again
          </button>
          <button
            type="button"
            onClick={() => {
              clearStoredJournalId()
              navigate('/editor/login')
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  const { journal, rubrics, issues, page } = data

  // Selections fall back to the first row, so a refresh or page change never leaves
  // a selection pointing at something that is no longer there.
  const selectedRubric: DashboardRubric | undefined =
    rubrics.find((r) => r.rubricId === selectedRubricId) ?? rubrics[0]
  const selectedIssue: DashboardIssue | undefined =
    issues.find((i) => i.issueId === selectedIssueId) ?? issues[0]
  const papers = selectedIssue?.papers ?? []
  const selectedPaper =
    papers.find((p) => p.paperId === selectedPaperId) ?? papers[0]
  const selectedAssignment =
    selectedPaper?.assignments.find(
      (a) => a.assignmentId === selectedAssignmentId,
    ) ?? selectedPaper?.assignments[0]

  const questions = selectedRubric ? toRubricQuestions(selectedRubric) : []
  const shownPage = Math.floor(page.offset / page.limit) + 1

  const issueLabel = selectedIssue
    ? `${selectedIssue.issueId} (Vol ${selectedIssue.volume}, No ${selectedIssue.number})`
    : '(no issue selected)'
  const paperLabel = selectedPaper
    ? `${selectedPaper.paperId} (${selectedPaper.title})`
    : '(no paper selected)'

  return (
    <div className="page">
      {/* auth on important actions? if im reading the payloads right -268 */}
      <TitleBar
        left={
          <>
            <button type="button" onClick={() => navigate('/')}>
              Back to Home
            </button>
            <span>{journal.name}</span>
            <span>{journal.journalId}</span>
          </>
        }
        title="Journal Editor Dashboard"
        right={
          <>
            <button type="button" onClick={reload}>
              Refresh
            </button>
            <button type="button" className="danger">
              Unregister Current Journal
            </button>
            <LogoutButton role="editor" />
          </>
        }
      />

      <div className="dashspace">
        <div className="dashpanel">
          <div className="panel-title">List of Rubrics in Journal</div>
          <div className="listbox">
            <ListTable<DashboardRubric>
              className="rubric-list"
              rows={rubrics}
              selectedRows={
                selectedRubric ? [rubrics.indexOf(selectedRubric)] : []
              }
              onRowClick={(r) => setSelectedRubricId(r.rubricId)}
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
          <div className="hint">
            {rubrics.length} {rubrics.length === 1 ? 'rubric' : 'rubrics'}
          </div>
        </div>

        <div className="dashpanel">
          <div className="panel-title">List of Issues in Journal</div>
          <div className="listbox">
            <ListTable<DashboardIssue>
              className="issue-list"
              rows={issues}
              selectedRows={
                selectedIssue ? [issues.indexOf(selectedIssue)] : []
              }
              onRowClick={(i) => {
                setSelectedIssueId(i.issueId)
                setSelectedPaperId(undefined)
                setSelectedAssignmentId(undefined)
              }}
              columns={[
                { header: 'Issue ID', render: (i) => i.issueId },
                { header: 'Volume', render: (i) => i.volume },
                { header: 'Number', render: (i) => i.number },
              ]}
            />
          </div>
          <div className="hint">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setIssuePage(currentPage - 1)}
            >
              &lt;
            </button>{' '}
            Page {shownPage} of {totalPages} [{issues.length} of{' '}
            {page.totalCount}]{' '}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setIssuePage(currentPage + 1)}
            >
              &gt;
            </button>
          </div>
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
            questions={questions}
            viewUrl={selectedRubric?.rubricId ?? ''}
          />
          <ScoreSummary
            label="Maximum Possible Score"
            value={MAX_RATING * questions.length}
            legend={
              <>
                High &gt;= {selectedRubric?.highThreshold ?? 'Not set'} &nbsp;
                Low &lt; {selectedRubric?.lowThreshold ?? 'Not set'} &nbsp; (in
                between = moderate)
              </>
            }
          />
        </div>

        <div className="dashpanel">
          <div className="panel-title">List of Papers in Issue</div>
          <div className="listbox">
            <PaperList
              papers={papers}
              selectedPaperId={selectedPaper?.paperId}
              selectedAssignmentId={selectedAssignment?.assignmentId}
              onSelectPaper={(paperId) => {
                setSelectedPaperId(paperId)
                setSelectedAssignmentId(undefined)
              }}
              onSelectAssignment={(paperId, assignmentId) => {
                setSelectedPaperId(paperId)
                setSelectedAssignmentId(assignmentId)
              }}
            />
          </div>
          <div className="hint">
            {papers.length} {papers.length === 1 ? 'paper' : 'papers'} in this
            issue
          </div>
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

      {/* Popups. Only Create Issue calls the API so far; as others get endpoints,
          call reload() on success so the tables above pick up the change. */}
      <FormModal
        open={popup === 'createIssue'}
        title="Create Issue"
        fields={[
          { name: 'volume', label: 'Volume', type: 'number' },
          { name: 'number', label: 'Number', type: 'number' },
        ]}
        onClose={close}
        onSubmit={async ({ volume, number }) => {
          await createIssue(journalId, Number(volume), Number(number))
          close()
          reload()
        }}
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
        Withdraw paper {paperLabel}?
      </ConfirmModal>
      <ConfirmModal
        open={popup === 'closePaper'}
        title="Close Paper"
        confirmLabel="Close Paper"
        onClose={close}
      >
        Close paper {paperLabel}? Reviewers can no longer update answers.
      </ConfirmModal>
      <FormModal
        open={popup === 'assign'}
        title={`Assign Reviewer to Paper ${selectedPaper?.paperId ?? ''}`}
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
        {selectedAssignment
          ? `Unassign ${selectedAssignment.reviewerEmail} (${selectedAssignment.assignmentId}) from paper ${selectedPaper?.paperId}?`
          : 'No reviewer selected.'}
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
