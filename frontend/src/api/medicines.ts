import { request } from './client'
import type { Medicine, MedicineCreate, MedicineUpdate } from './types'

export function searchMedicines(params?: { q?: string; category?: string; pharmacy_id?: number }): Promise<Medicine[]> {
  return request<Medicine[]>('/medicines', { params, auth: false })
}

export function getMedicine(id: number): Promise<Medicine> {
  return request<Medicine>(`/medicines/${id}`, { auth: false })
}

export function createMedicine(payload: MedicineCreate): Promise<Medicine> {
  return request<Medicine>('/medicines', { method: 'POST', body: payload })
}

export function updateMedicine(id: number, payload: MedicineUpdate): Promise<Medicine> {
  return request<Medicine>(`/medicines/${id}`, { method: 'PUT', body: payload })
}
