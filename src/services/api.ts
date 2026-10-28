import axios, { AxiosError, type AxiosRequestConfig } from 'axios'

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    details?: unknown[]
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown[]

  constructor(status: number, code: string, message: string, details?: unknown[]) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.response.use(
  (response) => response,
  (err: AxiosError<ApiErrorBody>) => {
    const status = err.response?.status ?? 0
    const body = err.response?.data?.error
    return Promise.reject(
      new ApiError(
        status,
        body?.code ?? (status ? 'HTTP_ERROR' : 'NETWORK_ERROR'),
        body?.message ?? err.message,
        body?.details,
      ),
    )
  },
)

const get = <T>(url: string, config?: AxiosRequestConfig) =>
  client.get<T>(url, config).then((r) => r.data)

const post = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  client.post<T>(url, data, config).then((r) => r.data)

const put = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  client.put<T>(url, data, config).then((r) => r.data)

const patch = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  client.patch<T>(url, data, config).then((r) => r.data)

const del = <T>(url: string, config?: AxiosRequestConfig) =>
  client.delete<T>(url, config).then((r) => r.data)

export const api = { get, post, put, patch, delete: del }

export default api
