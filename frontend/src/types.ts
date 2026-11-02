export type AccountRole = 'RubricDesigner' | 'JournalEditor'
export type RubricState = 'Unpublished' | 'Published' | 'Deprecated'
export type AssignmentStatus =
  'Assigned' | 'UrlIssued' | 'InProgress' | 'Completed'
export type QualityClass = 'High' | 'Moderate' | 'Low'

export const RATINGS = [5, 4, 3, 2, 1] as const
export type Rating = (typeof RATINGS)[number]

export interface Account {
  accountId: string
  email: string
  role: AccountRole
  createdAt: string
}

export interface Rubric {
  rubricId: string
  designerId: string
  name: string
  state: RubricState
  publishDate: string | null
  lowThreshold: number | null
  highThreshold: number | null
  replacementRubricId: string | null
  deprecatedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Question {
  questionId: string
  rubricId: string
  section: 1 | 2 | 3 | 4 | 5
  position: number
  text: string
  explanations: string[]
  updatedAt: string
}

export interface Journal {
  journalId: string
  editorId: string
  rubricId: string
  name: string
  withdrawnAt: string | null
  createdAt: string
}

export interface Issue {
  issueId: string
  journalId: string
  volume: number
  number: number
}

export interface Paper {
  paperId: string
  issueId: string
  title: string
  reference: string
  withdrawnAt: string | null
  closedAt: string | null
}

export interface Assignment {
  assignmentId: string
  paperId: string
  reviewerEmail: string
  deadline: string
  status: AssignmentStatus
  reviewToken: string | null
  completedAt: string | null
  totalScore: number | null
  quality: QualityClass | null
}

export interface Answer {
  assignmentId: string
  questionId: string
  rating: Rating
  text: string
  savedAt: string
}
