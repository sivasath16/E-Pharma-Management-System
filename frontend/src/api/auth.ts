import { request } from './client'
import type { RegisterRequest, TokenResponse, User } from './types'

export function register(payload: RegisterRequest): Promise<User> {
  return request<User>('/auth/register', { method: 'POST', body: payload, auth: false })
}

export function login(email: string, password: string): Promise<TokenResponse> {
  return request<TokenResponse>('/auth/login', {
    method: 'POST',
    form: { username: email, password },
    auth: false,
  })
}

export function getMe(): Promise<User> {
  return request<User>('/auth/me')
}
