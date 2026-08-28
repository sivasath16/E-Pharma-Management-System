import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Container,
  Divider,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { getOrder } from '../../api/orders'
import { createPayment, listOrderPayments } from '../../api/payments'
import { ApiError } from '../../api/client'

const STATUS_COLOR: Record<string, string> = {
  pending: 'gray',
  preparing: 'blue',
  shipped: 'indigo',
  ready_for_pickup: 'indigo',
  delivered: 'green',
  cancelled: 'red',
}

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  pending: 'gray',
  succeeded: 'green',
  failed: 'red',
  refunded: 'yellow',
}

export function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const orderId = Number(id)
  const queryClient = useQueryClient()
  const [simulateFailure, setSimulateFailure] = useState(false)
  const [paying, setPaying] = useState(false)

  const orderQuery = useQuery({
    queryKey: ['orders', orderId],
    queryFn: () => getOrder(orderId),
    enabled: Number.isFinite(orderId),
  })

  const paymentsQuery = useQuery({
    queryKey: ['payments', orderId],
    queryFn: () => listOrderPayments(orderId),
    enabled: Number.isFinite(orderId),
  })

  const hasSucceededPayment = paymentsQuery.data?.some((p) => p.status === 'succeeded') ?? false

  async function handlePay() {
    setPaying(true)
    try {
      const payment = await createPayment({ order_id: orderId, simulate_failure: simulateFailure })
      if (payment.status === 'succeeded') {
        notifications.show({ color: 'green', title: 'Payment successful', message: `Reference: ${payment.provider_reference}` })
      } else {
        notifications.show({ color: 'red', title: 'Payment failed', message: 'This was a simulated failure — try again.' })
      }
      queryClient.invalidateQueries({ queryKey: ['payments', orderId] })
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : 'Payment failed'
      notifications.show({ color: 'red', title: 'Payment failed', message })
    } finally {
      setPaying(false)
    }
  }

  if (orderQuery.isLoading) {
    return (
      <Container py="xl">
        <Loader />
      </Container>
    )
  }

  if (orderQuery.isError || !orderQuery.data) {
    return (
      <Container py="xl">
        <Text c="red">Order not found.</Text>
      </Container>
    )
  }

  const order = orderQuery.data

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2}>Order #{order.id}</Title>
          <Badge color={STATUS_COLOR[order.status] ?? 'gray'} size="lg">
            {order.status.replace(/_/g, ' ')}
          </Badge>
        </Group>

        <Card withBorder padding="md">
          <Stack gap="xs">
            <Text size="sm" c="dimmed">
              Placed {dayjs(order.created_at).format('MMM D, YYYY h:mm A')} · {order.fulfillment_type}
            </Text>
            {order.delivery_address && <Text size="sm">Deliver to: {order.delivery_address}</Text>}
            {order.prescription_file_url && (
              <Text size="sm">
                Prescription:{' '}
                <a href={order.prescription_file_url} target="_blank" rel="noreferrer">
                  {order.prescription_file_url}
                </a>
              </Text>
            )}
            <Divider my="xs" />
            <Table>
              <Table.Tbody>
                {order.items.map((item) => (
                  <Table.Tr key={item.medicine_id}>
                    <Table.Td>{item.medicine_name}</Table.Td>
                    <Table.Td>× {item.quantity}</Table.Td>
                    <Table.Td ta="right">${item.unit_price}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            <Group justify="space-between">
              <Text fw={700}>Total</Text>
              <Text fw={700}>${order.total_amount}</Text>
            </Group>
          </Stack>
        </Card>

        <Card withBorder padding="md">
          <Stack gap="sm">
            <Title order={4}>Payment</Title>

            {!hasSucceededPayment && (
              <Stack gap="xs">
                <Alert color="orange" variant="light">
                  This order must be paid before the pharmacy can start preparing it.
                </Alert>
                <Checkbox
                  label="Simulate payment failure (demo)"
                  checked={simulateFailure}
                  onChange={(e) => setSimulateFailure(e.currentTarget.checked)}
                />
                <Button onClick={handlePay} loading={paying}>
                  Pay ${order.total_amount}
                </Button>
              </Stack>
            )}

            {paymentsQuery.data && paymentsQuery.data.length > 0 && (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Attempt</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Reference</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {paymentsQuery.data.map((payment) => (
                    <Table.Tr key={payment.id}>
                      <Table.Td>{dayjs(payment.created_at).format('h:mm:ss A')}</Table.Td>
                      <Table.Td>
                        <Badge color={PAYMENT_STATUS_COLOR[payment.status] ?? 'gray'} size="sm">
                          {payment.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{payment.provider_reference || '—'}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Stack>
        </Card>
      </Stack>
    </Container>
  )
}
