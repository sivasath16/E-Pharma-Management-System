import { request } from './client'
import type { Notification } from './types'

export function listMyNotifications(): Promise<Notification[]> {
  return request<Notification[]>('/notifications/me')
}
