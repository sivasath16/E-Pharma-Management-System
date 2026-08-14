import { request } from './client'
import type {
  Appointment,
  AppointmentCreate,
  AppointmentStatusUpdate,
  ConsultationMessage,
  ConsultationMessageCreate,
  Prescription,
  PrescriptionCreate,
} from './types'

export function createAppointment(payload: AppointmentCreate): Promise<Appointment> {
  return request<Appointment>('/appointments', { method: 'POST', body: payload })
}

export function listMyAppointments(): Promise<Appointment[]> {
  return request<Appointment[]>('/appointments/me')
}

export function listDoctorAppointments(): Promise<Appointment[]> {
  return request<Appointment[]>('/appointments/doctor/me')
}

export function getAppointment(id: number): Promise<Appointment> {
  return request<Appointment>(`/appointments/${id}`)
}

export function updateAppointmentStatus(id: number, payload: AppointmentStatusUpdate): Promise<Appointment> {
  return request<Appointment>(`/appointments/${id}/status`, { method: 'PATCH', body: payload })
}

export function sendMessage(appointmentId: number, payload: ConsultationMessageCreate): Promise<ConsultationMessage> {
  return request<ConsultationMessage>(`/appointments/${appointmentId}/messages`, { method: 'POST', body: payload })
}

export function listMessages(appointmentId: number): Promise<ConsultationMessage[]> {
  return request<ConsultationMessage[]>(`/appointments/${appointmentId}/messages`)
}

export function issuePrescription(appointmentId: number, payload: PrescriptionCreate): Promise<Prescription> {
  return request<Prescription>(`/appointments/${appointmentId}/prescription`, { method: 'POST', body: payload })
}
