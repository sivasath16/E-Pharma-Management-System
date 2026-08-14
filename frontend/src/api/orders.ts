import { request } from './client'
import type { Order, OrderCreate, OrderStatus } from './types'

export function createOrder(payload: OrderCreate): Promise<Order> {
  return request<Order>('/orders', { method: 'POST', body: payload })
}

export function listMyOrders(): Promise<Order[]> {
  return request<Order[]>('/orders/me')
}

export function listPharmacyOrders(): Promise<Order[]> {
  return request<Order[]>('/orders/pharmacy/me')
}

export function getOrder(id: number): Promise<Order> {
  return request<Order>(`/orders/${id}`)
}

export function updateOrderStatus(id: number, orderStatus: OrderStatus): Promise<Order> {
  return request<Order>(`/orders/${id}/status`, { method: 'PATCH', body: { status: orderStatus } })
}
