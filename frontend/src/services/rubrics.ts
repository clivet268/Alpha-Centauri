import api from './api.ts'
import { getStoredDesignerId } from './session.ts'

export type Rating = '5' | '4' | '3' | '2' | '1'

export interface Question {
  questionId: string
  section: number
  text: string
  explanations: Record<Rating, string>
}

export interface Rubric {
  rubricId: string
  name: string
  state: 'Unpublished' | 'Published' | 'Deprecated'
  publishDate: string | null
  lowThreshold: number | null
  highThreshold: number | null
  replacementRubricId?: string
  questions: Question[]
}

export interface RubricSummary {
  rubricId: string
  name: string
  state: Rubric['state']
  publishDate: string | null
  questionCount: number
}

export interface RubricPage {
  rubrics: RubricSummary[]
  page: {
    limit: number
    offset: number
    totalCount: number
  }
}

export type RubricStateFilter = Rubric['state'] | 'All'

export const listRubrics = (
  limit: number,
  offset: number,
  state: RubricStateFilter = 'Published',
) => api.get<RubricPage>('/rubric/list', { params: { limit, offset, state } })

export const getRubric = (rubricId: string) =>
  api.get<Rubric>('/rubric/get', { params: { rubricId } })

export const viewRubric = (rubricId: string) =>
  api.get<Rubric>('/rubric/view', { params: { rubricId } })

// Rubric writes carry the logged-in designer's ID (see session.ts); the server answers 401 without it.
const designer = () => ({ designerId: getStoredDesignerId() ?? undefined })

export const createRubric = (name: string) =>
  api.post<{ rubricId: string }>('/rubric/create', { ...designer(), name })

export const deleteRubric = (rubricId: string) =>
  api.post<{ rubricId: string; deletedAt: string }>('/rubric/delete', {
    ...designer(),
    rubricId,
  })

export const publishRubric = (rubricId: string) =>
  api.post<{ publishDate: string }>('/rubric/publish', {
    ...designer(),
    rubricId,
  })

export const duplicateRubric = (rubricId: string, name?: string) =>
  api.post<Rubric>('/rubric/duplicate', { ...designer(), rubricId, name })

export const deprecateRubric = (
  rubricId: string,
  replacementRubricId: string,
) =>
  api.post<{ replacementRubricId: string }>('/rubric/deprecate', {
    ...designer(),
    rubricId,
    replacementRubricId,
  })
