import { Button, Card, Container, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { IconClipboardList, IconPackage, IconUser } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

export function PharmacyHome() {
  const { user } = useAuth()

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={2}>Pharmacy Dashboard</Title>
          <Text c="dimmed">Signed in as {user?.email}.</Text>
          {!user?.is_approved && (
            <Text c="orange" size="sm">
              Your account is pending Admin approval.
            </Text>
          )}
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Card withBorder padding="lg">
            <Stack gap="xs">
              <IconPackage size={24} />
              <Text fw={600}>Inventory</Text>
              <Text size="sm" c="dimmed">
                Add medicines and update stock/price.
              </Text>
              <Button component={Link} to="/pharmacy/inventory" variant="light" size="xs">
                Manage Inventory
              </Button>
            </Stack>
          </Card>

          <Card withBorder padding="lg">
            <Stack gap="xs">
              <IconClipboardList size={24} />
              <Text fw={600}>Orders</Text>
              <Text size="sm" c="dimmed">
                View incoming orders and update their status as you fulfill them.
              </Text>
              <Button component={Link} to="/pharmacy/orders" variant="light" size="xs">
                View Orders
              </Button>
            </Stack>
          </Card>

          <Card withBorder padding="lg">
            <Stack gap="xs">
              <IconUser size={24} />
              <Text fw={600}>Profile</Text>
              <Text size="sm" c="dimmed">
                Update your store details.
              </Text>
              <Button component={Link} to="/pharmacy/profile" variant="light" size="xs">
                Edit Profile
              </Button>
            </Stack>
          </Card>
        </SimpleGrid>
      </Stack>
    </Container>
  )
}
