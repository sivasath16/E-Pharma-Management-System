import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, Button, Card, Group, Loader, Select, Stack, Container, Text, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import dayjs from 'dayjs'
import { listPharmacyOrders, updateOrderStatus } from '../../api/orders'
import { ApiError } from '../../api/client'
import type { OrderStatus } from '../../api/types'

const STATUS_COLOR: Record<string, string> = {
  pending: 'gray',
  preparing: 'blue',
  shipped: 'indigo',
  ready_for_pickup: 'indigo',
  delivered: 'green',
  cancelled: 'red',
}

// Mirrors backend/app/api/v1/orders.py's ALLOWED_TRANSITIONS -- for UI guidance only,
// the backend is still the source of truth and validates every transition itself.
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['preparing', 'cancelled'],
  preparing: ['shipped', 'ready_for_pickup', 'cancelled'],
  shipped: ['delivered'],
  ready_for_pickup: ['delivered'],
  delivered: [],
  cancelled: [],
}

export function PharmacyOrders() {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Record<number, string | null>>({})
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['orders', 'pharmacy', 'me'],
    queryFn: listPharmacyOrders,
  })

  async function handleUpdate(orderId: number) {
    const nextStatus = selected[orderId]
    if (!nextStatus) return

    setUpdatingId(orderId)
    try {
      await updateOrderStatus(orderId, nextStatus as OrderStatus)
      notifications.show({ color: 'green', message: `Order #${orderId} updated to ${nextStatus.replace(/_/g, ' ')}` })
      queryClient.invalidateQueries({ queryKey: ['orders', 'pharmacy', 'me'] })
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : 'Failed to update order'
      notifications.show({ color: 'red', title: 'Update failed', message })
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Title order={2}>Orders</Title>

        {isLoading && <Loader />}
        {isError && <Text c="red">Failed to load orders.</Text>}
        {data && data.length === 0 && <Text c="dimmed">No orders yet.</Text>}

        {data?.map((order) => {
          const nextOptions = ALLOWED_TRANSITIONS[order.status]
          return (
            <Card key={order.id} withBorder padding="md">
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text fw={600}>Order #{order.id}</Text>
                  <Badge color={STATUS_COLOR[order.status] ?? 'gray'}>{order.status.replace(/_/g, ' ')}</Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  {dayjs(order.created_at).format('MMM D, YYYY h:mm A')} · {order.fulfillment_type} · $
                  {order.total_amount}
                </Text>
                <Text size="sm">{order.items.map((i) => `${i.medicine_name} × ${i.quantity}`).join(', ')}</Text>
                {order.prescription_file_url && (
                  <Text size="sm">
                    Prescription:{' '}
                    <a href={order.prescription_file_url} target="_blank" rel="noreferrer">
                      view
                    </a>
                  </Text>
                )}

                {nextOptions.length > 0 && (
                  <Group>
                    <Select
                      placeholder="Change status..."
                      data={nextOptions.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))}
                      value={selected[order.id] ?? null}
                      onChange={(value) => setSelected((prev) => ({ ...prev, [order.id]: value }))}
                      w={200}
                    />
                    <Button
                      size="sm"
                      disabled={!selected[order.id]}
                      loading={updatingId === order.id}
                      onClick={() => handleUpdate(order.id)}
                    >
                      Update
                    </Button>
                  </Group>
                )}
              </Stack>
            </Card>
          )
        })}
      </Stack>
    </Container>
  )
}
