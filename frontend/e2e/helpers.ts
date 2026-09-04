import type { Page, APIRequestContext } from '@playwright/test'

export const API_BASE = 'http://localhost:8000/api/v1'
export const PASSWORD = 'secret123'

export function uniqueEmail(prefix: string): string {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 10000)}@example.com`
}

/** Registers a user directly against the backend API -- used for test setup that
 * isn't the thing under test (e.g. seeding an approved doctor before testing the
 * patient booking flow), mirroring how the ad-hoc verification scripts worked
 * throughout this project's development. */
export async function apiRegister(
  request: APIRequestContext,
  payload: { email: string; role: string; full_name?: string; store_name?: string },
) {
  const response = await request.post(`${API_BASE}/auth/register`, {
    data: { password: PASSWORD, ...payload },
  })
  return response.json()
}

export async function apiLogin(request: APIRequestContext, email: string): Promise<string> {
  const response = await request.post(`${API_BASE}/auth/login`, {
    form: { username: email, password: PASSWORD },
  })
  const body = await response.json()
  return body.access_token
}

export async function apiApprove(request: APIRequestContext, kind: 'doctors' | 'pharmacies', userId: number, adminToken: string) {
  await request.post(`${API_BASE}/${kind}/${userId}/approve`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
}

/** Registers an approved doctor (via a throwaway admin) and returns both tokens
 * plus the doctor's business-entity id, ready to use from UI-driven tests. */
export async function seedApprovedDoctor(request: APIRequestContext, fullName = 'Dr. E2E Test') {
  const email = uniqueEmail('doc')
  const adminEmail = uniqueEmail('admin')
  const doctorUser = await apiRegister(request, { email, role: 'doctor', full_name: fullName })
  await apiRegister(request, { email: adminEmail, role: 'admin' })
  const adminToken = await apiLogin(request, adminEmail)
  await apiApprove(request, 'doctors', doctorUser.id, adminToken)
  const docToken = await apiLogin(request, email)
  return { email, docToken, adminToken }
}

export async function seedApprovedPharmacy(request: APIRequestContext, storeName = 'E2E Test Pharmacy') {
  const email = uniqueEmail('pharm')
  const adminEmail = uniqueEmail('admin')
  const pharmacyUser = await apiRegister(request, { email, role: 'pharmacy', store_name: storeName })
  await apiRegister(request, { email: adminEmail, role: 'admin' })
  const adminToken = await apiLogin(request, adminEmail)
  await apiApprove(request, 'pharmacies', pharmacyUser.id, adminToken)
  const pharmToken = await apiLogin(request, email)
  return { email, pharmToken, adminToken }
}

export async function loginViaUI(page: Page, email: string) {
  await page.goto('/login')
  await page.fill('input[placeholder="you@example.com"]', email)
  await page.fill('input[type="password"]', PASSWORD)
  await page.getByRole('button', { name: 'Log in' }).click()
}

export async function logoutViaUI(page: Page) {
  await page.getByRole('button', { name: 'Log out' }).click()
  await page.waitForURL('**/login')
}
