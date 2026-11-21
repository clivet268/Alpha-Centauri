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

type Load =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; data: Dashboard }

// `notice` is set when a background refresh failed but we still have the last good data.
interface Result {
  key: string
  journalId: string
  load: Load
  notice?: string
}

const requestKey = (journalId: string, offset: number, reloads: number) =>
  `${journalId}:${offset}:${reloads}`

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Could not load dashboard.'
}

export default function EditorDashboardPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // ?journalId=... wins (handy until Login exists); otherwise the journal
  // remembered from registration.
  const journalId = searchParams.get('journalId') ?? getStoredJournalId()

  const [issuePage, setIssuePage] = useState(1)
  const offset = (issuePage - 1) * ISSUES_PER_PAGE
  // Bump to refetch. Call reload() after any action that changes journal data.
  const [reloads, setReloads] = useState(0)
  const reload = () => setReloads((n) => n + 1)

  const [result, setResult] = useState<Result>()
  const [selectedRubricId, setSelectedRubricId] = useState<string>()
  const [selectedIssueId, setSelectedIssueId] = useState<string>()
  const [selectedPaperId, setSelectedPaperId] = useState<string>()
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>()
  const [popup, setPopup] = useState<Popup>(null)
  const close = () => setPopup(null)

  // Only data for the current journal is ever shown, but data from the previous
  // page/refresh stays on screen while the next request is in flight.
  const current = result?.journalId === journalId ? result : undefined
  const load: Load = current?.load ?? { status: 'loading' }
  const notice = current?.notice
  const refreshing =
    !!journalId && result?.key !== requestKey(journalId, offset, reloads)

  useEffect(() => {
    if (journalId) setStoredJournalId(journalId)
  }, [journalId])

  useEffect(() => {
    if (!journalId) return
    const key = requestKey(journalId, offset, reloads)
    let stale = false
    getDashboard(journalId, ISSUES_PER_PAGE, offset)
      .then((data) => {
        if (!stale) {
          setResult({ key, journalId, load: { status: 'loaded', data } })
        }
      })
      .catch((err: unknown) => {
        if (stale) return
        const message = errorMessage(err)
        setResult((prev) =>
          prev?.journalId === journalId && prev.load.status === 'loaded'
            ? { ...prev, key, notice: message }
            : { key, journalId, load: { status: 'error', message } },
        )
      })
    return () => {
      stale = true
    }
  }, [journalId, offset, reloads])

  // Reviewers complete assignments elsewhere, so catch up when the editor comes back.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setReloads((n) => n + 1)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // If issues disappear and the current page no longer exists, step back.
  const loadedData = load.status === 'loaded' ? load.data : undefined
  useEffect(() => {
    if (!loadedData) return
    const last = Math.max(
      1,
      Math.ceil(loadedData.page.totalCount / loadedData.page.limit),
    )
    if (issuePage > last) setIssuePage(last)
  }, [loadedData, issuePage])

  if (!journalId) return <Navigate to="/editor/login" replace />

  if (load.status === 'loading') {
    // The first request can take ~20s while the Aurora cluster resumes.
    return <p className="rubric-editor-status">Loading dashboard...</p>
  }
  if (load.status === 'error') {
    return (
      <div className="page">
        <p className="rubric-editor-status error-text" role="alert">
          {load.message}
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

  const { journal, rubrics, issues, page } = load.data

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
  const totalPages = Math.max(1, Math.ceil(page.totalCount / page.limit))

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
            <button type="button" onClick={reload} disabled={refreshing}>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button type="button" className="danger">
              Unregister Current Journal
            </button>
          </>
        }
      />
      {notice && (
        <div className="error-text" role="alert">
          Could not refresh: {notice} Showing the last loaded data.
        </div>
      )}

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
              disabled={refreshing || issuePage <= 1}
              onClick={() => setIssuePage(issuePage - 1)}
            >
              &lt;
            </button>{' '}
            Page {shownPage} of {totalPages} [{issues.length} of{' '}
            {page.totalCount}]{' '}
            <button
              type="button"
              disabled={refreshing || issuePage >= totalPages}
              onClick={() => setIssuePage(issuePage + 1)}
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

      {/* Popups. None of these call the API yet (no endpoints); once they do, call
          reload() on success so the tables above pick up the change. */}
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
