import api from './api'

export interface CreateIssueResponse {
  issueId: string
}

export const createIssue = (
  journalId: string,
  volume: number,
  number: number,
) =>
  api.post<CreateIssueResponse>('/issue/create', { journalId, volume, number });


export const deleteIssue = (
  issueId: string,
)=> api.delete<CreateIssueResponse>(`/issue/delete`, {
  data: { issueId }
});
