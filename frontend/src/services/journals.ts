import { RATINGS, type AssignmentStatus, type Question } from '../types'
import api from './api'

// Mirrors DashboardResponse in backend/src/handlers/journal/dashboard.ts.
export interface DashboardQuestion {
  questionId: string
  section: number
  text: string
  explanations: Record<string, string>
}

export interface DashboardRubric {
  rubricId: string
  name: string
  state: 'Unpublished' | 'Published' | 'Deprecated'
  replacementRubricId?: string
  publishDate: string | null
  lowThreshold: number | null
  highThreshold: number | null
  questions: DashboardQuestion[]
}

export interface DashboardAssignment {
  assignmentId: string
  reviewerEmail: string
  deadline: string
  status: AssignmentStatus
}

export interface DashboardPaper {
  paperId: string
  title: string
  reference: string
  assignments: DashboardAssignment[]
}

export interface DashboardIssue {
  issueId: string
  volume: number
  number: number
  papers: DashboardPaper[]
}

export interface Dashboard {
  journal: { journalId: string; name: string }
  rubrics: DashboardRubric[]
  issues: DashboardIssue[]
  page: { limit: number; offset: number; totalCount: number }
}

export const getDashboard = (journalId: string, limit: number, offset: number) =>
  api.get<Dashboard>('/journal/dashboard', {
    params: { journalId, limit, offset },
  })

export interface RegisterJournalBody {
  journalName: string
  rubricId: string
  email: string
  password: string
}

export interface RegisterJournalResult {
  journalId: string
  token: string
  expiresAt: string
}

export const registerJournal = (body: RegisterJournalBody) =>
  api.post<RegisterJournalResult>('/journal/register', body)

// RubricTable renders the app-wide Question shape (explanations as an array ordered
// 5..1, plus position/rubricId/updatedAt). The API returns explanations keyed by
// rating and already ordered by section then position, so convert here.
export function toRubricQuestions(rubric: DashboardRubric): Question[] {
  const perSection = new Map<number, number>()
  return rubric.questions.map((q) => {
    const position = (perSection.get(q.section) ?? 0) + 1
    perSection.set(q.section, position)
    return {
      questionId: q.questionId,
      rubricId: rubric.rubricId,
      section: q.section as Question['section'],
      position,
      text: q.text,
      explanations: RATINGS.map((r) => q.explanations[String(r)] ?? ''),
      updatedAt: '',
    }
  })
}
