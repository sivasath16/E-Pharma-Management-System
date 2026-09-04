import { test, expect } from '@playwright/test'
import { API_BASE, apiRegister, apiLogin, loginViaUI, seedApprovedPharmacy, uniqueEmail } from './helpers'

test('pharmacy can add a medicine to inventory', async ({ page, request }) => {
  const { email: pharmEmail } = await seedApprovedPharmacy(request, 'Inventory Test Pharmacy')
  await loginViaUI(page, pharmEmail)
  await page.waitForURL('**/pharmacy')

  await page.goto('/pharmacy/inventory')
  await page.getByRole('button', { name: 'Add Medicine' }).click()
  await page.getByLabel('Name').fill('E2E Inventory Med')
  await page.getByLabel('Price').fill('7.50')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText('Medicine added')).toBeVisible()
  await expect(page.getByText('E2E Inventory Med')).toBeVisible()
})

test('pharmacy fulfills a paid order by advancing its status', async ({ page, request }) => {
  const { email: pharmEmail, pharmToken } = await seedApprovedPharmacy(request, 'Fulfillment Test Pharmacy')
  const medicineResponse = await request.post(`${API_BASE}/medicines`, {
    headers: { Authorization: `Bearer ${pharmToken}` },
    data: { name: 'Fulfillment Med', price: '12.00', stock_quantity: 5, requires_prescription: false },
  })
  const medicine = await medicineResponse.json()

  const patientEmail = uniqueEmail('patient')
  await apiRegister(request, { email: patientEmail, role: 'patient', full_name: 'Fulfillment Patient' })
  const patientToken = await apiLogin(request, patientEmail)

  const orderResponse = await request.post(`${API_BASE}/orders`, {
    headers: { Authorization: `Bearer ${patientToken}` },
    data: {
      pharmacy_id: medicine.pharmacy_id,
      items: [{ medicine_id: medicine.id, quantity: 1 }],
      fulfillment_type: 'pickup',
    },
  })
  const order = await orderResponse.json()
  await request.post(`${API_BASE}/payments`, {
    headers: { Authorization: `Bearer ${patientToken}` },
    data: { order_id: order.id },
  })

  await loginViaUI(page, pharmEmail)
  await page.waitForURL('**/pharmacy')
  await page.goto('/pharmacy/orders')
  await expect(page.getByText(`Order #${order.id}`)).toBeVisible()

  await page.locator('input[placeholder="Change status..."]').click()
  await page.getByRole('option', { name: 'preparing' }).click()
  await page.getByRole('button', { name: 'Update' }).click()
  await expect(page.getByText('updated to preparing')).toBeVisible()
})

test('admin approves a pending doctor from the Pending Approvals screen', async ({ page, request }) => {
  const docEmail = uniqueEmail('doc')
  await apiRegister(request, { email: docEmail, role: 'doctor', full_name: 'Pending Doctor E2E' })

  const adminEmail = uniqueEmail('admin')
  await apiRegister(request, { email: adminEmail, role: 'admin' })

  await loginViaUI(page, adminEmail)
  await page.waitForURL('**/admin')
  await expect(page.getByText('Admin Dashboard')).toBeVisible()

  await page.goto('/admin/pending-approvals')
  await expect(page.getByText('Pending Doctor E2E')).toBeVisible()
  await page.getByRole('button', { name: 'Approve' }).first().click()
  await expect(page.getByText('approved')).toBeVisible()

  await page.goto('/admin/users')
  await expect(page.getByText(docEmail)).toBeVisible()
})

test('admin cannot deactivate their own account from the Users screen', async ({ page, request }) => {
  const adminEmail = uniqueEmail('admin')
  await apiRegister(request, { email: adminEmail, role: 'admin' })

  await loginViaUI(page, adminEmail)
  await page.waitForURL('**/admin')
  await page.goto('/admin/users')
  const ownRow = page.locator('table tr', { hasText: adminEmail })
  await expect(ownRow).toBeVisible()

  // The admin's own row has no Deactivate/Activate button at all (see src/pages/admin/Users.tsx).
  await expect(ownRow.getByRole('button')).toHaveCount(0)
})
