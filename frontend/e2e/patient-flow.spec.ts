import { test, expect } from '@playwright/test'
import { apiRegister, loginViaUI, seedApprovedPharmacy, uniqueEmail } from './helpers'

test('patient can browse, checkout, hit the payment gate, and pay', async ({ page, request }) => {
  const { pharmToken } = await seedApprovedPharmacy(request, 'Patient Flow Pharmacy')
  const medicineResponse = await request.post('http://localhost:8000/api/v1/medicines', {
    headers: { Authorization: `Bearer ${pharmToken}` },
    data: { name: 'E2E Flow Med', price: '15.00', stock_quantity: 10, requires_prescription: false },
  })
  const medicine = await medicineResponse.json()

  const patientEmail = uniqueEmail('patient')
  await apiRegister(request, { email: patientEmail, role: 'patient', full_name: 'Flow Test Patient' })
  await loginViaUI(page, patientEmail)
  await page.waitForURL('**/patient')

  await page.goto('/medicines')
  await page.fill('input[placeholder="Search by medicine name..."]', 'E2E Flow Med')
  await expect(page.getByText('E2E Flow Med')).toBeVisible()
  await page.getByRole('button', { name: 'Add to Cart' }).click()
  await expect(page.getByText('added to cart')).toBeVisible()

  await page.goto('/patient/cart')
  await expect(page.getByText('Cart —')).toBeVisible()
  await page.getByRole('button', { name: 'Place Order' }).click()
  await page.waitForURL('**/patient/orders/*')

  await expect(page.getByText('must be paid before')).toBeVisible()

  await page.getByLabel('Simulate payment failure (demo)').check()
  await page.getByRole('button', { name: /Pay \$/ }).click()
  await expect(page.getByText('Payment failed')).toBeVisible()

  await page.getByLabel('Simulate payment failure (demo)').uncheck()
  await page.getByRole('button', { name: /Pay \$/ }).click()
  await expect(page.getByText('Payment successful')).toBeVisible()
  await expect(page.getByText('must be paid before')).not.toBeVisible()

  await page.goto('/patient/orders')
  await expect(page.getByText(/Order #\d+/).first()).toBeVisible()
})

test('empty cart shows an empty state instead of a checkout form', async ({ page, request }) => {
  const patientEmail = uniqueEmail('patient')
  await apiRegister(request, { email: patientEmail, role: 'patient', full_name: 'Empty Cart Patient' })
  await loginViaUI(page, patientEmail)
  await page.waitForURL('**/patient')

  await page.goto('/patient/cart')
  await expect(page.getByText('Your cart is empty')).toBeVisible()
})
