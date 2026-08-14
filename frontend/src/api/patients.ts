import { request } from './client'
import type { PatientProfile, PatientProfileUpdate } from './types'

export function getMyProfile(): Promise<PatientProfile> {
  return request<PatientProfile>('/patients/me')
}

export function updateMyProfile(payload: PatientProfileUpdate): Promise<PatientProfile> {
  return request<PatientProfile>('/patients/me', { method: 'PUT', body: payload })
}
