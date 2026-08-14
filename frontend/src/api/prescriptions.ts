import { request } from './client'
import type { Prescription, PrescriptionCreate } from './types'

export function uploadPrescription(payload: PrescriptionCreate): Promise<Prescription> {
  return request<Prescription>('/prescriptions', { method: 'POST', body: payload })
}

export function listMyPrescriptions(): Promise<Prescription[]> {
  return request<Prescription[]>('/prescriptions/me')
}
