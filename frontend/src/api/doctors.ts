import { request } from './client'
import type { AvailabilitySlot, AvailabilitySlotCreate, DoctorProfile, DoctorProfileUpdate } from './types'

export function listDoctors(params?: { specialization?: string; skip?: number; limit?: number }): Promise<DoctorProfile[]> {
  return request<DoctorProfile[]>('/doctors', { params, auth: false })
}

export function getDoctor(id: number): Promise<DoctorProfile> {
  return request<DoctorProfile>(`/doctors/${id}`, { auth: false })
}

export function getMyProfile(): Promise<DoctorProfile> {
  return request<DoctorProfile>('/doctors/me')
}

export function updateMyProfile(payload: DoctorProfileUpdate): Promise<DoctorProfile> {
  return request<DoctorProfile>('/doctors/me', { method: 'PUT', body: payload })
}

export function approveDoctor(userId: number): Promise<DoctorProfile> {
  return request<DoctorProfile>(`/doctors/${userId}/approve`, { method: 'POST' })
}

export function createAvailabilitySlot(payload: AvailabilitySlotCreate): Promise<AvailabilitySlot> {
  return request<AvailabilitySlot>('/doctors/availability-slots', { method: 'POST', body: payload })
}

export function listAvailabilitySlots(
  doctorId: number,
  params?: { available_only?: boolean },
): Promise<AvailabilitySlot[]> {
  return request<AvailabilitySlot[]>(`/doctors/${doctorId}/availability-slots`, { params, auth: false })
}

export function deleteAvailabilitySlot(slotId: number): Promise<void> {
  return request<void>(`/doctors/availability-slots/${slotId}`, { method: 'DELETE' })
}
