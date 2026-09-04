import { test, expect } from '@playwright/test'
import { API_BASE, apiRegister, loginViaUI, logoutViaUI, seedApprovedDoctor, uniqueEmail } from './helpers'

async function seedFutureSlot(request: import('@playwright/test').APIRequestContext, docToken: string) {
  const start = new Date(Date.now() + 24 * 3600 * 1000).toISOString()
  const end = new Date(Date.now() + 25 * 3600 * 1000).toISOString()
  const response = await request.post(`${API_BASE}/doctors/availability-slots`, {
    headers: { Authorization: `Bearer ${docToken}` },
    data: { start_time: start, end_time: end },
  })
  return response.json()
}

test('patient books a video appointment; doctor confirms, completes, and issues an e-prescription', async ({
  page,
  request,
}) => {
  const { email: docEmail, docToken } = await seedApprovedDoctor(request, 'Dr. Appointment Flow')
  const slot = await seedFutureSlot(request, docToken)
  const doctorProfile = await (
    await request.get(`${API_BASE}/doctors/me`, { headers: { Authorization: `Bearer ${docToken}` } })
  ).json()

  const patientEmail = uniqueEmail('patient')
  await apiRegister(request, { email: patientEmail, role: 'patient', full_name: 'Appointment Flow Patient' })
  await loginViaUI(page, patientEmail)
  await page.waitForURL('**/patient')

  await page.goto(`/doctors/${doctorProfile.id}`)
  await expect(page.getByText('Dr. Appointment Flow')).toBeVisible()
  await page.getByRole('button', { name: 'Book' }).first().click()
  await expect(page.getByText('Book Appointment')).toBeVisible()
  await page.locator('label:has-text("Video")').click()
  await page.getByRole('button', { name: 'Confirm Booking' }).click()

  await page.waitForURL('**/patient/appointments/*')
  const appointmentId = page.url().split('/').pop()
  await expect(page.getByText('pending', { exact: true })).toBeVisible()

  await logoutViaUI(page)
  await loginViaUI(page, docEmail)
  await page.waitForURL('**/doctor')

  await page.goto(`/doctor/appointments/${appointmentId}`)
  await page.getByLabel(/Meeting URL/).fill('https://meet.example.com/e2e-room')
  await page.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(page.getByText('Appointment confirmed')).toBeVisible()

  await page.getByRole('button', { name: 'Mark as Completed' }).click()
  await expect(page.getByText('Appointment completed')).toBeVisible()

  await page.fill('input[placeholder="https://..."]', 'https://example.com/e2e-rx.pdf')
  await page.getByRole('button', { name: 'Issue Prescription' }).click()
  await expect(page.getByText('E-prescription issued')).toBeVisible()

  await logoutViaUI(page)
  await loginViaUI(page, patientEmail)
  await page.waitForURL('**/patient')

  await page.goto(`/patient/appointments/${appointmentId}`)
  await expect(page.getByText('Video Consultation')).toBeVisible()
  await expect(page.getByText('E-Prescription')).toBeVisible()

  await page.goto('/patient/prescriptions')
  await expect(page.getByText('e2e-rx.pdf')).toBeVisible()
})

test('chat messages flow both directions for a chat-mode appointment', async ({ page, request }) => {
  const { email: docEmail, docToken } = await seedApprovedDoctor(request, 'Dr. Chat Flow')
  const slot = await seedFutureSlot(request, docToken)
  const doctorProfile = await (
    await request.get(`${API_BASE}/doctors/me`, { headers: { Authorization: `Bearer ${docToken}` } })
  ).json()

  const patientEmail = uniqueEmail('patient')
  await apiRegister(request, { email: patientEmail, role: 'patient', full_name: 'Chat Flow Patient' })

  const patientLoginResponse = await request.post(`${API_BASE}/auth/login`, {
    form: { username: patientEmail, password: 'secret123' },
  })
  const { access_token: patientToken } = await patientLoginResponse.json()

  const appointmentResponse = await request.post(`${API_BASE}/appointments`, {
    headers: { Authorization: `Bearer ${patientToken}` },
    data: { doctor_id: doctorProfile.id, slot_id: slot.id, consultation_mode: 'chat' },
  })
  const appointment = await appointmentResponse.json()
  await request.patch(`${API_BASE}/appointments/${appointment.id}/status`, {
    headers: { Authorization: `Bearer ${docToken}` },
    data: { status: 'confirmed' },
  })

  await loginViaUI(page, docEmail)
  await page.waitForURL('**/doctor')
  await page.goto(`/doctor/appointments/${appointment.id}`)
  await page.fill('input[placeholder="Type a message..."]', 'Hello from the doctor')
  await page.getByRole('button', { name: 'Send' }).click()
  await expect(page.getByText('Hello from the doctor')).toBeVisible()

  await logoutViaUI(page)
  await loginViaUI(page, patientEmail)
  await page.waitForURL('**/patient')
  await page.goto(`/patient/appointments/${appointment.id}`)
  await expect(page.getByText('Hello from the doctor')).toBeVisible()
  await page.fill('input[placeholder="Type a message..."]', 'Hello back from the patient')
  await page.getByRole('button', { name: 'Send' }).click()
  await expect(page.getByText('Hello back from the patient')).toBeVisible()
})
