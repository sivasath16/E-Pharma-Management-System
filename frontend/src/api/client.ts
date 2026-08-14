const BASE_URL = import.meta.env.VITE_API_BASE_URL

const TOKEN_STORAGE_KEY = 'epharma_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
    this.detail = detail
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
  form?: Record<string, string>
  auth?: boolean
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = new URL(`${BASE_URL}${path}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params, form, auth = true } = options

  const headers: Record<string, string> = {}
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let requestBody: BodyInit | undefined
  if (form) {
    const encoded = new URLSearchParams(form)
    requestBody = encoded
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
  } else if (body !== undefined) {
    requestBody = JSON.stringify(body)
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(buildUrl(path, params), { method, headers, body: requestBody })

  if (response.status === 204) {
    return undefined as T
  }

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await response.json() : undefined

  if (!response.ok) {
    const detail = (isJson && data && typeof data.detail === 'string') ? data.detail : response.statusText
    throw new ApiError(response.status, detail)
  }

  return data as T
}
