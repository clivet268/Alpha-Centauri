import api from './api.ts'
import type { Answer, Question as TableQuestion } from '../types'
import type { Question } from './rubrics.ts'

export type ReviewRating = 1 | 2 | 3 | 4 | 5
export type QualityClass = 'High' | 'Moderate' | 'Low'

/** Both calls identify the review by the token from the RubricURL plus the 6-digit PIN. */
export interface ReviewCredentials {
  reviewToken: string
  pin: string
}

export interface ReviewAnswer {
  questionId: string
  rating: ReviewRating
  text: string
}

interface ReviewBase {
  deadline: string
  paper: { title: string; reference: string }
  journal: { name: string; volume: number; number: number }
  rubric: {
    name: string
    lowThreshold: number | null
    highThreshold: number | null
    questions: Question[]
  }
  answers: ReviewAnswer[]
}

export interface ReviewInProgress extends ReviewBase {
  status: 'InProgress'
}

export interface ReviewCompleted extends ReviewBase {
  status: 'Completed'
  completedAt: string
  totalScore: number
  quality: QualityClass
  report: string
}

export type ReviewAccess = ReviewInProgress | ReviewCompleted

export const accessReview = (creds: ReviewCredentials) =>
  api.post<ReviewAccess>('/review/access', creds)

/** Saves ONE answer (rating + comment). The UI must call this once per question, on an explicit user action. */
export const saveAnswer = (creds: ReviewCredentials, answer: ReviewAnswer) =>
  api.post<{ savedAt: string }>('/review/answer', { ...creds, ...answer })

// TODO(complete-review): POST /review/complete { reviewToken, pin } ->
//   200 { completedAt, totalScore, quality, report }
//   409 INCOMPLETE_ANSWERS (details: [{ field: questionId, reason: 'UNANSWERED' }]) | REVIEW_COMPLETED
export const completeReview = (_creds: ReviewCredentials): Promise<never> =>
  Promise.reject(new Error('Complete Review is not implemented yet.'))

/** Pulls the 12-character review token out of a pasted RubricURL (or a bare token). */
export function parseReviewToken(input: string): string | null {
  const m = /(?:^|\/)([A-Za-z0-9]{12})\/?(?:[?#].*)?$/.exec(input.trim())
  return m ? m[1] : null
}

/** API explanations are keyed '5'..'1'; the table components use a list ordered 5..1. */
export const explanationList = (q: Pick<Question, 'explanations'>): string[] =>
  (['5', '4', '3', '2', '1'] as const).map((k) => q.explanations[k] ?? '')

// RubricTable consumes the shared types from ../types (explanations as a 5..1 list, plus fields the
// reviewer API doesn't carry), so adapt the API shapes to them.
export function toTableQuestions(questions: Question[]): TableQuestion[] {
  const perSection: Record<number, number> = {}
  return questions.map((q) => {
    const position = (perSection[q.section] = (perSection[q.section] ?? 0) + 1)
    return {
      questionId: q.questionId,
      rubricId: '',
      section: q.section as TableQuestion['section'],
      position,
      text: q.text,
      explanations: explanationList(q),
      updatedAt: '',
    }
  })
}

export const toTableAnswers = (answers: ReviewAnswer[]): Answer[] =>
  answers.map((a) => ({ assignmentId: '', questionId: a.questionId, rating: a.rating, text: a.text, savedAt: '' }))
