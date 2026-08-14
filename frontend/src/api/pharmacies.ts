import { request } from './client'
import type { PharmacyProfile, PharmacyProfileUpdate } from './types'

export function listPharmacies(params?: { skip?: number; limit?: number }): Promise<PharmacyProfile[]> {
  return request<PharmacyProfile[]>('/pharmacies', { params, auth: false })
}

export function getMyProfile(): Promise<PharmacyProfile> {
  return request<PharmacyProfile>('/pharmacies/me')
}

export function updateMyProfile(payload: PharmacyProfileUpdate): Promise<PharmacyProfile> {
  return request<PharmacyProfile>('/pharmacies/me', { method: 'PUT', body: payload })
}

export function approvePharmacy(userId: number): Promise<PharmacyProfile> {
  return request<PharmacyProfile>(`/pharmacies/${userId}/approve`, { method: 'POST' })
}
