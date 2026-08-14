import { request } from './client'
import type {
  Appointment,
  AppointmentStatus,
  Order,
  OrderStatus,
  PendingApprovalsResponse,
  ReportSummary,
  User,
  UserRole,
  UserStatusUpdate,
} from './types'

export function listUsers(params?: {
  role?: UserRole
  is_active?: boolean
  is_approved?: boolean
  skip?: number
  limit?: number
}): Promise<User[]> {
  return request<User[]>('/admin/users', { params })
}

export function getUser(id: number): Promise<User> {
  return request<User>(`/admin/users/${id}`)
}

export function updateUserStatus(id: number, payload: UserStatusUpdate): Promise<User> {
  return request<User>(`/admin/users/${id}/status`, { method: 'PATCH', body: payload })
}

export function listPendingApprovals(): Promise<PendingApprovalsResponse> {
  return request<PendingApprovalsResponse>('/admin/pending-approvals')
}

export function listAllOrders(params?: { status?: OrderStatus; skip?: number; limit?: number }): Promise<Order[]> {
  return request<Order[]>('/admin/orders', { params })
}

export function listAllAppointments(params?: {
  status?: AppointmentStatus
  skip?: number
  limit?: number
}): Promise<Appointment[]> {
  return request<Appointment[]>('/admin/appointments', { params })
}

export function getReportSummary(): Promise<ReportSummary> {
  return request<ReportSummary>('/admin/reports/summary')
}
