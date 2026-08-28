import { useQuery } from '@tanstack/react-query'
import { Badge, Button, Card, Container, Group, Loader, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { Link } from 'react-router-dom'
import { getReportSummary } from '../../api/admin'

function StatusBreakdown({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).filter(([, count]) => count > 0)
  if (entries.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        None yet
      </Text>
    )
  }
  return (
    <Group gap="xs">
      {entries.map(([status, count]) => (
        <Badge key={status} variant="light">
          {status.replace(/_/g, ' ')}: {count}
        </Badge>
      ))}
    </Group>
  )
}

export function AdminHome() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['admin', 'reports'], queryFn: getReportSummary })

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Title order={2}>Admin Dashboard</Title>

        {isLoading && <Loader />}
        {isError && <Text c="red">Failed to load report summary.</Text>}

        {data && (
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Card withBorder padding="lg">
              <Stack gap="xs">
                <Text fw={600}>Users by Role</Text>
                <StatusBreakdown data={data.users_by_role} />
              </Stack>
            </Card>

            <Card withBorder padding="lg">
              <Stack gap="xs">
                <Text fw={600}>Pending Approvals</Text>
                <Text size="xl" fw={700}>
                  {data.pending_approvals_count}
                </Text>
                <Button component={Link} to="/admin/pending-approvals" size="xs" variant="light">
                  Review
                </Button>
              </Stack>
            </Card>

            <Card withBorder padding="lg">
              <Stack gap="xs">
                <Text fw={600}>Orders by Status</Text>
                <StatusBreakdown data={data.orders_by_status} />
                <Text size="sm" c="dimmed">
                  Total revenue (delivered): ${data.total_revenue}
                </Text>
                <Button component={Link} to="/admin/orders" size="xs" variant="light">
                  View Orders
                </Button>
              </Stack>
            </Card>

            <Card withBorder padding="lg">
              <Stack gap="xs">
                <Text fw={600}>Appointments by Status</Text>
                <StatusBreakdown data={data.appointments_by_status} />
                <Button component={Link} to="/admin/appointments" size="xs" variant="light">
                  View Appointments
                </Button>
              </Stack>
            </Card>
          </SimpleGrid>
        )}

        <Button component={Link} to="/admin/users" variant="light">
          Manage Users
        </Button>
      </Stack>
    </Container>
  )
}
