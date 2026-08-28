import { request } from './client'
import type { Payment, PaymentCreate } from './types'

export function createPayment(payload: PaymentCreate): Promise<Payment> {
  return request<Payment>('/payments', { method: 'POST', body: payload })
}

export function listOrderPayments(orderId: number): Promise<Payment[]> {
  return request<Payment[]>(`/payments/order/${orderId}`)
}
