import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge, Container, Loader, Select, Stack, Table, Text, Title } from '@mantine/core'
import dayjs from 'dayjs'
import { listAllOrders } from '../../api/admin'
import type { OrderStatus } from '../../api/types'

const STATUS_COLOR: Record<string, string> = {
  pending: 'gray',
  preparing: 'blue',
  shipped: 'indigo',
  ready_for_pickup: 'indigo',
  delivered: 'green',
  cancelled: 'red',
}

export function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'orders', statusFilter],
    queryFn: () => listAllOrders({ status: (statusFilter as OrderStatus) || undefined, limit: 100 }),
  })

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Title order={2}>Orders</Title>

        <Select
          placeholder="Filter by status"
          data={['pending', 'preparing', 'shipped', 'ready_for_pickup', 'delivered', 'cancelled']}
          value={statusFilter}
          onChange={setStatusFilter}
          clearable
          w={220}
        />

        {isLoading && <Loader />}
        {isError && <Text c="red">Failed to load orders.</Text>}

        {data && (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Order</Table.Th>
                <Table.Th>Placed</Table.Th>
                <Table.Th>Total</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.map((order) => (
                <Table.Tr key={order.id}>
                  <Table.Td>#{order.id}</Table.Td>
                  <Table.Td>{dayjs(order.created_at).format('MMM D, YYYY h:mm A')}</Table.Td>
                  <Table.Td>${order.total_amount}</Table.Td>
                  <Table.Td>
                    <Badge color={STATUS_COLOR[order.status] ?? 'gray'}>{order.status.replace(/_/g, ' ')}</Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Container>
  )
}
