import api from './api'

export interface CreatePaperResponse {
  paperId: string
}

export const addPaper = (
  issueId: string,
  title: string,
  doi: string,
) =>
  api.post<CreatePaperResponse>('/paper/add', { issueId, title, doi });