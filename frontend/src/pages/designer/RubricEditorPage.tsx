import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import ConfirmModal from '../../components/ConfirmModal'
import LogoutButton from '../../components/LogoutButton'
import FormModal, { type FieldDef } from '../../components/FormModal'
import RubricTable from '../../components/RubricTable'
import ScoreSummary from '../../components/ScoreSummary'
import { ApiError } from '../../services/api'
import {
  addQuestion,
  deleteQuestion,
  duplicateRubric,
  editQuestion,
  editRubric,
  getRubric,
  type Question as ApiQuestion,
  type Rubric,
} from '../../services/rubrics'
import RubricActionDialog, { type RubricAction } from './RubricActionDialog'
import { tableQuestions } from './tableQuestions'

const MAX_RATING = 5

const QUESTION_FIELDS: FieldDef[] = [
  { name: 'text', label: 'Question' },
  { name: 'e5', label: 'Guidance for 5' },
  { name: 'e4', label: 'Guidance for 4' },
  { name: 'e3', label: 'Guidance for 3' },
  { name: 'e2', label: 'Guidance for 2' },
  { name: 'e1', label: 'Guidance for 1' },
]

const filledQuestionFields = (question: ApiQuestion): FieldDef[] => [
  { ...QUESTION_FIELDS[0], defaultValue: question.text },
  { ...QUESTION_FIELDS[1], defaultValue: question.explanations['5'] },
  { ...QUESTION_FIELDS[2], defaultValue: question.explanations['4'] },
  { ...QUESTION_FIELDS[3], defaultValue: question.explanations['3'] },
  { ...QUESTION_FIELDS[4], defaultValue: question.explanations['2'] },
  { ...QUESTION_FIELDS[5], defaultValue: question.explanations['1'] },
]

const readQuestionForm = (form: Record<string, string>) => ({
  text: form.text.trim(),
  explanations: {
    '5': form.e5.trim(),
    '4': form.e4.trim(),
    '3': form.e3.trim(),
    '2': form.e2.trim(),
    '1': form.e1.trim(),
  },
})

interface Draft {
  name: string
  low: string
  high: string
}

const savedValues = (rubric: Rubric): Draft => ({
  name: rubric.name,
  low: rubric.lowThreshold === null ? '' : String(rubric.lowThreshold),
  high: rubric.highThreshold === null ? '' : String(rubric.highThreshold),
})

const toThreshold = (value: string) => (value === '' ? null : Number(value))

type Load =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; rubric: Rubric }

function errorMessage(err: unknown): string {
  if (!(err instanceof ApiError)) return 'Could not load rubric.'
  return err.status === 404 || err.status === 400
    ? 'Rubric not found.'
    : err.message
}

export default function RubricEditorPage() {
  const navigate = useNavigate()
  const { rubricId = '' } = useParams()
  const [result, setResult] = useState<{ rubricId: string; load: Load }>()
  const [action, setAction] = useState<RubricAction>()
  const [duplicating, setDuplicating] = useState(false)
  const [duplicateError, setDuplicateError] = useState<string>()
  const [draftState, setDraftState] = useState<{
    rubricId: string
    values: Draft
  }>()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string>()
  const [addSection, setAddSection] = useState<number>()
  const [editingId, setEditingId] = useState<string>()
  const [deletingId, setDeletingId] = useState<string>()
  const [deletingBusy, setDeletingBusy] = useState(false)
  const load: Load =
    result?.rubricId === rubricId ? result.load : { status: 'loading' }

  useEffect(() => {
    let stale = false
    getRubric(rubricId)
      .then((rubric) => {
        if (!stale) {
          setResult({ rubricId, load: { status: 'loaded', rubric } })
        }
      })
      .catch((err: unknown) => {
        if (!stale) {
          setResult({
            rubricId,
            load: { status: 'error', message: errorMessage(err) },
          })
        }
      })
    return () => {
      stale = true
    }
  }, [rubricId])

  if (load.status === 'loading') {
    return <p className="rubric-editor-status">Loading rubric...</p>
  }
  if (load.status === 'error') {
    return (
      <p className="rubric-editor-status" role="alert">
        {load.message}
      </p>
    )
  }

  const { rubric } = load
  const editable = rubric.state === 'Unpublished'
  const saved = savedValues(rubric)
  const values =
    draftState?.rubricId === rubric.rubricId ? draftState.values : saved
  const dirty =
    values.name.trim() !== saved.name ||
    values.low !== saved.low ||
    values.high !== saved.high

  const updateDraft = (changes: Partial<Draft>) => {
    setSaveError(undefined)
    setDraftState({
      rubricId: rubric.rubricId,
      values: { ...values, ...changes },
    })
  }

  const patchRubric = (id: string, update: (current: Rubric) => Rubric) =>
    setResult((current) =>
      current?.rubricId === id && current.load.status === 'loaded'
        ? {
            rubricId: id,
            load: { status: 'loaded', rubric: update(current.load.rubric) },
          }
        : current,
    )

  const save = () => {
    const id = rubric.rubricId
    const changes = {
      name: values.name.trim(),
      lowThreshold: toThreshold(values.low),
      highThreshold: toThreshold(values.high),
    }
    setSaving(true)
    setSaveError(undefined)
    editRubric(id, changes)
      .then(() => {
        patchRubric(id, (current) => ({ ...current, ...changes }))
        setDraftState((current) =>
          current?.rubricId === id ? undefined : current,
        )
      })
      .catch((err: unknown) =>
        setSaveError(
          err instanceof ApiError ? err.message : 'Could not save changes.',
        ),
      )
      .finally(() => setSaving(false))
  }

  const submitQuestion = async (form: Record<string, string>) => {
    if (addSection === undefined) return
    const id = rubric.rubricId
    const section = addSection
    const { text, explanations } = readQuestionForm(form)
    const { questionId } = await addQuestion(id, section, text, explanations)
    patchRubric(id, (current) => ({
      ...current,
      questions: [
        ...current.questions,
        { questionId, section, text, explanations },
      ],
    }))
    setAddSection(undefined)
  }

  const editingQuestion = rubric.questions.find(
    (q) => q.questionId === editingId,
  )
  const deletingQuestion = rubric.questions.find(
    (q) => q.questionId === deletingId,
  )

  const submitQuestionEdit = async (form: Record<string, string>) => {
    if (!editingQuestion) return
    const id = rubric.rubricId
    const { questionId } = editingQuestion
    const { text, explanations } = readQuestionForm(form)
    await editQuestion(id, questionId, text, explanations)
    patchRubric(id, (current) => ({
      ...current,
      questions: current.questions.map((q) =>
        q.questionId === questionId ? { ...q, text, explanations } : q,
      ),
    }))
    setEditingId(undefined)
  }

  const confirmDeleteQuestion = () => {
    if (!deletingQuestion) return
    const id = rubric.rubricId
    const { questionId } = deletingQuestion
    setDeletingBusy(true)
    setSaveError(undefined)
    deleteQuestion(id, questionId)
      .then(() =>
        patchRubric(id, (current) => ({
          ...current,
          questions: current.questions.filter(
            (q) => q.questionId !== questionId,
          ),
        })),
      )
      .catch((err: unknown) =>
        setSaveError(
          err instanceof ApiError ? err.message : 'Could not delete question.',
        ),
      )
      .finally(() => {
        setDeletingBusy(false)
        setDeletingId(undefined)
      })
  }

  return (
    <div className="page">
      <div className="control-bar">
        <button type="button" onClick={() => navigate('/designer/rubric')}>
          Back to Rubrics
        </button>
        <button
          type="button"
          disabled={duplicating}
          onClick={() => {
            setDuplicating(true)
            setDuplicateError(undefined)
            setSaveError(undefined)
            duplicateRubric(rubric.rubricId)
              .then((copy) => navigate(`/designer/rubric/${copy.rubricId}`))
              .catch((err: unknown) =>
                setDuplicateError(
                  err instanceof ApiError
                    ? err.message
                    : 'Could not duplicate rubric.',
                ),
              )
              .finally(() => setDuplicating(false))
          }}
        >
          {duplicating ? 'Duplicating...' : 'Duplicate Current Rubric'}
        </button>
        <button
          type="button"
          disabled={!editable || dirty || saving}
          title={
            !editable
              ? 'Rubric is already published'
              : dirty
                ? 'Save your changes before publishing'
                : undefined
          }
          onClick={() => setAction('publish')}
        >
          Publish Current Rubric
        </button>

        {editable ? (
          <input
            className="title-input spacer"
            value={values.name}
            onChange={(event) => updateDraft({ name: event.target.value })}
            aria-label="Rubric name"
            maxLength={200}
            disabled={saving}
          />
        ) : (
          <div className="title-input spacer">{rubric.name}</div>
        )}

        {editable && (
          <button
            type="button"
            disabled={!dirty || saving || !values.name.trim()}
            onClick={save}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}

        {/* auth on important actions? if im reading the payloads right -268 */}
        <button
          type="button"
          className="warning"
          disabled={rubric.state !== 'Published'}
          title={
            rubric.state === 'Published'
              ? undefined
              : 'Only published rubrics can be deprecated'
          }
          onClick={() => setAction('deprecate')}
        >
          Deprecate Current Rubric
        </button>
        <button
          type="button"
          disabled={rubric.state !== 'Published'}
          title={
            rubric.state === 'Published'
              ? undefined
              : 'Only published rubrics can be viewed'
          }
          onClick={() => navigate(`/designer/rubric/${rubric.rubricId}/view`)}
        >
          View Rubric (Read-only)
        </button>
        {/* auth on important actions? if im reading the payloads right -268 */}
        <button
          type="button"
          className="danger"
          disabled={rubric.state !== 'Unpublished'}
          title={
            rubric.state === 'Unpublished'
              ? undefined
              : 'Published rubrics cannot be deleted'
          }
          onClick={() => setAction('delete')}
        >
          Delete Current Rubric
        </button>
        <LogoutButton role="designer" />
      </div>

      {duplicateError && (
        <div className="readonly-note" role="alert">
          {duplicateError}
        </div>
      )}
      {saveError && (
        <div className="error-text" role="alert">
          {saveError}
        </div>
      )}
      <div className="readonly-note">
        State: {rubric.state}
        {rubric.publishDate && (
          <> &middot; Publish date: {rubric.publishDate}</>
        )}
      </div>
      {rubric.replacementRubricId && (
        <div className="readonly-note" role="status">
          This rubric is deprecated. Use{' '}
          <Link to={`/designer/rubric/${rubric.replacementRubricId}`}>
            {rubric.replacementRubricId}
          </Link>{' '}
          instead.
        </div>
      )}

      <RubricTable
        mode={editable ? 'edit' : 'view'}
        questions={tableQuestions(rubric)}
        viewUrl={rubric.rubricId}
        onAddQuestion={setAddSection}
        onEditQuestion={setEditingId}
        onDeleteQuestion={setDeletingId}
      />
      <ScoreSummary
        label="Maximum Possible Score"
        value={MAX_RATING * rubric.questions.length}
        legend={
          <>
            High &gt;={' '}
            {editable ? (
              <input
                className="editable"
                type="number"
                min={0}
                step={1}
                value={values.high}
                onChange={(event) => updateDraft({ high: event.target.value })}
                aria-label="High threshold"
                placeholder="Not set"
                disabled={saving}
              />
            ) : (
              <span className="editable">
                {rubric.highThreshold ?? 'Not set'}
              </span>
            )}{' '}
            &nbsp; Low &lt;{' '}
            {editable ? (
              <input
                className="editable"
                type="number"
                min={0}
                step={1}
                value={values.low}
                onChange={(event) => updateDraft({ low: event.target.value })}
                aria-label="Low threshold"
                placeholder="Not set"
                disabled={saving}
              />
            ) : (
              <span className="editable">
                {rubric.lowThreshold ?? 'Not set'}
              </span>
            )}{' '}
            &nbsp; (in between = moderate)
          </>
        }
      />

      {addSection !== undefined && (
        <FormModal
          open
          title={`Add Question to Section ${addSection}`}
          fields={QUESTION_FIELDS}
          submitLabel="Add Question"
          onClose={() => setAddSection(undefined)}
          onSubmit={submitQuestion}
        />
      )}
      {editingQuestion && (
        <FormModal
          key={editingQuestion.questionId}
          open
          title="Edit Question"
          fields={filledQuestionFields(editingQuestion)}
          submitLabel="Save Question"
          onClose={() => setEditingId(undefined)}
          onSubmit={submitQuestionEdit}
        />
      )}
      {deletingQuestion && (
        <ConfirmModal
          open
          title="Delete Question"
          confirmLabel={deletingBusy ? 'Deleting...' : 'Delete Question'}
          danger
          busy={deletingBusy}
          onClose={() => {
            if (!deletingBusy) setDeletingId(undefined)
          }}
          onConfirm={confirmDeleteQuestion}
        >
          Delete &ldquo;{deletingQuestion.text}&rdquo;? This cannot be undone.
        </ConfirmModal>
      )}

      {action && (
        <RubricActionDialog
          rubric={rubric}
          action={action}
          onCancel={() => setAction(undefined)}
          onDone={(changes) => {
            if (action === 'delete') {
              navigate('/designer/rubric')
              return
            }
            setAction(undefined)
            setResult({
              rubricId,
              load: { status: 'loaded', rubric: { ...rubric, ...changes } },
            })
          }}
        />
      )}
    </div>
  )
}
