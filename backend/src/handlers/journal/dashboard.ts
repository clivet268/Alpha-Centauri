import { query } from '../../shared/db.ts'
import { forbidden, handle, invalidInput } from '../../shared/http.ts'
import type { Event } from '../../shared/http.ts'

// GET /journal/dashboard?journalId=jr_...&limit=10&offset=0
// 200 dashboard | 400 INVALID_INPUT | 403 FORBIDDEN

export interface DashboardResponse {
  journal: { journalId: string; name: string }
  rubrics: {
    rubricId: string
    name: string
    state: string
    replacementRubricId?: string
    publishDate: string | null
    lowThreshold: number | null
    highThreshold: number | null
    questions: {
      questionId: string
      section: number
      text: string
      explanations: Record<string, string>
    }[]
  }[]
  issues: {
    issueId: string
    volume: number
    number: number
    papers: {
      paperId: string
      title: string
      reference: string
      assignments: {
        assignmentId: string
        reviewerEmail: string
        deadline: string
        status: string
      }[]
    }[]
  }[]
  page: { limit: number; offset: number; totalCount: number }
}

interface JournalRow {
  journal_id: string
  name: string
  rubric_id: string
  withdrawn_at: string | null
}

const JOURNAL_ID_RE = /^jr_[A-Za-z0-9]+$/

// Optional integer query param: default when absent, 400 when malformed or out of range.
function intParam(
  raw: string | undefined,
  name: string,
  def: number,
  min: number,
  max: number,
): number {
  if (raw === undefined || raw === '') return def
  const n = Number(raw)
  if (!/^\d+$/.test(raw) || n < min || n > max) {
    throw invalidInput(`${name} must be an integer from ${min} to ${max}.`)
  }
  return n
}

function readParams(event: Event) {
  const qs = event.queryStringParameters ?? {}
  const journalId = (qs.journalId ?? '').trim()
  if (!journalId) throw invalidInput('journalId is required.')
  if (!JOURNAL_ID_RE.test(journalId)) {
    throw invalidInput('journalId is not a valid journal ID.')
  }
  return {
    journalId,
    limit: intParam(qs.limit, 'limit', 10, 1, 100),
    offset: intParam(qs.offset, 'offset', 0, 0, 1_000_000),
  }
}

// AUTH PLACEHOLDER: there is no login/token yet, so any caller may view any active journal.
// Next phase: identify the caller from the token and throw forbidden(...) unless
// caller account_id === journal.editor_id (add editor_id to the journal SELECT below).
function assertCanAccess(_event: Event, _journal: JournalRow): void {}

export const handler = handle(async (event): Promise<DashboardResponse> => {
  const { journalId, limit, offset } = readParams(event)

  const { rows: journals } = await query<JournalRow>(
    `SELECT journal_id, name, rubric_id, withdrawn_at
     FROM journal WHERE journal_id = $1`,
    [journalId],
  )
  const journal = journals[0]
  // Unknown and withdrawn journals get the same 403 so journal IDs can't be probed.
  if (!journal || journal.withdrawn_at) {
    throw forbidden('You do not have access to this journal.')
  }
  assertCanAccess(event, journal)

  const [rubrics, issues, count] = await Promise.all([
    // The journal's rubric plus its replacement chain (Deprecated -> replacement -> ...).
    // depth < 10 guards against a bad replacement cycle.
    query<{
      rubric_id: string
      name: string
      state: string
      replacement_rubric_id: string | null
      publish_date: string | null
      low_threshold: number | null
      high_threshold: number | null
      questions: DashboardResponse['rubrics'][number]['questions']
    }>(
      `WITH RECURSIVE chain AS (
         SELECT r.*, 0 AS depth FROM rubric r WHERE r.rubric_id = $1
         UNION ALL
         SELECT n.*, c.depth + 1
         FROM rubric n JOIN chain c ON n.rubric_id = c.replacement_rubric_id
         WHERE c.depth < 10
       )
       SELECT c.rubric_id, c.name, c.state, c.replacement_rubric_id,
              to_char(c.publish_date, 'YYYY-MM-DD') AS publish_date,
              c.low_threshold, c.high_threshold,
              COALESCE((
                SELECT json_agg(
                  json_build_object(
                    'questionId', q.question_id,
                    'section', q.section,
                    'text', q.text,
                    'explanations', q.explanations
                  ) ORDER BY q.section, q.position)
                FROM question q WHERE q.rubric_id = c.rubric_id
              ), '[]'::json) AS questions
       FROM chain c
       ORDER BY c.depth`,
      [journal.rubric_id],
    ),

    // One page of issues, newest first, with papers -> assignments nested.
    // Withdrawn papers are hidden (a paper can only be withdrawn while it has no reviewers).
    query<{
      issue_id: string
      volume: number
      number: number
      papers: DashboardResponse['issues'][number]['papers']
    }>(
      `WITH page AS (
         SELECT issue_id, volume, number
         FROM issue WHERE journal_id = $1
         ORDER BY volume DESC, number DESC
         LIMIT $2 OFFSET $3
       )
       SELECT i.issue_id, i.volume, i.number,
              COALESCE((
                SELECT json_agg(
                  json_build_object(
                    'paperId', p.paper_id,
                    'title', p.title,
                    'reference', p.reference,
                    'assignments', COALESCE((
                      SELECT json_agg(
                        json_build_object(
                          'assignmentId', a.assignment_id,
                          'reviewerEmail', a.reviewer_email,
                          'deadline', a.deadline,
                          'status', a.status
                        ) ORDER BY a.reviewer_email)
                      FROM assignment a WHERE a.paper_id = p.paper_id
                    ), '[]'::json)
                  ) ORDER BY p.title, p.paper_id)
                FROM paper p
                WHERE p.issue_id = i.issue_id AND p.withdrawn_at IS NULL
              ), '[]'::json) AS papers
       FROM page i
       ORDER BY i.volume DESC, i.number DESC`,
      [journalId, limit, offset],
    ),

    query<{ total: number }>(
      `SELECT count(*)::int AS total FROM issue WHERE journal_id = $1`,
      [journalId],
    ),
  ])

  return {
    journal: { journalId: journal.journal_id, name: journal.name },
    rubrics: rubrics.rows.map((r) => ({
      rubricId: r.rubric_id,
      name: r.name,
      state: r.state,
      ...(r.replacement_rubric_id && { replacementRubricId: r.replacement_rubric_id }),
      publishDate: r.publish_date,
      lowThreshold: r.low_threshold,
      highThreshold: r.high_threshold,
      questions: r.questions,
    })),
    issues: issues.rows.map((i) => ({
      issueId: i.issue_id,
      volume: i.volume,
      number: i.number,
      papers: i.papers,
    })),
    page: { limit, offset, totalCount: count.rows[0]?.total ?? 0 },
  }
})
