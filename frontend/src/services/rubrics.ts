import api from './api.ts'

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

export const getRubric = (rubricId: string) =>
  api.get<Rubric>('/rubric/get', { params: { rubricId } })

export const publishRubric = (rubricId: string) =>
  api.post<{ publishDate: string }>('/rubric/publish', { rubricId })

export const deprecateRubric = (
  rubricId: string,
  replacementRubricId: string,
) =>
  api.post<{ replacementRubricId: string }>('/rubric/deprecate', {
    rubricId,
    replacementRubricId,
  })
