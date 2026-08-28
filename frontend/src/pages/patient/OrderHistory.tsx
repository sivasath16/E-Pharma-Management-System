import { useQuery } from '@tanstack/react-query'
import { Badge, Card, Container, Group, Loader, Stack, Text, Title } from '@mantine/core'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import { listMyOrders } from '../../api/orders'

const STATUS_COLOR: Record<string, string> = {
  pending: 'gray',
  preparing: 'blue',
  shipped: 'indigo',
  ready_for_pickup: 'indigo',
  delivered: 'green',
  cancelled: 'red',
}

export function OrderHistory() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['orders', 'me'], queryFn: listMyOrders })

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Title order={2}>My Orders</Title>

        {isLoading && <Loader />}
        {isError && <Text c="red">Failed to load orders.</Text>}
        {data && data.length === 0 && <Text c="dimmed">You haven't placed any orders yet.</Text>}

        {data?.map((order) => (
          <Card key={order.id} component={Link} to={`/patient/orders/${order.id}`} withBorder padding="md">
            <Group justify="space-between">
              <Stack gap={2}>
                <Text fw={600}>Order #{order.id}</Text>
                <Text size="sm" c="dimmed">
                  {dayjs(order.created_at).format('MMM D, YYYY h:mm A')} · {order.items.length} item(s)
                </Text>
              </Stack>
              <Group gap="sm">
                <Text fw={700}>${order.total_amount}</Text>
                <Badge color={STATUS_COLOR[order.status] ?? 'gray'}>{order.status.replace(/_/g, ' ')}</Badge>
              </Group>
            </Group>
          </Card>
        ))}
      </Stack>
    </Container>
  )
}
