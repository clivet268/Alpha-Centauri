import api from './api.ts'

export interface Issue {
  issue_id: string
  volume: number
  number: number
}

export const createIssue = () =>
  api.post<Issue>('/api/issue/create', { })