import { test, expect } from '@playwright/test'
import { PASSWORD, loginViaUI, logoutViaUI, uniqueEmail } from './helpers'

test('patient can register, land on their dashboard, and log out', async ({ page }) => {
  const email = uniqueEmail('patient')
  await page.goto('/register')
  await expect(page.getByRole('heading', { name: 'Register' })).toBeVisible()
  await page.fill('input[placeholder="you@example.com"]', email)
  await page.fill('input[type="password"]', PASSWORD)
  await page.getByLabel('Full name').fill('Auth Test Patient')
  await page.getByRole('button', { name: 'Register', exact: true }).click()

  await page.waitForURL('**/patient')
  await expect(page.getByText('Patient Dashboard')).toBeVisible()

  await logoutViaUI(page)
  await expect(page).toHaveURL(/\/login$/)
})

test('doctor registration shows the pending-approval notice', async ({ page }) => {
  const email = uniqueEmail('doc')
  await page.goto('/register')
  await page.locator('label:has-text("Doctor")').click()
  await page.fill('input[placeholder="you@example.com"]', email)
  await page.fill('input[type="password"]', PASSWORD)
  await page.getByLabel('Full name').fill('Dr. Auth Test')
  await page.getByRole('button', { name: 'Register', exact: true }).click()

  await page.waitForURL('**/doctor')
  await expect(page.getByText('Your account is pending Admin approval.', { exact: true })).toBeVisible()
})

test('wrong password is rejected with an error notification', async ({ page }) => {
  const email = uniqueEmail('patient')
  await page.goto('/register')
  await page.fill('input[placeholder="you@example.com"]', email)
  await page.fill('input[type="password"]', PASSWORD)
  await page.getByLabel('Full name').fill('Auth Fail Test')
  await page.getByRole('button', { name: 'Register', exact: true }).click()
  await page.waitForURL('**/patient')
  await logoutViaUI(page)

  await page.goto('/login')
  await page.fill('input[placeholder="you@example.com"]', email)
  await page.fill('input[type="password"]', 'not-the-password')
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByText('Login failed')).toBeVisible()
  await expect(page).toHaveURL(/\/login$/)
})

test('unauthenticated users are redirected to login from protected routes', async ({ page }) => {
  await page.goto('/admin')
  await page.waitForURL('**/login')
})

test('a patient hitting an admin-only route is redirected away, not shown the page', async ({ page }) => {
  const email = uniqueEmail('patient')
  await page.goto('/register')
  await page.fill('input[placeholder="you@example.com"]', email)
  await page.fill('input[type="password"]', PASSWORD)
  await page.getByLabel('Full name').fill('Role Guard Test')
  await page.getByRole('button', { name: 'Register', exact: true }).click()
  await page.waitForURL('**/patient')

  await page.goto('/admin')
  await page.waitForURL((url) => url.pathname !== '/admin')
})
