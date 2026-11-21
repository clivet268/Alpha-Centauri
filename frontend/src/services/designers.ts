import api from './api.ts'

export interface DesignerAuthBody {
  email: string
  password: string
}

export interface DesignerAuthResult {
  designerId: string
  token: string
  expiresAt: string
}

export const registerDesigner = (body: DesignerAuthBody) =>
  api.post<DesignerAuthResult>('/designer/register', body)

export const loginDesigner = (body: DesignerAuthBody) =>
  api.post<DesignerAuthResult>('/designer/login', body)
